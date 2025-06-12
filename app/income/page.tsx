"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Target, 
  Crown, 
  Gift, 
  RefreshCw,
  BarChart3,
  Activity,
  Calendar,
  Eye,
  ExternalLink,
  Download,
  Filter,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  Star,
  Award,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Minus
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface ReferralBonus {
  id: string;
  user_id: string;
  referred_user_id: string;
  bonus_type: string;
  amount: number;
  level: number;
  reference_id: string;
  description: string;
  status: string;
  created_at: string;
  processed_at: string;
  referred_user?: {
    username: string;
    rank: string;
    account_status: string;
  };
}

interface IncomeStats {
  direct_referral_income: number;
  level_income: number;
  pool_income: number;
  rank_sponsor_income: number;
  global_turnover_income: number;
  team_rewards: number;
  recycle_income: number;
  total_income: number;
  total_referrals: number;
  active_referrals: number;
  this_month_income: number;
  last_month_income: number;
}

interface DirectReferral {
  id: string;
  username: string;
  rank: string;
  account_status: string;
  activation_date: string;
  total_earned_from: number;
  last_activity: string;
}

export default function IncomePage() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [referralBonuses, setReferralBonuses] = useState<ReferralBonus[]>([]);
  const [incomeStats, setIncomeStats] = useState<IncomeStats | null>(null);
  const [directReferrals, setDirectReferrals] = useState<DirectReferral[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && !user) {
      router.push('/login');
    } else if (mounted && !authLoading && user && profile) {
      loadIncomeData();
    }
  }, [user, profile, authLoading, mounted, router]);

  const loadIncomeData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      await Promise.all([
        loadReferralBonuses(),
        loadIncomeStats(),
        loadDirectReferrals(),
      ]);
    } catch (err: any) {
      setError(`Failed to load income data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadReferralBonuses = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('referral_bonuses')
        .select(`
          *,
          referred_user:profiles!referral_bonuses_referred_user_id_fkey(
            username,
            rank,
            account_status
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Apply date filter
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
        
        query = query.gte('created_at', startDate.toISOString());
      }

      // Apply type filter
      if (filterType !== 'all') {
        query = query.eq('bonus_type', filterType);
      }

      const { data, error } = await query.limit(100);

      if (error) {
        throw new Error(`Failed to load referral bonuses: ${error.message}`);
      }

      setReferralBonuses(data || []);
    } catch (err: any) {
      console.error('Error loading referral bonuses:', err);
    }
  };

  const loadIncomeStats = async () => {
    if (!user) return;

    try {
      // Get income statistics
      const { data: bonuses, error: bonusError } = await supabase
        .from('referral_bonuses')
        .select('bonus_type, amount, created_at')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      if (bonusError) {
        throw new Error(`Failed to load income stats: ${bonusError.message}`);
      }

      // Get pool income
      const { data: poolData, error: poolError } = await supabase
        .from('pool_progress')
        .select('reward_paid, completed_at')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      if (poolError) {
        throw new Error(`Failed to load pool income: ${poolError.message}`);
      }

      // Calculate totals by type
      const incomeByType = (bonuses || []).reduce((acc, bonus) => {
        acc[bonus.bonus_type] = (acc[bonus.bonus_type] || 0) + bonus.amount;
        return acc;
      }, {} as Record<string, number>);

      const poolIncome = (poolData || []).reduce((sum, pool) => sum + pool.reward_paid, 0);

      // Calculate monthly income
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const thisMonthBonuses = (bonuses || []).filter(b => 
        new Date(b.created_at) >= thisMonthStart
      );
      const lastMonthBonuses = (bonuses || []).filter(b => 
        new Date(b.created_at) >= lastMonthStart && new Date(b.created_at) <= lastMonthEnd
      );

      const thisMonthPool = (poolData || []).filter(p => 
        p.completed_at && new Date(p.completed_at) >= thisMonthStart
      );
      const lastMonthPool = (poolData || []).filter(p => 
        p.completed_at && new Date(p.completed_at) >= lastMonthStart && new Date(p.completed_at) <= lastMonthEnd
      );

      const thisMonthIncome = thisMonthBonuses.reduce((sum, b) => sum + b.amount, 0) + 
                             thisMonthPool.reduce((sum, p) => sum + p.reward_paid, 0);
      const lastMonthIncome = lastMonthBonuses.reduce((sum, b) => sum + b.amount, 0) + 
                             lastMonthPool.reduce((sum, p) => sum + p.reward_paid, 0);

      const totalIncome = Object.values(incomeByType).reduce((sum, amount) => sum + amount, 0) + poolIncome;

      setIncomeStats({
        direct_referral_income: incomeByType['direct_referral'] || 0,
        level_income: incomeByType['level_income'] || 0,
        pool_income: poolIncome,
        rank_sponsor_income: incomeByType['rank_sponsor_income'] || 0,
        global_turnover_income: incomeByType['global_turnover_income'] || 0,
        team_rewards: incomeByType['team_rewards'] || 0,
        recycle_income: incomeByType['recycle_income'] || 0,
        total_income: totalIncome,
        total_referrals: profile?.total_direct_referrals || 0,
        active_referrals: profile?.active_direct_referrals || 0,
        this_month_income: thisMonthIncome,
        last_month_income: lastMonthIncome,
      });
    } catch (err: any) {
      console.error('Error loading income stats:', err);
    }
  };

  const loadDirectReferrals = async () => {
    if (!user || !profile) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, rank, account_status, activation_date, created_at')
        .eq('referred_by', profile.referral_code)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to load direct referrals: ${error.message}`);
      }

      // Calculate earnings from each referral
      const referralsWithEarnings = await Promise.all(
        (data || []).map(async (referral) => {
          const { data: earnings } = await supabase
            .from('referral_bonuses')
            .select('amount')
            .eq('user_id', user.id)
            .eq('referred_user_id', referral.id);

          const totalEarned = (earnings || []).reduce((sum, e) => sum + e.amount, 0);

          return {
            ...referral,
            total_earned_from: totalEarned,
            last_activity: referral.activation_date || referral.created_at,
          };
        })
      );

      setDirectReferrals(referralsWithEarnings);
    } catch (err: any) {
      console.error('Error loading direct referrals:', err);
    }
  };

  const refreshData = async () => {
    await loadIncomeData();
    setSuccess('Income data refreshed successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const getIncomeTypeIcon = (type: string) => {
    switch (type) {
      case 'direct_referral':
      case 'activation_bonus':
      case 'reactivation_bonus':
        return Users;
      case 'level_income':
        return BarChart3;
      case 'rank_sponsor_income':
        return Crown;
      case 'global_turnover_income':
        return TrendingUp;
      case 'team_rewards':
        return Gift;
      case 'recycle_income':
        return RefreshCw;
      default:
        return DollarSign;
    }
  };

  const getIncomeTypeColor = (type: string) => {
    switch (type) {
      case 'direct_referral':
      case 'activation_bonus':
      case 'reactivation_bonus':
        return 'from-emerald-400 to-emerald-600';
      case 'level_income':
        return 'from-blue-400 to-blue-600';
      case 'rank_sponsor_income':
        return 'from-purple-400 to-purple-600';
      case 'global_turnover_income':
        return 'from-teal-400 to-teal-600';
      case 'team_rewards':
        return 'from-pink-400 to-pink-600';
      case 'recycle_income':
        return 'from-amber-400 to-amber-600';
      default:
        return 'from-gray-400 to-gray-600';
    }
  };

  const getIncomeTypeName = (type: string) => {
    switch (type) {
      case 'direct_referral':
        return 'Direct Referral';
      case 'activation_bonus':
        return 'Activation Bonus';
      case 'reactivation_bonus':
        return 'Reactivation Bonus';
      case 'level_income':
        return 'Level Income';
      case 'rank_sponsor_income':
        return 'Rank Sponsor';
      case 'global_turnover_income':
        return 'Global Turnover';
      case 'team_rewards':
        return 'Team Rewards';
      case 'recycle_income':
        return 'Recycle Income';
      default:
        return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const filteredBonuses = referralBonuses.filter(bonus => {
    const matchesSearch = searchTerm === '' || 
      bonus.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bonus.referred_user?.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const filteredReferrals = directReferrals.filter(referral => {
    return searchTerm === '' || 
      referral.username.toLowerCase().includes(searchTerm.toLowerCase());
  });

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
          <p className="text-gray-600 mb-4">Please log in to access income tracking</p>
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
                <h1 className="text-xl font-bold text-gray-900">Income Tracking</h1>
                <p className="text-sm text-gray-600">Monitor all your income streams</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
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

        {/* Income Overview Cards */}
        {incomeStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Income</CardTitle>
                <DollarSign className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">${incomeStats.total_income.toFixed(2)}</div>
                <p className="text-xs text-gray-500 mt-1">All-time earnings</p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">This Month</CardTitle>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">${incomeStats.this_month_income.toFixed(2)}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {incomeStats.this_month_income > incomeStats.last_month_income ? (
                    <span className="text-green-600">
                      +{((incomeStats.this_month_income - incomeStats.last_month_income) / Math.max(incomeStats.last_month_income, 1) * 100).toFixed(1)}% from last month
                    </span>
                  ) : (
                    <span className="text-red-600">
                      {incomeStats.last_month_income > 0 ? 
                        `${((incomeStats.this_month_income - incomeStats.last_month_income) / incomeStats.last_month_income * 100).toFixed(1)}% from last month` :
                        'First month earnings'
                      }
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Direct Referrals</CardTitle>
                <Users className="w-4 h-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{incomeStats.total_referrals}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {incomeStats.active_referrals} active
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Direct Referral Income</CardTitle>
                <Users className="w-4 h-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">${incomeStats.direct_referral_income.toFixed(2)}</div>
                <p className="text-xs text-gray-500 mt-1">
                  ${(incomeStats.total_referrals > 0 ? incomeStats.direct_referral_income / incomeStats.total_referrals : 0).toFixed(2)} per referral
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs for different views */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="referrals">My Referrals</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {incomeStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Direct Referral Income */}
                <Card className="hover:shadow-lg transition-all duration-300 border-orange-100 hover:border-orange-200 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Direct Referral Income</CardTitle>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-lg">
                      <Users className="w-4 h-4 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-gray-900 mb-1">${incomeStats.direct_referral_income.toFixed(2)}</div>
                    <p className="text-xs text-gray-500 mb-2">$5 per direct referral (instant payment)</p>
                    <div className="flex items-center text-xs text-gray-600">
                      <Activity className="w-3 h-3 mr-1" />
                      {incomeStats.total_referrals} total referrals
                    </div>
                  </CardContent>
                </Card>

                {/* Level Income */}
                <Card className="hover:shadow-lg transition-all duration-300 border-orange-100 hover:border-orange-200 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Level Income</CardTitle>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-r from-blue-400 to-blue-600 shadow-lg">
                      <BarChart3 className="w-4 h-4 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-gray-900 mb-1">${incomeStats.level_income.toFixed(2)}</div>
                    <p className="text-xs text-gray-500 mb-2">$0.5 per activation across levels 2-7</p>
                    <div className="flex items-center text-xs text-gray-600">
                      <Activity className="w-3 h-3 mr-1" />
                      {incomeStats.active_referrals} active downline
                    </div>
                  </CardContent>
                </Card>

                {/* Pool Income */}
                <Card className="hover:shadow-lg transition-all duration-300 border-orange-100 hover:border-orange-200 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Pool Income</CardTitle>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-r from-orange-400 to-orange-600 shadow-lg">
                      <Target className="w-4 h-4 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-gray-900 mb-1">${incomeStats.pool_income.toFixed(2)}</div>
                    <p className="text-xs text-gray-500 mb-2">Progressive rewards through 4 pools</p>
                    <div className="flex items-center text-xs text-gray-600">
                      <Activity className="w-3 h-3 mr-1" />
                      Pool progression rewards
                    </div>
                  </CardContent>
                </Card>

                {/* Rank Sponsor Income */}
                <Card className="hover:shadow-lg transition-all duration-300 border-orange-100 hover:border-orange-200 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Rank Sponsor Income</CardTitle>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-r from-purple-400 to-purple-600 shadow-lg">
                      <Crown className="w-4 h-4 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-gray-900 mb-1">${incomeStats.rank_sponsor_income.toFixed(2)}</div>
                    <p className="text-xs text-gray-500 mb-2">$1-4 bonuses for referral rank achievements</p>
                    <div className="flex items-center text-xs text-gray-600">
                      <Activity className="w-3 h-3 mr-1" />
                      Rank advancement bonuses
                    </div>
                  </CardContent>
                </Card>

                {/* Global Turnover Income */}
                <Card className="hover:shadow-lg transition-all duration-300 border-orange-100 hover:border-orange-200 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Global Turnover Income</CardTitle>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-r from-teal-400 to-teal-600 shadow-lg">
                      <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-gray-900 mb-1">${incomeStats.global_turnover_income.toFixed(2)}</div>
                    <p className="text-xs text-gray-500 mb-2">1-2% of daily company turnover for 21 days</p>
                    <div className="flex items-center text-xs text-gray-600">
                      <Activity className="w-3 h-3 mr-1" />
                      Company-wide sharing
                    </div>
                  </CardContent>
                </Card>

                {/* Team Rewards */}
                <Card className="hover:shadow-lg transition-all duration-300 border-orange-100 hover:border-orange-200 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Team Rewards</CardTitle>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-r from-pink-400 to-pink-600 shadow-lg">
                      <Gift className="w-4 h-4 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-gray-900 mb-1">${incomeStats.team_rewards.toFixed(2)}</div>
                    <p className="text-xs text-gray-500 mb-2">$10-$5,000 based on total team size</p>
                    <div className="flex items-center text-xs text-gray-600">
                      <Activity className="w-3 h-3 mr-1" />
                      Team milestone rewards
                    </div>
                  </CardContent>
                </Card>

                {/* Recycle Income */}
                <Card className="hover:shadow-lg transition-all duration-300 border-orange-100 hover:border-orange-200 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Recycle Income</CardTitle>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-r from-amber-400 to-amber-600 shadow-lg">
                      <RefreshCw className="w-4 h-4 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-gray-900 mb-1">${incomeStats.recycle_income.toFixed(2)}</div>
                    <p className="text-xs text-gray-500 mb-2">Increasing bonuses for cycle completions</p>
                    <div className="flex items-center text-xs text-gray-600">
                      <Activity className="w-3 h-3 mr-1" />
                      Account reactivation bonuses
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-blue-600" />
                    Income Transactions
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search transactions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64 bg-white border-orange-200 focus:border-orange-400"
                      />
                    </div>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="px-3 py-2 border border-orange-200 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    >
                      <option value="all">All Types</option>
                      <option value="direct_referral">Direct Referral</option>
                      <option value="level_income">Level Income</option>
                      <option value="rank_sponsor_income">Rank Sponsor</option>
                      <option value="activation_bonus">Activation Bonus</option>
                      <option value="reactivation_bonus">Reactivation Bonus</option>
                    </select>
                    <select
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value)}
                      className="px-3 py-2 border border-orange-200 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                      <option value="year">This Year</option>
                    </select>
                  </div>
                </div>
                <CardDescription>
                  Complete history of all your income transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Loading transactions...</p>
                  </div>
                ) : filteredBonuses.length === 0 ? (
                  <div className="text-center py-8">
                    <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No transactions found</h3>
                    <p className="text-gray-600">
                      {searchTerm || filterType !== 'all' || dateRange !== 'all' 
                        ? 'Try adjusting your search or filters'
                        : 'Start referring people to earn your first income!'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredBonuses.map((bonus) => {
                      const IncomeIcon = getIncomeTypeIcon(bonus.bonus_type);
                      const colorClass = getIncomeTypeColor(bonus.bonus_type);
                      
                      return (
                        <div key={bonus.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-r ${colorClass} shadow-sm`}>
                                <IncomeIcon className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">{getIncomeTypeName(bonus.bonus_type)}</h3>
                                <p className="text-sm text-gray-600">{bonus.description}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-green-600">+${bonus.amount.toFixed(2)}</div>
                              <div className="text-xs text-gray-500">
                                {new Date(bonus.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          
                          {bonus.referred_user && (
                            <div className="flex items-center justify-between text-sm text-gray-600 mt-2 pt-2 border-t border-gray-100">
                              <div className="flex items-center space-x-2">
                                <span>From:</span>
                                <span className="font-medium">{bonus.referred_user.username}</span>
                                <Badge className="bg-blue-100 text-blue-700 text-xs">
                                  {bonus.referred_user.rank}
                                </Badge>
                              </div>
                              {bonus.level > 1 && (
                                <div className="flex items-center space-x-1">
                                  <span>Level {bonus.level}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Referrals Tab */}
          <TabsContent value="referrals" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2 text-emerald-600" />
                    My Direct Referrals
                  </CardTitle>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search referrals..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64 bg-white border-orange-200 focus:border-orange-400"
                    />
                  </div>
                </div>
                <CardDescription>
                  People you've directly referred to the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Loading referrals...</p>
                  </div>
                ) : filteredReferrals.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No referrals found</h3>
                    <p className="text-gray-600 mb-4">
                      {searchTerm 
                        ? 'No referrals match your search'
                        : 'Start sharing your referral link to earn income!'
                      }
                    </p>
                    {!searchTerm && profile && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 max-w-md mx-auto">
                        <p className="text-sm text-orange-800 mb-2">Your referral code:</p>
                        <div className="flex items-center justify-center space-x-2">
                          <code className="bg-orange-100 px-3 py-1 rounded text-orange-900 font-mono">
                            {profile.referral_code}
                          </code>
                          <Button
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(profile.referral_code);
                              setSuccess('Referral code copied!');
                              setTimeout(() => setSuccess(''), 2000);
                            }}
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                          >
                            Copy
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredReferrals.map((referral) => (
                      <div key={referral.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-sm">
                              <span className="text-white font-semibold text-sm">
                                {referral.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{referral.username}</h3>
                              <div className="flex items-center space-x-2">
                                <Badge className="bg-blue-100 text-blue-700 text-xs">
                                  {referral.rank}
                                </Badge>
                                <Badge className={
                                  referral.account_status === 'active' 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-yellow-100 text-yellow-700'
                                }>
                                  {referral.account_status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-600">
                              ${referral.total_earned_from.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">Total earned</div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Joined:</span> {new Date(referral.last_activity).toLocaleDateString()}
                          </div>
                          <div>
                            <span className="font-medium">Status:</span> {referral.account_status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                    Income Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {incomeStats ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Direct Referral</span>
                        <span className="font-semibold">${incomeStats.direct_referral_income.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Level Income</span>
                        <span className="font-semibold">${incomeStats.level_income.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Pool Income</span>
                        <span className="font-semibold">${incomeStats.pool_income.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Rank Sponsor</span>
                        <span className="font-semibold">${incomeStats.rank_sponsor_income.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Global Turnover</span>
                        <span className="font-semibold">${incomeStats.global_turnover_income.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Team Rewards</span>
                        <span className="font-semibold">${incomeStats.team_rewards.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Recycle Income</span>
                        <span className="font-semibold">${incomeStats.recycle_income.toFixed(2)}</span>
                      </div>
                      <hr className="border-gray-200" />
                      <div className="flex justify-between items-center font-bold text-lg">
                        <span>Total Income</span>
                        <span className="text-green-600">${incomeStats.total_income.toFixed(2)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-4" />
                      <p className="text-gray-600">Loading analytics...</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {incomeStats ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Average per Referral</span>
                        <span className="font-semibold">
                          ${incomeStats.total_referrals > 0 ? (incomeStats.total_income / incomeStats.total_referrals).toFixed(2) : '0.00'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Monthly Growth</span>
                        <span className={`font-semibold ${
                          incomeStats.this_month_income > incomeStats.last_month_income ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {incomeStats.last_month_income > 0 ? 
                            `${((incomeStats.this_month_income - incomeStats.last_month_income) / incomeStats.last_month_income * 100).toFixed(1)}%` :
                            'N/A'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Active Referral Rate</span>
                        <span className="font-semibold">
                          {incomeStats.total_referrals > 0 ? 
                            `${((incomeStats.active_referrals / incomeStats.total_referrals) * 100).toFixed(1)}%` :
                            '0%'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Best Income Stream</span>
                        <span className="font-semibold">
                          {Math.max(
                            incomeStats.direct_referral_income,
                            incomeStats.level_income,
                            incomeStats.pool_income,
                            incomeStats.rank_sponsor_income,
                            incomeStats.global_turnover_income,
                            incomeStats.team_rewards,
                            incomeStats.recycle_income
                          ) === incomeStats.direct_referral_income ? 'Direct Referral' :
                          Math.max(
                            incomeStats.direct_referral_income,
                            incomeStats.level_income,
                            incomeStats.pool_income,
                            incomeStats.rank_sponsor_income,
                            incomeStats.global_turnover_income,
                            incomeStats.team_rewards,
                            incomeStats.recycle_income
                          ) === incomeStats.level_income ? 'Level Income' :
                          Math.max(
                            incomeStats.direct_referral_income,
                            incomeStats.level_income,
                            incomeStats.pool_income,
                            incomeStats.rank_sponsor_income,
                            incomeStats.global_turnover_income,
                            incomeStats.team_rewards,
                            incomeStats.recycle_income
                          ) === incomeStats.pool_income ? 'Pool Income' :
                          'Other'
                          }
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-4" />
                      <p className="text-gray-600">Loading metrics...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Information Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-900">
              <DollarSign className="w-5 h-5 mr-2" />
              Income Stream Information
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 text-sm space-y-2">
            <p>• <strong>Direct Referral:</strong> Earn $5 instantly for each person you directly refer</p>
            <p>• <strong>Level Income:</strong> Earn $0.5 from activations/reactivations in your 7-level downline</p>
            <p>• <strong>Pool Income:</strong> Complete pools within time limits to earn $5-$27 rewards</p>
            <p>• <strong>Rank Sponsor:</strong> Earn $1-$4 when your direct referrals achieve new ranks</p>
            <p>• <strong>Global Turnover:</strong> Share 1-2% of daily company turnover for 21 days (requires 5+ referrals)</p>
            <p>• <strong>Team Rewards:</strong> One-time bonuses of $10-$5,000 based on total team size</p>
            <p>• <strong>Recycle Income:</strong> Increasing bonuses each time you complete the 4-pool cycle</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}