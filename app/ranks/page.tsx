"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Crown, 
  Award, 
  Star, 
  Trophy, 
  Target, 
  Users, 
  Calendar, 
  Clock, 
  TrendingUp,
  Gift,
  Zap,
  CheckCircle,
  AlertCircle,
  Loader2,
  Timer,
  DollarSign,
  Activity,
  RefreshCw,
  Sparkles,
  Medal,
  Gem,
  Diamond,
  Flame
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface TeamReward {
  teamSize: number;
  fastTrack: {
    amount: number;
    timeLimit: number;
    claimed: boolean;
    eligible: boolean;
  };
  standard: {
    amount: number;
    timeLimit: number;
    claimed: boolean;
    eligible: boolean;
  };
  currentTeamSize: number;
  daysFromRegistration: number;
}

interface RankInfo {
  rank: string;
  icon: any;
  color: string;
  requirements: {
    directReferrals: number;
    teamSize?: number;
    poolsCompleted?: number;
  };
  benefits: string[];
  current: boolean;
  achieved: boolean;
  progress: number;
}

export default function RanksPage() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('ranks');
  const [teamRewards, setTeamRewards] = useState<TeamReward[]>([]);
  const [ranks, setRanks] = useState<RankInfo[]>([]);
  const [currentTeamSize, setCurrentTeamSize] = useState(0);
  const [daysFromRegistration, setDaysFromRegistration] = useState(0);
  const [claimedRewards, setClaimedRewards] = useState<Set<number>>(new Set());
  
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && !user) {
      router.push('/login');
    } else if (mounted && !authLoading && user && profile) {
      loadRanksAndRewards();
    }
  }, [user, profile, authLoading, mounted, router]);

  const loadRanksAndRewards = async () => {
    if (!user || !profile) return;

    setIsLoading(true);
    try {
      await Promise.all([
        loadTeamRewards(),
        loadRankProgress(),
        calculateTeamSize(),
        loadClaimedRewards()
      ]);
    } catch (err: any) {
      setError(`Failed to load ranks and rewards: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeamRewards = async () => {
    if (!user || !profile) return;

    try {
      // Calculate days from registration
      const registrationDate = new Date(profile.created_at);
      const daysSince = Math.floor((Date.now() - registrationDate.getTime()) / (24 * 60 * 60 * 1000));
      setDaysFromRegistration(daysSince);

      // Get current team size (simplified - direct referrals only for now)
      const { data: directReferrals } = await supabase
        .from('profiles')
        .select('id')
        .eq('referred_by', profile.referral_code);

      const teamSize = directReferrals?.length || 0;
      setCurrentTeamSize(teamSize);

      // Define team reward tiers
      const rewardTiers = [
        { teamSize: 25, fastTrack: { amount: 20, timeLimit: 10 }, standard: { amount: 10, timeLimit: 25 } },
        { teamSize: 50, fastTrack: { amount: 50, timeLimit: 10 }, standard: { amount: 20, timeLimit: 20 } },
        { teamSize: 100, fastTrack: { amount: 100, timeLimit: 15 }, standard: { amount: 40, timeLimit: 30 } },
        { teamSize: 250, fastTrack: { amount: 300, timeLimit: 25 }, standard: { amount: 120, timeLimit: 50 } },
        { teamSize: 500, fastTrack: { amount: 700, timeLimit: 40 }, standard: { amount: 300, timeLimit: 80 } },
        { teamSize: 1000, fastTrack: { amount: 1500, timeLimit: 60 }, standard: { amount: 600, timeLimit: 120 } },
        { teamSize: 2500, fastTrack: { amount: 5000, timeLimit: 90 }, standard: { amount: 2000, timeLimit: 180 } },
        { teamSize: 50000, fastTrack: { amount: 15000, timeLimit: 120 }, standard: { amount: 8000, timeLimit: 220 } },
        { teamSize: 100000, fastTrack: { amount: 35000, timeLimit: 150 }, standard: { amount: 18000, timeLimit: 400 } }
      ];

      const rewards: TeamReward[] = rewardTiers.map(tier => ({
        teamSize: tier.teamSize,
        fastTrack: {
          amount: tier.fastTrack.amount,
          timeLimit: tier.fastTrack.timeLimit,
          claimed: claimedRewards.has(tier.teamSize),
          eligible: teamSize >= tier.teamSize && daysSince <= tier.fastTrack.timeLimit && !claimedRewards.has(tier.teamSize)
        },
        standard: {
          amount: tier.standard.amount,
          timeLimit: tier.standard.timeLimit,
          claimed: claimedRewards.has(tier.teamSize),
          eligible: teamSize >= tier.teamSize && daysSince <= tier.standard.timeLimit && daysSince > tier.fastTrack.timeLimit && !claimedRewards.has(tier.teamSize)
        },
        currentTeamSize: teamSize,
        daysFromRegistration: daysSince
      }));

      setTeamRewards(rewards);
    } catch (err: any) {
      console.error('Error loading team rewards:', err);
    }
  };

  const loadRankProgress = async () => {
    if (!user || !profile) return;

    try {
      const directReferrals = profile.total_direct_referrals || 0;
      const activeReferrals = profile.active_direct_referrals || 0;

      const rankData: RankInfo[] = [
        {
          rank: 'Starter',
          icon: Users,
          color: 'from-gray-400 to-gray-600',
          requirements: { directReferrals: 0 },
          benefits: ['Access to Pool 1', 'Basic income streams', 'Platform access'],
          current: profile.rank === 'Starter',
          achieved: true,
          progress: 100
        },
        {
          rank: 'Gold',
          icon: Star,
          color: 'from-yellow-400 to-yellow-600',
          requirements: { directReferrals: 1, poolsCompleted: 1 },
          benefits: ['Access to Pool 2', 'Level income eligibility', 'Rank sponsor bonuses'],
          current: profile.rank === 'Gold',
          achieved: directReferrals >= 1,
          progress: Math.min(100, (directReferrals / 1) * 100)
        },
        {
          rank: 'Platinum',
          icon: Medal,
          color: 'from-gray-300 to-gray-500',
          requirements: { directReferrals: 2, poolsCompleted: 2 },
          benefits: ['Access to Pool 3', 'Enhanced level income', 'Team building bonuses'],
          current: profile.rank === 'Platinum',
          achieved: directReferrals >= 2,
          progress: Math.min(100, (directReferrals / 2) * 100)
        },
        {
          rank: 'Diamond',
          icon: Diamond,
          color: 'from-blue-400 to-blue-600',
          requirements: { directReferrals: 4, poolsCompleted: 4 },
          benefits: ['Access to Pool 4', 'Maximum pool rewards', 'Cycle completion eligibility'],
          current: profile.rank === 'Diamond',
          achieved: directReferrals >= 4,
          progress: Math.min(100, (directReferrals / 4) * 100)
        },
        {
          rank: 'Ambassador',
          icon: Crown,
          color: 'from-purple-400 to-purple-600',
          requirements: { directReferrals: 10, teamSize: 50 },
          benefits: ['Global turnover eligibility', 'Leadership bonuses', 'Special recognition'],
          current: profile.rank === 'Ambassador',
          achieved: directReferrals >= 10 && currentTeamSize >= 50,
          progress: Math.min(100, ((directReferrals / 10) + (currentTeamSize / 50)) * 50)
        }
      ];

      setRanks(rankData);
    } catch (err: any) {
      console.error('Error loading rank progress:', err);
    }
  };

  const calculateTeamSize = async () => {
    if (!user || !profile) return;

    try {
      // For now, using direct referrals as team size
      // In a full implementation, this would be recursive
      const { data: directReferrals } = await supabase
        .from('profiles')
        .select('id')
        .eq('referred_by', profile.referral_code);

      setCurrentTeamSize(directReferrals?.length || 0);
    } catch (err: any) {
      console.error('Error calculating team size:', err);
    }
  };

  const loadClaimedRewards = async () => {
    if (!user) return;

    try {
      const { data: claims } = await supabase
        .from('team_reward_claims')
        .select('team_size')
        .eq('user_id', user.id);

      const claimed = new Set(claims?.map(c => c.team_size) || []);
      setClaimedRewards(claimed);
    } catch (err: any) {
      console.error('Error loading claimed rewards:', err);
    }
  };

  const claimTeamReward = async (teamSize: number, rewardType: 'fast_track' | 'standard') => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('check_team_rewards', {
        user_id_param: user.id
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        setSuccess(`🎉 Congratulations! You earned a ${rewardType.replace('_', ' ')} team reward of $${data.amount}!`);
        await loadRanksAndRewards(); // Refresh data
      } else {
        setError(data.message || 'Failed to claim team reward');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    await loadRanksAndRewards();
    setSuccess('Data refreshed successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const getRankIcon = (rank: string) => {
    switch (rank) {
      case 'Starter': return Users;
      case 'Gold': return Star;
      case 'Platinum': return Medal;
      case 'Diamond': return Diamond;
      case 'Ambassador': return Crown;
      default: return Users;
    }
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
          <p className="text-gray-600 mb-4">Please log in to access ranks and rewards</p>
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
                <h1 className="text-xl font-bold text-gray-900">Ranks & Rewards</h1>
                <p className="text-sm text-gray-600">Track your progress and claim team rewards</p>
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

        {/* Current Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Current Rank</CardTitle>
              <Crown className="w-4 h-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{profile.rank}</div>
              <p className="text-xs text-gray-500 mt-1">Your current achievement level</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Team Size</CardTitle>
              <Users className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{currentTeamSize}</div>
              <p className="text-xs text-gray-500 mt-1">Total team members</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Days Active</CardTitle>
              <Calendar className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{daysFromRegistration}</div>
              <p className="text-xs text-gray-500 mt-1">Since registration</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Direct Referrals</CardTitle>
              <Target className="w-4 h-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{profile.total_direct_referrals || 0}</div>
              <p className="text-xs text-gray-500 mt-1">{profile.active_direct_referrals || 0} active</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ranks">Rank Progression</TabsTrigger>
            <TabsTrigger value="rewards">Team Rewards</TabsTrigger>
          </TabsList>

          {/* Rank Progression Tab */}
          <TabsContent value="ranks" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="w-5 h-5 mr-2 text-purple-600" />
                  Rank Progression System
                </CardTitle>
                <CardDescription>
                  Advance through ranks by building your network and completing pools
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {ranks.map((rank, index) => {
                    const RankIcon = rank.icon;
                    
                    return (
                      <div key={rank.rank} className={`border-2 rounded-lg p-6 transition-all duration-300 ${
                        rank.current ? `border-transparent bg-gradient-to-br ${rank.color} text-white shadow-lg` :
                        rank.achieved ? 'border-green-400 bg-green-50' :
                        'border-gray-200 bg-gray-50'
                      }`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-4">
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                              rank.current ? 'bg-white/20' :
                              rank.achieved ? 'bg-green-500' :
                              'bg-gray-400'
                            }`}>
                              <RankIcon className={`w-6 h-6 ${rank.current ? 'text-white' : 'text-white'}`} />
                            </div>
                            <div>
                              <h3 className={`text-xl font-bold ${rank.current ? 'text-white' : 'text-gray-900'}`}>
                                {rank.rank}
                              </h3>
                              <p className={`text-sm ${rank.current ? 'text-white/80' : 'text-gray-600'}`}>
                                {rank.requirements.directReferrals} direct referrals required
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {rank.current && <Badge className="bg-white/20 text-white">Current</Badge>}
                            {rank.achieved && !rank.current && <Badge className="bg-green-100 text-green-700">Achieved</Badge>}
                            {!rank.achieved && <Badge className="bg-gray-100 text-gray-700">Locked</Badge>}
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-2">
                            <span className={rank.current ? 'text-white/80' : 'text-gray-600'}>Progress</span>
                            <span className={rank.current ? 'text-white' : 'text-gray-900'}>{rank.progress.toFixed(0)}%</span>
                          </div>
                          <Progress 
                            value={rank.progress} 
                            className={rank.current ? 'bg-white/20' : 'bg-gray-200'}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <h4 className={`font-semibold mb-2 ${rank.current ? 'text-white' : 'text-gray-900'}`}>
                              Requirements
                            </h4>
                            <ul className={`text-sm space-y-1 ${rank.current ? 'text-white/80' : 'text-gray-600'}`}>
                              <li>• {rank.requirements.directReferrals} direct referrals</li>
                              {rank.requirements.poolsCompleted && (
                                <li>• Complete Pool {rank.requirements.poolsCompleted}</li>
                              )}
                              {rank.requirements.teamSize && (
                                <li>• {rank.requirements.teamSize} team members</li>
                              )}
                            </ul>
                          </div>
                          <div className="md:col-span-2">
                            <h4 className={`font-semibold mb-2 ${rank.current ? 'text-white' : 'text-gray-900'}`}>
                              Benefits
                            </h4>
                            <ul className={`text-sm space-y-1 ${rank.current ? 'text-white/80' : 'text-gray-600'}`}>
                              {rank.benefits.map((benefit, idx) => (
                                <li key={idx}>• {benefit}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Rewards Tab */}
          <TabsContent value="rewards" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Gift className="w-5 h-5 mr-2 text-emerald-600" />
                  Team Rewards System
                </CardTitle>
                <CardDescription>
                  Earn rewards based on your team size and achievement speed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {teamRewards.map((reward) => (
                    <Card key={reward.teamSize} className={`border-2 transition-all duration-300 ${
                      reward.fastTrack.eligible || reward.standard.eligible ? 'border-green-400 bg-green-50' :
                      reward.fastTrack.claimed || reward.standard.claimed ? 'border-blue-400 bg-blue-50' :
                      'border-gray-200 bg-gray-50'
                    }`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{reward.teamSize} Members</CardTitle>
                          {(reward.fastTrack.claimed || reward.standard.claimed) && (
                            <Badge className="bg-blue-100 text-blue-700">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Claimed
                            </Badge>
                          )}
                          {(reward.fastTrack.eligible || reward.standard.eligible) && (
                            <Badge className="bg-green-100 text-green-700">
                              <Sparkles className="w-3 h-3 mr-1" />
                              Available
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Fast Track Reward */}
                        <div className={`p-4 rounded-lg border-2 ${
                          reward.fastTrack.eligible ? 'border-orange-400 bg-orange-50' :
                          reward.fastTrack.claimed ? 'border-green-400 bg-green-50' :
                          'border-gray-200 bg-gray-50'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-orange-900">🔥 Fast Track</h4>
                            <span className="text-lg font-bold text-orange-900">
                              ${reward.fastTrack.amount}
                            </span>
                          </div>
                          <p className="text-sm text-orange-700 mb-2">
                            Within {reward.fastTrack.timeLimit} days
                          </p>
                          {reward.fastTrack.eligible && (
                            <Button
                              onClick={() => claimTeamReward(reward.teamSize, 'fast_track')}
                              disabled={isLoading}
                              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                            >
                              <Gift className="w-4 h-4 mr-2" />
                              Claim Fast Track
                            </Button>
                          )}
                          {reward.fastTrack.claimed && (
                            <div className="flex items-center text-green-700">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              <span className="text-sm">Claimed</span>
                            </div>
                          )}
                          {!reward.fastTrack.eligible && !reward.fastTrack.claimed && (
                            <p className="text-xs text-gray-600">
                              {reward.currentTeamSize < reward.teamSize 
                                ? `Need ${reward.teamSize - reward.currentTeamSize} more members`
                                : `Time expired (${reward.daysFromRegistration} > ${reward.fastTrack.timeLimit} days)`
                              }
                            </p>
                          )}
                        </div>

                        {/* Standard Reward */}
                        <div className={`p-4 rounded-lg border-2 ${
                          reward.standard.eligible ? 'border-blue-400 bg-blue-50' :
                          reward.standard.claimed ? 'border-green-400 bg-green-50' :
                          'border-gray-200 bg-gray-50'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-blue-900">⭐ Standard</h4>
                            <span className="text-lg font-bold text-blue-900">
                              ${reward.standard.amount}
                            </span>
                          </div>
                          <p className="text-sm text-blue-700 mb-2">
                            Within {reward.standard.timeLimit} days
                          </p>
                          {reward.standard.eligible && (
                            <Button
                              onClick={() => claimTeamReward(reward.teamSize, 'standard')}
                              disabled={isLoading}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Gift className="w-4 h-4 mr-2" />
                              Claim Standard
                            </Button>
                          )}
                          {reward.standard.claimed && (
                            <div className="flex items-center text-green-700">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              <span className="text-sm">Claimed</span>
                            </div>
                          )}
                          {!reward.standard.eligible && !reward.standard.claimed && (
                            <p className="text-xs text-gray-600">
                              {reward.currentTeamSize < reward.teamSize 
                                ? `Need ${reward.teamSize - reward.currentTeamSize} more members`
                                : `Time expired (${reward.daysFromRegistration} > ${reward.standard.timeLimit} days)`
                              }
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Information Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-900">
              <Award className="w-5 h-5 mr-2" />
              Ranks & Rewards Information
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 text-sm space-y-2">
            <p>• <strong>Rank Progression:</strong> Advance through 5 ranks by building your network and completing pools</p>
            <p>• <strong>Fast Track Rewards:</strong> Higher amounts for reaching team milestones quickly</p>
            <p>• <strong>Standard Rewards:</strong> Lower amounts but more time allowed to qualify</p>
            <p>• <strong>Active Account Required:</strong> Must maintain active status to earn all rewards</p>
            <p>• <strong>One-Time Rewards:</strong> Each team reward can only be claimed once</p>
            <p>• <strong>Team Size:</strong> Currently based on direct referrals (will include full downline in future)</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}