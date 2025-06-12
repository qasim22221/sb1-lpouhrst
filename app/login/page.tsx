"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Lock, User, ArrowRight, Sparkles, ArrowLeft, AlertCircle, RefreshCw, Users, Database, Settings, Loader2, KeyRound, Moon, Sun } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [availableUsernames, setAvailableUsernames] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading, error: authError } = useAuth();

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false
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
    if (mounted && !authLoading && user && !redirecting) {
      console.log('🔄 User already logged in, redirecting to dashboard...');
      setRedirecting(true);
      router.push('/dashboard');
    }
  }, [user, authLoading, mounted, router, redirecting]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
    setShowSuggestions(false);
  };

  const checkUsernameExists = async (username: string): Promise<{ exists: boolean; email?: string; error?: string }> => {
    try {
      console.log('=== CHECKING USERNAME ===');
      console.log('Input username:', `"${username}"`);
      console.log('Trimmed username:', `"${username.trim()}"`);
      
      // Get all profiles for comparison using login_lookup view
      const { data: allProfiles, error: allError } = await supabase
        .from('login_lookup')
        .select('username, email')
        .limit(50);

      console.log('All profiles in database:', allProfiles);

      if (allError) {
        console.error('Error fetching all profiles:', allError);
        return { 
          exists: false, 
          error: `Database error: ${allError.message}` 
        };
      }

      if (!allProfiles || allProfiles.length === 0) {
        return { 
          exists: false, 
          error: 'No users found in database. Please register first!' 
        };
      }

      // Update available usernames
      setAvailableUsernames(allProfiles.map(p => p.username));

      // Check for exact match (case-sensitive)
      const exactMatch = allProfiles.find(p => p.username === username.trim());
      console.log('Exact match result:', exactMatch);

      if (exactMatch) {
        return { 
          exists: true, 
          email: exactMatch.email 
        };
      }

      // Check for case-insensitive match
      const caseInsensitiveMatch = allProfiles.find(p => 
        p.username.toLowerCase() === username.trim().toLowerCase()
      );
      console.log('Case-insensitive match result:', caseInsensitiveMatch);

      if (caseInsensitiveMatch) {
        return { 
          exists: false, 
          error: `Username found but case doesn't match. Try: "${caseInsensitiveMatch.username}"` 
        };
      }

      // No match found
      return { 
        exists: false,
        error: `Username "${username.trim()}" not found.`
      };

    } catch (error: any) {
      console.error('Username check failed:', error);
      return { 
        exists: false, 
        error: `Check failed: ${error.message}` 
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isLoading) {
      console.log('Already processing login, ignoring duplicate submission');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('=== LOGIN ATTEMPT START ===');
      console.log('Username entered:', `"${formData.username}"`);

      // Validate input
      if (!formData.username.trim()) {
        throw new Error('Please enter your username');
      }
      if (!formData.password.trim()) {
        throw new Error('Please enter your password');
      }

      // Check if username exists and get email
      setIsCheckingUsername(true);
      const usernameCheck = await checkUsernameExists(formData.username);
      setIsCheckingUsername(false);

      if (usernameCheck.error) {
        if (usernameCheck.error.includes('No users found')) {
          // Show register button prominently
          setShowSuggestions(false);
        } else {
          // Show username suggestions
          setShowSuggestions(true);
        }
        throw new Error(usernameCheck.error);
      }

      if (!usernameCheck.exists) {
        setShowSuggestions(true);
        throw new Error(`Username "${formData.username.trim()}" not found. Please check your username or register for a new account.`);
      }

      if (!usernameCheck.email) {
        throw new Error('User email not found. Please contact support.');
      }

      console.log('Username verified, attempting sign in with email:', usernameCheck.email);

      // Now try to sign in with the found email
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: usernameCheck.email,
        password: formData.password,
      });

      console.log('Sign in result:', { signInData, signInError });

      if (signInError) {
        console.error('Sign in error:', signInError);
        
        if (signInError.message.includes('Invalid login credentials')) {
          throw new Error('Invalid password. Please check your password and try again.');
        } else if (signInError.message.includes('Email not confirmed')) {
          console.log('Email not verified, redirecting to verification page');
          
          // Clear form data
          setFormData({
            username: '',
            password: '',
            rememberMe: false
          });
          
          // Redirect to verification page
          setRedirecting(true);
          router.push('/verify-email?email=' + encodeURIComponent(usernameCheck.email));
          return;
        } else if (signInError.message.includes('Too many requests')) {
          throw new Error('Too many login attempts. Please wait a moment and try again.');
        } else {
          throw new Error(`Login failed: ${signInError.message}`);
        }
      }

      if (signInData.user) {
        console.log('=== LOGIN SUCCESSFUL ===');
        console.log('User logged in:', signInData.user.id);
        
        // Check if email is verified
        if (!signInData.user.email_confirmed_at) {
          console.log('Email not verified, redirecting to verification page');
          
          // Sign out the user since we don't want unverified users to have a session
          await supabase.auth.signOut();
          
          // Clear form data
          setFormData({
            username: '',
            password: '',
            rememberMe: false
          });
          
          // Redirect to verification page
          setRedirecting(true);
          router.push('/verify-email?email=' + encodeURIComponent(usernameCheck.email));
          return;
        }
        
        // Email is verified, proceed with login
        // Clear form data
        setFormData({
          username: '',
          password: '',
          rememberMe: false
        });
        
        // Don't redirect immediately - let useAuth handle it
        console.log('Login successful, waiting for auth state update...');
      }

    } catch (error: any) {
      console.error('=== LOGIN ERROR ===');
      console.error('Error details:', error);
      setError(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
      setIsCheckingUsername(false);
    }
  };

  const selectSuggestedUsername = (username: string) => {
    setFormData(prev => ({ ...prev, username }));
    setShowSuggestions(false);
    setError('');
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

  // Show loading if auth is still loading
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

  // Show redirecting state
  if (redirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-orange-400 dark:text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Show auth error if there's a persistent auth issue
  if (authError && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-red-200 dark:border-red-800">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
            <CardTitle className="text-red-900 dark:text-red-300">Authentication Error</CardTitle>
            <CardDescription className="text-red-700 dark:text-red-400">
              {authError}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => window.location.reload()}
              className="w-full bg-gradient-to-r from-orange-400 to-teal-500 hover:from-orange-500 hover:to-teal-600 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reload Page
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/diagnostic')}
              className="w-full border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-900/30 dark:text-blue-300"
            >
              <Database className="w-4 h-4 mr-2" />
              Run Diagnostics
            </Button>
          </CardContent>
        </Card>
      </div>
    );
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
          {/* Back to Home */}
          <div className="mb-6 flex justify-between">
            <Button
              variant="ghost"
              onClick={() => router.push('/')}
              className="text-gray-600 hover:text-orange-600 hover:bg-orange-50 dark:text-gray-300 dark:hover:text-orange-400 dark:hover:bg-gray-800 p-2"
              disabled={isLoading}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
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
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Sign in to access your referral dashboard
            </p>
          </div>

          {/* Login Card */}
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-orange-100 dark:border-gray-700 shadow-xl">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl text-center text-gray-900 dark:text-white">Sign In</CardTitle>
              <CardDescription className="text-center text-gray-600 dark:text-gray-400">
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-300 whitespace-pre-line">{error}</p>
                  </div>
                )}

                {/* Username Suggestions */}
                {showSuggestions && availableUsernames.length > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                    <div className="flex items-center mb-2">
                      <Users className="w-4 h-4 text-green-500 dark:text-green-400 mr-2" />
                      <p className="text-sm font-medium text-green-700 dark:text-green-300">Available usernames:</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {availableUsernames.map((username) => (
                        <Button
                          key={username}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => selectSuggestedUsername(username)}
                          className="text-xs border-green-200 hover:bg-green-100 dark:border-green-800 dark:hover:bg-green-900 text-green-700 dark:text-green-300"
                          disabled={isLoading}
                        >
                          {username}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                      Click on a username to use it, or{' '}
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => router.push('/register')}
                        className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 p-0 h-auto text-xs font-normal underline"
                        disabled={isLoading}
                      >
                        register a new account
                      </Button>
                    </p>
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
                      placeholder="Enter your username"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      className="pl-10 h-12 bg-white dark:bg-gray-900 border-orange-200 dark:border-orange-800 focus:border-orange-400 dark:focus:border-orange-600 focus:ring-orange-400/20 dark:focus:ring-orange-600/20 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                      required
                      disabled={isLoading}
                      autoComplete="username"
                    />
                    {isCheckingUsername && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <RefreshCw className="w-4 h-4 text-orange-500 dark:text-orange-400 animate-spin" />
                      </div>
                    )}
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
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="pl-10 pr-12 h-12 bg-white dark:bg-gray-900 border-orange-200 dark:border-orange-800 focus:border-orange-400 dark:focus:border-orange-600 focus:ring-orange-400/20 dark:focus:ring-orange-600/20 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                      required
                      disabled={isLoading}
                      autoComplete="current-password"
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

                {/* Additional Options */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={formData.rememberMe}
                      onCheckedChange={(checked) => handleInputChange('rememberMe', checked as boolean)}
                      className="border-orange-300 dark:border-orange-700 data-[state=checked]:bg-orange-500 dark:data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-500 dark:data-[state=checked]:border-orange-600"
                      disabled={isLoading}
                    />
                    <Label htmlFor="remember" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                      Remember me
                    </Label>
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 p-0 h-auto font-normal"
                    disabled={isLoading}
                    onClick={() => router.push('/forgot-password')}
                  >
                    Forgot password?
                  </Button>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => router.push('/diagnostic')}
                    variant="outline"
                    size="sm"
                    className="flex-1 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    disabled={isLoading}
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Diagnostics
                  </Button>
                  <Button
                    type="button"
                    onClick={() => router.push('/register')}
                    variant="outline"
                    size="sm"
                    className="flex-1 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/30 text-green-700 dark:text-green-300"
                    disabled={isLoading}
                  >
                    <User className="w-4 h-4 mr-1" />
                    Register
                  </Button>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading || !formData.username.trim() || !formData.password.trim()}
                  className="w-full bg-gradient-to-r from-teal-400 to-orange-500 hover:from-teal-500 hover:to-orange-600 text-white font-medium h-12 text-base transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        {isCheckingUsername ? 'Checking username...' : 'Signing In...'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </Button>
              </form>

              {/* Footer Text */}
              <div className="text-center pt-4 border-t border-orange-100 dark:border-orange-800/50">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Don't have an account?{' '}
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => router.push('/register')}
                    className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 p-0 h-auto text-sm font-medium"
                    disabled={isLoading}
                  >
                    Create one now
                  </Button>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  Having issues?{' '}
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => router.push('/diagnostic')}
                    className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 p-0 h-auto text-xs font-normal"
                    disabled={isLoading}
                  >
                    Run Diagnostics
                  </Button>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Terms and Privacy */}
          <div className="text-center mt-6">
            <p className="text-xs text-gray-500 dark:text-gray-500">
              By signing in, you agree to our{' '}
              <Button variant="link" className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 p-0 h-auto text-xs font-normal">
                Terms of Service
              </Button>{' '}
              and{' '}
              <Button variant="link" className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 p-0 h-auto text-xs font-normal">
                Privacy Policy
              </Button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}