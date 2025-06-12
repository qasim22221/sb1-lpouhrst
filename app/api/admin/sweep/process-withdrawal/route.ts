import { NextResponse } from 'next/server';
import { processWithdrawal, getPendingWithdrawals } from '@/lib/sweepService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { withdrawalId, toAddress, amount, userId } = body;

    if (!withdrawalId || !toAddress || !amount || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 });
    }

    console.log(`💸 Processing withdrawal request: ${withdrawalId}`);

    const result = await processWithdrawal(withdrawalId, toAddress, amount, userId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          txHash: result.txHash,
          message: 'Withdrawal processed successfully'
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Withdrawal processing failed'
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('❌ Withdrawal processing error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Withdrawal processing failed'
    }, { status: 500 });
  }
}

// GET endpoint to fetch pending withdrawals
export async function GET() {
  try {
    console.log('📋 Fetching pending withdrawals...');
    
    const withdrawals = await getPendingWithdrawals();
    
    return NextResponse.json({
      success: true,
      data: withdrawals
    });

  } catch (error: any) {
    console.error('❌ Failed to fetch pending withdrawals:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch pending withdrawals',
      data: []
    }, { status: 500 });
  }
}