import { ethers } from 'ethers';
import { supabase } from './supabase';
import crypto from 'crypto';

// BSC Mainnet configuration
const BSC_RPC_URL = process.env.NEXT_PUBLIC_BSC_RPC_URL || 'https://bsc-dataseed1.binance.org/';
const USDT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_USDT_CONTRACT_ADDRESS || '0x55d398326f99059fF775485246999027B3197955';
const HOT_WALLET_PRIVATE_KEY = process.env.HOT_WALLET_PRIVATE_KEY || '';
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || '';
const PRIVATE_KEY_SECRET = process.env.PRIVATE_KEY_SECRET || '';

// Provider setup
const provider = new ethers.JsonRpcProvider(BSC_RPC_URL, 56);

// Hot wallet setup
const hotWallet = new ethers.Wallet(HOT_WALLET_PRIVATE_KEY, provider);

// USDT Contract ABI
const USDT_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

// Hot wallet USDT contract instance
const usdtHotContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, hotWallet);

export interface DepositScanResult {
  newDeposits: number;
  totalScanned: number;
  errors: string[];
}

export interface HotWalletStatus {
  address: string;
  bnbBalance: string;
  usdtBalance: string;
  isConnected: boolean;
  lastUpdate: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  toAddress: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  txHash?: string;
  createdAt: string;
}

/**
 * Decrypt private key using the same method as your localhost implementation
 */
