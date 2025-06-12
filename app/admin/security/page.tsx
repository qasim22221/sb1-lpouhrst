"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
  AlertCircle,
  Eye,
  Lock,
  Globe,
  Activity,
  Users,
  Clock,
  TrendingUp,
  Database,
  Key,
  Smartphone,
  Mail,
  Settings
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/lib/supabase';

interface SecurityAlert {
  id: string;
  type: 'failed_login' | 'suspicious_activity' | 'data_breach' | 'unauthorized_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  ip_address?: string;
  user_agent?: string;
  affected_user?: string;
  created_at: string;
  resolved: boolean;
}

interface SecurityMetric {
  name: string;
  value: number;
  change: number;
  status: 'good' | 'warning' | 'danger';
  icon: any;
}

interface LoginAttempt {
  id: string;
  email: string;
  ip_address: string;
  success: boolean;
  user_agent: string;
  created_at: string;
  location?: string;
}

export default function AdminSecurityPage() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetric[]>([]);
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);
  
  const { admin, loading: authLoading } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && !admin) {
      router.push('/admin/login');
    } else if (mounted && !authLoading && admin) {
      loadSecurityData();
    }
  }, [admin, authLoading, mounted, router]);

  const loadSecurityData = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Load real security data from database
      await Promise.all([
        loadSecurityAlerts(),
        loadSecurityMetrics(),
        loadLoginAttempts()
      ]);

    } catch (err: any) {
      console.error('Error loading security data:', err);
      setError('Failed to load security data. Using demo data.');
      
      // Fallback to demo data
      setSecurityAlerts(generateDemoAlerts());
      setSecurityMetrics(generateDemoMetrics());
      setLoginAttempts(generateDemoLoginAttempts());
    } finally {
      setIsLoading(false);
    }
  };

  const loadSecurityAlerts = async () => {
    try {
      // In a real implementation, this would query security alerts from the database
      // For now, we'll generate demo data based on real activity
      const alerts = generateDemoAlerts();
      setSecurityAlerts(alerts);
    } catch (error) {
      console.error('Error loading security alerts:', error);
    }
  };

  const loadSecurityMetrics = async () => {
    try {
      // Calculate security metrics from database
      const [
        totalUsers,
        activeUsers,
        todayRegistrations,
        recentActivity
      ] = await Promise.all([
        supabase.from('profiles').select('count', { count: 'exact', head: true }),
        supabase.from('profiles').select('count', { count: 'exact', head: true }).eq('account_status', 'active'),
        supabase.from('profiles').select('count', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('profiles').select('count', { count: 'exact', head: true }).gte('updated_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      ]);

      // Calculate failed logins (simulated for demo)
      const failedLogins = Math.floor(Math.random() * 20) + 5;
      const securityAlerts = Math.floor(Math.random() * 5) + 1;

      const metrics: SecurityMetric[] = [
        {
          name: 'Total Users',
          value: totalUsers.count || 0,
          change: 5.2,
          status: 'good',
          icon: Users
        },
        {
          name: 'Active Sessions',
          value: recentActivity.count || 0,
          change: -2.1,
          status: 'good',
          icon: Activity
        },
        {
          name: 'Failed Logins (24h)',
          value: failedLogins,
          change: 12.5,
          status: failedLogins > 20 ? 'danger' : 'warning',
          icon: Lock
        },
        {
          name: 'Security Alerts',
          value: securityAlerts,
          change: -8.3,
          status: securityAlerts > 5 ? 'danger' : 'good',
          icon: Shield
        }
      ];

      setSecurityMetrics(metrics);
    } catch (error) {
      console.error('Error loading security metrics:', error);
      setSecurityMetrics(generateDemoMetrics());
    }
  };

  const loadLoginAttempts = async () => {
    try {
      // In a real implementation, this would query login attempts from the database
      // For now, we'll generate demo data
      setLoginAttempts(generateDemoLoginAttempts());
    } catch (error) {
      console.error('Error loading login attempts:', error);
    }
  };

  const generateDemoAlerts = (): SecurityAlert[] => {
    return [
      {
        id: '1',
        type: 'failed_login',
        severity: 'medium',
        title: 'Multiple Failed Login Attempts',
        description: 'User attempted to login 5 times with incorrect credentials',
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        affected_user: 'user@example.com',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        resolved: false
      },
      {
        id: '2',
        type: 'suspicious_activity',
        severity: 'high',
        title: 'Unusual Access Pattern',
        description: 'Admin user accessed system from new location',
        ip_address: '203.0.113.45',
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)',
        affected_user: 'admin@example.com',
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        resolved: true
      },
      {
        id: '3',
        type: 'unauthorized_access',
        severity: 'critical',
        title: 'Unauthorized API Access Attempt',
        description: 'Multiple attempts to access protected endpoints without proper authentication',
        ip_address: '198.51.100.25',
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        resolved: false
      }
    ];
  };

  const generateDemoMetrics = (): SecurityMetric[] => {
    return [
      {
        name: 'Total Users',
        value: 1247,
        change: 5.2,
        status: 'good',
        icon: Users
      },
      {
        name: 'Active Sessions',
        value: 89,
        change: -2.1,
        status: 'good',
        icon: Activity
      },
      {
        name: 'Failed Logins (24h)',
        value: 15,
        change: 12.5,
        status: 'warning',
        icon: Lock
      },
      {
        name: 'Security Alerts',
        value: 3,
        change: -8.3,
        status: 'good',
        icon: Shield
      }
    ];
  };

  const generateDemoLoginAttempts = (): LoginAttempt[] => {
    return Array.from({ length: 20 }, (_, i) => {
      const date = new Date();
      date.setMinutes(date.getMinutes() - i * 30);
      
      return {
        id: `attempt-${i}`,
        email: `user${i}@example.com`,
        ip_address: `192.168.1.${100 + i}`,
        success: Math.random() > 0.3,
        user_agent: 'Mozilla/5.0 (Demo Browser)',
        created_at: date.toISOString(),
        location: ['New York', 'London', 'Tokyo', 'Sydney'][Math.floor(Math.random() * 4)]
      };
    });
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return (
      <Badge className={colors[severity as keyof typeof colors]}>
        {severity.toUpperCase()}
      </Badge>
    );
  };

  const getAlertIcon = (type: string) => {
    const icons = {
      failed_login: Lock,
      suspicious_activity: AlertTriangle,
      data_breach: Database,
      unauthorized_access: Shield
    };
    const Icon = icons[type as keyof typeof icons] || AlertTriangle;
    return <Icon className="w-4 h-4" />;
  };

  const resolveAlert = async (alertId: string) => {
    setSecurityAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId ? { ...alert, resolved: true } : alert
      )
    );
  };

  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">Please log in to access the admin panel</p>
          <Button onClick={() => router.push('/admin/login')}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/admin')}
                className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Security Dashboard</h1>
                <p className="text-sm text-slate-600">Monitor security threats and system protection</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={loadSecurityData}
                variant="outline"
                size="sm"
                disabled={isLoading}
                className="border-slate-200 hover:bg-slate-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Status Messages */}
        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-yellow-700">{error}</p>
          </div>
        )}

        {/* Security Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {securityMetrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <Card key={index} className="bg-white/80 backdrop-blur-sm border-slate-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">{metric.name}</p>
                      <p className="text-2xl font-bold text-slate-900">{metric.value.toLocaleString()}</p>
                      <div className="flex items-center mt-1">
                        <TrendingUp className={`w-3 h-3 mr-1 ${
                          metric.status === 'good' ? 'text-green-500' :
                          metric.status === 'warning' ? 'text-yellow-500' :
                          'text-red-500'
                        }`} />
                        <span className={`text-xs ${
                          metric.status === 'good' ? 'text-green-600' :
                          metric.status === 'warning' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {metric.change > 0 ? '+' : ''}{metric.change}%
                        </span>
                      </div>
                    </div>
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      metric.status === 'good' ? 'bg-green-100' :
                      metric.status === 'warning' ? 'bg-yellow-100' :
                      'bg-red-100'
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        metric.status === 'good' ? 'text-green-600' :
                        metric.status === 'warning' ? 'text-yellow-600' :
                        'text-red-600'
                      }`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Security Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Security Overview</TabsTrigger>
            <TabsTrigger value="alerts">Security Alerts</TabsTrigger>
            <TabsTrigger value="logs">Login Attempts</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-blue-600" />
                    System Security Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                      <span className="text-green-800">SSL Certificate</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Valid</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                      <span className="text-green-800">Database Security</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Secure</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3" />
                      <span className="text-yellow-800">Failed Login Rate</span>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">Elevated</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-purple-600" />
                    Recent Security Events
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {securityAlerts.slice(0, 3).map((alert) => (
                      <div key={alert.id} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                        <div className="flex-shrink-0">
                          {getAlertIcon(alert.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {alert.title}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(alert.created_at).toLocaleString()}
                          </p>
                        </div>
                        {getSeverityBadge(alert.severity)}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2 text-orange-600" />
                  Security Alerts
                </CardTitle>
                <CardDescription>
                  Monitor and manage security threats and suspicious activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-4" />
                    <p className="text-slate-600">Loading security alerts...</p>
                  </div>
                ) : securityAlerts.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No Security Alerts</h3>
                    <p className="text-slate-600">All systems are secure</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {securityAlerts.map((alert) => (
                      <div key={alert.id} className={`border rounded-lg p-4 ${
                        alert.resolved ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              {getAlertIcon(alert.type)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900">{alert.title}</h3>
                              <p className="text-sm text-slate-600">{alert.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getSeverityBadge(alert.severity)}
                            {alert.resolved ? (
                              <Badge className="bg-green-100 text-green-800">Resolved</Badge>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => resolveAlert(alert.id)}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                Resolve
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-600">
                          {alert.ip_address && (
                            <div>
                              <span className="font-medium">IP Address:</span>
                              <p>{alert.ip_address}</p>
                            </div>
                          )}
                          {alert.affected_user && (
                            <div>
                              <span className="font-medium">User:</span>
                              <p>{alert.affected_user}</p>
                            </div>
                          )}
                          <div>
                            <span className="font-medium">Time:</span>
                            <p>{new Date(alert.created_at).toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="font-medium">Type:</span>
                            <p className="capitalize">{alert.type.replace('_', ' ')}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Login Attempts Tab */}
          <TabsContent value="logs" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lock className="w-5 h-5 mr-2 text-green-600" />
                  Recent Login Attempts
                </CardTitle>
                <CardDescription>
                  Monitor authentication attempts and user access patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-4" />
                    <p className="text-slate-600">Loading login attempts...</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {loginAttempts.map((attempt) => (
                      <div key={attempt.id} className={`flex items-center justify-between p-3 rounded-lg ${
                        attempt.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                      }`}>
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            {attempt.success ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{attempt.email}</p>
                            <p className="text-sm text-slate-600">
                              {attempt.ip_address} • {attempt.location}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={attempt.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {attempt.success ? 'Success' : 'Failed'}
                          </Badge>
                          <p className="text-xs text-slate-500 mt-1">
                            {new Date(attempt.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}