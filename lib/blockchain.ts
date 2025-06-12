import { ethers } from 'ethers';
import { bscApiService } from './bscApi';

// BSC Mainnet configuration ONLY
export const BSC_CONFIG = {
  chainId: 56,
  name: 'Binance Smart Chain Mainnet',
  rpcUrls: [
    'https://bsc-dataseed1.binance.org/',
    'https://bsc-dataseed2.binance.org/',
    'https://bsc-dataseed3.binance.org/',
    'https://bsc-dataseed4.binance.org/',
    'https://rpc.ankr.com/bsc',
    'https://bsc-dataseed.binance.org/',
  ],
  explorerUrl: 'https://bscscan.com',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18,
  },
};

// USDT Contract Address on BSC Mainnet ONLY
export const USDT_CONTRACT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';

// ERC-20 ABI for USDT token
export const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private usdtContract: ethers.Contract;
  private fallbackProviders: ethers.JsonRpcProvider[];

  constructor() {
    console.log('🔗 Initializing BSC Mainnet blockchain service...');
    
    // Create primary provider
    this.provider = new ethers.JsonRpcProvider(BSC_CONFIG.rpcUrls[0]);
    
    // Create fallback providers for redundancy
    this.fallbackProviders = BSC_CONFIG.rpcUrls.slice(1).map(url => 
      new ethers.JsonRpcProvider(url)
    );
    
    this.usdtContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, ERC20_ABI, this.provider);
    
    console.log('✅ BSC Mainnet blockchain service initialized');
    console.log(`📍 USDT Contract: ${USDT_CONTRACT_ADDRESS}`);
    console.log(`🌐 Primary RPC: ${BSC_CONFIG.rpcUrls[0]}`);
    console.log(`🔄 Fallback RPCs: ${this.fallbackProviders.length} available`);
  }

  /**
   * Execute with fallback providers
   */
  private async executeWithFallback<T>(
    operation: (provider: ethers.JsonRpcProvider) => Promise<T>
  ): Promise<T> {
    const providers = [this.provider, ...this.fallbackProviders];
    
    for (let i = 0; i < providers.length; i++) {
      try {
        const result = await operation(providers[i]);
        if (i > 0) {
          console.log(`✅ Fallback provider ${i} succeeded`);
        }
        return result;
      } catch (error) {
        console.warn(`⚠️ Provider ${i} failed:`, error);
        if (i === providers.length - 1) {
          throw error; // Last provider failed, throw error
        }
      }
    }
    
    throw new Error('All BSC Mainnet providers failed');
  }

  /**
   * Generate a new BEP20 wallet address and private key
   */
  generateWallet(): { address: string; privateKey: string; mnemonic: string } {
    console.log('🔐 Generating new BSC Mainnet wallet...');
    const wallet = ethers.Wallet.createRandom();
    
    console.log(`✅ Generated wallet: ${wallet.address}`);
    
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic?.phrase || '',
    };
  }

  /**
   * Get wallet from private key
   */
  getWalletFromPrivateKey(privateKey: string): ethers.Wallet {
    return new ethers.Wallet(privateKey, this.provider);
  }

  /**
   * Get BNB balance for an address (with API fallback)
   */
  async getBNBBalance(address: string): Promise<string> {
    try {
      console.log(`💰 Getting BNB balance for: ${address}`);
      
      // Try BSC API first (more reliable and faster)
      const balance = await bscApiService.getBNBBalance(address);
      console.log(`✅ BNB balance from API: ${balance}`);
      return balance;
    } catch (apiError) {
      console.warn('⚠️ BSC API failed, falling back to RPC:', apiError);
      
      // Fallback to RPC
      try {
        return await this.executeWithFallback(async (provider) => {
          const balance = await provider.getBalance(address);
          const formatted = ethers.formatEther(balance);
          console.log(`✅ BNB balance from RPC: ${formatted}`);
          return formatted;
        });
      } catch (rpcError) {
        console.error('❌ Both API and RPC failed for BNB balance:', rpcError);
        throw new Error('Failed to get BNB balance from all sources');
      }
    }
  }

  /**
   * Get USDT balance for an address (with API fallback)
   */
  async getUSDTBalance(address: string): Promise<string> {
    try {
      console.log(`💰 Getting USDT balance for: ${address}`);
      
      // Try BSC API first (more reliable and faster)
      const balance = await bscApiService.getUSDTBalance(address);
      console.log(`✅ USDT balance from API: ${balance}`);
      return balance;
    } catch (apiError) {
      console.warn('⚠️ BSC API failed, falling back to RPC:', apiError);
      
      // Fallback to RPC
      try {
        return await this.executeWithFallback(async (provider) => {
          const contract = new ethers.Contract(USDT_CONTRACT_ADDRESS, ERC20_ABI, provider);
          const balance = await contract.balanceOf(address);
          const formatted = ethers.formatUnits(balance, 18); // USDT has 18 decimals on BSC
          console.log(`✅ USDT balance from RPC: ${formatted}`);
          return formatted;
        });
      } catch (rpcError) {
        console.error('❌ Both API and RPC failed for USDT balance:', rpcError);
        throw new Error('Failed to get USDT balance from all sources');
      }
    }
  }

  /**
   * Get transaction details (with API fallback)
   */
  async getTransaction(txHash: string): Promise<ethers.TransactionResponse | null> {
    try {
      console.log(`🔍 Getting transaction: ${txHash}`);
      
      // Try BSC API first
      const apiTx = await bscApiService.getTransactionByHash(txHash);
      if (apiTx) {
        console.log(`✅ Transaction found via API`);
        return apiTx;
      }
    } catch (apiError) {
      console.warn('⚠️ BSC API failed for transaction, falling back to RPC:', apiError);
    }

    // Fallback to RPC
    try {
      return await this.executeWithFallback(async (provider) => {
        const tx = await provider.getTransaction(txHash);
        if (tx) {
          console.log(`✅ Transaction found via RPC`);
        }
        return tx;
      });
    } catch (error) {
      console.error('❌ Error getting transaction:', error);
      return null;
    }
  }

  /**
   * Get transaction receipt (with API fallback)
   */
  async getTransactionReceipt(txHash: string): Promise<ethers.TransactionReceipt | null> {
    try {
      console.log(`📄 Getting transaction receipt: ${txHash}`);
      
      // Try BSC API first
      const apiReceipt = await bscApiService.getTransactionReceipt(txHash);
      if (apiReceipt) {
        console.log(`✅ Receipt found via API`);
        return apiReceipt;
      }
    } catch (apiError) {
      console.warn('⚠️ BSC API failed for receipt, falling back to RPC:', apiError);
    }

    // Fallback to RPC
    try {
      return await this.executeWithFallback(async (provider) => {
        const receipt = await provider.getTransactionReceipt(txHash);
        if (receipt) {
          console.log(`✅ Receipt found via RPC`);
        }
        return receipt;
      });
    } catch (error) {
      console.error('❌ Error getting transaction receipt:', error);
      return null;
    }
  }

  /**
   * Monitor address for incoming USDT transactions using BSC API
   */
  async monitorUSDTTransfers(
    address: string,
    callback: (from: string, to: string, amount: string, txHash: string) => void,
    lastCheckedBlock: number = 0
  ): Promise<void> {
    try {
      console.log(`🔍 Starting USDT monitoring for ${address} from block ${lastCheckedBlock}`);
      
      // Use BSC API for monitoring (more efficient)
      await bscApiService.monitorAddressForUSDT(
        address,
        lastCheckedBlock,
        (transactions) => {
          transactions.forEach(tx => {
            const amount = (parseFloat(tx.value) / Math.pow(10, 18)).toString();
            console.log(`📥 USDT Transfer: ${amount} USDT to ${tx.to} (TX: ${tx.hash})`);
            callback(tx.from, tx.to, amount, tx.hash);
          });
        }
      );
    } catch (error) {
      console.error('❌ Error setting up USDT transfer monitoring:', error);
      
      // Fallback to RPC monitoring
      try {
        console.log('🔄 Falling back to RPC monitoring...');
        const filter = this.usdtContract.filters.Transfer(null, address);
        this.usdtContract.on(filter, (from, to, amount, event) => {
          const amountFormatted = ethers.formatUnits(amount, 18);
          console.log(`📥 RPC USDT Transfer: ${amountFormatted} USDT`);
          callback(from, to, amountFormatted, event.transactionHash);
        });
      } catch (rpcError) {
        console.error('❌ RPC monitoring also failed:', rpcError);
        throw new Error('Failed to monitor USDT transfers on BSC Mainnet');
      }
    }
  }

  /**
   * Get past USDT transfer events for an address using BSC API
   */
  async getPastUSDTTransfers(
    address: string,
    fromBlock: number = -1000 // Last 1000 blocks
  ): Promise<Array<{
    from: string;
    to: string;
    amount: string;
    txHash: string;
    blockNumber: number;
  }>> {
    try {
      // Calculate actual from block
      const currentBlock = await this.getCurrentBlockNumber();
      const actualFromBlock = fromBlock < 0 ? currentBlock + fromBlock : fromBlock;
      
      console.log(`🔍 Checking past USDT transfers for ${address} from block ${actualFromBlock} to ${currentBlock}`);
      
      // Use BSC API for better performance
      const transactions = await bscApiService.getUSDTTransfers(
        address,
        actualFromBlock,
        currentBlock,
        1,
        100
      );

      const transfers = transactions.map(tx => ({
        from: tx.from,
        to: tx.to,
        amount: (parseFloat(tx.value) / Math.pow(10, 18)).toString(),
        txHash: tx.hash,
        blockNumber: parseInt(tx.blockNumber),
      }));

      console.log(`📊 Found ${transfers.length} past USDT transfers`);
      return transfers;
    } catch (apiError) {
      console.warn('⚠️ BSC API failed for past transfers, falling back to RPC:', apiError);
      
      // Fallback to RPC
      try {
        const filter = this.usdtContract.filters.Transfer(null, address);
        const events = await this.usdtContract.queryFilter(filter, fromBlock);
        
        const transfers = events.map(event => ({
          from: event.args?.[0] || '',
          to: event.args?.[1] || '',
          amount: ethers.formatUnits(event.args?.[2] || 0, 18),
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
        }));

        console.log(`📊 Found ${transfers.length} past USDT transfers via RPC`);
        return transfers;
      } catch (rpcError) {
        console.error('❌ Both API and RPC failed for past transfers:', rpcError);
        return [];
      }
    }
  }

  /**
   * Validate if an address is a valid Ethereum/BSC address
   */
  isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  /**
   * Get current block number (with API fallback)
   */
  async getCurrentBlockNumber(): Promise<number> {
    try {
      // Try BSC API first
      const blockNumber = await bscApiService.getCurrentBlockNumber();
      console.log(`📊 Current block number from API: ${blockNumber}`);
      return blockNumber;
    } catch (apiError) {
      console.warn('⚠️ BSC API failed for block number, falling back to RPC:', apiError);
      
      // Fallback to RPC
      try {
        return await this.executeWithFallback(async (provider) => {
          const blockNumber = await provider.getBlockNumber();
          console.log(`📊 Current block number from RPC: ${blockNumber}`);
          return blockNumber;
        });
      } catch (error) {
        console.error('❌ Error getting current block number:', error);
        throw new Error('Failed to get current block number from BSC Mainnet');
      }
    }
  }

  /**
   * Get network information
   */
  getNetworkConfig() {
    return {
      ...BSC_CONFIG,
      usdtAddress: USDT_CONTRACT_ADDRESS,
      isMainnet: true,
      network: 'BSC Mainnet',
    };
  }

  /**
   * Get explorer URL for transaction
   */
  getTransactionUrl(txHash: string): string {
    return `${BSC_CONFIG.explorerUrl}/tx/${txHash}`;
  }

  /**
   * Get explorer URL for address
   */
  getAddressUrl(address: string): string {
    return `${BSC_CONFIG.explorerUrl}/address/${address}`;
  }

  /**
   * Check if transaction is confirmed (with API fallback)
   */
  async isTransactionConfirmed(
    txHash: string,
    requiredConfirmations: number = 12
  ): Promise<{ confirmed: boolean; confirmations: number }> {
    try {
      console.log(`🔍 Checking confirmations for: ${txHash}`);
      
      // Try BSC API first
      const apiResult = await bscApiService.getTransactionConfirmations(txHash);
      if (apiResult.confirmations > 0) {
        console.log(`✅ Confirmations from API: ${apiResult.confirmations}/12`);
        return {
          confirmed: apiResult.confirmations >= requiredConfirmations,
          confirmations: apiResult.confirmations,
        };
      }
    } catch (apiError) {
      console.warn('⚠️ BSC API failed for confirmations, falling back to RPC:', apiError);
    }

    // Fallback to RPC
    try {
      const receipt = await this.getTransactionReceipt(txHash);
      if (!receipt) {
        return { confirmed: false, confirmations: 0 };
      }

      const currentBlock = await this.getCurrentBlockNumber();
      const confirmations = currentBlock - receipt.blockNumber + 1;
      
      console.log(`✅ Confirmations from RPC: ${confirmations}/12`);
      
      return {
        confirmed: confirmations >= requiredConfirmations,
        confirmations,
      };
    } catch (error) {
      console.error('❌ Error checking transaction confirmation:', error);
      return { confirmed: false, confirmations: 0 };
    }
  }

  /**
   * Get gas price (with API fallback)
   */
  async getGasPrice(): Promise<bigint> {
    try {
      // Try BSC API first
      const gasPriceGwei = await bscApiService.getGasPrice();
      const gasPriceWei = BigInt(Math.floor(parseFloat(gasPriceGwei) * Math.pow(10, 9)));
      console.log(`⛽ Gas price from API: ${gasPriceGwei} Gwei`);
      return gasPriceWei;
    } catch (apiError) {
      console.warn('⚠️ BSC API failed for gas price, falling back to RPC:', apiError);
      
      // Fallback to RPC
      try {
        return await this.executeWithFallback(async (provider) => {
          const feeData = await provider.getFeeData();
          const gasPrice = feeData.gasPrice || BigInt(5000000000); // 5 Gwei fallback
          console.log(`⛽ Gas price from RPC: ${Number(gasPrice) / 1e9} Gwei`);
          return gasPrice;
        });
      } catch (error) {
        console.error('❌ Error getting gas price:', error);
        const fallbackGasPrice = BigInt(5000000000); // 5 Gwei fallback
        console.log(`⛽ Using fallback gas price: 5 Gwei`);
        return fallbackGasPrice;
      }
    }
  }

  /**
   * Get network statistics
   */
  async getNetworkStats(): Promise<{
    gasPrice: string;
    blockNumber: number;
    apiStatus: boolean;
    network: string;
  }> {
    try {
      const [stats, apiStatus] = await Promise.all([
        bscApiService.getNetworkStats(),
        bscApiService.validateApiKey(),
      ]);

      return {
        ...stats,
        apiStatus,
        network: 'BSC Mainnet',
      };
    } catch (error) {
      console.error('❌ Error getting network stats:', error);
      return {
        gasPrice: '5',
        blockNumber: 0,
        apiStatus: false,
        network: 'BSC Mainnet',
      };
    }
  }

  /**
   * Test all connections (API + RPC)
   */
  async testConnections(): Promise<{
    api: { working: boolean; error?: string };
    rpc: { working: boolean; error?: string };
    fallbacks: Array<{ working: boolean; error?: string }>;
    network: string;
  }> {
    console.log('🧪 Testing all BSC Mainnet connections...');
    
    const results = {
      api: { working: false, error: undefined as string | undefined },
      rpc: { working: false, error: undefined as string | undefined },
      fallbacks: [] as Array<{ working: boolean; error?: string }>,
      network: 'BSC Mainnet',
    };

    // Test BSC API
    try {
      await bscApiService.getCurrentBlockNumber();
      results.api.working = true;
      console.log('✅ BSC API connection working');
    } catch (error: any) {
      results.api.error = error.message;
      console.log('❌ BSC API connection failed:', error.message);
    }

    // Test primary RPC
    try {
      await this.provider.getBlockNumber();
      results.rpc.working = true;
      console.log('✅ Primary RPC connection working');
    } catch (error: any) {
      results.rpc.error = error.message;
      console.log('❌ Primary RPC connection failed:', error.message);
    }

    // Test fallback RPCs
    for (let i = 0; i < this.fallbackProviders.length; i++) {
      try {
        await this.fallbackProviders[i].getBlockNumber();
        results.fallbacks.push({ working: true });
        console.log(`✅ Fallback RPC ${i + 1} working`);
      } catch (error: any) {
        results.fallbacks.push({ working: false, error: error.message });
        console.log(`❌ Fallback RPC ${i + 1} failed:`, error.message);
      }
    }

    const workingConnections = [
      results.api.working,
      results.rpc.working,
      ...results.fallbacks.map(f => f.working)
    ].filter(Boolean).length;

    console.log(`📊 Connection test complete: ${workingConnections}/${2 + results.fallbacks.length} connections working`);

    return results;
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();