function decryptPrivateKey(encrypted: string): string {
  try {
    const [ivHex, dataHex] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedData = Buffer.from(dataHex, 'hex');
    const key = Buffer.from(PRIVATE_KEY_SECRET, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Failed to decrypt private key:', error);
    throw new Error('Failed to decrypt private key');
  }
}

/**
 * Encrypt private key for storage
 */
export function encryptPrivateKey(privateKey: string): string {
  try {
    const key = Buffer.from(PRIVATE_KEY_SECRET, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(privateKey, 'utf8'), cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    console.error('Failed to encrypt private key:', error);
    throw new Error('Failed to encrypt private key');
  }
}

/**
 * Get hot wallet status including balances
 */
export async function getHotWalletStatus(): Promise<HotWalletStatus> {
  try {
    console.log('🔍 Checking hot wallet status...');
    
    // Get BNB balance
    const bnbBalance = await provider.getBalance(hotWallet.address);
    const bnbFormatted = ethers.formatEther(bnbBalance);
    
    // Get USDT balance
    const usdtBalance = await usdtHotContract.balanceOf(hotWallet.address);
    const usdtFormatted = ethers.formatUnits(usdtBalance, 18);
    
    console.log(`💰 Hot wallet balances - BNB: ${bnbFormatted}, USDT: ${usdtFormatted}`);
    
    return {
      address: hotWallet.address,
      bnbBalance: bnbFormatted,
      usdtBalance: usdtFormatted,
      isConnected: true,
      lastUpdate: new Date().toISOString()
    };
  } catch (error: any) {
    console.error('❌ Failed to get hot wallet status:', error);
    return {
      address: hotWallet.address,
      bnbBalance: '0',
      usdtBalance: '0',
      isConnected: false,
      lastUpdate: new Date().toISOString()
    };
  }
}

/**
 * Scan for new deposits and process them
 */
export async function scanAndProcessDeposits(specificWallet?: string): Promise<DepositScanResult> {
  let totalNew = 0;
  let totalScanned = 0;
  const errors: string[] = [];

  try {
    console.log('🏃‍♂️ Running deposit scan...');

    // Get wallets to scan
    let walletRecords: any[] = [];
    
    if (specificWallet) {
      console.log('🔍 Scanning specific wallet:', specificWallet);
      const { data, error } = await supabase
        .from('user_wallets')
        .select('user_id, wallet_address, private_key')
        .eq('wallet_address', specificWallet)
        .single();
      
      if (error || !data) {
        throw new Error(`Failed to load wallet: ${error?.message || 'not found'}`);
      }
      walletRecords = [data];
    } else {
      console.log('🔍 Loading all deposit wallets');
      const { data, error } = await supabase
        .from('user_wallets')
        .select('user_id, wallet_address, private_key');
      
      if (error) {
        throw new Error(`Failed to load wallets: ${error.message}`);
      }
      
      console.log(`🔍 Found ${data?.length || 0} wallets to scan`);
      walletRecords = data || [];
    }

    totalScanned = walletRecords.length;

    // Scan each wallet for new deposits
    for (const { user_id, wallet_address, private_key } of walletRecords) {
      try {
        await processWalletDeposits(user_id, wallet_address, private_key);
        totalNew++;
      } catch (error: any) {
        console.error(`❌ Failed to process wallet ${wallet_address}:`, error);
        errors.push(`Wallet ${wallet_address}: ${error.message}`);
      }
    }

    console.log(`🏁 Deposit scan complete: ${totalNew} new deposits from ${totalScanned} wallets`);
    
    return {
      newDeposits: totalNew,
      totalScanned,
      errors
    };
  } catch (error: any) {
    console.error('❌ Deposit scan error:', error);
    errors.push(error.message);
    
    return {
      newDeposits: totalNew,
      totalScanned,
      errors
    };
  }
}

/**
 * Process deposits for a specific wallet
 */
async function processWalletDeposits(userId: string, walletAddress: string, encryptedPrivateKey: string): Promise<void> {
  try {
    // Fetch recent USDT transfers from BSCScan
    const url = `https://api.bscscan.com/api?module=account&action=tokentx` +
      `&contractaddress=${USDT_CONTRACT_ADDRESS}` +
      `&address=${walletAddress}` +
      `&page=1&offset=20&sort=desc` +
      `&apikey=${BSCSCAN_API_KEY}`;

    console.log(`➡️ Fetching transactions for ${walletAddress}`);
    const response = await fetch(url);
    const { status, result } = await response.json();
    
    if (status !== '1' || !Array.isArray(result)) {
      console.log(`⚠️ No transactions found for ${walletAddress}`);
      return;
    }

    console.log(`🔄 Found ${result.length} transactions for ${walletAddress}`);

    // Process each transaction
    for (const tx of result) {
      const txHash = tx.hash as string;
      const amount = Number(tx.value) / Math.pow(10, Number(tx.tokenDecimal));
      
      // Skip if we've already processed this transaction
      const { count } = await supabase
        .from('deposits')
        .select('transaction_hash', { count: 'exact', head: true })
        .eq('transaction_hash', txHash);
      
      if (count && count > 0) {
        continue;
      }

      // Insert the deposit record
      const { error: insertError } = await supabase
        .from('deposits')
        .insert({
          user_id: userId,
          wallet_address: walletAddress,
          transaction_hash: txHash,
          amount: amount,
          status: 'confirmed',
          network: 'BEP20',
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('❌ Failed to insert deposit:', insertError);
        continue;
      }

      console.log(`✅ Recorded deposit ${txHash} → ${amount} USDT`);

      // Perform sweep operation
      try {
        const { airdropHash, sweepHash } = await sweepDeposit(
          walletAddress,
          encryptedPrivateKey,
          amount
        );

        console.log(`🔄 Swept ${amount} USDT from ${walletAddress}: airdrop=${airdropHash}, sweep=${sweepHash}`);

        // Update deposit status
        await supabase
          .from('deposits')
          .update({ 
            status: 'swept',
            sweep_transaction_hash: sweepHash,
            airdrop_transaction_hash: airdropHash
          })
          .eq('transaction_hash', txHash);

        // Update user's fund wallet balance
        await supabase.rpc('add_to_fund_wallet', {
          user_id_param: userId,
          amount_param: amount,
          description_param: `Deposit swept from ${walletAddress} - TX: ${sweepHash}`
        });

        // Create notification
        await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            type: 'deposit_swept',
            title: 'Deposit Received',
            message: `Your deposit of ${amount} USDT has been processed`,
            data: { 
              txHash: sweepHash, 
              amount: amount,
              walletAddress: walletAddress
            }
          });

      } catch (sweepError: any) {
        console.error('❌ Sweep failed for', txHash, sweepError);
        
        // Update deposit with error status
        await supabase
          .from('deposits')
          .update({ 
            status: 'sweep_failed',
            error_message: sweepError.message
          })
          .eq('transaction_hash', txHash);
      }
    }
  } catch (error: any) {
    console.error(`❌ Error processing wallet ${walletAddress}:`, error);
    throw error;
  }
}

/**
 * Sweep a deposit: airdrop BNB for gas, then transfer USDT to hot wallet
 */
async function sweepDeposit(
  walletAddress: string,
  encryptedPrivateKey: string,
  amount: number
): Promise<{ airdropHash: string; sweepHash: string }> {
  try {
    console.log(`🔄 Starting sweep for ${walletAddress} - ${amount} USDT`);

    // Decrypt user's private key
    const userPrivateKey = decryptPrivateKey(encryptedPrivateKey);
    const userWallet = new ethers.Wallet(userPrivateKey, provider);

    // Create user's USDT contract instance
    const usdtUserContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, userWallet);

    // Convert amount to proper units
    const amountBN = ethers.parseUnits(amount.toString(), 18);

    // Estimate gas needed for USDT transfer
    const gasEstimate = await usdtUserContract.transfer.estimateGas(
      hotWallet.address,
      amountBN
    );

    // Get current gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    
    if (!gasPrice) {
      throw new Error('Could not fetch gas price');
    }

    // Calculate BNB needed for gas
    const bnbNeeded = gasEstimate * gasPrice;

    console.log(`⛽ Gas needed: ${ethers.formatEther(bnbNeeded)} BNB`);

    // Airdrop BNB for gas
    const airdropTx = await hotWallet.sendTransaction({
      to: walletAddress,
      value: bnbNeeded,
      gasLimit: 21000
    });

    await airdropTx.wait();
    console.log(`🅰️ Airdropped ${ethers.formatEther(bnbNeeded)} BNB to ${walletAddress}`);

    // Wait a moment for the airdrop to be confirmed
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Sweep USDT to hot wallet
    const sweepTx = await usdtUserContract.transfer(hotWallet.address, amountBN, {
      gasLimit: gasEstimate,
      gasPrice: gasPrice
    });

    await sweepTx.wait();
    console.log(`🔄 Swept ${amount} USDT from ${walletAddress} to hot wallet`);

    return {
      airdropHash: airdropTx.hash,
      sweepHash: sweepTx.hash
    };
  } catch (error: any) {
    console.error(`❌ Sweep failed for ${walletAddress}:`, error);
    throw new Error(`Sweep failed: ${error.message}`);
  }
}

