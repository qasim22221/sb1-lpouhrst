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
  Settings, 
  Wallet, 
  Shield, 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff,
  Camera,
  Upload,
  Check,
  X,
  AlertCircle,
  Clock,
  Loader2,
  Save,
  RefreshCw,
  Key,
  CreditCard,
  Bell,
  Globe,
  Smartphone,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Plus
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface WithdrawalAddress {
  id: string;
  address: string;
  label: string;
  network: string;
  is_verified: boolean;
  created_at: string;
  change_count: number;
}

interface PendingAddressChange {
  id: string;
  new_address: string;
  new_label: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reason?: string;
}

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showTransactionPin, setShowTransactionPin] = useState(false);
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [withdrawalAddresses, setWithdrawalAddresses] = useState<WithdrawalAddress[]>([]);
  const [pendingChanges, setPendingChanges] = useState<PendingAddressChange[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [hasTransactionPin, setHasTransactionPin] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  
  const { user, profile, refetchProfile, loading: authLoading } = useAuth();
  const router = useRouter();

  // Form states
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    full_name: '',
    phone: '',
    country: '',
    profile_image: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [transactionPinData, setTransactionPinData] = useState({
    currentPin: '',
    newPin: '',
    confirmPin: '',
  });

  const [withdrawalAddressData, setWithdrawalAddressData] = useState({
    address: '',
    label: '',
    network: 'BEP20',
  });

  const [otpData, setOtpData] = useState({
    email: '',
    code: '',
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
      console.log('✅ User authenticated, loading settings data...');
      loadUserData();
      loadWithdrawalAddresses();
      loadPendingChanges();
      checkTransactionPin();
    }
  }, [user, profile, authLoading, mounted, router, redirecting]);

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

  const loadUserData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading user data:', error);
        return;
      }

      setProfileData({
        username: data.username || '',
        email: data.email || '',
        full_name: data.full_name || '',
        phone: data.phone || '',
        country: data.country || '',
        profile_image: data.profile_image || '',
      });
    } catch (err: any) {
      console.error('Error loading user data:', err);
    }
  };

  const loadWithdrawalAddresses = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('withdrawal_addresses')
        .select('*')
        .eq('user_id', user.id)
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

  const loadPendingChanges = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('withdrawal_address_changes')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (error) {
        console.error('Error loading pending changes:', error);
        return;
      }

      setPendingChanges(data || []);
    } catch (err: any) {
      console.error('Error loading pending changes:', err);
    }
  };

  const handleProfileUpdate = async () => {
    if (!user) return;

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: profileData.username,
          full_name: profileData.full_name,
          phone: profileData.phone,
          country: profileData.country,
          profile_image: profileData.profile_image,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        throw new Error(error.message);
      }

      setSuccess('Profile updated successfully!');
      await refetchProfile();
    } catch (err: any) {
      setError(`Failed to update profile: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!user) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) {
        throw new Error(error.message);
      }

      setSuccess('Password updated successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err: any) {
      setError(`Failed to update password: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTransactionPinChange = async () => {
    if (!user) return;

    if (transactionPinData.newPin !== transactionPinData.confirmPin) {
      setError('New PINs do not match');
      return;
    }

    if (transactionPinData.newPin.length !== 4 || !/^\d{4}$/.test(transactionPinData.newPin)) {
      setError('Transaction PIN must be exactly 4 digits');
      return;
    }

    if (!otpVerified) {
      setError('Please verify your email with OTP first');
      return;
    }

    // If user has existing PIN, verify current PIN
    if (hasTransactionPin && !transactionPinData.currentPin) {
      setError('Please enter your current PIN');
      return;
    }

    if (hasTransactionPin && transactionPinData.currentPin.length !== 4) {
      setError('Current PIN must be 4 digits');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      // If user has existing PIN, verify it first
      if (hasTransactionPin) {
        const { data: currentData, error: verifyError } = await supabase
          .from('profiles')
          .select('transaction_pin')
          .eq('id', user.id)
          .single();

        if (verifyError) {
          throw new Error('Failed to verify current PIN');
        }

        if (currentData.transaction_pin !== transactionPinData.currentPin) {
          throw new Error('Current PIN is incorrect');
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          transaction_pin: transactionPinData.newPin, // In production, hash this!
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        throw new Error(error.message);
      }

      setSuccess('Transaction PIN updated successfully!');
      setTransactionPinData({
        currentPin: '',
        newPin: '',
        confirmPin: '',
      });
      setOtpVerified(false);
      setOtpSent(false);
      setHasTransactionPin(true);
    } catch (err: any) {
      setError(`Failed to update transaction PIN: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const sendEmailOTP = async () => {
    if (!user) return;

    setIsLoading(true);
    setError('');

    try {
      // In a real implementation, you would send an actual OTP email
      // For demo purposes, we'll simulate this
      const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
      
      // Store OTP in session storage for demo (in production, store server-side)
      sessionStorage.setItem('otp_code', otpCode);
      sessionStorage.setItem('otp_email', user.email || '');
      
      console.log(`Demo OTP Code: ${otpCode}`); // In production, this would be sent via email
      
      setOtpSent(true);
      setSuccess(`OTP sent to ${user.email}. Demo code: ${otpCode}`);
    } catch (err: any) {
      setError(`Failed to send OTP: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEmailOTP = async () => {
    if (!user) return;

    setIsLoading(true);
    setError('');

    try {
      const storedOTP = sessionStorage.getItem('otp_code');
      const storedEmail = sessionStorage.getItem('otp_email');

      if (!storedOTP || storedEmail !== user.email) {
        throw new Error('OTP session expired. Please request a new OTP.');
      }

      if (otpData.code !== storedOTP) {
        throw new Error('Invalid OTP code');
      }

      setOtpVerified(true);
      setSuccess('Email verified successfully!');
      
      // Clear OTP from session
      sessionStorage.removeItem('otp_code');
      sessionStorage.removeItem('otp_email');
    } catch (err: any) {
      setError(`OTP verification failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setError('Image size must be less than 5MB');
      return;
    }

    setIsUploadingImage(true);
    setError('');

    try {
      // In a real implementation, you would upload to Supabase Storage
      // For demo purposes, we'll create a data URL
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageUrl = e.target?.result as string;
        
        setProfileData(prev => ({
          ...prev,
          profile_image: imageUrl,
        }));

        // Update in database
        const { error } = await supabase
          .from('profiles')
          .update({
            profile_image: imageUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (error) {
          throw new Error(error.message);
        }

        setSuccess('Profile image updated successfully!');
        setIsUploadingImage(false);
      };
      
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(`Failed to upload image: ${err.message}`);
      setIsUploadingImage(false);
    }
  };

  const addWithdrawalAddress = async () => {
    if (!user) return;

    if (!withdrawalAddressData.address || !withdrawalAddressData.label) {
      setError('Please fill in all withdrawal address fields');
      return;
    }

    // Check if user already has 2 addresses
    if (withdrawalAddresses.length >= 2) {
      // Need approval for additional addresses
      await requestAddressChange();
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('withdrawal_addresses')
        .insert({
          user_id: user.id,
          address: withdrawalAddressData.address,
          label: withdrawalAddressData.label,
          network: withdrawalAddressData.network,
          is_verified: false,
          change_count: 0,
        });

      if (error) {
        throw new Error(error.message);
      }

      setSuccess('Withdrawal address added successfully!');
      setWithdrawalAddressData({
        address: '',
        label: '',
        network: 'BEP20',
      });
      
      await loadWithdrawalAddresses();
    } catch (err: any) {
      setError(`Failed to add withdrawal address: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const requestAddressChange = async () => {
    if (!user) return;

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('withdrawal_address_changes')
        .insert({
          user_id: user.id,
          new_address: withdrawalAddressData.address,
          new_label: withdrawalAddressData.label,
          network: withdrawalAddressData.network,
          status: 'pending',
          reason: 'User has reached maximum address limit (2)',
        });

      if (error) {
        throw new Error(error.message);
      }

      setSuccess('Address change request submitted for approval. You will be notified once reviewed.');
      setWithdrawalAddressData({
        address: '',
        label: '',
        network: 'BEP20',
      });
      
      await loadPendingChanges();
    } catch (err: any) {
      setError(`Failed to submit address change request: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteWithdrawalAddress = async (addressId: string) => {
    if (!user) return;

    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase
        .from('withdrawal_addresses')
        .delete()
        .eq('id', addressId)
        .eq('user_id', user.id);

      if (error) {
        throw new Error(error.message);
      }

      setSuccess('Withdrawal address deleted successfully!');
      await loadWithdrawalAddresses();
    } catch (err: any) {
      setError(`Failed to delete withdrawal address: ${err.message}`);
    } finally {
      setIsLoading(false);
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
          <p className="text-gray-600 mb-4">Please log in to access settings</p>
          <Button onClick={() => router.push('/login')}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'withdrawal', label: 'Withdrawal', icon: Wallet },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

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
                <h1 className="text-xl font-bold text-gray-900">Account Settings</h1>
                <p className="text-sm text-gray-600">Manage your account preferences and security</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Settings className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        {/* Status Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-2">
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
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-2">
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
              <CardHeader>
                <CardTitle className="text-lg">Settings</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <nav className="space-y-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 text-left text-sm font-medium rounded-lg transition-colors ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-orange-400 to-teal-500 text-white'
                          : 'text-gray-700 hover:bg-orange-50'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="w-5 h-5 mr-2 text-orange-600" />
                    Profile Information
                  </CardTitle>
                  <CardDescription>
                    Update your personal information and profile picture
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Profile Image */}
                  <div className="flex items-center space-x-6">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg">
                        {profileData.profile_image ? (
                          <img
                            src={profileData.profile_image}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-orange-400 to-teal-500">
                            <User className="w-8 h-8 text-white" />
                          </div>
                        )}
                      </div>
                      {isUploadingImage && (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                          <Loader2 className="w-6 h-6 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Profile Picture</h3>
                      <p className="text-sm text-gray-600 mb-3">Upload a new profile picture (max 5MB)</p>
                      <div className="flex space-x-2">
                        <label htmlFor="profile-image" className="cursor-pointer">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-orange-200 hover:bg-orange-50"
                            disabled={isUploadingImage}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Image
                          </Button>
                        </label>
                        <input
                          id="profile-image"
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Profile Form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={profileData.username}
                        onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                        className="bg-white border-orange-200 focus:border-orange-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email}
                        disabled
                        className="bg-gray-50 border-gray-200"
                      />
                      <p className="text-xs text-gray-500">Email cannot be changed</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={profileData.full_name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                        className="bg-white border-orange-200 focus:border-orange-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={profileData.phone}
                        onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                        className="bg-white border-orange-200 focus:border-orange-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={profileData.country}
                        onChange={(e) => setProfileData(prev => ({ ...prev, country: e.target.value }))}
                        className="bg-white border-orange-200 focus:border-orange-400"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleProfileUpdate}
                      disabled={isSaving}
                      className="bg-gradient-to-r from-orange-400 to-teal-500 hover:from-orange-500 hover:to-teal-600 text-white"
                    >
                      {isSaving ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Saving...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Save className="w-4 h-4" />
                          <span>Save Changes</span>
                        </div>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                {/* Password Change */}
                <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Lock className="w-5 h-5 mr-2 text-orange-600" />
                      Change Password
                    </CardTitle>
                    <CardDescription>
                      Update your account password for better security
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <div className="relative">
                        <Input
                          id="current-password"
                          type={showCurrentPassword ? "text" : "password"}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                          className="bg-white border-orange-200 focus:border-orange-400 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 h-auto"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <div className="relative">
                        <Input
                          id="new-password"
                          type={showNewPassword ? "text" : "password"}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                          className="bg-white border-orange-200 focus:border-orange-400 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 h-auto"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="bg-white border-orange-200 focus:border-orange-400"
                      />
                    </div>

                    <Button
                      onClick={handlePasswordChange}
                      disabled={isSaving}
                      className="bg-gradient-to-r from-orange-400 to-teal-500 hover:from-orange-500 hover:to-teal-600 text-white"
                    >
                      {isSaving ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Updating...</span>
                        </div>
                      ) : (
                        'Update Password'
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Transaction PIN */}
                <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Key className="w-5 h-5 mr-2 text-orange-600" />
                      Transaction PIN
                      {hasTransactionPin && (
                        <Badge className="ml-2 bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Set
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {hasTransactionPin 
                        ? 'Change your 4-digit PIN for withdrawal confirmations (requires email verification)'
                        : 'Set a 4-digit PIN for withdrawal confirmations (requires email verification)'
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Email OTP Verification */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">Email Verification Required</h4>
                      <p className="text-sm text-blue-700 mb-3">
                        Verify your email to {hasTransactionPin ? 'change' : 'set'} transaction PIN
                      </p>
                      
                      {!otpSent ? (
                        <Button
                          onClick={sendEmailOTP}
                          disabled={isLoading}
                          variant="outline"
                          size="sm"
                          className="border-blue-200 hover:bg-blue-100 text-blue-700"
                        >
                          {isLoading ? (
                            <div className="flex items-center space-x-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Sending...</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <Mail className="w-4 h-4" />
                              <span>Send OTP to Email</span>
                            </div>
                          )}
                        </Button>
                      ) : !otpVerified ? (
                        <div className="flex space-x-2">
                          <Input
                            placeholder="Enter 4-digit OTP"
                            value={otpData.code}
                            onChange={(e) => setOtpData(prev => ({ ...prev, code: e.target.value }))}
                            className="flex-1 bg-white border-blue-200"
                            maxLength={4}
                          />
                          <Button
                            onClick={verifyEmailOTP}
                            disabled={isLoading || otpData.code.length !== 4}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              'Verify'
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 text-green-700">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm">Email verified successfully!</span>
                        </div>
                      )}
                    </div>

                    {otpVerified && (
                      <>
                        {hasTransactionPin && (
                          <div className="space-y-2">
                            <Label htmlFor="current-pin">Current PIN</Label>
                            <div className="relative">
                              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                              <Input
                                id="current-pin"
                                type={showCurrentPin ? "text" : "password"}
                                value={transactionPinData.currentPin}
                                onChange={(e) => setTransactionPinData(prev => ({ 
                                  ...prev, 
                                  currentPin: e.target.value.replace(/\D/g, '').substring(0, 4)
                                }))}
                                className="pl-10 pr-12 bg-white border-orange-200 focus:border-orange-400 text-center text-lg tracking-widest"
                                maxLength={4}
                                placeholder="••••"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowCurrentPin(!showCurrentPin)}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 h-auto"
                              >
                                {showCurrentPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </Button>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="new-pin">New 4-Digit PIN</Label>
                          <Input
                            id="new-pin"
                            type="password"
                            value={transactionPinData.newPin}
                            onChange={(e) => setTransactionPinData(prev => ({ ...prev, newPin: e.target.value.replace(/\D/g, '') }))}
                            className="bg-white border-orange-200 focus:border-orange-400"
                            maxLength={4}
                            placeholder="Enter new PIN"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="confirm-pin">Confirm New PIN</Label>
                          <Input
                            id="confirm-pin"
                            type="password"
                            value={transactionPinData.confirmPin}
                            onChange={(e) => setTransactionPinData(prev => ({ ...prev, confirmPin: e.target.value.replace(/\D/g, '') }))}
                            className="bg-white border-orange-200 focus:border-orange-400"
                            maxLength={4}
                            placeholder="Confirm new PIN"
                          />
                        </div>

                        <Button
                          onClick={handleTransactionPinChange}
                          disabled={isSaving || transactionPinData.newPin.length !== 4}
                          className="bg-gradient-to-r from-orange-400 to-teal-500 hover:from-orange-500 hover:to-teal-600 text-white"
                        >
                          {isSaving ? (
                            <div className="flex items-center space-x-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Updating...</span>
                            </div>
                          ) : (
                            hasTransactionPin ? 'Change Transaction PIN' : 'Set Transaction PIN'
                          )}
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Withdrawal Tab */}
            {activeTab === 'withdrawal' && (
              <div className="space-y-6">
                {/* Current Withdrawal Addresses */}
                <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Wallet className="w-5 h-5 mr-2 text-orange-600" />
                      Withdrawal Addresses
                    </CardTitle>
                    <CardDescription>
                      Manage your withdrawal addresses (maximum 2 addresses allowed)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {withdrawalAddresses.length === 0 ? (
                      <div className="text-center py-8">
                        <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No withdrawal addresses</h3>
                        <p className="text-gray-600">Add your first withdrawal address to start withdrawing funds</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {withdrawalAddresses.map((addr) => (
                          <div key={addr.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium text-gray-900">{addr.label}</h4>
                                <Badge className={addr.is_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                                  {addr.is_verified ? 'Verified' : 'Pending'}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {addr.network}
                                </Badge>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteWithdrawalAddress(addr.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <p className="text-sm text-gray-600 font-mono bg-gray-50 p-2 rounded">
                              {addr.address}
                            </p>
                            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                              <span>Added: {new Date(addr.created_at).toLocaleDateString()}</span>
                              <span>Changes: {addr.change_count}/2</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Add New Address */}
                <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Plus className="w-5 h-5 mr-2 text-green-600" />
                      Add Withdrawal Address
                    </CardTitle>
                    <CardDescription>
                      {withdrawalAddresses.length >= 2 
                        ? 'You have reached the maximum limit. New addresses require approval.'
                        : 'Add a new withdrawal address for your funds'
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="address">Wallet Address</Label>
                      <Input
                        id="address"
                        value={withdrawalAddressData.address}
                        onChange={(e) => setWithdrawalAddressData(prev => ({ ...prev, address: e.target.value }))}
                        className="bg-white border-orange-200 focus:border-orange-400 font-mono"
                        placeholder="Enter BEP20 wallet address"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="label">Address Label</Label>
                      <Input
                        id="label"
                        value={withdrawalAddressData.label}
                        onChange={(e) => setWithdrawalAddressData(prev => ({ ...prev, label: e.target.value }))}
                        className="bg-white border-orange-200 focus:border-orange-400"
                        placeholder="e.g., My Binance Wallet"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="network">Network</Label>
                      <Input
                        id="network"
                        value={withdrawalAddressData.network}
                        disabled
                        className="bg-gray-50 border-gray-200"
                      />
                      <p className="text-xs text-gray-500">Only BEP20 network is supported</p>
                    </div>

                    <Button
                      onClick={withdrawalAddresses.length >= 2 ? requestAddressChange : addWithdrawalAddress}
                      disabled={isSaving || !withdrawalAddressData.address || !withdrawalAddressData.label}
                      className="bg-gradient-to-r from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white"
                    >
                      {isSaving ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Processing...</span>
                        </div>
                      ) : withdrawalAddresses.length >= 2 ? (
                        'Request Address Change'
                      ) : (
                        'Add Address'
                      )}
                    </Button>

                    {withdrawalAddresses.length >= 2 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-amber-800 text-sm">
                          <strong>Note:</strong> You can only have 2 withdrawal addresses. Additional addresses require admin approval.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Pending Address Changes */}
                {pendingChanges.length > 0 && (
                  <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Clock className="w-5 h-5 mr-2 text-yellow-600" />
                        Pending Address Changes
                      </CardTitle>
                      <CardDescription>
                        Address change requests awaiting approval
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {pendingChanges.map((change) => (
                        <div key={change.id} className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-yellow-900">{change.new_label}</h4>
                            <Badge className="bg-yellow-100 text-yellow-800">
                              {change.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-yellow-800 font-mono bg-yellow-100 p-2 rounded mb-2">
                            {change.new_address}
                          </p>
                          <div className="text-xs text-yellow-700">
                            <p>Requested: {new Date(change.requested_at).toLocaleString()}</p>
                            {change.reason && <p>Reason: {change.reason}</p>}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bell className="w-5 h-5 mr-2 text-orange-600" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>
                    Configure how you want to receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center py-8">
                    <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Notification Settings</h3>
                    <p className="text-gray-600">Notification preferences will be available soon</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}