"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Wallet, 
  DollarSign, 
  Send, 
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  Eye,
  EyeOff,
  Shield,
  TrendingDown,
  CreditCard,
  History,
  RefreshCw,
  ExternalLink,
  Info,
  Calculator,
  ArrowUpRight,
  Key,
  Mail,
  Smartphone,
  Plus,
  Settings
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface WithdrawalAddress {
  id: string;
  address: string;
  label: string;
  network: string;
  is_verified: boolean;
}

interface WithdrawalRecord {
  id: string;
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
}

export default function WithdrawalPage() {
  const [mounted, setMounted] = useState(false);
  const [withdrawalAddresses, setWithdrawalAddresses] = useState<WithdrawalAddress[]>([]);
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showTransactionPin, setShowTransactionPin] = useState(false);
  const [fundWalletBalance, setFundWalletBalance] = useState(0);
  const [mainWalletBalance, setMainWalletBalance] = useState(0);
  const [pinVerified, setPinVerified] = useState(false);
  const [step, setStep] = useState(1); // 1: Amount, 2: PIN, 3: Confirmation
  const [hasTransactionPin, setHasTransactionPin] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  // Form states
  const [withdrawalData, setWithdrawalData] = useState({
    amount: '',
    selectedAddress: '',
    transactionPin: '',
    sourceWallet: 'main', // 'main' or 'fund'
  });

  const [calculatedFees, setCalculatedFees] = useState({
    withdrawalFee: 0,
    transferFee: 0,
    netAmount: 0,
    totalFees: 0,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && !user && !redirecting) {
      console.log('🔄 No user found, redirecting to login...');
      setRedirecting(true);
      router.push('/login');
    } else if (mounted && !authLoading && user && profile && !redirecting) {
      console.log('✅ User authenticated, loading withdrawal data...');
      loadWithdrawalAddresses();
      loadWithdrawalHistory();
      loadWalletBalances();
      checkTransactionPin();
    }
  }, [user, profile, authLoading, mounted, router, redirecting]);

  useEffect(() => {
    // Calculate fees when amount or source wallet changes
    if (withdrawalData.amount) {
      calculateFees();
    }
  }, [withdrawalData.amount, withdrawalData.sourceWallet]);

  const checkTransactionPin = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('transaction_pin')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error checking transaction PIN:', error);
        return;
      }

      setHasTransactionPin(!!data?.transaction_pin);
    } catch (err: any) {
      console.error('Error checking transaction PIN:', err);
    }
  };

  const loadWithdrawalAddresses = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('withdrawal_addresses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_verified', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading withdrawal addresses:', error);
        return;
      }

      setWithdrawalAddresses(data || []);
    } catch (err: any) {
      console.error('Error loading withdrawal addresses:', err);
    }
  };

  const loadWithdrawalHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading withdrawal history:', error);
        return;
      }

      setWithdrawalHistory(data || []);
    } catch (err: any) {
      console.error('Error loading withdrawal history:', err);
    }
  };

  const loadWalletBalances = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('fund_wallet_balance, main_wallet_balance')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading wallet balances:', error);
        return;
      }

      setFundWalletBalance(data?.fund_wallet_balance || 0);
      setMainWalletBalance(data?.main_wallet_balance || 1247.30); // Demo value
    } catch (err: any) {
      console.error('Error loading wallet balances:', err);
    }
  };

  const calculateFees = () => {
    const amount = parseFloat(withdrawalData.amount) || 0;
    
    if (amount <= 0) {
      setCalculatedFees({
        withdrawalFee: 0,
        transferFee: 0,
        netAmount: 0,
        totalFees: 0,
      });
      return;
    }

    let withdrawalFee = 0;
    let transferFee = 0;

    if (withdrawalData.sourceWallet === 'main') {
      // Main wallet: 15% withdrawal fee
      withdrawalFee = amount * 0.15;
    } else {
      // Fund wallet: 10% transfer fee to main + 15% withdrawal fee
      transferFee = amount * 0.10;
      const amountAfterTransfer = amount - transferFee;
      withdrawalFee = amountAfterTransfer * 0.15;
    }

    const totalFees = withdrawalFee + transferFee;
    const netAmount = amount - totalFees;

    setCalculatedFees({
      withdrawalFee,
      transferFee,
      netAmount: Math.max(0, netAmount),
      totalFees,
    });
  };

  const verifyTransactionPin = async () => {
    if (!user || !withdrawalData.transactionPin) {
      setError('Please enter your transaction PIN');
      return;
    }

    if (withdrawalData.transactionPin.length !== 4) {
      setError('Transaction PIN must be 4 digits');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Verify PIN against database
      const { data, error } = await supabase
        .from('profiles')
        .select('transaction_pin')
        .eq('id', user.id)
        .single();

      if (error) {
        throw new Error('Failed to verify PIN');
      }

      if (!data.transaction_pin) {
        throw new Error('Transaction PIN not set. Please set it in Settings first.');
      }

      if (data.transaction_pin !== withdrawalData.transactionPin) {
        throw new Error('Invalid transaction PIN');
      }

      setPinVerified(true);
      setStep(3);
      setSuccess('PIN verified successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const submitWithdrawal = async () => {
    if (!user || !pinVerified) {
      setError('Please verify your transaction PIN first');
      return;
    }

    const amount = parseFloat(withdrawalData.amount);
    const sourceBalance = withdrawalData.sourceWallet === 'main' ? mainWalletBalance : fundWalletBalance;

    if (amount <= 0) {
      setError('Please enter a valid withdrawal amount');
      return;
    }

    if (amount > sourceBalance) {
      setError(`Insufficient balance in ${withdrawalData.sourceWallet} wallet`);
      return;
    }

    if (amount < 10) {
      setError('Minimum withdrawal amount is $10 USDT');
      return;
    }

    if (!withdrawalData.selectedAddress) {
      setError('Please select a withdrawal address');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Get selected address details
      const selectedAddr = withdrawalAddresses.find(addr => addr.id === withdrawalData.selectedAddress);
      if (!selectedAddr) {
        throw new Error('Selected withdrawal address not found');
      }

      // Create withdrawal record
      const { data: withdrawal, error: withdrawalError } = await supabase
        .from('withdrawals')
        .insert({
          user_id: user.id,
          amount: amount,
          fee: calculatedFees.totalFees,
          net_amount: calculatedFees.netAmount,
          withdrawal_address: selectedAddr.address,
          address_label: selectedAddr.label,
          source_wallet: withdrawalData.sourceWallet,
          status: 'pending',
          withdrawal_fee: calculatedFees.withdrawalFee,
          transfer_fee: calculatedFees.transferFee,
        })
        .select()
        .single();

      if (withdrawalError) {
        throw new Error(`Failed to create withdrawal: ${withdrawalError.message}`);
      }

      // Update wallet balance
      const newBalance = sourceBalance - amount;
      const updateField = withdrawalData.sourceWallet === 'main' ? 'main_wallet_balance' : 'fund_wallet_balance';
      
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ [updateField]: newBalance })
        .eq('id', user.id);

      if (balanceError) {
        throw new Error(`Failed to update balance: ${balanceError.message}`);
      }

      // Create transaction record
      await supabase
        .from('fund_wallet_transactions')
        .insert({
          user_id: user.id,
          transaction_type: 'withdrawal',
          amount: -amount,
          balance_before: sourceBalance,
          balance_after: newBalance,
          reference_id: withdrawal.id,
          description: `Withdrawal to ${selectedAddr.label} (${selectedAddr.address.substring(0, 10)}...)`
        });

      setSuccess(`Withdrawal request submitted successfully! Reference: ${withdrawal.id.substring(0, 8)}`);
      
      // Reset form
      setWithdrawalData({
        amount: '',
        selectedAddress: '',
        transactionPin: '',
        sourceWallet: 'main',
      });
      setPinVerified(false);
      setStep(1);
      
      // Reload data
      await Promise.all([
        loadWalletBalances(),
        loadWithdrawalHistory(),
      ]);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
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
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
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

  if (!mounted) {
    return null;
  }

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show redirecting state
  if (redirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">Please log in to access withdrawals</p>
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
                <h1 className="text-xl font-bold text-gray-900">Withdraw Funds</h1>
                <p className="text-sm text-gray-600">Transfer your earnings to external wallet</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Available Balances</p>
              <div className="text-sm">
                <span className="text-green-600 font-semibold">Main: ${mainWalletBalance.toFixed(2)}</span>
                <span className="text-gray-400 mx-2">|</span>
                <span className="text-blue-600 font-semibold">Fund: ${fundWalletBalance.toFixed(2)}</span>
              </div>
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

        {/* No Transaction PIN Warning */}
        {!hasTransactionPin && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardHeader>
              <CardTitle className="flex items-center text-yellow-900">
                <Key className="w-5 h-5 mr-2" />
                Transaction PIN Required
              </CardTitle>
            </CardHeader>
            <CardContent className="text-yellow-800">
              <p className="mb-4">You need to set a 4-digit transaction PIN before you can withdraw funds. This PIN is required for security verification.</p>
              <Button
                onClick={() => router.push('/settings')}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                <Settings className="w-4 h-4 mr-2" />
                Set Transaction PIN
              </Button>
            </CardContent>
          </Card>
        )}

        {/* No Withdrawal Addresses Warning */}
        {withdrawalAddresses.length === 0 && hasTransactionPin && (
          <Card className="bg-orange-50 border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center text-orange-900">
                <Wallet className="w-5 h-5 mr-2" />
                No Withdrawal Addresses
              </CardTitle>
            </CardHeader>
            <CardContent className="text-orange-800">
              <p className="mb-4">You need to add at least one verified withdrawal address before you can withdraw funds.</p>
              <Button
                onClick={() => router.push('/settings')}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Withdrawal Address
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Withdrawal Form - Only show if user has both PIN and addresses */}
        {hasTransactionPin && withdrawalAddresses.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Send className="w-5 h-5 mr-2 text-orange-600" />
                  Withdraw Funds
                </CardTitle>
                <CardDescription>
                  Step {step} of 3: {step === 1 ? 'Enter Amount' : step === 2 ? 'Verify PIN' : 'Confirm Withdrawal'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Step 1: Amount and Address */}
                {step === 1 && (
                  <>
                    {/* Source Wallet Selection */}
                    <div className="space-y-2">
                      <Label>Source Wallet</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant={withdrawalData.sourceWallet === 'main' ? 'default' : 'outline'}
                          onClick={() => setWithdrawalData(prev => ({ ...prev, sourceWallet: 'main' }))}
                          className={withdrawalData.sourceWallet === 'main' 
                            ? 'bg-gradient-to-r from-green-400 to-green-600 text-white' 
                            : 'border-green-200 hover:bg-green-50'
                          }
                        >
                          <Wallet className="w-4 h-4 mr-2" />
                          Main Wallet
                          <div className="ml-2 text-xs">
                            ${mainWalletBalance.toFixed(2)}
                          </div>
                        </Button>
                        <Button
                          variant={withdrawalData.sourceWallet === 'fund' ? 'default' : 'outline'}
                          onClick={() => setWithdrawalData(prev => ({ ...prev, sourceWallet: 'fund' }))}
                          className={withdrawalData.sourceWallet === 'fund' 
                            ? 'bg-gradient-to-r from-blue-400 to-blue-600 text-white' 
                            : 'border-blue-200 hover:bg-blue-50'
                          }
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Fund Wallet
                          <div className="ml-2 text-xs">
                            ${fundWalletBalance.toFixed(2)}
                          </div>
                        </Button>
                      </div>
                    </div>

                    {/* Amount Input */}
                    <div className="space-y-2">
                      <Label htmlFor="amount">Withdrawal Amount (USDT)</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="amount"
                          type="number"
                          placeholder="0.00"
                          value={withdrawalData.amount}
                          onChange={(e) => setWithdrawalData(prev => ({ ...prev, amount: e.target.value }))}
                          className="pl-10 bg-white border-orange-200 focus:border-orange-400"
                          min="10"
                          step="0.01"
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        Minimum: $10 USDT | Available: ${(withdrawalData.sourceWallet === 'main' ? mainWalletBalance : fundWalletBalance).toFixed(2)}
                      </p>
                    </div>

                    {/* Fee Calculation */}
                    {withdrawalData.amount && parseFloat(withdrawalData.amount) > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                          <Calculator className="w-4 h-4 mr-2" />
                          Fee Calculation
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-blue-700">Withdrawal Amount:</span>
                            <span className="font-semibold">${parseFloat(withdrawalData.amount).toFixed(2)}</span>
                          </div>
                          {calculatedFees.transferFee > 0 && (
                            <div className="flex justify-between">
                              <span className="text-blue-700">Transfer Fee (10%):</span>
                              <span className="text-red-600">-${calculatedFees.transferFee.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-blue-700">Withdrawal Fee (15%):</span>
                            <span className="text-red-600">-${calculatedFees.withdrawalFee.toFixed(2)}</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between font-semibold">
                            <span className="text-blue-900">You will receive:</span>
                            <span className="text-green-600">${calculatedFees.netAmount.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Address Selection */}
                    <div className="space-y-2">
                      <Label>Withdrawal Address</Label>
                      <div className="space-y-2">
                        {withdrawalAddresses.map((addr) => (
                          <div
                            key={addr.id}
                            className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                              withdrawalData.selectedAddress === addr.id
                                ? 'border-orange-400 bg-orange-50'
                                : 'border-gray-200 hover:border-orange-200'
                            }`}
                            onClick={() => setWithdrawalData(prev => ({ ...prev, selectedAddress: addr.id }))}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-medium text-gray-900">{addr.label}</h4>
                              <Badge className="bg-green-100 text-green-700">
                                {addr.network}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 font-mono">
                              {addr.address.substring(0, 20)}...{addr.address.substring(addr.address.length - 10)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button
                      onClick={() => setStep(2)}
                      disabled={!withdrawalData.amount || !withdrawalData.selectedAddress || calculatedFees.netAmount <= 0}
                      className="w-full bg-gradient-to-r from-orange-400 to-teal-500 hover:from-orange-500 hover:to-teal-600 text-white"
                    >
                      Continue to PIN Verification
                    </Button>
                  </>
                )}

                {/* Step 2: PIN Verification */}
                {step === 2 && (
                  <>
                    <div className="text-center py-4">
                      <Shield className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Verify Transaction PIN</h3>
                      <p className="text-gray-600">Enter your 4-digit transaction PIN to continue</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="transaction-pin">Transaction PIN</Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="transaction-pin"
                          type={showTransactionPin ? "text" : "password"}
                          value={withdrawalData.transactionPin}
                          onChange={(e) => setWithdrawalData(prev => ({ 
                            ...prev, 
                            transactionPin: e.target.value.replace(/\D/g, '').substring(0, 4)
                          }))}
                          className="pl-10 pr-12 bg-white border-orange-200 focus:border-orange-400 text-center text-lg tracking-widest"
                          maxLength={4}
                          placeholder="••••"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowTransactionPin(!showTransactionPin)}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 h-auto"
                        >
                          {showTransactionPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setStep(1)}
                        className="flex-1 border-gray-200 hover:bg-gray-50"
                      >
                        Back
                      </Button>
                      <Button
                        onClick={verifyTransactionPin}
                        disabled={isLoading || withdrawalData.transactionPin.length !== 4}
                        className="flex-1 bg-gradient-to-r from-orange-400 to-teal-500 hover:from-orange-500 hover:to-teal-600 text-white"
                      >
                        {isLoading ? (
                          <div className="flex items-center space-x-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Verifying...</span>
                          </div>
                        ) : (
                          'Verify PIN'
                        )}
                      </Button>
                    </div>
                  </>
                )}

                {/* Step 3: Confirmation */}
                {step === 3 && pinVerified && (
                  <>
                    <div className="text-center py-4">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Withdrawal</h3>
                      <p className="text-gray-600">Please review your withdrawal details</p>
                    </div>

                    {/* Withdrawal Summary */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Source Wallet:</span>
                        <span className="font-semibold capitalize">{withdrawalData.sourceWallet} Wallet</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Amount:</span>
                        <span className="font-semibold">${parseFloat(withdrawalData.amount).toFixed(2)} USDT</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Fees:</span>
                        <span className="text-red-600">-${calculatedFees.totalFees.toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg">
                        <span className="font-semibold">You will receive:</span>
                        <span className="font-bold text-green-600">${calculatedFees.netAmount.toFixed(2)} USDT</span>
                      </div>
                    </div>

                    {/* Selected Address */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">Withdrawal Address</h4>
                      {(() => {
                        const selectedAddr = withdrawalAddresses.find(addr => addr.id === withdrawalData.selectedAddress);
                        return selectedAddr ? (
                          <div>
                            <p className="font-semibold">{selectedAddr.label}</p>
                            <p className="text-sm text-blue-700 font-mono">{selectedAddr.address}</p>
                            <p className="text-xs text-blue-600 mt-1">Network: {selectedAddr.network}</p>
                          </div>
                        ) : null;
                      })()}
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-amber-800 text-sm">
                        <strong>Important:</strong> This withdrawal cannot be cancelled once submitted. Please verify all details are correct.
                      </p>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setStep(1);
                          setPinVerified(false);
                          setWithdrawalData(prev => ({ ...prev, transactionPin: '' }));
                        }}
                        className="flex-1 border-gray-200 hover:bg-gray-50"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={submitWithdrawal}
                        disabled={isSubmitting}
                        className="flex-1 bg-gradient-to-r from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center space-x-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Processing...</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <ArrowUpRight className="w-4 h-4" />
                            <span>Confirm Withdrawal</span>
                          </div>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Withdrawal History */}
            <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <History className="w-5 h-5 mr-2 text-blue-600" />
                    Withdrawal History
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadWithdrawalHistory}
                    className="border-blue-200 hover:bg-blue-50"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
                <CardDescription>
                  Your recent withdrawal transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {withdrawalHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <TrendingDown className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No withdrawals yet</h3>
                    <p className="text-gray-600">Your withdrawal history will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {withdrawalHistory.map((withdrawal) => (
                      <div key={withdrawal.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(withdrawal.status)}
                            <span className="font-semibold text-gray-900">
                              ${withdrawal.amount.toFixed(2)} USDT
                            </span>
                            <Badge className={getStatusColor(withdrawal.status)}>
                              {withdrawal.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(withdrawal.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-2">
                          <p><strong>To:</strong> {withdrawal.address_label}</p>
                          <p><strong>Net Amount:</strong> ${withdrawal.net_amount.toFixed(2)} USDT</p>
                          <p><strong>Fee:</strong> ${withdrawal.fee.toFixed(2)} USDT</p>
                        </div>

                        {withdrawal.transaction_hash && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <span>TX:</span>
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                              {withdrawal.transaction_hash.substring(0, 20)}...
                            </code>
                            <Button variant="ghost" size="sm" className="p-1 h-auto">
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </div>
                        )}

                        {withdrawal.admin_notes && (
                          <div className="mt-2 text-sm text-blue-600 bg-blue-50 p-2 rounded">
                            <strong>Note:</strong> {withdrawal.admin_notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Fee Information */}
        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center text-yellow-900">
              <Info className="w-5 h-5 mr-2" />
              Withdrawal Fees & Information
            </CardTitle>
          </CardHeader>
          <CardContent className="text-yellow-800 text-sm space-y-2">
            <p>• <strong>Main Wallet:</strong> 15% withdrawal fee</p>
            <p>• <strong>Fund Wallet:</strong> 10% transfer fee + 15% withdrawal fee</p>
            <p>• <strong>Minimum Withdrawal:</strong> $10 USDT</p>
            <p>• <strong>Processing Time:</strong> 24-48 hours for manual review</p>
            <p>• <strong>Network:</strong> BEP20 (Binance Smart Chain) only</p>
            <p>• <strong>Transaction PIN:</strong> Required for all withdrawals</p>
            <p>• <strong>Address Limit:</strong> Maximum 2 withdrawal addresses per account</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}