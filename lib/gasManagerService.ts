import { gasManager, initializeGasManager, MasterWalletConfig } from './gasManager';
import { supabase } from './supabase';

/**
 * Service to manage gas operations and initialize the gas manager
 */
export class GasManagerService {
  private static instance: GasManagerService;
  private initialized: boolean = false;

  private constructor() {}

  static getInstance(): GasManagerService {
    if (!GasManagerService.instance) {
      GasManagerService.instance = new GasManagerService();
    }
    return GasManagerService.instance;
  }

  /**
   * Initialize the gas manager with configuration from database
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) {
      console.log('🔧 Gas Manager already initialized');
      return true;
    }

    try {
      console.log('🚀 Initializing Gas Manager Service...');

      // Get master wallet configuration from database
      const { data: config, error } = await supabase
        .from('master_wallet_config')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        console.error('❌ Failed to load master wallet config:', error);
        return false;
      }

      if (!config) {
        console.error('❌ No master wallet configuration found');
        return false;
      }

      // For demo purposes, we'll use a placeholder private key
      // In production, this should be securely stored and encrypted
      const masterWalletConfig: MasterWalletConfig = {
        address: config.wallet_address,
        privateKey: process.env.MASTER_WALLET_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000001',
        minBNBReserve: config.min_bnb_reserve,
        gasDistributionAmount: config.gas_distribution_amount,
        sweepThresholds: {
          high: config.sweep_threshold_high,
          medium: config.sweep_threshold_medium,
          low: config.sweep_threshold_low,
        },
      };

      // Initialize the gas manager
      initializeGasManager(masterWalletConfig);

      // Start automated sweeping if enabled
      if (config.auto_sweep_enabled && gasManager) {
        await gasManager.startAutomatedSweeping();
        console.log('✅ Automated sweeping started');
      }

      this.initialized = true;
      console.log('✅ Gas Manager Service initialized successfully');
      return true;

    } catch (error: any) {
      console.error('❌ Failed to initialize Gas Manager Service:', error);
      return false;
    }
  }

  /**
   * Start automated sweeping
   */
  async startAutomatedSweeping(): Promise<boolean> {
    if (!gasManager) {
      console.error('❌ Gas Manager not initialized');
      return false;
    }

    try {
      await gasManager.startAutomatedSweeping();
      
      // Update database configuration
      await supabase
        .from('master_wallet_config')
        .update({ auto_sweep_enabled: true })
        .eq('wallet_address', gasManager['config'].address);

      console.log('✅ Automated sweeping started');
      return true;
    } catch (error: any) {
      console.error('❌ Failed to start automated sweeping:', error);
      return false;
    }
  }

  /**
   * Stop automated sweeping
   */
  async stopAutomatedSweeping(): Promise<boolean> {
    if (!gasManager) {
      console.error('❌ Gas Manager not initialized');
      return false;
    }

    try {
      gasManager.stopAutomatedSweeping();
      
      // Update database configuration
      await supabase
        .from('master_wallet_config')
        .update({ auto_sweep_enabled: false })
        .eq('wallet_address', gasManager['config'].address);

      console.log('✅ Automated sweeping stopped');
      return true;
    } catch (error: any) {
      console.error('❌ Failed to stop automated sweeping:', error);
      return false;
    }
  }

  /**
   * Trigger manual sweep operation
   */
  async triggerManualSweep(): Promise<boolean> {
    if (!gasManager) {
      console.error('❌ Gas Manager not initialized');
      return false;
    }

    try {
      await gasManager.performFullSweepCycle();
      console.log('✅ Manual sweep completed');
      return true;
    } catch (error: any) {
      console.error('❌ Manual sweep failed:', error);
      return false;
    }
  }

  /**
   * Emergency sweep for specific wallet
   */
  async emergencySweep(walletAddress: string): Promise<boolean> {
    if (!gasManager) {
      console.error('❌ Gas Manager not initialized');
      return false;
    }

    try {
      const result = await gasManager.emergencySweep(walletAddress);
      if (result) {
        console.log(`✅ Emergency sweep completed for ${walletAddress}`);
      } else {
        console.log(`⚠️ Emergency sweep failed for ${walletAddress}`);
      }
      return result;
    } catch (error: any) {
      console.error(`❌ Emergency sweep error for ${walletAddress}:`, error);
      return false;
    }
  }

  /**
   * Get gas operation statistics
   */
  async getGasStats(days: number = 7): Promise<any> {
    if (!gasManager) {
      console.error('❌ Gas Manager not initialized');
      return null;
    }

    try {
      return await gasManager.getGasOperationStats(days);
    } catch (error: any) {
      console.error('❌ Failed to get gas stats:', error);
      return null;
    }
  }

  /**
   * Check if gas manager is initialized and running
   */
  isInitialized(): boolean {
    return this.initialized && gasManager !== null;
  }

  /**
   * Get current gas manager instance
   */
  getGasManager() {
    return gasManager;
  }
}

// Export singleton instance
export const gasManagerService = GasManagerService.getInstance();

// Auto-initialize when the module is loaded (in production environment)
if (typeof window === 'undefined') { // Server-side only
  gasManagerService.initialize().catch(error => {
    console.error('❌ Failed to auto-initialize Gas Manager Service:', error);
  });
}