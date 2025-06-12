"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users,
  Search,
  Filter,
  Download,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Crown,
  Wallet,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  UserPlus,
  Settings,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/lib/supabase';
import { UserProfileModal } from '@/components/admin/UserProfileModal';

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
  total_income?: number;
  total_withdrawn?: number;
  referred_by_username?: string;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  pendingUsers: number;
  totalMainBalance: number;
  totalFundBalance: number;
  todayRegistrations: number;
  todayActivations: number;
}

export default function AdminUsersPage() {
  const { admin, loading: authLoading } = useAdminAuth();
  const router = useRouter();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rankFilter, setRankFilter] = useState('all');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(20);
  
  // Modal states
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  useEffect(() => {
    if (!authLoading && !admin) {
      router.push('/admin/login');
    } else if (admin) {
      loadUsers();
    }
  }, [admin, authLoading, router]);

  useEffect(() => {
    filterAndSortUsers();
  }, [users, searchTerm, statusFilter, rankFilter, sortField, sortDirection]);

  const loadUsers = async () => {
    setIsLoading(true);
    setError('');

    try {
      console.log('Loading users...');
      
      // Try to load users from the database
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          email,
          rank,
          account_status,
          main_wallet_balance,
          fund_wallet_balance,
          total_direct_referrals,
          active_direct_referrals,
          current_pool,
          referral_code,
          referred_by,
          created_at,
          activation_date,
          cycle_completed_at
        `)
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
        // Provide fallback demo data
        setUsers(generateDemoUsers());
        setUserStats(generateDemoStats());
        setError('Using demo data - database connection issue');
      } else {
        console.log(`Loaded ${profiles?.length || 0} users`);
        setUsers(profiles || []);
        calculateUserStats(profiles || []);
      }

    } catch (err: any) {
      console.error('Error in loadUsers:', err);
      // Provide fallback demo data
      setUsers(generateDemoUsers());
      setUserStats(generateDemoStats());
      setError('Using demo data - ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const generateDemoUsers = (): UserProfile[] => {
    const demoUsers: UserProfile[] = [];
    const ranks = ['Starter', 'Gold', 'Platinum', 'Diamond', 'Ambassador'];
    const statuses = ['active', 'inactive', 'pending'];
    
    for (let i = 1; i <= 50; i++) {
      demoUsers.push({
        id: `demo-user-${i}`,
        username: `user${i.toString().padStart(3, '0')}`,
        email: `user${i}@example.com`,
        rank: ranks[Math.floor(Math.random() * ranks.length)],
        account_status: statuses[Math.floor(Math.random() * statuses.length)],
        main_wallet_balance: Math.random() * 1000,
        fund_wallet_balance: Math.random() * 500,
        total_direct_referrals: Math.floor(Math.random() * 20),
        active_direct_referrals: Math.floor(Math.random() * 15),
        current_pool: Math.floor(Math.random() * 5),
        referral_code: `REF${i.toString().padStart(3, '0')}`,
        referred_by: i > 1 ? `REF${Math.floor(Math.random() * (i - 1) + 1).toString().padStart(3, '0')}` : undefined,
        created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
        activation_date: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        total_income: Math.random() * 2000,
        total_withdrawn: Math.random() * 500,
      });
    }
    
    return demoUsers;
  };

  const generateDemoStats = (): UserStats => {
    return {
      totalUsers: 50,
      activeUsers: 35,
      inactiveUsers: 12,
      pendingUsers: 3,
      totalMainBalance: 25000,
      totalFundBalance: 12500,
      todayRegistrations: 5,
      todayActivations: 3,
    };
  };

  const calculateUserStats = (userList: UserProfile[]) => {
    const stats: UserStats = {
      totalUsers: userList.length,
      activeUsers: userList.filter(u => u.account_status === 'active').length,
      inactiveUsers: userList.filter(u => u.account_status === 'inactive').length,
      pendingUsers: userList.filter(u => u.account_status === 'pending').length,
      totalMainBalance: userList.reduce((sum, u) => sum + (u.main_wallet_balance || 0), 0),
      totalFundBalance: userList.reduce((sum, u) => sum + (u.fund_wallet_balance || 0), 0),
      todayRegistrations: userList.filter(u => {
        const today = new Date().toDateString();
        return new Date(u.created_at).toDateString() === today;
      }).length,
      todayActivations: userList.filter(u => {
        if (!u.activation_date) return false;
        const today = new Date().toDateString();
        return new Date(u.activation_date).toDateString() === today;
      }).length,
    };

    setUserStats(stats);
  };

  const filterAndSortUsers = () => {
    let filtered = [...users];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.referral_code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.account_status === statusFilter);
    }

    // Apply rank filter
    if (rankFilter !== 'all') {
      filtered = filtered.filter(user => user.rank === rankFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortField as keyof UserProfile];
      let bValue: any = b[sortField as keyof UserProfile];

      // Handle different data types
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredUsers(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleUserUpdate = (updatedUser: UserProfile) => {
    setUsers(prev => prev.map(user => 
      user.id === updatedUser.id ? updatedUser : user
    ));
    setSuccess('User updated successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const exportUsers = () => {
    const csvContent = [
      ['Username', 'Email', 'Rank', 'Status', 'Main Balance', 'Fund Balance', 'Referrals', 'Created'].join(','),
      ...filteredUsers.map(user => [
        user.username,
        user.email,
        user.rank,
        user.account_status,
        user.main_wallet_balance.toFixed(2),
        user.fund_wallet_balance.toFixed(2),
        user.total_direct_referrals,
        new Date(user.created_at).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
    const icons = {
      'active': CheckCircle,
      'inactive': AlertCircle,
      'pending': Clock
    };
    const Icon = icons[status as keyof typeof icons] || Clock;
    
    return (
      <Badge className={colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
            <p className="text-slate-600 mt-1">Manage user accounts, balances, and settings</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={exportUsers}
              variant="outline"
              className="border-green-200 hover:bg-green-50 text-green-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button
              onClick={loadUsers}
              variant="outline"
              disabled={isLoading}
              className="border-blue-200 hover:bg-blue-50 text-blue-700"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-700">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-2">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-green-700">{success}</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {userStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Total Users</p>
                    <p className="text-2xl font-bold text-slate-900">{userStats.totalUsers}</p>
                  </div>
                  <Users className="w-5 h-5 text-slate-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Active</p>
                    <p className="text-2xl font-bold text-green-600">{userStats.activeUsers}</p>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Inactive</p>
                    <p className="text-2xl font-bold text-red-600">{userStats.inactiveUsers}</p>
                  </div>
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">{userStats.pendingUsers}</p>
                  </div>
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Main Balance</p>
                    <p className="text-lg font-bold text-slate-900">${userStats.totalMainBalance.toFixed(0)}</p>
                  </div>
                  <Wallet className="w-5 h-5 text-slate-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Fund Balance</p>
                    <p className="text-lg font-bold text-slate-900">${userStats.totalFundBalance.toFixed(0)}</p>
                  </div>
                  <DollarSign className="w-5 h-5 text-slate-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Today Reg.</p>
                    <p className="text-2xl font-bold text-blue-600">{userStats.todayRegistrations}</p>
                  </div>
                  <UserPlus className="w-5 h-5 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Today Act.</p>
                    <p className="text-2xl font-bold text-purple-600">{userStats.todayActivations}</p>
                  </div>
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and Search */}
        <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white border-slate-200 focus:border-blue-400"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>

              <select
                value={rankFilter}
                onChange={(e) => setRankFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="all">All Ranks</option>
                <option value="Starter">Starter</option>
                <option value="Gold">Gold</option>
                <option value="Platinum">Platinum</option>
                <option value="Diamond">Diamond</option>
                <option value="Ambassador">Ambassador</option>
              </select>

              <div className="text-sm text-slate-600 flex items-center">
                Showing {currentUsers.length} of {filteredUsers.length} users
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Users ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-4" />
                <p className="text-slate-600">Loading users...</p>
              </div>
            ) : currentUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No users found</h3>
                <p className="text-slate-600">Try adjusting your search or filters</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('username')}
                            className="font-semibold text-slate-700 hover:text-slate-900"
                          >
                            User
                            <ArrowUpDown className="w-4 h-4 ml-1" />
                          </Button>
                        </th>
                        <th className="text-left py-3 px-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('rank')}
                            className="font-semibold text-slate-700 hover:text-slate-900"
                          >
                            Rank
                            <ArrowUpDown className="w-4 h-4 ml-1" />
                          </Button>
                        </th>
                        <th className="text-left py-3 px-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('account_status')}
                            className="font-semibold text-slate-700 hover:text-slate-900"
                          >
                            Status
                            <ArrowUpDown className="w-4 h-4 ml-1" />
                          </Button>
                        </th>
                        <th className="text-left py-3 px-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('main_wallet_balance')}
                            className="font-semibold text-slate-700 hover:text-slate-900"
                          >
                            Balances
                            <ArrowUpDown className="w-4 h-4 ml-1" />
                          </Button>
                        </th>
                        <th className="text-left py-3 px-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('total_direct_referrals')}
                            className="font-semibold text-slate-700 hover:text-slate-900"
                          >
                            Referrals
                            <ArrowUpDown className="w-4 h-4 ml-1" />
                          </Button>
                        </th>
                        <th className="text-left py-3 px-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('created_at')}
                            className="font-semibold text-slate-700 hover:text-slate-900"
                          >
                            Joined
                            <ArrowUpDown className="w-4 h-4 ml-1" />
                          </Button>
                        </th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentUsers.map((user) => (
                        <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-semibold text-sm">
                                  {user.username.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">{user.username}</p>
                                <p className="text-sm text-slate-500">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {getRankBadge(user.rank)}
                          </td>
                          <td className="py-3 px-4">
                            {getStatusBadge(user.account_status)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm">
                              <div className="text-green-600 font-semibold">
                                Main: ${user.main_wallet_balance.toFixed(2)}
                              </div>
                              <div className="text-blue-600">
                                Fund: ${user.fund_wallet_balance.toFixed(2)}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm">
                              <div className="font-semibold">{user.total_direct_referrals}</div>
                              <div className="text-slate-500">({user.active_direct_referrals} active)</div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm text-slate-600">
                              {new Date(user.created_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowUserModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowUserModal(true);
                                }}
                                className="text-slate-600 hover:text-slate-700 hover:bg-slate-50"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-slate-600">
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="border-slate-200 hover:bg-slate-50"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-sm text-slate-600">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="border-slate-200 hover:bg-slate-50"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* User Profile Modal */}
        <UserProfileModal
          user={selectedUser}
          isOpen={showUserModal}
          onClose={() => {
            setShowUserModal(false);
            setSelectedUser(null);
          }}
          onUpdate={handleUserUpdate}
        />
      </div>
    </div>
  );
}