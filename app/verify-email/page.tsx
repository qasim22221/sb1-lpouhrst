"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Mail, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  Clock,
  ArrowRight,
  Home,
  Moon,
  Sun
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function VerifyEmailPage() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [email, setEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    setMounted(true);
    
    // Get email from URL params
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
    
    // Check for dark mode preference
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [searchParams]);

  useEffect(() => {
    // If user is logged in and email is verified, redirect to dashboard
    if (mounted && !authLoading && user && user.email_confirmed_at) {
      router.push('/dashboard');
    }
  }, [user, authLoading, mounted, router]);

  useEffect(() => {
    // Countdown for resend cooldown
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendVerification = async () => {
    if (resendCooldown > 0) return;
    
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!email) {
        throw new Error('Email address is required');
      }

      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (resendError) {
        throw new Error(resendError.message);
      }

      setSuccess('Verification email sent! Please check your inbox.');
      setResendCooldown(60); // 60 second cooldown
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email');
    } finally {
      setIsLoading(false);
    }
  };

  const checkVerificationStatus = async () => {
    if (!email || isChecking) return;
    
    setIsChecking(true);
    setIsLoading(true);
    setError('');

    try {
      // Use the service role key to verify email
      if (supabase.auth.admin) {
        const { error } = await supabase.auth.admin.verifyEmail(email);
        
        if (error) {
          console.error("Error verifying email:", error);
          throw new Error("Failed to verify email status");
        }
        
        setIsVerified(true);
        setSuccess('Your email has been verified! You can now sign in.');
        
        // Redirect to login after a delay
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        throw new Error("Admin functions not available. Please contact support.");
      }
    } catch (err: any) {
      console.error("Verification check error:", err);
      setError(err.message || 'Failed to check verification status');
    } finally {
      setIsLoading(false);
      setIsChecking(false);
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

  // Don't render anything until mounted
  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-32 h-32 bg-orange-200/20 dark:bg-orange-700/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-teal-200/20 dark:bg-teal-700/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-100/10 dark:bg-orange-800/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          {/* Back to Login */}
          <div className="mb-6 flex justify-between">
            <Button
              variant="ghost"
              onClick={() => router.push('/login')}
              className="text-gray-600 hover:text-orange-600 hover:bg-orange-50 dark:text-gray-300 dark:hover:text-orange-400 dark:hover:bg-gray-800 p-2"
              disabled={isLoading}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
            
            <Button
              variant="ghost"
              onClick={toggleDarkMode}
              className="text-gray-600 hover:text-orange-600 hover:bg-orange-50 dark:text-gray-300 dark:hover:text-orange-400 dark:hover:bg-gray-800 p-2"
              disabled={isLoading}
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
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Verify Your Email
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Please check your inbox and click the verification link
            </p>
          </div>

          {/* Card */}
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-orange-100 dark:border-gray-700 shadow-xl">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl text-center text-gray-900 dark:text-white">Email Verification</CardTitle>
              <CardDescription className="text-center text-gray-600 dark:text-gray-400">
                {isVerified 
                  ? 'Your email has been verified successfully!'
                  : 'We sent a verification link to your email address'
                }
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
                </div>
              )}

              {isVerified ? (
                <div className="text-center py-4">
                  <CheckCircle className="w-12 h-12 text-green-500 dark:text-green-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Email Verified!</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Your email has been successfully verified. You can now sign in to your account.
                  </p>
                  <div className="space-y-3">
                    <Button 
                      onClick={() => router.push('/login')}
                      className="w-full bg-gradient-to-r from-teal-400 to-orange-500 hover:from-teal-500 hover:to-orange-600 text-white"
                    >
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Sign In Now
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => router.push('/')}
                      className="w-full border-orange-200 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-900/30 text-gray-700 dark:text-gray-300"
                    >
                      <Home className="w-4 h-4 mr-2" />
                      Return to Home
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      Verification Email Sent
                    </h3>
                    <p className="text-blue-700 dark:text-blue-400 text-sm mb-2">
                      We've sent a verification link to: <strong>{email || 'your email address'}</strong>
                    </p>
                    <p className="text-blue-700 dark:text-blue-400 text-sm">
                      Please check your inbox (and spam folder) and click the verification link to activate your account.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Button
                      onClick={handleResendVerification}
                      disabled={isLoading || resendCooldown > 0}
                      className="w-full bg-gradient-to-r from-teal-400 to-orange-500 hover:from-teal-500 hover:to-orange-600 text-white"
                    >
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sending...</span>
                        </div>
                      ) : resendCooldown > 0 ? (
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4" />
                          <span>Resend in {resendCooldown}s</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <RefreshCw className="w-4 h-4" />
                          <span>Resend Verification Email</span>
                        </div>
                      )}
                    </Button>

                    <Button
                      onClick={checkVerificationStatus}
                      disabled={isLoading || isChecking}
                      variant="outline"
                      className="w-full border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    >
                      {isLoading || isChecking ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Verify Email Now
                    </Button>
                  </div>

                  <div className="text-center pt-4 border-t border-orange-100 dark:border-orange-800/50">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Already verified?{' '}
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
                </div>
              )}
            </CardContent>
          </Card>

          {/* Help Text */}
          <div className="text-center mt-6">
            <p className="text-xs text-gray-500 dark:text-gray-500">
              If you don't receive an email within a few minutes, please check your spam folder or{' '}
              <Button variant="link" className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 p-0 h-auto text-xs font-normal">
                contact support
              </Button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}