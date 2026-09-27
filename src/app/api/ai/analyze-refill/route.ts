import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, getDemoUser, unknownApiError } from '@/lib/api';
import { analyzeAndStoreRefill } from '@/lib/ai/service';

const bodySchema = z.object({ refillId: z.string().cuid() });

export async function POST(request: Request) {
  try {
    const user = await getDemoUser(request);
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return apiError('A valid refill ID is required.', 400);
    const result = await analyzeAndStoreRefill(parsed.data.refillId, user.id, user.organizationId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'REFILL_NOT_FOUND') return apiError('Refill not found.', 404);
    console.error('POST /api/ai/analyze-refill failed', error instanceof Error ? error.message : 'unknown error');
    return unknownApiError();
  }
}
