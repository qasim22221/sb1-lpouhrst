"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw,
  Wallet,
  DollarSign,
  Activity,
  AlertCircle,
  CheckCircle,
  Loader2,
  Send,
  Eye,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  Settings,
  Database,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  Copy,
  Check,
  ExternalLink,
  Search,
  Filter,
  Download
} from 'lucide-react';

interface HotWalletStatus {
  address: string;
  bnbBalance: string;
  usdtBalance: string;
  isConnected: boolean;
  lastUpdate: string;
}

interface DepositScanResult {
  newDeposits: number;
  totalScanned: number;
  errors: string[];
}

interface WithdrawalRequest {
  id: string;
  userId: string;
  toAddress: string;
  amount: number;
  status: string;
  txHash?: string;
  createdAt: string;
}

export default function SweepManagementPage() {
  const [hotWalletStatus, setHotWalletStatus] = useState<HotWalletStatus | null>(null);
  const [depositScanResult, setDepositScanResult] = useState<DepositScanResult | null>(null);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessingWithdrawal, setIsProcessingWithdrawal] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [specificWallet, setSpecificWallet] = useState('');
  const [copiedAddress, setCopiedAddress] = useState(false);

  useEffect(() => {
    loadInitialData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadHotWalletStatus();
      loadPendingWithdrawals();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadHotWalletStatus(),
        loadPendingWithdrawals()
      ]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadHotWalletStatus = async () => {
    try {
      const response = await fetch('/api/admin/sweep/hot-wallet-status');
      const result = await response.json();
      
      if (result.success) {
        setHotWalletStatus(result.data);
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      console.error('Failed to load hot wallet status:', err);
      setError('Failed to load hot wallet status');
    }
  };

  const loadPendingWithdrawals = async () => {
    try {
      const response = await fetch('/api/admin/sweep/process-withdrawal');
      const result = await response.json();
      
      if (result.success) {
        setPendingWithdrawals(result.data);
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      console.error('Failed to load pending withdrawals:', err);
    }
  };

  const runDepositScan = async () => {
    setIsScanning(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch('/api/admin/sweep/check-deposits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: specificWallet || undefined
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setDepositScanResult(result.data);
        setSuccess(result.message);
        
        // Refresh hot wallet status after scan
        await loadHotWalletStatus();
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const processWithdrawal = async (withdrawal: WithdrawalRequest) => {
    setIsProcessingWithdrawal(withdrawal.id);
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch('/api/admin/sweep/process-withdrawal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          withdrawalId: withdrawal.id,
          toAddress: withdrawal.toAddress,
          amount: withdrawal.amount,
          userId: withdrawal.userId
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setSuccess(`Withdrawal processed successfully! TX: ${result.data.txHash}`);
        
        // Refresh data
        await Promise.all([
          loadHotWalletStatus(),
          loadPendingWithdrawals()
        ]);
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessingWithdrawal(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    return num.toFixed(6);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading sweep management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sweep Management</h1>
              <p className="text-sm text-gray-600">Monitor deposits, manage withdrawals, and control hot wallet</p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={loadInitialData}
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
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
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

        {/* Hot Wallet Status */}
        <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wallet className="w-5 h-5 mr-2 text-blue-600" />
              Hot Wallet Status
            </CardTitle>
            <CardDescription>
              Monitor the main hot wallet used for sweeping and withdrawals
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hotWalletStatus ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Wallet Address</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                        {hotWalletStatus.address.substring(0, 20)}...
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(hotWalletStatus.address)}
                        className="p-1 h-auto"
                      >
                        {copiedAddress ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`https://bscscan.com/address/${hotWalletStatus.address}`, '_blank')}
                        className="p-1 h-auto"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${hotWalletStatus.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-sm text-gray-600">
                      {hotWalletStatus.isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-yellow-900">BNB Balance</h3>
                      <p className="text-yellow-700 text-sm">For gas fees</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-yellow-900">
                        {formatBalance(hotWalletStatus.bnbBalance)} BNB
                      </div>
                      <div className="text-yellow-700 text-sm">
                        ≈ ${(parseFloat(hotWalletStatus.bnbBalance) * 300).toFixed(2)} USD
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-green-900">USDT Balance</h3>
                      <p className="text-green-700 text-sm">Available for withdrawals</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-900">
                        {formatBalance(hotWalletStatus.usdtBalance)} USDT
                      </div>
                      <div className="text-green-700 text-sm">
                        ≈ ${hotWalletStatus.usdtBalance} USD
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading hot wallet status...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs for different operations */}
        <Tabs defaultValue="deposits" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="deposits">Deposit Scanning</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawal Processing</TabsTrigger>
          </TabsList>

          {/* Deposit Scanning Tab */}
          <TabsContent value="deposits" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Search className="w-5 h-5 mr-2 text-green-600" />
                  Deposit Scanner
                </CardTitle>
                <CardDescription>
                  Scan for new deposits and automatically sweep them to the hot wallet
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Label htmlFor="specific-wallet">Specific Wallet (Optional)</Label>
                    <Input
                      id="specific-wallet"
                      placeholder="0x... (leave empty to scan all wallets)"
                      value={specificWallet}
                      onChange={(e) => setSpecificWallet(e.target.value)}
                      className="bg-white border-gray-200"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={runDepositScan}
                      disabled={isScanning}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                    >
                      {isScanning ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Scanning...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Search className="w-4 h-4" />
                          <span>Scan Deposits</span>
                        </div>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Scan Results */}
                {depositScanResult && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-3">Scan Results</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-900">{depositScanResult.newDeposits}</div>
                        <div className="text-blue-700">New Deposits</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-900">{depositScanResult.totalScanned}</div>
                        <div className="text-blue-700">Wallets Scanned</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-900">{depositScanResult.errors.length}</div>
                        <div className="text-blue-700">Errors</div>
                      </div>
                    </div>
                    
                    {depositScanResult.errors.length > 0 && (
                      <div className="mt-4">
                        <h5 className="font-medium text-red-900 mb-2">Errors:</h5>
                        <ul className="text-sm text-red-700 space-y-1">
                          {depositScanResult.errors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Withdrawal Processing Tab */}
          <TabsContent value="withdrawals" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ArrowUpRight className="w-5 h-5 mr-2 text-red-600" />
                  Pending Withdrawals
                </CardTitle>
                <CardDescription>
                  Process pending withdrawal requests from users
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingWithdrawals.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Withdrawals</h3>
                    <p className="text-gray-600">All withdrawal requests have been processed</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingWithdrawals.map((withdrawal) => (
                      <div key={withdrawal.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-red-400 to-red-600 rounded-lg flex items-center justify-center">
                              <ArrowUpRight className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">${withdrawal.amount.toFixed(2)} USDT</h3>
                              <p className="text-sm text-gray-600">User ID: {withdrawal.userId}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(withdrawal.status)}
                            <Button
                              onClick={() => processWithdrawal(withdrawal)}
                              disabled={isProcessingWithdrawal === withdrawal.id}
                              size="sm"
                              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                            >
                              {isProcessingWithdrawal === withdrawal.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><strong>To Address:</strong> {withdrawal.toAddress}</p>
                          <p><strong>Created:</strong> {new Date(withdrawal.createdAt).toLocaleString()}</p>
                          {withdrawal.txHash && (
                            <p>
                              <strong>TX Hash:</strong> 
                              <a 
                                href={`https://bscscan.com/tx/${withdrawal.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 ml-1"
                              >
                                {withdrawal.txHash.substring(0, 20)}...
                              </a>
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Information Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-900">
              <Shield className="w-5 h-5 mr-2" />
              Sweep System Information
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 text-sm space-y-2">
            <p>• <strong>Deposit Scanning:</strong> Monitors user wallets for incoming USDT deposits via BSCScan API</p>
            <p>• <strong>Auto Sweeping:</strong> Automatically airdrops BNB for gas and transfers USDT to hot wallet</p>
            <p>• <strong>Withdrawal Processing:</strong> Processes user withdrawal requests from the hot wallet</p>
            <p>• <strong>Security:</strong> Private keys are encrypted and stored securely in the database</p>
            <p>• <strong>Network:</strong> All operations are performed on Binance Smart Chain (BEP20)</p>
            <p>• <strong>Monitoring:</strong> Real-time balance monitoring and transaction tracking</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}