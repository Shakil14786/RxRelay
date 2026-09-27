import { z } from 'zod';
import { RefillState } from '@prisma/client';

export const transitionRefillSchema = z.object({
  refillId: z.string().cuid(),
  newState: z.nativeEnum(RefillState),
  userId: z.string().cuid(),
  reason: z.string().trim().min(3).max(500),
});

export type TransitionRefillInput = z.infer<typeof transitionRefillSchema>;
