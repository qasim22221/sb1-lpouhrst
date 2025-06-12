import { blockchainService } from './blockchain';
import { bscApiService } from './bscApi';
import { supabase } from './supabase';

export interface WalletData {
  address: string;
  privateKey: string;
  mnemonic: string;
  network: string;
  isNew: boolean;
}

export interface DepositMonitoringData {
  depositId: string;
  walletAddress: string;
  expectedAmount: number;
  userId: string;
  createdAt: string;
}

export class WalletService {
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private lastCheckedBlocks: Map<string, number> = new Map();

  constructor() {
    console.log('🔗 Initializing BSC Mainnet Wallet Service...');
    console.log('🌐 Network: Binance Smart Chain Mainnet');
    console.log('💰 Token: USDT (BEP20)');
  }

  /**
   * Generate a new BEP20 wallet for a user on BSC Mainnet
   */
  async generateUserWallet(userId: string): Promise<WalletData> {
    try {
      console.log(`🔐 Generating new BSC Mainnet wallet for user ${userId}...`);
      
      // Generate new wallet using blockchain service
      const wallet = blockchainService.generateWallet();
      
      console.log(`✅ Generated new BSC Mainnet wallet: ${wallet.address}`);
      
      // Store wallet in database (encrypted in production)
      const { data, error } = await supabase
        .from('user_wallets')
        .insert({
          user_id: userId,
          wallet_address: wallet.address,
          private_key: wallet.privateKey, // ⚠️ In production, encrypt this!
          mnemonic: wallet.mnemonic, // ⚠️ In production, encrypt this!
          network: 'BEP20',
          is_monitored: false,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to store wallet: ${error.message}`);
      }

      console.log(`✅ BSC Mainnet wallet stored in database with ID: ${data.id}`);

      return {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic,
        network: 'BEP20 (BSC Mainnet)',
        isNew: true,
      };
    } catch (error: any) {
      console.error('❌ Error generating BSC Mainnet wallet:', error);
      throw new Error(`Failed to generate BSC Mainnet wallet: ${error.message}`);
    }
  }

  /**
   * Get existing wallet for user or create new one
   */
  async getUserWallet(userId: string): Promise<WalletData> {
    try {
      console.log(`🔍 Looking for existing BSC Mainnet wallet for user: ${userId}`);
      
      // Check if user already has a wallet
      const { data: existingWallet, error } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && !error.message.includes('No rows')) {
        throw new Error(`Database error: ${error.message}`);
      }

      if (existingWallet) {
        console.log(`✅ Found existing BSC Mainnet wallet: ${existingWallet.wallet_address}`);
        
        return {
          address: existingWallet.wallet_address,
          privateKey: existingWallet.private_key,
          mnemonic: existingWallet.mnemonic,
          network: 'BEP20 (BSC Mainnet)',
          isNew: false,
        };
      }

      // Generate new wallet if none exists
      console.log(`🆕 No existing wallet found, generating new BSC Mainnet wallet...`);
      return await this.generateUserWallet(userId);
    } catch (error: any) {
      console.error('❌ Error getting BSC Mainnet wallet:', error);
      throw new Error(`Failed to get BSC Mainnet wallet: ${error.message}`);
    }
  }

  /**
   * Get wallet balances using BSC API with RPC fallback
   */
  async getWalletBalances(address: string): Promise<{
    bnbBalance: string;
    usdtBalance: string;
  }> {
    try {
      console.log(`💰 Getting BSC Mainnet balances for wallet: ${address}`);
      
      const [bnbBalance, usdtBalance] = await Promise.all([
        blockchainService.getBNBBalance(address),
        blockchainService.getUSDTBalance(address),
      ]);

      console.log(`✅ BSC Mainnet balances loaded - BNB: ${bnbBalance}, USDT: ${usdtBalance}`);

      return {
        bnbBalance,
        usdtBalance,
      };
    } catch (error: any) {
      console.error('❌ Error getting BSC Mainnet wallet balances:', error);
      throw new Error(`Failed to get BSC Mainnet balances: ${error.message}`);
    }
  }

  /**
   * Start comprehensive monitoring for a wallet deposit on BSC Mainnet
   */
  async startDepositMonitoring(monitoringData: DepositMonitoringData): Promise<void> {
    try {
      const { depositId, walletAddress, expectedAmount, userId } = monitoringData;

      // Stop any existing monitoring for this deposit
      this.stopDepositMonitoring(depositId);

      console.log(`🔍 Starting comprehensive BSC Mainnet monitoring for deposit ${depositId}`);
      console.log(`📍 Address: ${walletAddress}`);
      console.log(`💰 Expected: ${expectedAmount} USDT`);
      console.log(`🌐 Network: BSC Mainnet`);

      // Get current block number for monitoring
      const currentBlock = await blockchainService.getCurrentBlockNumber();
      this.lastCheckedBlocks.set(depositId, currentBlock);

      // Update database to mark monitoring as started
      await supabase.rpc('start_wallet_monitoring', {
        wallet_address_param: walletAddress,
        user_id_param: userId,
      });

      // 1. Check for recent transactions first (last 1000 blocks)
      console.log(`🔍 Checking recent BSC Mainnet transactions...`);
      await this.checkRecentTransactions(walletAddress, expectedAmount, depositId);

      // 2. Set up real-time monitoring using BSC API
      console.log(`🔄 Setting up real-time BSC Mainnet monitoring...`);
      await this.setupRealTimeMonitoring(walletAddress, expectedAmount, depositId);

      // 3. Set up periodic backup checking
      console.log(`⏰ Setting up periodic BSC Mainnet backup checks...`);
      const interval = setInterval(async () => {
        await this.performPeriodicCheck(walletAddress, expectedAmount, depositId);
      }, 30000); // Check every 30 seconds

      this.monitoringIntervals.set(depositId, interval);

      // 4. Auto-stop monitoring after 24 hours
      setTimeout(() => {
        console.log(`⏰ Auto-stopping BSC Mainnet monitoring for deposit ${depositId} after 24 hours`);
        this.stopDepositMonitoring(depositId);
      }, 24 * 60 * 60 * 1000);

      console.log(`✅ Comprehensive BSC Mainnet monitoring started for deposit ${depositId}`);

    } catch (error: any) {
      console.error('❌ Error starting BSC Mainnet deposit monitoring:', error);
      throw new Error(`Failed to start BSC Mainnet monitoring: ${error.message}`);
    }
  }

  /**
   * Set up real-time monitoring using BSC API
   */
  private async setupRealTimeMonitoring(
    walletAddress: string,
    expectedAmount: number,
    depositId: string
  ): Promise<void> {
    try {
      console.log(`🔄 Setting up real-time BSC Mainnet monitoring...`);
      
      // Use BSC API for real-time monitoring
      const lastBlock = this.lastCheckedBlocks.get(depositId) || 0;
      
      await bscApiService.monitorAddressForUSDT(
        walletAddress,
        lastBlock,
        async (transactions) => {
          for (const tx of transactions) {
            const receivedAmount = parseFloat(tx.value) / Math.pow(10, 18);
            const tolerance = expectedAmount * 0.01; // 1% tolerance
            
            console.log(`📥 New BSC Mainnet USDT transaction: ${receivedAmount} USDT (TX: ${tx.hash})`);
            
            if (Math.abs(receivedAmount - expectedAmount) <= tolerance) {
              console.log(`🎯 Amount matches expected deposit! Processing BSC Mainnet transaction...`);
              await this.processMatchingTransaction(depositId, tx.hash, receivedAmount, parseInt(tx.blockNumber));
              break;
            }
          }
        }
      );
    } catch (error: any) {
      console.error('❌ Error setting up real-time BSC Mainnet monitoring:', error);
      // Continue with periodic checking even if real-time fails
    }
  }

  /**
   * Perform periodic check for new transactions on BSC Mainnet
   */
  private async performPeriodicCheck(
    walletAddress: string,
    expectedAmount: number,
    depositId: string
  ): Promise<void> {
    try {
      const lastCheckedBlock = this.lastCheckedBlocks.get(depositId) || 0;
      const currentBlock = await blockchainService.getCurrentBlockNumber();
      
      if (currentBlock > lastCheckedBlock) {
        console.log(`🔍 BSC Mainnet periodic check: scanning blocks ${lastCheckedBlock} to ${currentBlock}`);
        
        // Get transactions from BSC API
        const transactions = await bscApiService.getUSDTTransfers(
          walletAddress,
          lastCheckedBlock,
          currentBlock,
          1,
          50
        );

        for (const tx of transactions) {
          const receivedAmount = parseFloat(tx.value) / Math.pow(10, 18);
          const tolerance = expectedAmount * 0.01; // 1% tolerance
          
          if (Math.abs(receivedAmount - expectedAmount) <= tolerance) {
            console.log(`🎯 BSC Mainnet periodic check found matching transaction: ${tx.hash}`);
            await this.processMatchingTransaction(depositId, tx.hash, receivedAmount, parseInt(tx.blockNumber));
            return;
          }
        }

        // Update last checked block
        this.lastCheckedBlocks.set(depositId, currentBlock);
      }
    } catch (error: any) {
      console.error('❌ Error in BSC Mainnet periodic check:', error);
    }
  }

  /**
   * Check recent transactions for missed deposits on BSC Mainnet
   */
  private async checkRecentTransactions(
    walletAddress: string,
    expectedAmount: number,
    depositId: string
  ): Promise<void> {
    try {
      console.log(`🔍 Checking recent BSC Mainnet transactions for ${walletAddress}...`);
      
      const transfers = await blockchainService.getPastUSDTTransfers(walletAddress, -1000);
      
      console.log(`📊 Found ${transfers.length} recent BSC Mainnet USDT transfers`);
      
      for (const transfer of transfers) {
        const receivedAmount = parseFloat(transfer.amount);
        const tolerance = expectedAmount * 0.01; // 1% tolerance
        
        console.log(`📥 Checking BSC Mainnet transfer: ${receivedAmount} USDT (TX: ${transfer.txHash})`);
        
        if (Math.abs(receivedAmount - expectedAmount) <= tolerance) {
          // Check if this transaction is already processed
          const { data: existingDeposit } = await supabase
            .from('deposits')
            .select('transaction_hash')
            .eq('id', depositId)
            .single();

          if (!existingDeposit?.transaction_hash) {
            console.log(`🎯 Found matching recent BSC Mainnet transaction: ${transfer.txHash}`);
            await this.processMatchingTransaction(depositId, transfer.txHash, receivedAmount, transfer.blockNumber);
            return;
          }
        }
      }
      
      console.log(`ℹ️ No matching recent BSC Mainnet transactions found`);
    } catch (error: any) {
      console.error('❌ Error checking recent BSC Mainnet transactions:', error);
    }
  }

  /**
   * Process a matching transaction on BSC Mainnet
   */
  private async processMatchingTransaction(
    depositId: string,
    txHash: string,
    amount: number,
    blockNumber: number
  ): Promise<void> {
    try {
      console.log(`🔄 Processing matching BSC Mainnet transaction ${txHash} for deposit ${depositId}`);

      // Get transaction confirmations
      const { confirmed, confirmations } = await blockchainService.isTransactionConfirmed(txHash);
      
      console.log(`📊 BSC Mainnet transaction confirmations: ${confirmations}/12 (confirmed: ${confirmed})`);

      // Update deposit with blockchain data using the database function
      const { data: result, error } = await supabase.rpc('update_deposit_blockchain_data', {
        deposit_id_param: depositId,
        transaction_hash_param: txHash,
        block_number_param: blockNumber,
        confirmations_param: confirmations,
        network_fee_param: 0, // We don't calculate network fees for incoming transactions
      });

      if (error) {
        console.error('❌ Error updating BSC Mainnet deposit:', error);
        return;
      }

      console.log(`✅ BSC Mainnet deposit updated:`, result);

      if (result.confirmed) {
        console.log(`🎉 BSC Mainnet deposit confirmed! Balance updated to: $${result.new_balance}`);
        // Stop monitoring this deposit since it's confirmed
        this.stopDepositMonitoring(depositId);
      } else {
        console.log(`⏳ BSC Mainnet transaction found but waiting for more confirmations (${confirmations}/12)`);
      }

    } catch (error: any) {
      console.error('❌ Error processing matching BSC Mainnet transaction:', error);
    }
  }

  /**
   * Stop monitoring a specific deposit
   */
  stopDepositMonitoring(depositId: string): void {
    const interval = this.monitoringIntervals.get(depositId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(depositId);
      this.lastCheckedBlocks.delete(depositId);
      console.log(`🛑 Stopped BSC Mainnet monitoring for deposit ${depositId}`);
    }
  }

  /**
   * Validate a transaction hash and get details from BSC Mainnet
   */
  async validateTransaction(txHash: string): Promise<{
    valid: boolean;
    amount?: string;
    to?: string;
    from?: string;
    confirmations?: number;
    confirmed?: boolean;
    network?: string;
  }> {
    try {
      console.log(`🔍 Validating BSC Mainnet transaction: ${txHash}`);
      
      const [tx, confirmationData] = await Promise.all([
        blockchainService.getTransaction(txHash),
        blockchainService.isTransactionConfirmed(txHash),
      ]);

      if (!tx) {
        return { valid: false };
      }

      console.log(`✅ BSC Mainnet transaction validated`);

      return {
        valid: true,
        to: tx.to,
        from: tx.from,
        confirmations: confirmationData.confirmations,
        confirmed: confirmationData.confirmed,
        network: 'BSC Mainnet',
      };
    } catch (error: any) {
      console.error('❌ Error validating BSC Mainnet transaction:', error);
      return { valid: false };
    }
  }

  /**
   * Get comprehensive monitoring status
   */
  async getMonitoringStatus(): Promise<{
    activeMonitoring: number;
    apiStatus: boolean;
    networkStats: any;
    connectionTests: any;
    network: string;
  }> {
    try {
      const [networkStats, connectionTests] = await Promise.all([
        blockchainService.getNetworkStats(),
        blockchainService.testConnections(),
      ]);

      return {
        activeMonitoring: this.monitoringIntervals.size,
        apiStatus: networkStats.apiStatus,
        networkStats,
        connectionTests,
        network: 'BSC Mainnet',
      };
    } catch (error: any) {
      console.error('❌ Error getting BSC Mainnet monitoring status:', error);
      return {
        activeMonitoring: this.monitoringIntervals.size,
        apiStatus: false,
        networkStats: null,
        connectionTests: null,
        network: 'BSC Mainnet',
      };
    }
  }

  /**
   * Get transaction explorer URL
   */
  getTransactionUrl(txHash: string): string {
    return blockchainService.getTransactionUrl(txHash);
  }

  /**
   * Get address explorer URL
   */
  getAddressUrl(address: string): string {
    return blockchainService.getAddressUrl(address);
  }

  /**
   * Check for deposits to a specific address on BSC Mainnet
   */
  async checkSpecificAddress(address: string): Promise<{
    found: boolean;
    transactions: Array<{
      hash: string;
      amount: string;
      blockNumber: number;
      timestamp: string;
      network: string;
    }>;
  }> {
    try {
      console.log(`🔍 Checking specific BSC Mainnet address for deposits: ${address}`);
      
      // Get recent USDT transfers to this address
      const transfers = await blockchainService.getPastUSDTTransfers(address, -2000); // Last 2000 blocks
      
      const transactions = transfers.map(transfer => ({
        hash: transfer.txHash,
        amount: transfer.amount,
        blockNumber: transfer.blockNumber,
        timestamp: new Date().toISOString(), // BSC API doesn't always provide timestamp
        network: 'BSC Mainnet',
      }));

      console.log(`📊 Found ${transactions.length} USDT transactions on BSC Mainnet for ${address}`);

      return {
        found: transactions.length > 0,
        transactions,
      };
    } catch (error: any) {
      console.error('❌ Error checking specific BSC Mainnet address:', error);
      return {
        found: false,
        transactions: [],
      };
    }
  }

  /**
   * Get network information
   */
  getNetworkInfo() {
    return {
      name: 'Binance Smart Chain',
      shortName: 'BSC',
      chainId: 56,
      type: 'Mainnet',
      currency: 'BNB',
      explorer: 'https://bscscan.com',
      rpcUrls: [
        'https://bsc-dataseed1.binance.org/',
        'https://bsc-dataseed2.binance.org/',
        'https://bsc-dataseed3.binance.org/',
        'https://bsc-dataseed4.binance.org/',
      ],
      usdtContract: '0x55d398326f99059fF775485246999027B3197955',
    };
  }
}

// Export singleton instance
export const walletService = new WalletService();