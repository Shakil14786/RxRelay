import { AuditAction, Prisma, RefillState, UserRole } from '@prisma/client';
import { prisma } from './prisma';
import { transitionRefillSchema, type TransitionRefillInput } from './validation';
import { canRoleTransition } from './permissions';

export const ALLOWED_TRANSITIONS: Record<RefillState, readonly RefillState[]> = {
  NEW: [RefillState.PHARMACY_REVIEW, RefillState.CANCELLED],
  PHARMACY_REVIEW: [RefillState.BLOCKED, RefillState.CANCELLED],
  BLOCKED: [RefillState.MISSING_INFORMATION, RefillState.AWAITING_PROVIDER, RefillState.AWAITING_INSURANCE, RefillState.ESCALATED],
  MISSING_INFORMATION: [RefillState.ACTION_REQUIRED, RefillState.ESCALATED, RefillState.CANCELLED],
  AWAITING_PROVIDER: [RefillState.ACTION_REQUIRED, RefillState.ESCALATED, RefillState.CANCELLED],
  AWAITING_PATIENT: [RefillState.ACTION_REQUIRED, RefillState.ESCALATED, RefillState.CANCELLED],
  AWAITING_INSURANCE: [RefillState.ACTION_REQUIRED, RefillState.ESCALATED, RefillState.CANCELLED],
  ACTION_REQUIRED: [RefillState.IN_REVIEW, RefillState.ESCALATED, RefillState.CANCELLED],
  IN_REVIEW: [RefillState.APPROVAL_RECEIVED, RefillState.ESCALATED, RefillState.CANCELLED],
  APPROVAL_RECEIVED: [RefillState.PHARMACY_PROCESSING, RefillState.ESCALATED],
  PHARMACY_PROCESSING: [RefillState.RESOLVED, RefillState.ESCALATED],
  RESOLVED: [],
  ESCALATED: [RefillState.ACTION_REQUIRED, RefillState.CANCELLED],
  CANCELLED: [],
};

export class WorkflowError extends Error {
  constructor(message: string, public readonly code: 'NOT_FOUND' | 'INVALID_TRANSITION' | 'FORBIDDEN' | 'VALIDATION_ERROR') {
    super(message);
    this.name = 'WorkflowError';
  }
}

export function getAllowedTransitions(state: RefillState): readonly RefillState[] {
  return ALLOWED_TRANSITIONS[state] ?? [];
}

export function canTransition(from: RefillState, to: RefillState): boolean {
  return getAllowedTransitions(from).includes(to);
}

export async function getCurrentState(refillId: string): Promise<RefillState> {
  const refill = await prisma.refillRequest.findUnique({ where: { id: refillId }, select: { state: true } });
  if (!refill) throw new WorkflowError(`Refill ${refillId} was not found.`, 'NOT_FOUND');
  return refill.state;
}

export async function transitionRefill(input: TransitionRefillInput) {
  const parsed = transitionRefillSchema.safeParse(input);
  if (!parsed.success) throw new WorkflowError('Invalid transition input.', 'VALIDATION_ERROR');

  const { refillId, newState, userId, reason } = parsed.data;
  if (newState === RefillState.RESOLVED) {
    throw new WorkflowError('Use the fulfillment verification action to resolve this refill.', 'INVALID_TRANSITION');
  }

  return prisma.$transaction(async (tx) => {
    const refill = await tx.refillRequest.findUnique({ where: { id: refillId }, select: { id: true, state: true } });
    if (!refill) throw new WorkflowError(`Refill ${refillId} was not found.`, 'NOT_FOUND');

    const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
    if (!user) throw new WorkflowError(`User ${userId} was not found.`, 'NOT_FOUND');
    if (!canTransition(refill.state, newState)) throw new WorkflowError(`Cannot transition refill from ${refill.state} to ${newState}.`, 'INVALID_TRANSITION');
    if (!canRoleTransition(user.role, refill.state, newState)) throw new WorkflowError(`Role ${user.role} cannot perform transition to ${newState}.`, 'FORBIDDEN');

    const updateResult = await tx.refillRequest.updateMany({
      where: { id: refillId, state: refill.state },
      data: { state: newState },
    });
    if (updateResult.count !== 1) throw new WorkflowError('The refill changed before the requested transition could be applied.', 'INVALID_TRANSITION');
    const updated = await tx.refillRequest.findUniqueOrThrow({ where: { id: refillId } });
    await tx.auditLog.create({ data: { refillId, userId, action: AuditAction.STATE_TRANSITION, previousState: refill.state, newState, reason, metadata: { humanApproved: true } satisfies Prisma.InputJsonValue } });
    return updated;
  });
}

export async function verifyFulfillmentAndResolve(refillId: string, userId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const refill = await tx.refillRequest.findUnique({ where: { id: refillId }, select: { id: true, state: true } });
    if (!refill) throw new WorkflowError(`Refill ${refillId} was not found.`, 'NOT_FOUND');

    const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
    if (!user) throw new WorkflowError(`User ${userId} was not found.`, 'NOT_FOUND');
    if (!canTransition(refill.state, RefillState.RESOLVED)) {
      throw new WorkflowError(`Cannot resolve refill from ${refill.state}.`, 'INVALID_TRANSITION');
    }
    if (!canRoleTransition(user.role, refill.state, RefillState.RESOLVED)) {
      throw new WorkflowError(`Role ${user.role} cannot resolve this refill.`, 'FORBIDDEN');
    }

    const updated = await tx.refillRequest.updateMany({
      where: { id: refillId, state: RefillState.PHARMACY_PROCESSING },
      data: { state: RefillState.RESOLVED, resolvedAt: new Date() },
    });
    if (updated.count !== 1) throw new WorkflowError('The refill changed before fulfillment could be confirmed.', 'INVALID_TRANSITION');

    await tx.auditLog.create({
      data: {
        refillId,
        userId,
        action: AuditAction.VERIFICATION,
        reason,
        metadata: { verification: 'PHARMACY_FULFILLMENT', result: 'SIMULATED_CONFIRMED' } satisfies Prisma.InputJsonValue,
      },
    });
    await tx.auditLog.create({
      data: {
        refillId,
        userId,
        action: AuditAction.STATE_TRANSITION,
        previousState: refill.state,
        newState: RefillState.RESOLVED,
        reason: 'Simulated pharmacy fulfillment confirmed.',
        metadata: { humanApproved: true } satisfies Prisma.InputJsonValue,
      },
    });

    return tx.refillRequest.findUniqueOrThrow({ where: { id: refillId } });
  });
}

export function formatWorkflowError(error: unknown): { status: number; message: string } {
  if (error instanceof WorkflowError) return { status: error.code === 'NOT_FOUND' ? 404 : error.code === 'FORBIDDEN' ? 403 : error.code === 'VALIDATION_ERROR' ? 400 : 409, message: error.message };
  return { status: 500, message: 'An unexpected workflow error occurred.' };
}

export function isRole(value: string): value is UserRole {
  return Object.values(UserRole).includes(value as UserRole);
}
