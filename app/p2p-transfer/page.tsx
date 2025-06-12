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
  Tangent as Exchange, 
  Search, 
  User, 
  Mail, 
  Hash, 
  Send, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  Clock, 
  Download, 
  ArrowDownRight, 
  ArrowUpRight, 
  History, 
  Wallet, 
  DollarSign, 
  Info, 
  Copy, 
  Check, 
  Users
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface P2PTransfer {
  id: string;
  sender_id: string;
  receiver_id: string;
  amount: number;
  fee: number;
  net_amount: number;
  status: string;
  transfer_type: string;
  receiver_identifier: string;
  description: string;
  created_at: string;
  completed_at: string;
  sender_username: string;
  receiver_username: string;
  is_sender: boolean;
}

interface UserSearchResult {
  id: string;
  username: string;
  referral_code: string;
  email: string;
  rank: string;
  account_status: string;
}

export default function P2PTransferPage() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('send');
  const [fundWalletBalance, setFundWalletBalance] = useState(0);
  const [transferHistory, setTransferHistory] = useState<P2PTransfer[]>([]);
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'username' | 'referral_code' | 'email'>('username');
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDescription, setTransferDescription] = useState('');
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [lastTransferId, setLastTransferId] = useState<string | null>(null);
  
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && !user) {
      router.push('/login');
    } else if (mounted && !authLoading && user && profile) {
      loadP2PData();
    }
  }, [user, profile, authLoading, mounted, router]);

  const loadP2PData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      await Promise.all([
        loadWalletBalance(),
        loadTransferHistory()
      ]);
    } catch (err: any) {
      setError(`Failed to load P2P data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadWalletBalance = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('fund_wallet_balance')
        .eq('id', user.id)
        .single();

      if (error) {
        throw new Error(`Failed to load wallet balance: ${error.message}`);
      }

      setFundWalletBalance(data?.fund_wallet_balance || 0);
    } catch (err: any) {
      console.error('Error loading wallet balance:', err);
    }
  };

  const loadTransferHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_user_transfer_history', {
        user_id_param: user.id,
        limit_param: 50
      });

      if (error) {
        throw new Error(`Failed to load transfer history: ${error.message}`);
      }

      setTransferHistory(data || []);
    } catch (err: any) {
      console.error('Error loading transfer history:', err);
    }
  };

  const searchUsers = async () => {
    if (!user || !searchTerm.trim()) return;

    setIsSearching(true);
    setError('');
    setSearchResults([]);
    
    try {
      const { data, error } = await supabase.rpc('search_users_for_p2p', {
        search_term: searchTerm.trim(),
        search_type: searchType,
        current_user_id: user.id
      });

      if (error) {
        throw new Error(`Search failed: ${error.message}`);
      }

      setSearchResults(data || []);
      
      if (data?.length === 0) {
        setError(`No users found matching "${searchTerm}" in ${searchType}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const selectUser = (user: UserSearchResult) => {
    setSelectedUser(user);
    setSearchResults([]);
    setSearchTerm('');
  };

  const clearSelectedUser = () => {
    setSelectedUser(null);
    setError('');
  };

  const handleTransfer = async () => {
    if (!user || !selectedUser) {
      setError('Please select a recipient');
      return;
    }

    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (amount > fundWalletBalance) {
      setError('Insufficient balance in your fund wallet');
      return;
    }

    if (amount < 1) {
      setError('Minimum transfer amount is $1');
      return;
    }

    setIsSending(true);
    setError('');
    
    try {
      const { data, error } = await supabase.rpc('process_p2p_transfer', {
        sender_id_param: user.id,
        receiver_id_param: selectedUser.id,
        amount_param: amount,
        transfer_type_param: searchType,
        receiver_identifier_param: selectedUser[searchType],
        description_param: transferDescription || `P2P transfer to ${selectedUser.username}`
      });

      if (error) {
        throw new Error(`Transfer failed: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.message || 'Transfer failed');
      }

      // Update local balance
      setFundWalletBalance(prev => prev - amount);
      
      // Set success state
      setTransferSuccess(true);
      setLastTransferId(data.transfer_id);
      setSuccess(`Successfully sent $${amount.toFixed(2)} to ${selectedUser.username}`);
      
      // Reset form
      setTransferAmount('');
      setTransferDescription('');
      setSelectedUser(null);
      
      // Reload transfer history
      await loadTransferHistory();
      
      // Switch to history tab after a delay
      setTimeout(() => {
        setActiveTab('history');
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSending(false);
    }
  };

  const refreshData = async () => {
    await loadP2PData();
    setSuccess('Data refreshed successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
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
          <p className="text-gray-600 mb-4">Please log in to access P2P transfers</p>
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
                <h1 className="text-xl font-bold text-gray-900">P2P Transfer</h1>
                <p className="text-sm text-gray-600">Send funds to other users instantly</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-right">
                <p className="text-sm text-gray-600">Fund Wallet Balance</p>
                <p className="text-lg font-bold text-blue-600">${fundWalletBalance.toFixed(2)}</p>
              </div>
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

        {/* Tabs for different views */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="send">Send Funds</TabsTrigger>
            <TabsTrigger value="history">Transfer History</TabsTrigger>
          </TabsList>

          {/* Send Funds Tab */}
          <TabsContent value="send" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Search and Select User */}
              <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Search className="w-5 h-5 mr-2 text-blue-600" />
                    Find Recipient
                  </CardTitle>
                  <CardDescription>
                    Search for users by username, referral code, or email
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedUser ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold">
                              {selectedUser.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{selectedUser.username}</h3>
                            <div className="flex items-center space-x-2">
                              <Badge className="bg-blue-100 text-blue-700 text-xs">
                                {selectedUser.rank}
                              </Badge>
                              <Badge className={
                                selectedUser.account_status === 'active' 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-yellow-100 text-yellow-700'
                              }>
                                {selectedUser.account_status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearSelectedUser}
                          className="border-red-200 hover:bg-red-50 text-red-700"
                        >
                          Change
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Referral Code:</span>
                          <p className="font-mono">{selectedUser.referral_code}</p>
                        </div>
                        <div>
                          <span className="font-medium">Email:</span>
                          <p className="truncate">{selectedUser.email}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex-1">
                          <div className="relative">
                            {searchType === 'username' && <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />}
                            {searchType === 'referral_code' && <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />}
                            {searchType === 'email' && <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />}
                            <Input
                              placeholder={`Search by ${searchType}...`}
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-10 bg-white border-orange-200 focus:border-orange-400"
                            />
                          </div>
                        </div>
                        <select
                          value={searchType}
                          onChange={(e) => setSearchType(e.target.value as any)}
                          className="px-3 py-2 border border-orange-200 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                        >
                          <option value="username">Username</option>
                          <option value="referral_code">Referral Code</option>
                          <option value="email">Email</option>
                        </select>
                        <Button
                          onClick={searchUsers}
                          disabled={isSearching || !searchTerm.trim()}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {isSearching ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Search className="w-4 h-4 mr-2" />
                          )}
                          Search
                        </Button>
                      </div>

                      {/* Search Results */}
                      {searchResults.length > 0 && (
                        <div className="space-y-2 mt-4">
                          <h3 className="text-sm font-medium text-gray-700">Search Results</h3>
                          <div className="max-h-60 overflow-y-auto space-y-2">
                            {searchResults.map((result) => (
                              <div 
                                key={result.id} 
                                className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                                onClick={() => selectUser(result)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                                      <span className="text-white font-semibold text-xs">
                                        {result.username.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-900">{result.username}</p>
                                      <p className="text-xs text-gray-500">{result.email}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Badge className="bg-blue-100 text-blue-700 text-xs">
                                      {result.rank}
                                    </Badge>
                                    <ArrowRight className="w-4 h-4 text-gray-400" />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Transfer Form */}
              <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Send className="w-5 h-5 mr-2 text-orange-600" />
                    Send Funds
                  </CardTitle>
                  <CardDescription>
                    Transfer funds from your fund wallet to another user
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {transferSuccess ? (
                    <div className="text-center py-6">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Transfer Successful!</h3>
                      <p className="text-gray-600 mb-4">Your funds have been sent successfully.</p>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setTransferSuccess(false);
                            setLastTransferId(null);
                          }}
                          className="flex-1 bg-gradient-to-r from-orange-400 to-teal-500 hover:from-orange-500 hover:to-teal-600 text-white"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Send Another
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setActiveTab('history')}
                          className="flex-1 border-blue-200 hover:bg-blue-50 text-blue-700"
                        >
                          <History className="w-4 h-4 mr-2" />
                          View History
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
                        <div>
                          <p className="text-blue-800 font-medium">Available Balance</p>
                          <p className="text-2xl font-bold text-blue-900">${fundWalletBalance.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-blue-800 text-sm">Fund Wallet</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push('/deposit')}
                            className="mt-1 border-blue-300 hover:bg-blue-100 text-blue-700"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Funds
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount (USDT)</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <Input
                            id="amount"
                            type="number"
                            placeholder="0.00"
                            value={transferAmount}
                            onChange={(e) => setTransferAmount(e.target.value)}
                            className="pl-10 bg-white border-orange-200 focus:border-orange-400"
                            min="1"
                            step="0.01"
                            disabled={!selectedUser}
                          />
                        </div>
                        <p className="text-xs text-gray-500">
                          Minimum: $1.00 | Maximum: ${fundWalletBalance.toFixed(2)}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Input
                          id="description"
                          placeholder="What's this transfer for?"
                          value={transferDescription}
                          onChange={(e) => setTransferDescription(e.target.value)}
                          className="bg-white border-orange-200 focus:border-orange-400"
                          disabled={!selectedUser}
                        />
                      </div>

                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <h4 className="font-medium text-orange-900 mb-2 flex items-center">
                          <Info className="w-4 h-4 mr-2" />
                          P2P Transfer Details
                        </h4>
                        <ul className="text-orange-800 text-sm space-y-1">
                          <li>• No fees for P2P transfers</li>
                          <li>• Instant transfer between fund wallets</li>
                          <li>• Minimum transfer amount: $1.00</li>
                          <li>• Cannot be reversed once completed</li>
                        </ul>
                      </div>

                      <Button
                        onClick={handleTransfer}
                        disabled={isSending || !selectedUser || !transferAmount || parseFloat(transferAmount) <= 0 || parseFloat(transferAmount) > fundWalletBalance}
                        className="w-full bg-gradient-to-r from-orange-400 to-teal-500 hover:from-orange-500 hover:to-teal-600 text-white"
                      >
                        {isSending ? (
                          <div className="flex items-center space-x-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Processing...</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <Send className="w-4 h-4" />
                            <span>Send Funds</span>
                          </div>
                        )}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Transfer History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <History className="w-5 h-5 mr-2 text-purple-600" />
                  P2P Transfer History
                </CardTitle>
                <CardDescription>
                  Your sent and received P2P transfers
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Loading transfer history...</p>
                  </div>
                ) : transferHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <Exchange className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No transfer history</h3>
                    <p className="text-gray-600 mb-4">You haven't sent or received any P2P transfers yet</p>
                    <Button
                      onClick={() => setActiveTab('send')}
                      className="bg-gradient-to-r from-orange-400 to-teal-500 hover:from-orange-500 hover:to-teal-600 text-white"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send Your First Transfer
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transferHistory.map((transfer) => (
                      <div 
                        key={transfer.id} 
                        className={`border-2 rounded-lg p-4 hover:shadow-md transition-shadow ${
                          lastTransferId === transfer.id ? 'border-green-400 bg-green-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              transfer.is_sender ? 'bg-orange-100' : 'bg-blue-100'
                            }`}>
                              {transfer.is_sender ? (
                                <ArrowUpRight className="w-5 h-5 text-orange-600" />
                              ) : (
                                <ArrowDownRight className="w-5 h-5 text-blue-600" />
                              )}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {transfer.is_sender ? 'Sent to' : 'Received from'}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {transfer.is_sender ? transfer.receiver_username : transfer.sender_username}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-bold ${
                              transfer.is_sender ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {transfer.is_sender ? '-' : '+'}${transfer.is_sender ? transfer.amount.toFixed(2) : transfer.net_amount.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(transfer.created_at).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center justify-between text-sm text-gray-600 pt-2 border-t border-gray-100">
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(transfer.status)}
                            <Badge variant="outline" className="capitalize">
                              {transfer.transfer_type}
                            </Badge>
                          </div>
                          {transfer.description && (
                            <p className="text-xs text-gray-500 mt-2 sm:mt-0">
                              {transfer.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Information Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-900">
              <Info className="w-5 h-5 mr-2" />
              P2P Transfer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 text-sm space-y-2">
            <p>• <strong>Zero Fees:</strong> P2P transfers between users are completely free</p>
            <p>• <strong>Fund Wallet Only:</strong> Transfers use your fund wallet balance only</p>
            <p>• <strong>Instant Transfers:</strong> Funds are transferred immediately with no waiting period</p>
            <p>• <strong>Search Options:</strong> Find users by username, referral code, or email address</p>
            <p>• <strong>Minimum Amount:</strong> $1.00 minimum transfer amount</p>
            <p>• <strong>Security:</strong> Transfers cannot be reversed once completed</p>
            <p>• <strong>Recipient Status:</strong> Both active and inactive accounts can receive transfers</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}