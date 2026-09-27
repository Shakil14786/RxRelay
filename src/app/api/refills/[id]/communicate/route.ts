import { NextResponse } from 'next/server';
import { AuditAction, CommunicationChannel } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiError, getDemoUser, unknownApiError } from '@/lib/api';
import { hasPermission } from '@/lib/permissions';
import { notifyPatient, notifyPharmacy, notifyProvider } from '@/lib/integrations/mock';

const bodySchema = z.object({ type: z.enum(['PROVIDER', 'PHARMACY', 'PATIENT']), message: z.string().trim().min(3).max(500), forceFailure: z.boolean().optional().default(false) });
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await getDemoUser(request);
    const { id } = await context.params;
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return apiError('A valid simulated communication type and message are required.', 400);
    const permission = parsed.data.type === 'PROVIDER' ? 'notify_provider' : parsed.data.type === 'PHARMACY' ? 'notify_pharmacy' : 'notify_patient';
    if (!hasPermission(actor.role, permission)) return apiError('Your demo role is not authorized to send this communication.', 403);

    const refill = await prisma.refillRequest.findFirst({ where: { id, organizationId: actor.organizationId }, include: { provider: true, pharmacy: true, patient: true } });
    if (!refill) return apiError('Refill not found.', 404);
    const target = parsed.data.type === 'PROVIDER' ? { name: refill.provider.name, role: 'PROVIDER', channel: CommunicationChannel.MOCK_API, result: notifyProvider({ refillId: id, forceFailure: parsed.data.forceFailure }) } : parsed.data.type === 'PHARMACY' ? { name: refill.pharmacy.name, role: 'PHARMACY_STAFF', channel: CommunicationChannel.MOCK_API, result: notifyPharmacy({ refillId: id, forceFailure: parsed.data.forceFailure }) } : { name: refill.patient.displayName, role: 'PATIENT', channel: CommunicationChannel.MOCK_API, result: notifyPatient({ refillId: id, forceFailure: parsed.data.forceFailure }) };

    const communication = await prisma.$transaction(async tx => {
      const created = await tx.communication.create({ data: { refillId: id, senderId: actor.id, channel: target.channel, recipient: target.name, recipientRole: target.role, message: parsed.data.message, integration: target.result.integration, succeeded: target.result.succeeded, errorMessage: target.result.errorMessage, attemptCount: 1 } });
      await tx.auditLog.create({ data: { refillId: id, userId: actor.id, action: AuditAction.COMMUNICATION, reason: target.result.succeeded ? `Simulated ${parsed.data.type.toLowerCase()} notification succeeded.` : `Simulated ${parsed.data.type.toLowerCase()} notification failed.`, metadata: { integration: target.result.integration, succeeded: target.result.succeeded, recipientRole: target.role } } });
      return created;
    });
    return NextResponse.json({ data: communication, result: target.result }, { status: target.result.succeeded ? 200 : 502 });
  } catch (error) {
    console.error('POST /api/refills/[id]/communicate failed', error instanceof Error ? error.message : 'unknown error');
    return unknownApiError();
  }
}
