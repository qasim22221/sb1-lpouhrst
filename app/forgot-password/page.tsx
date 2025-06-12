"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, ArrowRight, Sparkles, ArrowLeft, AlertCircle, Loader2, CheckCircle, KeyRound, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function ForgotPasswordPage() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  // Form states
  const [email, setEmail] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && user) {
      console.log('🔄 User already logged in, redirecting to dashboard...');
      router.push('/dashboard');
    }
  }, [user, mounted, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Validate input
      if (!email.trim()) {
        throw new Error('Please enter your email address');
      }

      // Send password reset email
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        throw new Error(resetError.message);
      }

      // Success
      setEmailSent(true);
      setSuccess('Password reset link sent! Please check your email inbox.');
    } catch (error: any) {
      setError(error.message || 'Failed to send password reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render anything until mounted
  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-teal-50 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-32 h-32 bg-orange-200/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-teal-200/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-100/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          {/* Back to Login */}
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => router.push('/login')}
              className="text-gray-600 hover:text-orange-600 hover:bg-orange-50 p-2"
              disabled={isLoading}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          </div>

          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-400 to-teal-500 rounded-2xl mb-4 shadow-lg">
              <KeyRound className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Forgot Password
            </h1>
            <p className="text-gray-600">
              Enter your email to receive a password reset link
            </p>
          </div>

          {/* Card */}
          <Card className="bg-white/80 backdrop-blur-sm border border-orange-100 shadow-xl">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl text-center text-gray-900">Reset Password</CardTitle>
              <CardDescription className="text-center text-gray-600">
                {emailSent 
                  ? 'Check your email for the reset link'
                  : 'We\'ll send you instructions to reset your password'
                }
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Success Message */}
              {emailSent ? (
                <div className="text-center py-4">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Sent!</h3>
                  <p className="text-gray-600 text-sm mb-6">
                    We've sent a password reset link to <strong>{email}</strong>. Please check your inbox and follow the instructions.
                  </p>
                  <div className="space-y-3">
                    <Button 
                      onClick={() => router.push('/login')}
                      className="w-full bg-gradient-to-r from-orange-400 to-teal-500 hover:from-orange-500 hover:to-teal-600 text-white"
                    >
                      Return to Login
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEmailSent(false);
                        setEmail('');
                      }}
                      className="w-full border-orange-200 hover:bg-orange-50 text-gray-700"
                    >
                      Try Another Email
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700 font-medium">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-12 bg-white border-orange-200 focus:border-orange-400 focus:ring-orange-400/20 text-gray-900 placeholder:text-gray-500"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isLoading || !email.trim()}
                    className="w-full bg-gradient-to-r from-orange-400 to-teal-500 hover:from-orange-500 hover:to-teal-600 text-white font-medium h-12 text-base transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Email...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span>Send Reset Link</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    )}
                  </Button>
                </form>
              )}

              {/* Footer Text */}
              <div className="text-center pt-4 border-t border-orange-100">
                <p className="text-sm text-gray-600">
                  Remember your password?{' '}
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => router.push('/login')}
                    className="text-orange-600 hover:text-orange-700 p-0 h-auto text-sm font-medium"
                    disabled={isLoading}
                  >
                    Sign in instead
                  </Button>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Help Text */}
          <div className="text-center mt-6">
            <p className="text-xs text-gray-500">
              If you don't receive an email within a few minutes, please check your spam folder or{' '}
              <Button variant="link" className="text-orange-600 hover:text-orange-700 p-0 h-auto text-xs font-normal">
                contact support
              </Button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}