/**
 * Process a withdrawal request
 */
export async function processWithdrawal(
  withdrawalId: string,
  toAddress: string,
  amount: number,
  userId: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    console.log(`💸 Processing withdrawal: ${amount} USDT to ${toAddress}`);

    // Validate amount
    if (amount <= 0) {
      throw new Error('Invalid withdrawal amount');
    }

    // Check hot wallet USDT balance
    const hotWalletStatus = await getHotWalletStatus();
    const availableUSDT = parseFloat(hotWalletStatus.usdtBalance);
    
    if (availableUSDT < amount) {
      throw new Error(`Insufficient USDT in hot wallet. Available: ${availableUSDT}, Requested: ${amount}`);
    }

    // Convert amount to proper units
    const amountBN = ethers.parseUnits(amount.toString(), 18);

    // Execute USDT transfer from hot wallet
    const tx = await usdtHotContract.transfer(toAddress, amountBN);
    await tx.wait();

    console.log(`✅ Withdrawal completed: ${tx.hash}`);

    // Update withdrawal record
    await supabase
      .from('withdrawals')
      .update({
        status: 'completed',
        transaction_hash: tx.hash,
        processed_at: new Date().toISOString()
      })
      .eq('id', withdrawalId);

    // Create notification
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'withdrawal_completed',
        title: 'Withdrawal Completed',
        message: `Your withdrawal of ${amount} USDT has been sent`,
        data: { 
          txHash: tx.hash, 
          amount: amount,
          toAddress: toAddress
        }
      });

    return {
      success: true,
      txHash: tx.hash
    };
  } catch (error: any) {
    console.error(`❌ Withdrawal failed:`, error);

    // Update withdrawal record with error
    await supabase
      .from('withdrawals')
      .update({
        status: 'failed',
        admin_notes: error.message
      })
      .eq('id', withdrawalId);

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get pending withdrawal requests
 */
export async function getPendingWithdrawals(): Promise<WithdrawalRequest[]> {
  try {
    const { data, error } = await supabase
      .from('withdrawals')
      .select(`
        id,
        user_id,
        withdrawal_address,
        amount,
        status,
        transaction_hash,
        created_at,
        profiles!inner(username, email)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch withdrawals: ${error.message}`);
    }

    return (data || []).map(w => ({
      id: w.id,
      userId: w.user_id,
      toAddress: w.withdrawal_address,
      amount: w.amount,
      status: w.status as any,
      txHash: w.transaction_hash,
      createdAt: w.created_at
    }));
  } catch (error: any) {
    console.error('❌ Failed to get pending withdrawals:', error);
    return [];
  }
}

/**
 * Generate a new wallet for a user
 */
export async function generateUserWallet(userId: string): Promise<{ address: string; privateKey: string }> {
  try {
    // Generate new wallet
    const wallet = ethers.Wallet.createRandom();
    
    // Encrypt private key
    const encryptedPrivateKey = encryptPrivateKey(wallet.privateKey);
    
    // Store in database
    const { error } = await supabase
      .from('user_wallets')
      .insert({
        user_id: userId,
        wallet_address: wallet.address,
        private_key: encryptedPrivateKey,
        network: 'BEP20',
        is_monitored: true
      });

    if (error) {
      throw new Error(`Failed to store wallet: ${error.message}`);
    }

    console.log(`✅ Generated new wallet for user ${userId}: ${wallet.address}`);

    return {
      address: wallet.address,
      privateKey: wallet.privateKey
    };
  } catch (error: any) {
    console.error('❌ Failed to generate user wallet:', error);
    throw error;
  }
}