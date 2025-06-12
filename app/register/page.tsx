"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Sparkles, Copy, Check, ArrowLeft, AlertCircle, Loader2, Moon, Sun } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function RegisterPage() {
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [referralCodeCopied, setReferralCodeCopied] = useState(false);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    referralCode: '',
    agreeToTerms: false
  });

  useEffect(() => {
    setMounted(true);
    
    // Check for dark mode preference
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && user) {
      console.log('🔄 User already logged in, redirecting to dashboard...');
      router.push('/dashboard');
    }
  }, [user, authLoading, mounted, router]);

  // Check for referral code in URL
  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref');
      if (refCode) {
        setFormData(prev => ({ ...prev, referralCode: refCode }));
      }
    }
  }, [mounted]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const copyReferralCode = () => {
    const code = generateReferralCode();
    navigator.clipboard.writeText(code);
    setReferralCodeCopied(true);
    setTimeout(() => setReferralCodeCopied(false), 2000);
  };

  // Check if username exists
  const checkUsernameExists = async (username: string): Promise<boolean> => {
    try {
      console.log('Checking if username exists:', username);
      
      // Use the login_lookup view instead of profiles table directly
      const { data, error } = await supabase
        .from('login_lookup')
        .select('username')
        .eq('username', username.trim())
        .maybeSingle();

      if (error) {
        console.error('Error checking username:', error);
        throw new Error('Error checking username availability. Please try again.');
      }

      return !!data; // Return true if username exists, false otherwise
    } catch (err: any) {
      console.error('Username check failed:', err);
      throw new Error(`Error checking username availability: ${err.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isLoading) {
      console.log('Already processing registration, ignoring duplicate submission');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Validate input
      if (!formData.username.trim()) {
        throw new Error('Please enter a username');
      }
      if (!formData.email.trim()) {
        throw new Error('Please enter your email address');
      }
      if (!formData.password.trim()) {
        throw new Error('Please enter a password');
      }
      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      if (!formData.agreeToTerms) {
        throw new Error('You must agree to the Terms of Service and Privacy Policy');
      }

      // Check if username already exists
      try {
        const usernameExists = await checkUsernameExists(formData.username);
        if (usernameExists) {
          throw new Error('Username already exists. Please choose a different username.');
        }
      } catch (usernameError: any) {
        if (usernameError.message.includes('already exists')) {
          throw usernameError;
        }
        console.error('Username check error:', usernameError);
        // Continue with registration even if username check fails
        console.log('Continuing with registration despite username check error');
      }

      // Generate a unique referral code
      const userReferralCode = generateReferralCode();
      
      console.log('=== REGISTRATION ATTEMPT START ===');
      console.log('Username:', formData.username);
      console.log('Email:', formData.email);
      console.log('Referral code:', userReferralCode);
      console.log('Referred by:', formData.referralCode || 'None');

      // Sign up with Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            username: formData.username.trim(),
            referral_code: userReferralCode,
            referred_by: formData.referralCode.trim() || null
          }
        },
      });

      if (signUpError) {
        console.error('Sign up error:', signUpError);
        
        if (signUpError.message.includes('User already registered')) {
          throw new Error('An account with this email already exists. Please sign in instead.');
        } else if (signUpError.message.includes('Password should be at least 6 characters')) {
          throw new Error('Password must be at least 6 characters long.');
        } else {
          throw new Error(signUpError.message || 'Registration failed. Please try again.');
        }
      }

      if (!authData.user) {
        throw new Error('Failed to create user account. Please try again.');
      }

      console.log('User created successfully:', authData.user.id);

      // Wait longer for the auth session to be established and user record to be committed
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Create profile using the database function
      console.log('Creating profile with function...');
      const { data: profileResult, error: profileError } = await supabase.rpc('create_user_profile', {
        user_id: authData.user.id,
        username_param: formData.username.trim(),
        email_param: formData.email.trim(),
        referral_code_param: userReferralCode,
        referred_by_param: formData.referralCode.trim() || null,
      });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        throw new Error(`Failed to create user profile: ${profileError.message}`);
      }

      console.log('Profile creation result:', profileResult);

      if (!profileResult.success) {
        throw new Error(profileResult.error || 'Failed to create profile');
      }

      console.log('Registration completed successfully');
      setEmailVerificationSent(true);
      
      // Sign out to prevent auto-redirect to dashboard before email verification
      await supabase.auth.signOut();
      
    } catch (error: any) {
      console.error('Registration error:', error);
      setError(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', String(newMode));
    
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  if (!mounted) {
    return null;
  }

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-orange-400 dark:text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
      {/* Subtle Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-32 h-32 bg-orange-200/20 dark:bg-orange-700/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-teal-200/20 dark:bg-teal-700/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-100/10 dark:bg-orange-800/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-3 h-3 bg-orange-300/40 dark:bg-orange-600/20 rounded-full animate-bounce delay-300"></div>
        <div className="absolute top-40 right-32 w-4 h-4 bg-teal-300/40 dark:bg-teal-600/20 rounded-full animate-bounce delay-700"></div>
        <div className="absolute bottom-32 left-1/4 w-2 h-2 bg-orange-400/40 dark:bg-orange-700/20 rounded-full animate-bounce delay-1000"></div>
        <div className="absolute bottom-20 right-20 w-3 h-3 bg-teal-400/40 dark:bg-teal-700/20 rounded-full animate-bounce delay-500"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          {/* Back to Home */}
          <div className="mb-6 flex justify-between">
            <Button
              variant="ghost"
              onClick={() => router.push('/')}
              className="text-gray-600 hover:text-orange-600 hover:bg-orange-50 dark:text-gray-300 dark:hover:text-orange-400 dark:hover:bg-gray-800 p-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            
            <Button
              variant="ghost"
              onClick={toggleDarkMode}
              className="text-gray-600 hover:text-orange-600 hover:bg-orange-50 dark:text-gray-300 dark:hover:text-orange-400 dark:hover:bg-gray-800 p-2"
            >
              {darkMode ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-teal-400 to-orange-500 rounded-2xl mb-4 shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Join Our Network
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Start earning with our 7-stream income system
            </p>
          </div>

          {/* Register Card */}
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-orange-100 dark:border-gray-700 shadow-xl">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl text-center text-gray-900 dark:text-white">Create Account</CardTitle>
              <CardDescription className="text-center text-gray-600 dark:text-gray-400">
                Join thousands of successful members
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {emailVerificationSent ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gradient-to-r from-teal-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Mail className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Check Your Email</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
                    We've sent a verification link to {formData.email}. Please check your email and click the link to verify your account.
                  </p>
                  <div className="space-y-3">
                    <Button 
                      onClick={() => router.push(`/verify-email?email=${encodeURIComponent(formData.email)}`)}
                      className="w-full bg-gradient-to-r from-teal-400 to-orange-500 hover:from-teal-500 hover:to-orange-600 text-white"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Verify Email
                    </Button>
                    <Button 
                      onClick={() => router.push('/login')}
                      variant="outline" 
                      className="w-full border-orange-200 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-900/30 text-gray-700 dark:text-gray-300"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Login
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                    </div>
                  )}

                  {/* Username Field */}
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-gray-700 dark:text-gray-300 font-medium">
                      Username
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                      <Input
                        id="username"
                        type="text"
                        placeholder="Choose a unique username"
                        value={formData.username}
                        onChange={(e) => handleInputChange('username', e.target.value)}
                        className="pl-10 h-12 bg-white dark:bg-gray-900 border-orange-200 dark:border-orange-800 focus:border-orange-400 dark:focus:border-orange-600 focus:ring-orange-400/20 dark:focus:ring-orange-600/20 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700 dark:text-gray-300 font-medium">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email address"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="pl-10 h-12 bg-white dark:bg-gray-900 border-orange-200 dark:border-orange-800 focus:border-orange-400 dark:focus:border-orange-600 focus:ring-orange-400/20 dark:focus:ring-orange-600/20 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-700 dark:text-gray-300 font-medium">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a strong password"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className="pl-10 pr-12 h-12 bg-white dark:bg-gray-900 border-orange-200 dark:border-orange-800 focus:border-orange-400 dark:focus:border-orange-600 focus:ring-orange-400/20 dark:focus:ring-orange-600/20 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                        required
                        minLength={6}
                        disabled={isLoading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-2 h-auto"
                        disabled={isLoading}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Referral Code Field */}
                  <div className="space-y-2">
                    <Label htmlFor="referralCode" className="text-gray-700 dark:text-gray-300 font-medium">
                      Referral Code <span className="text-gray-500 dark:text-gray-400 font-normal">(Optional)</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="referralCode"
                        type="text"
                        placeholder="Enter referral code (optional)"
                        value={formData.referralCode}
                        onChange={(e) => handleInputChange('referralCode', e.target.value.toUpperCase())}
                        className="pr-12 h-12 bg-white dark:bg-gray-900 border-orange-200 dark:border-orange-800 focus:border-orange-400 dark:focus:border-orange-600 focus:ring-orange-400/20 dark:focus:ring-orange-600/20 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                        disabled={isLoading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={copyReferralCode}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-2 h-auto"
                        disabled={isLoading}
                      >
                        {referralCodeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Get your unique referral code after registration
                    </p>
                  </div>

                  {/* Terms Agreement */}
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="terms"
                      checked={formData.agreeToTerms}
                      onCheckedChange={(checked) => handleInputChange('agreeToTerms', checked as boolean)}
                      className="border-orange-300 dark:border-orange-700 data-[state=checked]:bg-orange-500 dark:data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-500 dark:data-[state=checked]:border-orange-600 mt-1"
                      disabled={isLoading}
                    />
                    <Label htmlFor="terms" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer leading-relaxed">
                      I agree to the{' '}
                      <Button variant="link" className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 p-0 h-auto text-sm font-normal">
                        Terms of Service
                      </Button>{' '}
                      and{' '}
                      <Button variant="link" className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 p-0 h-auto text-sm font-normal">
                        Privacy Policy
                      </Button>
                    </Label>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isLoading || !formData.agreeToTerms || !formData.username.trim() || !formData.email.trim() || !formData.password.trim()}
                    className="w-full bg-gradient-to-r from-teal-400 to-orange-500 hover:from-teal-500 hover:to-orange-600 text-white font-medium h-12 text-base transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creating Account...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span>Create Account</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    )}
                  </Button>
                </form>
              )}

              {/* Footer Text */}
              {!emailVerificationSent && (
                <div className="text-center pt-4 border-t border-orange-100 dark:border-orange-800/50">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Already have an account?{' '}
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => router.push('/login')}
                      className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 p-0 h-auto text-sm font-medium"
                      disabled={isLoading}
                    >
                      Sign in instead
                    </Button>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Income Streams Preview */}
          {!emailVerificationSent && (
            <Card className="mt-6 bg-gradient-to-r from-teal-400 to-orange-500 dark:from-teal-600 dark:to-orange-700 border-0 shadow-xl text-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg text-center">
                  🚀 Seven Income Streams Await
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-1 gap-2 text-xs text-white/90">
                  <div className="flex justify-between">
                    <span>Direct Referral:</span>
                    <span className="font-semibold">$5 instant</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Level Income:</span>
                    <span className="font-semibold">$0.5 per level</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pool Rewards:</span>
                    <span className="font-semibold">$5-$27</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Team Rewards:</span>
                    <span className="font-semibold">Up to $5,000</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}