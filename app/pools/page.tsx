"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  Target, 
  Timer, 
  Star, 
  Crown, 
  Award, 
  Gift,
  CheckCircle,
  AlertCircle,
  Clock,
  Users,
  TrendingUp,
  Zap,
  RefreshCw,
  Loader2,
  Calendar,
  DollarSign,
  Activity,
  Shield,
  Layers
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface PoolProgress {
  id: string;
  pool_number: number;
  pool_amount: number;
  time_limit_minutes: number;
  rank_requirement: string;
  direct_referral_requirement: number;
  started_at: string;
  timer_end: string;
  completed_at?: string;
  status: 'active' | 'completed' | 'expired' | 'failed' | 'expired_needs_referrals';
  reward_paid: number;
}

interface PoolStats {
  total_pools_completed: number;
  total_rewards_earned: number;
  current_pool: number;
  pools_failed: number;
  average_completion_time: number;
}

export default function PoolsPage() {
  const [mounted, setMounted] = useState(false);
  const [poolHistory, setPoolHistory] = useState<PoolProgress[]>([]);
  const [currentPool, setCurrentPool] = useState<PoolProgress | null>(null);
  const [poolStats, setPoolStats] = useState<PoolStats | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showReferralCta, setShowReferralCta] = useState(false);
  const [timeRemainingText, setTimeRemainingText] = useState('');
  const [progressPercentage, setProgressPercentage] = useState(0);
  
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && !user) {
      router.push('/login');
    } else if (mounted && !authLoading && user && profile) {
      loadPoolData();
    }
  }, [user, profile, authLoading, mounted, router]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (currentPool && currentPool.status === 'active') {
      interval = setInterval(() => {
        const now = new Date().getTime();
        const end = new Date(currentPool.timer_end).getTime();
        const remaining = Math.max(0, end - now);
        setTimeRemaining(remaining);
        
        // Format time remaining as text
        const totalSeconds = Math.floor(remaining / 1000);
        const days = Math.floor(totalSeconds / (24 * 3600));
        const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        let formattedTime = '';
        if (days > 0) {
          formattedTime = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        } else if (hours > 0) {
          formattedTime = `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
          formattedTime = `${minutes}m ${seconds}s`;
        } else {
          formattedTime = `${seconds}s`;
        }
        
        setTimeRemainingText(formattedTime);
        
        // Calculate progress percentage
        const totalTime = currentPool.time_limit_minutes * 60 * 1000;
        const timeElapsed = totalTime - remaining;
        const progress = (timeElapsed / totalTime) * 100;
        setProgressPercentage(Math.min(100, Math.max(0, progress)));
        
        // Check if pool timer expired
        if (remaining === 0) {
          checkPoolProgression();
        }
        
        // Check if we should show referral CTA
        // Show referral CTA if pool is active, time is running out (less than 50% remaining),
        // and user doesn't have enough referrals
        const percentElapsed = (timeElapsed / totalTime) * 100;
        
        if (
          percentElapsed > 50 && 
          (profile?.active_direct_referrals || 0) < currentPool.direct_referral_requirement
        ) {
          setShowReferralCta(true);
        } else {
          setShowReferralCta(false);
        }
      }, 1000);
    } else {
      // Check if there's a failed or expired pool
      const failedPool = poolHistory?.find(p => p.status === 'failed' || p.status === 'expired' || p.status === 'expired_needs_referrals');
      if (failedPool) {
        setShowReferralCta(true);
      }
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentPool, profile?.active_direct_referrals, poolHistory]);

  const loadPoolData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Load pool history
      const { data: history, error: historyError } = await supabase
        .from('pool_progress')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (historyError) {
        throw new Error(`Failed to load pool history: ${historyError.message}`);
      }

      setPoolHistory(history || []);

      // Find current active pool
      const activePool = history?.find(p => p.status === 'active');
      if (activePool) {
        setCurrentPool(activePool);
        
        // Calculate time remaining
        const now = new Date().getTime();
        const end = new Date(activePool.timer_end).getTime();
        const remaining = Math.max(0, end - now);
        setTimeRemaining(remaining);
        
        // Calculate progress percentage
        const totalTime = activePool.time_limit_minutes * 60 * 1000;
        const timeElapsed = totalTime - remaining;
        const progress = (timeElapsed / totalTime) * 100;
        setProgressPercentage(Math.min(100, Math.max(0, progress)));
      }

      // Calculate stats
      if (history && history.length > 0) {
        const completed = history.filter(p => p.status === 'completed');
        const failed = history.filter(p => p.status === 'failed' || p.status === 'expired' || p.status === 'expired_needs_referrals');
        const totalRewards = completed.reduce((sum, p) => sum + p.reward_paid, 0);
        
        setPoolStats({
          total_pools_completed: completed.length,
          total_rewards_earned: totalRewards,
          current_pool: profile?.current_pool || 0,
          pools_failed: failed.length,
          average_completion_time: 0 // Would need more complex calculation
        });
      }

      // Check for expired or failed pools to show referral CTA
      const needsReferrals = history?.some(p => 
        p.status === 'expired' || 
        p.status === 'failed' || 
        p.status === 'expired_needs_referrals'
      );
      
      if (needsReferrals) {
        setShowReferralCta(true);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const checkPoolProgression = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('check_pool_progression', {
        user_id_param: user.id
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        if (data.pool_completed) {
          if (data.cycle_completed) {
            setSuccess(`🎉 Congratulations! You completed Pool 4 and earned $27! Your cycle is complete and account is now inactive.`);
          } else {
            setSuccess(`🎉 Pool ${data.pool_completed} completed! You earned your reward!`);
          }
        } else if (data.pool_expired) {
          setError(`Pool ${data.pool_expired} expired: ${data.reason}`);
          setShowReferralCta(true);
        }
        
        // Reload data
        setTimeout(() => {
          loadPoolData();
        }, 1000);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetExpiredPool = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('reset_expired_pool', {
        user_id_param: user.id
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data.success) {
        setSuccess(`Pool reset with a new timer! You have until ${new Date(data.new_timer_end).toLocaleString()} to get ${data.required_referrals} active referrals.`);
        loadPoolData();
      } else {
        setError(data.message || 'Failed to reset pool');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getPoolIcon = (poolNumber: number) => {
    switch (poolNumber) {
      case 1: return Star;
      case 2: return Target;
      case 3: return Crown;
      case 4: return Award;
      default: return Gift;
    }
  };

  const getPoolGradient = (poolNumber: number) => {
    switch (poolNumber) {
      case 1: return 'bg-gradient-to-r from-teal-50 to-orange-50 dark:from-teal-900/20 dark:to-orange-900/20 text-teal-700 dark:text-teal-300 border-r-2 border-teal-500';
      case 2: return 'from-blue-400 via-blue-500 to-blue-600';
      case 3: return 'from-purple-400 via-purple-500 to-purple-600';
      case 4: return 'from-amber-400 via-amber-500 to-amber-600';
      default: return 'from-gray-400 via-gray-500 to-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Timer className="w-4 h-4 text-blue-500" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'expired': 
      case 'expired_needs_referrals': 
        return <Clock className="w-4 h-4 text-red-500" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'expired':
      case 'expired_needs_referrals':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getPoolRequirements = (poolNumber: number) => {
    switch (poolNumber) {
      case 1: return { timeLimit: '30 minutes', requirement: 'Account activation (1 referral to exit)', rank: 'Starter', referrals: 1 }; // Updated: 1 referral to exit
      case 2: return { timeLimit: '24 hours', requirement: '2 active direct referrals', rank: 'Gold', referrals: 2 }; // Updated: 2 referrals
      case 3: return { timeLimit: '5 days', requirement: '3 active direct referrals', rank: 'Platinum', referrals: 3 }; // Updated: 3 referrals
      case 4: return { timeLimit: '15 days', requirement: '4 active direct referrals', rank: 'Diamond', referrals: 4 }; // Updated: 4 referrals
      default: return { timeLimit: 'N/A', requirement: 'N/A', rank: 'N/A', referrals: 0 };
    }
  };

  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-400 dark:text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 dark:text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">Please log in to access the pools system</p>
          <Button onClick={() => router.push('/login')}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm border-b border-orange-100 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/dashboard')}
                className="text-gray-600 hover:text-orange-600 hover:bg-orange-50 dark:text-gray-300 dark:hover:text-orange-400 dark:hover:bg-gray-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Pool System</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Track your progress through the 4-pool system</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={loadPoolData}
                variant="outline"
                size="sm"
                disabled={isLoading}
                className="border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-900/30 dark:text-blue-300"
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
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700 dark:text-red-300">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError('')}
                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-0 h-auto mt-1"
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start space-x-2">
            <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-green-700 dark:text-green-300">{success}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSuccess('')}
                className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 p-0 h-auto mt-1"
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {/* Referral CTA - Show when pool is expired or about to expire without enough referrals */}
        {showReferralCta && (
          <Card className="bg-gradient-to-r from-amber-400 to-orange-500 dark:from-amber-900 dark:to-orange-900 text-white border-0 shadow-xl animate-pulse">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="mb-4 md:mb-0">
                  <h3 className="text-xl font-bold text-white mb-2">
                    {currentPool?.status === 'active' 
                      ? 'Time is running out!'
                      : 'Pool expired! Need more referrals'}
                  </h3>
                  <p className="text-white/90 mb-2">
                    {currentPool?.status === 'active'
                      ? `You need ${currentPool.direct_referral_requirement - (profile.active_direct_referrals || 0)} more active referrals to complete this pool`
                      : 'Invite more users to complete your next pool successfully'}
                  </p>
                  <div className="flex items-center space-x-2 text-white/90">
                    <Users className="w-4 h-4" />
                    <span>Current active referrals: {profile.active_direct_referrals || 0}</span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/register?ref=${profile.referral_code}`);
                      setSuccess('Referral link copied to clipboard!');
                    }}
                    size="lg"
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30 shadow-lg"
                  >
                    <Users className="w-5 h-5 mr-2" />
                    Copy Referral Link
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pool Statistics */}
        {poolStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-orange-100 dark:border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Pools Completed</CardTitle>
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{poolStats.total_pools_completed}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Successfully finished</p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-orange-100 dark:border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Rewards</CardTitle>
                <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">${poolStats.total_rewards_earned.toFixed(2)}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Earned from pools</p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-orange-100 dark:border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Pool</CardTitle>
                <Target className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profile.account_status === 'active' ? `Pool ${poolStats.current_pool}` : 'None'}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {profile.account_status === 'active' ? 'Currently active' : 'Activate account'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-orange-100 dark:border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Failed Pools</CardTitle>
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{poolStats.pools_failed}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Expired or failed</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Current Active Pool */}
        {currentPool && (
          <Card className={`bg-gradient-to-r ${getPoolGradient(currentPool.pool_number)} text-white border-0 shadow-xl`}>
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Timer className="w-5 h-5 mr-2" />
                Pool {currentPool.pool_number} - Active
              </CardTitle>
              <CardDescription className="text-white/90">
                Complete within the time limit to earn your reward
              </CardDescription>
            </CardHeader>
            <CardContent className="text-white/90">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white mb-2">
                    ${currentPool.pool_amount}
                  </div>
                  <p className="text-white/80">Reward Amount</p>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-white mb-2 animate-pulse">
                    {timeRemainingText || 'Calculating...'}
                  </div>
                  <p className="text-white/80">Time Remaining</p>
                  <Progress 
                    value={100 - progressPercentage} 
                    className="mt-2 bg-white/20"
                  />
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-white mb-2">
                    {profile.active_direct_referrals || 0}
                  </div>
                  <p className="text-white/80">Active Referrals</p>
                  <p className="text-xs text-white/70 mt-1">
                    Need: {currentPool.direct_referral_requirement}
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-white mb-2">
                    {(profile.active_direct_referrals || 0) >= currentPool.direct_referral_requirement ? '✓' : '✗'}
                  </div>
                  <p className="text-white/80">Requirements</p>
                  <Badge className={`mt-1 ${
                    (profile.active_direct_referrals || 0) >= currentPool.direct_referral_requirement 
                      ? 'bg-green-500/20 text-green-100' 
                      : 'bg-red-500/20 text-red-100'
                  }`}>
                    {(profile.active_direct_referrals || 0) >= currentPool.direct_referral_requirement ? 'Met' : 'Not Met'}
                  </Badge>
                </div>
              </div>
              
              <div className="mt-6 flex justify-center space-x-4">
                <Button
                  onClick={checkPoolProgression}
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/20"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Check Progress
                </Button>
                
                {profile.account_status !== 'active' && (
                  <Button
                    onClick={() => router.push('/activate')}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Activate Account
                  </Button>
                )}
                
                {/* Referral button when requirements not met */}
                {currentPool.status === 'active' && 
                 (profile.active_direct_referrals || 0) < currentPool.direct_referral_requirement && (
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/register?ref=${profile.referral_code}`);
                      setSuccess('Referral link copied to clipboard!');
                    }}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Copy Referral Link
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Expired Pool that needs referrals */}
        {poolHistory.some(p => p.status === 'expired_needs_referrals') && (
          <Card className="bg-gradient-to-r from-amber-500 to-red-500 dark:from-amber-900 dark:to-red-900 text-white border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <AlertCircle className="w-5 h-5 mr-2" />
                Pool Expired - Need More Referrals
              </CardTitle>
              <CardDescription className="text-white/90">
                Your pool expired before you had enough referrals
              </CardDescription>
            </CardHeader>
            <CardContent className="text-white/90">
              <div className="space-y-4">
                <p>
                  You can reset the timer and try again to get more active referrals.
                  This will give you another chance to complete the pool.
                </p>
                
                <Button
                  onClick={resetExpiredPool}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset Pool Timer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pool System Overview */}
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-orange-100 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" />
              Pool System Overview
            </CardTitle>
            <CardDescription className="dark:text-gray-400">
              Complete pools in sequence to earn rewards and advance your rank
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((poolNumber) => {
                const PoolIcon = getPoolIcon(poolNumber);
                const requirements = getPoolRequirements(poolNumber);
                const isActive = profile.account_status === 'active' && profile.current_pool === poolNumber;
                const isCompleted = profile.account_status === 'active' && profile.current_pool > poolNumber;
                const poolAmount = poolNumber === 1 ? 5 : poolNumber === 2 ? 10 : poolNumber === 3 ? 15 : 27; // Updated Pool 4 to $27
                const canAccess = profile.account_status === 'active' && (profile.active_direct_referrals || 0) >= requirements.referrals;
                
                return (
                  <Card 
                    key={poolNumber} 
                    className={`border-2 transition-all duration-300 ${
                      isActive ? `border-transparent bg-gradient-to-br ${getPoolGradient(poolNumber)} text-white shadow-lg dark:border-transparent` :
                      isCompleted ? 'border-green-400 bg-green-50 dark:border-green-700 dark:bg-green-900/20' :
                      canAccess ? 'border-blue-400 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20' :
                      'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isActive ? 'bg-white/20' :
                            isCompleted ? 'bg-green-500 dark:bg-green-600' :
                            canAccess ? 'bg-blue-500 dark:bg-blue-600' :
                            'bg-gray-400 dark:bg-gray-600'
                          }`}>
                            <PoolIcon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-white'}`} />
                          </div>
                          <div>
                            <h3 className={`font-semibold ${isActive ? 'text-white' : 'text-gray-900 dark:text-white'}`}>Pool {poolNumber}</h3>
                            <Badge className={`text-xs ${
                              isActive ? 'bg-white/20 text-white' :
                              isCompleted ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                              canAccess ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                              'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {requirements.rank}
                            </Badge>
                          </div>
                        </div>
                        {isActive && <Badge className="bg-white/20 text-white">Active</Badge>}
                        {isCompleted && <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Completed</Badge>}
                        {!isActive && !isCompleted && canAccess && <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">Available</Badge>}
                        {!isActive && !isCompleted && !canAccess && <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">Locked</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${isActive ? 'text-white' : 'text-gray-900 dark:text-white'}`}>${poolAmount}</div>
                        <p className={`text-xs ${isActive ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>Reward</p>
                      </div>
                      
                      <div className={`space-y-1 text-xs ${isActive ? 'text-white/90' : 'text-gray-600 dark:text-gray-400'}`}>
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {requirements.timeLimit}
                        </div>
                        <div className="flex items-center">
                          <Users className="w-3 h-3 mr-1" />
                          {poolNumber === 1 ? '0 to enter, 1 to exit' : `${requirements.referrals} referrals required`}
                        </div>
                        <div className="flex items-center">
                          <Shield className="w-3 h-3 mr-1" />
                          {poolNumber === 1 ? 'Account activation' : requirements.requirement}
                        </div>
                      </div>

                      {!canAccess && !isCompleted && poolNumber > 1 && (
                        <div className="text-center">
                          <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                            Need {requirements.referrals - (profile.active_direct_referrals || 0)} more referrals
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Pool History */}
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-orange-100 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
              Pool History
            </CardTitle>
            <CardDescription className="dark:text-gray-400">
              Your complete pool participation history
            </CardDescription>
          </CardHeader>
          <CardContent>
            {poolHistory.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No pool history yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Activate your account to start participating in pools</p>
                {profile.account_status !== 'active' && (
                  <Button
                    onClick={() => router.push('/activate')}
                    className="bg-gradient-to-r from-orange-400 to-teal-500 hover:from-orange-500 hover:to-teal-600 text-white"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Activate Account
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {poolHistory.map((pool) => {
                  const PoolIcon = getPoolIcon(pool.pool_number);
                  
                  return (
                    <div key={pool.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 bg-gradient-to-r ${getPoolGradient(pool.pool_number)} rounded-lg flex items-center justify-center`}>
                            <PoolIcon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">Pool {pool.pool_number}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">${pool.pool_amount} reward</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(pool.status)}
                          <Badge className={getStatusColor(pool.status)}>
                            {pool.status === 'expired_needs_referrals' ? 'Needs Referrals' : pool.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div>
                          <span className="font-medium">Started:</span>
                          <p>{new Date(pool.started_at).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <span className="font-medium">Timer End:</span>
                          <p>{new Date(pool.timer_end).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <span className="font-medium">Time Limit:</span>
                          <p>{pool.time_limit_minutes} minutes</p>
                        </div>
                        <div>
                          <span className="font-medium">Reward Paid:</span>
                          <p className={pool.reward_paid > 0 ? 'text-green-600 dark:text-green-400 font-semibold' : ''}>
                            ${pool.reward_paid.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      
                      {pool.completed_at && (
                        <div className="mt-2 text-sm text-green-600 dark:text-green-400">
                          ✅ Completed on {new Date(pool.completed_at).toLocaleString()}
                        </div>
                      )}
                      
                      {/* Show referral CTA for expired/failed pools */}
                      {(pool.status === 'expired' || pool.status === 'failed' || pool.status === 'expired_needs_referrals') && (
                        <div className="mt-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                          <p className="text-sm text-amber-800 dark:text-amber-300 mb-2">
                            <AlertCircle className="w-4 h-4 inline-block mr-1" />
                            This pool {pool.status === 'expired' || pool.status === 'expired_needs_referrals' ? 'expired' : 'failed'} because you didn't have enough active referrals.
                          </p>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/register?ref=${profile.referral_code}`);
                                setSuccess('Referral link copied to clipboard!');
                              }}
                              className="bg-amber-500 hover:bg-amber-600 dark:bg-amber-700 dark:hover:bg-amber-800 text-white"
                            >
                              <Users className="w-3 h-3 mr-1" />
                              Copy Referral Link
                            </Button>
                            
                            {pool.status === 'expired_needs_referrals' && (
                              <Button
                                size="sm"
                                onClick={resetExpiredPool}
                                className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-700 dark:hover:bg-blue-800 text-white"
                              >
                                <RefreshCw className="w-3 h-3 mr-1" />
                                Reset Pool Timer
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-900 dark:text-blue-300">
              <TrendingUp className="w-5 h-5 mr-2" />
              Updated Pool System Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 dark:text-blue-300 text-sm space-y-2">
            <p>• <strong>Pool 1:</strong> Entry requires account activation only. Need 1 active referral to EXIT to Pool 2 (30 min, $5 reward)</p>
            <p>• <strong>Pool 2:</strong> Requires 2 active direct referrals (24 hours, $10 reward)</p>
            <p>• <strong>Pool 3:</strong> Requires 3 active direct referrals (5 days, $15 reward)</p>
            <p>• <strong>Pool 4:</strong> Requires 4 active direct referrals (15 days, $27 reward) - <strong>CYCLE COMPLETION</strong></p>
            <p>• <strong>Requirements:</strong> Must meet referral requirements before timer expires</p>
            <p>• <strong>Progression:</strong> Complete pools in sequence to advance</p>
            <p>• <strong>Rewards:</strong> Paid immediately upon successful completion</p>
            <p>• <strong>Cycle Completion:</strong> After Pool 4, account becomes inactive and requires reactivation</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}