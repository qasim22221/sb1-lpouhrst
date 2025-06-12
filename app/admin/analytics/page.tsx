"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Download,
  Calendar,
  RefreshCw,
  Loader2,
  AlertCircle,
  Activity,
  Target,
  Crown,
  Globe
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/lib/supabase';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AnalyticsData {
  userGrowth: Array<{ date: string; users: number; active: number }>;
  revenueData: Array<{ date: string; revenue: number; withdrawals: number }>;
  incomeStreams: Array<{ name: string; value: number; color: string }>;
  poolPerformance: Array<{ pool: string; completions: number; rewards: number }>;
  referralStats: Array<{ level: string; count: number; income: number }>;
  topPerformers: Array<{ username: string; income: number; referrals: number }>;
}

export default function AdminAnalyticsPage() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [dateRange, setDateRange] = useState('30');
  const [activeTab, setActiveTab] = useState('overview');
  
  const { admin, loading: authLoading } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && !admin) {
      router.push('/admin/login');
    } else if (mounted && !authLoading && admin) {
      loadAnalyticsData();
    }
  }, [admin, authLoading, mounted, router, dateRange]);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      // Load real data from database
      const [
        userGrowthData,
        revenueData,
        incomeStreamData,
        poolData,
        referralData,
        topPerformersData
      ] = await Promise.all([
        loadUserGrowthData(startDate, endDate),
        loadRevenueData(startDate, endDate),
        loadIncomeStreamData(startDate, endDate),
        loadPoolPerformanceData(),
        loadReferralStatsData(),
        loadTopPerformersData()
      ]);

      setAnalyticsData({
        userGrowth: userGrowthData,
        revenueData: revenueData,
        incomeStreams: incomeStreamData,
        poolPerformance: poolData,
        referralStats: referralData,
        topPerformers: topPerformersData
      });

    } catch (err: any) {
      console.error('Error loading analytics data:', err);
      setError('Failed to load analytics data. Using demo data.');
      
      // Fallback to demo data
      setAnalyticsData(generateDemoAnalyticsData());
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserGrowthData = async (startDate: Date, endDate: Date) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('created_at, account_status')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at');

      if (error) throw error;

      // Group by date
      const groupedData: { [key: string]: { total: number; active: number } } = {};
      
      data?.forEach(user => {
        const date = new Date(user.created_at).toISOString().split('T')[0];
        if (!groupedData[date]) {
          groupedData[date] = { total: 0, active: 0 };
        }
        groupedData[date].total++;
        if (user.account_status === 'active') {
          groupedData[date].active++;
        }
      });

      return Object.entries(groupedData).map(([date, counts]) => ({
        date,
        users: counts.total,
        active: counts.active
      }));
    } catch (error) {
      console.error('Error loading user growth data:', error);
      return [];
    }
  };

  const loadRevenueData = async (startDate: Date, endDate: Date) => {
    try {
      const [depositsData, withdrawalsData] = await Promise.all([
        supabase
          .from('fund_wallet_transactions')
          .select('created_at, amount')
          .eq('transaction_type', 'deposit')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        supabase
          .from('withdrawals')
          .select('created_at, amount')
          .eq('status', 'completed')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
      ]);

      if (depositsData.error) throw depositsData.error;
      if (withdrawalsData.error) throw withdrawalsData.error;

      // Group by date
      const revenueByDate: { [key: string]: { revenue: number; withdrawals: number } } = {};

      depositsData.data?.forEach(deposit => {
        const date = new Date(deposit.created_at).toISOString().split('T')[0];
        if (!revenueByDate[date]) {
          revenueByDate[date] = { revenue: 0, withdrawals: 0 };
        }
        revenueByDate[date].revenue += deposit.amount;
      });

      withdrawalsData.data?.forEach(withdrawal => {
        const date = new Date(withdrawal.created_at).toISOString().split('T')[0];
        if (!revenueByDate[date]) {
          revenueByDate[date] = { revenue: 0, withdrawals: 0 };
        }
        revenueByDate[date].withdrawals += withdrawal.amount;
      });

      return Object.entries(revenueByDate).map(([date, amounts]) => ({
        date,
        revenue: amounts.revenue,
        withdrawals: amounts.withdrawals
      }));
    } catch (error) {
      console.error('Error loading revenue data:', error);
      return [];
    }
  };

  const loadIncomeStreamData = async (startDate: Date, endDate: Date) => {
    try {
      const { data, error } = await supabase
        .from('referral_bonuses')
        .select('bonus_type, amount')
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      const incomeByType: { [key: string]: number } = {};
      
      data?.forEach(bonus => {
        incomeByType[bonus.bonus_type] = (incomeByType[bonus.bonus_type] || 0) + bonus.amount;
      });

      const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff', '#00ffff'];
      
      return Object.entries(incomeByType).map(([type, amount], index) => ({
        name: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: amount,
        color: colors[index % colors.length]
      }));
    } catch (error) {
      console.error('Error loading income stream data:', error);
      return [];
    }
  };

  const loadPoolPerformanceData = async () => {
    try {
      const { data, error } = await supabase
        .from('pool_progress')
        .select('pool_number, status, reward_paid')
        .eq('status', 'completed');

      if (error) throw error;

      const poolStats: { [key: number]: { completions: number; rewards: number } } = {};
      
      data?.forEach(pool => {
        if (!poolStats[pool.pool_number]) {
          poolStats[pool.pool_number] = { completions: 0, rewards: 0 };
        }
        poolStats[pool.pool_number].completions++;
        poolStats[pool.pool_number].rewards += pool.reward_paid || 0;
      });

      return Object.entries(poolStats).map(([poolNum, stats]) => ({
        pool: `Pool ${poolNum}`,
        completions: stats.completions,
        rewards: stats.rewards
      }));
    } catch (error) {
      console.error('Error loading pool performance data:', error);
      return [];
    }
  };

  const loadReferralStatsData = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('total_direct_referrals');

      if (error) throw error;

      const levelStats: { [key: string]: number } = {
        '0 Referrals': 0,
        '1-5 Referrals': 0,
        '6-10 Referrals': 0,
        '11-20 Referrals': 0,
        '21+ Referrals': 0
      };

      data?.forEach(profile => {
        const referrals = profile.total_direct_referrals || 0;
        if (referrals === 0) levelStats['0 Referrals']++;
        else if (referrals <= 5) levelStats['1-5 Referrals']++;
        else if (referrals <= 10) levelStats['6-10 Referrals']++;
        else if (referrals <= 20) levelStats['11-20 Referrals']++;
        else levelStats['21+ Referrals']++;
      });

      return Object.entries(levelStats).map(([level, count]) => ({
        level,
        count,
        income: count * 25 // Estimated income per referral
      }));
    } catch (error) {
      console.error('Error loading referral stats:', error);
      return [];
    }
  };

  const loadTopPerformersData = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, main_wallet_balance, total_direct_referrals')
        .order('main_wallet_balance', { ascending: false })
        .limit(10);

      if (error) throw error;

      return data?.map(profile => ({
        username: profile.username,
        income: profile.main_wallet_balance || 0,
        referrals: profile.total_direct_referrals || 0
      })) || [];
    } catch (error) {
      console.error('Error loading top performers:', error);
      return [];
    }
  };

  const generateDemoAnalyticsData = (): AnalyticsData => {
    const days = parseInt(dateRange);
    const userGrowth = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - i));
      return {
        date: date.toISOString().split('T')[0],
        users: Math.floor(Math.random() * 50) + 10,
        active: Math.floor(Math.random() * 30) + 5
      };
    });

    const revenueData = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - i));
      return {
        date: date.toISOString().split('T')[0],
        revenue: Math.floor(Math.random() * 5000) + 1000,
        withdrawals: Math.floor(Math.random() * 2000) + 500
      };
    });

    return {
      userGrowth,
      revenueData,
      incomeStreams: [
        { name: 'Direct Referral', value: 15420, color: '#8884d8' },
        { name: 'Level Income', value: 8930, color: '#82ca9d' },
        { name: 'Pool Rewards', value: 12450, color: '#ffc658' },
        { name: 'Team Rewards', value: 6780, color: '#ff7300' },
        { name: 'Global Turnover', value: 4320, color: '#00ff00' }
      ],
      poolPerformance: [
        { pool: 'Pool 1', completions: 1250, rewards: 6250 },
        { pool: 'Pool 2', completions: 890, rewards: 8900 },
        { pool: 'Pool 3', completions: 560, rewards: 8400 },
        { pool: 'Pool 4', completions: 320, rewards: 8640 }
      ],
      referralStats: [
        { level: '0 Referrals', count: 450, income: 0 },
        { level: '1-5 Referrals', count: 320, income: 8000 },
        { level: '6-10 Referrals', count: 180, income: 14400 },
        { level: '11-20 Referrals', count: 95, income: 23750 },
        { level: '21+ Referrals', count: 35, income: 26250 }
      ],
      topPerformers: [
        { username: 'crypto_king', income: 15420, referrals: 45 },
        { username: 'diamond_trader', income: 12890, referrals: 38 },
        { username: 'gold_master', income: 11250, referrals: 32 },
        { username: 'platinum_pro', income: 9870, referrals: 28 },
        { username: 'silver_star', income: 8450, referrals: 25 }
      ]
    };
  };

  const exportData = (type: string) => {
    if (!analyticsData) return;

    let csvContent = '';
    let filename = '';

    switch (type) {
      case 'users':
        csvContent = 'Date,New Users,Active Users\n' +
          analyticsData.userGrowth.map(d => `${d.date},${d.users},${d.active}`).join('\n');
        filename = 'user_growth.csv';
        break;
      case 'revenue':
        csvContent = 'Date,Revenue,Withdrawals\n' +
          analyticsData.revenueData.map(d => `${d.date},${d.revenue},${d.withdrawals}`).join('\n');
        filename = 'revenue_data.csv';
        break;
      case 'performers':
        csvContent = 'Username,Income,Referrals\n' +
          analyticsData.topPerformers.map(p => `${p.username},${p.income},${p.referrals}`).join('\n');
        filename = 'top_performers.csv';
        break;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">Please log in to access the admin panel</p>
          <Button onClick={() => router.push('/admin/login')}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/admin')}
                className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Analytics & Reports</h1>
                <p className="text-sm text-slate-600">Comprehensive platform analytics and insights</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
              <Button
                onClick={loadAnalyticsData}
                variant="outline"
                size="sm"
                disabled={isLoading}
                className="border-slate-200 hover:bg-slate-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-700">{error}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Loading analytics data...</p>
          </div>
        ) : analyticsData ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="income">Income Streams</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analyticsData.userGrowth.reduce((sum, day) => sum + day.users, 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      +{analyticsData.userGrowth[analyticsData.userGrowth.length - 1]?.users || 0} today
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${analyticsData.revenueData.reduce((sum, day) => sum + day.revenue, 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      +${analyticsData.revenueData[analyticsData.revenueData.length - 1]?.revenue || 0} today
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pool Completions</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analyticsData.poolPerformance.reduce((sum, pool) => sum + pool.completions, 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Across all pools
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
                    <Crown className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${analyticsData.topPerformers[0]?.income.toLocaleString() || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {analyticsData.topPerformers[0]?.username || 'No data'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>User Growth</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={analyticsData.userGrowth}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Area type="monotone" dataKey="users" stackId="1" stroke="#8884d8" fill="#8884d8" />
                        <Area type="monotone" dataKey="active" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Revenue vs Withdrawals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={analyticsData.revenueData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                        <Line type="monotone" dataKey="withdrawals" stroke="#82ca9d" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">User Analytics</h2>
                <Button onClick={() => exportData('users')} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>User Growth Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <AreaChart data={analyticsData.userGrowth}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="users" stackId="1" stroke="#8884d8" fill="#8884d8" name="New Users" />
                        <Area type="monotone" dataKey="active" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Active Users" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Referral Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={analyticsData.referralStats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="level" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Revenue Tab */}
            <TabsContent value="revenue" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Revenue Analytics</h2>
                <Button onClick={() => exportData('revenue')} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue vs Withdrawals Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={analyticsData.revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`$${value}`, '']} />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={3} name="Revenue" />
                      <Line type="monotone" dataKey="withdrawals" stroke="#82ca9d" strokeWidth={3} name="Withdrawals" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Income Streams Tab */}
            <TabsContent value="income" className="space-y-6">
              <h2 className="text-2xl font-bold">Income Stream Analysis</h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Income Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <PieChart>
                        <Pie
                          data={analyticsData.incomeStreams}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {analyticsData.incomeStreams.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`$${value}`, '']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Income by Stream</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={analyticsData.incomeStreams}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`$${value}`, '']} />
                        <Bar dataKey="value" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Performance Metrics</h2>
                <Button onClick={() => exportData('performers')} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Pool Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={analyticsData.poolPerformance}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="pool" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="completions" fill="#8884d8" name="Completions" />
                        <Bar dataKey="rewards" fill="#82ca9d" name="Rewards ($)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Performers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analyticsData.topPerformers.map((performer, index) => (
                        <div key={performer.username} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {index + 1}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold">{performer.username}</p>
                              <p className="text-sm text-slate-600">{performer.referrals} referrals</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">${performer.income.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">No analytics data available</p>
          </div>
        )}
      </div>
    </div>
  );
}