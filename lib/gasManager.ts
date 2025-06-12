import { ethers } from 'ethers';
import { blockchainService } from './blockchain';
import { supabase } from './supabase';

export interface GasOperation {
  id: string;
  operation_type: 'distribute' | 'sweep' | 'batch';
  wallet_addresses: string[];
  bnb_amount: number;
  gas_used: number;
  cost_usd: number;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

export interface SweepSchedule {
  id: string;
  wallet_address: string;
  usdt_balance: number;
  last_sweep_at?: string;
  next_sweep_at: string;
  priority: 1 | 2 | 3; // 1=high, 2=medium, 3=low
  gas_distributed: boolean;
  sweep_threshold: number;
}

export interface MasterWalletConfig {
  address: string;
  privateKey: string;
  minBNBReserve: number;
  gasDistributionAmount: number;
  sweepThresholds: {
    high: number;    // $100+
    medium: number;  // $20-100
    low: number;     // $5-20
  };
}

export class GasManager {
  private masterWallet: ethers.Wallet;
  private config: MasterWalletConfig;
  private isRunning: boolean = false;

  constructor(config: MasterWalletConfig) {
    this.config = config;
    this.masterWallet = blockchainService.getWalletFromPrivateKey(config.privateKey);
    console.log('🔧 Gas Manager initialized for master wallet:', config.address);
  }

