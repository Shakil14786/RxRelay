import { NextResponse } from 'next/server';
import { z } from 'zod';
import { RefillState } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { apiError, getDemoUser, unknownApiError } from '@/lib/api';
import { formatWorkflowError, transitionRefill } from '@/lib/workflow';

const bodySchema = z.object({ targetState: z.nativeEnum(RefillState), reason: z.string().trim().min(3).max(500) });
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await getDemoUser(request);
    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return apiError('A valid target state and reason are required.', 400);

    const refill = await prisma.refillRequest.findFirst({ where: { id, organizationId: user.organizationId }, select: { id: true } });
    if (!refill) return apiError('Refill not found.', 404);
    const updated = await transitionRefill({ refillId: id, newState: parsed.data.targetState, userId: user.id, reason: parsed.data.reason });
    return NextResponse.json({ data: updated });
  } catch (error) {
    const workflowError = formatWorkflowError(error);
    if (workflowError.status !== 500) return apiError(workflowError.message, workflowError.status);
    console.error('POST /api/refills/[id]/transition failed', error instanceof Error ? error.message : 'unknown error');
    return unknownApiError();
  }
}
