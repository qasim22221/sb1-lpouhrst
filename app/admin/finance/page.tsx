"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Activity,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  CreditCard,
  BarChart3,
  PieChart,
  Calendar,
  Clock,
  Target,
  Crown,
  Globe,
  Gift
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/lib/supabase';

interface FinancialStats {
  totalUsers: number;
  activeUsers: number;
  totalMainBalance: number;
  totalFundBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  pendingWithdrawals: number;
  totalReferralIncome: number;
  totalPoolRewards: number;
  todayRegistrations: number;
  todayActivations: number;
}

interface IncomeStreamStats {
  directReferral: number;
  levelIncome: number;
  poolIncome: number;
  rankSponsorIncome: number;
  globalTurnoverIncome: number;
  teamRewards: number;
  recycleIncome: number;
}

interface RecentTransaction {
  id: string;
  type: string;
  amount: number;
  username: string;
  description: string;
  created_at: string;
  status: string;
}

export default function AdminFinancePage() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [financialStats, setFinancialStats] = useState<FinancialStats | null>(null);
  const [incomeStreamStats, setIncomeStreamStats] = useState<IncomeStreamStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  const { admin, hasPermission } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && admin) {
      loadFinancialData();
    } else if (mounted && !admin) {
      router.push('/admin/login');
    }
  }, [mounted, admin, router]);

  const loadFinancialData = async () => {
    if (!hasPermission('finances.view')) {
      setError('You do not have permission to view financial data');
      return;
    }

    setIsLoading(true);
    try {
      await Promise.all([
        loadDashboardStats(),
        loadIncomeStreamStats(),
        loadRecentTransactions()
      ]);
    } catch (err: any) {
      setError(`Failed to load financial data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDashboardStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_admin_dashboard_stats');

      if (error) {
        throw new Error(`Failed to load dashboard stats: ${error.message}`);
      }

      setFinancialStats(data);
    } catch (err: any) {
      console.error('Error loading dashboard stats:', err);
    }
  };

  const loadIncomeStreamStats = async () => {
    try {
      // Get income stream breakdown
      const { data: incomeData, error } = await supabase
        .from('referral_bonuses')
        .select('bonus_type, amount')
        .eq('status', 'completed');

      if (error) {
        throw new Error(`Failed to load income stream stats: ${error.message}`);
      }

      // Calculate totals by type
      const streamTotals = (incomeData || []).reduce((acc, item) => {
        const type = item.bonus_type;
        acc[type] = (acc[type] || 0) + item.amount;
        return acc;
      }, {} as Record<string, number>);

      // Get pool income separately
      const { data: poolData } = await supabase
        .from('pool_progress')
        .select('reward_paid')
        .eq('status', 'completed');

      const poolIncome = (poolData || []).reduce((sum, item) => sum + item.reward_paid, 0);

      setIncomeStreamStats({
        directReferral: streamTotals['direct_referral'] || 0,
        levelIncome: streamTotals['level_income'] || 0,
        poolIncome: poolIncome,
        rankSponsorIncome: streamTotals['rank_sponsor_income'] || 0,
        globalTurnoverIncome: streamTotals['global_turnover_income'] || 0,
        teamRewards: streamTotals['team_rewards'] || 0,
        recycleIncome: streamTotals['recycle_income'] || 0,
      });
    } catch (err: any) {
      console.error('Error loading income stream stats:', err);
    }
  };

  const loadRecentTransactions = async () => {
    try {
      // Get recent transactions from multiple sources
      const [bonuses, deposits, withdrawals] = await Promise.all([
        supabase
          .from('referral_bonuses')
          .select(`
            id, bonus_type, amount, description, created_at, status,
            profiles!referral_bonuses_user_id_fkey(username)
          `)
          .order('created_at', { ascending: false })
          .limit(10),
        
        supabase
          .from('fund_wallet_transactions')
          .select(`
            id, transaction_type, amount, description, created_at,
            profiles!fund_wallet_transactions_user_id_fkey(username)
          `)
          .eq('transaction_type', 'deposit')
          .order('created_at', { ascending: false })
          .limit(5),
        
        supabase
          .from('withdrawals')
          .select(`
            id, amount, status, created_at,
            profiles!withdrawals_user_id_fkey(username)
          `)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      const transactions: RecentTransaction[] = [];

      // Add bonuses
      (bonuses.data || []).forEach(bonus => {
        transactions.push({
          id: bonus.id,
          type: bonus.bonus_type,
          amount: bonus.amount,
          username: bonus.profiles?.username || 'Unknown',
          description: bonus.description,
          created_at: bonus.created_at,
          status: bonus.status
        });
      });

      // Add deposits
      (deposits.data || []).forEach(deposit => {
        transactions.push({
          id: deposit.id,
          type: 'deposit',
          amount: deposit.amount,
          username: deposit.profiles?.username || 'Unknown',
          description: deposit.description,
          created_at: deposit.created_at,
          status: 'completed'
        });
      });

      // Add withdrawals
      (withdrawals.data || []).forEach(withdrawal => {
        transactions.push({
          id: withdrawal.id,
          type: 'withdrawal',
          amount: withdrawal.amount,
          username: withdrawal.profiles?.username || 'Unknown',
          description: `Withdrawal request`,
          created_at: withdrawal.created_at,
          status: withdrawal.status
        });
      });

      // Sort by date and take most recent
      transactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecentTransactions(transactions.slice(0, 15));

    } catch (err: any) {
      console.error('Error loading recent transactions:', err);
    }
  };

  const exportFinancialReport = () => {
    if (!financialStats || !incomeStreamStats) return;

    const reportData = {
      generatedAt: new Date().toISOString(),
      summary: financialStats,
      incomeStreams: incomeStreamStats,
      recentTransactions: recentTransactions.slice(0, 10)
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial_report_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'direct_referral':
        return Users;
      case 'level_income':
        return BarChart3;
      case 'pool_reward':
        return Target;
      case 'rank_sponsor_income':
        return Crown;
      case 'global_turnover_income':
        return Globe;
      case 'team_rewards':
        return Gift;
      case 'deposit':
        return ArrowDownRight;
      case 'withdrawal':
        return ArrowUpRight;
      default:
        return DollarSign;
    }
  };

  const getTransactionColor = (type: string, amount: number) => {
    if (type === 'withdrawal') {
      return 'text-red-600';
    } else if (amount > 0) {
      return 'text-green-600';
    } else {
      return 'text-gray-600';
    }
  };

  if (!mounted) {
    return null;
  }

  if (!admin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Financial Control Center</h1>
            <p className="text-slate-600">Monitor platform finances, balances, and income streams</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={exportFinancialReport}
              variant="outline"
              size="sm"
              className="border-green-200 hover:bg-green-50 text-green-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            <Button
              onClick={loadFinancialData}
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

        {/* Key Financial Metrics */}
        {financialStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card className="bg-white border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Total Users</p>
                    <p className="text-lg font-bold text-slate-900">
                      {(financialStats.totalUsers || 0).toLocaleString()}
                    </p>
                  </div>
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Active Users</p>
                    <p className="text-lg font-bold text-green-600">
                      {(financialStats.activeUsers || 0).toLocaleString()}
                    </p>
                  </div>
                  <Activity className="w-5 h-5 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Total Main Balance</p>
                    <p className="text-lg font-bold text-green-600">
                      ${(financialStats.totalMainBalance || 0).toFixed(2)}
                    </p>
                  </div>
                  <Wallet className="w-5 h-5 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Total Fund Balance</p>
                    <p className="text-lg font-bold text-blue-600">
                      ${(financialStats.totalFundBalance || 0).toFixed(2)}
                    </p>
                  </div>
                  <CreditCard className="w-5 h-5 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Total Deposits</p>
                    <p className="text-lg font-bold text-green-600">
                      ${(financialStats.totalDeposits || 0).toFixed(2)}
                    </p>
                  </div>
                  <ArrowDownRight className="w-5 h-5 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Total Withdrawals</p>
                    <p className="text-lg font-bold text-red-600">
                      ${(financialStats.totalWithdrawals || 0).toFixed(2)}
                    </p>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs for different views */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Financial Overview</TabsTrigger>
            <TabsTrigger value="income-streams">Income Streams</TabsTrigger>
            <TabsTrigger value="transactions">Recent Activity</TabsTrigger>
          </TabsList>

          {/* Financial Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Platform Health */}
              <Card className="bg-white border-slate-200">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                    Platform Health
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {financialStats && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Today's Registrations</span>
                        <Badge className="bg-blue-100 text-blue-700">
                          {financialStats.todayRegistrations || 0}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Today's Activations</span>
                        <Badge className="bg-green-100 text-green-700">
                          {financialStats.todayActivations || 0}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Pending Withdrawals</span>
                        <Badge className="bg-orange-100 text-orange-700">
                          {financialStats.pendingWithdrawals || 0}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Active Rate</span>
                        <Badge className="bg-green-100 text-green-700">
                          {financialStats.totalUsers > 0 
                            ? ((financialStats.activeUsers / financialStats.totalUsers) * 100).toFixed(1)
                            : '0'
                          }%
                        </Badge>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="bg-white border-slate-200">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-blue-600" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={() => router.push('/admin/withdrawals')}
                    className="w-full justify-start bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200"
                  >
                    <ArrowUpRight className="w-4 h-4 mr-2" />
                    Review Pending Withdrawals
                    {financialStats && financialStats.pendingWithdrawals > 0 && (
                      <Badge className="ml-auto bg-orange-200 text-orange-800">
                        {financialStats.pendingWithdrawals}
                      </Badge>
                    )}
                  </Button>
                  <Button
                    onClick={() => router.push('/admin/users')}
                    className="w-full justify-start bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Manage User Accounts
                  </Button>
                  <Button
                    onClick={() => router.push('/admin/analytics')}
                    className="w-full justify-start bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Detailed Analytics
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Income Streams Tab */}
          <TabsContent value="income-streams" className="space-y-6">
            {incomeStreamStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <Card className="bg-white border-slate-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Users className="w-8 h-8 text-emerald-600" />
                      <Badge className="bg-emerald-100 text-emerald-700">Stream 1</Badge>
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1">Direct Referral</h3>
                    <p className="text-2xl font-bold text-emerald-600 mb-2">
                      ${incomeStreamStats.directReferral.toFixed(2)}
                    </p>
                    <p className="text-slate-600 text-sm">$5 per referral</p>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <BarChart3 className="w-8 h-8 text-blue-600" />
                      <Badge className="bg-blue-100 text-blue-700">Stream 2</Badge>
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1">Level Income</h3>
                    <p className="text-2xl font-bold text-blue-600 mb-2">
                      ${incomeStreamStats.levelIncome.toFixed(2)}
                    </p>
                    <p className="text-slate-600 text-sm">$0.5 per level</p>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Target className="w-8 h-8 text-orange-600" />
                      <Badge className="bg-orange-100 text-orange-700">Stream 3</Badge>
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1">Pool Income</h3>
                    <p className="text-2xl font-bold text-orange-600 mb-2">
                      ${incomeStreamStats.poolIncome.toFixed(2)}
                    </p>
                    <p className="text-slate-600 text-sm">$5-$27 rewards</p>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Crown className="w-8 h-8 text-purple-600" />
                      <Badge className="bg-purple-100 text-purple-700">Stream 4</Badge>
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1">Rank Sponsor</h3>
                    <p className="text-2xl font-bold text-purple-600 mb-2">
                      ${incomeStreamStats.rankSponsorIncome.toFixed(2)}
                    </p>
                    <p className="text-slate-600 text-sm">$1-$4 bonuses</p>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Globe className="w-8 h-8 text-teal-600" />
                      <Badge className="bg-teal-100 text-teal-700">Stream 5</Badge>
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1">Global Turnover</h3>
                    <p className="text-2xl font-bold text-teal-600 mb-2">
                      ${incomeStreamStats.globalTurnoverIncome.toFixed(2)}
                    </p>
                    <p className="text-slate-600 text-sm">1-2% daily</p>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Gift className="w-8 h-8 text-pink-600" />
                      <Badge className="bg-pink-100 text-pink-700">Stream 6</Badge>
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1">Team Rewards</h3>
                    <p className="text-2xl font-bold text-pink-600 mb-2">
                      ${incomeStreamStats.teamRewards.toFixed(2)}
                    </p>
                    <p className="text-slate-600 text-sm">$10-$5,000</p>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <RefreshCw className="w-8 h-8 text-amber-600" />
                      <Badge className="bg-amber-100 text-amber-700">Stream 7</Badge>
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1">Recycle Income</h3>
                    <p className="text-2xl font-bold text-amber-600 mb-2">
                      ${incomeStreamStats.recycleIncome.toFixed(2)}
                    </p>
                    <p className="text-slate-600 text-sm">$5 first time</p>
                  </CardContent>
                </Card>

                {/* Total Summary */}
                <Card className="bg-gradient-to-r from-slate-700 to-slate-900 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <DollarSign className="w-8 h-8 text-white" />
                      <Badge className="bg-white/20 text-white">Total</Badge>
                    </div>
                    <h3 className="font-semibold text-white mb-1">Total Income Paid</h3>
                    <p className="text-2xl font-bold text-white mb-2">
                      ${Object.values(incomeStreamStats).reduce((sum, val) => sum + val, 0).toFixed(2)}
                    </p>
                    <p className="text-white/80 text-sm">All streams combined</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Recent Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-slate-600" />
                  Recent Platform Activity
                </CardTitle>
                <CardDescription>
                  Latest transactions and income distributions across the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentTransactions.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No recent activity</h3>
                    <p className="text-slate-600">Recent transactions will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {recentTransactions.map((transaction) => {
                      const TransactionIcon = getTransactionIcon(transaction.type);
                      const colorClass = getTransactionColor(transaction.type, transaction.amount);
                      
                      return (
                        <div key={transaction.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              transaction.type === 'withdrawal' ? 'bg-red-100' :
                              transaction.amount > 0 ? 'bg-green-100' : 'bg-gray-100'
                            }`}>
                              <TransactionIcon className={`w-5 h-5 ${colorClass}`} />
                            </div>
                            <div>
                              <h4 className="font-medium text-slate-900 text-sm">
                                {transaction.description}
                              </h4>
                              <p className="text-xs text-slate-500">
                                {transaction.username} • {new Date(transaction.created_at).toLocaleDateString()} • {transaction.status}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${colorClass}`}>
                              {transaction.type === 'withdrawal' ? '-' : '+'}${Math.abs(transaction.amount).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}