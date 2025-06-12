"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  Users, 
  DollarSign, 
  Target, 
  Crown, 
  TrendingUp, 
  Gift, 
  RefreshCw,
  Wallet,
  Shield,
  Clock,
  Star,
  CheckCircle,
  Zap,
  Award,
  BarChart3,
  Activity,
  Sparkles,
  ChevronRight,
  Play,
  Globe,
  Layers,
  Coins,
  LogOut,
  LayoutDashboard
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { SignupAlert } from '@/components/SignupAlert';

const incomeStreams = [
  {
    title: 'Direct Referral Income',
    amount: '$5',
    description: 'Instant payment per direct referral',
    icon: Users,
    color: 'from-emerald-400 to-emerald-600',
    features: ['Instant payment', 'No waiting period', 'Unlimited referrals']
  },
  {
    title: 'Level Income',
    amount: '$0.5',
    description: 'Per activation across levels 2-7 in your downline',
    icon: BarChart3,
    color: 'from-blue-400 to-blue-600',
    features: ['7 levels deep', 'Passive income', 'Network growth']
  },
  {
    title: 'Pool Income',
    amount: '$5-$27',
    description: 'Progressive rewards through 4 pools with time limits',
    icon: Target,
    color: 'from-orange-400 to-orange-600',
    features: ['4 progressive pools', 'Time-based rewards', 'Rank requirements']
  },
  {
    title: 'Rank Sponsor Income',
    amount: '$1-$4',
    description: 'Bonuses when direct referrals achieve new ranks',
    icon: Crown,
    color: 'from-purple-400 to-purple-600',
    features: ['Gold to Ambassador', 'Achievement bonuses', 'Team motivation']
  },
  {
    title: 'Global Turnover Income',
    amount: '1-2%',
    description: 'Daily company turnover for 21 days (5+ referrals)',
    icon: Globe,
    color: 'from-teal-400 to-teal-600',
    features: ['21-day period', 'Company-wide sharing', '5+ referrals required']
  },
  {
    title: 'Team Rewards',
    amount: '$10-$5,000',
    description: 'Based on total team size (10-1000+ members)',
    icon: Gift,
    color: 'from-pink-400 to-pink-600',
    features: ['Team size based', 'Up to $5,000', 'Leadership rewards']
  },
  {
    title: 'Recycle Income',
    amount: '$5-$25',
    description: 'Increasing bonuses for cycle completion',
    icon: RefreshCw,
    color: 'from-amber-400 to-amber-600',
    features: ['Cycle completion', 'Increasing rewards', 'Reactivation bonuses']
  }
];

const poolSystem = [
  { pool: 'Pool 1', amount: '$5', time: '30 minutes', rank: 'Starter', requirement: 'None' },
  { pool: 'Pool 2', amount: '$10', time: '24 hours', rank: 'Gold', requirement: '1 direct referral' },
  { pool: 'Pool 3', amount: '$15', time: '5 days', rank: 'Platinum', requirement: '1 direct referral' },
  { pool: 'Pool 4', amount: '$27', time: '15 days', rank: 'Diamond', requirement: '1 direct referral' }
];

const features = [
  {
    icon: Wallet,
    title: 'Dual Wallet System',
    description: 'Main wallet for earnings and withdrawals, Fund wallet for activities and P2P transfers'
  },
  {
    icon: Shield,
    title: 'Secure Platform',
    description: 'Advanced security measures to protect your earnings and personal information'
  },
  {
    icon: Activity,
    title: 'Real-time Tracking',
    description: 'Monitor all your income streams and team performance in real-time'
  },
  {
    icon: Award,
    title: 'Achievement System',
    description: 'Unlock new ranks and bonuses as you grow your network and achieve milestones'
  }
];

