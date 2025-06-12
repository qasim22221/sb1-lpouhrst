"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings,
  Save,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Wallet,
  DollarSign,
  Globe,
  Bell,
  Lock,
  Mail,
  Smartphone,
  Shield,
  Database,
  Server,
  Clock,
  Users,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface SystemSetting {
  id: string;
  category: string;
  key: string;
  value: string;
  description: string;
  is_public: boolean;
  updated_by?: string;
  updated_at: string;
}

export default function AdminSettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [activeTab, setActiveTab] = useState('platform');
  
  const { admin } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    if (admin) {
      loadSystemSettings();
    }
  }, [admin]);

  const loadSystemSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('category', { ascending: true })
        .order('key', { ascending: true });

      if (error) {
        throw new Error(`Failed to load settings: ${error.message}`);
      }

      setSettings(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getSetting = (category: string, key: string): string => {
    const setting = settings.find(s => s.category === category && s.key === key);
    if (!setting) return '';
    
    try {
      return JSON.parse(setting.value);
    } catch (e) {
      return setting.value;
    }
  };

  const updateSetting = (category: string, key: string, value: string | boolean | number) => {
    setSettings(prev => 
      prev.map(setting => 
        setting.category === category && setting.key === key
          ? { ...setting, value: JSON.stringify(value.toString()) }
          : setting
      )
    );
  };

  const handleSaveSettings = async () => {
    if (!admin) return;

    setIsSaving(true);
    setError('');

    try {
      // Update all settings
      for (const setting of settings) {
        const { error } = await supabase
          .from('system_settings')
          .update({
            value: setting.value,
            updated_by: admin.id,
          })
          .eq('id', setting.id);

        if (error) {
          throw new Error(`Failed to update setting ${setting.key}: ${error.message}`);
        }
      }

      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'platform': return Globe;
      case 'wallet': return Wallet;
      case 'income': return DollarSign;
      case 'fees': return DollarSign;
      case 'notifications': return Bell;
      case 'security': return Lock;
      case 'analytics': return RefreshCw;
      case 'rewards': return DollarSign;
      case 'global': return Globe;
      default: return Settings;
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">System Settings</h1>
            <p className="text-slate-600">Configure platform-wide settings and parameters</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={loadSystemSettings}
              variant="outline"
              disabled={isLoading}
              className="border-blue-200 hover:bg-blue-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={() => router.push('/admin/master-wallet')}
              variant="outline"
              className="border-purple-200 hover:bg-purple-50 text-purple-700"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Master Wallet
            </Button>
            <Button
              onClick={() => router.push('/admin/income-settings')}
              variant="outline"
              className="border-green-200 hover:bg-green-50 text-green-700"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Income Settings
            </Button>
            <Button
              onClick={() => router.push('/admin/sweep-settings')}
              variant="outline"
              className="border-blue-200 hover:bg-blue-50 text-blue-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Sweep Settings
            </Button>
          </div>
        </div>

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

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
            <TabsTrigger value="platform">Platform</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="specialized">Specialized</TabsTrigger>
          </TabsList>

          {/* Platform Settings Tab */}
          <TabsContent value="platform" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="w-5 h-5 mr-2 text-blue-600" />
                  Platform Settings
                </CardTitle>
                <CardDescription>
                  Core platform configuration and feature flags
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="maintenance_mode">Maintenance Mode</Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="maintenance_mode"
                            checked={getSetting('platform', 'maintenance_mode') === 'true'}
                            onChange={(e) => updateSetting('platform', 'maintenance_mode', e.target.checked)}
                            className="rounded border-slate-300"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        When enabled, the platform will be in maintenance mode and users will see a maintenance page
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="registration_enabled">Registration Enabled</Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="registration_enabled"
                            checked={getSetting('platform', 'registration_enabled') === 'true'}
                            onChange={(e) => updateSetting('platform', 'registration_enabled', e.target.checked)}
                            className="rounded border-slate-300"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        When disabled, new user registrations will be blocked
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="p2p_transfer_enabled">P2P Transfers</Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="p2p_transfer_enabled"
                            checked={getSetting('platform', 'p2p_transfer_enabled') === 'true'}
                            onChange={(e) => updateSetting('platform', 'p2p_transfer_enabled', e.target.checked)}
                            className="rounded border-slate-300"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        Enable or disable peer-to-peer transfers between users
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="pool_system_enabled">Pool System</Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="pool_system_enabled"
                            checked={getSetting('platform', 'pool_system_enabled') === 'true'}
                            onChange={(e) => updateSetting('platform', 'pool_system_enabled', e.target.checked)}
                            className="rounded border-slate-300"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        Enable or disable the progressive pool reward system
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="min_withdrawal_amount">Minimum Withdrawal (USD)</Label>
                      <Input
                        id="min_withdrawal_amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={getSetting('platform', 'min_withdrawal_amount')}
                        onChange={(e) => updateSetting('platform', 'min_withdrawal_amount', parseFloat(e.target.value) || 0)}
                        className="bg-white border-slate-200"
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
                        value={getSetting('platform', 'max_withdrawal_amount')}
                        onChange={(e) => updateSetting('platform', 'max_withdrawal_amount', parseFloat(e.target.value) || 0)}
                        className="bg-white border-slate-200"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Maximum amount users can withdraw at once
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lock className="w-5 h-5 mr-2 text-red-600" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Configure security parameters and access controls
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="max_login_attempts">Maximum Login Attempts</Label>
                      <Input
                        id="max_login_attempts"
                        type="number"
                        min="1"
                        max="10"
                        value={getSetting('security', 'max_login_attempts')}
                        onChange={(e) => updateSetting('security', 'max_login_attempts', parseInt(e.target.value) || 5)}
                        className="bg-white border-slate-200"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Number of failed login attempts before account is temporarily locked
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="session_timeout_hours">Admin Session Timeout (hours)</Label>
                      <Input
                        id="session_timeout_hours"
                        type="number"
                        min="1"
                        max="72"
                        value={getSetting('security', 'session_timeout_hours')}
                        onChange={(e) => updateSetting('security', 'session_timeout_hours', parseInt(e.target.value) || 24)}
                        className="bg-white border-slate-200"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        How long admin sessions remain active before requiring re-login
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="require_email_verification">Require Email Verification</Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="require_email_verification"
                            checked={getSetting('security', 'require_email_verification') === 'true'}
                            onChange={(e) => updateSetting('security', 'require_email_verification', e.target.checked)}
                            className="rounded border-slate-300"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        Require email verification before users can access their accounts
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="require_transaction_pin">Require Transaction PIN</Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="require_transaction_pin"
                            checked={getSetting('security', 'require_transaction_pin') === 'true'}
                            onChange={(e) => updateSetting('security', 'require_transaction_pin', e.target.checked)}
                            className="rounded border-slate-300"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        Require PIN for withdrawals and sensitive operations
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="ip_restriction_enabled">IP Restriction</Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="ip_restriction_enabled"
                            checked={getSetting('security', 'ip_restriction_enabled') === 'true'}
                            onChange={(e) => updateSetting('security', 'ip_restriction_enabled', e.target.checked)}
                            className="rounded border-slate-300"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        Restrict admin access to specific IP addresses
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="allowed_ips">Allowed Admin IPs</Label>
                      <Input
                        id="allowed_ips"
                        placeholder="Comma-separated IPs (e.g., 192.168.1.1,10.0.0.1)"
                        value={getSetting('security', 'allowed_ips')}
                        onChange={(e) => updateSetting('security', 'allowed_ips', e.target.value)}
                        className="bg-white border-slate-200"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        List of IP addresses allowed to access admin panel (if IP restriction enabled)
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Settings Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="w-5 h-5 mr-2 text-orange-600" />
                  Notification Settings
                </CardTitle>
                <CardDescription>
                  Configure system notifications and alerts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="email_notifications">Email Notifications</Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="email_notifications"
                            checked={getSetting('notifications', 'email_notifications') === 'true'}
                            onChange={(e) => updateSetting('notifications', 'email_notifications', e.target.checked)}
                            className="rounded border-slate-300"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        Send email notifications for important events
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="sms_notifications">SMS Notifications</Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="sms_notifications"
                            checked={getSetting('notifications', 'sms_notifications') === 'true'}
                            onChange={(e) => updateSetting('notifications', 'sms_notifications', e.target.checked)}
                            className="rounded border-slate-300"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        Send SMS notifications for critical events
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="admin_email">Admin Email</Label>
                      <Input
                        id="admin_email"
                        type="email"
                        placeholder="admin@example.com"
                        value={getSetting('notifications', 'admin_email')}
                        onChange={(e) => updateSetting('notifications', 'admin_email', e.target.value)}
                        className="bg-white border-slate-200"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Email address for system alerts and notifications
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="withdrawal_notifications">Withdrawal Notifications</Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="withdrawal_notifications"
                            checked={getSetting('notifications', 'withdrawal_notifications') === 'true'}
                            onChange={(e) => updateSetting('notifications', 'withdrawal_notifications', e.target.checked)}
                            className="rounded border-slate-300"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        Send notifications for new withdrawal requests
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="deposit_notifications">Deposit Notifications</Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="deposit_notifications"
                            checked={getSetting('notifications', 'deposit_notifications') === 'true'}
                            onChange={(e) => updateSetting('notifications', 'deposit_notifications', e.target.checked)}
                            className="rounded border-slate-300"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        Send notifications for new deposits
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="security_alerts">Security Alerts</Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="security_alerts"
                            checked={getSetting('notifications', 'security_alerts') === 'true'}
                            onChange={(e) => updateSetting('notifications', 'security_alerts', e.target.checked)}
                            className="rounded border-slate-300"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        Send alerts for suspicious activities and security events
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Settings Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <RefreshCw className="w-5 h-5 mr-2 text-green-600" />
                  Analytics Settings
                </CardTitle>
                <CardDescription>
                  Configure analytics and tracking options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="track_user_activity">Track User Activity</Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="track_user_activity"
                            checked={getSetting('analytics', 'track_user_activity') === 'true'}
                            onChange={(e) => updateSetting('analytics', 'track_user_activity', e.target.checked)}
                            className="rounded border-slate-300"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        Track user activity for analytics and reporting
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="store_user_ip">Store User IP</Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="store_user_ip"
                            checked={getSetting('analytics', 'store_user_ip') === 'true'}
                            onChange={(e) => updateSetting('analytics', 'store_user_ip', e.target.checked)}
                            className="rounded border-slate-300"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        Store user IP addresses for security and analytics
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="enable_performance_tracking">Performance Tracking</Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="enable_performance_tracking"
                            checked={getSetting('analytics', 'enable_performance_tracking') === 'true'}
                            onChange={(e) => updateSetting('analytics', 'enable_performance_tracking', e.target.checked)}
                            className="rounded border-slate-300"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        Track system performance metrics
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="data_retention_days">Data Retention (days)</Label>
                      <Input
                        id="data_retention_days"
                        type="number"
                        min="1"
                        max="365"
                        value={getSetting('analytics', 'data_retention_days')}
                        onChange={(e) => updateSetting('analytics', 'data_retention_days', parseInt(e.target.value) || 30)}
                        className="bg-white border-slate-200"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Number of days to retain detailed analytics data
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="enable_export">Enable Data Export</Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="enable_export"
                            checked={getSetting('analytics', 'enable_export') === 'true'}
                            onChange={(e) => updateSetting('analytics', 'enable_export', e.target.checked)}
                            className="rounded border-slate-300"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        Allow exporting analytics data
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="anonymize_data">Anonymize Data</Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="anonymize_data"
                            checked={getSetting('analytics', 'anonymize_data') === 'true'}
                            onChange={(e) => updateSetting('analytics', 'anonymize_data', e.target.checked)}
                            className="rounded border-slate-300"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        Anonymize personal data in analytics
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Settings Tab */}
          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Server className="w-5 h-5 mr-2 text-purple-600" />
                  Advanced System Settings
                </CardTitle>
                <CardDescription>
                  Configure advanced system parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="database_backup_frequency">Database Backup Frequency (hours)</Label>
                      <Input
                        id="database_backup_frequency"
                        type="number"
                        min="1"
                        max="168"
                        value={getSetting('advanced', 'database_backup_frequency')}
                        onChange={(e) => updateSetting('advanced', 'database_backup_frequency', parseInt(e.target.value) || 24)}
                        className="bg-white border-slate-200"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        How often to backup the database (in hours)
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="log_retention_days">Log Retention (days)</Label>
                      <Input
                        id="log_retention_days"
                        type="number"
                        min="1"
                        max="365"
                        value={getSetting('advanced', 'log_retention_days')}
                        onChange={(e) => updateSetting('advanced', 'log_retention_days', parseInt(e.target.value) || 30)}
                        className="bg-white border-slate-200"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Number of days to retain system logs
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="debug_mode">Debug Mode</Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="debug_mode"
                            checked={getSetting('advanced', 'debug_mode') === 'true'}
                            onChange={(e) => updateSetting('advanced', 'debug_mode', e.target.checked)}
                            className="rounded border-slate-300"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        Enable detailed logging and debugging information
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="api_rate_limit">API Rate Limit (requests/minute)</Label>
                      <Input
                        id="api_rate_limit"
                        type="number"
                        min="10"
                        max="1000"
                        value={getSetting('advanced', 'api_rate_limit')}
                        onChange={(e) => updateSetting('advanced', 'api_rate_limit', parseInt(e.target.value) || 60)}
                        className="bg-white border-slate-200"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Maximum API requests per minute per user
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="cache_ttl">Cache TTL (seconds)</Label>
                      <Input
                        id="cache_ttl"
                        type="number"
                        min="0"
                        max="86400"
                        value={getSetting('advanced', 'cache_ttl')}
                        onChange={(e) => updateSetting('advanced', 'cache_ttl', parseInt(e.target.value) || 300)}
                        className="bg-white border-slate-200"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Time to live for cached data (0 to disable caching)
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="enable_websockets">Enable WebSockets</Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="enable_websockets"
                            checked={getSetting('advanced', 'enable_websockets') === 'true'}
                            onChange={(e) => updateSetting('advanced', 'enable_websockets', e.target.checked)}
                            className="rounded border-slate-300"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        Enable real-time updates via WebSockets
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Specialized Settings Tab */}
          <TabsContent value="specialized" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-slate-600" />
                  Specialized Settings
                </CardTitle>
                <CardDescription>
                  Configure specialized system parameters
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-blue-50 border-blue-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-blue-900 text-lg">Master Wallet</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-blue-700 mb-4">
                          Configure the master wallet for gas distribution and USDT collection
                        </p>
                        <Button
                          onClick={() => router.push('/admin/master-wallet')}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Wallet className="w-4 h-4 mr-2" />
                          Configure Master Wallet
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="bg-green-50 border-green-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-green-900 text-lg">Income Settings</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-green-700 mb-4">
                          Configure all income streams and reward amounts
                        </p>
                        <Button
                          onClick={() => router.push('/admin/income-settings')}
                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                        >
                          <DollarSign className="w-4 h-4 mr-2" />
                          Configure Income Settings
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="bg-purple-50 border-purple-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-purple-900 text-lg">Sweep Settings</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-purple-700 mb-4">
                          Manage automatic USDT sweeping from user wallets
                        </p>
                        <Button
                          onClick={() => router.push('/admin/sweep-settings')}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Configure Sweep Settings
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-900 mb-2 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Important Note
                    </h4>
                    <p className="text-sm text-yellow-800">
                      The specialized settings pages provide more detailed configuration options for specific system components. 
                      Changes made on those pages will be reflected across the entire platform and may affect user experience.
                    </p>
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
              <Shield className="w-5 h-5 mr-2" />
              Settings Information
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 text-sm space-y-2">
            <p>• <strong>System-Wide Impact:</strong> Changes to these settings affect the entire platform</p>
            <p>• <strong>Specialized Settings:</strong> Use the dedicated pages for detailed configuration of specific components</p>
            <p>• <strong>Audit Trail:</strong> All setting changes are logged with the admin who made them</p>
            <p>• <strong>Public vs. Private:</strong> Some settings are visible to users, while others are internal only</p>
            <p>• <strong>Immediate Effect:</strong> Most settings take effect immediately after saving</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}