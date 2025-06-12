"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Wallet, 
  QrCode, 
  Copy, 
  Check, 
  RefreshCw, 
  AlertCircle,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  Info,
  Zap,
  Shield,
  TrendingUp,
  Loader2,
  CreditCard,
  Eye,
  Activity,
  Globe,
  Link,
  Search,
  Scan,
  Send,
  ArrowDownRight,
  Plus,
  History
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { walletService, WalletData } from '@/lib/walletService';
import { blockchainService } from '@/lib/blockchain';

interface DepositRecord {
  id: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'failed';
  transaction_hash?: string;
  confirmations: number;
  created_at: string;
  confirmed_at?: string;
  block_number?: number;
  monitoring_started_at?: string;
}

interface BlockchainTransaction {
  hash: string;
  amount: string;
  blockNumber: number;
  timestamp: string;
  network: string;
  confirmations: number;
  status: 'pending' | 'confirmed';
  from: string;
  to: string;
  isProcessed: boolean;
}

interface WalletBalances {
  bnbBalance: string;
  usdtBalance: string;
}

export default function DepositPage() {
  const [mounted, setMounted] = useState(false);
  const [walletInfo, setWalletInfo] = useState<WalletData | null>(null);
  const [walletBalances, setWalletBalances] = useState<WalletBalances | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [addressCopied, setAddressCopied] = useState(false);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [isCheckingAddress, setIsCheckingAddress] = useState(false);
  const [isLoadingBlockchainTxs, setIsLoadingBlockchainTxs] = useState(false);
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [blockchainTransactions, setBlockchainTransactions] = useState<BlockchainTransaction[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fundWalletBalance, setFundWalletBalance] = useState(0);
  const [redirecting, setRedirecting] = useState(false);
  const [monitoringStatus, setMonitoringStatus] = useState<any>(null);
  
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only redirect if we're sure there's no user and auth is not loading
    if (mounted && !authLoading && !user && !redirecting) {
      console.log('🔄 No user found, redirecting to login...');
      setRedirecting(true);
      router.push('/login');
    } else if (mounted && !authLoading && user && profile && !redirecting) {
      // User is authenticated and has profile, initialize the deposit page
      console.log('✅ User authenticated, initializing deposit page...');
      initializeWallet();
      loadDeposits();
      loadFundWalletBalance();
      loadMonitoringStatus();
    }
  }, [user, profile, authLoading, mounted, router, redirecting]);

  const generateQRCode = (address: string) => {
    // Create QR code URL using a QR code service
    const qrData = encodeURIComponent(address);
    return `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${qrData}&bgcolor=ffffff&color=000000&margin=10`;
  };

  const initializeWallet = async () => {
    if (!user) return;

    try {
      setIsLoadingWallet(true);
      setError('');

      console.log('🔄 Initializing wallet for user:', user.id);

      // Get or create wallet using the wallet service
      const wallet = await walletService.getUserWallet(user.id);
      
      console.log('✅ Wallet initialized:', wallet.address);
      setWalletInfo(wallet);

      // Generate QR code
      const qrUrl = generateQRCode(wallet.address);
      setQrCodeUrl(qrUrl);

      if (wallet.isNew) {
        setSuccess('New BEP20 wallet address generated successfully! This is a real blockchain address on BSC Mainnet.');
      }

      // Load wallet balances
      await loadWalletBalances(wallet.address);

      // Load blockchain transactions
      await loadBlockchainTransactions(wallet.address);

    } catch (err: any) {
      console.error('❌ Error initializing wallet:', err);
      setError(`Failed to initialize wallet: ${err.message}`);
    } finally {
      setIsLoadingWallet(false);
    }
  };

  const loadWalletBalances = async (address: string) => {
    try {
      setIsLoadingBalances(true);
      console.log('🔄 Loading balances for:', address);

      const balances = await walletService.getWalletBalances(address);
      setWalletBalances(balances);

      console.log('✅ Balances loaded:', balances);
    } catch (err: any) {
      console.error('❌ Error loading balances:', err);
      // Don't show error for balance loading as it's not critical
    } finally {
      setIsLoadingBalances(false);
    }
  };

  const loadBlockchainTransactions = async (address: string) => {
    try {
      setIsLoadingBlockchainTxs(true);
      console.log('🔍 Loading blockchain transactions for:', address);

      // Get past USDT transfers from blockchain
      const transfers = await blockchainService.getPastUSDTTransfers(address, -5000); // Last 5000 blocks
      
      // Get current block number for confirmations
      const currentBlock = await blockchainService.getCurrentBlockNumber();

      // Process transactions and check confirmations
      const processedTxs: BlockchainTransaction[] = await Promise.all(
        transfers.map(async (transfer) => {
          const confirmations = currentBlock - transfer.blockNumber + 1;
          const status = confirmations >= 12 ? 'confirmed' : 'pending';
          
          // Check if this transaction is already processed in our database
          const { data: existingDeposit } = await supabase
            .from('deposits')
            .select('id, status')
            .eq('transaction_hash', transfer.txHash)
            .eq('user_id', user!.id)
            .maybeSingle();

          return {
            hash: transfer.txHash,
            amount: transfer.amount,
            blockNumber: transfer.blockNumber,
            timestamp: new Date().toISOString(), // BSC API doesn't always provide timestamp
            network: 'BSC Mainnet',
            confirmations,
            status,
            from: transfer.from,
            to: transfer.to,
            isProcessed: !!existingDeposit,
          };
        })
      );

      // Sort by block number (newest first)
      processedTxs.sort((a, b) => b.blockNumber - a.blockNumber);

      setBlockchainTransactions(processedTxs);
      console.log(`✅ Loaded ${processedTxs.length} blockchain transactions`);

      // Check for unprocessed confirmed transactions
      const unprocessedConfirmed = processedTxs.filter(tx => 
        !tx.isProcessed && tx.status === 'confirmed' && parseFloat(tx.amount) >= 1
      );

      if (unprocessedConfirmed.length > 0) {
        setSuccess(`Found ${unprocessedConfirmed.length} unprocessed confirmed USDT deposits! Click "Process Transaction" to add them to your fund wallet.`);
      }

    } catch (err: any) {
      console.error('❌ Error loading blockchain transactions:', err);
      setError(`Failed to load blockchain transactions: ${err.message}`);
    } finally {
      setIsLoadingBlockchainTxs(false);
    }
  };

  const processUnprocessedTransaction = async (tx: BlockchainTransaction) => {
    try {
      console.log(`🔄 Processing unprocessed transaction: ${tx.hash}`);
      
      // Create a deposit record for this transaction
      const { data: deposit, error: depositError } = await supabase
        .from('deposits')
        .insert({
          user_id: user!.id,
          wallet_address: walletInfo!.address,
          amount: parseFloat(tx.amount),
          status: 'confirmed',
          transaction_hash: tx.hash,
          confirmations: tx.confirmations,
          block_number: tx.blockNumber,
          confirmed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (depositError) {
        throw new Error(`Failed to create deposit record: ${depositError.message}`);
      }

      // Update user's fund wallet balance
      const currentBalance = fundWalletBalance;
      const newBalance = currentBalance + parseFloat(tx.amount);

      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ fund_wallet_balance: newBalance })
        .eq('id', user!.id);

      if (balanceError) {
        throw new Error(`Failed to update balance: ${balanceError.message}`);
      }

      // Create transaction record
      await supabase
        .from('fund_wallet_transactions')
        .insert({
          user_id: user!.id,
          transaction_type: 'deposit',
          amount: parseFloat(tx.amount),
          balance_before: currentBalance,
          balance_after: newBalance,
          reference_id: deposit.id,
          description: `BEP20 USDT Deposit - TX: ${tx.hash} (Block: ${tx.blockNumber}) - Processed from blockchain`
        });

      setSuccess(`✅ Successfully processed ${tx.amount} USDT deposit! Your fund wallet has been updated.`);
      setFundWalletBalance(newBalance);
      
      // Refresh data
      await Promise.all([
        loadDeposits(),
        loadBlockchainTransactions(walletInfo!.address),
      ]);

    } catch (err: any) {
      console.error('❌ Error processing transaction:', err);
      setError(`Failed to process transaction: ${err.message}`);
    }
  };

  const loadDeposits = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading deposits:', error);
        return;
      }

      setDeposits(data || []);
    } catch (err: any) {
      console.error('Error loading deposits:', err);
    }
  };

  const loadFundWalletBalance = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('fund_wallet_balance')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading fund wallet balance:', error);
        return;
      }

      setFundWalletBalance(data?.fund_wallet_balance || 0);
    } catch (err: any) {
      console.error('Error loading fund wallet balance:', err);
    }
  };

  const loadMonitoringStatus = async () => {
    try {
      const status = await walletService.getMonitoringStatus();
      setMonitoringStatus(status);
    } catch (err: any) {
      console.error('Error loading monitoring status:', err);
    }
  };

  const copyAddress = async () => {
    if (walletInfo?.address) {
      try {
        await navigator.clipboard.writeText(walletInfo.address);
        setAddressCopied(true);
        setTimeout(() => setAddressCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy address:', err);
      }
    }
  };

  const refreshDeposits = async () => {
    setIsRefreshing(true);
    await Promise.all([
      loadDeposits(),
      loadFundWalletBalance(),
      loadMonitoringStatus(),
    ]);
    
    // Also refresh wallet balances and blockchain transactions
    if (walletInfo) {
      await Promise.all([
        loadWalletBalances(walletInfo.address),
        loadBlockchainTransactions(walletInfo.address),
      ]);
    }
    
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  const checkSpecificAddress = async () => {
    if (!walletInfo) return;

    try {
      setIsCheckingAddress(true);
      setError('');

      console.log('🔍 Manually checking address for deposits...');
      
      const result = await walletService.checkSpecificAddress(walletInfo.address);
      
      if (result.found) {
        setSuccess(`✅ Found ${result.transactions.length} USDT transactions! Check the details below.`);
        
        // Show transaction details
        result.transactions.forEach(tx => {
          console.log(`📥 Transaction: ${tx.amount} USDT (${tx.hash})`);
        });
      } else {
        setSuccess('No USDT deposits found for this address in recent blocks.');
      }

      // Refresh deposits and blockchain transactions
      await Promise.all([
        loadDeposits(),
        loadFundWalletBalance(),
        loadBlockchainTransactions(walletInfo.address),
      ]);

    } catch (err: any) {
      console.error('❌ Error checking address:', err);
      setError(`Failed to check address: ${err.message}`);
    } finally {
      setIsCheckingAddress(false);
    }
  };

  const checkTransactionStatus = async (depositId: string, txHash?: string) => {
    if (!txHash) return;

    try {
      const { confirmed, confirmations } = await blockchainService.isTransactionConfirmed(txHash);
      
      if (confirmed) {
        setSuccess(`✅ Transaction ${txHash.substring(0, 10)}... is confirmed with ${confirmations} confirmations!`);
        await loadDeposits();
        await loadFundWalletBalance();
      } else {
        setSuccess(`⏳ Transaction has ${confirmations} confirmations. Waiting for 12 confirmations.`);
      }
    } catch (err: any) {
      console.error('Error checking transaction status:', err);
      setError(`Failed to check transaction: ${err.message}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Don't render anything until mounted
  if (!mounted) {
    return null;
  }

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show redirecting state
  if (redirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Show access denied if no user or profile
  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">Please log in to access the deposit page</p>
          <Button onClick={() => router.push('/login')}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-teal-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-orange-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/dashboard')}
                className="text-gray-600 hover:text-orange-600 hover:bg-orange-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Deposit USDT</h1>
                <p className="text-sm text-gray-600">BSC Mainnet - Automatic Detection</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Fund Wallet Balance</p>
              <p className="text-lg font-bold text-green-600">
                ${fundWalletBalance.toFixed(2)} USDT
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError('')}
                className="text-red-600 hover:text-red-700 p-0 h-auto mt-1"
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-2">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-green-700">{success}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSuccess('')}
                className="text-green-600 hover:text-green-700 p-0 h-auto mt-1"
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {/* Live Integration Notice */}
        <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Zap className="w-5 h-5 mr-2" />
              Automatic USDT Detection
            </CardTitle>
          </CardHeader>
          <CardContent className="text-white/90 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4" />
                <span className="text-sm">Real-time monitoring</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span className="text-sm">Automatic confirmation</span>
              </div>
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4" />
                <span className="text-sm">BSC Mainnet</span>
              </div>
            </div>
            {monitoringStatus && (
              <div className="bg-white/10 rounded-lg p-3 mt-3">
                <div className="flex items-center justify-between text-sm">
                  <span>System Status:</span>
                  <span className={`font-semibold ${monitoringStatus.apiStatus ? 'text-green-300' : 'text-yellow-300'}`}>
                    {monitoringStatus.apiStatus ? 'Fully Operational' : 'Backup Mode'}
                  </span>
                </div>
                <div className="text-xs text-white/80 mt-1">
                  All deposits are automatically detected and processed
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card className="bg-gradient-to-r from-green-400 to-teal-500 text-white border-0">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Send className="w-5 h-5 mr-2" />
              How to Deposit
            </CardTitle>
          </CardHeader>
          <CardContent className="text-white/90">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">1</span>
                </div>
                <h3 className="font-semibold mb-2">Copy Address</h3>
                <p className="text-sm text-white/80">Copy your unique BEP20 wallet address below</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">2</span>
                </div>
                <h3 className="font-semibold mb-2">Send USDT</h3>
                <p className="text-sm text-white/80">Send USDT (BEP20) from any wallet or exchange</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">3</span>
                </div>
                <h3 className="font-semibold mb-2">Auto Credit</h3>
                <p className="text-sm text-white/80">Funds automatically credited after 12 confirmations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Wallet Address & QR Code */}
          <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wallet className="w-5 h-5 mr-2 text-orange-600" />
                Your BEP20 Deposit Address
              </CardTitle>
              <CardDescription>
                Send USDT (BEP20) to this address - deposits are detected automatically
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingWallet ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Generating wallet address...</p>
                </div>
              ) : walletInfo ? (
                <>
                  {/* QR Code */}
                  <div className="flex justify-center">
                    <div className="bg-white p-4 rounded-lg shadow-sm border">
                      {qrCodeUrl ? (
                        <img 
                          src={qrCodeUrl} 
                          alt="Wallet QR Code" 
                          className="w-48 h-48"
                        />
                      ) : (
                        <div className="w-48 h-48 bg-gray-100 rounded flex items-center justify-center">
                          <QrCode className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Wallet Address */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Wallet Address
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        value={walletInfo.address}
                        readOnly
                        className="font-mono text-sm bg-gray-50"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyAddress}
                        className="flex-shrink-0"
                      >
                        {addressCopied ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(walletService.getAddressUrl(walletInfo.address), '_blank')}
                        className="flex-shrink-0"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Network Info */}
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-orange-800">Network:</span>
                      <Badge className="bg-orange-100 text-orange-800">
                        BSC Mainnet
                      </Badge>
                    </div>
                    <div className="text-xs text-orange-700">
                      This is a real blockchain address on Binance Smart Chain Mainnet
                    </div>
                  </div>

                  {/* Wallet Balances */}
                  {walletBalances && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">Current Balances</h4>
                      <div className="space-y-1 text-xs text-blue-700">
                        <div className="flex justify-between">
                          <span>BNB:</span>
                          <span>{parseFloat(walletBalances.bnbBalance).toFixed(6)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>USDT:</span>
                          <span className="font-semibold">{parseFloat(walletBalances.usdtBalance).toFixed(2)}</span>
                        </div>
                      </div>
                      {isLoadingBalances && (
                        <div className="flex items-center justify-center mt-2">
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          <span className="text-xs">Updating...</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manual Check Button */}
                  <Button
                    onClick={checkSpecificAddress}
                    disabled={isCheckingAddress}
                    variant="outline"
                    className="w-full border-blue-200 hover:bg-blue-50 text-blue-700"
                  >
                    {isCheckingAddress ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Scanning Blockchain...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Scan className="w-4 h-4" />
                        <span>Check for Deposits</span>
                      </div>
                    )}
                  </Button>
                </>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-4" />
                  <p className="text-gray-600">Failed to load wallet</p>
                  <Button
                    onClick={initializeWallet}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    Retry
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deposit Instructions */}
          <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
            <CardHeader>
              <CardTitle className="flex items-center">
                <ArrowDownRight className="w-5 h-5 mr-2 text-green-600" />
                Deposit Instructions
              </CardTitle>
              <CardDescription>
                Follow these steps to deposit USDT safely
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-green-600 text-xs font-bold">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Copy Your Address</h4>
                    <p className="text-sm text-gray-600">Copy the wallet address above or scan the QR code</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-green-600 text-xs font-bold">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Send USDT (BEP20)</h4>
                    <p className="text-sm text-gray-600">Send from any wallet or exchange using BEP20 network</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-green-600 text-xs font-bold">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Wait for Confirmation</h4>
                    <p className="text-sm text-gray-600">12 confirmations required (~36 seconds)</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-green-600 text-xs font-bold">4</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Automatic Credit</h4>
                    <p className="text-sm text-gray-600">Funds automatically added to your fund wallet</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <h4 className="font-semibold text-sm text-green-800 mb-2">✅ Automatic Features:</h4>
                <ul className="text-xs text-green-700 space-y-1">
                  <li>• Real-time blockchain monitoring</li>
                  <li>• Instant transaction detection</li>
                  <li>• Automatic balance updates</li>
                  <li>• No manual confirmation needed</li>
                  <li>• 24/7 system monitoring</li>
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <h4 className="font-semibold text-sm text-amber-800 mb-2">⚠️ Important Notes:</h4>
                <ul className="text-xs text-amber-700 space-y-1">
                  <li>• Minimum deposit: $1 USDT</li>
                  <li>• Only BEP20 network supported</li>
                  <li>• Other networks will result in loss</li>
                  <li>• Double-check address before sending</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Blockchain Transactions */}
        <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <History className="w-5 h-5 mr-2 text-purple-600" />
                Blockchain Transactions
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => walletInfo && loadBlockchainTransactions(walletInfo.address)}
                  disabled={isLoadingBlockchainTxs}
                  className="border-purple-200 hover:bg-purple-50"
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${isLoadingBlockchainTxs ? 'animate-spin' : ''}`} />
                  Scan
                </Button>
              </div>
            </div>
            <CardDescription>
              Live USDT transactions from BSC Mainnet blockchain
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingBlockchainTxs ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Scanning blockchain for transactions...</p>
              </div>
            ) : blockchainTransactions.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No blockchain transactions found</h3>
                <p className="text-gray-600">No USDT transactions found on the blockchain for this address</p>
                <p className="text-sm text-gray-500 mt-2">Send USDT to your address to see transactions here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {blockchainTransactions.map((tx, index) => (
                  <div key={tx.hash} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(tx.status)}
                        <span className="font-semibold text-gray-900">
                          {parseFloat(tx.amount).toFixed(2)} USDT
                        </span>
                        <Badge className={getStatusColor(tx.status)}>
                          {tx.status}
                        </Badge>
                        {!tx.isProcessed && tx.status === 'confirmed' && parseFloat(tx.amount) >= 1 && (
                          <Badge className="bg-orange-100 text-orange-700">
                            <Plus className="w-3 h-3 mr-1" />
                            Unprocessed
                          </Badge>
                        )}
                        {tx.isProcessed && (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Processed
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        Block #{tx.blockNumber}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                      <span>TX:</span>
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                        {tx.hash.substring(0, 20)}...
                      </code>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="p-1 h-auto"
                        onClick={() => window.open(walletService.getTransactionUrl(tx.hash), '_blank')}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>

                    <div className="text-xs text-gray-500 mb-2">
                      Confirmations: {tx.confirmations}/12 | Network: {tx.network}
                    </div>

                    {!tx.isProcessed && tx.status === 'confirmed' && parseFloat(tx.amount) >= 1 && (
                      <div className="mt-3 flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <div>
                          <p className="text-sm font-medium text-orange-800">
                            🎯 Ready to Process
                          </p>
                          <p className="text-xs text-orange-700">
                            This confirmed transaction can be added to your fund wallet
                          </p>
                        </div>
                        <Button
                          onClick={() => processUnprocessedTransaction(tx)}
                          size="sm"
                          className="bg-gradient-to-r from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700 text-white"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Process Transaction
                        </Button>
                      </div>
                    )}

                    {tx.status === 'pending' && (
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm text-yellow-600">
                          ⏳ Waiting for confirmations ({tx.confirmations}/12)
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => checkTransactionStatus('', tx.hash)}
                          className="text-xs border-yellow-200 hover:bg-yellow-50 text-yellow-700"
                        >
                          Check Status
                        </Button>
                      </div>
                    )}

                    {tx.isProcessed && (
                      <div className="mt-2 text-sm text-green-600">
                        ✅ Already processed and added to fund wallet
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        
        {/* Security Notice */}
        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center text-yellow-900">
              <Shield className="w-5 h-5 mr-2" />
              Security & Network Information
            </CardTitle>
          </CardHeader>
          <CardContent className="text-yellow-800 text-sm space-y-2">
            <p>• <strong>Network:</strong> Binance Smart Chain (BEP20) Mainnet only</p>
            <p>• <strong>Token:</strong> USDT (Tether USD) contract: 0x55d398326f99059fF775485246999027B3197955</p>
            <p>• <strong>Confirmations:</strong> 12 blocks required for confirmation (~36 seconds)</p>
            <p>• <strong>Monitoring:</strong> Real-time blockchain monitoring with BSC API integration</p>
            <p>• <strong>Detection:</strong> Automatic transaction detection and processing</p>
            <p>• <strong>Security:</strong> Your private keys are securely stored and encrypted</p>
            <p>• <strong>Warning:</strong> Only send USDT on BEP20 network - other networks will result in loss</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}