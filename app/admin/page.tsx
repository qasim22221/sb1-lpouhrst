"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard,
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  BarChart3,
  Settings,
  Shield,
  Bell,
  FileText,
  Database,
  Loader2,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Target,
  Crown,
  Globe,
  Gift,
  Zap,
  UserPlus,
  CreditCard,
  PieChart,
  TrendingDown,
  Calendar,
  Eye,
  Lock,
  Mail,
  Smartphone
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface DashboardStats {
  total_users: number;
  active_users: number;
  inactive_users: number;
  total_deposits: number;
  total_withdrawals: number;
  pending_withdrawals: number;
  total_main_balance: number;
  total_fund_balance: number;
  today_registrations: number;
  today_activations: number;
  total_referral_income: number;
  total_pool_rewards: number;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  amount?: number;
  user_id?: string;
  username?: string;
  created_at: string;
  status?: string;
}

export default function AdminDashboard() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  const { admin } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    if (admin) {
      loadDashboardData();
      // Set up auto-refresh every 30 seconds
      const interval = setInterval(loadDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [admin]);

  const loadDashboardData = async () => {
    try {
      setError('');
      
      // Load dashboard statistics
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_admin_dashboard_stats');

      if (statsError) {
        throw new Error(`Failed to load dashboard stats: ${statsError.message}`);
      }

      setStats(statsData);

      // Load recent activity
      await loadRecentActivity();
      
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Dashboard loading error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecentActivity = async () => {
    try {
      // Get recent registrations
      const { data: registrations } = await supabase
        .from('profiles')
        .select('id, username, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      // Get recent withdrawals
      const { data: withdrawals } = await supabase
        .from('withdrawals')
        .select(`
          id, amount, status, created_at,
          profiles!inner(username)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      // Get recent deposits
      const { data: deposits } = await supabase
        .from('fund_wallet_transactions')
        .select(`
          id, amount, created_at, description,
          profiles!inner(username)
        `)
        .eq('transaction_type', 'deposit')
        .order('created_at', { ascending: false })
        .limit(5);

      // Combine and format activity
      const activity: RecentActivity[] = [];

      // Add registrations
      registrations?.forEach(reg => {
        activity.push({
          id: reg.id,
          type: 'registration',
          description: `New user registered: ${reg.username}`,
          created_at: reg.created_at,
          username: reg.username
        });
      });

      // Add withdrawals
      withdrawals?.forEach(withdrawal => {
        activity.push({
          id: withdrawal.id,
          type: 'withdrawal',
          description: `Withdrawal request: $${withdrawal.amount}`,
          amount: withdrawal.amount,
          created_at: withdrawal.created_at,
          status: withdrawal.status,
          username: (withdrawal.profiles as any)?.username
        });
      });

      // Add deposits
      deposits?.forEach(deposit => {
        activity.push({
          id: deposit.id,
          type: 'deposit',
          description: `Deposit: $${deposit.amount}`,
          amount: deposit.amount,
          created_at: deposit.created_at,
          username: (deposit.profiles as any)?.username
        });
      });

      // Sort by date and take latest 10
      activity.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecentActivity(activity.slice(0, 10));

    } catch (err: any) {
      console.error('Recent activity loading error:', err);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'registration': return UserPlus;
      case 'withdrawal': return ArrowUpRight;
      case 'deposit': return ArrowDownRight;
      default: return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'registration': return 'text-blue-600';
      case 'withdrawal': return 'text-red-600';
      case 'deposit': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (!mounted) {
    return null;
  }

  if (!admin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">Please log in as an admin to access this dashboard</p>
          <Button onClick={() => router.push('/admin/login')}>
            Go to Admin Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-slate-200 mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
              <p className="text-sm text-slate-600">
                Welcome back, {admin.first_name || admin.username}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-sm text-slate-600">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
              <Button
                onClick={loadDashboardData}
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
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

        {/* Loading State */}
        {isLoading && !stats && (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Loading dashboard data...</p>
          </div>
        )}

        {/* Dashboard Content */}
        {stats && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-600 text-sm font-medium">Total Users</p>
                      <p className="text-3xl font-bold text-blue-900">{formatNumber(stats.total_users)}</p>
                      <p className="text-blue-700 text-sm">
                        {formatNumber(stats.today_registrations)} today
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-600 text-sm font-medium">Active Users</p>
                      <p className="text-3xl font-bold text-green-900">{formatNumber(stats.active_users)}</p>
                      <p className="text-green-700 text-sm">
                        {formatNumber(stats.today_activations)} activated today
                      </p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-600 text-sm font-medium">Total Deposits</p>
                      <p className="text-3xl font-bold text-purple-900">{formatCurrency(stats.total_deposits)}</p>
                      <p className="text-purple-700 text-sm">Platform revenue</p>
                    </div>
                    <ArrowDownRight className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-600 text-sm font-medium">Pending Withdrawals</p>
                      <p className="text-3xl font-bold text-orange-900">{formatNumber(stats.pending_withdrawals)}</p>
                      <p className="text-orange-700 text-sm">Needs approval</p>
                    </div>
                    <Clock className="w-8 h-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Financial Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Wallet className="w-5 h-5 mr-2 text-green-600" />
                    Platform Balances
                  </CardTitle>
                  <CardDescription>
                    Total user balances across all wallets
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                      <div>
                        <p className="font-medium text-green-900">Main Wallet Balance</p>
                        <p className="text-sm text-green-700">User earnings & withdrawals</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-900">
                          {formatCurrency(stats.total_main_balance)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                      <div>
                        <p className="font-medium text-blue-900">Fund Wallet Balance</p>
                        <p className="text-sm text-blue-700">User deposits & activities</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-900">
                          {formatCurrency(stats.total_fund_balance)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                      <div>
                        <p className="font-medium text-purple-900">Total Platform Balance</p>
                        <p className="text-sm text-purple-700">Combined user balances</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-purple-900">
                          {formatCurrency(stats.total_main_balance + stats.total_fund_balance)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                    Income Distribution
                  </CardTitle>
                  <CardDescription>
                    Total income distributed to users
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                      <div>
                        <p className="font-medium text-blue-900">Referral Bonuses</p>
                        <p className="text-sm text-blue-700">Direct & level income</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-900">
                          {formatCurrency(stats.total_referral_income)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                      <div>
                        <p className="font-medium text-purple-900">Pool Rewards</p>
                        <p className="text-sm text-purple-700">All pool completions</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-purple-900">
                          {formatCurrency(stats.total_pool_rewards)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                      <div>
                        <p className="font-medium text-red-900">Total Withdrawals</p>
                        <p className="text-sm text-red-700">Completed withdrawals</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-red-900">
                          {formatCurrency(stats.total_withdrawals)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-blue-600" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>
                    Latest platform activities and transactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {recentActivity.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No recent activity found</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentActivity.map((activity) => {
                        const ActivityIcon = getActivityIcon(activity.type);
                        const colorClass = getActivityColor(activity.type);
                        
                        return (
                          <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              activity.type === 'registration' ? 'bg-blue-100' :
                              activity.type === 'withdrawal' ? 'bg-red-100' :
                              'bg-green-100'
                            }`}>
                              <ActivityIcon className={`w-5 h-5 ${colorClass}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                              <div className="flex items-center text-xs text-gray-500 space-x-2">
                                <span>{new Date(activity.created_at).toLocaleString()}</span>
                                {activity.username && (
                                  <>
                                    <span>•</span>
                                    <span>{activity.username}</span>
                                  </>
                                )}
                                {activity.status && (
                                  <>
                                    <span>•</span>
                                    <Badge className={`text-xs ${
                                      activity.status === 'completed' ? 'bg-green-100 text-green-800' :
                                      activity.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {activity.status}
                                    </Badge>
                                  </>
                                )}
                              </div>
                            </div>
                            {activity.amount && (
                              <div className="text-right">
                                <span className={`font-semibold ${
                                  activity.type === 'withdrawal' ? 'text-red-600' : 'text-green-600'
                                }`}>
                                  {activity.type === 'withdrawal' ? '-' : '+'}
                                  {formatCurrency(activity.amount)}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="w-5 h-5 mr-2 text-purple-600" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription>
                    Common administrative tasks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={() => router.push('/admin/withdrawals')}
                    variant="outline"
                    className="w-full justify-start border-orange-200 hover:bg-orange-50 text-orange-700"
                  >
                    <ArrowUpRight className="w-4 h-4 mr-2" />
                    <span>Process Withdrawals</span>
                    {stats.pending_withdrawals > 0 && (
                      <Badge className="ml-auto bg-orange-100 text-orange-800">
                        {stats.pending_withdrawals}
                      </Badge>
                    )}
                  </Button>

                  <Button
                    onClick={() => router.push('/admin/users')}
                    variant="outline"
                    className="w-full justify-start border-blue-200 hover:bg-blue-50 text-blue-700"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    <span>Manage Users</span>
                  </Button>

                  <Button
                    onClick={() => router.push('/admin/master-wallet')}
                    variant="outline"
                    className="w-full justify-start border-green-200 hover:bg-green-50 text-green-700"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    <span>Master Wallet Config</span>
                  </Button>

                  <Button
                    onClick={() => router.push('/admin/income-settings')}
                    variant="outline"
                    className="w-full justify-start border-purple-200 hover:bg-purple-50 text-purple-700"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    <span>Income Settings</span>
                  </Button>

                  <Button
                    onClick={() => router.push('/admin/analytics')}
                    variant="outline"
                    className="w-full justify-start border-teal-200 hover:bg-teal-50 text-teal-700"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    <span>View Analytics</span>
                  </Button>

                  <Button
                    onClick={() => router.push('/admin/logs')}
                    variant="outline"
                    className="w-full justify-start border-gray-200 hover:bg-gray-50 text-gray-700"
                  >
                    <Activity className="w-4 h-4 mr-2" />
                    <span>System Logs</span>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-blue-600" />
                  System Status
                </CardTitle>
                <CardDescription>
                  Current platform status and health metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-green-600 font-medium">User Ratio</p>
                        <p className="text-lg font-bold text-green-900">
                          {stats.total_users > 0 
                            ? `${Math.round((stats.active_users / stats.total_users) * 100)}%` 
                            : '0%'}
                        </p>
                      </div>
                      <Users className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-xs text-green-700 mt-1">
                      Active vs Total Users
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-blue-600 font-medium">Avg Balance</p>
                        <p className="text-lg font-bold text-blue-900">
                          {stats.total_users > 0 
                            ? formatCurrency((stats.total_main_balance + stats.total_fund_balance) / stats.total_users) 
                            : '$0.00'}
                        </p>
                      </div>
                      <Wallet className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-xs text-blue-700 mt-1">
                      Per User Average
                    </p>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-purple-600 font-medium">Pool Completion</p>
                        <p className="text-lg font-bold text-purple-900">
                          {stats.total_pool_rewards > 0 
                            ? `${Math.round(stats.total_pool_rewards / (stats.pool_1_amount + stats.pool_2_amount + stats.pool_3_amount + stats.pool_4_amount))}` 
                            : '0'}
                        </p>
                      </div>
                      <Target className="w-5 h-5 text-purple-600" />
                    </div>
                    <p className="text-xs text-purple-700 mt-1">
                      Full Cycles Completed
                    </p>
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-orange-600 font-medium">System Status</p>
                        <p className="text-lg font-bold text-orange-900">
                          Operational
                        </p>
                      </div>
                      <CheckCircle className="w-5 h-5 text-orange-600" />
                    </div>
                    <p className="text-xs text-orange-700 mt-1">
                      All services running
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Admin Settings Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-blue-900">Master Wallet</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-blue-700 mb-4">
                    Configure the master wallet for gas distribution and USDT sweeping
                  </p>
                  <Button 
                    onClick={() => router.push('/admin/master-wallet')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Configure Wallet
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-purple-900">Income Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-purple-700 mb-4">
                    Configure all income streams, rewards, and fee structures
                  </p>
                  <Button 
                    onClick={() => router.push('/admin/income-settings')}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Manage Income
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-green-900">Sweep Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-green-700 mb-4">
                    Configure automatic USDT sweeping from user wallets
                  </p>
                  <Button 
                    onClick={() => router.push('/admin/sweep-settings')}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Manage Sweeping
                  </Button>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}