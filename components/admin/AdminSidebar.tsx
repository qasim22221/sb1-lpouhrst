"use client";

import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard,
  Users,
  DollarSign,
  BarChart3,
  Settings,
  Shield,
  Bell,
  Activity,
  FileText,
  Database,
  Globe,
  Lock,
  UserPlus,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Target,
  Crown,
  RefreshCw,
  X,
  ChevronRight,
  Wallet,
  Coins,
  TrendingUp,
  Zap,
  Cog
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const { admin } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();

  const mainNavigation = [
    {
      title: 'Dashboard',
      href: '/admin',
      icon: LayoutDashboard,
      description: 'Overview & Analytics',
      permission: 'dashboard'
    },
    {
      title: 'User Management',
      href: '/admin/users',
      icon: Users,
      description: 'Manage Users & Accounts',
      permission: 'users.view'
    },
    {
      title: 'Financial Control',
      href: '/admin/finance',
      icon: DollarSign,
      description: 'Balances & Transactions',
      permission: 'finances.view'
    },
    {
      title: 'Withdrawals',
      href: '/admin/withdrawals',
      icon: ArrowUpRight,
      description: 'Approval & Processing',
      permission: 'finances.approve_withdrawals',
      badge: '5' // Mock pending count
    },
    {
      title: 'Analytics',
      href: '/admin/analytics',
      icon: BarChart3,
      description: 'Reports & Insights',
      permission: 'analytics.view_all'
    }
  ];

  const configurationNavigation = [
    {
      title: 'Master Wallet',
      href: '/admin/master-wallet',
      icon: Wallet,
      description: 'Wallet Configuration',
      permission: 'system.view_settings'
    },
    {
      title: 'Income Settings',
      href: '/admin/income-settings',
      icon: DollarSign,
      description: 'Income Distribution',
      permission: 'system.edit_settings'
    },
    {
      title: 'Sweep Settings',
      href: '/admin/sweep-settings',
      icon: RefreshCw,
      description: 'Auto Sweep Config',
      permission: 'system.edit_settings'
    },
    {
      title: 'System Settings',
      href: '/admin/settings',
      icon: Cog,
      description: 'Platform Configuration',
      permission: 'system.view_settings'
    }
  ];

  const systemNavigation = [
    {
      title: 'Admin Users',
      href: '/admin/admins',
      icon: Shield,
      description: 'Admin Management',
      permission: 'system.manage_admins'
    },
    {
      title: 'Activity Logs',
      href: '/admin/logs',
      icon: Activity,
      description: 'System Activity',
      permission: 'system.view_logs'
    },
    {
      title: 'Notifications',
      href: '/admin/notifications',
      icon: Bell,
      description: 'System Alerts',
      permission: 'notifications.create'
    },
    {
      title: 'Security',
      href: '/admin/security',
      icon: Lock,
      description: 'Security Monitoring',
      permission: 'system.view_logs'
    }
  ];

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  const hasPermission = (permission: string) => {
    // For now, return true - implement proper permission checking later
    return true;
  };

  const handleNavigation = (href: string) => {
    router.push(href);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
        w-64 bg-white border-r border-slate-200 h-screen flex flex-col
        transform transition-transform duration-300 ease-in-out lg:transform-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Mobile Close Button */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900">Admin Panel</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Logo Section - Desktop */}
        <div className="hidden lg:block p-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Admin Panel</h1>
              <p className="text-xs text-slate-500">System Management</p>
            </div>
          </div>
        </div>

        {/* Admin Profile Section */}
        {admin && (
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {admin.first_name?.charAt(0) || admin.username?.charAt(0) || 'A'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {admin.first_name && admin.last_name 
                    ? `${admin.first_name} ${admin.last_name}`
                    : admin.username
                  }
                </p>
                <Badge className="bg-blue-100 text-blue-700 text-xs">
                  {admin.role?.display_name || 'Administrator'}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          {/* Main Navigation */}
          <div className="p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              MAIN FUNCTIONS
            </h3>
            <nav className="space-y-1">
              {mainNavigation.map((item) => {
                if (!hasPermission(item.permission)) return null;
                
                const Icon = item.icon;
                const active = isActive(item.href);
                
                return (
                  <Button
                    key={item.href}
                    variant="ghost"
                    onClick={() => handleNavigation(item.href)}
                    className={`w-full justify-start h-auto p-3 ${
                      active 
                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border-r-2 border-blue-500' 
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mr-3 ${
                      active ? 'text-blue-600' : 'text-slate-500'
                    }`} />
                    <div className="flex-1 text-left">
                      <div className="font-medium">{item.title}</div>
                      <div className="text-xs text-slate-500">{item.description}</div>
                    </div>
                    {item.badge && (
                      <Badge className="bg-red-100 text-red-700 text-xs">
                        {item.badge}
                      </Badge>
                    )}
                    {active && (
                      <ChevronRight className="w-4 h-4 text-blue-600" />
                    )}
                  </Button>
                );
              })}
            </nav>
          </div>

          {/* Configuration Navigation */}
          <div className="p-4 border-t border-slate-100">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              CONFIGURATION
            </h3>
            <nav className="space-y-1">
              {configurationNavigation.map((item) => {
                if (!hasPermission(item.permission)) return null;
                
                const Icon = item.icon;
                const active = isActive(item.href);
                
                return (
                  <Button
                    key={item.href}
                    variant="ghost"
                    onClick={() => handleNavigation(item.href)}
                    className={`w-full justify-start h-auto p-3 ${
                      active 
                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border-r-2 border-blue-500' 
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mr-3 ${
                      active ? 'text-blue-600' : 'text-slate-500'
                    }`} />
                    <div className="flex-1 text-left">
                      <div className="font-medium">{item.title}</div>
                      <div className="text-xs text-slate-500">{item.description}</div>
                    </div>
                    {active && (
                      <ChevronRight className="w-4 h-4 text-blue-600" />
                    )}
                  </Button>
                );
              })}
            </nav>
          </div>

          {/* System Navigation */}
          <div className="p-4 border-t border-slate-100">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              SYSTEM & SECURITY
            </h3>
            <nav className="space-y-1">
              {systemNavigation.map((item) => {
                if (!hasPermission(item.permission)) return null;
                
                const Icon = item.icon;
                const active = isActive(item.href);
                
                return (
                  <Button
                    key={item.href}
                    variant="ghost"
                    onClick={() => handleNavigation(item.href)}
                    className={`w-full justify-start h-auto p-3 ${
                      active 
                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border-r-2 border-blue-500' 
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mr-3 ${
                      active ? 'text-blue-600' : 'text-slate-500'
                    }`} />
                    <div className="flex-1 text-left">
                      <div className="font-medium">{item.title}</div>
                      <div className="text-xs text-slate-500">{item.description}</div>
                    </div>
                    {active && (
                      <ChevronRight className="w-4 h-4 text-blue-600" />
                    )}
                  </Button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100">
          <div className="text-center">
            <p className="text-xs text-slate-500">
              Admin Panel v1.0
            </p>
            <p className="text-xs text-slate-400">
              Secure Administrative Access
            </p>
          </div>
        </div>
      </div>
    </>
  );
}