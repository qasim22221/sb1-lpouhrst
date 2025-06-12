"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Loader2, CheckCircle, Home, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function LogoutPage() {
  const [mounted, setMounted] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutComplete, setLogoutComplete] = useState(false);
  const [error, setError] = useState('');
  const { user, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && user) {
      // Auto-logout when page loads if user is authenticated
      handleLogout();
    } else if (mounted && !user) {
      // User is already logged out
      setLogoutComplete(true);
    }
  }, [mounted, user]);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    setError('');

    try {
      console.log('🔄 Logging out user...');
      await signOut();
      console.log('✅ Logout successful');
      setLogoutComplete(true);
      
      // Redirect to home page after a short delay
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err: any) {
      console.error('❌ Logout error:', err);
      setError(err.message || 'Failed to logout. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-white/80 backdrop-blur-sm border border-orange-100 shadow-xl">
          <CardHeader className="text-center pb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              {logoutComplete ? (
                <CheckCircle className="w-8 h-8 text-white" />
              ) : (
                <LogOut className="w-8 h-8 text-white" />
              )}
            </div>
            <CardTitle className="text-2xl text-gray-900">
              {logoutComplete ? 'Logged Out Successfully' : 'Logging Out'}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {isLoggingOut && (
              <div className="text-center py-4">
                <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Signing you out...</p>
              </div>
            )}

            {logoutComplete && (
              <div className="text-center py-4">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  You've been logged out
                </h3>
                <p className="text-gray-600 text-sm mb-6">
                  Thank you for using our platform. You'll be redirected to the home page shortly.
                </p>
              </div>
            )}

            {!isLoggingOut && (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => router.push('/')}
                  className="flex-1 border-orange-200 hover:bg-orange-50 text-gray-700"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Button>
                
                {!logoutComplete && (
                  <Button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex-1 bg-gradient-to-r from-red-400 to-red-600 hover:from-red-500 hover:to-red-700 text-white"
                  >
                    {isLoggingOut ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <LogOut className="w-4 h-4 mr-2" />
                    )}
                    {isLoggingOut ? 'Logging Out...' : 'Logout Now'}
                  </Button>
                )}

                {logoutComplete && (
                  <Button
                    onClick={() => router.push('/login')}
                    className="flex-1 bg-gradient-to-r from-orange-400 to-teal-500 hover:from-orange-500 hover:to-teal-600 text-white"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Sign In Again
                  </Button>
                )}
              </div>
            )}

            {/* Quick Links */}
            <div className="text-center pt-4 border-t border-orange-100">
              <p className="text-xs text-gray-500 mb-2">Quick Links</p>
              <div className="flex justify-center space-x-4">
                <Button
                  variant="link"
                  onClick={() => router.push('/login')}
                  className="text-orange-600 hover:text-orange-700 p-0 h-auto text-xs"
                  disabled={isLoggingOut}
                >
                  Sign In
                </Button>
                <Button
                  variant="link"
                  onClick={() => router.push('/register')}
                  className="text-orange-600 hover:text-orange-700 p-0 h-auto text-xs"
                  disabled={isLoggingOut}
                >
                  Register
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h4 className="font-semibold text-blue-900 text-sm mb-2">
              URL Logout Feature
            </h4>
            <p className="text-blue-800 text-xs">
              You can logout from anywhere by visiting <code className="bg-blue-100 px-1 rounded">/logout</code> in your browser.
              This is useful for quickly signing out or clearing your session.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}