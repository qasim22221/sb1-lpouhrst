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
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  User,
  Calendar,
  ExternalLink,
  RefreshCw,
  Download,
  Eye,
  Loader2,
  TrendingUp,
  TrendingDown,
  Activity,
  CreditCard,
  Wallet,
  Shield
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/lib/supabase';

interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  fee: number;
  net_amount: number;
  withdrawal_address: string;
  address_label: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  transaction_hash?: string;
  created_at: string;
  processed_at?: string;
  admin_notes?: string;
  source_wallet: string;
  withdrawal_fee: number;
  transfer_fee: number;
  // User details
  username?: string;
  email?: string;
  rank?: string;
}

interface WithdrawalStats {
  total_pending: number;
  total_processing: number;
  total_completed: number;
  total_failed: number;
  total_amount_pending: number;
  total_amount_completed: number;
  total_fees_collected: number;
  avg_processing_time: number;
}

export default function WithdrawalsPage() {
  const [mounted, setMounted] = useState(false);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [filteredWithdrawals, setFilteredWithdrawals] = useState<Withdrawal[]>([]);
  const [withdrawalStats, setWithdrawalStats] = useState<WithdrawalStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const { admin, hasPermission } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && admin) {
      loadWithdrawals();
      // Auto-refresh every 30 seconds
      const interval = setInterval(() => {
        loadWithdrawals();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [mounted, admin]);

  useEffect(() => {
    filterWithdrawals();
  }, [withdrawals, searchTerm, statusFilter, activeTab]);

  const loadWithdrawals = async () => {
    if (!admin) return;

    setIsLoading(true);
    setError('');

    try {
      // Load withdrawals with user details
      const { data: withdrawalsData, error: withdrawalsError } = await supabase
        .from('withdrawals')
        .select(`
          *,
          profiles!inner(username, email, rank)
        `)
        .order('created_at', { ascending: false });

      if (withdrawalsError) {
        throw new Error(`Failed to load withdrawals: ${withdrawalsError.message}`);
      }

      // Transform data to include user details
      const transformedWithdrawals: Withdrawal[] = (withdrawalsData || []).map(w => ({
        ...w,
        username: w.profiles?.username,
        email: w.profiles?.email,
        rank: w.profiles?.rank,
      }));

      setWithdrawals(transformedWithdrawals);

      // Calculate statistics
      const stats: WithdrawalStats = {
        total_pending: transformedWithdrawals.filter(w => w.status === 'pending').length,
        total_processing: transformedWithdrawals.filter(w => w.status === 'processing').length,
        total_completed: transformedWithdrawals.filter(w => w.status === 'completed').length,
        total_failed: transformedWithdrawals.filter(w => w.status === 'failed').length,
        total_amount_pending: transformedWithdrawals
          .filter(w => w.status === 'pending')
          .reduce((sum, w) => sum + w.amount, 0),
        total_amount_completed: transformedWithdrawals
          .filter(w => w.status === 'completed')
          .reduce((sum, w) => sum + w.amount, 0),
        total_fees_collected: transformedWithdrawals
          .filter(w => w.status === 'completed')
          .reduce((sum, w) => sum + w.fee, 0),
        avg_processing_time: 0, // Would need more complex calculation
      };

      setWithdrawalStats(stats);
      setLastUpdated(new Date());

    } catch (err: any) {
      console.error('Error loading withdrawals:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filterWithdrawals = () => {
    let filtered = [...withdrawals];

    // Filter by active tab
    if (activeTab !== 'all') {
      filtered = filtered.filter(w => w.status === activeTab);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(w => 
        w.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.withdrawal_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(w => w.status === statusFilter);
    }

    setFilteredWithdrawals(filtered);
  };

  const updateWithdrawalStatus = async (
    withdrawalId: string, 
    newStatus: string, 
    notes?: string,
    transactionHash?: string
  ) => {
    if (!admin || !hasPermission('finances.approve_withdrawals')) {
      setError('You do not have permission to approve withdrawals');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const updateData: any = {
        status: newStatus,
        processed_at: new Date().toISOString(),
        admin_notes: notes,
      };

      if (transactionHash) {
        updateData.transaction_hash = transactionHash;
      }

      const { error: updateError } = await supabase
        .from('withdrawals')
        .update(updateData)
        .eq('id', withdrawalId);

      if (updateError) {
        throw new Error(`Failed to update withdrawal: ${updateError.message}`);
      }

      // Log admin activity
      await supabase
        .from('admin_activity_logs')
        .insert({
          admin_user_id: admin.id,
          action: 'UPDATE_WITHDRAWAL_STATUS',
          resource_type: 'withdrawal',
          resource_id: withdrawalId,
          details: {
            old_status: selectedWithdrawal?.status,
            new_status: newStatus,
            notes: notes,
            transaction_hash: transactionHash,
          },
        });

      setSuccess(`Withdrawal ${newStatus} successfully!`);
      setSelectedWithdrawal(null);
      setAdminNotes('');
      await loadWithdrawals();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
        {rank}
      </Badge>
    );
  };

  if (!mounted) {
    return null;
  }

  if (!admin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
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
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Withdrawal Management</h1>
            <p className="text-gray-600 mt-1">
              Review and process user withdrawal requests
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={loadWithdrawals}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="border-blue-200 hover:bg-blue-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-green-200 hover:bg-green-50 text-green-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

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

        {/* Statistics Cards */}
        {withdrawalStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-white/80 backdrop-blur-sm border-yellow-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-600">Pending</p>
                    <p className="text-2xl font-bold text-yellow-900">{withdrawalStats.total_pending}</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      ${withdrawalStats.total_amount_pending.toFixed(2)} total
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Processing</p>
                    <p className="text-2xl font-bold text-blue-900">{withdrawalStats.total_processing}</p>
                    <p className="text-xs text-blue-700 mt-1">In progress</p>
                  </div>
                  <Activity className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Completed</p>
                    <p className="text-2xl font-bold text-green-900">{withdrawalStats.total_completed}</p>
                    <p className="text-xs text-green-700 mt-1">
                      ${withdrawalStats.total_amount_completed.toFixed(2)} paid
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Fees Collected</p>
                    <p className="text-2xl font-bold text-purple-900">
                      ${withdrawalStats.total_fees_collected.toFixed(2)}
                    </p>
                    <p className="text-xs text-purple-700 mt-1">Total revenue</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by username, email, or address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Withdrawals Table */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Withdrawal Requests</CardTitle>
            <CardDescription>
              Showing {filteredWithdrawals.length} of {withdrawals.length} withdrawals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="pending">Pending ({withdrawalStats?.total_pending || 0})</TabsTrigger>
                <TabsTrigger value="processing">Processing ({withdrawalStats?.total_processing || 0})</TabsTrigger>
                <TabsTrigger value="completed">Completed ({withdrawalStats?.total_completed || 0})</TabsTrigger>
                <TabsTrigger value="failed">Failed ({withdrawalStats?.total_failed || 0})</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-6">
                {isLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Loading withdrawals...</p>
                  </div>
                ) : filteredWithdrawals.length === 0 ? (
                  <div className="text-center py-8">
                    <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No withdrawals found</h3>
                    <p className="text-gray-600">
                      {searchTerm || statusFilter !== 'all' 
                        ? 'Try adjusting your search or filters'
                        : 'No withdrawal requests match the current criteria'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredWithdrawals.map((withdrawal) => (
                      <div key={withdrawal.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{withdrawal.username}</h3>
                              <p className="text-sm text-gray-600">{withdrawal.email}</p>
                            </div>
                            {withdrawal.rank && getRankBadge(withdrawal.rank)}
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(withdrawal.status)}
                            <Badge className={getStatusColor(withdrawal.status)}>
                              {withdrawal.status}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                          <div>
                            <span className="font-medium text-gray-600">Amount:</span>
                            <p className="font-semibold">${withdrawal.amount.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Fee:</span>
                            <p className="text-red-600">${withdrawal.fee.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Net Amount:</span>
                            <p className="font-semibold text-green-600">${withdrawal.net_amount.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Source:</span>
                            <p className="capitalize">{withdrawal.source_wallet} Wallet</p>
                          </div>
                        </div>

                        <div className="text-sm text-gray-600 mb-4">
                          <p><strong>Address:</strong> {withdrawal.address_label}</p>
                          <p><strong>Wallet:</strong> {withdrawal.withdrawal_address.substring(0, 20)}...{withdrawal.withdrawal_address.substring(withdrawal.withdrawal_address.length - 10)}</p>
                          <p><strong>Requested:</strong> {new Date(withdrawal.created_at).toLocaleString()}</p>
                          {withdrawal.processed_at && (
                            <p><strong>Processed:</strong> {new Date(withdrawal.processed_at).toLocaleString()}</p>
                          )}
                        </div>

                        {withdrawal.transaction_hash && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
                            <span><strong>TX Hash:</strong></span>
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                              {withdrawal.transaction_hash.substring(0, 20)}...
                            </code>
                            <Button variant="ghost" size="sm" className="p-1 h-auto">
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </div>
                        )}

                        {withdrawal.admin_notes && (
                          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                            <p className="text-sm text-blue-800">
                              <strong>Admin Notes:</strong> {withdrawal.admin_notes}
                            </p>
                          </div>
                        )}

                        {withdrawal.status === 'pending' && hasPermission('finances.approve_withdrawals') && (
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => setSelectedWithdrawal(withdrawal)}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              onClick={() => updateWithdrawalStatus(withdrawal.id, 'failed', 'Rejected by admin')}
                              size="sm"
                              variant="outline"
                              className="border-red-200 hover:bg-red-50 text-red-700"
                              disabled={isProcessing}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                            <Button
                              onClick={() => setSelectedWithdrawal(withdrawal)}
                              size="sm"
                              variant="outline"
                              className="border-gray-200 hover:bg-gray-50"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Details
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Approval Modal */}
        {selectedWithdrawal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl bg-white">
              <CardHeader>
                <CardTitle>Process Withdrawal</CardTitle>
                <CardDescription>
                  Review and approve withdrawal request from {selectedWithdrawal.username}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Amount:</span>
                    <p>${selectedWithdrawal.amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="font-medium">Net Amount:</span>
                    <p>${selectedWithdrawal.net_amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="font-medium">Address:</span>
                    <p className="font-mono text-xs">{selectedWithdrawal.withdrawal_address}</p>
                  </div>
                  <div>
                    <span className="font-medium">Label:</span>
                    <p>{selectedWithdrawal.address_label}</p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="admin-notes">Admin Notes (Optional)</Label>
                  <Input
                    id="admin-notes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes about this withdrawal..."
                    className="bg-white"
                  />
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={() => updateWithdrawalStatus(selectedWithdrawal.id, 'completed', adminNotes)}
                    disabled={isProcessing}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Approve & Complete
                  </Button>
                  <Button
                    onClick={() => updateWithdrawalStatus(selectedWithdrawal.id, 'failed', adminNotes || 'Rejected by admin')}
                    disabled={isProcessing}
                    variant="outline"
                    className="flex-1 border-red-200 hover:bg-red-50 text-red-700"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedWithdrawal(null);
                      setAdminNotes('');
                    }}
                    variant="outline"
                    className="border-gray-200 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}