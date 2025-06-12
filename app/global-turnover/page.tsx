"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  TrendingUp, 
  Globe, 
  Users, 
  Calendar, 
  Clock, 
  DollarSign,
  Activity,
  Target,
  AlertTriangle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Timer,
  Zap,
  Award,
  Star,
  Crown,
  Flame,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface GlobalTurnoverStatus {
  eligible: boolean;
  level?: '11_direct' | '21_direct';
  percentage?: number;
  daysRemaining?: number;
  status: 'active' | 'paused' | 'not_eligible' | 'completed';
  message: string;
  startDate?: string;
  endDate?: string;
  totalEarned?: number;
  dailyAverage?: number;
}

interface TurnoverHistory {
  id: string;
  amount: number;
  percentage: number;
  date: string;
  description: string;
  company_turnover: number;
}

export default function GlobalTurnoverPage() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [globalTurnoverStatus, setGlobalTurnoverStatus] = useState<GlobalTurnoverStatus | null>(null);
  const [turnoverHistory, setTurnoverHistory] = useState<TurnoverHistory[]>([]);
  const [daysFromRegistration, setDaysFromRegistration] = useState(0);
  const [currentActiveReferrals, setCurrentActiveReferrals] = useState(0);
  
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && !user) {
      router.push('/login');
    } else if (mounted && !authLoading && user && profile) {
      loadGlobalTurnoverData();
    }
  }, [user, profile, authLoading, mounted, router]);

  const loadGlobalTurnoverData = async () => {
    if (!user || !profile) return;

    setIsLoading(true);
    try {
      await Promise.all([
        checkGlobalTurnoverEligibility(),
        loadTurnoverHistory(),
        calculateDaysFromRegistration()
      ]);
    } catch (err: any) {
      setError(`Failed to load global turnover data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const checkGlobalTurnoverEligibility = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('check_global_turnover_eligibility', {
        user_id_param: user.id
      });

      if (error) {
        console.error('Error checking global turnover eligibility:', error);
        return;
      }

      // Get additional data for status
      const { data: eligibilityData } = await supabase
        .from('global_turnover_eligibility')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Get total earned from global turnover
      const { data: earnings } = await supabase
        .from('referral_bonuses')
        .select('amount')
        .eq('user_id', user.id)
        .eq('bonus_type', 'global_turnover_income');

      const totalEarned = (earnings || []).reduce((sum, e) => sum + e.amount, 0);
      const dailyAverage = earnings && earnings.length > 0 ? totalEarned / earnings.length : 0;

      let daysRemaining = 0;
      if (eligibilityData && eligibilityData.end_date) {
        const endDate = new Date(eligibilityData.end_date);
        daysRemaining = Math.max(0, Math.floor((endDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
      }

      setGlobalTurnoverStatus({
        eligible: data.success,
        level: data.level,
        percentage: data.percentage,
        daysRemaining,
        status: data.success ? 'active' : (data.message.includes('paused') ? 'paused' : 'not_eligible'),
        message: data.message,
        startDate: eligibilityData?.start_date,
        endDate: eligibilityData?.end_date,
        totalEarned,
        dailyAverage
      });

      setCurrentActiveReferrals(profile?.active_direct_referrals || 0);
    } catch (err: any) {
      console.error('Error checking global turnover eligibility:', err);
    }
  };

  const loadTurnoverHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('referral_bonuses')
        .select('id, amount, description, created_at')
        .eq('user_id', user.id)
        .eq('bonus_type', 'global_turnover_income')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        console.error('Error loading turnover history:', error);
        return;
      }

      const history: TurnoverHistory[] = (data || []).map(item => {
        // Extract percentage and company turnover from description
        const percentageMatch = item.description.match(/(\d+)%/);
        const turnoverMatch = item.description.match(/\$([0-9,]+)/);
        
        return {
          id: item.id,
          amount: item.amount,
          percentage: percentageMatch ? parseInt(percentageMatch[1]) : 0,
          date: item.created_at,
          description: item.description,
          company_turnover: turnoverMatch ? parseFloat(turnoverMatch[1].replace(',', '')) : 0
        };
      });

      setTurnoverHistory(history);
    } catch (err: any) {
      console.error('Error loading turnover history:', err);
    }
  };

  const calculateDaysFromRegistration = () => {
    if (!profile) return;

    const registrationDate = new Date(profile.created_at);
    const daysSince = Math.floor((Date.now() - registrationDate.getTime()) / (24 * 60 * 60 * 1000));
    setDaysFromRegistration(daysSince);
  };

  const refreshData = async () => {
    await loadGlobalTurnoverData();
    setSuccess('Data refreshed successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const getEligibilityProgress = () => {
    if (!profile) return { progress11: 0, progress21: 0 };

    const activeReferrals = profile.active_direct_referrals || 0;
    const progress11 = Math.min(100, (activeReferrals / 11) * 100);
    const progress21 = Math.min(100, (activeReferrals / 21) * 100);

    return { progress11, progress21 };
  };

  const getTimeProgress = () => {
    const timeProgress11 = Math.min(100, (daysFromRegistration / 11) * 100);
    const timeProgress21 = Math.min(100, (daysFromRegistration / 21) * 100);

    return { timeProgress11, timeProgress21 };
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
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">Please log in to access global turnover income</p>
          <Button onClick={() => router.push('/login')}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  const { progress11, progress21 } = getEligibilityProgress();
  const { timeProgress11, timeProgress21 } = getTimeProgress();

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
                <h1 className="text-xl font-bold text-gray-900">Global Turnover Income</h1>
                <p className="text-sm text-gray-600">Share in daily company turnover based on your network</p>
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

        {/* Current Status */}
        {globalTurnoverStatus && globalTurnoverStatus.eligible && (
          <Card className="bg-gradient-to-r from-teal-400 to-cyan-500 text-white border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      Global Turnover Income Active - {globalTurnoverStatus.percentage}%
                    </h3>
                    <p className="text-white/90">
                      {globalTurnoverStatus.message}
                    </p>
                  </div>
                </div>
                <Badge className="bg-white/20 text-white border-white/30 text-lg px-4 py-2">
                  {globalTurnoverStatus.level === '21_direct' ? '21 Direct Level' : '11 Direct Level'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {globalTurnoverStatus.daysRemaining}
                  </div>
                  <p className="text-white/80 text-sm">Days Remaining</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    ${globalTurnoverStatus.totalEarned?.toFixed(2) || '0.00'}
                  </div>
                  <p className="text-white/80 text-sm">Total Earned</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    ${globalTurnoverStatus.dailyAverage?.toFixed(2) || '0.00'}
                  </div>
                  <p className="text-white/80 text-sm">Daily Average</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {currentActiveReferrals}
                  </div>
                  <p className="text-white/80 text-sm">Active Referrals</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Paused Status */}
        {globalTurnoverStatus && globalTurnoverStatus.status === 'paused' && (
          <Card className="bg-gradient-to-r from-red-400 to-red-500 text-white border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Global Turnover Income Paused</h3>
                    <p className="text-white/90">{globalTurnoverStatus.message}</p>
                  </div>
                </div>
                <Button
                  onClick={() => router.push('/network')}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Build Network
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Eligibility Requirements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 11 Direct Level */}
          <Card className={`border-2 transition-all duration-300 ${
            globalTurnoverStatus?.level === '11_direct' ? 'border-blue-400 bg-blue-50' :
            progress11 >= 100 && timeProgress11 <= 100 ? 'border-green-400 bg-green-50' :
            'border-gray-200 bg-white'
          }`}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Star className="w-5 h-5 mr-2 text-blue-600" />
                11 Direct Level - 1% Daily
              </CardTitle>
              <CardDescription>
                Get 11 direct referrals within 11 days to earn 1% of daily company turnover for 21 days
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Direct Referrals Progress</span>
                  <span>{currentActiveReferrals}/11</span>
                </div>
                <Progress value={progress11} className="mb-2" />
                <p className="text-xs text-gray-600">
                  {currentActiveReferrals >= 11 ? '✅ Referral requirement met' : `Need ${11 - currentActiveReferrals} more active referrals`}
                </p>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Time Progress</span>
                  <span>{daysFromRegistration}/11 days</span>
                </div>
                <Progress value={timeProgress11} className="mb-2" />
                <p className="text-xs text-gray-600">
                  {daysFromRegistration <= 11 ? `${11 - daysFromRegistration} days remaining` : '❌ Time limit exceeded'}
                </p>
              </div>

              {globalTurnoverStatus?.level === '11_direct' && (
                <div className="bg-blue-100 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center text-blue-800">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    <span className="font-semibold">Currently Active</span>
                  </div>
                  <p className="text-blue-700 text-sm mt-1">
                    Earning 1% of daily company turnover for {globalTurnoverStatus.daysRemaining} more days
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 21 Direct Level */}
          <Card className={`border-2 transition-all duration-300 ${
            globalTurnoverStatus?.level === '21_direct' ? 'border-purple-400 bg-purple-50' :
            progress21 >= 100 && timeProgress21 <= 100 ? 'border-green-400 bg-green-50' :
            'border-gray-200 bg-white'
          }`}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Crown className="w-5 h-5 mr-2 text-purple-600" />
                21 Direct Level - 2% Daily
              </CardTitle>
              <CardDescription>
                Get 21 direct referrals within 21 days to earn 2% of daily company turnover for 21 days
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Direct Referrals Progress</span>
                  <span>{currentActiveReferrals}/21</span>
                </div>
                <Progress value={progress21} className="mb-2" />
                <p className="text-xs text-gray-600">
                  {currentActiveReferrals >= 21 ? '✅ Referral requirement met' : `Need ${21 - currentActiveReferrals} more active referrals`}
                </p>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Time Progress</span>
                  <span>{daysFromRegistration}/21 days</span>
                </div>
                <Progress value={timeProgress21} className="mb-2" />
                <p className="text-xs text-gray-600">
                  {daysFromRegistration <= 21 ? `${21 - daysFromRegistration} days remaining` : '❌ Time limit exceeded'}
                </p>
              </div>

              {globalTurnoverStatus?.level === '21_direct' && (
                <div className="bg-purple-100 border border-purple-200 rounded-lg p-3">
                  <div className="flex items-center text-purple-800">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    <span className="font-semibold">Currently Active</span>
                  </div>
                  <p className="text-purple-700 text-sm mt-1">
                    Earning 2% of daily company turnover for {globalTurnoverStatus.daysRemaining} more days
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Turnover History */}
        <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-green-600" />
              Global Turnover History
            </CardTitle>
            <CardDescription>
              Your daily share of company turnover income
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading turnover history...</p>
              </div>
            ) : turnoverHistory.length === 0 ? (
              <div className="text-center py-8">
                <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No turnover income yet</h3>
                <p className="text-gray-600 mb-4">
                  {globalTurnoverStatus?.eligible 
                    ? 'Your turnover income will appear here daily'
                    : 'Qualify for global turnover income to start earning'
                  }
                </p>
                {!globalTurnoverStatus?.eligible && (
                  <Button
                    onClick={() => router.push('/network')}
                    className="bg-gradient-to-r from-orange-400 to-teal-500 hover:from-orange-500 hover:to-teal-600 text-white"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Build Your Network
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {turnoverHistory.map((entry) => (
                  <div key={entry.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-green-600 rounded-lg flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {entry.percentage}% Global Turnover Share
                          </h3>
                          <p className="text-sm text-gray-600">{entry.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">+${entry.amount.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(entry.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    {entry.company_turnover > 0 && (
                      <div className="text-sm text-gray-600 pt-2 border-t border-gray-100">
                        Company turnover: ${entry.company_turnover.toLocaleString()} | Your share: {entry.percentage}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-900">
              <Globe className="w-5 h-5 mr-2" />
              Global Turnover Income Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 text-sm space-y-2">
            <p>• <strong>11 Direct Level:</strong> Get 11 active direct referrals within 11 days → Earn 1% daily for 21 days</p>
            <p>• <strong>21 Direct Level:</strong> Get 21 active direct referrals within 21 days → Earn 2% daily for 21 days</p>
            <p>• <strong>Upgrade Path:</strong> If you achieve 21 direct while on 11 direct level, you upgrade to 2%</p>
            <p>• <strong>Maintenance Required:</strong> Must maintain minimum referral count or income pauses</p>
            <p>• <strong>Active Account:</strong> Your account must remain active to receive turnover income</p>
            <p>• <strong>Daily Distribution:</strong> Income is distributed automatically every day at midnight</p>
            <p>• <strong>Company Turnover:</strong> Based on total daily activations and reactivations ($21 each)</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}