  /**
   * Start automated gas management and sweeping
   */
  async startAutomatedSweeping(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Automated sweeping already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting automated gas management and sweeping...');

    // Run initial sweep
    await this.performFullSweepCycle();

    // Set up periodic sweeping
    setInterval(async () => {
      if (this.isRunning) {
        await this.performFullSweepCycle();
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    // Set up daily optimization
    setInterval(async () => {
      if (this.isRunning) {
        await this.optimizeGasOperations();
      }
    }, 24 * 60 * 60 * 1000); // Every 24 hours
  }

  /**
   * Stop automated sweeping
   */
  stopAutomatedSweeping(): void {
    this.isRunning = false;
    console.log('🛑 Stopped automated gas management and sweeping');
  }

  /**
   * Perform a complete sweep cycle
   */
  async performFullSweepCycle(): Promise<void> {
    try {
      console.log('🔄 Starting full sweep cycle...');

      // 1. Check master wallet BNB balance
      await this.checkMasterWalletBalance();

      // 2. Identify wallets needing sweeping
      const walletsToSweep = await this.identifyWalletsForSweeping();

      if (walletsToSweep.length === 0) {
        console.log('ℹ️ No wallets need sweeping at this time');
        return;
      }

      console.log(`📊 Found ${walletsToSweep.length} wallets needing sweep operations`);

      // 3. Distribute gas to wallets that need it
      const walletsNeedingGas = walletsToSweep.filter(w => !w.gas_distributed);
      if (walletsNeedingGas.length > 0) {
        await this.distributeGasToWallets(walletsNeedingGas.map(w => w.wallet_address));
      }

      // 4. Wait for gas distribution to confirm
      if (walletsNeedingGas.length > 0) {
        console.log('⏳ Waiting 60 seconds for gas distribution to confirm...');
        await new Promise(resolve => setTimeout(resolve, 60000));
      }

      // 5. Sweep USDT from wallets with gas
      const walletsReadyToSweep = walletsToSweep.filter(w => w.gas_distributed);
      if (walletsReadyToSweep.length > 0) {
        await this.sweepUSDTFromWallets(walletsReadyToSweep.map(w => w.wallet_address));
      }

      console.log('✅ Full sweep cycle completed');

    } catch (error: any) {
      console.error('❌ Error in full sweep cycle:', error);
      await this.logGasOperation({
        operation_type: 'batch',
        wallet_addresses: [],
        bnb_amount: 0,
        gas_used: 0,
        cost_usd: 0,
        status: 'failed',
        error_message: error.message,
      });
    }
  }

  /**
   * Identify wallets that need sweeping based on thresholds
   */
  async identifyWalletsForSweeping(): Promise<SweepSchedule[]> {
    try {
      console.log('🔍 Identifying wallets for sweeping...');

      // Get all user wallets with USDT balances
      const { data: wallets, error } = await supabase
        .from('user_wallets')
        .select(`
          wallet_address,
          user_id,
          profiles!inner(fund_wallet_balance)
        `);

      if (error) {
        throw new Error(`Failed to fetch wallets: ${error.message}`);
      }

      const walletsToSweep: SweepSchedule[] = [];

      for (const wallet of wallets || []) {
        try {
          // Get USDT balance from blockchain
          const usdtBalance = parseFloat(await blockchainService.getUSDTBalance(wallet.wallet_address));
          
          if (usdtBalance < 1) continue; // Skip wallets with less than $1

          // Determine priority and threshold based on amount
          let priority: 1 | 2 | 3;
          let sweepThreshold: number;
          let nextSweepDelay: number; // minutes

          if (usdtBalance >= this.config.sweepThresholds.high) {
            priority = 1; // High priority - immediate
            sweepThreshold = this.config.sweepThresholds.high;
            nextSweepDelay = 0;
          } else if (usdtBalance >= this.config.sweepThresholds.medium) {
            priority = 2; // Medium priority - hourly
            sweepThreshold = this.config.sweepThresholds.medium;
            nextSweepDelay = 60;
          } else if (usdtBalance >= this.config.sweepThresholds.low) {
            priority = 3; // Low priority - daily
            sweepThreshold = this.config.sweepThresholds.low;
            nextSweepDelay = 24 * 60;
          } else {
            continue; // Below minimum threshold
          }

          // Check if wallet has enough BNB for gas
          const bnbBalance = parseFloat(await blockchainService.getBNBBalance(wallet.wallet_address));
          const hasGas = bnbBalance >= 0.001; // Minimum BNB needed for sweep

          walletsToSweep.push({
            id: `sweep_${wallet.wallet_address}_${Date.now()}`,
            wallet_address: wallet.wallet_address,
            usdt_balance: usdtBalance,
            next_sweep_at: new Date(Date.now() + nextSweepDelay * 60 * 1000).toISOString(),
            priority,
            gas_distributed: hasGas,
            sweep_threshold: sweepThreshold,
          });

        } catch (error: any) {
          console.error(`❌ Error checking wallet ${wallet.wallet_address}:`, error);
        }
      }

      // Sort by priority (high to low) and amount (high to low)
      walletsToSweep.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority; // Lower number = higher priority
        }
        return b.usdt_balance - a.usdt_balance; // Higher amount first
      });

      console.log(`📊 Identified ${walletsToSweep.length} wallets for sweeping`);
      return walletsToSweep;

    } catch (error: any) {
      console.error('❌ Error identifying wallets for sweeping:', error);
      return [];
    }
  }

