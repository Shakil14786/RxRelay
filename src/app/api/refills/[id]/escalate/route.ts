import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiError, getDemoUser, unknownApiError } from '@/lib/api';
import { formatWorkflowError, transitionRefill } from '@/lib/workflow';

const bodySchema = z.object({ reason: z.string().trim().min(3).max(500) });
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await getDemoUser(request);
    const { id } = await context.params;
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return apiError('An escalation reason is required.', 400);
    const refill = await prisma.refillRequest.findFirst({ where: { id, organizationId: actor.organizationId }, select: { id: true } });
    if (!refill) return apiError('Refill not found.', 404);
    const updated = await transitionRefill({ refillId: id, newState: 'ESCALATED', userId: actor.id, reason: parsed.data.reason });
    return NextResponse.json({ data: updated });
  } catch (error) {
    const workflowError = formatWorkflowError(error);
    if (workflowError.status !== 500) return apiError(workflowError.message, workflowError.status);
    console.error('POST /api/refills/[id]/escalate failed', error instanceof Error ? error.message : 'unknown error');
    return unknownApiError();
  }
}
