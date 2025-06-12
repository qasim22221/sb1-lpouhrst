"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  X,
  User,
  Wallet,
  Activity,
  Settings,
  Save,
  AlertCircle,
  CheckCircle,
  Loader2,
  Eye,
  EyeOff,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Crown,
  Users,
  DollarSign,
  TrendingUp,
  Target,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  rank: string;
  account_status: string;
  main_wallet_balance: number;
  fund_wallet_balance: number;
  total_direct_referrals: number;
  active_direct_referrals: number;
  current_pool: number;
  referral_code: string;
  referred_by?: string;
  created_at: string;
  activation_date?: string;
  cycle_completed_at?: string;
}

interface UserProfileModalProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedUser: UserProfile) => void;
}

export function UserProfileModal({ user, isOpen, onClose, onUpdate }: UserProfileModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  const [showBalances, setShowBalances] = useState(true);

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    rank: '',
    account_status: '',
  });

  // Balance adjustment states
  const [balanceAdjustment, setBalanceAdjustment] = useState({
    wallet_type: 'main',
    amount: '',
    reason: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        email: user.email,
        rank: user.rank,
        account_status: user.account_status,
      });
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user) return;

    setIsLoading(true);
    setError('');

    try {
      // Update user profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username: formData.username,
          email: formData.email,
          rank: formData.rank,
          account_status: formData.account_status,
        })
        .eq('id', user.id);

      if (updateError) {
        throw new Error(`Failed to update profile: ${updateError.message}`);
      }

      // Update local state
      const updatedUser = {
        ...user,
        username: formData.username,
        email: formData.email,
        rank: formData.rank,
        account_status: formData.account_status,
      };

      onUpdate(updatedUser);
      setSuccess('Profile updated successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBalanceAdjustment = async () => {
    if (!user || !balanceAdjustment.amount || !balanceAdjustment.reason) {
      setError('Please fill in all balance adjustment fields');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const amount = parseFloat(balanceAdjustment.amount);
      if (isNaN(amount)) {
        throw new Error('Invalid amount');
      }

      // Call admin balance adjustment function
      const { data, error } = await supabase.rpc('admin_update_user_balance', {
        admin_id_param: 'current-admin-id', // This would be the current admin's ID
        user_id_param: user.id,
        wallet_type_param: balanceAdjustment.wallet_type,
        amount_param: amount,
        reason_param: balanceAdjustment.reason,
      });

      if (error) {
        throw new Error(`Failed to adjust balance: ${error.message}`);
      }

      // Update local state
      const updatedUser = {
        ...user,
        main_wallet_balance: balanceAdjustment.wallet_type === 'main' 
          ? data.new_balance 
          : user.main_wallet_balance,
        fund_wallet_balance: balanceAdjustment.wallet_type === 'fund' 
          ? data.new_balance 
          : user.fund_wallet_balance,
      };

      onUpdate(updatedUser);
      setBalanceAdjustment({
        wallet_type: 'main',
        amount: '',
        reason: '',
      });
      setSuccess(`Balance adjusted successfully! New balance: $${data.new_balance}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getRankBadge = (rank: string) => {
    const colors = {
      'Starter': 'bg-gray-100 text-gray-800',
      'Gold': 'bg-yellow-100 text-yellow-800',
      'Platinum': 'bg-gray-200 text-gray-800',
      'Diamond': 'bg-blue-100 text-blue-800',
      'Ambassador': 'bg-purple-100 text-purple-800'
    };
    return (
      <Badge className={colors[rank as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        <Crown className="w-3 h-3 mr-1" />
        {rank}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      'active': 'bg-green-100 text-green-800',
      'inactive': 'bg-red-100 text-red-800',
      'pending': 'bg-yellow-100 text-yellow-800'
    };
    return (
      <Badge className={colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              User Profile: {user.username}
            </CardTitle>
            <CardDescription>
              Manage user account details and settings
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>

        <CardContent>
          {/* Status Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2 mb-4">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start space-x-2 mb-4">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="wallets">Wallets</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                        className="bg-white border-gray-200"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="bg-white border-gray-200"
                      />
                    </div>

                    <div>
                      <Label htmlFor="rank">Rank</Label>
                      <select
                        id="rank"
                        value={formData.rank}
                        onChange={(e) => setFormData(prev => ({ ...prev, rank: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        <option value="Starter">Starter</option>
                        <option value="Gold">Gold</option>
                        <option value="Platinum">Platinum</option>
                        <option value="Diamond">Diamond</option>
                        <option value="Ambassador">Ambassador</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="account_status">Account Status</Label>
                      <select
                        id="account_status"
                        value={formData.account_status}
                        onChange={(e) => setFormData(prev => ({ ...prev, account_status: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>

                    <Button
                      onClick={handleUpdateProfile}
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Update Profile
                    </Button>
                  </CardContent>
                </Card>

                {/* Account Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Account Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">User ID:</span>
                        <p className="font-mono text-xs">{user.id.substring(0, 8)}...</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Referral Code:</span>
                        <p className="font-mono">{user.referral_code}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Current Rank:</span>
                        <div className="mt-1">{getRankBadge(user.rank)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Status:</span>
                        <div className="mt-1">{getStatusBadge(user.account_status)}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Current Pool:</span>
                        <p>{user.current_pool || 'None'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Direct Referrals:</span>
                        <p>{user.total_direct_referrals} ({user.active_direct_referrals} active)</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Joined:</span>
                        <p>{new Date(user.created_at).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Activated:</span>
                        <p>{user.activation_date ? new Date(user.activation_date).toLocaleDateString() : 'Not activated'}</p>
                      </div>
                    </div>

                    {user.referred_by && (
                      <div className="pt-4 border-t border-gray-200">
                        <span className="font-medium text-gray-600">Referred By:</span>
                        <p className="font-mono">{user.referred_by}</p>
                      </div>
                    )}

                    {user.cycle_completed_at && (
                      <div className="pt-4 border-t border-gray-200">
                        <span className="font-medium text-gray-600">Cycle Completed:</span>
                        <p>{new Date(user.cycle_completed_at).toLocaleDateString()}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Wallets Tab */}
            <TabsContent value="wallets" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current Balances */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-lg">Current Balances</CardTitle>
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
                            {showBalances ? `$${user.main_wallet_balance.toFixed(2)}` : '••••'}
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
                            {showBalances ? `$${user.fund_wallet_balance.toFixed(2)}` : '••••'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">Total Balance</h3>
                          <p className="text-gray-700 text-sm">Combined Wallets</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">
                            {showBalances ? `$${(user.main_wallet_balance + user.fund_wallet_balance).toFixed(2)}` : '••••'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Balance Adjustment */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Balance Adjustment</CardTitle>
                    <CardDescription>
                      Adjust user wallet balances with audit trail
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="wallet_type">Wallet Type</Label>
                      <select
                        id="wallet_type"
                        value={balanceAdjustment.wallet_type}
                        onChange={(e) => setBalanceAdjustment(prev => ({ ...prev, wallet_type: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        <option value="main">Main Wallet</option>
                        <option value="fund">Fund Wallet</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="amount">Amount (can be negative)</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={balanceAdjustment.amount}
                        onChange={(e) => setBalanceAdjustment(prev => ({ ...prev, amount: e.target.value }))}
                        className="bg-white border-gray-200"
                      />
                    </div>

                    <div>
                      <Label htmlFor="reason">Reason for Adjustment</Label>
                      <Input
                        id="reason"
                        placeholder="Enter reason for balance adjustment"
                        value={balanceAdjustment.reason}
                        onChange={(e) => setBalanceAdjustment(prev => ({ ...prev, reason: e.target.value }))}
                        className="bg-white border-gray-200"
                      />
                    </div>

                    <Button
                      onClick={handleBalanceAdjustment}
                      disabled={isLoading || !balanceAdjustment.amount || !balanceAdjustment.reason}
                      className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <DollarSign className="w-4 h-4 mr-2" />
                      )}
                      Adjust Balance
                    </Button>

                    <div className="text-xs text-gray-500 bg-yellow-50 border border-yellow-200 rounded p-2">
                      <strong>Warning:</strong> Balance adjustments are permanent and will be logged for audit purposes.
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                  <CardDescription>
                    User's recent transactions and activities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>Activity tracking will be implemented with real transaction data</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Account Settings</CardTitle>
                  <CardDescription>
                    Advanced account management options
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <Settings className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>Advanced settings will be implemented based on requirements</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}