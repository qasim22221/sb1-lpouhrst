"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Menu, 
  Bell,
  Settings,
  LogOut,
  ChevronDown,
  Shield,
  Activity,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  X
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface AdminHeaderProps {
  onToggleSidebar: () => void;
}

interface AdminNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export function AdminHeader({ onToggleSidebar }: AdminHeaderProps) {
  const { admin, signOut } = useAdminAuth();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Mock notifications
  const [notifications] = useState<AdminNotification[]>([
    {
      id: '1',
      type: 'warning',
      title: 'Pending Withdrawals',
      message: '5 withdrawal requests need approval',
      time: '5 minutes ago',
      read: false
    },
    {
      id: '2',
      type: 'info',
      title: 'System Update',
      message: 'Scheduled maintenance in 2 hours',
      time: '1 hour ago',
      read: false
    },
    {
      id: '3',
      type: 'success',
      title: 'Backup Complete',
      message: 'Daily database backup completed',
      time: '3 hours ago',
      read: true
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/admin/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning': return AlertTriangle;
      case 'error': return X;
      case 'success': return CheckCircle;
      default: return Bell;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'warning': return 'text-orange-600';
      case 'error': return 'text-red-600';
      case 'success': return 'text-green-600';
      default: return 'text-blue-600';
    }
  };

  return (
    <header className="bg-white/95 backdrop-blur-sm shadow-sm border-b border-slate-200 sticky top-0 z-40">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Section */}
          <div className="flex items-center space-x-4">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              className="lg:hidden text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Logo & Title */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg lg:hidden">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="hidden lg:block">
                <h1 className="text-xl font-bold text-slate-900">Admin Panel</h1>
              </div>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-3">
            {/* Admin Role Badge */}
            <Badge className="bg-blue-100 text-blue-700 hidden sm:inline-flex">
              <Shield className="w-3 h-3 mr-1" />
              {admin?.role?.display_name || 'Admin'}
            </Badge>

            {/* Notifications */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(!showNotifications)}
                className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 relative p-2"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-medium animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>

              {showNotifications && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowNotifications(false)}
                  />
                  
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-slate-200 z-50 max-h-96 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900">Admin Notifications</h3>
                      {unreadCount > 0 && (
                        <Badge className="bg-red-100 text-red-700">
                          {unreadCount} new
                        </Badge>
                      )}
                    </div>
                    
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-slate-500">
                          <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p className="text-sm">No notifications</p>
                        </div>
                      ) : (
                        notifications.map((notification) => {
                          const Icon = getNotificationIcon(notification.type);
                          const colorClass = getNotificationColor(notification.type);
                          
                          return (
                            <div
                              key={notification.id}
                              className={`p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors ${
                                !notification.read ? 'bg-blue-50/50' : ''
                              }`}
                            >
                              <div className="flex items-start space-x-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  notification.type === 'warning' ? 'bg-orange-100' :
                                  notification.type === 'error' ? 'bg-red-100' :
                                  notification.type === 'success' ? 'bg-green-100' :
                                  'bg-blue-100'
                                }`}>
                                  <Icon className={`w-4 h-4 ${colorClass}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-slate-900 truncate">
                                      {notification.title}
                                    </p>
                                    {!notification.read && (
                                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2"></div>
                                    )}
                                  </div>
                                  <p className="text-sm text-slate-600 truncate">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-slate-400 mt-1">
                                    {notification.time}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* User Menu */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center space-x-2 p-2"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {admin?.first_name?.charAt(0) || admin?.username?.charAt(0) || 'A'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 hidden sm:block" />
              </Button>

              {showUserMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowUserMenu(false)}
                  />
                  
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-medium text-slate-900">
                        {admin?.first_name && admin?.last_name 
                          ? `${admin.first_name} ${admin.last_name}`
                          : admin?.username
                        }
                      </p>
                      <p className="text-xs text-slate-500">{admin?.email}</p>
                      <Badge className="mt-1 bg-blue-100 text-blue-700 text-xs">
                        {admin?.role?.display_name || 'Administrator'}
                      </Badge>
                    </div>
                    
                    <div className="py-1">
                      <button
                        onClick={() => {
                          router.push('/admin/profile');
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center"
                      >
                        <Settings className="w-4 h-4 mr-3 text-slate-500" />
                        Profile Settings
                      </button>
                      <button
                        onClick={() => {
                          router.push('/admin/activity');
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center"
                      >
                        <Activity className="w-4 h-4 mr-3 text-slate-500" />
                        Activity Log
                      </button>
                    </div>
                    
                    <div className="border-t border-slate-100 pt-1">
                      <button
                        onClick={() => {
                          handleSignOut();
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                      >
                        <LogOut className="w-4 h-4 mr-3 text-red-500" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}