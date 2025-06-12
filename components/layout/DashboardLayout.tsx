"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  LayoutDashboard,
  Users,
  BarChart3,
  Target,
  Crown,
  Globe,
  RefreshCw,
  Download,
  ArrowUpRight,
  Send,
  Settings,
  ChevronRight,
  Sparkles,
  Wallet,
  CreditCard,
  History,
  Plus,
  X,
  Menu,
  Bell,
  LogOut,
  User,
  ChevronDown,
  Copy,
  Check,
  Activity,
  DollarSign,
  TrendingUp,
  Eye,
  EyeOff,
  Loader2,
  Home,
  Moon,
  Sun
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { NotificationCenter } from '@/components/NotificationCenter';
import { supabase } from '@/lib/supabase';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mounted, setMounted] = useState(false);
  const [showBalances, setShowBalances] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [copiedReferralCode, setCopiedReferralCode] = useState(false);
  const [mainWalletBalance, setMainWalletBalance] = useState(0);
  const [fundWalletBalance, setFundWalletBalance] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

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
    if (mounted && !authLoading && !user) {
      router.push('/login');
    } else if (mounted && !authLoading && user && profile) {
      setMainWalletBalance(profile.main_wallet_balance || 0);
      setFundWalletBalance(profile.fund_wallet_balance || 0);
      fetchUnreadNotifications();
    }
  }, [user, profile, authLoading, mounted, router]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close user menu when clicking outside
      if (showUserMenu && !(event.target as Element).closest('[data-user-menu]')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  // Set up real-time notification listener
  useEffect(() => {
    if (user) {
      const subscription = supabase
        .channel('notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, () => {
          fetchUnreadNotifications();
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [user]);

  const fetchUnreadNotifications = async () => {
    if (!user) return;
    
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
        
      if (!error && count !== null) {
        setUnreadNotifications(count);
      }
    } catch (error) {
      console.error('Failed to fetch unread notifications count:', error);
    }
  };

  const mainNavigation = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      description: 'Overview & Statistics'
    },
    {
      title: 'My Network',
      href: '/network',
      icon: Users,
      description: 'Referrals & Team'
    },
    {
      title: 'Income Tracking',
      href: '/income',
      icon: BarChart3,
      description: 'All Income Streams'
    },
    {
      title: 'Pool System',
      href: '/pools',
      icon: Target,
      description: 'Progressive Rewards'
    },
    {
      title: 'Ranks & Rewards',
      href: '/ranks',
      icon: Crown,
      description: 'Achievements & Bonuses'
    },
    {
      title: 'Global Turnover',
      href: '/global-turnover',
      icon: Globe,
      description: 'Company Sharing'
    },
    {
      title: 'Recycle Income',
      href: '/recycle',
      icon: RefreshCw,
      description: 'Reactivation Bonuses'
    }
  ];

  const walletTransactions = [
    {
      title: 'Deposit Funds',
      href: '/deposit',
      icon: Download,
      description: 'Add USDT to Fund Wallet'
    },
    {
      title: 'Withdraw Funds',
      href: '/withdrawal',
      icon: ArrowUpRight,
      description: 'Transfer to External Wallet'
    },
    {
      title: 'P2P Transfer',
      href: '/p2p-transfer',
      icon: Send,
      description: 'Send to Other Users'
    },
    {
      title: 'Transaction History',
      href: '/transactions',
      icon: History,
      description: 'Complete Transaction Log'
    },
    {
      title: 'Wallet Management',
      href: '/wallets',
      icon: Wallet,
      description: 'Manage BEP20 Wallets'
    }
  ];

  const isActive = (href: string) => {
    if (typeof window !== 'undefined') {
      return window.location.pathname === href;
    }
    return false;
  };

  const handleNavigation = (href: string) => {
    router.push(href);
    setSidebarOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const copyReferralCode = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code);
      setCopiedReferralCode(true);
      setTimeout(() => setCopiedReferralCode(false), 2000);
    }
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

  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 dark:text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <User className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Please Sign In</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">You need to be logged in to access the dashboard and all its features.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={() => router.push('/login')}
              className="bg-gradient-to-r from-orange-400 to-teal-500 hover:from-orange-500 hover:to-teal-600 text-white"
            >
              Sign In
            </Button>
            <Button 
              variant="outline"
              onClick={() => router.push('/')}
              className="border-orange-200 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-900/30 text-gray-700 dark:text-gray-200"
            >
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex overflow-hidden">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
        w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full flex flex-col
        transform transition-transform duration-300 ease-in-out lg:transform-none
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Mobile Close Button */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-teal-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">Menu</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(false)}
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Logo Section - Desktop */}
        <div className="hidden lg:block p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-teal-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Referral Hub</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Seven Income Streams</p>
            </div>
          </div>
        </div>

        {/* User Profile Section */}
        {profile && (
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-gradient-to-r from-teal-400 to-orange-500 text-white font-semibold">
                  {profile.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{profile.username}</p>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs">
                    {profile.rank}
                  </Badge>
                  <Badge className={`text-xs ${
                    profile.account_status === 'active' 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                  }`}>
                    {profile.account_status}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* Main Navigation */}
          <div className="p-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              MAIN NAVIGATION
            </h3>
            <nav className="space-y-1">
              {mainNavigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                
                return (
                  <Button
                    key={item.href}
                    variant="ghost"
                    onClick={() => handleNavigation(item.href)}
                    className={`w-full justify-start h-auto p-3 ${
                      active 
                        ? 'bg-gradient-to-r from-teal-50 to-orange-50 dark:from-teal-900/20 dark:to-orange-900/20 text-teal-700 dark:text-teal-300 border-r-2 border-teal-500' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mr-3 ${
                      active ? 'text-teal-600 dark:text-teal-400' : 'text-gray-500 dark:text-gray-400'
                    }`} />
                    <div className="flex-1 text-left">
                      <div className="font-medium">{item.title}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{item.description}</div>
                    </div>
                    {active && (
                      <ChevronRight className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    )}
                  </Button>
                );
              })}
            </nav>
          </div>

          {/* Wallet & Transactions */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-700">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              WALLET & TRANSACTIONS
            </h3>
            <nav className="space-y-1">
              {walletTransactions.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                
                return (
                  <Button
                    key={item.href}
                    variant="ghost"
                    onClick={() => handleNavigation(item.href)}
                    className={`w-full justify-start h-auto p-3 ${
                      active 
                        ? 'bg-gradient-to-r from-teal-50 to-orange-50 dark:from-teal-900/20 dark:to-orange-900/20 text-teal-700 dark:text-teal-300 border-r-2 border-teal-500' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mr-3 ${
                      active ? 'text-teal-600 dark:text-teal-400' : 'text-gray-500 dark:text-gray-400'
                    }`} />
                    <div className="flex-1 text-left">
                      <div className="font-medium">{item.title}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{item.description}</div>
                    </div>
                    {active && (
                      <ChevronRight className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    )}
                  </Button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Settings at Bottom */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <Button
            variant="ghost"
            onClick={() => handleNavigation('/settings')}
            className="w-full justify-start h-auto p-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30"
          >
            <Settings className="w-5 h-5 mr-3 text-gray-500 dark:text-gray-400" />
            <div className="flex-1 text-left">
              <div className="font-medium">Settings</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Account & Preferences</div>
            </div>
          </Button>
          
          <Button
            variant="ghost"
            onClick={() => router.push('/')}
            className="w-full justify-start h-auto p-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30 mt-2"
          >
            <Home className="w-5 h-5 mr-3 text-gray-500 dark:text-gray-400" />
            <div className="flex-1 text-left">
              <div className="font-medium">Home Page</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">View Landing Page</div>
            </div>
          </Button>
          
          <Button
            variant="ghost"
            onClick={toggleDarkMode}
            className="w-full justify-start h-auto p-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30 mt-2"
          >
            {darkMode ? (
              <Sun className="w-5 h-5 mr-3 text-amber-500" />
            ) : (
              <Moon className="w-5 h-5 mr-3 text-indigo-500" />
            )}
            <div className="flex-1 text-left">
              <div className="font-medium">{darkMode ? 'Light Mode' : 'Dark Mode'}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Change appearance</div>
            </div>
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Header */}
        <header className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-sm border-b border-blue-100 dark:border-gray-700 flex-shrink-0 z-20 relative">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Left Section */}
              <div className="flex items-center space-x-4 flex-1 min-w-0">
                {/* Mobile Menu Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden text-gray-600 hover:text-teal-600 hover:bg-teal-50 dark:text-gray-300 dark:hover:text-teal-400 dark:hover:bg-gray-700 flex-shrink-0"
                >
                  <Menu className="w-5 h-5" />
                </Button>

                {/* Mobile Logo */}
                <div className="lg:hidden flex items-center space-x-2 flex-shrink-0">
                  <div className="w-8 h-8 bg-gradient-to-r from-teal-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                </div>

                {/* Desktop: Username Display */}
                <div className="hidden lg:block">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Welcome back, {profile?.username}!
                  </h2>
                </div>
              </div>

              {/* Right Section */}
              <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                {/* Balance Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBalances(!showBalances)}
                  className="text-gray-600 hover:text-teal-600 hover:bg-teal-50 dark:text-gray-300 dark:hover:text-teal-400 dark:hover:bg-gray-700 p-2"
                  title="Toggle Balance Visibility"
                >
                  {showBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>

                {/* Dark Mode Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleDarkMode}
                  className="text-gray-600 hover:text-teal-600 hover:bg-teal-50 dark:text-gray-300 dark:hover:text-teal-400 dark:hover:bg-gray-700 p-2"
                  title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                  {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>

                {/* Notifications */}
                <NotificationCenter />

                {/* User Menu */}
                <div className="relative" data-user-menu>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="text-gray-600 hover:text-teal-600 hover:bg-teal-50 dark:text-gray-300 dark:hover:text-teal-400 dark:hover:bg-gray-700 flex items-center space-x-2 p-2"
                    aria-expanded={showUserMenu}
                    aria-haspopup="true"
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-teal-400 to-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {profile?.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 hidden sm:block" />
                  </Button>

                  {/* User Menu Dropdown */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50">
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{profile?.username}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{profile?.email}</p>
                        
                        {/* Referral Code */}
                        <div className="mt-2 flex items-center space-x-2">
                          <div className="text-xs text-gray-500 dark:text-gray-400">Referral Code:</div>
                          <div className="flex items-center space-x-1">
                            <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300 font-mono">
                              {profile?.referral_code}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={copyReferralCode}
                              className="p-0 h-auto"
                            >
                              {copiedReferralCode ? (
                                <Check className="w-3 h-3 text-green-500" />
                              ) : (
                                <Copy className="w-3 h-3 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Wallet Balances */}
                      <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Main Wallet:</span>
                          <span className="text-xs font-medium text-green-600 dark:text-green-400">
                            {showBalances ? `$${mainWalletBalance.toFixed(2)}` : '••••'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Fund Wallet:</span>
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                            {showBalances ? `$${fundWalletBalance.toFixed(2)}` : '••••'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Menu Items */}
                      <div className="py-1">
                        <button
                          onClick={() => {
                            handleNavigation('/settings');
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center"
                        >
                          <Settings className="w-4 h-4 mr-3 text-gray-500 dark:text-gray-400" />
                          Account Settings
                        </button>
                        <button
                          onClick={() => {
                            handleNavigation('/wallets');
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center"
                        >
                          <DollarSign className="w-4 h-4 mr-3 text-gray-500 dark:text-gray-400" />
                          Wallet Management
                        </button>
                        <button
                          onClick={() => {
                            handleNavigation('/transactions');
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center"
                        >
                          <Activity className="w-4 h-4 mr-3 text-gray-500 dark:text-gray-400" />
                          Transaction History
                        </button>
                        <button
                          onClick={() => {
                            router.push('/');
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center"
                        >
                          <Home className="w-4 h-4 mr-3 text-gray-500 dark:text-gray-400" />
                          Home Page
                        </button>
                      </div>
                      
                      {/* Sign Out */}
                      <div className="border-t border-gray-100 dark:border-gray-700 pt-1">
                        <button
                          onClick={() => {
                            handleSignOut();
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
                        >
                          <LogOut className="w-4 h-4 mr-3 text-red-500 dark:text-red-400" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>
        
        {/* Main Content - Scrollable */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          {children}
        </main>
      </div>
    </div>
  );
}