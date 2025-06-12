"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Settings, 
  Wallet, 
  Zap, 
  TrendingUp, 
  Activity,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Fuel,
  BarChart3,
  Play,
  Pause,
  RotateCcw,
  Eye,
  Download,
  Upload,
  Loader2,
  AlertTriangle,
  Info,
  Target,
  Timer,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Database,
  Shield,
  Gauge
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface GasOperation {
  id: string;
  operation_type: 'distribute' | 'sweep' | 'batch';
  wallet_addresses: string[];
  bnb_amount: number;
  gas_used: number;
  cost_usd: number;
  status: 'pending' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

interface GasStats {
  total_operations: number;
  completed_operations: number;
  failed_operations: number;
  total_cost_usd: number;
  total_bnb_used: number;
  total_gas_used: number;
  average_cost_per_operation: number;
  success_rate: number;
  operations_by_type: Record<string, number>;
}

interface MasterWalletConfig {
  id: string;
  wallet_address: string;
  min_bnb_reserve: number;
  gas_distribution_amount: number;
  sweep_threshold_high: number;
  sweep_threshold_medium: number;
  sweep_threshold_low: number;
  auto_sweep_enabled: boolean;
  max_daily_operations: number;
}

interface SweepSchedule {
  id: string;
  wallet_address: string;
  usdt_balance: number;
  bnb_balance: number;
  priority: 1 | 2 | 3;
  next_sweep_at: string;
  status: string;
  user_id: string;
}

export default function GasManagementPage() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [gasOperations, setGasOperations] = useState<GasOperation[]>([]);
  const [gasStats, setGasStats] = useState<GasStats | null>(null);
  const [masterConfig, setMasterConfig] = useState<MasterWalletConfig | null>(null);
  const [sweepSchedules, setSweepSchedules] = useState<SweepSchedule[]>([]);
  const [isAutoSweepRunning, setIsAutoSweepRunning] = useState(false);
  const [masterWalletBalance, setMasterWalletBalance] = useState({ bnb: '0', usdt: '0' });
  
  const { user, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !user) {
      router.push('/login');
    } else if (mounted && user && profile) {
      // Check if user is admin
      if (profile.rank !== 'Admin') {
        router.push('/dashboard');
        return;
      }
      
      loadGasManagementData();
    }
  }, [user, profile, mounted, router]);

  const loadGasManagementData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadGasOperations(),
        loadGasStats(),
        loadMasterConfig(),
        loadSweepSchedules(),
        loadMasterWalletBalance(),
      ]);
    } catch (err: any) {
      setError(`Failed to load gas management data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadGasOperations = async () => {
    try {
      const { data, error } = await supabase
        .from('gas_operations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setGasOperations(data || []);
    } catch (err: any) {
      console.error('Error loading gas operations:', err);
    }
  };

  const loadGasStats = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_gas_operation_stats', { days_param: 7 });

      if (error) throw error;
      setGasStats(data);
    } catch (err: any) {
      console.error('Error loading gas stats:', err);
    }
  };

  const loadMasterConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('master_wallet_config')
        .select('*')
        .limit(1)
        .single();

      if (error && !error.message.includes('No rows')) throw error;
      setMasterConfig(data);
    } catch (err: any) {
      console.error('Error loading master config:', err);
    }
  };

  const loadSweepSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('sweep_schedules')
        .select('*')
        .order('priority', { ascending: true })
        .order('usdt_balance', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSweepSchedules(data || []);
    } catch (err: any) {
      console.error('Error loading sweep schedules:', err);
    }
  };

  const loadMasterWalletBalance = async () => {
    try {
      // This would normally call the blockchain service
      // For demo purposes, we'll use placeholder values
      setMasterWalletBalance({
        bnb: '2.456789',
        usdt: '15,234.56'
      });
    } catch (err: any) {
      console.error('Error loading master wallet balance:', err);
    }
  };

  const updateMasterConfig = async (config: Partial<MasterWalletConfig>) => {
    if (!masterConfig) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('master_wallet_config')
        .update(config)
        .eq('id', masterConfig.id);

      if (error) throw error;

      setSuccess('Master wallet configuration updated successfully');
      await loadMasterConfig();
    } catch (err: any) {
      setError(`Failed to update configuration: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerManualSweep = async () => {
    setIsLoading(true);
    try {
      // This would trigger the gas manager sweep operation
      setSuccess('Manual sweep operation initiated. Check operations log for progress.');
      
      // Refresh data after a delay
      setTimeout(() => {
        loadGasManagementData();
      }, 2000);
    } catch (err: any) {
      setError(`Failed to trigger manual sweep: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAutoSweep = async () => {
    if (!masterConfig) return;

    const newStatus = !masterConfig.auto_sweep_enabled;
    await updateMasterConfig({ auto_sweep_enabled: newStatus });
    setIsAutoSweepRunning(newStatus);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1:
        return 'bg-red-100 text-red-800';
      case 2:
        return 'bg-yellow-100 text-yellow-800';
      case 3:
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1:
        return 'High';
      case 2:
        return 'Medium';
      case 3:
        return 'Low';
      default:
        return 'Unknown';
    }
  };

  if (!mounted) {
    return null;
  }

  if (!user || !profile || profile.rank !== 'Admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">Admin access required for gas management</p>
          <Button onClick={() => router.push('/dashboard')}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-teal-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/dashboard')}
                className="text-gray-600 hover:text-orange-600 hover:bg-orange-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Gas Management System</h1>
                <p className="text-sm text-gray-600">Automated sweep operations and gas distribution</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={isAutoSweepRunning ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {isAutoSweepRunning ? 'Auto-Sweep ON' : 'Auto-Sweep OFF'}
              </Badge>
              <Button
                onClick={loadGasManagementData}
                variant="outline"
                size="sm"
                disabled={isLoading}
                className="border-blue-200 hover:bg-blue-50"
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
            <div>
              <p className="text-red-700">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError('')}
                className="text-red-600 hover:text-red-700 p-0 h-auto mt-1"
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-2">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-green-700">{success}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSuccess('')}
                className="text-green-600 hover:text-green-700 p-0 h-auto mt-1"
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {/* Master Wallet Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Master Wallet BNB</CardTitle>
              <Fuel className="w-4 h-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{masterWalletBalance.bnb} BNB</div>
              <p className="text-xs text-gray-500 mt-1">Available for gas distribution</p>
              <div className="mt-2">
                {parseFloat(masterWalletBalance.bnb) < (masterConfig?.min_bnb_reserve || 1) ? (
                  <Badge className="bg-red-100 text-red-800">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Low Balance
                  </Badge>
                ) : (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Sufficient
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Master Wallet USDT</CardTitle>
              <Coins className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">${masterWalletBalance.usdt}</div>
              <p className="text-xs text-gray-500 mt-1">Total swept funds</p>
              <div className="mt-2">
                <Badge className="bg-blue-100 text-blue-800">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Centralized
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">System Status</CardTitle>
              <Activity className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {masterConfig?.auto_sweep_enabled ? 'Active' : 'Paused'}
              </div>
              <p className="text-xs text-gray-500 mt-1">Automated operations</p>
              <div className="mt-2">
                <Button
                  onClick={toggleAutoSweep}
                  size="sm"
                  variant={masterConfig?.auto_sweep_enabled ? "destructive" : "default"}
                  className="text-xs"
                >
                  {masterConfig?.auto_sweep_enabled ? (
                    <>
                      <Pause className="w-3 h-3 mr-1" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 mr-1" />
                      Start
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gas Operation Statistics */}
        {gasStats && (
          <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
                Gas Operation Statistics (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{gasStats.total_operations}</div>
                  <div className="text-sm text-blue-700">Total Operations</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{gasStats.success_rate.toFixed(1)}%</div>
                  <div className="text-sm text-green-700">Success Rate</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">${gasStats.total_cost_usd.toFixed(2)}</div>
                  <div className="text-sm text-orange-700">Total Cost</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{gasStats.total_bnb_used.toFixed(4)}</div>
                  <div className="text-sm text-purple-700">BNB Used</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="w-5 h-5 mr-2 text-yellow-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={triggerManualSweep}
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white"
              >
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Trigger Manual Sweep
              </Button>
              <Button
                onClick={() => loadGasManagementData()}
                disabled={isLoading}
                variant="outline"
                className="border-green-200 hover:bg-green-50 text-green-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh All Data
              </Button>
              <Button
                onClick={() => {/* Export functionality */}}
                variant="outline"
                className="border-purple-200 hover:bg-purple-50 text-purple-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Operations
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Gas Operations */}
          <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="w-5 h-5 mr-2 text-blue-600" />
                Recent Gas Operations
              </CardTitle>
              <CardDescription>
                Latest gas distribution and sweep operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {gasOperations.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No operations yet</h3>
                  <p className="text-gray-600">Gas operations will appear here</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {gasOperations.map((operation) => (
                    <div key={operation.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(operation.status)}
                          <span className="font-semibold text-gray-900 capitalize">
                            {operation.operation_type}
                          </span>
                          <Badge className={getStatusColor(operation.status)}>
                            {operation.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(operation.created_at).toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-2">
                        <div>
                          <span className="font-medium">Wallets:</span> {operation.wallet_addresses.length}
                        </div>
                        <div>
                          <span className="font-medium">Cost:</span> ${operation.cost_usd.toFixed(4)}
                        </div>
                        <div>
                          <span className="font-medium">BNB:</span> {operation.bnb_amount.toFixed(6)}
                        </div>
                        <div>
                          <span className="font-medium">Gas:</span> {operation.gas_used.toLocaleString()}
                        </div>
                      </div>

                      {operation.error_message && (
                        <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                          <strong>Error:</strong> {operation.error_message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sweep Schedule */}
          <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Timer className="w-5 h-5 mr-2 text-green-600" />
                Sweep Schedule
              </CardTitle>
              <CardDescription>
                Wallets scheduled for sweeping operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sweepSchedules.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No sweeps scheduled</h3>
                  <p className="text-gray-600">Sweep schedules will appear here</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {sweepSchedules.slice(0, 10).map((schedule) => (
                    <div key={schedule.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge className={getPriorityColor(schedule.priority)}>
                            {getPriorityLabel(schedule.priority)} Priority
                          </Badge>
                          <span className="text-sm font-mono text-gray-600">
                            {schedule.wallet_address.substring(0, 10)}...
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          ${schedule.usdt_balance.toFixed(2)} USDT
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">BNB:</span> {schedule.bnb_balance.toFixed(6)}
                        </div>
                        <div>
                          <span className="font-medium">Next Sweep:</span> {new Date(schedule.next_sweep_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Master Wallet Configuration */}
        {masterConfig && (
          <Card className="bg-white/80 backdrop-blur-sm border-orange-100">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2 text-gray-600" />
                Master Wallet Configuration
              </CardTitle>
              <CardDescription>
                Configure gas distribution and sweep thresholds
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="min_bnb_reserve">Minimum BNB Reserve</Label>
                  <Input
                    id="min_bnb_reserve"
                    type="number"
                    step="0.001"
                    value={masterConfig.min_bnb_reserve}
                    onChange={(e) => setMasterConfig({
                      ...masterConfig,
                      min_bnb_reserve: parseFloat(e.target.value)
                    })}
                    className="bg-white border-orange-200 focus:border-orange-400"
                  />
                  <p className="text-xs text-gray-500">BNB to keep in master wallet</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gas_distribution_amount">Gas Distribution Amount</Label>
                  <Input
                    id="gas_distribution_amount"
                    type="number"
                    step="0.001"
                    value={masterConfig.gas_distribution_amount}
                    onChange={(e) => setMasterConfig({
                      ...masterConfig,
                      gas_distribution_amount: parseFloat(e.target.value)
                    })}
                    className="bg-white border-orange-200 focus:border-orange-400"
                  />
                  <p className="text-xs text-gray-500">BNB per wallet for gas</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_daily_operations">Max Daily Operations</Label>
                  <Input
                    id="max_daily_operations"
                    type="number"
                    value={masterConfig.max_daily_operations}
                    onChange={(e) => setMasterConfig({
                      ...masterConfig,
                      max_daily_operations: parseInt(e.target.value)
                    })}
                    className="bg-white border-orange-200 focus:border-orange-400"
                  />
                  <p className="text-xs text-gray-500">Maximum operations per day</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sweep_threshold_high">High Priority Threshold</Label>
                  <Input
                    id="sweep_threshold_high"
                    type="number"
                    step="0.01"
                    value={masterConfig.sweep_threshold_high}
                    onChange={(e) => setMasterConfig({
                      ...masterConfig,
                      sweep_threshold_high: parseFloat(e.target.value)
                    })}
                    className="bg-white border-orange-200 focus:border-orange-400"
                  />
                  <p className="text-xs text-gray-500">USDT amount for immediate sweep</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sweep_threshold_medium">Medium Priority Threshold</Label>
                  <Input
                    id="sweep_threshold_medium"
                    type="number"
                    step="0.01"
                    value={masterConfig.sweep_threshold_medium}
                    onChange={(e) => setMasterConfig({
                      ...masterConfig,
                      sweep_threshold_medium: parseFloat(e.target.value)
                    })}
                    className="bg-white border-orange-200 focus:border-orange-400"
                  />
                  <p className="text-xs text-gray-500">USDT amount for hourly sweep</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sweep_threshold_low">Low Priority Threshold</Label>
                  <Input
                    id="sweep_threshold_low"
                    type="number"
                    step="0.01"
                    value={masterConfig.sweep_threshold_low}
                    onChange={(e) => setMasterConfig({
                      ...masterConfig,
                      sweep_threshold_low: parseFloat(e.target.value)
                    })}
                    className="bg-white border-orange-200 focus:border-orange-400"
                  />
                  <p className="text-xs text-gray-500">USDT amount for daily sweep</p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => updateMasterConfig(masterConfig)}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-orange-400 to-teal-500 hover:from-orange-500 hover:to-teal-600 text-white"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </div>
                  ) : (
                    'Save Configuration'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* System Information */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-900">
              <Info className="w-5 h-5 mr-2" />
              Gas Management System Information
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 text-sm space-y-2">
            <p>• <strong>Automated Sweeping:</strong> Monitors all user wallets and automatically sweeps USDT to master wallet</p>
            <p>• <strong>Gas Distribution:</strong> Distributes BNB to user wallets for sweep transaction fees</p>
            <p>• <strong>Priority System:</strong> High ($100+), Medium ($20-100), Low ($5-20) priority sweeping</p>
            <p>• <strong>Cost Optimization:</strong> Adjusts thresholds based on network gas prices</p>
            <p>• <strong>Centralized Management:</strong> All funds collected in master wallet for efficient distribution</p>
            <p>• <strong>Real-time Monitoring:</strong> Tracks all operations with detailed logging and statistics</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}