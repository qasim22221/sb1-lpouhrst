import { NextResponse } from 'next/server';
import { getHotWalletStatus } from '@/lib/sweepService';

export async function GET() {
  try {
    console.log('🔍 Fetching hot wallet status...');
    
    const status = await getHotWalletStatus();
    
    return NextResponse.json({
      success: true,
      data: status
    });

  } catch (error: any) {
    console.error('❌ Hot wallet status error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get hot wallet status',
      data: {
        address: '',
        bnbBalance: '0',
        usdtBalance: '0',
        isConnected: false,
        lastUpdate: new Date().toISOString()
      }
    }, { status: 500 });
  }
}