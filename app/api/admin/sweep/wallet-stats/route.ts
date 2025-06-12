import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('📊 Fetching wallet statistics...');

    // Get wallet statistics
    const [
      { data: totalWallets, error: walletsError },
      { data: totalDeposits, error: depositsError },
      { data: pendingWithdrawals, error: withdrawalsError },
      { data: recentDeposits, error: recentError }
    ] = await Promise.all([
      // Total wallets
      supabase
        .from('user_wallets')
        .select('id', { count: 'exact', head: true }),
      
      // Total deposits
      supabase
        .from('deposits')
        .select('amount')
        .eq('status', 'swept'),
      
      // Pending withdrawals
      supabase
        .from('withdrawals')
        .select('amount')
        .eq('status', 'pending'),
      
      // Recent deposits (last 24 hours)
      supabase
        .from('deposits')
        .select('amount, created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .eq('status', 'swept')
    ]);

    if (walletsError || depositsError || withdrawalsError || recentError) {
      throw new Error('Failed to fetch statistics');
    }

    // Calculate totals
    const totalDepositAmount = (totalDeposits || []).reduce((sum, d) => sum + parseFloat(d.amount), 0);
    const pendingWithdrawalAmount = (pendingWithdrawals || []).reduce((sum, w) => sum + parseFloat(w.amount), 0);
    const recentDepositAmount = (recentDeposits || []).reduce((sum, d) => sum + parseFloat(d.amount), 0);

    const stats = {
      totalWallets: totalWallets?.length || 0,
      totalDeposits: totalDeposits?.length || 0,
      totalDepositAmount: totalDepositAmount,
      pendingWithdrawals: pendingWithdrawals?.length || 0,
      pendingWithdrawalAmount: pendingWithdrawalAmount,
      recentDeposits: recentDeposits?.length || 0,
      recentDepositAmount: recentDepositAmount,
      lastUpdate: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error: any) {
    console.error('❌ Failed to fetch wallet statistics:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch statistics',
      data: {
        totalWallets: 0,
        totalDeposits: 0,
        totalDepositAmount: 0,
        pendingWithdrawals: 0,
        pendingWithdrawalAmount: 0,
        recentDeposits: 0,
        recentDepositAmount: 0,
        lastUpdate: new Date().toISOString()
      }
    }, { status: 500 });
  }
}