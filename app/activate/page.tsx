"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Zap, 
  DollarSign, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Users,
  BarChart3,
  Target,
  Crown,
  Wallet,
  ArrowRight,
  Info,
  Shield,
  LayoutDashboard
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function ActivatePage() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activationCost] = useState(21);
  const [activationComplete, setActivationComplete] = useState(false);
  const [incomeDistributed, setIncomeDistributed] = useState(false);
  
  const { user, profile, loading: authLoading, refetchProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && !user) {
      router.push('/login');
    } else if (mounted && !authLoading && user && profile) {
      // If already active, redirect to dashboard
      if (profile.account_status === 'active') {
        router.push('/dashboard');
      }
    }
  }, [user, profile, authLoading, mounted, router]);

  const handleActivation = async () => {
    if (!user || !profile) return;
    
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('🔄 Processing account activation...');
      
      // Check if user has enough balance
      if (profile.fund_wallet_balance < activationCost) {
        throw new Error(`Insufficient fund wallet balance. You need $${activationCost} to activate your account.`);
      }

      // Call the database function to process activation
      const { data, error } = await supabase.rpc('process_account_activation', {
        user_id_param: user.id
      });

      if (error) {
        console.error('❌ Activation error:', error);
        throw new Error(`Activation failed: ${error.message}`);
      }

      if (!data.success) {
        console.error('❌ Activation failed:', data.message);
        throw new Error(data.message || 'Activation failed. Please try again.');
      }

      console.log('✅ Activation successful:', data);
      
      setSuccess('Your account has been successfully activated!');
      setActivationComplete(true);
      setIncomeDistributed(data.income_distributed);
      
      // Refresh profile data
      await refetchProfile();
      
      // Redirect to dashboard after a delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 5000);
      
    } catch (err: any) {
      console.error('❌ Activation error:', err);
      setError(err.message || 'Failed to activate account. Please try again.');
    } finally {
      setIsLoading(false);
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
          <p className="text-gray-600 mb-4">Please log in to activate your account</p>
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
                <h1 className="text-xl font-bold text-gray-900">Account Activation</h1>
                <p className="text-sm text-gray-600">Activate your account to start earning</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Fund Wallet Balance</p>
              <p className="text-lg font-semibold text-blue-600">${profile.fund_wallet_balance.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
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

        {/* Activation Card */}
        {activationComplete ? (
          <Card className="bg-gradient-to-r from-green-400 to-emerald-500 text-white border-0 shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl text-center text-white">Activation Successful!</CardTitle>
              <CardDescription className="text-center text-white/90">
                Your account is now active and ready to earn
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-white/10 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">What's Next?</h3>
                <ul className="space-y-2 text-white/90">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2 text-white/90" />
                    You're now in Pool 1 (30 minutes to complete)
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2 text-white/90" />
                    Share your referral code to start earning
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2 text-white/90" />
                    Get 1 referral to advance to Pool 2
                  </li>
                  {incomeDistributed && (
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-white/90" />
                      Income distributed to your upline
                    </li>
                  )}
                </ul>
              </div>
              
              <div className="flex space-x-3">
                <Button
                  onClick={() => router.push('/dashboard')}
                  className="flex-1 bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Button>
                <Button
                  onClick={() => router.push('/pools')}
                  className="flex-1 bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  <Target className="w-4 h-4 mr-2" />
                  View Pool Status
                </Button>
              </div>
              
              <p className="text-center text-white/80 text-sm">
                Redirecting to dashboard in a few seconds...
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="w-5 h-5 mr-2 text-orange-600" />
                Activate Your Account
              </CardTitle>
              <CardDescription>
                Unlock all 7 income streams by activating your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-orange-900">Activation Cost</h3>
                    <p className="text-orange-700 text-sm">One-time fee to unlock all features</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-orange-900">${activationCost}</div>
                    <div className="text-orange-700 text-sm">
                      From Fund Wallet
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-orange-700">Your Fund Wallet Balance:</span>
                  <span className={`font-semibold ${profile.fund_wallet_balance >= activationCost ? 'text-green-600' : 'text-red-600'}`}>
                    ${profile.fund_wallet_balance.toFixed(2)}
                  </span>
                </div>
                
                {profile.fund_wallet_balance < activationCost && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded p-2 text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 inline-block mr-1" />
                    Insufficient balance. You need to deposit ${(activationCost - profile.fund_wallet_balance).toFixed(2)} more.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 flex items-center mb-3">
                    <Users className="w-4 h-4 mr-2" />
                    Referral Benefits
                  </h3>
                  <ul className="space-y-2 text-sm text-blue-700">
                    <li className="flex items-center">
                      <CheckCircle className="w-3 h-3 mr-2 text-blue-500" />
                      $5 direct referral bonus
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-3 h-3 mr-2 text-blue-500" />
                      $0.5 level income (levels 2-7)
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-3 h-3 mr-2 text-blue-500" />
                      Rank sponsor bonuses ($1-$4)
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-3 h-3 mr-2 text-blue-500" />
                      Team size rewards (up to $5,000)
                    </li>
                  </ul>
                </div>
                
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 flex items-center mb-3">
                    <Target className="w-4 h-4 mr-2" />
                    Pool System Access
                  </h3>
                  <ul className="space-y-2 text-sm text-purple-700">
                    <li className="flex items-center">
                      <CheckCircle className="w-3 h-3 mr-2 text-purple-500" />
                      Pool 1: $5 reward (30 minutes)
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-3 h-3 mr-2 text-purple-500" />
                      Pool 2: $10 reward (24 hours)
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-3 h-3 mr-2 text-purple-500" />
                      Pool 3: $15 reward (5 days)
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-3 h-3 mr-2 text-purple-500" />
                      Pool 4: $27 reward (15 days)
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 flex items-center mb-3">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Income Streams Unlocked
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center">
                    <Badge className="bg-green-100 text-green-700 mr-2">1</Badge>
                    <span className="text-green-700">Direct Referral</span>
                  </div>
                  <div className="flex items-center">
                    <Badge className="bg-blue-100 text-blue-700 mr-2">2</Badge>
                    <span className="text-blue-700">Level Income</span>
                  </div>
                  <div className="flex items-center">
                    <Badge className="bg-purple-100 text-purple-700 mr-2">3</Badge>
                    <span className="text-purple-700">Pool Income</span>
                  </div>
                  <div className="flex items-center">
                    <Badge className="bg-orange-100 text-orange-700 mr-2">4</Badge>
                    <span className="text-orange-700">Rank Sponsor</span>
                  </div>
                  <div className="flex items-center">
                    <Badge className="bg-teal-100 text-teal-700 mr-2">5</Badge>
                    <span className="text-teal-700">Global Turnover</span>
                  </div>
                  <div className="flex items-center">
                    <Badge className="bg-pink-100 text-pink-700 mr-2">6</Badge>
                    <span className="text-pink-700">Team Rewards</span>
                  </div>
                  <div className="flex items-center col-span-2">
                    <Badge className="bg-amber-100 text-amber-700 mr-2">7</Badge>
                    <span className="text-amber-700">Recycle Income</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-3">
                <Button
                  onClick={handleActivation}
                  disabled={isLoading || profile.fund_wallet_balance < activationCost}
                  className="bg-gradient-to-r from-orange-400 to-teal-500 hover:from-orange-500 hover:to-teal-600 text-white"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Activating Account...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4" />
                      <span>Activate for ${activationCost}</span>
                    </div>
                  )}
                </Button>
                
                {profile.fund_wallet_balance < activationCost && (
                  <Button
                    onClick={() => router.push('/deposit')}
                    variant="outline"
                    className="border-blue-200 hover:bg-blue-50 text-blue-700"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Deposit Funds
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  onClick={() => router.push('/dashboard')}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Return to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Information Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-900">
              <Info className="w-5 h-5 mr-2" />
              Activation Information
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 text-sm space-y-2">
            <p>• <strong>One-Time Fee:</strong> The $21 activation fee is a one-time payment from your Fund Wallet</p>
            <p>• <strong>Pool System:</strong> Upon activation, you'll enter Pool 1 with a 30-minute timer</p>
            <p>• <strong>Referral Requirement:</strong> You need 1 active referral to exit Pool 1 and enter Pool 2</p>
            <p>• <strong>Income Distribution:</strong> When you activate, your referrer receives a $5 direct referral bonus</p>
            <p>• <strong>Level Income:</strong> Your upline (levels 2-7) receives $0.5 each when you activate</p>
            <p>• <strong>Reactivation:</strong> After completing a full cycle (all 4 pools), you'll need to reactivate</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}