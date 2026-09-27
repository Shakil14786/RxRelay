import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiError, getDemoUser, unknownApiError } from '@/lib/api';

const querySchema = z.object({ syntheticId: z.string().trim().min(1).max(40) });

const nextStepByState: Record<string, string> = {
  NEW: 'The pharmacy team will review the request.',
  PHARMACY_REVIEW: 'The pharmacy team is checking the request.',
  BLOCKED: 'Your care team is reviewing what is needed next.',
  MISSING_INFORMATION: 'Your care team will follow up about the information needed.',
  AWAITING_PROVIDER: 'The provider needs to review the refill request.',
  AWAITING_PATIENT: 'Your care team may need information from you.',
  AWAITING_INSURANCE: 'The team is checking an insurance requirement.',
  ACTION_REQUIRED: 'Your care team is working on the next step.',
  IN_REVIEW: 'The provider is reviewing the request.',
  APPROVAL_RECEIVED: 'The pharmacy is the next team to act.',
  PHARMACY_PROCESSING: 'The pharmacy is processing the refill.',
  RESOLVED: 'Check with the pharmacy for pickup details.',
  ESCALATED: 'The care team is following up on this request.',
  CANCELLED: 'Contact your care team if you still need this refill.',
};

export async function GET(request: Request) {
  try {
    const user = await getDemoUser(request);
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({ syntheticId: url.searchParams.get('syntheticId') });
    if (!parsed.success) return apiError('Enter a valid synthetic demo patient ID.', 400);

    const refill = await prisma.refillRequest.findFirst({
      where: {
        organizationId: user.organizationId,
        patient: { syntheticId: parsed.data.syntheticId },
      },
      include: { medication: true, pharmacy: true },
      orderBy: { updatedAt: 'desc' },
    });
    if (!refill) return apiError('No demo refill was found for that synthetic ID.', 404);

    return NextResponse.json({
      data: {
        patientId: parsed.data.syntheticId,
        medication: `${refill.medication.name} ${refill.medication.strength}`,
        state: refill.state,
        nextStep: nextStepByState[refill.state] ?? 'Your care team will review the request.',
        pharmacy: refill.pharmacy.name,
        pharmacyLocation: refill.pharmacy.location,
        updatedAt: refill.updatedAt,
      },
    });
  } catch (error) {
    console.error('GET /api/patient-tracking failed', error instanceof Error ? error.message : 'unknown error');
    return unknownApiError();
  }
}
