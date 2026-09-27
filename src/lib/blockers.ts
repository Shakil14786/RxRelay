import { BlockerType, RefillState } from '@prisma/client';

export type BlockerInput = {
  refillsRemaining: number;
  requiredInformation?: string | null;
  insuranceStatus?: string | null;
  providerReviewRequired?: boolean;
};

export type BlockerResult = {
  blocker: BlockerType;
  recommendedState: RefillState;
  nextAction: string;
  explanation: string;
};

export function determineBlocker(input: BlockerInput): BlockerResult {
  if (input.refillsRemaining === 0) {
    return { blocker: BlockerType.NO_REFILLS, recommendedState: RefillState.AWAITING_PROVIDER, nextAction: 'Provider approval required', explanation: 'The prescription has no remaining refills, so provider authorization is required before fulfillment can continue.' };
  }
  if (input.requiredInformation?.trim()) {
    return { blocker: BlockerType.MISSING_INFORMATION, recommendedState: RefillState.MISSING_INFORMATION, nextAction: 'Request missing information', explanation: `The refill is missing: ${input.requiredInformation.trim()}.` };
  }
  if (input.insuranceStatus?.toUpperCase() === 'BLOCKED') {
    return { blocker: BlockerType.INSURANCE_BLOCK, recommendedState: RefillState.AWAITING_INSURANCE, nextAction: 'Resolve insurance requirement', explanation: 'The payer or coverage workflow is blocking fulfillment.' };
  }
  if (input.providerReviewRequired) {
    return { blocker: BlockerType.PROVIDER_REVIEW, recommendedState: RefillState.AWAITING_PROVIDER, nextAction: 'Route to provider for review', explanation: 'The provider needs to review the refill before it can continue.' };
  }
  return { blocker: BlockerType.UNKNOWN, recommendedState: RefillState.BLOCKED, nextAction: 'Review refill context', explanation: 'The refill is blocked but the available information does not identify a known cause.' };
}
