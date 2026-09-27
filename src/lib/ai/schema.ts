import { z } from 'zod';
import { BlockerType, RefillState, UserRole } from '@prisma/client';

export const aiAnalysisSchema = z.object({
  blocker: z.nativeEnum(BlockerType),
  explanation: z.string().trim().min(1).max(500),
  recommendedAction: z.string().trim().min(1).max(250),
  recommendedState: z.nativeEnum(RefillState),
  responsibleRole: z.nativeEnum(UserRole),
  confidence: z.number().min(0).max(1),
  humanReviewRequired: z.literal(true),
  communicationSummary: z.string().trim().max(500).optional(),
});

export type AIAnalysis = z.infer<typeof aiAnalysisSchema>;
export type AIAnalysisSource = 'gemini' | 'deterministic';

export type RefillAIContext = {
  state: RefillState;
  blocker: BlockerType | null;
  refillsRemaining: number;
  requiredInformation: string | null;
  insuranceStatus: string | null;
  medication: { name: string; strength: string };
  pharmacy: { name: string };
  provider: { name: string; specialty: string };
  communications: { channel: string; message: string; createdAt: Date }[];
};
