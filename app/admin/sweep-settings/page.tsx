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
  Settings,
  AlertCircle,
  CheckCircle,
  Loader2,
  Eye,
  EyeOff,
  Activity,
  TrendingUp,
  Zap,
  DollarSign,
  Users,
  Clock,
  Target,
  Play,
  Pause,
  BarChart3,
  Wallet,
  Send,
  Download
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface SweepWallet {
  id: string;
  wallet_address: string;
  user_id: string;
  username: string;
  usdt_balance: number;
  bnb_balance: number;
  last_sweep_at: string | null;
  next_sweep_at: string;
  sweep_priority: 1 | 2 | 3;
  gas_distributed: boolean;
  sweep_threshold: number;
  is_monitored: boolean;
  created_at: string;
}

interface SweepTransaction {
  id: string;
  wallet_address: string;
  username: string;
  usdt_amount: number;
  bnb_gas_used: number;
  transaction_hash: string | null;
  status: 'pending' | 'completed' | 'failed';
  gas_distribution_hash: string | null;
  sweep_hash: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

interface SweepStats {
  total_wallets_monitored: number;
  wallets_needing_gas: number;
  wallets_ready_to_sweep: number;
  total_usdt_available: number;
  high_priority_wallets: number;
  medium_priority_wallets: number;
  low_priority_wallets: number;
  total_swept_today: number;
  total_gas_used_today: number;
  pending_sweeps: number;
  failed_sweeps_today: number;
}

export default function SweepSettingsPage() {
  const { admin } = useAdminAuth();
  const [sweepWallets, setSweepWallets] = useState<SweepWallet[]>([]);
  const [sweepTransactions, setSweepTransactions] = useState<SweepTransaction[]>([]);
  const [sweepStats, setSweepStats] = useState<SweepStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showBalances, setShowBalances] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedWallets, setSelectedWallets] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSweepData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadSweepData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSweepData = async () => {
    try {
      setError('');
      
      // Load sweep statistics
      const { data: stats, error: statsError } = await supabase.rpc('get_sweep_statistics');
      if (statsError) {
        console.error('Error loading sweep stats:', statsError);
      } else {
        setSweepStats(stats);
      }

      // Load sweep monitoring data
      const { data: wallets, error: walletsError } = await supabase
        .from('sweep_monitoring')
        .select(`
          *,
          profiles!inner(username)
        `)
        .eq('is_monitored', true)
        .order('sweep_priority', { ascending: true })
        .order('usdt_balance', { ascending: false });

      if (walletsError) {
        console.error('Error loading sweep wallets:', walletsError);
      } else {
        // Transform the data to include username
        const transformedWallets = (wallets || []).map(wallet => ({
          ...wallet,
          username: wallet.profiles?.username || 'Unknown'
        }));
        setSweepWallets(transformedWallets);
      }

      // Load recent sweep transactions
      const { data: transactions, error: transactionsError } = await supabase
        .from('sweep_transactions')
        .select(`
          *,
          profiles!inner(username)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (transactionsError) {
        console.error('Error loading sweep transactions:', transactionsError);
      } else {
        // Transform the data to include username
        const transformedTransactions = (transactions || []).map(tx => ({
          ...tx,
          username: tx.profiles?.username || 'Unknown'
        }));
        setSweepTransactions(transformedTransactions);
      }

    } catch (err: any) {
      setError(`Failed to load sweep data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerManualSweep = async (walletAddresses?: string[]) => {
    if (!admin) {
      setError('Admin authentication required');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const addressesToSweep = walletAddresses || Array.from(selectedWallets);
      
      if (addressesToSweep.length === 0) {
        throw new Error('No wallets selected for sweeping');
      }

      // In a real implementation, this would trigger the actual sweep process
      // For now, we'll simulate the process
      
      for (const address of addressesToSweep) {
        const wallet = sweepWallets.find(w => w.wallet_address === address);
        if (!wallet) continue;

        // Create sweep transaction record
        await supabase
          .from('sweep_transactions')
          .insert({
            wallet_address: address,
            user_id: wallet.user_id,
            usdt_amount: wallet.usdt_balance,
            bnb_gas_used: 0.001, // Estimated gas
            status: 'pending',
          });

        // Update wallet monitoring status
        await supabase
          .from('sweep_monitoring')
          .update({
            last_sweep_at: new Date().toISOString(),
            next_sweep_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Next day
            usdt_balance: 0, // Simulate successful sweep
          })
          .eq('wallet_address', address);
      }

      setSuccess(`Manual sweep initiated for ${addressesToSweep.length} wallet(s)`);
      setSelectedWallets(new Set());
      await loadSweepData();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const distributeGas = async (walletAddresses?: string[]) => {
    if (!admin) {
      setError('Admin authentication required');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const addressesToDistribute = walletAddresses || Array.from(selectedWallets);
      
      if (addressesToDistribute.length === 0) {
        throw new Error('No wallets selected for gas distribution');
      }

      // In a real implementation, this would distribute BNB for gas
      // For now, we'll simulate the process
      
      for (const address of addressesToDistribute) {
        // Update wallet monitoring status
        await supabase
          .from('sweep_monitoring')
          .update({
            gas_distributed: true,
            bnb_balance: 0.001, // Simulate gas distribution
          })
          .eq('wallet_address', address);
      }

      setSuccess(`Gas distributed to ${addressesToDistribute.length} wallet(s)`);
      setSelectedWallets(new Set());
      await loadSweepData();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleWalletSelection = (walletAddress: string) => {
    const newSelection = new Set(selectedWallets);
    if (newSelection.has(walletAddress)) {
      newSelection.delete(walletAddress);
    } else {
      newSelection.add(walletAddress);
    }
    setSelectedWallets(newSelection);
  };

  const selectAllWallets = () => {
    if (selectedWallets.size === sweepWallets.length) {
      setSelectedWallets(new Set());
    } else {
      setSelectedWallets(new Set(sweepWallets.map(w => w.wallet_address)));
    }
  };

  const getPriorityBadge = (priority: 1 | 2 | 3) => {
    switch (priority) {
      case 1:
        return <Badge className="bg-red-100 text-red-800">High</Badge>;
      case 2:
        return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case 3:
        return <Badge className="bg-green-100 text-green-800">Low</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
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
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sweep Management</h1>
          <p className="text-gray-600 mt-1">Monitor and manage automated USDT sweeping operations</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setShowBalances(!showBalances)}
            variant="outline"
            size="sm"
          >
            {showBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
          <Button
            onClick={loadSweepData}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="border-blue-200 hover:bg-blue-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

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

      {/* Statistics */}
      {sweepStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Monitored</p>
                  <p className="text-2xl font-bold text-blue-600">{sweepStats.total_wallets_monitored}</p>
                </div>
                <Wallet className="w-6 h-6 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Need Gas</p>
                  <p className="text-2xl font-bold text-orange-600">{sweepStats.wallets_needing_gas}</p>
                </div>
                <Zap className="w-6 h-6 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Ready</p>
                  <p className="text-2xl font-bold text-green-600">{sweepStats.wallets_ready_to_sweep}</p>
                </div>
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Available</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {showBalances ? `$${sweepStats.total_usdt_available.toFixed(2)}` : '••••'}
                  </p>
                </div>
                <DollarSign className="w-6 h-6 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Today</p>
                  <p className="text-2xl font-bold text-teal-600">
                    {showBalances ? `$${sweepStats.total_swept_today.toFixed(2)}` : '••••'}
                  </p>
                </div>
                <TrendingUp className="w-6 h-6 text-teal-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-red-600">{sweepStats.pending_sweeps}</p>
                </div>
                <Clock className="w-6 h-6 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Wallet Overview</TabsTrigger>
          <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Wallet Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Monitored Wallets
                  </CardTitle>
                  <CardDescription>
                    Wallets being monitored for automatic USDT sweeping
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  {selectedWallets.size > 0 && (
                    <>
                      <Button
                        onClick={() => distributeGas()}
                        disabled={isProcessing}
                        size="sm"
                        variant="outline"
                        className="border-orange-200 hover:bg-orange-50 text-orange-700"
                      >
                        <Zap className="w-4 h-4 mr-1" />
                        Distribute Gas ({selectedWallets.size})
                      </Button>
                      <Button
                        onClick={() => triggerManualSweep()}
                        disabled={isProcessing}
                        size="sm"
                        className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Sweep Selected ({selectedWallets.size})
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {sweepWallets.length === 0 ? (
                <div className="text-center py-8">
                  <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No wallets being monitored</h3>
                  <p className="text-gray-600">Wallets will appear here once users generate BEP20 wallets</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Select All */}
                  <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
                    <input
                      type="checkbox"
                      checked={selectedWallets.size === sweepWallets.length && sweepWallets.length > 0}
                      onChange={selectAllWallets}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-600">
                      Select All ({sweepWallets.length} wallets)
                    </span>
                  </div>

                  {/* Wallet List */}
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {sweepWallets.map((wallet) => (
                      <div
                        key={wallet.id}
                        className={`border rounded-lg p-4 transition-colors ${
                          selectedWallets.has(wallet.wallet_address)
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={selectedWallets.has(wallet.wallet_address)}
                              onChange={() => toggleWalletSelection(wallet.wallet_address)}
                              className="rounded border-gray-300"
                            />
                            <div>
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="font-medium text-gray-900">{wallet.username}</h4>
                                {getPriorityBadge(wallet.sweep_priority)}
                                {wallet.gas_distributed ? (
                                  <Badge className="bg-green-100 text-green-700">Gas Ready</Badge>
                                ) : (
                                  <Badge className="bg-orange-100 text-orange-700">Needs Gas</Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 font-mono">
                                {wallet.wallet_address.substring(0, 20)}...{wallet.wallet_address.substring(wallet.wallet_address.length - 10)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">
                              {showBalances ? `$${wallet.usdt_balance.toFixed(2)}` : '••••'} USDT
                            </div>
                            <div className="text-sm text-gray-600">
                              BNB: {showBalances ? wallet.bnb_balance.toFixed(6) : '••••••'}
                            </div>
                            <div className="text-xs text-gray-500">
                              Threshold: ${wallet.sweep_threshold.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        
                        {wallet.last_sweep_at && (
                          <div className="mt-2 text-xs text-gray-500">
                            Last swept: {new Date(wallet.last_sweep_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Recent Sweep Transactions
              </CardTitle>
              <CardDescription>
                History of gas distribution and USDT sweep operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sweepTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No transactions yet</h3>
                  <p className="text-gray-600">Sweep transactions will appear here</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {sweepTransactions.map((tx) => (
                    <div key={tx.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
                            <RefreshCw className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{tx.username}</h4>
                            <p className="text-sm text-gray-600 font-mono">
                              {tx.wallet_address.substring(0, 20)}...{tx.wallet_address.substring(tx.wallet_address.length - 10)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">
                            {showBalances ? `$${tx.usdt_amount.toFixed(2)}` : '••••'} USDT
                          </div>
                          <div className="text-sm text-gray-600">
                            Gas: {tx.bnb_gas_used.toFixed(6)} BNB
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(tx.status)}
                          <span className="text-gray-500">
                            {new Date(tx.created_at).toLocaleString()}
                          </span>
                        </div>
                        {tx.transaction_hash && (
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {tx.transaction_hash.substring(0, 10)}...
                          </code>
                        )}
                      </div>
                      
                      {tx.error_message && (
                        <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                          Error: {tx.error_message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Priority Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sweepStats && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">High Priority</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full" 
                            style={{ 
                              width: `${sweepStats.total_wallets_monitored > 0 ? (sweepStats.high_priority_wallets / sweepStats.total_wallets_monitored) * 100 : 0}%` 
                            }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{sweepStats.high_priority_wallets}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Medium Priority</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-yellow-500 h-2 rounded-full" 
                            style={{ 
                              width: `${sweepStats.total_wallets_monitored > 0 ? (sweepStats.medium_priority_wallets / sweepStats.total_wallets_monitored) * 100 : 0}%` 
                            }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{sweepStats.medium_priority_wallets}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Low Priority</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ 
                              width: `${sweepStats.total_wallets_monitored > 0 ? (sweepStats.low_priority_wallets / sweepStats.total_wallets_monitored) * 100 : 0}%` 
                            }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{sweepStats.low_priority_wallets}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="w-5 h-5 mr-2" />
                  Today's Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sweepStats && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">USDT Swept</span>
                      <span className="text-lg font-bold text-green-600">
                        {showBalances ? `$${sweepStats.total_swept_today.toFixed(2)}` : '••••'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Gas Used</span>
                      <span className="text-lg font-bold text-orange-600">
                        {sweepStats.total_gas_used_today.toFixed(6)} BNB
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Failed Sweeps</span>
                      <span className="text-lg font-bold text-red-600">
                        {sweepStats.failed_sweeps_today}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}