"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft,
  DollarSign,
  Settings,
  Save,
  AlertCircle,
  CheckCircle,
  Loader2,
  Users,
  Target,
  Crown,
  Globe,
  Gift,
  RefreshCw,
  TrendingUp,
  BarChart3,
  Clock,
  Zap,
  Award,
  Coins,
  Calculator
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface SystemSetting {
  category: string;
  key: string;
  value: string;
  description: string;
}

export default function IncomeSettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [activeTab, setActiveTab] = useState('direct');
  
  const { admin } = useAdminAuth();
  const router = useRouter();

  // Form states for different income types
  const [incomeSettings, setIncomeSettings] = useState({
    // Direct Referral & Level Income
    direct_referral_bonus: 5,
    level_income_rate: 0.5,
    activation_cost: 21,
    
    // Pool Settings
    pool_1_amount: 5,
    pool_2_amount: 10,
    pool_3_amount: 15,
    pool_4_amount: 27,
    pool_1_time: 30,
    pool_2_time: 1440,
    pool_3_time: 7200,
    pool_4_time: 21600,
    
    // Rank Requirements
    gold_referrals: 1,
    platinum_referrals: 2,
    diamond_referrals: 4,
    ambassador_referrals: 10,
    ambassador_team_size: 50,
    
    // Global Turnover
    global_turnover_11_days: 11,
    global_turnover_21_days: 21,
    global_turnover_1_percent: 1,
    global_turnover_2_percent: 2,
    
    // Team Rewards
    team_reward_25_fast: 20,
    team_reward_25_standard: 10,
    team_reward_50_fast: 50,
    team_reward_50_standard: 20,
    team_reward_100_fast: 100,
    team_reward_100_standard: 40,
    
    // Fee Settings
    withdrawal_fee_percentage: 15,
    main_to_fund_transfer_fee: 10,
    
    // Platform Limits
    min_withdrawal_amount: 10,
    max_withdrawal_amount: 10000,
  });

  useEffect(() => {
    setMounted(true);
    if (admin) {
      loadIncomeSettings();
    }
  }, [admin]);

  const loadIncomeSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .in('category', ['income', 'rewards', 'global', 'fees', 'platform']);

      if (error) {
        throw new Error(`Failed to load settings: ${error.message}`);
      }

      setSettings(data || []);

      // Parse settings into form data
      const settingsMap = (data || []).reduce((acc, setting) => {
        acc[setting.key] = JSON.parse(setting.value);
        return acc;
      }, {} as Record<string, any>);

      setIncomeSettings(prev => ({
        ...prev,
        ...settingsMap
      }));

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!admin) return;

    setIsSaving(true);
    setError('');

    try {
      // Validate settings
      if (incomeSettings.direct_referral_bonus <= 0) {
        throw new Error('Direct referral bonus must be greater than 0');
      }

      if (incomeSettings.level_income_rate <= 0) {
        throw new Error('Level income rate must be greater than 0');
      }

      if (incomeSettings.activation_cost <= 0) {
        throw new Error('Activation cost must be greater than 0');
      }

      // Validate pool amounts
      if (incomeSettings.pool_1_amount <= 0 || incomeSettings.pool_2_amount <= 0 || 
          incomeSettings.pool_3_amount <= 0 || incomeSettings.pool_4_amount <= 0) {
        throw new Error('All pool amounts must be greater than 0');
      }

      // Validate pool times
      if (incomeSettings.pool_1_time <= 0 || incomeSettings.pool_2_time <= 0 || 
          incomeSettings.pool_3_time <= 0 || incomeSettings.pool_4_time <= 0) {
        throw new Error('All pool time limits must be greater than 0');
      }

      // Validate rank requirements
      if (incomeSettings.gold_referrals < 1 || incomeSettings.platinum_referrals < 1 || 
          incomeSettings.diamond_referrals < 1 || incomeSettings.ambassador_referrals < 1) {
        throw new Error('All rank requirements must be at least 1');
      }

      // Validate fee percentages
      if (incomeSettings.withdrawal_fee_percentage < 0 || incomeSettings.withdrawal_fee_percentage > 100) {
        throw new Error('Withdrawal fee must be between 0 and 100 percent');
      }

      if (incomeSettings.main_to_fund_transfer_fee < 0 || incomeSettings.main_to_fund_transfer_fee > 100) {
        throw new Error('Transfer fee must be between 0 and 100 percent');
      }

      // Prepare settings updates
      const settingsUpdates = [
        // Income Settings
        { category: 'income', key: 'direct_referral_bonus', value: incomeSettings.direct_referral_bonus.toString(), description: 'Direct referral bonus amount in USD' },
        { category: 'income', key: 'level_income_rate', value: incomeSettings.level_income_rate.toString(), description: 'Level income rate per activation in USD' },
        { category: 'income', key: 'activation_cost', value: incomeSettings.activation_cost.toString(), description: 'Account activation cost in USD' },
        
        // Pool Settings
        { category: 'income', key: 'pool_1_amount', value: incomeSettings.pool_1_amount.toString(), description: 'Pool 1 reward amount in USD' },
        { category: 'income', key: 'pool_2_amount', value: incomeSettings.pool_2_amount.toString(), description: 'Pool 2 reward amount in USD' },
        { category: 'income', key: 'pool_3_amount', value: incomeSettings.pool_3_amount.toString(), description: 'Pool 3 reward amount in USD' },
        { category: 'income', key: 'pool_4_amount', value: incomeSettings.pool_4_amount.toString(), description: 'Pool 4 reward amount in USD' },
        { category: 'income', key: 'pool_1_time', value: incomeSettings.pool_1_time.toString(), description: 'Pool 1 time limit in minutes' },
        { category: 'income', key: 'pool_2_time', value: incomeSettings.pool_2_time.toString(), description: 'Pool 2 time limit in minutes' },
        { category: 'income', key: 'pool_3_time', value: incomeSettings.pool_3_time.toString(), description: 'Pool 3 time limit in minutes' },
        { category: 'income', key: 'pool_4_time', value: incomeSettings.pool_4_time.toString(), description: 'Pool 4 time limit in minutes' },
        
        // Rank Requirements
        { category: 'rewards', key: 'gold_referrals', value: incomeSettings.gold_referrals.toString(), description: 'Direct referrals needed for Gold rank' },
        { category: 'rewards', key: 'platinum_referrals', value: incomeSettings.platinum_referrals.toString(), description: 'Direct referrals needed for Platinum rank' },
        { category: 'rewards', key: 'diamond_referrals', value: incomeSettings.diamond_referrals.toString(), description: 'Direct referrals needed for Diamond rank' },
        { category: 'rewards', key: 'ambassador_referrals', value: incomeSettings.ambassador_referrals.toString(), description: 'Direct referrals needed for Ambassador rank' },
        { category: 'rewards', key: 'ambassador_team_size', value: incomeSettings.ambassador_team_size.toString(), description: 'Team size needed for Ambassador rank' },
        
        // Global Turnover
        { category: 'global', key: 'global_turnover_11_days', value: incomeSettings.global_turnover_11_days.toString(), description: 'Days to achieve 11 referrals for 1% turnover' },
        { category: 'global', key: 'global_turnover_21_days', value: incomeSettings.global_turnover_21_days.toString(), description: 'Days to achieve 21 referrals for 2% turnover' },
        { category: 'global', key: 'global_turnover_1_percent', value: incomeSettings.global_turnover_1_percent.toString(), description: '1% global turnover rate' },
        { category: 'global', key: 'global_turnover_2_percent', value: incomeSettings.global_turnover_2_percent.toString(), description: '2% global turnover rate' },
        
        // Team Rewards
        { category: 'rewards', key: 'team_reward_25_fast', value: incomeSettings.team_reward_25_fast.toString(), description: 'Fast track reward for 25 team members' },
        { category: 'rewards', key: 'team_reward_25_standard', value: incomeSettings.team_reward_25_standard.toString(), description: 'Standard reward for 25 team members' },
        { category: 'rewards', key: 'team_reward_50_fast', value: incomeSettings.team_reward_50_fast.toString(), description: 'Fast track reward for 50 team members' },
        { category: 'rewards', key: 'team_reward_50_standard', value: incomeSettings.team_reward_50_standard.toString(), description: 'Standard reward for 50 team members' },
        { category: 'rewards', key: 'team_reward_100_fast', value: incomeSettings.team_reward_100_fast.toString(), description: 'Fast track reward for 100 team members' },
        { category: 'rewards', key: 'team_reward_100_standard', value: incomeSettings.team_reward_100_standard.toString(), description: 'Standard reward for 100 team members' },
        
        // Fee Settings
        { category: 'fees', key: 'withdrawal_fee_percentage', value: incomeSettings.withdrawal_fee_percentage.toString(), description: 'Withdrawal fee percentage' },
        { category: 'fees', key: 'main_to_fund_transfer_fee', value: incomeSettings.main_to_fund_transfer_fee.toString(), description: 'Main to fund wallet transfer fee percentage' },
        
        // Platform Limits
        { category: 'platform', key: 'min_withdrawal_amount', value: incomeSettings.min_withdrawal_amount.toString(), description: 'Minimum withdrawal amount in USD' },
        { category: 'platform', key: 'max_withdrawal_amount', value: incomeSettings.max_withdrawal_amount.toString(), description: 'Maximum withdrawal amount in USD' },
      ];

      // Update all settings
      for (const setting of settingsUpdates) {
        await supabase
          .from('system_settings')
          .upsert({
            category: setting.category,
            key: setting.key,
            value: JSON.stringify(setting.value),
            description: setting.description,
            updated_by: admin.id,
          });
      }

      setSuccess('Income settings saved successfully! Changes will be reflected across the platform.');
      setTimeout(() => setSuccess(''), 5000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    } else if (minutes < 1440) {
      return `${Math.round(minutes / 60)} hours`;
    } else {
      return `${Math.round(minutes / 1440)} days`;
    }
  };

  if (!mounted) {
    return null;
  }

  if (!admin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">Please log in as an admin to access this page</p>
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
                Back to Admin
              </Button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Income Distribution Settings</h1>
                <p className="text-sm text-slate-600">Configure all income streams and reward amounts</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={loadIncomeSettings}
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
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="direct">Direct & Level</TabsTrigger>
            <TabsTrigger value="pools">Pool System</TabsTrigger>
            <TabsTrigger value="ranks">Rank System</TabsTrigger>
            <TabsTrigger value="global">Global Turnover</TabsTrigger>
            <TabsTrigger value="team">Team Rewards</TabsTrigger>
            <TabsTrigger value="fees">Fees & Limits</TabsTrigger>
          </TabsList>

          {/* Direct & Level Income Tab */}
          <TabsContent value="direct" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2 text-green-600" />
                    Direct Referral Income
                  </CardTitle>
                  <CardDescription>
                    Configure instant payments for direct referrals
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="direct_referral_bonus">Direct Referral Bonus (USD)</Label>
                    <Input
                      id="direct_referral_bonus"
                      type="number"
                      step="0.01"
                      min="0"
                      value={incomeSettings.direct_referral_bonus}
                      onChange={(e) => setIncomeSettings(prev => ({ ...prev, direct_referral_bonus: parseFloat(e.target.value) || 0 }))}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Amount paid instantly for each direct referral
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="level_income_rate">Level Income Rate (USD)</Label>
                    <Input
                      id="level_income_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={incomeSettings.level_income_rate}
                      onChange={(e) => setIncomeSettings(prev => ({ ...prev, level_income_rate: parseFloat(e.target.value) || 0 }))}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Amount paid per activation across levels 2-7
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="activation_cost">Account Activation Cost (USD)</Label>
                    <Input
                      id="activation_cost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={incomeSettings.activation_cost}
                      onChange={(e) => setIncomeSettings(prev => ({ ...prev, activation_cost: parseFloat(e.target.value) || 0 }))}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Cost for users to activate their account
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                    Income Preview
                  </CardTitle>
                  <CardDescription>
                    Preview of income calculations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-medium text-green-900 mb-2">Direct Referral Example</h4>
                      <p className="text-sm text-green-800">
                        User refers 5 people = <strong>${(incomeSettings.direct_referral_bonus * 5).toFixed(2)}</strong> instant income
                      </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">Level Income Example</h4>
                      <p className="text-sm text-blue-800">
                        10 activations in downline = <strong>${(incomeSettings.level_income_rate * 10).toFixed(2)}</strong> level income
                      </p>
                    </div>

                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <h4 className="font-medium text-purple-900 mb-2">Activation Revenue</h4>
                      <p className="text-sm text-purple-800">
                        100 activations = <strong>${(incomeSettings.activation_cost * 100).toFixed(2)}</strong> platform revenue
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Pool System Tab */}
          <TabsContent value="pools" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="w-5 h-5 mr-2 text-purple-600" />
                    Pool Reward Amounts
                  </CardTitle>
                  <CardDescription>
                    Configure reward amounts for each pool
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="pool_1_amount">Pool 1 Reward (USD)</Label>
                    <Input
                      id="pool_1_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={incomeSettings.pool_1_amount}
                      onChange={(e) => setIncomeSettings(prev => ({ ...prev, pool_1_amount: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="pool_2_amount">Pool 2 Reward (USD)</Label>
                    <Input
                      id="pool_2_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={incomeSettings.pool_2_amount}
                      onChange={(e) => setIncomeSettings(prev => ({ ...prev, pool_2_amount: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="pool_3_amount">Pool 3 Reward (USD)</Label>
                    <Input
                      id="pool_3_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={incomeSettings.pool_3_amount}
                      onChange={(e) => setIncomeSettings(prev => ({ ...prev, pool_3_amount: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="pool_4_amount">Pool 4 Reward (USD)</Label>
                    <Input
                      id="pool_4_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={incomeSettings.pool_4_amount}
                      onChange={(e) => setIncomeSettings(prev => ({ ...prev, pool_4_amount: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-orange-600" />
                    Pool Time Limits
                  </CardTitle>
                  <CardDescription>
                    Configure time limits for each pool (in minutes)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="pool_1_time">Pool 1 Time Limit (minutes)</Label>
                    <Input
                      id="pool_1_time"
                      type="number"
                      min="1"
                      value={incomeSettings.pool_1_time}
                      onChange={(e) => setIncomeSettings(prev => ({ ...prev, pool_1_time: parseInt(e.target.value) || 0 }))}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Current: {formatTime(incomeSettings.pool_1_time)}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="pool_2_time">Pool 2 Time Limit (minutes)</Label>
                    <Input
                      id="pool_2_time"
                      type="number"
                      min="1"
                      value={incomeSettings.pool_2_time}
                      onChange={(e) => setIncomeSettings(prev => ({ ...prev, pool_2_time: parseInt(e.target.value) || 0 }))}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Current: {formatTime(incomeSettings.pool_2_time)}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="pool_3_time">Pool 3 Time Limit (minutes)</Label>
                    <Input
                      id="pool_3_time"
                      type="number"
                      min="1"
                      value={incomeSettings.pool_3_time}
                      onChange={(e) => setIncomeSettings(prev => ({ ...prev, pool_3_time: parseInt(e.target.value) || 0 }))}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Current: {formatTime(incomeSettings.pool_3_time)}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="pool_4_time">Pool 4 Time Limit (minutes)</Label>
                    <Input
                      id="pool_4_time"
                      type="number"
                      min="1"
                      value={incomeSettings.pool_4_time}
                      onChange={(e) => setIncomeSettings(prev => ({ ...prev, pool_4_time: parseInt(e.target.value) || 0 }))}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Current: {formatTime(incomeSettings.pool_4_time)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pool Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calculator className="w-5 h-5 mr-2 text-green-600" />
                  Pool System Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((poolNum) => (
                    <div key={poolNum} className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
                      <h4 className="font-semibold text-purple-900 mb-2">Pool {poolNum}</h4>
                      <div className="space-y-1 text-sm text-purple-800">
                        <p><strong>Reward:</strong> ${incomeSettings[`pool_${poolNum}_amount` as keyof typeof incomeSettings]}</p>
                        <p><strong>Time:</strong> {formatTime(incomeSettings[`pool_${poolNum}_time` as keyof typeof incomeSettings] as number)}</p>
                        <p><strong>Total Possible:</strong> ${(incomeSettings.pool_1_amount + incomeSettings.pool_2_amount + incomeSettings.pool_3_amount + incomeSettings.pool_4_amount).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rank System Tab */}
          <TabsContent value="ranks" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Crown className="w-5 h-5 mr-2 text-yellow-600" />
                    Rank Requirements
                  </CardTitle>
                  <CardDescription>
                    Configure direct referral requirements for each rank
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="gold_referrals">Gold Rank (Direct Referrals)</Label>
                    <Input
                      id="gold_referrals"
                      type="number"
                      min="1"
                      value={incomeSettings.gold_referrals}
                      onChange={(e) => setIncomeSettings(prev => ({ ...prev, gold_referrals: parseInt(e.target.value) || 0 }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="platinum_referrals">Platinum Rank (Direct Referrals)</Label>
                    <Input
                      id="platinum_referrals"
                      type="number"
                      min="1"
                      value={incomeSettings.platinum_referrals}
                      onChange={(e) => setIncomeSettings(prev => ({ ...prev, platinum_referrals: parseInt(e.target.value) || 0 }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="diamond_referrals">Diamond Rank (Direct Referrals)</Label>
                    <Input
                      id="diamond_referrals"
                      type="number"
                      min="1"
                      value={incomeSettings.diamond_referrals}
                      onChange={(e) => setIncomeSettings(prev => ({ ...prev, diamond_referrals: parseInt(e.target.value) || 0 }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="ambassador_referrals">Ambassador Rank (Direct Referrals)</Label>
                    <Input
                      id="ambassador_referrals"
                      type="number"
                      min="1"
                      value={incomeSettings.ambassador_referrals}
                      onChange={(e) => setIncomeSettings(prev => ({ ...prev, ambassador_referrals: parseInt(e.target.value) || 0 }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="ambassador_team_size">Ambassador Rank (Team Size)</Label>
                    <Input
                      id="ambassador_team_size"
                      type="number"
                      min="1"
                      value={incomeSettings.ambassador_team_size}
                      onChange={(e) => setIncomeSettings(prev => ({ ...prev, ambassador_team_size: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Award className="w-5 h-5 mr-2 text-purple-600" />
                    Rank Progression
                  </CardTitle>
                  <CardDescription>
                    Visual representation of rank requirements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { name: 'Starter', referrals: 0, color: 'gray' },
                      { name: 'Gold', referrals: incomeSettings.gold_referrals, color: 'yellow' },
                      { name: 'Platinum', referrals: incomeSettings.platinum_referrals, color: 'gray' },
                      { name: 'Diamond', referrals: incomeSettings.diamond_referrals, color: 'blue' },
                      { name: 'Ambassador', referrals: incomeSettings.ambassador_referrals, color: 'purple' }
                    ].map((rank, index) => (
                      <div key={rank.name} className={`bg-${rank.color}-50 border border-${rank.color}-200 rounded-lg p-3`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Crown className={`w-4 h-4 text-${rank.color}-600`} />
                            <span className={`font-semibold text-${rank.color}-900`}>{rank.name}</span>
                          </div>
                          <div className={`text-sm text-${rank.color}-700`}>
                            {rank.name === 'Ambassador' 
                              ? `${rank.referrals} referrals + ${incomeSettings.ambassador_team_size} team`
                              : `${rank.referrals} referrals`
                            }
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Global Turnover Tab */}
          <TabsContent value="global" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Globe className="w-5 h-5 mr-2 text-teal-600" />
                    Global Turnover Settings
                  </CardTitle>
                  <CardDescription>
                    Configure global turnover eligibility and percentages
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="global_turnover_11_days">11 Referrals Time Limit (days)</Label>
                    <Input
                      id="global_turnover_11_days"
                      type="number"
                      min="1"
                      value={incomeSettings.global_turnover_11_days}
                      onChange={(e) => setIncomeSettings(prev => ({ ...prev, global_turnover_11_days: parseInt(e.target.value) || 0 }))}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Days to achieve 11 referrals for 1% turnover eligibility
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="global_turnover_21_days">21 Referrals Time Limit (days)</Label>
                    <Input
                      id="global_turnover_21_days"
                      type="number"
                      min="1"
                      value={incomeSettings.global_turnover_21_days}
                      onChange={(e) => setIncomeSettings(prev => ({ ...prev, global_turnover_21_days: parseInt(e.target.value) || 0 }))}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Days to achieve 21 referrals for 2% turnover eligibility
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="global_turnover_1_percent">1% Turnover Rate</Label>
                    <Input
                      id="global_turnover_1_percent"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={incomeSettings.global_turnover_1_percent}
                      onChange={(e) => setIncomeSettings(prev => ({ ...prev, global_turnover_1_percent: parseFloat(e.target.value) || 0 }))}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Percentage of global turnover for 11+ referrals
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="global_turnover_2_percent">2% Turnover Rate</Label>
                    <Input
                      id="global_turnover_2_percent"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={incomeSettings.global_turnover_2_percent}
                      onChange={(e) => setIncomeSettings(prev => ({ ...prev, global_turnover_2_percent: parseFloat(e.target.value) || 0 }))}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Percentage of global turnover for 21+ referrals
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                    Turnover Examples
                  </CardTitle>
                  <CardDescription>
                    Example calculations for global turnover income
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                      <h4 className="font-medium text-teal-900 mb-2">1% Turnover Example</h4>
                      <p className="text-sm text-teal-800 mb-2">
                        Requirements: {incomeSettings.global_turnover_11_days} referrals in {incomeSettings.global_turnover_11_days} days
                      </p>
                      <p className="text-sm text-teal-800">
                        Daily turnover $10,000 = <strong>${(10000 * incomeSettings.global_turnover_1_percent / 100).toFixed(2)}</strong> daily income
                      </p>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-medium text-green-900 mb-2">2% Turnover Example</h4>
                      <p className="text-sm text-green-800 mb-2">
                        Requirements: {incomeSettings.global_turnover_21_days} referrals in {incomeSettings.global_turnover_21_days} days
                      </p>
                      <p className="text-sm text-green-800">
                        Daily turnover $10,000 = <strong>${(10000 * incomeSettings.global_turnover_2_percent / 100).toFixed(2)}</strong> daily income
                      </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">21-Day Period</h4>
                      <p className="text-sm text-blue-800">
                        Eligibility lasts for 21 days from registration date, regardless of achievement level
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Team Rewards Tab */}
          <TabsContent value="team" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Gift className="w-5 h-5 mr-2 text-pink-600" />
                    Fast Track Rewards
                  </CardTitle>
                  <CardDescription>
                    Higher rewards for quick team building achievements
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="team_reward_25_fast">25 Members Fast Track (USD)</Label>
                    <Input
                      id="team_reward_25_fast"
                      type="number"
                      step="0.01"
                      min="0"
                      value={incomeSettings.team_reward_25_fast}
                      onChange={(e) => setIncomeSettings(prev => ({ ...prev, team_reward_25_fast: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="team_reward_50_fast">50 Members Fast Track (USD)</Label>
                    <Input
                      id="team_reward_50_fast"
                      type="number"
                      step="0.01"
                      min="0"
                      value={incomeSettings.team_reward_50_fast}
                      onChange={(e) => setIncomeSettings(prev => ({ ...prev, team_reward_50_fast: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="team_reward_100_fast">100 Members Fast Track (USD)</Label>
                    <Input
                      id="team_reward_100_fast"
                      type="number"
                      step="0.01"
                      min="0"
                      value={incomeSettings.team_reward_100_fast}
                      onChange={(e) => setIncomeSettings(prev => ({ ...prev, team_reward_100_fast: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Coins className="w-5 h-5 mr-2 text-blue-600" />
                    Standard Rewards
                  </CardTitle>
                  <CardDescription>
                    Standard rewards with extended time limits
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="team_reward_25_standard">25 Members Standard (USD)</Label>
                    <Input
                      id="team_reward_25_standard"
                      type="number"
                      step="0.01"
                      min="0"
                      value={incomeSettings.team_reward_25_standard}
                      onChange={(e) => setIncomeSettings(prev => ({ ...prev, team_reward_25_standard: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="team_reward_50_standard">50 Members Standard (USD)</Label>
                    <Input
                      id="team_reward_50_standard"
                      type="number"
                      step="0.01"
                      min="0"
                      value={incomeSettings.team_reward_50_standard}
                      onChange={(e) => setIncomeSettings(prev => ({ ...prev, team_reward_50_standard: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="team_reward_100_standard">100 Members Standard (USD)</Label>
                    <Input
                      id="team_reward_100_standard"
                      type="number"
                      step="0.01"
                      min="0"
                      value={incomeSettings.team_reward_100_standard}
                      onChange={(e) => setIncomeSettings(prev => ({ ...prev, team_reward_100_standard: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Team Rewards Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calculator className="w-5 h-5 mr-2 text-purple-600" />
                  Team Rewards Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[25, 50, 100].map((size) => (
                    <div key={size} className="bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200 rounded-lg p-4">
                      <h4 className="font-semibold text-pink-900 mb-3">{size} Team Members</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-pink-700">Fast Track:</span>
                          <span className="font-semibold text-pink-900">
                            ${incomeSettings[`team_reward_${size}_fast` as keyof typeof incomeSettings]}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-pink-700">Standard:</span>
                          <span className="font-semibold text-pink-900">
                            ${incomeSettings[`team_reward_${size}_standard` as keyof typeof incomeSettings]}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-pink-200 pt-2">
                          <span className="text-pink-700">Difference:</span>
                          <span className="font-semibold text-green-700">
                            +${((incomeSettings[`team_reward_${size}_fast` as keyof typeof incomeSettings] as number) - 
                                (incomeSettings[`team_reward_${size}_standard` as keyof typeof incomeSettings] as number)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fees & Limits Tab */}
          <TabsContent value="fees" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="w-5 h-5 mr-2 text-red-600" />
                    Fee Structure
                  </CardTitle>
                  <CardDescription>
                    Configure platform fees and charges
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="withdrawal_fee_percentage">Withdrawal Fee (%)</Label>
                    <Input
                      id="withdrawal_fee_percentage"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={incomeSettings.withdrawal_fee_percentage}
                      onChange={(e) => setIncomeSettings(prev => ({ ...prev, withdrawal_fee_percentage: parseFloat(e.target.value) || 0 }))}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Percentage fee charged on withdrawals
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="main_to_fund_transfer_fee">Main to Fund Transfer Fee (%)</Label>
                    <Input
                      id="main_to_fund_transfer_fee"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={incomeSettings.main_to_fund_transfer_fee}
                      onChange={(e) => setIncomeSettings(prev => ({ ...prev, main_to_fund_transfer_fee: parseFloat(e.target.value) || 0 }))}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Percentage fee for transferring from main to fund wallet
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="w-5 h-5 mr-2 text-slate-600" />
                    Platform Limits
                  </CardTitle>
                  <CardDescription>
                    Configure minimum and maximum transaction amounts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="min_withdrawal_amount">Minimum Withdrawal (USD)</Label>
                    <Input
                      id="min_withdrawal_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={incomeSettings.min_withdrawal_amount}
                      onChange={(e) => setIncomeSettings(prev => ({ ...prev, min_withdrawal_amount: parseFloat(e.target.value) || 0 }))}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Minimum amount users can withdraw
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="max_withdrawal_amount">Maximum Withdrawal (USD)</Label>
                    <Input
                      id="max_withdrawal_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={incomeSettings.max_withdrawal_amount}
                      onChange={(e) => setIncomeSettings(prev => ({ ...prev, max_withdrawal_amount: parseFloat(e.target.value) || 0 }))}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Maximum amount users can withdraw at once
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Fee Examples */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calculator className="w-5 h-5 mr-2 text-blue-600" />
                  Fee Calculation Examples
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-semibold text-red-900 mb-2">Withdrawal Example</h4>
                    <div className="space-y-1 text-sm text-red-800">
                      <p>Withdrawal: $100.00</p>
                      <p>Fee ({incomeSettings.withdrawal_fee_percentage}%): ${(100 * incomeSettings.withdrawal_fee_percentage / 100).toFixed(2)}</p>
                      <p className="font-semibold">Net Amount: ${(100 - (100 * incomeSettings.withdrawal_fee_percentage / 100)).toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="font-semibold text-orange-900 mb-2">Transfer Example</h4>
                    <div className="space-y-1 text-sm text-orange-800">
                      <p>Transfer: $100.00</p>
                      <p>Fee ({incomeSettings.main_to_fund_transfer_fee}%): ${(100 * incomeSettings.main_to_fund_transfer_fee / 100).toFixed(2)}</p>
                      <p className="font-semibold">Net Amount: ${(100 - (100 * incomeSettings.main_to_fund_transfer_fee / 100)).toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Withdrawal Limits</h4>
                    <div className="space-y-1 text-sm text-blue-800">
                      <p>Minimum: ${incomeSettings.min_withdrawal_amount.toFixed(2)}</p>
                      <p>Maximum: ${incomeSettings.max_withdrawal_amount.toFixed(2)}</p>
                      <p className="font-semibold">Valid Range: ${incomeSettings.min_withdrawal_amount.toFixed(2)} - ${incomeSettings.max_withdrawal_amount.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save All Settings
          </Button>
        </div>

        {/* Information Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-900">
              <AlertCircle className="w-5 h-5 mr-2" />
              Important Information
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 text-sm space-y-2">
            <p>• <strong>System-Wide Impact:</strong> Changes to these settings affect all users and income calculations</p>
            <p>• <strong>Existing Users:</strong> Changes will apply to all future transactions but won't affect past earnings</p>
            <p>• <strong>Pool System:</strong> Changing pool amounts or time limits affects all active and future pools</p>
            <p>• <strong>Rank Requirements:</strong> Users will be automatically promoted/demoted based on new requirements</p>
            <p>• <strong>Fee Structure:</strong> Fee changes apply immediately to all new transactions</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}