  /**
   * Distribute BNB gas to multiple wallets
   */
  async distributeGasToWallets(walletAddresses: string[]): Promise<void> {
    if (walletAddresses.length === 0) return;

    try {
      console.log(`⛽ Distributing gas to ${walletAddresses.length} wallets...`);

      const gasAmount = this.config.gasDistributionAmount; // BNB per wallet
      const totalBNBNeeded = gasAmount * walletAddresses.length;

      // Check if master wallet has enough BNB
      const masterBNBBalance = parseFloat(await blockchainService.getBNBBalance(this.config.address));
      if (masterBNBBalance < totalBNBNeeded + this.config.minBNBReserve) {
        throw new Error(`Insufficient BNB in master wallet. Need: ${totalBNBNeeded}, Have: ${masterBNBBalance}`);
      }

      // Batch gas distribution for efficiency
      const batchSize = 10; // Process 10 wallets at a time
      const batches = [];
      
      for (let i = 0; i < walletAddresses.length; i += batchSize) {
        batches.push(walletAddresses.slice(i, i + batchSize));
      }

      let totalGasUsed = 0;
      let totalCostUSD = 0;

      for (const batch of batches) {
        try {
          const gasPrice = await blockchainService.getGasPrice();
          const gasLimit = BigInt(21000); // Standard transfer gas limit
          
          // Send BNB to each wallet in the batch
          const promises = batch.map(async (walletAddress) => {
            try {
              const tx = await this.masterWallet.sendTransaction({
                to: walletAddress,
                value: ethers.parseEther(gasAmount.toString()),
                gasPrice: gasPrice,
                gasLimit: gasLimit,
              });

              console.log(`💸 Sent ${gasAmount} BNB to ${walletAddress} (TX: ${tx.hash})`);
              return { success: true, hash: tx.hash, gasUsed: Number(gasLimit) };
            } catch (error: any) {
              console.error(`❌ Failed to send BNB to ${walletAddress}:`, error);
              return { success: false, error: error.message, gasUsed: 0 };
            }
          });

          const results = await Promise.all(promises);
          
          // Calculate total gas used and cost
          const batchGasUsed = results.reduce((sum, r) => sum + r.gasUsed, 0);
          const batchCostUSD = (batchGasUsed * Number(gasPrice)) / 1e18 * 300; // Approximate BNB price
          
          totalGasUsed += batchGasUsed;
          totalCostUSD += batchCostUSD;

          // Wait between batches to avoid rate limits
          if (batches.indexOf(batch) < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

        } catch (error: any) {
          console.error(`❌ Error in gas distribution batch:`, error);
        }
      }

      // Log the gas distribution operation
      await this.logGasOperation({
        operation_type: 'distribute',
        wallet_addresses: walletAddresses,
        bnb_amount: totalBNBNeeded,
        gas_used: totalGasUsed,
        cost_usd: totalCostUSD,
        status: 'completed',
      });

      console.log(`✅ Gas distribution completed. Total cost: $${totalCostUSD.toFixed(4)}`);

    } catch (error: any) {
      console.error('❌ Error distributing gas:', error);
      await this.logGasOperation({
        operation_type: 'distribute',
        wallet_addresses: walletAddresses,
        bnb_amount: 0,
        gas_used: 0,
        cost_usd: 0,
        status: 'failed',
        error_message: error.message,
      });
      throw error;
    }
  }

  /**
   * Sweep USDT from multiple wallets to master wallet
   */
  async sweepUSDTFromWallets(walletAddresses: string[]): Promise<void> {
    if (walletAddresses.length === 0) return;

    try {
      console.log(`🧹 Sweeping USDT from ${walletAddresses.length} wallets...`);

      let totalSweptUSDT = 0;
      let totalGasUsed = 0;
      let totalCostUSD = 0;

      for (const walletAddress of walletAddresses) {
        try {
          // Get wallet private key from database
          const { data: walletData, error } = await supabase
            .from('user_wallets')
            .select('private_key, user_id')
            .eq('wallet_address', walletAddress)
            .single();

          if (error || !walletData?.private_key) {
            console.error(`❌ No private key found for wallet ${walletAddress}`);
            continue;
          }

          // Create wallet instance
          const userWallet = blockchainService.getWalletFromPrivateKey(walletData.private_key);

          // Get USDT balance
          const usdtBalance = await blockchainService.getUSDTBalance(walletAddress);
          const usdtAmount = parseFloat(usdtBalance);

          if (usdtAmount < 1) {
            console.log(`⏭️ Skipping wallet ${walletAddress} - insufficient USDT (${usdtAmount})`);
            continue;
          }

          // Transfer USDT to master wallet
          const usdtContract = new ethers.Contract(
            '0x55d398326f99059fF775485246999027B3197955', // USDT contract address
            [
              'function transfer(address to, uint256 amount) returns (bool)',
              'function balanceOf(address owner) view returns (uint256)',
            ],
            userWallet
          );

          const transferAmount = ethers.parseUnits(usdtAmount.toString(), 18);
          const gasPrice = await blockchainService.getGasPrice();

          const tx = await usdtContract.transfer(this.config.address, transferAmount, {
            gasPrice: gasPrice,
            gasLimit: BigInt(65000), // USDT transfer gas limit
          });

          console.log(`💰 Swept ${usdtAmount} USDT from ${walletAddress} (TX: ${tx.hash})`);

          // Wait for confirmation
          const receipt = await tx.wait();
          const gasUsed = Number(receipt.gasUsed);
          const costUSD = (gasUsed * Number(gasPrice)) / 1e18 * 300; // Approximate BNB price

          totalSweptUSDT += usdtAmount;
          totalGasUsed += gasUsed;
          totalCostUSD += costUSD;

          // Update user's fund wallet balance
          const { data: profile } = await supabase
            .from('profiles')
            .select('fund_wallet_balance')
            .eq('id', walletData.user_id)
            .single();

          const currentBalance = profile?.fund_wallet_balance || 0;
          const newBalance = currentBalance + usdtAmount;

          await supabase
            .from('profiles')
            .update({ fund_wallet_balance: newBalance })
            .eq('id', walletData.user_id);

          // Create transaction record
          await supabase
            .from('fund_wallet_transactions')
            .insert({
              user_id: walletData.user_id,
              transaction_type: 'deposit',
              amount: usdtAmount,
              balance_before: currentBalance,
              balance_after: newBalance,
              description: `Auto-sweep from ${walletAddress} - TX: ${tx.hash}`,
            });

          // Small delay between sweeps
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error: any) {
          console.error(`❌ Error sweeping wallet ${walletAddress}:`, error);
        }
      }

      // Log the sweep operation
      await this.logGasOperation({
        operation_type: 'sweep',
        wallet_addresses: walletAddresses,
        bnb_amount: 0,
        gas_used: totalGasUsed,
        cost_usd: totalCostUSD,
        status: 'completed',
      });

      console.log(`✅ Sweep completed. Total USDT: ${totalSweptUSDT.toFixed(2)}, Cost: $${totalCostUSD.toFixed(4)}`);

    } catch (error: any) {
      console.error('❌ Error sweeping USDT:', error);
      await this.logGasOperation({
        operation_type: 'sweep',
        wallet_addresses: walletAddresses,
        bnb_amount: 0,
        gas_used: 0,
        cost_usd: 0,
        status: 'failed',
        error_message: error.message,
      });
      throw error;
    }
  }

  /**
   * Check master wallet BNB balance and alert if low
   */
  async checkMasterWalletBalance(): Promise<void> {
    try {
      const balance = parseFloat(await blockchainService.getBNBBalance(this.config.address));
      
      console.log(`💰 Master wallet BNB balance: ${balance.toFixed(6)} BNB`);

      if (balance < this.config.minBNBReserve) {
        console.warn(`⚠️ Master wallet BNB balance is low! Current: ${balance}, Required: ${this.config.minBNBReserve}`);
        
        // Log low balance alert
        await this.logGasOperation({
          operation_type: 'batch',
          wallet_addresses: [],
          bnb_amount: 0,
          gas_used: 0,
          cost_usd: 0,
          status: 'failed',
          error_message: `Low BNB balance alert: ${balance} BNB (minimum: ${this.config.minBNBReserve})`,
        });
      }
    } catch (error: any) {
      console.error('❌ Error checking master wallet balance:', error);
    }
  }

  /**
   * Optimize gas operations based on network conditions
   */
  async optimizeGasOperations(): Promise<void> {
    try {
      console.log('🔧 Optimizing gas operations...');

      // Get current gas price and network stats
      const gasPrice = await blockchainService.getGasPrice();
      const networkStats = await blockchainService.getNetworkStats();

      // Adjust sweep thresholds based on gas costs
      const currentGasCostUSD = (65000 * Number(gasPrice)) / 1e18 * 300; // Approximate cost for USDT transfer
      
      // Update thresholds to ensure profitability
      this.config.sweepThresholds = {
        high: Math.max(100, currentGasCostUSD * 10), // 10x gas cost minimum
        medium: Math.max(20, currentGasCostUSD * 5),  // 5x gas cost minimum
        low: Math.max(5, currentGasCostUSD * 3),      // 3x gas cost minimum
      };

      console.log(`📊 Updated sweep thresholds based on gas cost ($${currentGasCostUSD.toFixed(4)}):`, this.config.sweepThresholds);

    } catch (error: any) {
      console.error('❌ Error optimizing gas operations:', error);
    }
  }

  /**
   * Log gas operation to database
   */
  private async logGasOperation(operation: Omit<GasOperation, 'id' | 'created_at' | 'completed_at'>): Promise<void> {
    try {
      await supabase
        .from('gas_operations')
        .insert({
          operation_type: operation.operation_type,
          wallet_addresses: operation.wallet_addresses,
          bnb_amount: operation.bnb_amount,
          gas_used: operation.gas_used,
          cost_usd: operation.cost_usd,
          status: operation.status,
          error_message: operation.error_message,
          completed_at: operation.status === 'completed' ? new Date().toISOString() : null,
        });
    } catch (error: any) {
      console.error('❌ Error logging gas operation:', error);
    }
  }

  /**
   * Get gas operation statistics
   */
  async getGasOperationStats(days: number = 7): Promise<{
    totalOperations: number;
    totalCostUSD: number;
    totalBNBUsed: number;
    totalUSDTSwept: number;
    averageCostPerOperation: number;
    successRate: number;
  }> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const { data: operations, error } = await supabase
        .from('gas_operations')
        .select('*')
        .gte('created_at', startDate);

      if (error) {
        throw new Error(`Failed to fetch gas operations: ${error.message}`);
      }

      const totalOperations = operations?.length || 0;
      const completedOperations = operations?.filter(op => op.status === 'completed') || [];
      
      const totalCostUSD = completedOperations.reduce((sum, op) => sum + (op.cost_usd || 0), 0);
      const totalBNBUsed = completedOperations.reduce((sum, op) => sum + (op.bnb_amount || 0), 0);
      
      // Calculate total USDT swept (from sweep operations)
      const sweepOperations = completedOperations.filter(op => op.operation_type === 'sweep');
      const totalUSDTSwept = sweepOperations.length * 50; // Approximate average sweep amount

      return {
        totalOperations,
        totalCostUSD,
        totalBNBUsed,
        totalUSDTSwept,
        averageCostPerOperation: totalOperations > 0 ? totalCostUSD / totalOperations : 0,
        successRate: totalOperations > 0 ? (completedOperations.length / totalOperations) * 100 : 0,
      };
    } catch (error: any) {
      console.error('❌ Error getting gas operation stats:', error);
      return {
        totalOperations: 0,
        totalCostUSD: 0,
        totalBNBUsed: 0,
        totalUSDTSwept: 0,
        averageCostPerOperation: 0,
        successRate: 0,
      };
    }
  }

