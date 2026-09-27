import { BlockerType, RefillState, UserRole } from '@prisma/client';
import { determineBlocker } from '@/lib/blockers';
import { canTransition } from '@/lib/workflow';
import type { AIAnalysis, RefillAIContext } from './schema';

function summarizeCommunications(context: RefillAIContext): string | undefined {
  if (context.communications.length === 0) return undefined;
  const latest = context.communications[context.communications.length - 1];
  return `${context.communications.length} communication record(s). Latest ${latest.channel} message: ${latest.message.slice(0, 240)}`;
}

export function deterministicAnalysis(context: RefillAIContext): AIAnalysis {
  if (context.state === RefillState.RESOLVED) {
    return {
      blocker: BlockerType.UNKNOWN,
      explanation: 'This refill is already resolved and has no active workflow blocker.',
      recommendedAction: 'Verify the refill remains resolved.',
      recommendedState: RefillState.RESOLVED,
      responsibleRole: UserRole.PRACTICE_STAFF,
      confidence: 1,
      humanReviewRequired: true,
      communicationSummary: summarizeCommunications(context),
    };
  }

  if (context.state === RefillState.PHARMACY_PROCESSING) {
    return {
      blocker: context.blocker ?? BlockerType.UNKNOWN,
      explanation: 'The refill is with the pharmacy. Confirm fulfillment before closing the workflow.',
      recommendedAction: 'Verify pharmacy fulfillment, then resolve the refill.',
      recommendedState: RefillState.RESOLVED,
      responsibleRole: UserRole.PHARMACY_STAFF,
      confidence: 1,
      humanReviewRequired: true,
      communicationSummary: summarizeCommunications(context),
    };
  }

  const result = determineBlocker({
    refillsRemaining: context.refillsRemaining,
    requiredInformation: context.requiredInformation,
    insuranceStatus: context.insuranceStatus,
    providerReviewRequired: context.blocker === BlockerType.PROVIDER_REVIEW,
  });
  const responsibleRole = result.blocker === BlockerType.NO_REFILLS || result.blocker === BlockerType.PROVIDER_REVIEW || result.blocker === BlockerType.PROVIDER_APPROVAL ? UserRole.PROVIDER : UserRole.PRACTICE_STAFF;
  const proposedState = context.state === RefillState.AWAITING_PROVIDER && result.recommendedState === RefillState.AWAITING_PROVIDER
    ? RefillState.ACTION_REQUIRED
    : result.recommendedState;
  const recommendationIsActionable = proposedState === context.state || canTransition(context.state, proposedState);

  return {
    blocker: result.blocker,
    explanation: recommendationIsActionable
      ? result.explanation
      : `${result.explanation} The current workflow state does not allow that transition, so a staff member must review the available next steps.`,
    recommendedAction: recommendationIsActionable
      ? result.nextAction
      : 'Review the current workflow state and select an allowed next action.',
    recommendedState: recommendationIsActionable ? proposedState : context.state,
    responsibleRole: recommendationIsActionable ? responsibleRole : UserRole.PRACTICE_STAFF,
    confidence: result.blocker === BlockerType.UNKNOWN || !recommendationIsActionable ? 0.45 : 1,
    humanReviewRequired: true,
    communicationSummary: summarizeCommunications(context),
  };
}
