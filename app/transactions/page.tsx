"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  Calendar,
  DollarSign,
  Activity,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Crown,
  Globe,
  Gift,
  Zap,
  Send,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Loader2,
  AlertCircle,
  CheckCircle,
  Copy,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  History
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  date: string;
  status: string;
  category: 'income' | 'expense' | 'transfer';
  source?: string;
}

interface TransactionStats {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  transactionCount: number;
  thisMonthIncome: number;
  thisMonthExpense: number;
  largestIncome: number;
  largestExpense: number;
}

export default function TransactionsPage() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [transactionStats, setTransactionStats] = useState<TransactionStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [showAmounts, setShowAmounts] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    setMounted(true);
    
    // Check for wallet filter in URL
    const walletParam = searchParams.get('wallet');
    if (walletParam === 'main' || walletParam === 'fund') {
      setActiveTab(walletParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (mounted && !authLoading && !user) {
      router.push('/login');
    } else if (mounted && !authLoading && user && profile) {
      loadTransactions();
    }
  }, [user, profile, authLoading, mounted, router]);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchTerm, filterType, filterCategory, dateRange, activeTab]);

  const loadTransactions = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const allTransactions: Transaction[] = [];

      // Get referral bonuses (income)
      const { data: bonuses } = await supabase
        .from('referral_bonuses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      (bonuses || []).forEach(bonus => {
        allTransactions.push({
          id: bonus.id,
          type: bonus.bonus_type,
          amount: bonus.amount,
          description: bonus.description,
          date: bonus.created_at,
          status: bonus.status || 'completed',
          category: 'income',
          source: 'main_wallet'
        });
      });

      // Get pool rewards (income)
      const { data: poolRewards } = await supabase
        .from('pool_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      (poolRewards || []).forEach(pool => {
        allTransactions.push({
          id: pool.id,
          type: 'pool_reward',
          amount: pool.reward_paid,
          description: `Pool ${pool.pool_number} completion reward`,
          date: pool.completed_at,
          status: 'completed',
          category: 'income',
          source: 'main_wallet'
        });
      });

      // Get fund wallet transactions (deposits, activations, etc.)
      const { data: fundTransactions } = await supabase
        .from('fund_wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      (fundTransactions || []).forEach(transaction => {
        allTransactions.push({
          id: transaction.id,
          type: transaction.transaction_type,
          amount: transaction.amount,
          description: transaction.description,
          date: transaction.created_at,
          status: 'completed',
          category: transaction.amount > 0 ? 'income' : 'expense',
          source: 'fund_wallet'
        });
      });

      // Get withdrawals (expense)
      const { data: withdrawals } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      (withdrawals || []).forEach(withdrawal => {
        allTransactions.push({
          id: withdrawal.id,
          type: 'withdrawal',
          amount: -withdrawal.amount,
          description: `Withdrawal to ${withdrawal.address_label}`,
          date: withdrawal.created_at,
          status: withdrawal.status,
          category: 'expense',
          source: 'main_wallet'
        });
      });

      // Get P2P transfers
      const { data: p2pTransfers } = await supabase.rpc('get_user_transfer_history', {
        user_id_param: user.id,
        limit_param: 1000
      });

      (p2pTransfers || []).forEach(transfer => {
        allTransactions.push({
          id: transfer.id,
          type: transfer.is_sender ? 'p2p_send' : 'p2p_receive',
          amount: transfer.is_sender ? -transfer.amount : transfer.net_amount,
          description: transfer.description || (transfer.is_sender 
            ? `P2P transfer to ${transfer.receiver_username}` 
            : `P2P transfer from ${transfer.sender_username}`),
          date: transfer.created_at,
          status: transfer.status,
          category: 'transfer',
          source: 'fund_wallet'
        });
      });

      // Sort by date (newest first)
      allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setTransactions(allTransactions);
      calculateStats(allTransactions);

    } catch (err: any) {
      setError(`Failed to load transactions: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (transactions: Transaction[]) => {
    const totalIncome = transactions
      .filter(t => t.category === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = Math.abs(transactions
      .filter(t => t.category === 'expense')
      .reduce((sum, t) => sum + t.amount, 0));

    const netBalance = totalIncome - totalExpense;

    // This month calculations
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthTransactions = transactions.filter(t => 
      new Date(t.date) >= thisMonthStart
    );

    const thisMonthIncome = thisMonthTransactions
      .filter(t => t.category === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const thisMonthExpense = Math.abs(thisMonthTransactions
      .filter(t => t.category === 'expense')
      .reduce((sum, t) => sum + t.amount, 0));

    const largestIncome = Math.max(...transactions
      .filter(t => t.category === 'income')
      .map(t => t.amount), 0);

    const largestExpense = Math.max(...transactions
      .filter(t => t.category === 'expense')
      .map(t => Math.abs(t.amount)), 0);

    setTransactionStats({
      totalIncome,
      totalExpense,
      netBalance,
      transactionCount: transactions.length,
      thisMonthIncome,
      thisMonthExpense,
      largestIncome,
      largestExpense
    });
  };

  const filterTransactions = () => {
    let filtered = [...transactions];

    // Filter by wallet (tab)
    if (activeTab === 'main') {
      filtered = filtered.filter(t => t.source === 'main_wallet');
    } else if (activeTab === 'fund') {
      filtered = filtered.filter(t => t.source === 'fund_wallet');
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }

    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(t => t.category === filterCategory);
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(0);
      }
      
      filtered = filtered.filter(t => new Date(t.date) >= startDate);
    }

    setFilteredTransactions(filtered);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'direct_referral':
      case 'activation_bonus':
      case 'reactivation_bonus':
      case 'activation_reward':
      case 'reactivation_reward':
        return Users;
      case 'level_income':
        return BarChart3;
      case 'pool_reward':
      case 'pool_income':
        return Target;
      case 'rank_sponsor_income':
        return Crown;
      case 'global_turnover_income':
        return Globe;
      case 'team_rewards':
        return Gift;
      case 'recycle_income':
        return RefreshCw;
      case 'deposit':
        return ArrowDownRight;
      case 'withdrawal':
        return ArrowUpRight;
      case 'p2p_send':
        return Send;
      case 'p2p_receive':
        return ArrowDownRight;
      case 'activation':
        return Zap;
      default:
        return DollarSign;
    }
  };

  const getTransactionColor = (category: string, amount: number) => {
    switch (category) {
      case 'income':
        return 'text-green-600';
      case 'expense':
        return 'text-red-600';
      case 'transfer':
        return amount > 0 ? 'text-blue-600' : 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'income':
        return 'bg-green-100 text-green-800';
      case 'expense':
        return 'bg-red-100 text-red-800';
      case 'transfer':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  const exportTransactions = () => {
    const csvContent = [
      ['Date', 'Type', 'Description', 'Amount', 'Category', 'Status', 'Source'].join(','),
      ...filteredTransactions.map(t => [
        new Date(t.date).toLocaleDateString(),
        t.type,
        `"${t.description}"`,
        t.amount.toFixed(2),
        t.category,
        t.status,
        t.source
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">Please log in to access transaction history</p>
          <Button onClick={() => router.push('/login')}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/dashboard')}
                className="text-gray-600 hover:text-blue-600 hover:bg-blue-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Transaction History</h1>
                <p className="text-sm text-gray-600">Complete record of all your transactions</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAmounts(!showAmounts)}
                className="border-gray-200 hover:bg-gray-50"
              >
                {showAmounts ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button
                onClick={loadTransactions}
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

        {/* Transaction Statistics */}
        {transactionStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Total Income</p>
                    <p className="text-lg font-bold text-green-600">
                      {showAmounts ? `$${transactionStats.totalIncome.toFixed(2)}` : '••••'}
                    </p>
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Total Expense</p>
                    <p className="text-lg font-bold text-red-600">
                      {showAmounts ? `$${transactionStats.totalExpense.toFixed(2)}` : '••••'}
                    </p>
                  </div>
                  <TrendingDown className="w-5 h-5 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Net Balance</p>
                    <p className={`text-lg font-bold ${transactionStats.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {showAmounts ? `$${transactionStats.netBalance.toFixed(2)}` : '••••'}
                    </p>
                  </div>
                  <Activity className="w-5 h-5 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Total Transactions</p>
                    <p className="text-lg font-bold text-blue-600">
                      {transactionStats.transactionCount}
                    </p>
                  </div>
                  <History className="w-5 h-5 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">This Month Income</p>
                    <p className="text-lg font-bold text-green-600">
                      {showAmounts ? `$${transactionStats.thisMonthIncome.toFixed(2)}` : '••••'}
                    </p>
                  </div>
                  <Calendar className="w-5 h-5 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">This Month Expense</p>
                    <p className="text-lg font-bold text-red-600">
                      {showAmounts ? `$${transactionStats.thisMonthExpense.toFixed(2)}` : '••••'}
                    </p>
                  </div>
                  <Calendar className="w-5 h-5 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Largest Income</p>
                    <p className="text-lg font-bold text-green-600">
                      {showAmounts ? `$${transactionStats.largestIncome.toFixed(2)}` : '••••'}
                    </p>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Largest Expense</p>
                    <p className="text-lg font-bold text-red-600">
                      {showAmounts ? `$${transactionStats.largestExpense.toFixed(2)}` : '••••'}
                    </p>
                  </div>
                  <ArrowDownRight className="w-5 h-5 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and Search */}
        <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <CardTitle className="flex items-center">
                <Filter className="w-5 h-5 mr-2 text-blue-600" />
                Filter Transactions
              </CardTitle>
              <Button
                onClick={exportTransactions}
                variant="outline"
                size="sm"
                className="border-green-200 hover:bg-green-50 text-green-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All Transactions</TabsTrigger>
                <TabsTrigger value="main">Main Wallet</TabsTrigger>
                <TabsTrigger value="fund">Fund Wallet</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white border-blue-200 focus:border-blue-400"
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-blue-200 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="all">All Types</option>
                <option value="direct_referral">Direct Referral</option>
                <option value="level_income">Level Income</option>
                <option value="pool_reward">Pool Reward</option>
                <option value="rank_sponsor_income">Rank Sponsor</option>
                <option value="global_turnover_income">Global Turnover</option>
                <option value="team_rewards">Team Rewards</option>
                <option value="recycle_income">Recycle Income</option>
                <option value="deposit">Deposit</option>
                <option value="withdrawal">Withdrawal</option>
                <option value="p2p_send">P2P Send</option>
                <option value="p2p_receive">P2P Receive</option>
                <option value="activation">Activation</option>
              </select>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border border-blue-200 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="all">All Categories</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="transfer">Transfer</option>
              </select>

              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border border-blue-200 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>

              <div className="text-sm text-gray-600 flex items-center">
                Showing {filteredTransactions.length} of {transactions.length} transactions
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction List */}
        <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
          <CardHeader>
            <CardTitle className="flex items-center">
              <History className="w-5 h-5 mr-2 text-blue-600" />
              Transaction History
            </CardTitle>
            <CardDescription>
              Complete record of all your financial activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading transactions...</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No transactions found</h3>
                <p className="text-gray-600">
                  {searchTerm || filterType !== 'all' || filterCategory !== 'all' || dateRange !== 'all' || activeTab !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Your transaction history will appear here'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredTransactions.map((transaction) => {
                  const TransactionIcon = getTransactionIcon(transaction.type);
                  const isPositive = transaction.amount > 0;
                  
                  return (
                    <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          transaction.category === 'income' ? 'bg-green-100' :
                          transaction.category === 'expense' ? 'bg-red-100' :
                          'bg-blue-100'
                        }`}>
                          <TransactionIcon className={`w-6 h-6 ${
                            transaction.category === 'income' ? 'text-green-600' :
                            transaction.category === 'expense' ? 'text-red-600' :
                            'text-blue-600'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-gray-900">
                              {transaction.description}
                            </h4>
                            <Badge className={getCategoryBadgeColor(transaction.category)}>
                              {transaction.category}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {transaction.type.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{new Date(transaction.date).toLocaleString()}</span>
                            <span>•</span>
                            <span className="capitalize">{transaction.status}</span>
                            {transaction.source && (
                              <>
                                <span>•</span>
                                <span className="text-xs">{transaction.source.replace('_', ' ')}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex items-center space-x-2">
                        <div>
                          <p className={`text-lg font-bold ${getTransactionColor(transaction.category, transaction.amount)}`}>
                            {isPositive ? '+' : ''}
                            {showAmounts ? `$${Math.abs(transaction.amount).toFixed(2)}` : '••••'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-900">
              <Activity className="w-5 h-5 mr-2" />
              Transaction Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 text-sm space-y-2">
            <p>• <strong>Income:</strong> All earnings including referral bonuses, pool rewards, deposits, and P2P receipts</p>
            <p>• <strong>Expense:</strong> Withdrawals, activation fees, and other outgoing payments</p>
            <p>• <strong>Transfer:</strong> P2P transfers between users (both sent and received)</p>
            <p>• <strong>Export:</strong> Download your transaction history as CSV for record keeping</p>
            <p>• <strong>Real-time:</strong> All transactions are updated in real-time across the platform</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}