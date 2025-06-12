"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  DollarSign, 
  Target, 
  Crown, 
  TrendingUp, 
  Gift, 
  RefreshCw,
  Wallet,
  Shield,
  Clock,
  Star,
  CheckCircle,
  Zap,
  Award,
  BarChart3,
  Activity,
  Sparkles,
  ChevronRight,
  Play,
  Globe,
  Layers,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
  Calendar,
  Timer,
  Copy
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';

interface DashboardStats {
  totalEarnings: number;
  directReferrals: number;
  activeReferrals: number;
  currentPool: number;
  poolTimeRemaining: string;
  nextPoolReward: number;
  teamSize: number;
  rank: string;
  accountStatus: string;
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showBalances, setShowBalances] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [poolProgress, setPoolProgress] = useState<number>(0);
  
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && !user) {
      router.push('/login');
    } else if (mounted && !authLoading && user && profile) {
      loadDashboardStats();
    }
  }, [user, profile, authLoading, mounted, router]);

  const loadDashboardStats = async () => {
    if (!user || !profile) return;

    setIsLoading(true);
    try {
      // Calculate total earnings from referral bonuses
      const { data: bonuses } = await supabase
        .from('referral_bonuses')
        .select('amount')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      const totalEarnings = bonuses?.reduce((sum, bonus) => sum + bonus.amount, 0) || 0;

      // Get team size (simplified - direct referrals only)
      const { data: team } = await supabase
        .from('profiles')
        .select('id')
        .eq('referred_by', profile.referral_code);

      const teamSize = team?.length || 0;

      // Get current pool info - using maybeSingle() to handle zero results
      const { data: currentPoolData } = await supabase
        .from('pool_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      let poolTimeRemaining = 'No active pool';
      let nextPoolReward = 0;

      if (currentPoolData) {
        const endTime = new Date(currentPoolData.timer_end);
        const now = new Date();
        const timeDiff = endTime.getTime() - now.getTime();
        
        if (timeDiff > 0) {
          const totalSeconds = Math.floor(timeDiff / 1000);
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const seconds = totalSeconds % 60;
          poolTimeRemaining = `${hours}h ${minutes}m ${seconds}s`;
          
          // Calculate progress percentage (time elapsed)
          const totalTime = currentPoolData.time_limit_minutes * 60 * 1000;
          const timeElapsed = totalTime - timeDiff;
          const progressPercentage = (timeElapsed / totalTime) * 100;
          setPoolProgress(100 - progressPercentage); // Invert to show time remaining
        } else {
          poolTimeRemaining = 'Expired';
          setPoolProgress(0);
        }
        
        nextPoolReward = currentPoolData.pool_amount;
      }

      setStats({
        totalEarnings,
        directReferrals: profile.total_direct_referrals || 0,
        activeReferrals: profile.active_direct_referrals || 0,
        currentPool: profile.current_pool || 0,
        poolTimeRemaining,
        nextPoolReward,
        teamSize,
        rank: profile.rank,
        accountStatus: profile.account_status
      });

    } catch (err: any) {
      setError(`Failed to load dashboard data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateAccount = () => {
    router.push('/activate');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: true,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRankIcon = (rank: string) => {
    switch (rank) {
      case 'Starter': return Users;
      case 'Gold': return Star;
      case 'Platinum': return Award;
      case 'Diamond': return Sparkles;
      case 'Ambassador': return Crown;
      default: return Users;
    }
  };

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'Starter': return 'from-gray-400 to-gray-600';
      case 'Gold': return 'from-yellow-400 to-yellow-600';
      case 'Platinum': return 'from-gray-300 to-gray-500';
      case 'Diamond': return 'from-blue-400 to-blue-600';
      case 'Ambassador': return 'from-purple-400 to-purple-600';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  if (!mounted || authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">Please log in to access the dashboard</p>
          <Button onClick={() => router.push('/login')}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-0 space-y-6">
      {/* Announcement Banner */}
      <AnnouncementBanner />
      
      <div className="p-4 sm:p-6">
        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-2 mb-6">
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

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-2 mb-6">
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

        {/* Welcome Section with Time - Updated with lighter colors */}
        <Card className="bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200 shadow-sm mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="mb-4 sm:mb-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
                  Welcome back, {profile.username}! 👋
                </h1>
                <p className="text-slate-600">
                  Ready to grow your network and earn rewards today?
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-slate-800">
                  {formatTime(currentTime)}
                </div>
                <div className="text-sm text-slate-600">
                  {formatDate(currentTime)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Activation Alert */}
        {profile.account_status === 'inactive' && (
          <Card className="bg-gradient-to-r from-orange-400 to-red-500 text-white border-0 shadow-xl mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">Activate Your Account</h3>
                    <p className="text-white/90">
                      Activate your account for $21 to start earning and access all features
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleActivateAccount}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Activate Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Total Earnings</p>
                  <p className="text-lg font-bold text-green-600">
                    {showBalances ? `$${stats?.totalEarnings?.toFixed(2) || '0.00'}` : '••••'}
                  </p>
                </div>
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Direct Referrals</p>
                  <div className="flex items-center">
                    <p className="text-lg font-bold text-blue-600 mr-2">
                      {stats?.directReferrals || 0}
                    </p>
                    <Badge className="bg-blue-100 text-blue-700 text-xs">
                      {stats?.activeReferrals || 0} active
                    </Badge>
                  </div>
                </div>
                <Users className="w-5 h-5 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Current Pool</p>
                  <div className="flex items-center">
                    <p className="text-lg font-bold text-purple-600 mr-2">
                      {stats?.currentPool ? `Pool ${stats.currentPool}` : 'None'}
                    </p>
                    {stats?.poolTimeRemaining !== 'No active pool' && stats?.poolTimeRemaining !== 'Expired' && (
                      <Badge className="bg-purple-100 text-purple-700 text-xs animate-pulse">
                        <Clock className="w-3 h-3 mr-1" />
                        {stats?.poolTimeRemaining}
                      </Badge>
                    )}
                  </div>
                </div>
                <Target className="w-5 h-5 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Current Rank</p>
                  <div className="flex items-center space-x-1">
                    {(() => {
                      const RankIcon = getRankIcon(stats?.rank || 'Starter');
                      return <RankIcon className="w-4 h-4 text-orange-500" />;
                    })()}
                    <p className="text-sm font-bold text-orange-600">
                      {stats?.rank || 'Starter'}
                    </p>
                  </div>
                </div>
                <Crown className="w-5 h-5 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Wallet Balances */}
          <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">Wallet Balances</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBalances(!showBalances)}
              >
                {showBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-green-900">Main Wallet</h3>
                    <p className="text-green-700 text-sm">Earnings & Withdrawals</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-900">
                      {showBalances ? `$${profile.main_wallet_balance?.toFixed(2) || '0.00'}` : '••••'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-blue-900">Fund Wallet</h3>
                    <p className="text-blue-700 text-sm">Deposits & Activities</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-900">
                      {showBalances ? `$${profile.fund_wallet_balance?.toFixed(2) || '0.00'}` : '••••'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={() => router.push('/deposit')}
                  className="flex-1 bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white"
                >
                  <ArrowDownRight className="w-4 h-4 mr-2" />
                  Deposit
                </Button>
                <Button
                  onClick={() => router.push('/withdrawal')}
                  variant="outline"
                  className="flex-1 border-purple-200 hover:bg-purple-50 text-purple-700"
                >
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  Withdraw
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Current Pool Status */}
          <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center">
                <Target className="w-5 h-5 mr-2 text-purple-600" />
                Pool Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profile.account_status === 'active' && stats?.currentPool ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">Pool {stats.currentPool}</h3>
                      <p className="text-sm text-gray-600">
                        Reward: ${stats.nextPoolReward}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-orange-500" />
                      <span className="text-sm font-medium text-orange-600 animate-pulse">
                        {stats.poolTimeRemaining}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Direct Referrals</span>
                      <span className="font-medium text-gray-900">
                        {stats.activeReferrals} / {stats.currentPool}
                      </span>
                    </div>
                    <Progress 
                      value={(stats.activeReferrals / stats.currentPool) * 100} 
                      className="h-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Time Remaining</span>
                      <span className="font-medium text-gray-900">
                        {stats.poolTimeRemaining}
                      </span>
                    </div>
                    <Progress 
                      value={poolProgress} 
                      className="h-2 bg-orange-100"
                    />
                  </div>

                  <Button
                    onClick={() => router.push('/pools')}
                    variant="outline"
                    className="w-full border-purple-200 hover:bg-purple-50 text-purple-700"
                  >
                    <Target className="w-4 h-4 mr-2" />
                    View Pool Details
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Pool</h3>
                  <p className="text-gray-600 mb-4">
                    {profile.account_status === 'active' 
                      ? 'You need to complete your current cycle'
                      : 'Activate your account to start earning pool rewards'}
                  </p>
                  {profile.account_status !== 'active' && (
                    <Button
                      onClick={handleActivateAccount}
                      className="bg-gradient-to-r from-purple-400 to-purple-600 hover:from-purple-500 hover:to-purple-700 text-white"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Activate Account
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Referral Stats */}
          <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-600" />
                Referral Network
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-blue-700">
                      {stats?.directReferrals || 0}
                    </div>
                    <p className="text-sm text-blue-600">Direct Referrals</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-700">
                      {stats?.activeReferrals || 0}
                    </div>
                    <p className="text-sm text-green-600">Active Referrals</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-gray-700">
                    {stats?.teamSize || 0}
                  </div>
                  <p className="text-sm text-gray-600">Total Team Size</p>
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={() => router.push('/network')}
                    variant="outline"
                    className="flex-1 border-blue-200 hover:bg-blue-50 text-blue-700"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    View Network
                  </Button>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/register?ref=${profile.referral_code}`);
                      setSuccess('Referral link copied to clipboard!');
                    }}
                    className="flex-1 bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Rank */}
          <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center">
                <Crown className="w-5 h-5 mr-2 text-orange-600" />
                Current Rank
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 mb-4">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center bg-gradient-to-r ${getRankColor(stats?.rank || 'Starter')} shadow-lg`}>
                  {(() => {
                    const RankIcon = getRankIcon(stats?.rank || 'Starter');
                    return <RankIcon className="w-8 h-8 text-white" />;
                  })()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{stats?.rank || 'Starter'}</h3>
                  <p className="text-sm text-gray-600">
                    {stats?.rank === 'Starter' && 'Just getting started'}
                    {stats?.rank === 'Gold' && '1 direct referral'}
                    {stats?.rank === 'Platinum' && '2 direct referrals'}
                    {stats?.rank === 'Diamond' && '4 direct referrals'}
                    {stats?.rank === 'Ambassador' && '10 direct referrals & 50 team size'}
                  </p>
                </div>
              </div>

              <Button
                onClick={() => router.push('/ranks')}
                variant="outline"
                className="w-full border-orange-200 hover:bg-orange-50 text-orange-700"
              >
                <Crown className="w-4 h-4 mr-2" />
                View Rank Benefits
              </Button>
            </CardContent>
          </Card>

          {/* Income Streams */}
          <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                Income Streams
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Users className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-sm font-medium text-green-700">Direct Referral</span>
                  </div>
                  <span className="text-sm font-semibold text-green-700">$5</span>
                </div>
                
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-blue-700">Level Income</span>
                  </div>
                  <span className="text-sm font-semibold text-blue-700">$0.5</span>
                </div>
                
                <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Target className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="text-sm font-medium text-purple-700">Pool Income</span>
                  </div>
                  <span className="text-sm font-semibold text-purple-700">$5-$27</span>
                </div>

                <Button
                  onClick={() => router.push('/income')}
                  variant="outline"
                  className="w-full border-green-200 hover:bg-green-50 text-green-700"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  View All Income Streams
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center">
                <Zap className="w-5 h-5 mr-2 text-amber-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => router.push('/deposit')}
                  variant="outline"
                  className="h-auto py-3 border-blue-200 hover:bg-blue-50 text-blue-700"
                >
                  <ArrowDownRight className="w-4 h-4 mr-2" />
                  <div className="text-left">
                    <div className="font-medium">Deposit</div>
                    <div className="text-xs">Add funds</div>
                  </div>
                </Button>
                
                <Button
                  onClick={() => router.push('/withdrawal')}
                  variant="outline"
                  className="h-auto py-3 border-purple-200 hover:bg-purple-50 text-purple-700"
                >
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  <div className="text-left">
                    <div className="font-medium">Withdraw</div>
                    <div className="text-xs">Get earnings</div>
                  </div>
                </Button>
                
                <Button
                  onClick={() => router.push('/network')}
                  variant="outline"
                  className="h-auto py-3 border-green-200 hover:bg-green-50 text-green-700"
                >
                  <Users className="w-4 h-4 mr-2" />
                  <div className="text-left">
                    <div className="font-medium">Network</div>
                    <div className="text-xs">View team</div>
                  </div>
                </Button>
                
                <Button
                  onClick={() => router.push('/transactions')}
                  variant="outline"
                  className="h-auto py-3 border-orange-200 hover:bg-orange-50 text-orange-700"
                >
                  <Activity className="w-4 h-4 mr-2" />
                  <div className="text-left">
                    <div className="font-medium">History</div>
                    <div className="text-xs">Transactions</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activation CTA (if inactive) */}
        {profile.account_status === 'inactive' && (
          <Card className="bg-gradient-to-r from-orange-400 to-red-500 text-white border-0 shadow-xl mt-6">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="mb-4 md:mb-0">
                  <h3 className="text-xl font-bold text-white mb-2">Your Account is Inactive</h3>
                  <p className="text-white/90 mb-2">
                    Activate your account for $21 to start earning through all 7 income streams
                  </p>
                  <ul className="text-sm text-white/80 space-y-1">
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-white/90" />
                      Access to all income streams
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-white/90" />
                      Start earning from referrals
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-white/90" />
                      Enter the pool system
                    </li>
                  </ul>
                </div>
                <div className="flex-shrink-0">
                  <Button
                    onClick={handleActivateAccount}
                    size="lg"
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30 shadow-lg"
                  >
                    <Zap className="w-5 h-5 mr-2" />
                    Activate for $21
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}