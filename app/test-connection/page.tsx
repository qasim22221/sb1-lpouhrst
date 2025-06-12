"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { 
  Database, 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Loader2,
  AlertTriangle
} from 'lucide-react';

export default function TestConnectionPage() {
  const [mounted, setMounted] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{
    connected: boolean;
    message: string;
    details?: any;
    error?: string;
  } | null>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const testConnection = async () => {
    setTesting(true);
    setResult(null);

    try {
      console.log('=== TESTING SUPABASE CONNECTION ===');
      
      // Test 1: Check if supabase client is initialized
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }
      
      console.log('Supabase client exists');
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log('Supabase Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

      // Test 2: Try to get session (this doesn't require database access)
      console.log('Testing auth session...');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error(`Auth session error: ${sessionError.message}`);
      }
      
      console.log('Auth session test passed');

      // Test 3: Try a simple database query with timeout
      console.log('Testing database connection...');
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database query timeout after 10 seconds')), 10000);
      });

      const queryPromise = supabase
        .from('profiles')
        .select('count', { count: 'exact', head: true });

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

      if (error) {
        console.error('Database query error:', error);
        setResult({
          connected: false,
          message: 'Database connection failed',
          error: error.message,
          details: {
            code: error.code,
            hint: error.hint,
            details: error.details
          }
        });
        return;
      }

      console.log('Database query successful');
      console.log('Query result:', data);

      setResult({
        connected: true,
        message: 'Successfully connected to Supabase',
        details: {
          authWorking: true,
          databaseWorking: true,
          userAuthenticated: !!sessionData?.session?.user,
          userEmail: sessionData?.session?.user?.email || 'Not authenticated'
        }
      });

    } catch (error: any) {
      console.error('=== CONNECTION TEST FAILED ===');
      console.error('Error:', error);
      
      setResult({
        connected: false,
        message: 'Connection test failed',
        error: error.message,
        details: {
          errorType: error.constructor.name,
          stack: error.stack?.split('\n').slice(0, 3)
        }
      });
    } finally {
      setTesting(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-teal-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Supabase Connection Test</h1>
            <p className="text-gray-600">Simple test to verify Supabase connectivity</p>
          </div>
          <Button
            variant="ghost"
            onClick={() => router.push('/login')}
            className="text-gray-600 hover:text-orange-600 hover:bg-orange-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Button>
        </div>

        {/* Test Button */}
        <Card className="bg-white border-2 border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="w-5 h-5 mr-2 text-gray-700" />
              Connection Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              This will test the basic connection to Supabase including authentication and database access.
            </p>
            
            <Button
              onClick={testConnection}
              disabled={testing}
              className="w-full bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white"
            >
              {testing ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Testing Connection...</span>
                </div>
              ) : (
                'Test Supabase Connection'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <Card className={`border-2 ${
            result.connected 
              ? 'border-green-200 bg-green-50' 
              : 'border-red-200 bg-red-50'
          }`}>
            <CardHeader>
              <CardTitle className={`flex items-center ${
                result.connected ? 'text-green-900' : 'text-red-900'
              }`}>
                {result.connected ? (
                  <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 mr-2 text-red-500" />
                )}
                {result.message}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result.error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded-lg">
                  <p className="text-red-700 font-semibold">Error:</p>
                  <p className="text-red-600 text-sm">{result.error}</p>
                </div>
              )}

              {result.details && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                    View Technical Details
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-64">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </details>
              )}

              {result.connected && (
                <div className="mt-4 space-y-2">
                  <p className="text-green-700 text-sm">✅ Supabase client initialized</p>
                  <p className="text-green-700 text-sm">✅ Authentication service working</p>
                  <p className="text-green-700 text-sm">✅ Database connection established</p>
                  <p className="text-green-700 text-sm">✅ Can query profiles table</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Environment Check */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Environment Variables</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800 space-y-2">
            <div className="flex justify-between">
              <span>NEXT_PUBLIC_SUPABASE_URL:</span>
              <span className={process.env.NEXT_PUBLIC_SUPABASE_URL ? 'text-green-600' : 'text-red-600'}>
                {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>NEXT_PUBLIC_SUPABASE_ANON_KEY:</span>
              <span className={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'text-green-600' : 'text-red-600'}>
                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}
              </span>
            </div>
            
            {(!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) && (
              <div className="mt-3 p-3 bg-yellow-100 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-yellow-800 font-semibold">Missing Environment Variables</p>
                    <p className="text-yellow-700 text-xs mt-1">
                      Please ensure your .env.local file contains the required Supabase configuration.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/diagnostic')}
            className="flex-1 border-blue-200 hover:bg-blue-50 text-blue-700"
          >
            Full Diagnostics
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/register')}
            className="flex-1 border-green-200 hover:bg-green-50 text-green-700"
          >
            Try Register
          </Button>
        </div>
      </div>
    </div>
  );
}