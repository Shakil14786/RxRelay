import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@/lib/prisma';
import { canTransition } from '@/lib/workflow';
import { deterministicAnalysis } from './fallback';
import { aiAnalysisSchema, type AIAnalysis, type AIAnalysisSource, type RefillAIContext } from './schema';

const unsafeTerms = /\b(diagnos(e|is|tic)|prescrib(e|ing|ed)|dosage|change (the )?dose|approve medication)\b/i;

function parseGeminiJson(text: string, currentState: RefillAIContext['state']): AIAnalysis {
  const clean = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const parsed: unknown = JSON.parse(clean);
  const validated = aiAnalysisSchema.parse(parsed);
  const operationalText = `${validated.explanation} ${validated.recommendedAction}`;
  if (unsafeTerms.test(operationalText)) throw new Error('Gemini returned a non-operational recommendation.');
  if (validated.recommendedState !== currentState && !canTransition(currentState, validated.recommendedState)) {
    throw new Error('Gemini returned a transition that is not allowed from the current workflow state.');
  }
  return validated;
}

async function requestGemini(context: RefillAIContext): Promise<AIAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.');
  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
    generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
  });
  const prompt = `You are an operational workflow assistant for a synthetic prescription refill system. Do not diagnose, prescribe, approve medication, change dosage, or make clinical decisions. Recommend only administrative workflow actions. Human review is always required.

Return only valid JSON matching this shape:
{"blocker":"NO_REFILLS|PROVIDER_APPROVAL|PROVIDER_REVIEW|VISIT_REQUIRED|MISSING_INFORMATION|INSURANCE_BLOCK|ADMINISTRATIVE_BLOCK|UNKNOWN","explanation":"short operational explanation","recommendedAction":"one operational next action","recommendedState":"one valid workflow state","responsibleRole":"PHARMACY_STAFF|PRACTICE_STAFF|PROVIDER|ADMIN","confidence":0.0,"humanReviewRequired":true,"communicationSummary":"short summary or empty string"}

Workflow context:
${JSON.stringify({
  currentState: context.state,
  recordedBlocker: context.blocker,
  refillsRemaining: context.refillsRemaining,
  requiredInformation: context.requiredInformation,
  insuranceStatus: context.insuranceStatus,
  medication: context.medication,
  pharmacy: context.pharmacy,
  provider: context.provider,
  communications: context.communications.map(item => ({ channel: item.channel, message: item.message, createdAt: item.createdAt.toISOString() })),
})}`;
  const result = await model.generateContent(prompt);
  return parseGeminiJson(result.response.text(), context.state);
}

export async function analyzeAndStoreRefill(refillId: string, userId: string, organizationId: string): Promise<{ analysis: AIAnalysis; source: AIAnalysisSource; notice?: string }> {
  const refill = await prisma.refillRequest.findFirst({
    where: { id: refillId, organizationId },
    include: { medication: true, pharmacy: true, provider: true, communications: { orderBy: { createdAt: 'asc' }, take: 10 } },
  });
  if (!refill) throw new Error('REFILL_NOT_FOUND');

  const context: RefillAIContext = {
    state: refill.state,
    blocker: refill.blocker,
    refillsRemaining: refill.refillsRemaining,
    requiredInformation: refill.requiredInformation,
    insuranceStatus: refill.insuranceStatus,
    medication: { name: refill.medication.name, strength: refill.medication.strength },
    pharmacy: { name: refill.pharmacy.name },
    provider: { name: refill.provider.name, specialty: refill.provider.specialty },
    communications: refill.communications,
  };

  let analysis: AIAnalysis;
  let source: AIAnalysisSource = 'gemini';
  let notice: string | undefined;
  try {
    analysis = await requestGemini(context);
  } catch (error) {
    analysis = deterministicAnalysis(context);
    source = 'deterministic';
    notice = 'AI unavailable — deterministic workflow rules are being used.';
    console.error('Gemini analysis unavailable', error instanceof Error ? error.message : 'unknown error');
  }

  await prisma.aIRecommendation.create({
    data: {
      refillId,
      createdById: userId,
      recommendation: analysis.recommendedAction,
      explanation: analysis.explanation,
      blocker: analysis.blocker,
      confidence: analysis.confidence,
      responsibleRole: analysis.responsibleRole,
      humanReviewRequired: true,
      communicationSummary: analysis.communicationSummary,
    },
  });
  return { analysis, source, notice };
}
