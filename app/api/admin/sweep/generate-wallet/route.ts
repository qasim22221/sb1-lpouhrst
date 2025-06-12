import { NextResponse } from 'next/server';
import { generateUserWallet } from '@/lib/sweepService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }

    console.log(`🔐 Generating wallet for user: ${userId}`);

    const result = await generateUserWallet(userId);

    return NextResponse.json({
      success: true,
      data: {
        address: result.address,
        message: 'Wallet generated successfully'
      }
    });

  } catch (error: any) {
    console.error('❌ Wallet generation error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Wallet generation failed'
    }, { status: 500 });
  }
}