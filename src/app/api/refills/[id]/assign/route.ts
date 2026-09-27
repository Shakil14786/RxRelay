import { NextResponse } from 'next/server';
import { AuditAction, TaskStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiError, getDemoUser, unknownApiError } from '@/lib/api';
import { hasPermission } from '@/lib/permissions';

type RouteContext = { params: Promise<{ id: string }> };
const bodySchema = z.object({ userId: z.string().cuid() });

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await getDemoUser(request);
    if (!hasPermission(actor.role, 'assign_task')) return apiError('You are not authorized to assign refill work.', 403);
    const { id } = await context.params;
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return apiError('A valid assignee is required.', 400);

    const refill = await prisma.refillRequest.findFirst({ where: { id, organizationId: actor.organizationId }, select: { id: true, state: true } });
    if (!refill) return apiError('Refill not found.', 404);
    const assignee = await prisma.user.findFirst({ where: { id: parsed.data.userId, organizationId: actor.organizationId }, select: { id: true, name: true } });
    if (!assignee) return apiError('Assignee not found in this organization.', 404);

    const task = await prisma.$transaction(async (tx) => {
      await tx.workflowTask.updateMany({ where: { refillId: id, status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] } }, data: { status: TaskStatus.CANCELLED } });
      const created = await tx.workflowTask.create({ data: { refillId: id, assigneeId: assignee.id, title: 'Resolve refill workflow', status: TaskStatus.OPEN } });
      await tx.auditLog.create({ data: { refillId: id, userId: actor.id, action: AuditAction.ASSIGNMENT, reason: `Assigned refill to ${assignee.name}.`, metadata: { assigneeId: assignee.id } } });
      return created;
    });
    return NextResponse.json({ data: task });
  } catch (error) {
    console.error('POST /api/refills/[id]/assign failed', error instanceof Error ? error.message : 'unknown error');
    return unknownApiError();
  }
}
