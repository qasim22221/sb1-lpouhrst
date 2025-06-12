"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { 
  Database, 
  ArrowLeft, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Table,
  Users,
  Eye,
  Loader2
} from 'lucide-react';

interface DiagnosticResult {
  step: string;
  status: 'checking' | 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export default function DiagnosticPage() {
  const [mounted, setMounted] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    // Auto-run diagnostics on load
    runDiagnostics();
  }, []);

  const addResult = (result: DiagnosticResult) => {
    setResults(prev => [...prev, result]);
  };

  const updateLastResult = (updates: Partial<DiagnosticResult>) => {
    setResults(prev => {
      const newResults = [...prev];
      const lastIndex = newResults.length - 1;
      if (lastIndex >= 0) {
        newResults[lastIndex] = { ...newResults[lastIndex], ...updates };
      }
      return newResults;
    });
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);

    try {
      // Step 1: Check Supabase Connection
      addResult({
        step: '1. Supabase Connection',
        status: 'checking',
        message: 'Testing connection to Supabase...'
      });

      try {
        // Simple connection test - just try to access the profiles table
        const { error } = await supabase
          .from('profiles')
          .select('count', { count: 'exact', head: true });
        
        if (error) {
          updateLastResult({
            status: 'error',
            message: `Connection failed: ${error.message}`,
            details: { error: error.message, code: error.code }
          });
        } else {
          updateLastResult({
            status: 'success',
            message: 'Successfully connected to Supabase',
            details: { connectionTest: 'passed' }
          });
        }
      } catch (err: any) {
        updateLastResult({
          status: 'error',
          message: `Connection error: ${err.message}`,
          details: { error: err.message }
        });
      }

      // Add small delay between steps for better UX
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Check Database Schema
      addResult({
        step: '2. Database Schema',
        status: 'checking',
        message: 'Checking if profiles table exists...'
      });

      try {
        // Try a simple query to see if table exists and is accessible
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);

        if (error) {
          if (error.message.includes('relation "public.profiles" does not exist')) {
            updateLastResult({
              status: 'error',
              message: 'Profiles table does not exist',
              details: { error: 'Table not found', code: error.code }
            });
          } else {
            updateLastResult({
              status: 'warning',
              message: `Table exists but has access issues: ${error.message}`,
              details: { error: error.message, code: error.code }
            });
          }
        } else {
          updateLastResult({
            status: 'success',
            message: 'Profiles table exists and is accessible',
            details: { tableExists: true, querySuccessful: true }
          });
        }
      } catch (err: any) {
        updateLastResult({
          status: 'error',
          message: `Schema check failed: ${err.message}`,
          details: { error: err.message }
        });
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 3: Count Records
      addResult({
        step: '3. Record Count',
        status: 'checking',
        message: 'Counting records in profiles table...'
      });

      try {
        const { count, error } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        if (error) {
          updateLastResult({
            status: 'error',
            message: `Failed to count records: ${error.message}`,
            details: { error: error.message, code: error.code }
          });
        } else {
          updateLastResult({
            status: count === 0 ? 'warning' : 'success',
            message: `Found ${count || 0} records in profiles table`,
            details: { recordCount: count }
          });
        }
      } catch (err: any) {
        updateLastResult({
          status: 'error',
          message: `Count failed: ${err.message}`,
          details: { error: err.message }
        });
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 4: Fetch Sample Data
      addResult({
        step: '4. Sample Data',
        status: 'checking',
        message: 'Fetching sample records...'
      });

      try {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, username, email, referral_code, rank, created_at')
          .limit(5);

        if (error) {
          updateLastResult({
            status: 'error',
            message: `Failed to fetch data: ${error.message}`,
            details: { error: error.message, code: error.code }
          });
        } else {
          updateLastResult({
            status: 'success',
            message: `Successfully fetched ${profiles?.length || 0} sample records`,
            details: { 
              sampleCount: profiles?.length || 0,
              sampleData: profiles?.map(p => ({
                id: p.id.substring(0, 8) + '...',
                username: p.username,
                rank: p.rank
              })) || []
            }
          });
        }
      } catch (err: any) {
        updateLastResult({
          status: 'error',
          message: `Data fetch failed: ${err.message}`,
          details: { error: err.message }
        });
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 5: Check Authentication Status
      addResult({
        step: '5. Authentication',
        status: 'checking',
        message: 'Checking current authentication status...'
      });

      try {
        const { data: session, error } = await supabase.auth.getSession();
        
        if (error) {
          updateLastResult({
            status: 'error',
            message: `Auth check failed: ${error.message}`,
            details: { error: error.message }
          });
        } else if (session?.session?.user) {
          updateLastResult({
            status: 'success',
            message: `Authenticated as: ${session.session.user.email}`,
            details: { 
              userId: session.session.user.id.substring(0, 8) + '...',
              email: session.session.user.email,
              authenticated: true 
            }
          });
        } else {
          updateLastResult({
            status: 'warning',
            message: 'Not currently authenticated',
            details: { authenticated: false }
          });
        }
      } catch (err: any) {
        updateLastResult({
          status: 'error',
          message: `Auth status check failed: ${err.message}`,
          details: { error: err.message }
        });
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 6: Check Additional Tables
      addResult({
        step: '6. Additional Tables',
        status: 'checking',
        message: 'Checking other database tables...'
      });

      try {
        const tableChecks = await Promise.allSettled([
          supabase.from('user_wallets').select('count', { count: 'exact', head: true }),
          supabase.from('deposits').select('count', { count: 'exact', head: true }),
          supabase.from('fund_wallet_transactions').select('count', { count: 'exact', head: true })
        ]);

        const tableResults = {
          user_wallets: tableChecks[0].status === 'fulfilled' ? 'exists' : 'missing',
          deposits: tableChecks[1].status === 'fulfilled' ? 'exists' : 'missing',
          fund_wallet_transactions: tableChecks[2].status === 'fulfilled' ? 'exists' : 'missing'
        };

        const existingTables = Object.entries(tableResults).filter(([_, status]) => status === 'exists').length;
        const totalTables = Object.keys(tableResults).length;

        updateLastResult({
          status: existingTables === totalTables ? 'success' : 'warning',
          message: `Found ${existingTables}/${totalTables} additional tables`,
          details: { tableStatus: tableResults, existingTables, totalTables }
        });
      } catch (err: any) {
        updateLastResult({
          status: 'error',
          message: `Additional tables check failed: ${err.message}`,
          details: { error: err.message }
        });
      }

    } catch (error: any) {
      console.error('Diagnostic error:', error);
      addResult({
        step: 'Error',
        status: 'error',
        message: `Unexpected error: ${error.message}`,
        details: { error: error.message }
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'checking':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'checking':
        return 'border-blue-200 bg-blue-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-teal-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Database Diagnostics</h1>
            <p className="text-gray-600">Complete database connectivity and status check</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={runDiagnostics}
              disabled={isRunning}
              className="border-blue-200 hover:bg-blue-50 text-blue-700"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
              {isRunning ? 'Running...' : 'Run Again'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push('/login')}
              className="text-gray-600 hover:text-orange-600 hover:bg-orange-50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          </div>
        </div>

        {/* Diagnostic Results */}
        <div className="space-y-4">
          {results.map((result, index) => (
            <Card key={index} className={`${getStatusColor(result.status)} border-2`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center">
                    {getStatusIcon(result.status)}
                    <span className="ml-3">{result.step}</span>
                  </CardTitle>
                  {result.status === 'checking' && (
                    <div className="text-sm text-blue-600">Running...</div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className={`text-sm mb-3 ${
                  result.status === 'success' ? 'text-green-700' :
                  result.status === 'error' ? 'text-red-700' :
                  result.status === 'warning' ? 'text-yellow-700' :
                  'text-blue-700'
                }`}>
                  {result.message}
                </p>
                
                {result.details && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-gray-600 hover:text-gray-800 flex items-center">
                      <Eye className="w-3 h-3 mr-1" />
                      View Details
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary */}
        {results.length > 0 && !isRunning && (
          <Card className="bg-white border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="w-5 h-5 mr-2 text-gray-700" />
                Diagnostic Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {results.filter(r => r.status === 'success').length}
                  </div>
                  <div className="text-xs text-green-700">Passed</div>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {results.filter(r => r.status === 'warning').length}
                  </div>
                  <div className="text-xs text-yellow-700">Warnings</div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {results.filter(r => r.status === 'error').length}
                  </div>
                  <div className="text-xs text-red-700">Errors</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {results.filter(r => r.status === 'checking').length}
                  </div>
                  <div className="text-xs text-blue-700">Running</div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/register')}
                  className="border-green-200 hover:bg-green-50 text-green-700"
                >
                  <Users className="w-4 h-4 mr-1" />
                  Register New User
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/login')}
                  className="border-orange-200 hover:bg-orange-50 text-orange-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Try Login
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">What This Tells Us</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800 space-y-2">
            <p><strong>Step 1:</strong> Confirms if we can connect to Supabase at all</p>
            <p><strong>Step 2:</strong> Checks if the profiles table exists in the database</p>
            <p><strong>Step 3:</strong> Counts how many user records are in the table</p>
            <p><strong>Step 4:</strong> Actually fetches sample data to see what's there</p>
            <p><strong>Step 5:</strong> Shows your current authentication status</p>
            <p><strong>Step 6:</strong> Verifies additional tables for deposits and wallets</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}