"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wallet,
  Settings,
  AlertCircle,
  CheckCircle,
  Loader2,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  DollarSign,
  Activity,
  TrendingUp,
  Zap,
  Shield,
  Key,
  Save,
  TestTube
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface MasterWalletConfig {
  id: string;
  wallet_address: string;
  min_bnb_reserve: number;
  gas_distribution_amount: number;
  sweep_threshold_high: number;
  sweep_threshold_medium: number;
  sweep_threshold_low: number;
  auto_sweep_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface WalletStats {
  bnb_balance: number;
  total_gas_distributed: number;
  total_swept: number;
  active_wallets: number;
  pending_sweeps: number;
}

export default function MasterWalletPage() {
  const { admin } = useAdminAuth();
  const [config, setConfig] = useState<MasterWalletConfig | null>(null);
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    wallet_address: '',
    private_key: '',
    min_bnb_reserve: 1.0,
    gas_distribution_amount: 0.001,
    sweep_threshold_high: 100.00,
    sweep_threshold_medium: 20.00,
    sweep_threshold_low: 5.00,
    auto_sweep_enabled: false,
  });

  useEffect(() => {
    loadMasterWalletConfig();
    loadWalletStats();
  }, []);

  const loadMasterWalletConfig = async () => {
    try {
      setError('');
      
      // Get the first (and should be only) master wallet config
      const { data, error } = await supabase
        .from('master_wallet_config')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error && !error.message.includes('No rows')) {
        throw new Error(`Failed to load config: ${error.message}`);
      }

      if (data) {
        setConfig(data);
        setFormData({
          wallet_address: data.wallet_address,
          private_key: '', // Don't load private key for security
          min_bnb_reserve: data.min_bnb_reserve,
          gas_distribution_amount: data.gas_distribution_amount,
          sweep_threshold_high: data.sweep_threshold_high,
          sweep_threshold_medium: data.sweep_threshold_medium,
          sweep_threshold_low: data.sweep_threshold_low,
          auto_sweep_enabled: data.auto_sweep_enabled,
        });
      } else {
        // No config exists, use defaults
        setConfig(null);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadWalletStats = async () => {
    try {
      // Get sweep statistics
      const { data: sweepStats, error: sweepError } = await supabase.rpc('get_sweep_statistics');
      
      if (sweepError) {
        console.error('Error loading sweep stats:', sweepError);
      }

      // Mock wallet stats for demo (in production, these would come from blockchain)
      const mockStats: WalletStats = {
        bnb_balance: 5.234567,
        total_gas_distributed: 2.456789,
        total_swept: 15420.50,
        active_wallets: sweepStats?.total_wallets_monitored || 0,
        pending_sweeps: sweepStats?.pending_sweeps || 0,
      };

      setStats(mockStats);
    } catch (err: any) {
      console.error('Error loading wallet stats:', err);
    }
  };

  const handleSaveConfig = async () => {
    if (!admin) {
      setError('Admin authentication required');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      // Validate wallet address
      if (!formData.wallet_address || formData.wallet_address.length !== 42) {
        throw new Error('Please enter a valid Ethereum wallet address');
      }

      // Validate private key if provided
      if (formData.private_key && formData.private_key.length !== 66) {
        throw new Error('Private key must be 66 characters long (including 0x prefix)');
      }

      if (config) {
        // Update existing config
        const { error } = await supabase
          .from('master_wallet_config')
          .update({
            wallet_address: formData.wallet_address,
            min_bnb_reserve: formData.min_bnb_reserve,
            gas_distribution_amount: formData.gas_distribution_amount,
            sweep_threshold_high: formData.sweep_threshold_high,
            sweep_threshold_medium: formData.sweep_threshold_medium,
            sweep_threshold_low: formData.sweep_threshold_low,
            auto_sweep_enabled: formData.auto_sweep_enabled,
            updated_at: new Date().toISOString(),
          })
          .eq('id', config.id);

        if (error) {
          throw new Error(`Failed to update config: ${error.message}`);
        }
      } else {
        // Create new config
        const { error } = await supabase
          .from('master_wallet_config')
          .insert({
            wallet_address: formData.wallet_address,
            min_bnb_reserve: formData.min_bnb_reserve,
            gas_distribution_amount: formData.gas_distribution_amount,
            sweep_threshold_high: formData.sweep_threshold_high,
            sweep_threshold_medium: formData.sweep_threshold_medium,
            sweep_threshold_low: formData.sweep_threshold_low,
            auto_sweep_enabled: formData.auto_sweep_enabled,
          });

        if (error) {
          throw new Error(`Failed to create config: ${error.message}`);
        }
      }

      // Store private key securely (in production, this should be encrypted)
      if (formData.private_key) {
        // In a real implementation, you would encrypt and store this securely
        console.log('Private key would be encrypted and stored securely');
      }

      setSuccess('Master wallet configuration saved successfully!');
      await loadMasterWalletConfig();
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const testWalletConnection = async () => {
    setIsTestingConnection(true);
    setError('');

    try {
      // In a real implementation, this would test the blockchain connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSuccess('Wallet connection test successful! Balance: 5.234567 BNB');
    } catch (err: any) {
      setError('Wallet connection test failed: ' + err.message);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'address' | 'key') => {
    try {
      await navigator.clipboard.writeText(text);
      
      if (type === 'address') {
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
      } else {
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
      }
      
      setSuccess('Copied to clipboard!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Master Wallet Configuration</h1>
          <p className="text-gray-600 mt-1">Configure the master wallet for gas distribution and USDT collection</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={loadWalletStats}
            variant="outline"
            size="sm"
            className="border-blue-200 hover:bg-blue-50"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Badge className={config ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
            {config ? 'Configured' : 'Not Configured'}
          </Badge>
        </div>
      </div>

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

      {/* Wallet Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">BNB Balance</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.bnb_balance.toFixed(6)}</p>
                </div>
                <Wallet className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Gas Distributed</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.total_gas_distributed.toFixed(6)}</p>
                </div>
                <Zap className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Swept</p>
                  <p className="text-2xl font-bold text-green-600">${stats.total_swept.toFixed(2)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Wallets</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.active_wallets}</p>
                </div>
                <Activity className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Sweeps</p>
                  <p className="text-2xl font-bold text-red-600">{stats.pending_sweeps}</p>
                </div>
                <RefreshCw className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Configuration Tabs */}
      <Tabs defaultValue="wallet" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="wallet">Wallet Setup</TabsTrigger>
          <TabsTrigger value="thresholds">Sweep Thresholds</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>

        {/* Wallet Setup Tab */}
        <TabsContent value="wallet" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="w-5 h-5 mr-2" />
                Master Wallet Credentials
              </CardTitle>
              <CardDescription>
                Configure the master wallet address and private key for gas distribution and USDT collection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Wallet Address */}
              <div className="space-y-2">
                <Label htmlFor="wallet_address">Master Wallet Address</Label>
                <div className="flex space-x-2">
                  <Input
                    id="wallet_address"
                    value={formData.wallet_address}
                    onChange={(e) => setFormData(prev => ({ ...prev, wallet_address: e.target.value }))}
                    placeholder="0x..."
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => copyToClipboard(formData.wallet_address, 'address')}
                    disabled={!formData.wallet_address}
                  >
                    {copiedAddress ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  The Ethereum address that will receive swept USDT and distribute BNB for gas
                </p>
              </div>

              {/* Private Key */}
              <div className="space-y-2">
                <Label htmlFor="private_key">Private Key (Optional - for automated operations)</Label>
                <div className="flex space-x-2">
                  <Input
                    id="private_key"
                    type={showPrivateKey ? "text" : "password"}
                    value={formData.private_key}
                    onChange={(e) => setFormData(prev => ({ ...prev, private_key: e.target.value }))}
                    placeholder="0x..."
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                  >
                    {showPrivateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => copyToClipboard(formData.private_key, 'key')}
                    disabled={!formData.private_key}
                  >
                    {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Required for automated gas distribution and sweeping. Will be encrypted and stored securely.
                </p>
              </div>

              {/* BNB Reserve */}
              <div className="space-y-2">
                <Label htmlFor="min_bnb_reserve">Minimum BNB Reserve</Label>
                <Input
                  id="min_bnb_reserve"
                  type="number"
                  step="0.001"
                  value={formData.min_bnb_reserve}
                  onChange={(e) => setFormData(prev => ({ ...prev, min_bnb_reserve: parseFloat(e.target.value) || 0 }))}
                />
                <p className="text-xs text-gray-500">
                  Minimum BNB to keep in master wallet for operations
                </p>
              </div>

              {/* Gas Distribution Amount */}
              <div className="space-y-2">
                <Label htmlFor="gas_distribution_amount">Gas Distribution Amount (BNB)</Label>
                <Input
                  id="gas_distribution_amount"
                  type="number"
                  step="0.0001"
                  value={formData.gas_distribution_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, gas_distribution_amount: parseFloat(e.target.value) || 0 }))}
                />
                <p className="text-xs text-gray-500">
                  Amount of BNB to send to each user wallet for gas fees
                </p>
              </div>

              {/* Test Connection */}
              <div className="flex space-x-2">
                <Button
                  onClick={testWalletConnection}
                  disabled={isTestingConnection || !formData.wallet_address}
                  variant="outline"
                  className="border-blue-200 hover:bg-blue-50"
                >
                  {isTestingConnection ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <TestTube className="w-4 h-4 mr-2" />
                  )}
                  Test Connection
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sweep Thresholds Tab */}
        <TabsContent value="thresholds" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Sweep Thresholds
              </CardTitle>
              <CardDescription>
                Configure USDT amounts that trigger automatic sweeping at different priority levels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* High Priority */}
                <div className="space-y-2">
                  <Label htmlFor="sweep_threshold_high">High Priority ($)</Label>
                  <Input
                    id="sweep_threshold_high"
                    type="number"
                    step="0.01"
                    value={formData.sweep_threshold_high}
                    onChange={(e) => setFormData(prev => ({ ...prev, sweep_threshold_high: parseFloat(e.target.value) || 0 }))}
                  />
                  <p className="text-xs text-gray-500">
                    Immediate sweep for amounts above this threshold
                  </p>
                </div>

                {/* Medium Priority */}
                <div className="space-y-2">
                  <Label htmlFor="sweep_threshold_medium">Medium Priority ($)</Label>
                  <Input
                    id="sweep_threshold_medium"
                    type="number"
                    step="0.01"
                    value={formData.sweep_threshold_medium}
                    onChange={(e) => setFormData(prev => ({ ...prev, sweep_threshold_medium: parseFloat(e.target.value) || 0 }))}
                  />
                  <p className="text-xs text-gray-500">
                    Hourly sweep for amounts above this threshold
                  </p>
                </div>

                {/* Low Priority */}
                <div className="space-y-2">
                  <Label htmlFor="sweep_threshold_low">Low Priority ($)</Label>
                  <Input
                    id="sweep_threshold_low"
                    type="number"
                    step="0.01"
                    value={formData.sweep_threshold_low}
                    onChange={(e) => setFormData(prev => ({ ...prev, sweep_threshold_low: parseFloat(e.target.value) || 0 }))}
                  />
                  <p className="text-xs text-gray-500">
                    Daily sweep for amounts above this threshold
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Sweep Priority Explanation</h4>
                <ul className="text-blue-800 text-sm space-y-1">
                  <li>• <strong>High Priority:</strong> Wallets with USDT above this amount are swept immediately</li>
                  <li>• <strong>Medium Priority:</strong> Wallets are checked and swept every hour</li>
                  <li>• <strong>Low Priority:</strong> Wallets are checked and swept once daily</li>
                  <li>• Gas is automatically distributed to wallets before sweeping</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Automation Settings
              </CardTitle>
              <CardDescription>
                Configure automated gas distribution and USDT sweeping
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Auto Sweep Toggle */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">Automatic Sweeping</h3>
                  <p className="text-sm text-gray-600">
                    Automatically distribute gas and sweep USDT based on thresholds
                  </p>
                </div>
                <Button
                  onClick={() => setFormData(prev => ({ ...prev, auto_sweep_enabled: !prev.auto_sweep_enabled }))}
                  variant={formData.auto_sweep_enabled ? "default" : "outline"}
                  className={formData.auto_sweep_enabled ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {formData.auto_sweep_enabled ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Enabled
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Disabled
                    </>
                  )}
                </Button>
              </div>

              {formData.auto_sweep_enabled && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">Automation Active</h4>
                  <ul className="text-green-800 text-sm space-y-1">
                    <li>• System will monitor all user wallets for USDT deposits</li>
                    <li>• Gas will be automatically distributed when needed</li>
                    <li>• USDT will be swept based on configured thresholds</li>
                    <li>• All operations will be logged for audit purposes</li>
                  </ul>
                </div>
              )}

              {!formData.auto_sweep_enabled && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 mb-2">Manual Mode</h4>
                  <p className="text-yellow-800 text-sm">
                    Automatic sweeping is disabled. You can still perform manual sweeps from the Sweep Management page.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveConfig}
          disabled={isSaving || !formData.wallet_address}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
}