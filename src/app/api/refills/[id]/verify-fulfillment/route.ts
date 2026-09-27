import { NextResponse } from 'next/server';
import { AuditAction, RefillState } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiError, getDemoUser, unknownApiError } from '@/lib/api';
import { formatWorkflowError, verifyFulfillmentAndResolve } from '@/lib/workflow';
import { fulfillPharmacy } from '@/lib/integrations/mock';
import { canRoleTransition } from '@/lib/permissions';

const bodySchema = z.object({ reason: z.string().trim().min(3).max(500), forceFailure: z.boolean().optional().default(false) });
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await getDemoUser(request);
    const { id } = await context.params;
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return apiError('A verification reason is required.', 400);

    const refill = await prisma.refillRequest.findFirst({
      where: { id, organizationId: actor.organizationId },
      select: { id: true, state: true },
    });
    if (!refill) return apiError('Refill not found.', 404);
    if (refill.state !== RefillState.PHARMACY_PROCESSING) {
      return apiError('Fulfillment can only be verified while pharmacy processing is in progress.', 409);
    }
    if (!canRoleTransition(actor.role, refill.state, RefillState.RESOLVED)) {
      return apiError('Your demo role is not authorized to verify pharmacy fulfillment.', 403);
    }

    const result = fulfillPharmacy({ refillId: id, forceFailure: parsed.data.forceFailure });
    if (!result.succeeded) {
      await prisma.$transaction(async tx => {
        await tx.auditLog.create({
          data: {
            refillId: id,
            userId: actor.id,
            action: AuditAction.VERIFICATION,
            reason: 'Simulated pharmacy fulfillment could not be verified.',
            metadata: { verification: 'PHARMACY_FULFILLMENT', result: 'FAILED', error: result.errorMessage ?? null },
          },
        });
      });
      return NextResponse.json({ error: result.message, result }, { status: 502 });
    }

    const data = await verifyFulfillmentAndResolve(
      id,
      actor.id,
      `${parsed.data.reason} ${result.message}`,
    );
    return NextResponse.json({ data, result });
  } catch (error) {
    const workflowError = formatWorkflowError(error);
    if (workflowError.status !== 500) return apiError(workflowError.message, workflowError.status);
    console.error('POST /api/refills/[id]/verify-fulfillment failed', error instanceof Error ? error.message : 'unknown error');
    return unknownApiError();
  }
}
