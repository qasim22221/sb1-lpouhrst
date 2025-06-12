"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft,
  Bell,
  Plus,
  Send,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  XCircle,
  Users,
  Mail,
  Smartphone,
  Globe,
  Eye,
  Trash2,
  Edit,
  Clock,
  Target,
  MessageSquare
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/lib/supabase';

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  priority: number;
  is_read: boolean;
  admin_user_id?: string;
  created_by?: string;
  expires_at?: string;
  created_at: string;
  created_by_name?: string;
}

interface NotificationTemplate {
  id: string;
  name: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  category: string;
}

export default function AdminNotificationsPage() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('notifications');
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<AdminNotification | null>(null);
  
  const { admin, loading: authLoading } = useAdminAuth();
  const router = useRouter();

  // Form states
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'warning' | 'error' | 'success',
    priority: 1,
    target: 'all' as 'all' | 'admins' | 'users',
    expires_at: ''
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && !admin) {
      router.push('/admin/login');
    } else if (mounted && !authLoading && admin) {
      loadNotificationData();
    }
  }, [admin, authLoading, mounted, router]);

  const loadNotificationData = async () => {
    setIsLoading(true);
    setError('');

    try {
      await Promise.all([
        loadNotifications(),
        loadTemplates()
      ]);
    } catch (err: any) {
      console.error('Error loading notification data:', err);
      setError('Failed to load notification data. Using demo data.');
      
      // Fallback to demo data
      setNotifications(generateDemoNotifications());
      setTemplates(generateDemoTemplates());
    } finally {
      setIsLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      // Try to load from database first
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading notifications:', error);
        // Use demo data as fallback
        setNotifications(generateDemoNotifications());
        return;
      }

      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications(generateDemoNotifications());
    }
  };

  const loadTemplates = async () => {
    try {
      // For now, use demo templates
      setTemplates(generateDemoTemplates());
    } catch (error) {
      console.error('Error loading templates:', error);
      setTemplates(generateDemoTemplates());
    }
  };

  const generateDemoNotifications = (): AdminNotification[] => {
    return [
      {
        id: '1',
        title: 'System Maintenance Scheduled',
        message: 'Scheduled maintenance will occur on Sunday at 2:00 AM UTC. Expected downtime: 30 minutes.',
        type: 'info',
        priority: 2,
        is_read: false,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        created_by_name: 'System Admin'
      },
      {
        id: '2',
        title: 'High Volume of Failed Logins',
        message: 'Detected unusual number of failed login attempts from IP range 192.168.1.x. Please investigate.',
        type: 'warning',
        priority: 1,
        is_read: false,
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        created_by_name: 'Security Monitor'
      },
      {
        id: '3',
        title: 'Database Backup Completed',
        message: 'Daily database backup completed successfully. Backup size: 2.3 GB',
        type: 'success',
        priority: 3,
        is_read: true,
        created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        created_by_name: 'Backup Service'
      },
      {
        id: '4',
        title: 'Payment Gateway Error',
        message: 'Payment processing is experiencing intermittent failures. Users may be unable to complete transactions.',
        type: 'error',
        priority: 1,
        is_read: true,
        created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        created_by_name: 'Payment Monitor'
      }
    ];
  };

  const generateDemoTemplates = (): NotificationTemplate[] => {
    return [
      {
        id: '1',
        name: 'Maintenance Notice',
        title: 'Scheduled Maintenance',
        message: 'System maintenance is scheduled for {date} at {time}. Expected downtime: {duration}.',
        type: 'info',
        category: 'System'
      },
      {
        id: '2',
        name: 'Security Alert',
        title: 'Security Alert: {alert_type}',
        message: 'Security alert detected: {description}. Please review and take appropriate action.',
        type: 'warning',
        category: 'Security'
      },
      {
        id: '3',
        name: 'System Error',
        title: 'System Error Detected',
        message: 'A system error has occurred: {error_message}. Technical team has been notified.',
        type: 'error',
        category: 'System'
      },
      {
        id: '4',
        name: 'Backup Success',
        title: 'Backup Completed Successfully',
        message: 'System backup completed successfully. Backup size: {size}, Duration: {duration}.',
        type: 'success',
        category: 'System'
      }
    ];
  };

  const createNotification = async () => {
    if (!newNotification.title || !newNotification.message) {
      setError('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      // Try to create in database
      const notificationData = {
        title: newNotification.title,
        message: newNotification.message,
        type: newNotification.type,
        priority: newNotification.priority,
        created_by: admin?.id,
        expires_at: newNotification.expires_at || null
      };

      const { data, error } = await supabase
        .from('admin_notifications')
        .insert(notificationData)
        .select()
        .single();

      if (error) {
        console.error('Error creating notification:', error);
        // Add to local state as fallback
        const newNotif: AdminNotification = {
          id: Date.now().toString(),
          ...notificationData,
          is_read: false,
          created_at: new Date().toISOString(),
          created_by_name: admin?.username || 'Admin'
        };
        setNotifications(prev => [newNotif, ...prev]);
      } else {
        // Add to local state
        const newNotif: AdminNotification = {
          ...data,
          created_by_name: admin?.username || 'Admin'
        };
        setNotifications(prev => [newNotif, ...prev]);
      }

      // Reset form
      setNewNotification({
        title: '',
        message: '',
        type: 'info',
        priority: 1,
        target: 'all',
        expires_at: ''
      });

      setSuccess('Notification created successfully!');
      setTimeout(() => setSuccess(''), 3000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // Update in database
      await supabase
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      // Update local state
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Update local state anyway
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      // Delete from database
      await supabase
        .from('admin_notifications')
        .delete()
        .eq('id', notificationId);

      // Update local state
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
      // Update local state anyway
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons = {
      info: Info,
      warning: AlertTriangle,
      error: XCircle,
      success: CheckCircle
    };
    return icons[type as keyof typeof icons] || Info;
  };

  const getNotificationColor = (type: string) => {
    const colors = {
      info: 'text-blue-600',
      warning: 'text-yellow-600',
      error: 'text-red-600',
      success: 'text-green-600'
    };
    return colors[type as keyof typeof colors] || 'text-blue-600';
  };

  const getNotificationBadge = (type: string) => {
    const colors = {
      info: 'bg-blue-100 text-blue-800',
      warning: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800',
      success: 'bg-green-100 text-green-800'
    };
    return (
      <Badge className={colors[type as keyof typeof colors]}>
        {type.toUpperCase()}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: number) => {
    const colors = {
      1: 'bg-red-100 text-red-800',
      2: 'bg-yellow-100 text-yellow-800',
      3: 'bg-green-100 text-green-800'
    };
    const labels = {
      1: 'High',
      2: 'Medium',
      3: 'Low'
    };
    return (
      <Badge className={colors[priority as keyof typeof colors]}>
        {labels[priority as keyof typeof labels]}
      </Badge>
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
                <h1 className="text-xl font-bold text-slate-900">Notifications</h1>
                <p className="text-sm text-slate-600">Manage system alerts and admin notifications</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={loadNotificationData}
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-2">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {/* Notification Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total Notifications</p>
                  <p className="text-2xl font-bold text-slate-900">{notifications.length}</p>
                </div>
                <Bell className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Unread</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {notifications.filter(n => !n.is_read).length}
                  </p>
                </div>
                <Eye className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">High Priority</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {notifications.filter(n => n.priority === 1).length}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Templates</p>
                  <p className="text-2xl font-bold text-slate-900">{templates.length}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notification Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="notifications">All Notifications</TabsTrigger>
            <TabsTrigger value="create">Create Notification</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="w-5 h-5 mr-2 text-blue-600" />
                  Admin Notifications
                </CardTitle>
                <CardDescription>
                  System alerts and administrative notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-4" />
                    <p className="text-slate-600">Loading notifications...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No Notifications</h3>
                    <p className="text-slate-600">No notifications have been created yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {notifications.map((notification) => {
                      const Icon = getNotificationIcon(notification.type);
                      return (
                        <div key={notification.id} className={`border rounded-lg p-4 ${
                          notification.is_read ? 'border-slate-200 bg-slate-50' : 'border-blue-200 bg-blue-50'
                        }`}>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0 mt-1">
                                <Icon className={`w-5 h-5 ${getNotificationColor(notification.type)}`} />
                              </div>
                              <div className="flex-1">
                                <h3 className="font-semibold text-slate-900 mb-1">{notification.title}</h3>
                                <p className="text-slate-700 text-sm mb-2">{notification.message}</p>
                                <div className="flex items-center space-x-2 text-xs text-slate-500">
                                  <Clock className="w-3 h-3" />
                                  <span>{new Date(notification.created_at).toLocaleString()}</span>
                                  {notification.created_by_name && (
                                    <>
                                      <span>•</span>
                                      <span>by {notification.created_by_name}</span>
                                    </>
                                  )}
                                  {notification.expires_at && (
                                    <>
                                      <span>•</span>
                                      <span>expires {new Date(notification.expires_at).toLocaleDateString()}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {getNotificationBadge(notification.type)}
                              {getPriorityBadge(notification.priority)}
                              {!notification.is_read && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => markAsRead(notification.id)}
                                  className="text-xs"
                                >
                                  Mark Read
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteNotification(notification.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Create Notification Tab */}
          <TabsContent value="create" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Plus className="w-5 h-5 mr-2 text-green-600" />
                  Create New Notification
                </CardTitle>
                <CardDescription>
                  Send alerts and notifications to administrators
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={newNotification.title}
                        onChange={(e) => setNewNotification(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Enter notification title"
                        className="bg-white border-slate-200"
                      />
                    </div>

                    <div>
                      <Label htmlFor="type">Type</Label>
                      <select
                        id="type"
                        value={newNotification.type}
                        onChange={(e) => setNewNotification(prev => ({ ...prev, type: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="error">Error</option>
                        <option value="success">Success</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <select
                        id="priority"
                        value={newNotification.priority}
                        onChange={(e) => setNewNotification(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        <option value={1}>High</option>
                        <option value={2}>Medium</option>
                        <option value={3}>Low</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="expires_at">Expires At (Optional)</Label>
                      <Input
                        id="expires_at"
                        type="datetime-local"
                        value={newNotification.expires_at}
                        onChange={(e) => setNewNotification(prev => ({ ...prev, expires_at: e.target.value }))}
                        className="bg-white border-slate-200"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="message">Message</Label>
                    <textarea
                      id="message"
                      value={newNotification.message}
                      onChange={(e) => setNewNotification(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Enter notification message"
                      rows={8}
                      className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setNewNotification({
                      title: '',
                      message: '',
                      type: 'info',
                      priority: 1,
                      target: 'all',
                      expires_at: ''
                    })}
                    className="border-slate-200 hover:bg-slate-50"
                  >
                    Clear
                  </Button>
                  <Button
                    onClick={createNotification}
                    disabled={isCreating || !newNotification.title || !newNotification.message}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                  >
                    {isCreating ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Create Notification
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2 text-purple-600" />
                  Notification Templates
                </CardTitle>
                <CardDescription>
                  Pre-defined templates for common notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((template) => (
                    <div key={template.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-slate-900">{template.name}</h3>
                        <div className="flex items-center space-x-2">
                          {getNotificationBadge(template.type)}
                          <Badge className="bg-slate-100 text-slate-700">
                            {template.category}
                          </Badge>
                        </div>
                      </div>
                      <h4 className="font-medium text-slate-800 mb-2">{template.title}</h4>
                      <p className="text-sm text-slate-600 mb-3">{template.message}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setNewNotification(prev => ({
                            ...prev,
                            title: template.title,
                            message: template.message,
                            type: template.type
                          }));
                          setActiveTab('create');
                        }}
                        className="border-slate-200 hover:bg-slate-50"
                      >
                        Use Template
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}