import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDemoUser, unknownApiError } from '@/lib/api';

export async function GET(request: Request) {
  try {
    const user = await getDemoUser(request);
    const refills = await prisma.refillRequest.findMany({ where: { organizationId: user.organizationId }, select: { state: true, blocker: true, createdAt: true, resolvedAt: true } });
    const counts = (values: (string | null)[]) => values.reduce<Record<string, number>>((result, value) => { if (value) result[value] = (result[value] ?? 0) + 1; return result; }, {});
    const resolved = refills.filter(refill => refill.resolvedAt);
    const averageResolutionHours = resolved.length === 0 ? 0 : resolved.reduce((total, refill) => total + ((refill.resolvedAt!.getTime() - refill.createdAt.getTime()) / 3600000), 0) / resolved.length;
    return NextResponse.json({ data: { total: refills.length, open: refills.filter(refill => !['RESOLVED', 'CANCELLED'].includes(refill.state)).length, blocked: refills.filter(refill => ['BLOCKED', 'MISSING_INFORMATION', 'AWAITING_INSURANCE'].includes(refill.state)).length, awaitingProvider: refills.filter(refill => refill.state === 'AWAITING_PROVIDER').length, awaitingPatient: refills.filter(refill => refill.state === 'AWAITING_PATIENT').length, resolved: resolved.length, escalated: refills.filter(refill => refill.state === 'ESCALATED').length, averageResolutionHours: Number(averageResolutionHours.toFixed(1)), byBlocker: counts(refills.map(refill => refill.blocker)), byState: counts(refills.map(refill => refill.state)) } });
  } catch (error) {
    console.error('GET /api/analytics failed', error instanceof Error ? error.message : 'unknown error');
    return unknownApiError();
  }
}