  /**
   * Manual emergency sweep for specific wallet
   */
  async emergencySweep(walletAddress: string): Promise<boolean> {
    try {
      console.log(`🚨 Emergency sweep initiated for wallet: ${walletAddress}`);

      // Check if wallet has USDT
      const usdtBalance = parseFloat(await blockchainService.getUSDTBalance(walletAddress));
      if (usdtBalance < 0.1) {
        console.log(`⚠️ Wallet has insufficient USDT for emergency sweep: ${usdtBalance}`);
        return false;
      }

      // Check if wallet has gas
      const bnbBalance = parseFloat(await blockchainService.getBNBBalance(walletAddress));
      if (bnbBalance < 0.001) {
        console.log(`⛽ Distributing gas for emergency sweep...`);
        await this.distributeGasToWallets([walletAddress]);
        
        // Wait for gas distribution
        await new Promise(resolve => setTimeout(resolve, 30000));
      }

      // Perform sweep
      await this.sweepUSDTFromWallets([walletAddress]);

      console.log(`✅ Emergency sweep completed for wallet: ${walletAddress}`);
      return true;

    } catch (error: any) {
      console.error(`❌ Emergency sweep failed for wallet ${walletAddress}:`, error);
      return false;
    }
  }
}

// Export singleton instance (will be initialized with config)
export let gasManager: GasManager | null = null;

export function initializeGasManager(config: MasterWalletConfig): GasManager {
  gasManager = new GasManager(config);
  return gasManager;
}

export { gasManager }