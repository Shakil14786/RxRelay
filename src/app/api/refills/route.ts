import { NextResponse } from 'next/server';
import { Priority, RefillState } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiError, getDemoUser, unknownApiError } from '@/lib/api';

const querySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.nativeEnum(RefillState).optional(),
  priority: z.nativeEnum(Priority).optional(),
});

export async function GET(request: Request) {
  try {
    const user = await getDemoUser(request);
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      search: url.searchParams.get('search') || undefined,
      status: url.searchParams.get('status') || undefined,
      priority: url.searchParams.get('priority') || undefined,
    });
    if (!parsed.success) return apiError('Invalid queue filters.', 400);

    const { search, status, priority } = parsed.data;
    const refills = await prisma.refillRequest.findMany({
      where: {
        organizationId: user.organizationId,
        state: status,
        priority,
        ...(search ? { OR: [
          { patient: { displayName: { contains: search, mode: 'insensitive' } } },
          { medication: { name: { contains: search, mode: 'insensitive' } } },
          { medication: { strength: { contains: search, mode: 'insensitive' } } },
          { pharmacy: { name: { contains: search, mode: 'insensitive' } } },
          { provider: { name: { contains: search, mode: 'insensitive' } } },
        ] } : {}),
      },
      include: { patient: true, medication: true, pharmacy: true, provider: true, tasks: { where: { status: { in: ['OPEN', 'IN_PROGRESS'] } }, include: { assignee: true }, orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json({ data: refills });
  } catch (error) {
    console.error('GET /api/refills failed', error instanceof Error ? error.message : 'unknown error');
    return unknownApiError();
  }
}
