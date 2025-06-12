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
  Shield,
  Users,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Settings,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader2,
  Crown,
  Lock,
  Unlock,
  UserPlus,
  Key,
  Activity,
  DollarSign,
  Wallet,
  Zap,
  Target,
  Globe,
  BarChart3,
  TrendingUp,
  Clock,
  Percent
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/lib/supabase';

interface AdminUser {
  id: string;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  last_login_at?: string;
  failed_login_attempts: number;
  role: {
    id: string;
    name: string;
    display_name: string;
    permissions: any;
  };
  created_at: string;
}

interface AdminRole {
  id: string;
  name: string;
  display_name: string;
  description: string;
  permissions: any;
  is_active: boolean;
  created_at: string;
}

interface SystemSetting {
  id: string;
  category: string;
  key: string;
  value: any;
  description: string;
  is_public: boolean;
}

interface AdminStats {
  totalAdmins: number;
  activeAdmins: number;
  lockedAdmins: number;
  recentLogins: number;
}

export default function AdminManagementPage() {
  const { admin, hasPermission } = useAdminAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('admins');

  // Data states
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminRoles, setAdminRoles] = useState<AdminRole[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSetting[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats>({
    totalAdmins: 0,
    activeAdmins: 0,
    lockedAdmins: 0,
    recentLogins: 0
  });

  // Form states
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);

  const [newAdmin, setNewAdmin] = useState({
    email: '',
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    role_id: ''
  });

  const [newRole, setNewRole] = useState({
    name: '',
    display_name: '',
    description: '',
    permissions: {
      users: { view: false, create: false, edit: false, delete: false, manage_balances: false },
      finances: { view: false, approve_withdrawals: false, adjust_balances: false, view_reports: false },
      system: { view_settings: false, edit_settings: false, view_logs: false, manage_admins: false },
      analytics: { view_all: false, export_data: false },
      notifications: { create: false, manage: false }
    }
  });

  // System settings states
  const [settingsData, setSettingsData] = useState({
    // Master Wallet Settings
    master_wallet_address: '',
    master_wallet_private_key: '',
    min_bnb_reserve: '1.0',
    gas_distribution_amount: '0.001',
    auto_sweep_enabled: false,
    
    // Sweep Thresholds
    sweep_threshold_high: '100',
    sweep_threshold_medium: '20',
    sweep_threshold_low: '5',
    
    // Income Distribution Settings
    direct_referral_bonus: '5',
    level_income_rate: '0.5',
    pool_1_amount: '5',
    pool_2_amount: '10',
    pool_3_amount: '15',
    pool_4_amount: '27',
    
    // Pool Time Limits (minutes)
    pool_1_time: '30',
    pool_2_time: '1440',
    pool_3_time: '7200',
    pool_4_time: '21600',
    
    // Rank Requirements
    gold_referrals: '1',
    platinum_referrals: '2',
    diamond_referrals: '4',
    ambassador_referrals: '10',
    ambassador_team_size: '50',
    
    // Global Turnover Settings
    global_turnover_11_days: '11',
    global_turnover_21_days: '21',
    global_turnover_1_percent: '1',
    global_turnover_2_percent: '2',
    
    // Team Reward Settings
    team_reward_25_fast: '20',
    team_reward_25_standard: '10',
    team_reward_50_fast: '50',
    team_reward_50_standard: '20',
    team_reward_100_fast: '100',
    team_reward_100_standard: '40',
    
    // Fee Settings
    withdrawal_fee_percentage: '15',
    main_to_fund_transfer_fee: '10',
    activation_cost: '21',
    
    // Platform Settings
    min_withdrawal_amount: '10',
    max_withdrawal_amount: '10000',
    p2p_transfer_enabled: true,
    registration_enabled: true,
    maintenance_mode: false
  });

  useEffect(() => {
    setMounted(true);
    if (admin) {
      loadAllData();
    }
  }, [admin]);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadAdminUsers(),
        loadAdminRoles(),
        loadSystemSettings(),
        loadAdminStats()
      ]);
    } catch (err: any) {
      setError(`Failed to load data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAdminUsers = async () => {
    try {
      // For demo purposes, we'll create mock admin users based on the roles
      // In production, this would query the admin_users table
      const mockAdmins: AdminUser[] = [
        {
          id: '1',
          email: 'admin@referralhub.com',
          username: 'admin',
          first_name: 'System',
          last_name: 'Administrator',
          is_active: true,
          last_login_at: new Date().toISOString(),
          failed_login_attempts: 0,
          role: {
            id: '1',
            name: 'super_admin',
            display_name: 'Super Administrator',
            permissions: adminRoles.find(r => r.name === 'super_admin')?.permissions || {}
          },
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          email: 'subadmin@referralhub.com',
          username: 'subadmin',
          first_name: 'Sub',
          last_name: 'Administrator',
          is_active: true,
          last_login_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          failed_login_attempts: 0,
          role: {
            id: '3',
            name: 'sub_admin',
            display_name: 'Sub Administrator',
            permissions: adminRoles.find(r => r.name === 'sub_admin')?.permissions || {}
          },
          created_at: new Date().toISOString()
        }
      ];

      setAdminUsers(mockAdmins);
    } catch (err: any) {
      console.error('Error loading admin users:', err);
    }
  };

  const loadAdminRoles = async () => {
    try {
      const { data: roles, error } = await supabase
        .from('admin_roles')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to load admin roles: ${error.message}`);
      }

      setAdminRoles(roles || []);
    } catch (err: any) {
      console.error('Error loading admin roles:', err);
    }
  };

  const loadSystemSettings = async () => {
    try {
      const { data: settings, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('category', { ascending: true });

      if (error) {
        throw new Error(`Failed to load system settings: ${error.message}`);
      }

      // Convert settings array to object for easier access
      const settingsObj: any = {};
      (settings || []).forEach(setting => {
        settingsObj[setting.key] = setting.value;
      });

      setSettingsData(prev => ({ ...prev, ...settingsObj }));
      setSystemSettings(settings || []);
    } catch (err: any) {
      console.error('Error loading system settings:', err);
    }
  };

  const loadAdminStats = async () => {
    try {
      // Calculate stats from loaded admin users
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const stats = {
        totalAdmins: adminUsers.length,
        activeAdmins: adminUsers.filter(admin => admin.is_active).length,
        lockedAdmins: adminUsers.filter(admin => admin.failed_login_attempts >= 5).length,
        recentLogins: adminUsers.filter(admin => 
          admin.last_login_at && new Date(admin.last_login_at) > twentyFourHoursAgo
        ).length
      };

      setAdminStats(stats);
    } catch (err: any) {
      console.error('Error calculating admin stats:', err);
    }
  };

  const createAdminUser = async () => {
    if (!newAdmin.email || !newAdmin.username || !newAdmin.password || !newAdmin.role_id) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      // In production, this would call the create_admin_user function
      const selectedRole = adminRoles.find(r => r.id === newAdmin.role_id);
      
      const mockNewAdmin: AdminUser = {
        id: Date.now().toString(),
        email: newAdmin.email,
        username: newAdmin.username,
        first_name: newAdmin.first_name,
        last_name: newAdmin.last_name,
        is_active: true,
        last_login_at: undefined,
        failed_login_attempts: 0,
        role: {
          id: selectedRole?.id || '',
          name: selectedRole?.name || '',
          display_name: selectedRole?.display_name || '',
          permissions: selectedRole?.permissions || {}
        },
        created_at: new Date().toISOString()
      };

      setAdminUsers(prev => [...prev, mockNewAdmin]);
      setNewAdmin({
        email: '',
        username: '',
        password: '',
        first_name: '',
        last_name: '',
        role_id: ''
      });
      setShowCreateAdmin(false);
      setSuccess('Admin user created successfully!');
      
      await loadAdminStats();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const createAdminRole = async () => {
    if (!newRole.name || !newRole.display_name) {
      setError('Please fill in role name and display name');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_roles')
        .insert({
          name: newRole.name,
          display_name: newRole.display_name,
          description: newRole.description,
          permissions: newRole.permissions
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create role: ${error.message}`);
      }

      setAdminRoles(prev => [...prev, data]);
      setNewRole({
        name: '',
        display_name: '',
        description: '',
        permissions: {
          users: { view: false, create: false, edit: false, delete: false, manage_balances: false },
          finances: { view: false, approve_withdrawals: false, adjust_balances: false, view_reports: false },
          system: { view_settings: false, edit_settings: false, view_logs: false, manage_admins: false },
          analytics: { view_all: false, export_data: false },
          notifications: { create: false, manage: false }
        }
      });
      setShowCreateRole(false);
      setSuccess('Admin role created successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSystemSettings = async () => {
    setIsLoading(true);
    try {
      // Update each setting in the database
      const settingsToUpdate = Object.entries(settingsData);
      
      for (const [key, value] of settingsToUpdate) {
        const { error } = await supabase
          .from('system_settings')
          .upsert({
            category: getCategoryForSetting(key),
            key: key,
            value: value,
            description: getDescriptionForSetting(key),
            is_public: false
          });

        if (error) {
          throw new Error(`Failed to update ${key}: ${error.message}`);
        }
      }

      setSuccess('System settings updated successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryForSetting = (key: string): string => {
    if (key.includes('wallet') || key.includes('sweep')) return 'wallet';
    if (key.includes('pool') || key.includes('referral') || key.includes('level')) return 'income';
    if (key.includes('rank') || key.includes('team')) return 'rewards';
    if (key.includes('fee') || key.includes('withdrawal')) return 'fees';
    if (key.includes('global_turnover')) return 'global';
    return 'platform';
  };

  const getDescriptionForSetting = (key: string): string => {
    const descriptions: Record<string, string> = {
      master_wallet_address: 'Master wallet address for gas distribution and sweeping',
      master_wallet_private_key: 'Private key for master wallet (encrypted)',
      min_bnb_reserve: 'Minimum BNB to keep in master wallet',
      gas_distribution_amount: 'Amount of BNB to distribute per wallet',
      auto_sweep_enabled: 'Enable automatic USDT sweeping',
      sweep_threshold_high: 'High priority sweep threshold ($)',
      sweep_threshold_medium: 'Medium priority sweep threshold ($)',
      sweep_threshold_low: 'Low priority sweep threshold ($)',
      direct_referral_bonus: 'Direct referral bonus amount ($)',
      level_income_rate: 'Level income rate per activation ($)',
      pool_1_amount: 'Pool 1 reward amount ($)',
      pool_2_amount: 'Pool 2 reward amount ($)',
      pool_3_amount: 'Pool 3 reward amount ($)',
      pool_4_amount: 'Pool 4 reward amount ($)',
      withdrawal_fee_percentage: 'Withdrawal fee percentage (%)',
      activation_cost: 'Account activation cost ($)'
    };
    return descriptions[key] || `System setting: ${key}`;
  };

  const toggleAdminStatus = async (adminId: string) => {
    try {
      setAdminUsers(prev => prev.map(admin => 
        admin.id === adminId 
          ? { ...admin, is_active: !admin.is_active }
          : admin
      ));
      setSuccess('Admin status updated successfully!');
      await loadAdminStats();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const updateRolePermission = (category: string, permission: string, value: boolean) => {
    if (editingRole) {
      setEditingRole(prev => ({
        ...prev!,
        permissions: {
          ...prev!.permissions,
          [category]: {
            ...prev!.permissions[category],
            [permission]: value
          }
        }
      }));
    } else {
      setNewRole(prev => ({
        ...prev,
        permissions: {
          ...prev.permissions,
          [category]: {
            ...prev.permissions[category],
            [permission]: value
          }
        }
      }));
    }
  };

  if (!mounted) return null;

  if (!admin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-900">Access Denied</CardTitle>
            <CardDescription>Please log in to access admin management</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/admin/login')} className="w-full">
              Go to Admin Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Admin Management</h1>
            <p className="text-slate-600">Manage admin users, roles, and system settings</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={loadAllData}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="border-blue-200 hover:bg-blue-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
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

        {/* Admin Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Admins</CardTitle>
              <Users className="w-4 h-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{adminStats.totalAdmins}</div>
              <p className="text-xs text-slate-500 mt-1">System administrators</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Active Admins</CardTitle>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{adminStats.activeAdmins}</div>
              <p className="text-xs text-slate-500 mt-1">Currently active</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Locked Accounts</CardTitle>
              <Lock className="w-4 h-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{adminStats.lockedAdmins}</div>
              <p className="text-xs text-slate-500 mt-1">Failed login attempts</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Recent Logins</CardTitle>
              <Activity className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{adminStats.recentLogins}</div>
              <p className="text-xs text-slate-500 mt-1">Last 24 hours</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="admins">Admin Users</TabsTrigger>
            <TabsTrigger value="roles">Admin Roles</TabsTrigger>
            <TabsTrigger value="settings">System Settings</TabsTrigger>
          </TabsList>

          {/* Admin Users Tab */}
          <TabsContent value="admins" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Users className="w-5 h-5 mr-2 text-blue-600" />
                      Admin Users ({adminUsers.length})
                    </CardTitle>
                    <CardDescription>
                      Manage administrator accounts and their access levels
                    </CardDescription>
                  </div>
                  {hasPermission('system.manage_admins') && (
                    <Button
                      onClick={() => setShowCreateAdmin(true)}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Admin
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Create Admin Form */}
                {showCreateAdmin && (
                  <Card className="mb-6 border-blue-200 bg-blue-50">
                    <CardHeader>
                      <CardTitle className="text-lg">Create New Admin User</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={newAdmin.email}
                            onChange={(e) => setNewAdmin(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="admin@example.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="username">Username *</Label>
                          <Input
                            id="username"
                            value={newAdmin.username}
                            onChange={(e) => setNewAdmin(prev => ({ ...prev, username: e.target.value }))}
                            placeholder="admin_username"
                          />
                        </div>
                        <div>
                          <Label htmlFor="first_name">First Name</Label>
                          <Input
                            id="first_name"
                            value={newAdmin.first_name}
                            onChange={(e) => setNewAdmin(prev => ({ ...prev, first_name: e.target.value }))}
                            placeholder="John"
                          />
                        </div>
                        <div>
                          <Label htmlFor="last_name">Last Name</Label>
                          <Input
                            id="last_name"
                            value={newAdmin.last_name}
                            onChange={(e) => setNewAdmin(prev => ({ ...prev, last_name: e.target.value }))}
                            placeholder="Doe"
                          />
                        </div>
                        <div>
                          <Label htmlFor="password">Password *</Label>
                          <Input
                            id="password"
                            type={showPasswords ? "text" : "password"}
                            value={newAdmin.password}
                            onChange={(e) => setNewAdmin(prev => ({ ...prev, password: e.target.value }))}
                            placeholder="Strong password"
                          />
                        </div>
                        <div>
                          <Label htmlFor="role">Role *</Label>
                          <select
                            id="role"
                            value={newAdmin.role_id}
                            onChange={(e) => setNewAdmin(prev => ({ ...prev, role_id: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                          >
                            <option value="">Select Role</option>
                            {adminRoles.map(role => (
                              <option key={role.id} value={role.id}>
                                {role.display_name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={createAdminUser}
                          disabled={isLoading}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                          Create Admin
                        </Button>
                        <Button
                          onClick={() => setShowCreateAdmin(false)}
                          variant="outline"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => setShowPasswords(!showPasswords)}
                          variant="ghost"
                          size="sm"
                        >
                          {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Admin Users List */}
                <div className="space-y-4">
                  {adminUsers.map((adminUser) => (
                    <div key={adminUser.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {adminUser.first_name?.charAt(0) || adminUser.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900">
                              {adminUser.first_name && adminUser.last_name 
                                ? `${adminUser.first_name} ${adminUser.last_name}`
                                : adminUser.username
                              }
                            </h3>
                            <p className="text-sm text-slate-600">{adminUser.email}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge className="bg-blue-100 text-blue-700">
                                {adminUser.role.display_name}
                              </Badge>
                              <Badge className={adminUser.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                                {adminUser.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                              {adminUser.failed_login_attempts >= 5 && (
                                <Badge className="bg-red-100 text-red-700">
                                  <Lock className="w-3 h-3 mr-1" />
                                  Locked
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-right text-sm text-slate-600">
                            <p>Last login:</p>
                            <p>{adminUser.last_login_at ? new Date(adminUser.last_login_at).toLocaleDateString() : 'Never'}</p>
                          </div>
                          {hasPermission('system.manage_admins') && (
                            <Button
                              onClick={() => toggleAdminStatus(adminUser.id)}
                              variant="outline"
                              size="sm"
                              className={adminUser.is_active ? "border-red-200 hover:bg-red-50" : "border-green-200 hover:bg-green-50"}
                            >
                              {adminUser.is_active ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admin Roles Tab */}
          <TabsContent value="roles" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Crown className="w-5 h-5 mr-2 text-purple-600" />
                      Admin Roles ({adminRoles.length})
                    </CardTitle>
                    <CardDescription>
                      Manage admin roles and their permissions
                    </CardDescription>
                  </div>
                  {hasPermission('system.manage_admins') && (
                    <Button
                      onClick={() => setShowCreateRole(true)}
                      className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Role
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Create Role Form */}
                {(showCreateRole || editingRole) && (
                  <Card className="mb-6 border-purple-200 bg-purple-50">
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {editingRole ? 'Edit Admin Role' : 'Create New Admin Role'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="role_name">Role Name *</Label>
                          <Input
                            id="role_name"
                            value={editingRole ? editingRole.name : newRole.name}
                            onChange={(e) => editingRole 
                              ? setEditingRole(prev => ({ ...prev!, name: e.target.value }))
                              : setNewRole(prev => ({ ...prev, name: e.target.value }))
                            }
                            placeholder="role_name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="role_display_name">Display Name *</Label>
                          <Input
                            id="role_display_name"
                            value={editingRole ? editingRole.display_name : newRole.display_name}
                            onChange={(e) => editingRole 
                              ? setEditingRole(prev => ({ ...prev!, display_name: e.target.value }))
                              : setNewRole(prev => ({ ...prev, display_name: e.target.value }))
                            }
                            placeholder="Role Display Name"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="role_description">Description</Label>
                        <Input
                          id="role_description"
                          value={editingRole ? editingRole.description : newRole.description}
                          onChange={(e) => editingRole 
                            ? setEditingRole(prev => ({ ...prev!, description: e.target.value }))
                            : setNewRole(prev => ({ ...prev, description: e.target.value }))
                          }
                          placeholder="Role description"
                        />
                      </div>

                      {/* Permissions Matrix */}
                      <div>
                        <Label className="text-base font-semibold">Permissions</Label>
                        <div className="mt-4 space-y-6">
                          {Object.entries((editingRole || newRole).permissions).map(([category, permissions]) => (
                            <div key={category} className="border border-gray-200 rounded-lg p-4">
                              <h4 className="font-semibold text-gray-900 mb-3 capitalize">{category}</h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                {Object.entries(permissions as any).map(([permission, value]) => (
                                  <label key={permission} className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={value as boolean}
                                      onChange={(e) => updateRolePermission(category, permission, e.target.checked)}
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700 capitalize">
                                      {permission.replace('_', ' ')}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={createAdminRole}
                          disabled={isLoading}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                          {editingRole ? 'Update Role' : 'Create Role'}
                        </Button>
                        <Button
                          onClick={() => {
                            setShowCreateRole(false);
                            setEditingRole(null);
                          }}
                          variant="outline"
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Roles List */}
                <div className="space-y-4">
                  {adminRoles.map((role) => (
                    <div key={role.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-slate-900">{role.display_name}</h3>
                          <p className="text-sm text-slate-600">{role.description}</p>
                          <Badge className="mt-1 bg-purple-100 text-purple-700">
                            {role.name}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-slate-600">
                            {Object.values(role.permissions).reduce((total, category: any) => 
                              total + Object.values(category).filter(Boolean).length, 0
                            )} permissions
                          </span>
                          {hasPermission('system.manage_admins') && (
                            <Button
                              onClick={() => setEditingRole(role)}
                              variant="outline"
                              size="sm"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* Permission Summary */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                        {Object.entries(role.permissions).map(([category, permissions]) => (
                          <div key={category} className="bg-gray-50 rounded p-2">
                            <div className="font-medium text-gray-700 capitalize">{category}</div>
                            <div className="text-gray-600">
                              {Object.values(permissions as any).filter(Boolean).length}/{Object.keys(permissions as any).length}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Settings className="w-5 h-5 mr-2 text-green-600" />
                      System Settings
                    </CardTitle>
                    <CardDescription>
                      Configure master wallet, sweep settings, and income distribution
                    </CardDescription>
                  </div>
                  {hasPermission('system.edit_settings') && (
                    <Button
                      onClick={updateSystemSettings}
                      disabled={isLoading}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Settings
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Master Wallet Settings */}
                <div className="border border-blue-200 rounded-lg p-6 bg-blue-50">
                  <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                    <Wallet className="w-5 h-5 mr-2" />
                    Master Wallet Configuration
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="master_wallet_address">Master Wallet Address</Label>
                      <Input
                        id="master_wallet_address"
                        value={settingsData.master_wallet_address}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, master_wallet_address: e.target.value }))}
                        placeholder="0x..."
                        className="font-mono"
                      />
                    </div>
                    <div>
                      <Label htmlFor="master_wallet_private_key">Private Key (Encrypted)</Label>
                      <Input
                        id="master_wallet_private_key"
                        type="password"
                        value={settingsData.master_wallet_private_key}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, master_wallet_private_key: e.target.value }))}
                        placeholder="Private key..."
                        className="font-mono"
                      />
                    </div>
                    <div>
                      <Label htmlFor="min_bnb_reserve">Min BNB Reserve</Label>
                      <Input
                        id="min_bnb_reserve"
                        type="number"
                        step="0.001"
                        value={settingsData.min_bnb_reserve}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, min_bnb_reserve: e.target.value }))}
                        placeholder="1.0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="gas_distribution_amount">Gas Distribution Amount (BNB)</Label>
                      <Input
                        id="gas_distribution_amount"
                        type="number"
                        step="0.0001"
                        value={settingsData.gas_distribution_amount}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, gas_distribution_amount: e.target.value }))}
                        placeholder="0.001"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settingsData.auto_sweep_enabled}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, auto_sweep_enabled: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-blue-900">Enable Auto Sweep</span>
                    </label>
                  </div>
                </div>

                {/* Sweep Thresholds */}
                <div className="border border-purple-200 rounded-lg p-6 bg-purple-50">
                  <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
                    <Zap className="w-5 h-5 mr-2" />
                    Sweep Thresholds (USDT)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="sweep_threshold_high">High Priority ($)</Label>
                      <Input
                        id="sweep_threshold_high"
                        type="number"
                        value={settingsData.sweep_threshold_high}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, sweep_threshold_high: e.target.value }))}
                        placeholder="100"
                      />
                      <p className="text-xs text-purple-700 mt-1">Immediate sweep</p>
                    </div>
                    <div>
                      <Label htmlFor="sweep_threshold_medium">Medium Priority ($)</Label>
                      <Input
                        id="sweep_threshold_medium"
                        type="number"
                        value={settingsData.sweep_threshold_medium}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, sweep_threshold_medium: e.target.value }))}
                        placeholder="20"
                      />
                      <p className="text-xs text-purple-700 mt-1">Hourly sweep</p>
                    </div>
                    <div>
                      <Label htmlFor="sweep_threshold_low">Low Priority ($)</Label>
                      <Input
                        id="sweep_threshold_low"
                        type="number"
                        value={settingsData.sweep_threshold_low}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, sweep_threshold_low: e.target.value }))}
                        placeholder="5"
                      />
                      <p className="text-xs text-purple-700 mt-1">Daily sweep</p>
                    </div>
                  </div>
                </div>

                {/* Income Distribution Settings */}
                <div className="border border-green-200 rounded-lg p-6 bg-green-50">
                  <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2" />
                    Income Distribution Settings
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="direct_referral_bonus">Direct Referral Bonus ($)</Label>
                      <Input
                        id="direct_referral_bonus"
                        type="number"
                        value={settingsData.direct_referral_bonus}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, direct_referral_bonus: e.target.value }))}
                        placeholder="5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="level_income_rate">Level Income Rate ($)</Label>
                      <Input
                        id="level_income_rate"
                        type="number"
                        step="0.1"
                        value={settingsData.level_income_rate}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, level_income_rate: e.target.value }))}
                        placeholder="0.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="activation_cost">Activation Cost ($)</Label>
                      <Input
                        id="activation_cost"
                        type="number"
                        value={settingsData.activation_cost}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, activation_cost: e.target.value }))}
                        placeholder="21"
                      />
                    </div>
                    <div>
                      <Label htmlFor="withdrawal_fee_percentage">Withdrawal Fee (%)</Label>
                      <Input
                        id="withdrawal_fee_percentage"
                        type="number"
                        value={settingsData.withdrawal_fee_percentage}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, withdrawal_fee_percentage: e.target.value }))}
                        placeholder="15"
                      />
                    </div>
                  </div>
                </div>

                {/* Pool Settings */}
                <div className="border border-orange-200 rounded-lg p-6 bg-orange-50">
                  <h3 className="text-lg font-semibold text-orange-900 mb-4 flex items-center">
                    <Target className="w-5 h-5 mr-2" />
                    Pool System Configuration
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-orange-800 mb-3">Pool Amounts ($)</h4>
                      <div className="space-y-3">
                        {[1, 2, 3, 4].map(poolNum => (
                          <div key={poolNum}>
                            <Label htmlFor={`pool_${poolNum}_amount`}>Pool {poolNum} Amount</Label>
                            <Input
                              id={`pool_${poolNum}_amount`}
                              type="number"
                              value={settingsData[`pool_${poolNum}_amount` as keyof typeof settingsData]}
                              onChange={(e) => setSettingsData(prev => ({ 
                                ...prev, 
                                [`pool_${poolNum}_amount`]: e.target.value 
                              }))}
                              placeholder={poolNum === 1 ? "5" : poolNum === 2 ? "10" : poolNum === 3 ? "15" : "27"}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-orange-800 mb-3">Time Limits (minutes)</h4>
                      <div className="space-y-3">
                        {[1, 2, 3, 4].map(poolNum => (
                          <div key={poolNum}>
                            <Label htmlFor={`pool_${poolNum}_time`}>Pool {poolNum} Time Limit</Label>
                            <Input
                              id={`pool_${poolNum}_time`}
                              type="number"
                              value={settingsData[`pool_${poolNum}_time` as keyof typeof settingsData]}
                              onChange={(e) => setSettingsData(prev => ({ 
                                ...prev, 
                                [`pool_${poolNum}_time`]: e.target.value 
                              }))}
                              placeholder={poolNum === 1 ? "30" : poolNum === 2 ? "1440" : poolNum === 3 ? "7200" : "21600"}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Global Turnover Settings */}
                <div className="border border-teal-200 rounded-lg p-6 bg-teal-50">
                  <h3 className="text-lg font-semibold text-teal-900 mb-4 flex items-center">
                    <Globe className="w-5 h-5 mr-2" />
                    Global Turnover Settings
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="global_turnover_11_days">11 Referrals Time (days)</Label>
                      <Input
                        id="global_turnover_11_days"
                        type="number"
                        value={settingsData.global_turnover_11_days}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, global_turnover_11_days: e.target.value }))}
                        placeholder="11"
                      />
                    </div>
                    <div>
                      <Label htmlFor="global_turnover_21_days">21 Referrals Time (days)</Label>
                      <Input
                        id="global_turnover_21_days"
                        type="number"
                        value={settingsData.global_turnover_21_days}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, global_turnover_21_days: e.target.value }))}
                        placeholder="21"
                      />
                    </div>
                    <div>
                      <Label htmlFor="global_turnover_1_percent">1% Turnover Rate</Label>
                      <Input
                        id="global_turnover_1_percent"
                        type="number"
                        value={settingsData.global_turnover_1_percent}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, global_turnover_1_percent: e.target.value }))}
                        placeholder="1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="global_turnover_2_percent">2% Turnover Rate</Label>
                      <Input
                        id="global_turnover_2_percent"
                        type="number"
                        value={settingsData.global_turnover_2_percent}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, global_turnover_2_percent: e.target.value }))}
                        placeholder="2"
                      />
                    </div>
                  </div>
                </div>

                {/* Platform Settings */}
                <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    Platform Settings
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="min_withdrawal_amount">Min Withdrawal ($)</Label>
                      <Input
                        id="min_withdrawal_amount"
                        type="number"
                        value={settingsData.min_withdrawal_amount}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, min_withdrawal_amount: e.target.value }))}
                        placeholder="10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="max_withdrawal_amount">Max Withdrawal ($)</Label>
                      <Input
                        id="max_withdrawal_amount"
                        type="number"
                        value={settingsData.max_withdrawal_amount}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, max_withdrawal_amount: e.target.value }))}
                        placeholder="10000"
                      />
                    </div>
                  </div>
                  <div className="mt-4 space-y-3">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settingsData.p2p_transfer_enabled}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, p2p_transfer_enabled: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-900">Enable P2P Transfers</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settingsData.registration_enabled}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, registration_enabled: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-900">Enable New Registrations</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settingsData.maintenance_mode}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, maintenance_mode: e.target.checked }))}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-sm font-medium text-red-900">Maintenance Mode</span>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}