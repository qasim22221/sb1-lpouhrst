"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  RefreshCw, 
  Zap, 
  DollarSign, 
  Users, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Loader2,
  Activity,
  Award,
  Target,
  Calendar,
  TrendingUp,
  History,
  Info
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface RecycleHistory {
  id: string;
  cycle_number: number;
  reactivation_date: string;
  bonus_amount: number;
  status: string;
  description: string;
}

interface RecycleStats {
  total_cycles: number;
  total_earned: number;
  current_cycle: number;
  last_reactivation: string | null;
  next_eligible_date: string | null;
  can_reactivate: boolean;
}

export default function RecyclePage() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [recycleHistory, setRecycleHistory] = useState<RecycleHistory[]>([]);
  const [recycleStats, setRecycleStats] = useState<RecycleStats | null>(null);
  const [isReactivating, setIsReactivating] = useState(false);
  
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && !user) {
      router.push('/login');
    } else if (mounted && !authLoading && user && profile) {
      loadRecycleData();
    }
  }, [user, profile, authLoading, mounted, router]);

  const loadRecycleData = async () => {
    if (!user || !profile) return;

    setIsLoading(true);
    try {
      await Promise.all([
        loadRecycleHistory(),
        loadRecycleStats()
      ]);
    } catch (err: any) {
      setError(`Failed to load recycle data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecycleHistory = async () => {
    if (!user) return;

    try {
      // Get reactivation history from referral bonuses
      const { data, error } = await supabase
        .from('referral_bonuses')
        .select('*')
        .eq('user_id', user.id)
        .eq('bonus_type', 'recycle_income')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading recycle history:', error);
        return;
      }

      const history: RecycleHistory[] = (data || []).map((bonus, index) => ({
        id: bonus.id,
        cycle_number: index + 1, // Simple cycle numbering
        reactivation_date: bonus.created_at,
        bonus_amount: bonus.amount,
        status: 'completed',
        description: bonus.description || 'Account reactivation bonus'
      }));

      setRecycleHistory(history);
    } catch (err: any) {
      console.error('Error loading recycle history:', err);
    }
  };

  const loadRecycleStats = async () => {
    if (!user || !profile) return;

    try {
      // Get total recycle income earned
      const { data: recycleIncome } = await supabase
        .from('referral_bonuses')
        .select('amount, created_at')
        .eq('user_id', user.id)
        .eq('bonus_type', 'recycle_income');

      const totalCycles = recycleIncome?.length || 0;
      const totalEarned = (recycleIncome || []).reduce((sum, income) => sum + income.amount, 0);
      
      // Get last reactivation date
      const lastReactivation = recycleIncome && recycleIncome.length > 0 
        ? recycleIncome[0].created_at 
        : null;

      // Check if user can reactivate (account must be inactive and completed a cycle)
      const canReactivate = profile.account_status === 'inactive' && profile.cycle_completed_at;

      setRecycleStats({
        total_cycles: totalCycles,
        total_earned: totalEarned,
        current_cycle: totalCycles + 1,
        last_reactivation: lastReactivation,
        next_eligible_date: null, // No waiting period for reactivation
        can_reactivate: canReactivate
      });
    } catch (err: any) {
      console.error('Error loading recycle stats:', err);
    }
  };

  const handleReactivation = async () => {
    if (!user || !profile) return;

    setIsReactivating(true);
    setError('');

    try {
      // Check if user can reactivate
      if (profile.account_status !== 'inactive') {
        throw new Error('Account must be inactive to reactivate');
      }

      if (!profile.cycle_completed_at) {
        throw new Error('Must complete a full cycle before reactivating');
      }

      // Process reactivation
      const { data, error } = await supabase.rpc('process_account_reactivation', {
        user_id_param: user.id
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        setSuccess(`🎉 Account reactivated successfully! ${data.recycle_bonus > 0 ? `You earned $${data.recycle_bonus} recycle income!` : ''}`);
        
        // Reload data
        await loadRecycleData();
        
        // Redirect to dashboard after a moment
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      } else {
        throw new Error(data.message || 'Failed to reactivate account');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsReactivating(false);
    }
  };

  const refreshData = async () => {
    await loadRecycleData();
    setSuccess('Data refreshed successfully!');
    setTimeout(() => setSuccess(''), 3000);
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
          <p className="text-gray-600 mb-4">Please log in to access recycle income</p>
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
                <h1 className="text-xl font-bold text-gray-900">Recycle Income</h1>
                <p className="text-sm text-gray-600">Reactivate your account and earn recycle bonuses</p>
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

        {/* Recycle Stats Overview */}
        {recycleStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Cycles</CardTitle>
                <RefreshCw className="w-4 h-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{recycleStats.total_cycles}</div>
                <p className="text-xs text-gray-500 mt-1">Completed reactivations</p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Earned</CardTitle>
                <DollarSign className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">${recycleStats.total_earned.toFixed(2)}</div>
                <p className="text-xs text-gray-500 mt-1">From recycle income</p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Current Cycle</CardTitle>
                <Target className="w-4 h-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">#{recycleStats.current_cycle}</div>
                <p className="text-xs text-gray-500 mt-1">Next reactivation cycle</p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Account Status</CardTitle>
                <Activity className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 capitalize">{profile.account_status}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {recycleStats.can_reactivate ? 'Ready to reactivate' : 'Complete cycle first'}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Reactivation Section */}
        {profile.account_status === 'inactive' && (
          <Card className={`border-2 ${
            recycleStats?.can_reactivate 
              ? 'border-green-400 bg-green-50' 
              : 'border-yellow-400 bg-yellow-50'
          }`}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="w-5 h-5 mr-2 text-amber-600" />
                Account Reactivation
              </CardTitle>
              <CardDescription>
                {recycleStats?.can_reactivate 
                  ? 'Your account is ready for reactivation. You will receive a $5 recycle income bonus for your first reactivation.'
                  : 'Complete a full 4-pool cycle to become eligible for reactivation.'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recycleStats?.can_reactivate ? (
                <div className="space-y-4">
                  <div className="bg-white border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-2">Reactivation Benefits:</h4>
                    <ul className="text-green-800 text-sm space-y-1">
                      <li>• Restart your pool progression from Pool 1</li>
                      <li>• Continue earning from all 7 income streams</li>
                      <li>• $5 recycle income bonus (first reactivation only)</li>
                      <li>• Your upline will NOT receive direct referral income</li>
                    </ul>
                  </div>
                  
                  <Button
                    onClick={handleReactivation}
                    disabled={isReactivating}
                    className="w-full bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white"
                  >
                    {isReactivating ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Reactivating Account...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Zap className="w-4 h-4" />
                        <span>Reactivate Account ($21)</span>
                      </div>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Target className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-yellow-900 mb-2">Complete Your Cycle First</h3>
                  <p className="text-yellow-800 text-sm">
                    You need to complete all 4 pools in a cycle before you can reactivate your account.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Active Account Notice */}
        {profile.account_status === 'active' && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">Account Currently Active</h3>
                  <p className="text-blue-700">
                    Complete your current 4-pool cycle to become eligible for reactivation and recycle income.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recycle History */}
        <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
          <CardHeader>
            <CardTitle className="flex items-center">
              <History className="w-5 h-5 mr-2 text-purple-600" />
              Recycle Income History
            </CardTitle>
            <CardDescription>
              Your account reactivation and recycle income history
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading recycle history...</p>
              </div>
            ) : recycleHistory.length === 0 ? (
              <div className="text-center py-8">
                <RefreshCw className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No recycle income yet</h3>
                <p className="text-gray-600">
                  Complete a cycle and reactivate your account to start earning recycle income
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recycleHistory.map((entry) => (
                  <div key={entry.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
                          <RefreshCw className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            Cycle #{entry.cycle_number} Reactivation
                          </h3>
                          <p className="text-sm text-gray-600">{entry.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">+${entry.bonus_amount.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(entry.reactivation_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-600 pt-2 border-t border-gray-100">
                      <Badge className="bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {entry.status}
                      </Badge>
                      <span>Reactivation #{entry.cycle_number}</span>
                    </div>
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
              <Info className="w-5 h-5 mr-2" />
              Recycle Income Rules (Updated)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 text-sm space-y-2">
            <p>• <strong>First Reactivation Only:</strong> You receive $5 recycle income bonus only on your first reactivation</p>
            <p>• <strong>No Subsequent Bonuses:</strong> After the first reactivation, you receive no additional recycle income</p>
            <p>• <strong>Upline Impact:</strong> When you reactivate, your upline does NOT receive the $5 direct referral income</p>
            <p>• <strong>Cycle Completion Required:</strong> Must complete all 4 pools before becoming eligible for reactivation</p>
            <p>• <strong>Reactivation Cost:</strong> $21 to reactivate your account and restart the pool system</p>
            <p>• <strong>Fresh Start:</strong> Reactivation restarts your pool progression from Pool 1</p>
            <p>• <strong>Income Streams:</strong> All 7 income streams become available again upon reactivation</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}