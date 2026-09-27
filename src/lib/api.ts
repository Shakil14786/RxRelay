import { NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { prisma } from './prisma';

export async function getDemoUser(request: Request) {
  const cookieUserId = request.headers.get('cookie')?.match(/(?:^|;\s*)demoUserId=([^;]+)/)?.[1];
  const userSelect = { id: true, name: true, role: true, organizationId: true } as const;
  const candidateIds = [request.headers.get('x-demo-user-id'), cookieUserId, process.env.DEMO_USER_ID].filter((value): value is string => Boolean(value));
  let user = null;
  for (const candidateId of candidateIds) {
    user = await prisma.user.findUnique({ where: { id: candidateId }, select: userSelect });
    if (user) break;
  }
  user ??= await prisma.user.findFirst({ where: { role: UserRole.ADMIN }, orderBy: { createdAt: 'asc' }, select: userSelect });

  if (!user) throw new Error('Demo user is not configured. Seed the database or set DEMO_USER_ID.');
  return user;
}

export function apiError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export function unknownApiError() {
  return apiError('Unable to complete that request right now.', 500);
}
