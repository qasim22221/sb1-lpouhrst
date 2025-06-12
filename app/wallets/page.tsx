"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  Wallet, 
  Copy, 
  Check, 
  Eye, 
  EyeOff,
  RefreshCw,
  ExternalLink,
  QrCode,
  Shield,
  AlertCircle,
  CheckCircle,
  Loader2,
  CreditCard,
  DollarSign,
  Activity,
  TrendingUp,
  Send,
  Download,
  Plus,
  Settings,
  Key,
  Lock,
  Smartphone,
  Globe,
  Zap,
  Timer,
  History
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface UserWallet {
  id: string;
  wallet_address: string;
  network: string;
  created_at: string;
  is_monitored: boolean;
  private_key?: string;
  mnemonic?: string;
}

interface WalletBalance {
  bnbBalance: string;
  usdtBalance: string;
}

interface RecentTransaction {
  hash: string;
  amount: string;
  blockNumber: number;
  timestamp: string;
  network: string;
}

export default function WalletsPage() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userWallet, setUserWallet] = useState<UserWallet | null>(null);
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedPrivateKey, setCopiedPrivateKey] = useState(false);
  const [copiedMnemonic, setCopiedMnemonic] = useState(false);
  const [isGeneratingWallet, setIsGeneratingWallet] = useState(false);
  const [lastBalanceUpdate, setLastBalanceUpdate] = useState<Date>(new Date());
  
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && !user) {
      router.push('/login');
    } else if (mounted && !authLoading && user && profile) {
      loadWalletData();
    }
  }, [user, profile, authLoading, mounted, router]);

  // Auto-refresh balances every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (userWallet) {
        loadWalletBalance();
        loadRecentTransactions();
        setLastBalanceUpdate(new Date());
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [userWallet]);

  const loadWalletData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      await loadUserWallet();
    } catch (err: any) {
      setError(`Failed to load wallet data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserWallet = async () => {
    if (!user) return;

    try {
      // First check if user has existing wallet
      const { data: existingWallet, error: walletError } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (walletError && !walletError.message.includes('No rows')) {
        throw new Error(`Failed to load wallet: ${walletError.message}`);
      }

      if (existingWallet) {
        setUserWallet(existingWallet);
        await loadWalletBalance();
        await loadRecentTransactions();
      } else {
        // No wallet exists, user needs to generate one
        setUserWallet(null);
      }
    } catch (err: any) {
      console.error('Error loading user wallet:', err);
      throw err;
    }
  };

  const generateNewWallet = async () => {
    if (!user) return;

    setIsGeneratingWallet(true);
    setError('');

    try {
      // Call the database function to get or create wallet
      const { data, error } = await supabase.rpc('get_or_create_user_wallet', {
        user_id_param: user.id
      });

      if (error) {
        throw new Error(`Failed to generate wallet: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate wallet');
      }

      // Reload wallet data
      await loadUserWallet();
      
      setSuccess('New BEP20 wallet generated successfully!');
      setTimeout(() => setSuccess(''), 5000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGeneratingWallet(false);
    }
  };

  const loadWalletBalance = async () => {
    if (!userWallet) return;

    try {
      // In a real implementation, you would call your blockchain service
      // For demo purposes, we'll simulate balance loading
      const mockBalance: WalletBalance = {
        bnbBalance: (Math.random() * 0.1).toFixed(6),
        usdtBalance: (Math.random() * 100).toFixed(2),
      };

      setWalletBalance(mockBalance);
    } catch (err: any) {
      console.error('Error loading wallet balance:', err);
    }
  };

  const loadRecentTransactions = async () => {
    if (!userWallet) return;

    try {
      // In a real implementation, you would call your blockchain service
      // For demo purposes, we'll simulate recent transactions
      const mockTransactions: RecentTransaction[] = [
        {
          hash: '0x1234567890abcdef1234567890abcdef12345678',
          amount: '25.50',
          blockNumber: 12345678,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          network: 'BSC Mainnet',
        },
        {
          hash: '0xabcdef1234567890abcdef1234567890abcdef12',
          amount: '10.00',
          blockNumber: 12345677,
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          network: 'BSC Mainnet',
        },
      ];

      setRecentTransactions(mockTransactions);
    } catch (err: any) {
      console.error('Error loading recent transactions:', err);
    }
  };

  const copyToClipboard = async (text: string, type: 'address' | 'privateKey' | 'mnemonic') => {
    try {
      await navigator.clipboard.writeText(text);
      
      switch (type) {
        case 'address':
          setCopiedAddress(true);
          setTimeout(() => setCopiedAddress(false), 2000);
          break;
        case 'privateKey':
          setCopiedPrivateKey(true);
          setTimeout(() => setCopiedPrivateKey(false), 2000);
          break;
        case 'mnemonic':
          setCopiedMnemonic(true);
          setTimeout(() => setCopiedMnemonic(false), 2000);
          break;
      }
      
      setSuccess(`${type === 'address' ? 'Address' : type === 'privateKey' ? 'Private key' : 'Mnemonic'} copied to clipboard!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const refreshData = async () => {
    await loadWalletData();
    setLastBalanceUpdate(new Date());
    setSuccess('Wallet data refreshed successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const openInExplorer = (address: string) => {
    window.open(`https://bscscan.com/address/${address}`, '_blank');
  };

  const openTransactionInExplorer = (hash: string) => {
    window.open(`https://bscscan.com/tx/${hash}`, '_blank');
  };

  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-teal-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">Please log in to access wallet management</p>
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
                <h1 className="text-xl font-bold text-gray-900">Wallet Management</h1>
                <p className="text-sm text-gray-600">Manage your BEP20 wallet and view balances</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-sm text-gray-600">
                Last updated: {lastBalanceUpdate.toLocaleTimeString()}
              </div>
              <Button
                onClick={refreshData}
                variant="outline"
                size="sm"
                disabled={isLoading}
                className="border-blue-200 hover:bg-blue-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
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

        {/* Wallet Status */}
        {!userWallet ? (
          <Card className="bg-gradient-to-r from-orange-400 to-teal-500 text-white border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Wallet className="w-6 h-6 mr-2" />
                No Wallet Found
              </CardTitle>
              <CardDescription className="text-white/90">
                You need to generate a BEP20 wallet to receive deposits and manage your funds
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-white/10 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-2">What you'll get:</h4>
                  <ul className="text-white/90 text-sm space-y-1">
                    <li>• Secure BEP20 wallet address for USDT deposits</li>
                    <li>• Private key and mnemonic phrase for wallet recovery</li>
                    <li>• Real-time balance monitoring</li>
                    <li>• Transaction history tracking</li>
                  </ul>
                </div>
                
                <Button
                  onClick={generateNewWallet}
                  disabled={isGeneratingWallet}
                  className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  {isGeneratingWallet ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating Wallet...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Plus className="w-4 h-4" />
                      <span>Generate BEP20 Wallet</span>
                    </div>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Wallet Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Wallet Info */}
              <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Wallet className="w-5 h-5 mr-2 text-blue-600" />
                    BEP20 Wallet
                  </CardTitle>
                  <CardDescription>
                    Your secure wallet on Binance Smart Chain
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Wallet Address</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Input
                        value={userWallet.wallet_address}
                        readOnly
                        className="font-mono text-sm bg-gray-50"
                      />
                      <Button
                        onClick={() => copyToClipboard(userWallet.wallet_address, 'address')}
                        size="sm"
                        variant="outline"
                        className="flex-shrink-0"
                      >
                        {copiedAddress ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                      <Button
                        onClick={() => openInExplorer(userWallet.wallet_address)}
                        size="sm"
                        variant="outline"
                        className="flex-shrink-0"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">Network</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge className="bg-yellow-100 text-yellow-800">
                        <Globe className="w-3 h-3 mr-1" />
                        {userWallet.network} (BSC Mainnet)
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">Created</Label>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(userWallet.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">Monitoring Status</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge className={userWallet.is_monitored ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                        {userWallet.is_monitored ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <Timer className="w-3 h-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Wallet Balances */}
              <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                    Wallet Balances
                  </CardTitle>
                  <CardDescription>
                    Current balances on Binance Smart Chain
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {walletBalance ? (
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-yellow-900">BNB Balance</h3>
                            <p className="text-yellow-700 text-sm">Gas fees and transactions</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-yellow-900">
                              {walletBalance.bnbBalance} BNB
                            </div>
                            <div className="text-yellow-700 text-sm">
                              ≈ ${(parseFloat(walletBalance.bnbBalance) * 300).toFixed(2)} USD
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-green-900">USDT Balance</h3>
                            <p className="text-green-700 text-sm">Available for deposits</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-900">
                              {walletBalance.usdtBalance} USDT
                            </div>
                            <div className="text-green-700 text-sm">
                              ≈ ${walletBalance.usdtBalance} USD
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          onClick={() => router.push('/deposit')}
                          className="flex-1 bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Deposit
                        </Button>
                        <Button
                          onClick={() => router.push('/transactions')}
                          variant="outline"
                          className="flex-1 border-purple-200 hover:bg-purple-50 text-purple-700"
                        >
                          <History className="w-4 h-4 mr-2" />
                          History
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-4" />
                      <p className="text-gray-600">Loading balances...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Security Information */}
            <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-red-600" />
                  Security Information
                </CardTitle>
                <CardDescription>
                  Keep your private key and mnemonic phrase secure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-red-900">Important Security Notice</h4>
                      <p className="text-red-700 text-sm mt-1">
                        Never share your private key or mnemonic phrase with anyone. These give complete access to your wallet and funds.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Private Key */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium text-gray-700">Private Key</Label>
                    <Button
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                      size="sm"
                      variant="ghost"
                      className="text-gray-600 hover:text-gray-800"
                    >
                      {showPrivateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={showPrivateKey ? (userWallet.private_key || 'Not available') : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                      readOnly
                      className="font-mono text-sm bg-gray-50"
                      type={showPrivateKey ? "text" : "password"}
                    />
                    <Button
                      onClick={() => copyToClipboard(userWallet.private_key || '', 'privateKey')}
                      size="sm"
                      variant="outline"
                      disabled={!userWallet.private_key}
                      className="flex-shrink-0"
                    >
                      {copiedPrivateKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* Mnemonic Phrase */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium text-gray-700">Mnemonic Phrase</Label>
                    <Button
                      onClick={() => setShowMnemonic(!showMnemonic)}
                      size="sm"
                      variant="ghost"
                      className="text-gray-600 hover:text-gray-800"
                    >
                      {showMnemonic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={showMnemonic ? (userWallet.mnemonic || 'Not available') : '•••• •••• •••• •••• •••• •••• •••• •••• •••• •••• •••• ••••'}
                      readOnly
                      className="font-mono text-sm bg-gray-50"
                      type={showMnemonic ? "text" : "password"}
                    />
                    <Button
                      onClick={() => copyToClipboard(userWallet.mnemonic || '', 'mnemonic')}
                      size="sm"
                      variant="outline"
                      disabled={!userWallet.mnemonic}
                      className="flex-shrink-0"
                    >
                      {copiedMnemonic ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-purple-600" />
                  Recent Transactions
                </CardTitle>
                <CardDescription>
                  Latest transactions on this wallet
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentTransactions.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No transactions yet</h3>
                    <p className="text-gray-600">Transactions will appear here once you start using your wallet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentTransactions.map((tx, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-green-600 rounded-lg flex items-center justify-center">
                              <Send className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">USDT Received</h3>
                              <p className="text-sm text-gray-600">Block #{tx.blockNumber}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-600">+{tx.amount} USDT</div>
                            <div className="text-xs text-gray-500">
                              {new Date(tx.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-gray-600 pt-2 border-t border-gray-100">
                          <span className="font-mono text-xs">
                            {tx.hash.substring(0, 20)}...{tx.hash.substring(tx.hash.length - 10)}
                          </span>
                          <Button
                            onClick={() => openTransactionInExplorer(tx.hash)}
                            size="sm"
                            variant="ghost"
                            className="p-1 h-auto"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Information Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-900">
              <Wallet className="w-5 h-5 mr-2" />
              Wallet Information
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 text-sm space-y-2">
            <p>• <strong>Network:</strong> Binance Smart Chain (BEP20) - Low fees and fast transactions</p>
            <p>• <strong>USDT Contract:</strong> 0x55d398326f99059fF775485246999027B3197955</p>
            <p>• <strong>Security:</strong> Your private key and mnemonic are encrypted and stored securely</p>
            <p>• <strong>Monitoring:</strong> Automatic detection of incoming USDT deposits</p>
            <p>• <strong>Gas Fees:</strong> Small amount of BNB required for transactions</p>
            <p>• <strong>Explorer:</strong> View all transactions on BSCScan.com</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}