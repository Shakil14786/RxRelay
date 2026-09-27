import { NextResponse } from 'next/server';
import { AuditAction } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { apiError, getDemoUser, unknownApiError } from '@/lib/api';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await getDemoUser(request);
    const { id } = await context.params;
    const refill = await prisma.refillRequest.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        patient: true,
        medication: true,
        pharmacy: true,
        provider: true,
        tasks: { include: { assignee: true }, orderBy: { createdAt: 'desc' } },
        communications: { orderBy: { createdAt: 'asc' }, include: { sender: true } },
        auditLogs: { orderBy: { createdAt: 'asc' }, include: { user: true } },
      },
    });
    if (!refill) return apiError('Refill not found.', 404);
    const timeline = refill.auditLogs.map(event => event.action === AuditAction.COMMUNICATION ? { ...event, previousState: refill.state, newState: refill.state } : event);
    return NextResponse.json({ data: { ...refill, auditLogs: timeline }, viewer: user });
  } catch (error) {
    console.error('GET /api/refills/[id] failed', error instanceof Error ? error.message : 'unknown error');
    return unknownApiError();
  }
}
