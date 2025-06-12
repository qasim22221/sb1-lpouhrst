import axios from 'axios';

// BSC Mainnet API Configuration ONLY
export const BSC_API_CONFIG = {
  apiUrl: 'https://api.bscscan.com/api',
  apiKey: process.env.NEXT_PUBLIC_BSC_API_KEY || '',
  chainId: 56,
  explorerUrl: 'https://bscscan.com',
  network: 'BSC Mainnet',
};

// USDT Contract Address on BSC Mainnet ONLY
export const USDT_CONTRACT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';

export interface BSCTransaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  contractAddress: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  confirmations: string;
}

export interface BSCBalance {
  account: string;
  balance: string;
}

export class BSCApiService {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = BSC_API_CONFIG.apiKey;
    this.apiUrl = BSC_API_CONFIG.apiUrl;
    
    console.log('🔗 Initializing BSC Mainnet API service...');
    console.log(`🌐 API URL: ${this.apiUrl}`);
    console.log(`🔑 API Key: ${this.apiKey ? 'Provided' : 'Missing - using public endpoints with rate limits'}`);
    
    if (!this.apiKey) {
      console.warn('⚠️ BSC API key not provided. Using public endpoints with rate limits.');
      console.warn('⚠️ Add NEXT_PUBLIC_BSC_API_KEY to your .env.local file for better performance.');
    }
  }

  /**
   * Get BNB balance for an address
   */
  async getBNBBalance(address: string): Promise<string> {
    try {
      console.log(`💰 Getting BNB balance for: ${address}`);
      
      const response = await axios.get(this.apiUrl, {
        params: {
          module: 'account',
          action: 'balance',
          address: address,
          tag: 'latest',
          apikey: this.apiKey,
        },
        timeout: 10000, // 10 second timeout
      });

      if (response.data.status === '1') {
        // Convert from wei to BNB
        const balanceWei = response.data.result;
        const balanceBNB = (parseFloat(balanceWei) / Math.pow(10, 18)).toFixed(6);
        console.log(`✅ BNB balance: ${balanceBNB} BNB`);
        return balanceBNB;
      } else {
        throw new Error(response.data.message || 'Failed to get BNB balance');
      }
    } catch (error: any) {
      console.error('❌ Error getting BNB balance from BSC API:', error);
      throw new Error(`Failed to get BNB balance: ${error.message}`);
    }
  }

  /**
   * Get USDT token balance for an address
   */
  async getUSDTBalance(address: string): Promise<string> {
    try {
      console.log(`💰 Getting USDT balance for: ${address}`);
      
      const response = await axios.get(this.apiUrl, {
        params: {
          module: 'account',
          action: 'tokenbalance',
          contractaddress: USDT_CONTRACT_ADDRESS,
          address: address,
          tag: 'latest',
          apikey: this.apiKey,
        },
        timeout: 10000, // 10 second timeout
      });

      if (response.data.status === '1') {
        // Convert from token units to USDT (18 decimals)
        const balanceRaw = response.data.result;
        const balanceUSDT = (parseFloat(balanceRaw) / Math.pow(10, 18)).toFixed(2);
        console.log(`✅ USDT balance: ${balanceUSDT} USDT`);
        return balanceUSDT;
      } else {
        throw new Error(response.data.message || 'Failed to get USDT balance');
      }
    } catch (error: any) {
      console.error('❌ Error getting USDT balance from BSC API:', error);
      throw new Error(`Failed to get USDT balance: ${error.message}`);
    }
  }

  /**
   * Get USDT token transfers for an address
   */
  async getUSDTTransfers(
    address: string,
    startBlock: number = 0,
    endBlock: number = 999999999,
    page: number = 1,
    offset: number = 100
  ): Promise<BSCTransaction[]> {
    try {
      console.log(`🔍 Getting USDT transfers for: ${address} (blocks ${startBlock}-${endBlock})`);
      
      const response = await axios.get(this.apiUrl, {
        params: {
          module: 'account',
          action: 'tokentx',
          contractaddress: USDT_CONTRACT_ADDRESS,
          address: address,
          startblock: startBlock,
          endblock: endBlock,
          page: page,
          offset: offset,
          sort: 'desc',
          apikey: this.apiKey,
        },
        timeout: 15000, // 15 second timeout for transfers
      });

      if (response.data.status === '1') {
        // Filter for incoming transfers only
        const incomingTransfers = response.data.result.filter((tx: BSCTransaction) => 
          tx.to.toLowerCase() === address.toLowerCase()
        );
        
        console.log(`📊 Found ${incomingTransfers.length} incoming USDT transfers`);
        return incomingTransfers;
      } else {
        console.warn('⚠️ No USDT transfers found or API error:', response.data.message);
        return [];
      }
    } catch (error: any) {
      console.error('❌ Error getting USDT transfers from BSC API:', error);
      return [];
    }
  }

  /**
   * Get transaction details by hash
   */
  async getTransactionByHash(txHash: string): Promise<any> {
    try {
      console.log(`🔍 Getting transaction details: ${txHash}`);
      
      const response = await axios.get(this.apiUrl, {
        params: {
          module: 'proxy',
          action: 'eth_getTransactionByHash',
          txhash: txHash,
          apikey: this.apiKey,
        },
        timeout: 10000,
      });

      if (response.data.result) {
        console.log(`✅ Transaction details retrieved`);
      }
      
      return response.data.result;
    } catch (error: any) {
      console.error('❌ Error getting transaction by hash:', error);
      return null;
    }
  }

  /**
   * Get transaction receipt by hash
   */
  async getTransactionReceipt(txHash: string): Promise<any> {
    try {
      console.log(`📄 Getting transaction receipt: ${txHash}`);
      
      const response = await axios.get(this.apiUrl, {
        params: {
          module: 'proxy',
          action: 'eth_getTransactionReceipt',
          txhash: txHash,
          apikey: this.apiKey,
        },
        timeout: 10000,
      });

      if (response.data.result) {
        console.log(`✅ Transaction receipt retrieved`);
      }
      
      return response.data.result;
    } catch (error: any) {
      console.error('❌ Error getting transaction receipt:', error);
      return null;
    }
  }

  /**
   * Get current block number
   */
  async getCurrentBlockNumber(): Promise<number> {
    try {
      console.log(`📊 Getting current BSC Mainnet block number...`);
      
      const response = await axios.get(this.apiUrl, {
        params: {
          module: 'proxy',
          action: 'eth_blockNumber',
          apikey: this.apiKey,
        },
        timeout: 10000,
      });

      if (response.data.result) {
        const blockNumber = parseInt(response.data.result, 16);
        console.log(`✅ Current block number: ${blockNumber}`);
        return blockNumber;
      } else {
        throw new Error('Failed to get block number from BSC API');
      }
    } catch (error: any) {
      console.error('❌ Error getting current block number:', error);
      throw new Error(`Failed to get block number: ${error.message}`);
    }
  }

  /**
   * Check transaction confirmations
   */
  async getTransactionConfirmations(txHash: string): Promise<{
    confirmed: boolean;
    confirmations: number;
    blockNumber?: number;
  }> {
    try {
      console.log(`🔍 Checking confirmations for: ${txHash}`);
      
      const receipt = await this.getTransactionReceipt(txHash);
      if (!receipt || !receipt.blockNumber) {
        console.log(`⚠️ Transaction not found or not mined yet`);
        return { confirmed: false, confirmations: 0 };
      }

      const currentBlock = await this.getCurrentBlockNumber();
      const txBlock = parseInt(receipt.blockNumber, 16);
      const confirmations = currentBlock - txBlock + 1;

      console.log(`📊 Confirmations: ${confirmations}/12 (block ${txBlock})`);

      return {
        confirmed: confirmations >= 12,
        confirmations,
        blockNumber: txBlock,
      };
    } catch (error: any) {
      console.error('❌ Error checking transaction confirmations:', error);
      return { confirmed: false, confirmations: 0 };
    }
  }

  /**
   * Monitor address for new USDT transactions
   */
  async monitorAddressForUSDT(
    address: string,
    lastCheckedBlock: number,
    callback: (transactions: BSCTransaction[]) => void
  ): Promise<void> {
    try {
      console.log(`🔍 Monitoring ${address} for USDT transactions from block ${lastCheckedBlock}`);
      
      const currentBlock = await this.getCurrentBlockNumber();
      const transactions = await this.getUSDTTransfers(
        address,
        lastCheckedBlock,
        currentBlock,
        1,
        100
      );

      if (transactions.length > 0) {
        console.log(`📥 Found ${transactions.length} new USDT transactions for ${address}`);
        callback(transactions);
      } else {
        console.log(`ℹ️ No new USDT transactions found for ${address}`);
      }
    } catch (error: any) {
      console.error('❌ Error monitoring address:', error);
      throw new Error(`Failed to monitor address: ${error.message}`);
    }
  }

  /**
   * Get gas price
   */
  async getGasPrice(): Promise<string> {
    try {
      console.log(`⛽ Getting current gas price...`);
      
      const response = await axios.get(this.apiUrl, {
        params: {
          module: 'proxy',
          action: 'eth_gasPrice',
          apikey: this.apiKey,
        },
        timeout: 10000,
      });

      if (response.data.result) {
        const gasPriceWei = parseInt(response.data.result, 16);
        const gasPriceGwei = gasPriceWei / Math.pow(10, 9);
        console.log(`✅ Gas price: ${gasPriceGwei.toFixed(2)} Gwei`);
        return gasPriceGwei.toFixed(2);
      } else {
        throw new Error('Failed to get gas price from BSC API');
      }
    } catch (error: any) {
      console.error('❌ Error getting gas price:', error);
      console.log(`⛽ Using fallback gas price: 5 Gwei`);
      return '5'; // Default fallback
    }
  }

  /**
   * Get network stats
   */
  async getNetworkStats(): Promise<{
    gasPrice: string;
    blockNumber: number;
    network: string;
  }> {
    try {
      console.log(`📊 Getting BSC Mainnet network stats...`);
      
      const [gasPrice, blockNumber] = await Promise.all([
        this.getGasPrice(),
        this.getCurrentBlockNumber(),
      ]);

      console.log(`✅ Network stats retrieved`);
      
      return {
        gasPrice,
        blockNumber,
        network: 'BSC Mainnet',
      };
    } catch (error: any) {
      console.error('❌ Error getting network stats:', error);
      return {
        gasPrice: '5',
        blockNumber: 0,
        network: 'BSC Mainnet',
      };
    }
  }

  /**
   * Validate if API key is working
   */
  async validateApiKey(): Promise<boolean> {
    try {
      console.log(`🔑 Validating BSC API key...`);
      
      const response = await axios.get(this.apiUrl, {
        params: {
          module: 'proxy',
          action: 'eth_blockNumber',
          apikey: this.apiKey,
        },
        timeout: 5000,
      });

      const isValid = response.data.status !== '0' && !response.data.message?.includes('Invalid API Key');
      
      if (isValid) {
        console.log(`✅ BSC API key is valid`);
      } else {
        console.log(`❌ BSC API key is invalid or missing`);
      }
      
      return isValid;
    } catch (error) {
      console.log(`❌ BSC API key validation failed`);
      return false;
    }
  }

  /**
   * Get API usage stats (if supported)
   */
  async getApiUsage(): Promise<{
    used: number;
    limit: number;
    remaining: number;
  } | null> {
    try {
      // This endpoint might not be available on all BSC API providers
      const response = await axios.get(this.apiUrl, {
        params: {
          module: 'stats',
          action: 'tokensupply',
          contractaddress: USDT_CONTRACT_ADDRESS,
          apikey: this.apiKey,
        },
        timeout: 5000,
      });

      // Extract rate limit info from headers if available
      const headers = response.headers;
      if (headers['x-ratelimit-limit']) {
        return {
          used: parseInt(headers['x-ratelimit-used'] || '0'),
          limit: parseInt(headers['x-ratelimit-limit']),
          remaining: parseInt(headers['x-ratelimit-remaining'] || '0'),
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get explorer URLs
   */
  getTransactionUrl(txHash: string): string {
    return `${BSC_API_CONFIG.explorerUrl}/tx/${txHash}`;
  }

  getAddressUrl(address: string): string {
    return `${BSC_API_CONFIG.explorerUrl}/address/${address}`;
  }

  getTokenUrl(contractAddress: string = USDT_CONTRACT_ADDRESS): string {
    return `${BSC_API_CONFIG.explorerUrl}/token/${contractAddress}`;
  }

  /**
   * Get network configuration
   */
  getNetworkConfig() {
    return {
      ...BSC_API_CONFIG,
      usdtContract: USDT_CONTRACT_ADDRESS,
      isMainnet: true,
    };
  }

  /**
   * Test BSC API connection
   */
  async testConnection(): Promise<{
    working: boolean;
    blockNumber?: number;
    gasPrice?: string;
    apiKeyValid?: boolean;
    error?: string;
  }> {
    try {
      console.log(`🧪 Testing BSC Mainnet API connection...`);
      
      const [blockNumber, gasPrice, apiKeyValid] = await Promise.all([
        this.getCurrentBlockNumber().catch(() => 0),
        this.getGasPrice().catch(() => '0'),
        this.validateApiKey().catch(() => false),
      ]);

      const working = blockNumber > 0;
      
      if (working) {
        console.log(`✅ BSC API connection test passed`);
      } else {
        console.log(`❌ BSC API connection test failed`);
      }

      return {
        working,
        blockNumber,
        gasPrice,
        apiKeyValid,
      };
    } catch (error: any) {
      console.error('❌ BSC API connection test failed:', error);
      return {
        working: false,
        error: error.message,
      };
    }
  }
}

// Export singleton instance
export const bscApiService = new BSCApiService();