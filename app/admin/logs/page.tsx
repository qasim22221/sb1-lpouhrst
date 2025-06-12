"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  Activity,
  Search,
  Filter,
  Download,
  RefreshCw,
  Loader2,
  AlertCircle,
  Eye,
  Calendar,
  User,
  Settings,
  Shield,
  Database,
  Globe,
  Users,
  DollarSign,
  FileText,
  Clock
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/lib/supabase';

interface ActivityLog {
  id: string;
  admin_user_id: string;
  admin_username?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export default function AdminLogsPage() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterResource, setFilterResource] = useState('all');
  const [dateRange, setDateRange] = useState('7');
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  
  const { admin, loading: authLoading } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && !admin) {
      router.push('/admin/login');
    } else if (mounted && !authLoading && admin) {
      loadActivityLogs();
    }
  }, [admin, authLoading, mounted, router, dateRange]);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, filterAction, filterResource]);

  const loadActivityLogs = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      const { data, error } = await supabase
        .from('admin_activity_logs')
        .select(`
          *,
          admin_users!inner(username)
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) {
        throw new Error(`Failed to load activity logs: ${error.message}`);
      }

      const logsWithUsernames = data?.map(log => ({
        ...log,
        admin_username: log.admin_users?.username || 'Unknown'
      })) || [];

      setLogs(logsWithUsernames);

    } catch (err: any) {
      console.error('Error loading activity logs:', err);
      setError('Failed to load activity logs. Using demo data.');
      
      // Fallback to demo logs
      setLogs(generateDemoLogs());
    } finally {
      setIsLoading(false);
    }
  };

  const generateDemoLogs = (): ActivityLog[] => {
    const actions = [
      'LOGIN', 'LOGOUT', 'CREATE_USER', 'UPDATE_USER', 'DELETE_USER',
      'APPROVE_WITHDRAWAL', 'REJECT_WITHDRAWAL', 'UPDATE_BALANCE',
      'VIEW_ANALYTICS', 'EXPORT_DATA', 'UPDATE_SETTINGS', 'CREATE_ADMIN'
    ];

    const resources = ['user', 'withdrawal', 'admin_user', 'system_setting', 'analytics'];
    const admins = ['admin', 'subadmin', 'superadmin'];

    return Array.from({ length: 50 }, (_, i) => {
      const date = new Date();
      date.setMinutes(date.getMinutes() - i * 15);
      
      const action = actions[Math.floor(Math.random() * actions.length)];
      const resource = resources[Math.floor(Math.random() * resources.length)];
      const adminUser = admins[Math.floor(Math.random() * admins.length)];

      return {
        id: `log-${i}`,
        admin_user_id: `admin-${i}`,
        admin_username: adminUser,
        action,
        resource_type: resource,
        resource_id: `resource-${i}`,
        details: {
          action_details: `Demo ${action.toLowerCase()} action`,
          affected_fields: ['field1', 'field2'],
          old_value: 'old_value',
          new_value: 'new_value'
        },
        ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
        user_agent: 'Mozilla/5.0 (Demo Browser)',
        created_at: date.toISOString()
      };
    });
  };

  const filterLogs = () => {
    let filtered = [...logs];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.admin_username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.resource_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.resource_id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Action filter
    if (filterAction !== 'all') {
      filtered = filtered.filter(log => log.action === filterAction);
    }

    // Resource filter
    if (filterResource !== 'all') {
      filtered = filtered.filter(log => log.resource_type === filterResource);
    }

    setFilteredLogs(filtered);
  };

  const getActionIcon = (action: string) => {
    const iconMap: { [key: string]: any } = {
      'LOGIN': User,
      'LOGOUT': User,
      'CREATE_USER': Users,
      'UPDATE_USER': Users,
      'DELETE_USER': Users,
      'APPROVE_WITHDRAWAL': DollarSign,
      'REJECT_WITHDRAWAL': DollarSign,
      'UPDATE_BALANCE': DollarSign,
      'VIEW_ANALYTICS': Activity,
      'EXPORT_DATA': Download,
      'UPDATE_SETTINGS': Settings,
      'CREATE_ADMIN': Shield,
      'DEFAULT': FileText
    };

    const Icon = iconMap[action] || iconMap.DEFAULT;
    return <Icon className="w-4 h-4" />;
  };

  const getActionColor = (action: string) => {
    const colorMap: { [key: string]: string } = {
      'LOGIN': 'bg-green-100 text-green-800',
      'LOGOUT': 'bg-gray-100 text-gray-800',
      'CREATE_USER': 'bg-blue-100 text-blue-800',
      'UPDATE_USER': 'bg-yellow-100 text-yellow-800',
      'DELETE_USER': 'bg-red-100 text-red-800',
      'APPROVE_WITHDRAWAL': 'bg-green-100 text-green-800',
      'REJECT_WITHDRAWAL': 'bg-red-100 text-red-800',
      'UPDATE_BALANCE': 'bg-purple-100 text-purple-800',
      'VIEW_ANALYTICS': 'bg-blue-100 text-blue-800',
      'EXPORT_DATA': 'bg-orange-100 text-orange-800',
      'UPDATE_SETTINGS': 'bg-gray-100 text-gray-800',
      'CREATE_ADMIN': 'bg-purple-100 text-purple-800'
    };

    return colorMap[action] || 'bg-gray-100 text-gray-800';
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Admin', 'Action', 'Resource Type', 'Resource ID', 'IP Address'].join(','),
      ...filteredLogs.map(log => [
        new Date(log.created_at).toLocaleString(),
        log.admin_username || 'Unknown',
        log.action,
        log.resource_type || '',
        log.resource_id || '',
        log.ip_address || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin_activity_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
                <h1 className="text-xl font-bold text-slate-900">Activity Logs</h1>
                <p className="text-sm text-slate-600">Monitor admin actions and system activities</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="1">Last 24 hours</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
              <Button
                onClick={exportLogs}
                variant="outline"
                size="sm"
                className="border-slate-200 hover:bg-slate-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button
                onClick={loadActivityLogs}
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
            <div>
              <p className="text-yellow-700">{error}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Filter Logs
            </CardTitle>
            <CardDescription>
              Filter and search through admin activity logs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white border-slate-200"
                />
              </div>

              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="all">All Actions</option>
                <option value="LOGIN">Login</option>
                <option value="LOGOUT">Logout</option>
                <option value="CREATE_USER">Create User</option>
                <option value="UPDATE_USER">Update User</option>
                <option value="DELETE_USER">Delete User</option>
                <option value="APPROVE_WITHDRAWAL">Approve Withdrawal</option>
                <option value="REJECT_WITHDRAWAL">Reject Withdrawal</option>
                <option value="UPDATE_BALANCE">Update Balance</option>
                <option value="UPDATE_SETTINGS">Update Settings</option>
              </select>

              <select
                value={filterResource}
                onChange={(e) => setFilterResource(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="all">All Resources</option>
                <option value="user">User</option>
                <option value="withdrawal">Withdrawal</option>
                <option value="admin_user">Admin User</option>
                <option value="system_setting">System Setting</option>
                <option value="analytics">Analytics</option>
              </select>

              <div className="text-sm text-slate-600 flex items-center">
                Showing {filteredLogs.length} of {logs.length} logs
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Activity Timeline
            </CardTitle>
            <CardDescription>
              Chronological list of admin actions and system events
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-4" />
                <p className="text-slate-600">Loading activity logs...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No logs found</h3>
                <p className="text-slate-600">
                  {searchTerm || filterAction !== 'all' || filterResource !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'No activity logs available for the selected time period'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="flex items-start space-x-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        {getActionIcon(log.action)}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge className={getActionColor(log.action)}>
                          {log.action.replace('_', ' ')}
                        </Badge>
                        <span className="text-sm font-medium text-slate-900">
                          {log.admin_username}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="text-sm text-slate-600 mb-2">
                        {log.resource_type && log.resource_id && (
                          <span>
                            Action on {log.resource_type}: {log.resource_id}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-xs text-slate-500">
                        {log.ip_address && (
                          <span className="flex items-center">
                            <Globe className="w-3 h-3 mr-1" />
                            {log.ip_address}
                          </span>
                        )}
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(log.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                        className="text-slate-600 hover:text-slate-900"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Log Details Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle>Log Details</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-slate-600">Action:</span>
                    <p className="mt-1">
                      <Badge className={getActionColor(selectedLog.action)}>
                        {selectedLog.action.replace('_', ' ')}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-slate-600">Admin User:</span>
                    <p className="mt-1">{selectedLog.admin_username}</p>
                  </div>
                  <div>
                    <span className="font-medium text-slate-600">Timestamp:</span>
                    <p className="mt-1">{new Date(selectedLog.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="font-medium text-slate-600">IP Address:</span>
                    <p className="mt-1">{selectedLog.ip_address || 'N/A'}</p>
                  </div>
                  {selectedLog.resource_type && (
                    <div>
                      <span className="font-medium text-slate-600">Resource Type:</span>
                      <p className="mt-1">{selectedLog.resource_type}</p>
                    </div>
                  )}
                  {selectedLog.resource_id && (
                    <div>
                      <span className="font-medium text-slate-600">Resource ID:</span>
                      <p className="mt-1 font-mono text-xs">{selectedLog.resource_id}</p>
                    </div>
                  )}
                </div>

                {selectedLog.user_agent && (
                  <div>
                    <span className="font-medium text-slate-600">User Agent:</span>
                    <p className="mt-1 text-xs text-slate-500 break-all">{selectedLog.user_agent}</p>
                  </div>
                )}

                {selectedLog.details && (
                  <div>
                    <span className="font-medium text-slate-600">Details:</span>
                    <pre className="mt-1 p-3 bg-slate-100 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Information Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-900">
              <Activity className="w-5 h-5 mr-2" />
              Activity Logging Information
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 text-sm space-y-2">
            <p>• <strong>Real-time Logging:</strong> All admin actions are logged automatically</p>
            <p>• <strong>Data Retention:</strong> Logs are retained for audit and compliance purposes</p>
            <p>• <strong>Security Monitoring:</strong> Failed login attempts and suspicious activities are tracked</p>
            <p>• <strong>Export Capability:</strong> Download logs as CSV for external analysis</p>
            <p>• <strong>IP Tracking:</strong> Source IP addresses are recorded for security analysis</p>
            <p>• <strong>Resource Tracking:</strong> All changes to users, settings, and data are logged</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}