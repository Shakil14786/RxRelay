import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiError, getDemoUser, unknownApiError } from '@/lib/api';

const roleSchema = z.object({ userId: z.string().cuid() });

export async function GET(request: Request) {
  try {
    const current = await getDemoUser(request);
    const users = await prisma.user.findMany({ where: { organizationId: current.organizationId }, select: { id: true, name: true, role: true }, orderBy: { createdAt: 'asc' } });
    return NextResponse.json({ current, users });
  } catch (error) {
    console.error('GET /api/demo/role failed', error instanceof Error ? error.message : 'unknown error');
    return unknownApiError();
  }
}

export async function POST(request: Request) {
  try {
    const current = await getDemoUser(request);
    const parsed = roleSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return apiError('A valid demo user is required.', 400);
    const selected = await prisma.user.findFirst({ where: { id: parsed.data.userId, organizationId: current.organizationId }, select: { id: true, name: true, role: true, organizationId: true } });
    if (!selected) return apiError('Demo user not found in this organization.', 404);
    const response = NextResponse.json({ user: selected });
    response.cookies.set('demoUserId', selected.id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
    return response;
  } catch (error) {
    console.error('POST /api/demo/role failed', error instanceof Error ? error.message : 'unknown error');
    return unknownApiError();
  }
}
