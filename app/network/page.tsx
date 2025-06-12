"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Users, 
  Copy, 
  Check, 
  Share2, 
  Eye, 
  Search,
  Filter,
  Download,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  Star,
  Crown,
  Award,
  TrendingUp,
  Calendar,
  Activity,
  DollarSign,
  Target,
  BarChart3,
  Plus,
  ExternalLink,
  Mail,
  MessageSquare,
  Phone
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface NetworkMember {
  id: string;
  username: string;
  rank: string;
  account_status: string;
  activation_date: string;
  created_at: string;
  level: number;
  sponsor_id?: string;
  total_earned_from: number;
  direct_referrals_count: number;
  team_size: number;
}

interface NetworkStats {
  total_network_size: number;
  direct_referrals: number;
  active_members: number;
  total_volume: number;
  this_month_growth: number;
  levels_deep: number;
  top_performers: NetworkMember[];
}

export default function NetworkPage() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [networkMembers, setNetworkMembers] = useState<NetworkMember[]>([]);
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [referralCodeCopied, setReferralCodeCopied] = useState(false);
  const [referralLinkCopied, setReferralLinkCopied] = useState(false);
  
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && !user) {
      router.push('/login');
    } else if (mounted && !authLoading && user && profile) {
      loadNetworkData();
    }
  }, [user, profile, authLoading, mounted, router]);

  const loadNetworkData = async () => {
    if (!user || !profile) return;

    setIsLoading(true);
    try {
      await Promise.all([
        loadNetworkMembers(),
        loadNetworkStats(),
      ]);
    } catch (err: any) {
      setError(`Failed to load network data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadNetworkMembers = async () => {
    if (!user || !profile) return;

    try {
      // Get direct referrals first
      const { data: directReferrals, error: directError } = await supabase
        .from('profiles')
        .select('id, username, rank, account_status, activation_date, created_at')
        .eq('referred_by', profile.referral_code)
        .order('created_at', { ascending: false });

      if (directError) {
        throw new Error(`Failed to load direct referrals: ${directError.message}`);
      }

      // For now, we'll show direct referrals as level 1
      // In a full implementation, you'd recursively load deeper levels
      const membersWithDetails = await Promise.all(
        (directReferrals || []).map(async (member) => {
          // Get earnings from this member using reference_id instead of referred_user_id
          const { data: earnings } = await supabase
            .from('referral_bonuses')
            .select('amount')
            .eq('user_id', user.id)
            .eq('reference_id', member.id);

          // Get their direct referrals count
          const { data: theirReferrals } = await supabase
            .from('profiles')
            .select('id')
            .eq('referred_by', member.id);

          const totalEarned = (earnings || []).reduce((sum, e) => sum + e.amount, 0);

          return {
            ...member,
            level: 1,
            total_earned_from: totalEarned,
            direct_referrals_count: (theirReferrals || []).length,
            team_size: (theirReferrals || []).length, // Simplified - would need recursive calculation
          };
        })
      );

      setNetworkMembers(membersWithDetails);
    } catch (err: any) {
      console.error('Error loading network members:', err);
    }
  };

  const loadNetworkStats = async () => {
    if (!user || !profile) return;

    try {
      // Get direct referrals count
      const { data: directReferrals, error: directError } = await supabase
        .from('profiles')
        .select('id, account_status, created_at')
        .eq('referred_by', profile.referral_code);

      if (directError) {
        throw new Error(`Failed to load network stats: ${directError.message}`);
      }

      const directCount = (directReferrals || []).length;
      const activeCount = (directReferrals || []).filter(r => r.account_status === 'active').length;

      // Calculate this month's growth
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthReferrals = (directReferrals || []).filter(r => 
        new Date(r.created_at) >= thisMonthStart
      ).length;

      // Get total earnings from network
      const { data: earnings } = await supabase
        .from('referral_bonuses')
        .select('amount')
        .eq('user_id', user.id);

      const totalVolume = (earnings || []).reduce((sum, e) => sum + e.amount, 0);

      // Get top performers (simplified)
      const topPerformers = networkMembers
        .sort((a, b) => b.total_earned_from - a.total_earned_from)
        .slice(0, 5);

      setNetworkStats({
        total_network_size: directCount, // Simplified - would include all levels
        direct_referrals: directCount,
        active_members: activeCount,
        total_volume: totalVolume,
        this_month_growth: thisMonthReferrals,
        levels_deep: directCount > 0 ? 1 : 0, // Simplified
        top_performers: topPerformers,
      });
    } catch (err: any) {
      console.error('Error loading network stats:', err);
    }
  };

  const copyReferralCode = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code);
      setReferralCodeCopied(true);
      setTimeout(() => setReferralCodeCopied(false), 2000);
    }
  };

  const copyReferralLink = () => {
    if (profile?.referral_code) {
      const link = `${window.location.origin}/register?ref=${profile.referral_code}`;
      navigator.clipboard.writeText(link);
      setReferralLinkCopied(true);
      setTimeout(() => setReferralLinkCopied(false), 2000);
    }
  };

  const shareReferralLink = async () => {
    if (profile?.referral_code) {
      const link = `${window.location.origin}/register?ref=${profile.referral_code}`;
      const text = `Join me on this amazing platform and start earning! Use my referral code: ${profile.referral_code}`;
      
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Join My Network',
            text: text,
            url: link,
          });
        } catch (err) {
          // Fallback to copy
          copyReferralLink();
        }
      } else {
        copyReferralLink();
      }
    }
  };

  const refreshData = async () => {
    await loadNetworkData();
    setSuccess('Network data refreshed successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const getRankIcon = (rank: string) => {
    switch (rank) {
      case 'Gold': return Star;
      case 'Platinum': return Crown;
      case 'Diamond': return Award;
      case 'Ambassador': return TrendingUp;
      default: return Users;
    }
  };

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'Gold': return 'from-yellow-400 to-yellow-600';
      case 'Platinum': return 'from-gray-400 to-gray-600';
      case 'Diamond': return 'from-blue-400 to-blue-600';
      case 'Ambassador': return 'from-purple-400 to-purple-600';
      default: return 'from-green-400 to-green-600';
    }
  };

  const filteredMembers = networkMembers.filter(member => {
    const matchesSearch = searchTerm === '' || 
      member.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLevel = filterLevel === 'all' || 
      member.level.toString() === filterLevel;
    
    const matchesStatus = filterStatus === 'all' || 
      member.account_status === filterStatus;
    
    return matchesSearch && matchesLevel && matchesStatus;
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
          <p className="text-gray-600 mb-4">Please log in to access your network</p>
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
                <h1 className="text-xl font-bold text-gray-900">My Network</h1>
                <p className="text-sm text-gray-600">Manage your referral network and team</p>
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

        {/* Network Stats Overview */}
        {networkStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Network</CardTitle>
                <Users className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{networkStats.total_network_size}</div>
                <p className="text-xs text-gray-500 mt-1">Total team members</p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Direct Referrals</CardTitle>
                <Target className="w-4 h-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{networkStats.direct_referrals}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {networkStats.active_members} active
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">This Month Growth</CardTitle>
                <TrendingUp className="w-4 h-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">+{networkStats.this_month_growth}</div>
                <p className="text-xs text-gray-500 mt-1">New referrals</p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Volume</CardTitle>
                <DollarSign className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">${networkStats.total_volume.toFixed(2)}</div>
                <p className="text-xs text-gray-500 mt-1">Earnings from network</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Referral Tools */}
        <Card className="bg-gradient-to-r from-orange-400 to-teal-500 text-white border-0">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Share2 className="w-5 h-5 mr-2" />
              Referral Tools
            </CardTitle>
            <CardDescription className="text-white/90">
              Share your referral code and start building your network
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2">Your Referral Code</h4>
                <div className="flex items-center space-x-2">
                  <code className="bg-white/20 px-3 py-2 rounded text-white font-mono flex-1">
                    {profile.referral_code}
                  </code>
                  <Button
                    onClick={copyReferralCode}
                    size="sm"
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  >
                    {referralCodeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="bg-white/10 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2">Referral Link</h4>
                <div className="flex items-center space-x-2">
                  <Input
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/register?ref=${profile.referral_code}`}
                    readOnly
                    className="bg-white/20 border-white/30 text-white placeholder-white/70 flex-1"
                  />
                  <Button
                    onClick={copyReferralLink}
                    size="sm"
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  >
                    {referralLinkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={shareReferralLink}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share Link
              </Button>
              <Button
                onClick={() => {
                  const subject = 'Join My Network';
                  const body = `Hi! I'd like to invite you to join this amazing platform. Use my referral code: ${profile.referral_code}\n\nRegister here: ${window.location.origin}/register?ref=${profile.referral_code}`;
                  window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                }}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <Mail className="w-4 h-4 mr-2" />
                Email
              </Button>
              <Button
                onClick={() => {
                  const text = `Join me on this platform! Use code: ${profile.referral_code} - ${window.location.origin}/register?ref=${profile.referral_code}`;
                  window.open(`sms:?body=${encodeURIComponent(text)}`);
                }}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                SMS
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for different views */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Network Overview</TabsTrigger>
            <TabsTrigger value="members">Team Members</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Network Structure */}
              <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                    Network Structure
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {networkStats ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Level 1 (Direct)</span>
                        <span className="font-semibold">{networkStats.direct_referrals} members</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Active Members</span>
                        <span className="font-semibold text-green-600">{networkStats.active_members}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Inactive Members</span>
                        <span className="font-semibold text-yellow-600">
                          {networkStats.direct_referrals - networkStats.active_members}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Network Depth</span>
                        <span className="font-semibold">{networkStats.levels_deep} levels</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No network yet</h3>
                      <p className="text-gray-600">Start referring people to build your network</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Performers */}
              <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Award className="w-5 h-5 mr-2 text-purple-600" />
                    Top Performers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {networkStats && networkStats.top_performers.length > 0 ? (
                    <div className="space-y-3">
                      {networkStats.top_performers.map((performer, index) => {
                        const RankIcon = getRankIcon(performer.rank);
                        const rankColor = getRankColor(performer.rank);
                        
                        return (
                          <div key={performer.id} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-bold text-gray-500">#{index + 1}</span>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-r ${rankColor} shadow-sm`}>
                                  <RankIcon className="w-4 h-4 text-white" />
                                </div>
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{performer.username}</p>
                                <p className="text-xs text-gray-500">{performer.rank}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-green-600">${performer.total_earned_from.toFixed(2)}</p>
                              <p className="text-xs text-gray-500">earned</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No performers yet</h3>
                      <p className="text-gray-600">Your top earning referrals will appear here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2 text-emerald-600" />
                    Team Members
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search members..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64 bg-white border-orange-200 focus:border-orange-400"
                      />
                    </div>
                    <select
                      value={filterLevel}
                      onChange={(e) => setFilterLevel(e.target.value)}
                      className="px-3 py-2 border border-orange-200 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    >
                      <option value="all">All Levels</option>
                      <option value="1">Level 1</option>
                      <option value="2">Level 2</option>
                      <option value="3">Level 3</option>
                    </select>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="px-3 py-2 border border-orange-200 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <CardDescription>
                  Manage and view your network members
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Loading network members...</p>
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {searchTerm || filterLevel !== 'all' || filterStatus !== 'all' 
                        ? 'No members match your filters'
                        : 'No team members yet'
                      }
                    </h3>
                    <p className="text-gray-600">
                      {searchTerm || filterLevel !== 'all' || filterStatus !== 'all' 
                        ? 'Try adjusting your search or filters'
                        : 'Start referring people to build your network'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredMembers.map((member) => {
                      const RankIcon = getRankIcon(member.rank);
                      const rankColor = getRankColor(member.rank);
                      
                      return (
                        <div key={member.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-r ${rankColor} shadow-sm`}>
                                <RankIcon className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">{member.username}</h3>
                                <div className="flex items-center space-x-2">
                                  <Badge className="bg-blue-100 text-blue-700 text-xs">
                                    {member.rank}
                                  </Badge>
                                  <Badge className={
                                    member.account_status === 'active' 
                                      ? 'bg-green-100 text-green-700' 
                                      : 'bg-yellow-100 text-yellow-700'
                                  }>
                                    {member.account_status}
                                  </Badge>
                                  <Badge className="bg-purple-100 text-purple-700 text-xs">
                                    Level {member.level}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-green-600">
                                ${member.total_earned_from.toFixed(2)}
                              </div>
                              <div className="text-xs text-gray-500">Total earned</div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Joined:</span>
                              <p>{new Date(member.created_at).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <span className="font-medium">Activated:</span>
                              <p>{member.activation_date ? new Date(member.activation_date).toLocaleDateString() : 'Not activated'}</p>
                            </div>
                            <div>
                              <span className="font-medium">Direct Referrals:</span>
                              <p>{member.direct_referrals_count}</p>
                            </div>
                            <div>
                              <span className="font-medium">Team Size:</span>
                              <p>{member.team_size}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                    Network Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {networkStats ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Conversion Rate</span>
                        <span className="font-semibold">
                          {networkStats.direct_referrals > 0 ? 
                            `${((networkStats.active_members / networkStats.direct_referrals) * 100).toFixed(1)}%` :
                            '0%'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Average Earnings per Member</span>
                        <span className="font-semibold">
                          ${networkStats.direct_referrals > 0 ? 
                            (networkStats.total_volume / networkStats.direct_referrals).toFixed(2) :
                            '0.00'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Monthly Growth Rate</span>
                        <span className="font-semibold text-green-600">
                          +{networkStats.this_month_growth} members
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Network Efficiency</span>
                        <span className="font-semibold">
                          {networkStats.active_members > 0 ? 'High' : 'Building'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No performance data</h3>
                      <p className="text-gray-600">Performance metrics will appear as your network grows</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-blue-600" />
                    Growth Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">💡 Growth Tips</h4>
                      <ul className="text-blue-800 text-sm space-y-1">
                        <li>• Share your referral link on social media</li>
                        <li>• Engage with your network regularly</li>
                        <li>• Help new members get started</li>
                        <li>• Focus on quality over quantity</li>
                      </ul>
                    </div>
                    
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold text-green-900 mb-2">🎯 Next Goals</h4>
                      <ul className="text-green-800 text-sm space-y-1">
                        <li>• Reach 5 direct referrals for Global Turnover Income</li>
                        <li>• Help existing members activate their accounts</li>
                        <li>• Build deeper network levels</li>
                        <li>• Achieve higher rank requirements</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Information Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-900">
              <Users className="w-5 h-5 mr-2" />
              Network Building Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 text-sm space-y-2">
            <p>• <strong>Quality over Quantity:</strong> Focus on referring people who are genuinely interested</p>
            <p>• <strong>Support Your Team:</strong> Help your referrals understand the system and get activated</p>
            <p>• <strong>Stay Active:</strong> Regular activity helps maintain your income streams</p>
            <p>• <strong>Share Your Success:</strong> Use your earnings as proof of the system's effectiveness</p>
            <p>• <strong>Be Patient:</strong> Building a strong network takes time and consistent effort</p>
            <p>• <strong>Follow Up:</strong> Check in with your referrals and help them succeed</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}