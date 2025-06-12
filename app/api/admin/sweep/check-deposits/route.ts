import { NextResponse } from 'next/server';
import { scanAndProcessDeposits } from '@/lib/sweepService';

export async function POST(request: Request) {
  try {
    console.log('🚀 Admin deposit scan initiated');
    
    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { walletAddress } = body;

    // Run deposit scan
    const result = await scanAndProcessDeposits(walletAddress);

    console.log('✅ Deposit scan completed:', result);

    return NextResponse.json({
      success: true,
      data: result,
      message: `Scan completed: ${result.newDeposits} new deposits from ${result.totalScanned} wallets`
    });

  } catch (error: any) {
    console.error('❌ Admin deposit scan error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Deposit scan failed',
      data: {
        newDeposits: 0,
        totalScanned: 0,
        errors: [error.message]
      }
    }, { status: 500 });
  }
}

// GET endpoint for scheduled scans
export async function GET() {
  try {
    console.log('🔄 Scheduled deposit scan running...');
    
    const result = await scanAndProcessDeposits();
    
    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Scheduled deposit scan error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}