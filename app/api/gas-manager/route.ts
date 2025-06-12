import { NextRequest, NextResponse } from 'next/server';
import { gasManagerService } from '@/lib/gasManagerService';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'status':
        return NextResponse.json({
          initialized: gasManagerService.isInitialized(),
          timestamp: new Date().toISOString(),
        });

      case 'stats':
        const days = parseInt(searchParams.get('days') || '7');
        const stats = await gasManagerService.getGasStats(days);
        return NextResponse.json(stats);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Gas Manager API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, walletAddress } = body;

    switch (action) {
      case 'start':
        const startResult = await gasManagerService.startAutomatedSweeping();
        return NextResponse.json({ success: startResult });

      case 'stop':
        const stopResult = await gasManagerService.stopAutomatedSweeping();
        return NextResponse.json({ success: stopResult });

      case 'manual-sweep':
        const manualResult = await gasManagerService.triggerManualSweep();
        return NextResponse.json({ success: manualResult });

      case 'emergency-sweep':
        if (!walletAddress) {
          return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
        }
        const emergencyResult = await gasManagerService.emergencySweep(walletAddress);
        return NextResponse.json({ success: emergencyResult });

      case 'initialize':
        const initResult = await gasManagerService.initialize();
        return NextResponse.json({ success: initResult });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Gas Manager API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}