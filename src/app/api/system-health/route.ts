import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDemoUser, unknownApiError } from '@/lib/api';

export async function GET(request: Request) {
  try {
    await getDemoUser(request);
    let database: 'Healthy' | 'Failed' = 'Healthy';
    try { await prisma.$queryRaw`SELECT 1`; } catch { database = 'Failed'; }
    return NextResponse.json({ data: { database, aiService: process.env.GEMINI_API_KEY ? 'Healthy' : 'Degraded', pharmacyIntegration: 'Simulated', providerNotification: 'Simulated', patientNotification: 'Simulated', insuranceIntegration: 'Simulated' } });
  } catch (error) {
    console.error('GET /api/system-health failed', error instanceof Error ? error.message : 'unknown error');
    return unknownApiError();
  }
}