const stats = [
  { label: 'Active Members', value: '50,000+', icon: Users },
  { label: 'Total Payouts', value: '$2.5M+', icon: DollarSign },
  { label: 'Countries', value: '120+', icon: Globe },
  { label: 'Success Rate', value: '94%', icon: TrendingUp }
];

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const { user, signOut, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-teal-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-orange-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-teal-600 bg-clip-text text-transparent">
                Referral Hub
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              {loading ? (
                <div className="animate-pulse bg-gray-200 h-10 w-20 rounded-md"></div>
              ) : user ? (
                <>
                  <Button 
                    variant="outline" 
                    className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 border-blue-200"
                    onClick={() => router.push('/dashboard')}
                  >
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                  <Button 
                    variant="outline" 
                    className="text-gray-700 hover:text-red-600 hover:bg-red-50 border-red-200"
                    onClick={handleSignOut}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="ghost" 
                    className="text-gray-700 hover:text-orange-600 hover:bg-orange-50"
                    onClick={() => router.push('/login')}
                  >
                    Sign In
                  </Button>
                  <Button 
                    className="bg-gradient-to-r from-orange-400 to-teal-500 hover:from-orange-500 hover:to-teal-600 text-white shadow-lg"
                    onClick={() => router.push('/register')}
                  >
                    Get Started
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-100/50 to-teal-100/50"></div>
        <div className="absolute top-20 left-20 w-32 h-32 bg-orange-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-teal-200/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Unlock <span className="bg-gradient-to-r from-orange-600 to-teal-600 bg-clip-text text-transparent">Seven Income Streams</span> with Our Referral System
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Join thousands of successful members earning through our comprehensive 7-stream income system. 
              Start with just one referral and unlock unlimited earning potential.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              {user ? (
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-orange-400 to-teal-500 hover:from-orange-500 hover:to-teal-600 text-white shadow-xl text-lg px-8 py-6"
                  onClick={() => router.push('/dashboard')}
                >
                  Go to Dashboard
                  <LayoutDashboard className="w-5 h-5 ml-2" />
                </Button>
              ) : (
                <>
                  <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-orange-400 to-teal-500 hover:from-orange-500 hover:to-teal-600 text-white shadow-xl text-lg px-8 py-6"
                    onClick={() => router.push('/register')}
                  >
                    Start Earning Today
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="border-2 border-orange-200 hover:bg-orange-50 text-gray-700 text-lg px-8 py-6"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Watch Demo
                  </Button>
                </>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-teal-500 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Seven Income Streams */}
      <section className="py-20 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Seven Powerful <span className="bg-gradient-to-r from-orange-600 to-teal-600 bg-clip-text text-transparent">Income Streams</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our comprehensive system offers multiple ways to earn, ensuring consistent income from various sources
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {incomeStreams.map((stream, index) => (
              <Card key={index} className="hover:shadow-xl transition-all duration-300 border-orange-100 hover:border-orange-200 bg-white/80 backdrop-blur-sm group">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-r ${stream.color} shadow-lg`}>
                      <stream.icon className="w-6 h-6 text-white" />
                    </div>
                    <Badge className="bg-gradient-to-r from-orange-100 to-teal-100 text-orange-700 border-orange-200">
                      {stream.amount}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg text-gray-900">{stream.title}</CardTitle>
                  <CardDescription className="text-gray-600">{stream.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {stream.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pool System */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Progressive <span className="bg-gradient-to-r from-orange-600 to-teal-600 bg-clip-text text-transparent">Pool System</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Advance through four progressive pools with increasing rewards and time-based challenges
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {poolSystem.map((pool, index) => (
              <Card key={index} className="hover:shadow-lg transition-all duration-300 border-orange-100 hover:border-orange-200 bg-white/80 backdrop-blur-sm">
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Layers className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-xl text-gray-900">{pool.pool}</CardTitle>
                  <div className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-teal-600 bg-clip-text text-transparent">
                    {pool.amount}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-2 text-orange-500" />
                    {pool.time}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Star className="w-4 h-4 mr-2 text-teal-500" />
                    {pool.rank} rank
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Target className="w-4 h-4 mr-2 text-orange-500" />
                    {pool.requirement}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Platform <span className="bg-gradient-to-r from-orange-600 to-teal-600 bg-clip-text text-transparent">Features</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Built with cutting-edge technology to ensure security, transparency, and optimal user experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-all duration-300 border-orange-100 hover:border-orange-200 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-8">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-teal-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                      <p className="text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Dual Wallet System */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-orange-400 to-teal-500 rounded-3xl p-8 lg:p-12 text-white shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl lg:text-4xl font-bold mb-6">
                  Dual Wallet System
                </h2>
                <p className="text-xl text-white/90 mb-8">
                  Manage your earnings efficiently with our innovative dual wallet system designed for maximum flexibility and security.
                </p>
                
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Wallet className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Main Wallet</h3>
                      <p className="text-white/80">Receives all earnings, used for withdrawals (15% fee)</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Coins className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Fund Wallet</h3>
                      <p className="text-white/80">Receives deposits, used for platform activities and P2P transfers</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                <h3 className="text-xl font-semibold mb-4">Fee Structure</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Withdrawals</span>
                    <span className="font-semibold">15%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Main to Fund Transfer</span>
                    <span className="font-semibold">10%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Deposits</span>
                    <span className="font-semibold text-emerald-300">0%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>P2P Transfers</span>
                    <span className="font-semibold text-emerald-300">0%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-orange-50 to-teal-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
            Ready to Start Your <span className="bg-gradient-to-r from-orange-600 to-teal-600 bg-clip-text text-transparent">Income Journey?</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of successful members and start earning through our proven 7-stream system today.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-orange-400 to-teal-500 hover:from-orange-500 hover:to-teal-600 text-white shadow-xl text-lg px-8 py-6"
                onClick={() => router.push('/dashboard')}
              >
                Go to Dashboard
                <LayoutDashboard className="w-5 h-5 ml-2" />
              </Button>
            ) : (
              <>
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-orange-400 to-teal-500 hover:from-orange-500 hover:to-teal-600 text-white shadow-xl text-lg px-8 py-6"
                  onClick={() => router.push('/register')}
                >
                  Create Free Account
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-2 border-orange-200 hover:bg-orange-50 text-gray-700 text-lg px-8 py-6"
                  onClick={() => router.push('/login')}
                >
                  Already a Member?
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-teal-600 bg-clip-text text-transparent">
                  Referral Hub
                </span>
              </div>
              <p className="text-gray-600 mb-4">
                The most comprehensive referral system with seven income streams designed to maximize your earning potential.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Platform</h3>
              <ul className="space-y-2 text-gray-600">
                <li><a href="#" className="hover:text-orange-600">How it Works</a></li>
                <li><a href="#" className="hover:text-orange-600">Income Streams</a></li>
                <li><a href="#" className="hover:text-orange-600">Pool System</a></li>
                <li><a href="#" className="hover:text-orange-600">Pricing</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Support</h3>
              <ul className="space-y-2 text-gray-600">
                <li><a href="#" className="hover:text-orange-600">Help Center</a></li>
                <li><a href="#" className="hover:text-orange-600">Contact Us</a></li>
                <li><a href="#" className="hover:text-orange-600">Terms of Service</a></li>
                <li><a href="#" className="hover:text-orange-600">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-orange-100 mt-8 pt-8 text-center text-gray-600">
            <p>&copy; 2025 Referral Hub. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Signup Alerts */}
      <SignupAlert />
    </div>
  );
}