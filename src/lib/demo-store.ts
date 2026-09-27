'use client';

type DemoRole = 'PHARMACY_STAFF' | 'PRACTICE_STAFF' | 'PROVIDER' | 'ADMIN';
type DemoState =
  | 'NEW' | 'PHARMACY_REVIEW' | 'BLOCKED' | 'MISSING_INFORMATION'
  | 'AWAITING_PROVIDER' | 'AWAITING_PATIENT' | 'AWAITING_INSURANCE'
  | 'ACTION_REQUIRED' | 'IN_REVIEW' | 'APPROVAL_RECEIVED'
  | 'PHARMACY_PROCESSING' | 'RESOLVED' | 'ESCALATED' | 'CANCELLED';

type DemoUser = { id: string; name: string; email: string; role: DemoRole; organizationId: string };
type DemoAudit = {
  id: string; action: string; previousState: DemoState | null; newState: DemoState | null;
  reason: string; createdAt: string; user: Pick<DemoUser, 'id' | 'name' | 'role'> | null;
};
type DemoCommunication = {
  id: string; recipient: string; recipientRole: string; channel: string; message: string;
  integration: string; succeeded: boolean; errorMessage: string | null; attemptCount: number;
  createdAt: string; sender: Pick<DemoUser, 'id' | 'name' | 'role'> | null;
};
type DemoRefill = {
  id: string; organizationId: string; patientId: string;
  patient: { id: string; displayName: string; syntheticId: string };
  medication: { name: string; strength: string };
  pharmacy: { name: string; location: string };
  provider: { name: string; specialty: string };
  state: DemoState; blocker: string | null; priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  refillsRemaining: number; requiredInformation: string | null; insuranceStatus: string | null;
  nextAction: string | null; reason: string; createdAt: string; updatedAt: string; resolvedAt: string | null;
  tasks: { id: string; title: string; status: string; assignee: DemoUser | null; createdAt: string }[];
  communications: DemoCommunication[]; auditLogs: DemoAudit[];
};
type DemoStore = { organizationId: string; users: DemoUser[]; currentUserId: string; refills: DemoRefill[] };

const STORE_KEY = 'rxrelay-demo-store-v1';
const ORG = 'org-rxrelay-demo';
const userSeeds: DemoUser[] = [
  { id: 'user-admin-demo', name: 'Alex Morgan', email: 'alex.morgan@northstar.demo', role: 'ADMIN', organizationId: ORG },
  { id: 'user-coordinator-demo', name: 'Priya Shah', email: 'priya.shah@northstar.demo', role: 'PRACTICE_STAFF', organizationId: ORG },
  { id: 'user-provider-demo', name: 'Dr. Jordan Lee', email: 'jordan.lee@northstar.demo', role: 'PROVIDER', organizationId: ORG },
  { id: 'user-pharmacy-demo', name: 'Morgan Ellis', email: 'morgan.ellis@northstar.demo', role: 'PHARMACY_STAFF', organizationId: ORG },
];

const transitionMap: Record<DemoState, DemoState[]> = {
  NEW: ['PHARMACY_REVIEW', 'CANCELLED'],
  PHARMACY_REVIEW: ['BLOCKED', 'CANCELLED'],
  BLOCKED: ['MISSING_INFORMATION', 'AWAITING_PROVIDER', 'AWAITING_INSURANCE', 'ESCALATED'],
  MISSING_INFORMATION: ['ACTION_REQUIRED', 'ESCALATED', 'CANCELLED'],
  AWAITING_PROVIDER: ['ACTION_REQUIRED', 'ESCALATED', 'CANCELLED'],
  AWAITING_PATIENT: ['ACTION_REQUIRED', 'ESCALATED', 'CANCELLED'],
  AWAITING_INSURANCE: ['ACTION_REQUIRED', 'ESCALATED', 'CANCELLED'],
  ACTION_REQUIRED: ['IN_REVIEW', 'ESCALATED', 'CANCELLED'],
  IN_REVIEW: ['APPROVAL_RECEIVED', 'ESCALATED', 'CANCELLED'],
  APPROVAL_RECEIVED: ['PHARMACY_PROCESSING', 'ESCALATED'],
  PHARMACY_PROCESSING: ['RESOLVED', 'ESCALATED'],
  RESOLVED: [],
  ESCALATED: ['ACTION_REQUIRED', 'CANCELLED'],
  CANCELLED: [],
};

function nowIso() { return new Date().toISOString(); }
function uid(prefix: string) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }

function createSeed(): DemoStore {
  const admin = userSeeds[0];
  const coordinator = userSeeds[1];
  const pharmacy = { name: 'Harborview Pharmacy (MOCK)', location: 'Synthetic City' };
  const provider = { name: 'Dr. Jordan Lee', specialty: 'Primary Care' };
  const items = [
    { patient: 'Elena Rodriguez', med: 'Lisinopril', strength: '20 mg', state: 'AWAITING_PROVIDER', blocker: 'NO_REFILLS', priority: 'URGENT', remaining: 0, required: null, insurance: null, next: 'Provider approval required', reason: 'Synthetic scenario: no refills remain.' },
    { patient: 'Marcus Chen', med: 'Metformin ER', strength: '500 mg', state: 'MISSING_INFORMATION', blocker: 'MISSING_INFORMATION', priority: 'HIGH', remaining: 2, required: 'recent blood pressure reading', insurance: null, next: 'Request missing information', reason: 'Synthetic scenario: required information is missing.' },
    { patient: 'Sofia Patel', med: 'Atorvastatin', strength: '40 mg', state: 'AWAITING_INSURANCE', blocker: 'INSURANCE_BLOCK', priority: 'HIGH', remaining: 2, required: null, insurance: 'BLOCKED', next: 'Resolve insurance requirement', reason: 'Synthetic scenario: payer coverage check is blocked.' },
    { patient: 'Daniel Nguyen', med: 'Levothyroxine', strength: '75 mcg', state: 'AWAITING_PROVIDER', blocker: 'PROVIDER_REVIEW', priority: 'NORMAL', remaining: 1, required: null, insurance: null, next: 'Route to provider for review', reason: 'Synthetic scenario: provider review is required.' },
    { patient: 'Linda ONeil', med: 'Amlodipine', strength: '10 mg', state: 'RESOLVED', blocker: 'UNKNOWN', priority: 'NORMAL', remaining: 3, required: null, insurance: null, next: 'Review refill context', reason: 'Synthetic scenario: refill successfully resolved.' },
    { patient: 'Jamie Brooks', med: 'Eliquis', strength: '5 mg', state: 'ESCALATED', blocker: 'NO_REFILLS', priority: 'URGENT', remaining: 0, required: null, insurance: null, next: 'Provider approval required', reason: 'Synthetic scenario: escalation after missed response SLA.' },
  ] as const;

  const refills: DemoRefill[] = items.map((item, index) => {
    const refillId = `refill-demo-${String(index + 1).padStart(3, '0')}`;
    const patientId = `patient-demo-${String(index + 1).padStart(3, '0')}`;
    const createdAt = new Date(Date.now() - (index + 2) * 60 * 60 * 1000).toISOString();
    const activeAssignee = item.state === 'AWAITING_PROVIDER' ? coordinator : null;
    const task = activeAssignee ? [{
      id: `task-demo-${index + 1}`, title: item.next, status: 'OPEN', assignee: activeAssignee, createdAt,
    }] : [];
    return {
      id: refillId,
      organizationId: ORG,
      patientId,
      patient: { id: patientId, displayName: item.patient, syntheticId: `SYN-DEMO-${String(index + 1).padStart(3, '0')}` },
      medication: { name: item.med, strength: item.strength },
      pharmacy,
      provider,
      state: item.state,
      blocker: item.blocker,
      priority: item.priority,
      refillsRemaining: item.remaining,
      requiredInformation: item.required,
      insuranceStatus: item.insurance,
      nextAction: item.next,
      reason: item.reason,
      createdAt,
      updatedAt: createdAt,
      resolvedAt: item.state === 'RESOLVED' ? createdAt : null,
      tasks: task,
      communications: [],
      auditLogs: [
        { id: `audit-received-${index}`, action: 'STATE_TRANSITION', previousState: null, newState: 'NEW', reason: 'Synthetic refill received from mock pharmacy.', createdAt, user: userSeeds[3] },
        { id: `audit-seeded-${index}`, action: 'STATE_TRANSITION', previousState: 'NEW', newState: item.state, reason: item.reason, createdAt: new Date(new Date(createdAt).getTime() + 1000).toISOString(), user: admin },
      ],
    };
  });

  return { organizationId: ORG, users: userSeeds, currentUserId: userSeeds[0].id, refills };
}

function loadStore(): DemoStore {
  const raw = localStorage.getItem(STORE_KEY);
  if (raw === null) {
    const store = createSeed();
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
    return store;
  }
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || !('users' in parsed) || !('refills' in parsed) || !Array.isArray(parsed.users) || !Array.isArray(parsed.refills)) {
    throw new Error('The local demo data is invalid. Clear this site’s browser storage to reset the demo.');
  }
  return parsed as DemoStore;
}

function saveStore(store: DemoStore) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

function actor(store: DemoStore) {
  return store.users.find(user => user.id === store.currentUserId) ?? store.users[0];
}

function addAudit(store: DemoStore, refill: DemoRefill, action: string, reason: string, previousState: DemoState | null = null, newState: DemoState | null = null) {
  refill.auditLogs.push({ id: uid('audit'), action, previousState, newState, reason, createdAt: nowIso(), user: actor(store) });
  refill.updatedAt = nowIso();
}

function canRoleTransition(role: DemoRole, target: DemoState) {
  if (role === 'ADMIN') return true;
  if (target === 'RESOLVED') return role === 'PHARMACY_STAFF';
  if (role === 'PROVIDER') return ['APPROVAL_RECEIVED', 'IN_REVIEW', 'ESCALATED'].includes(target);
  if (role === 'PHARMACY_STAFF') return ['PHARMACY_REVIEW', 'PHARMACY_PROCESSING'].includes(target);
  return target !== 'APPROVAL_RECEIVED';
}

function calculateAnalytics(refills: DemoRefill[]) {
  const byBlocker: Record<string, number> = {};
  const byState: Record<string, number> = {};
  for (const refill of refills) {
    if (refill.blocker) byBlocker[refill.blocker] = (byBlocker[refill.blocker] ?? 0) + 1;
    byState[refill.state] = (byState[refill.state] ?? 0) + 1;
  }
  const resolved = refills.filter(refill => refill.resolvedAt);
  const averageResolutionHours = resolved.length
    ? resolved.reduce((total, refill) => total + (new Date(refill.resolvedAt!).getTime() - new Date(refill.createdAt).getTime()) / 3600000, 0) / resolved.length
    : 0;
  return {
    total: refills.length,
    open: refills.filter(refill => !['RESOLVED', 'CANCELLED'].includes(refill.state)).length,
    blocked: refills.filter(refill => ['BLOCKED', 'MISSING_INFORMATION', 'AWAITING_INSURANCE'].includes(refill.state)).length,
    awaitingProvider: refills.filter(refill => refill.state === 'AWAITING_PROVIDER').length,
    awaitingPatient: refills.filter(refill => refill.state === 'AWAITING_PATIENT').length,
    resolved: resolved.length,
    escalated: refills.filter(refill => refill.state === 'ESCALATED').length,
    averageResolutionHours: Number(averageResolutionHours.toFixed(1)),
    byBlocker,
    byState,
  };
}

function analyze(refill: DemoRefill) {
  if (refill.state === 'RESOLVED') return {
    blocker: refill.blocker ?? 'UNKNOWN',
    explanation: 'This refill is already resolved and has no active workflow blocker.',
    recommendedAction: 'Verify the refill remains resolved.',
    recommendedState: 'RESOLVED',
    responsibleRole: 'PRACTICE_STAFF',
    confidence: 1,
    humanReviewRequired: true,
  };

  const blocker = refill.refillsRemaining === 0
    ? 'NO_REFILLS'
    : refill.requiredInformation
      ? 'MISSING_INFORMATION'
      : refill.insuranceStatus?.toUpperCase() === 'BLOCKED'
        ? 'INSURANCE_BLOCK'
        : refill.blocker === 'PROVIDER_REVIEW'
          ? 'PROVIDER_REVIEW'
          : 'UNKNOWN';
  const routeByState: Partial<Record<DemoState, { target: DemoState; action: string; role: DemoRole; explanation: string }>> = {
    NEW: { target: 'PHARMACY_REVIEW', action: 'Start pharmacy review', role: 'PHARMACY_STAFF', explanation: 'The refill request is new and ready for an initial pharmacy review.' },
    PHARMACY_REVIEW: { target: 'BLOCKED', action: 'Record the blocker and route the next step', role: 'PHARMACY_STAFF', explanation: `The request needs attention because of ${blocker.replaceAll('_', ' ').toLowerCase()}.` },
    BLOCKED: blocker === 'NO_REFILLS' || blocker === 'PROVIDER_REVIEW'
      ? { target: 'AWAITING_PROVIDER', action: 'Route to the provider for review', role: 'PRACTICE_STAFF', explanation: 'Provider review is needed before the refill can move forward.' }
      : blocker === 'MISSING_INFORMATION'
        ? { target: 'MISSING_INFORMATION', action: 'Request the missing information', role: 'PRACTICE_STAFF', explanation: 'The refill request is missing information required for the next step.' }
        : blocker === 'INSURANCE_BLOCK'
          ? { target: 'AWAITING_INSURANCE', action: 'Route the insurance requirement for review', role: 'PRACTICE_STAFF', explanation: 'An insurance requirement is blocking the refill workflow.' }
          : undefined,
    MISSING_INFORMATION: { target: 'ACTION_REQUIRED', action: 'Review the information received', role: 'PRACTICE_STAFF', explanation: 'The workflow is ready for staff to review the information provided.' },
    AWAITING_PROVIDER: { target: 'ACTION_REQUIRED', action: 'Open the provider review step', role: 'PROVIDER', explanation: 'The request is waiting for an authorized provider to review it.' },
    AWAITING_PATIENT: { target: 'ACTION_REQUIRED', action: 'Review the patient response', role: 'PRACTICE_STAFF', explanation: 'The workflow can continue when staff review the patient response.' },
    AWAITING_INSURANCE: { target: 'ACTION_REQUIRED', action: 'Review the insurance update', role: 'PRACTICE_STAFF', explanation: 'The workflow can continue when staff review the insurance update.' },
    ACTION_REQUIRED: { target: 'IN_REVIEW', action: 'Route the request into provider review', role: 'PROVIDER', explanation: 'This refill needs an authorized provider to review the request. The system does not make the clinical decision.' },
    IN_REVIEW: { target: 'IN_REVIEW', action: 'Continue provider review; record the provider’s decision in the workflow', role: 'PROVIDER', explanation: 'The request is in provider review. Only the authorized provider makes the clinical decision.' },
    APPROVAL_RECEIVED: { target: 'PHARMACY_PROCESSING', action: 'Send the approved request to pharmacy processing', role: 'PHARMACY_STAFF', explanation: 'The provider response is recorded; the pharmacy is the next operational handoff.' },
    PHARMACY_PROCESSING: { target: 'RESOLVED', action: 'Verify simulated pharmacy fulfillment before resolving', role: 'PHARMACY_STAFF', explanation: 'The pharmacy is processing the refill. Fulfillment must be confirmed before the workflow can be resolved.' },
    ESCALATED: { target: 'ACTION_REQUIRED', action: 'Return the escalated request to staff action', role: 'PRACTICE_STAFF', explanation: 'This escalated request needs a staff owner to determine the next operational step.' },
    CANCELLED: { target: 'CANCELLED', action: 'No action; this refill is cancelled', role: 'PRACTICE_STAFF', explanation: 'This refill has been cancelled and has no active workflow action.' },
  };
  const route = routeByState[refill.state];
  const target = route?.target ?? refill.state;
  const allowed = target === refill.state || transitionMap[refill.state].includes(target);
  return {
    blocker,
    explanation: route?.explanation ?? 'The current state requires a person to review the refill and select an appropriate next step.',
    recommendedAction: allowed ? (route?.action ?? refill.nextAction ?? 'Review refill details and choose the next step.') : 'Review the current workflow state and choose an allowed next action.',
    recommendedState: allowed ? target : refill.state,
    responsibleRole: allowed ? (route?.role ?? 'PRACTICE_STAFF') : 'PRACTICE_STAFF',
    confidence: blocker === 'UNKNOWN' || !allowed ? 0.6 : 1,
    humanReviewRequired: true,
    communicationSummary: refill.communications.length ? `${refill.communications.length} simulated communication record(s).` : undefined,
  };
}

async function handleRequest(input: RequestInfo | URL, init: RequestInit): Promise<Response> {
  if (init.signal?.aborted) throw new DOMException('The request was aborted.', 'AbortError');
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url, window.location.origin);
  const method = (init.method ?? (typeof input !== 'string' && !(input instanceof URL) ? input.method : 'GET')).toUpperCase();
  const path = url.pathname;
  const body = typeof init.body === 'string' ? JSON.parse(init.body) as Record<string, unknown> : {};
  const store = loadStore();
  const current = actor(store);

  if (path === '/api/demo/role' && method === 'GET') {
    return json({ current, users: store.users.map(({ id, name, role }) => ({ id, name, role })) });
  }
  if (path === '/api/demo/role' && method === 'POST') {
    const selected = store.users.find(user => user.id === body.userId);
    if (!selected) return json({ error: 'Demo user not found.' }, 404);
    store.currentUserId = selected.id;
    saveStore(store);
    return json({ user: selected });
  }
  if (path === '/api/analytics' && method === 'GET') return json({ data: calculateAnalytics(store.refills) });

  if (path === '/api/system-health' && method === 'GET') {
    return json({ data: { database: 'Browser-local demo store', aiService: 'Deterministic demo rules', pharmacyIntegration: 'Simulated', providerNotification: 'Simulated', patientNotification: 'Simulated', insuranceIntegration: 'Simulated' } });
  }

  if (path === '/api/refills' && method === 'GET') {
    const search = (url.searchParams.get('search') ?? '').toLowerCase();
    const status = url.searchParams.get('status');
    const priority = url.searchParams.get('priority');
    const data = store.refills.filter(refill =>
      (!status || refill.state === status) &&
      (!priority || refill.priority === priority) &&
      (!search || [refill.patient.displayName, refill.medication.name, refill.medication.strength, refill.pharmacy.name, refill.provider.name].some(value => value.toLowerCase().includes(search))),
    ).map(refill => ({ ...refill, tasks: refill.tasks.filter(task => ['OPEN', 'IN_PROGRESS'].includes(task.status)) }));
    return json({ data });
  }

  if (path === '/api/patient-tracking' && method === 'GET') {
    const syntheticId = url.searchParams.get('syntheticId')?.trim();
    if (!syntheticId) return json({ error: 'Enter a synthetic demo patient ID.' }, 400);
    const refill = store.refills.find(item => item.patient.syntheticId === syntheticId);
    if (!refill) return json({ error: 'No demo refill was found for that synthetic ID.' }, 404);
    const nextStepByState: Record<DemoState, string> = {
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
    return json({ data: {
      patientId: syntheticId,
      medication: `${refill.medication.name} ${refill.medication.strength}`,
      state: refill.state,
      nextStep: nextStepByState[refill.state],
      pharmacy: refill.pharmacy.name,
      pharmacyLocation: refill.pharmacy.location,
      updatedAt: refill.updatedAt,
    } });
  }

  const refillMatch = path.match(/^\/api\/refills\/([^/]+)(?:\/(transition|verify-fulfillment|assign|communicate|escalate))?$/);
  if (refillMatch) {
    const [, refillId, action] = refillMatch;
    const refill = store.refills.find(item => item.id === refillId);
    if (!refill) return json({ error: 'Refill not found.' }, 404);
    if (!action && method === 'GET') return json({ data: refill, viewer: current });

    if (action === 'transition' && method === 'POST') {
      const target = body.targetState as DemoState;
      if (!Object.hasOwn(transitionMap, target) || target === 'RESOLVED' || !transitionMap[refill.state].includes(target)) {
        return json({ error: `Cannot transition refill from ${refill.state} to ${String(target)}.` }, 409);
      }
      if (!canRoleTransition(current.role, target)) return json({ error: 'Your demo role is not authorized for this transition.' }, 403);
      const previous = refill.state;
      refill.state = target;
      if (target === 'ACTION_REQUIRED') refill.nextAction = 'Review the next required action';
      addAudit(store, refill, 'STATE_TRANSITION', String(body.reason ?? 'Human-approved demo workflow transition.'), previous, target);
      saveStore(store);
      return json({ data: refill });
    }

    if (action === 'verify-fulfillment' && method === 'POST') {
      if (refill.state !== 'PHARMACY_PROCESSING') return json({ error: 'Fulfillment can only be verified while pharmacy processing is in progress.' }, 409);
      if (!['ADMIN', 'PHARMACY_STAFF'].includes(current.role)) return json({ error: 'Your demo role is not authorized to verify pharmacy fulfillment.' }, 403);
      if (body.forceFailure === true) {
        addAudit(store, refill, 'VERIFICATION', 'Simulated pharmacy fulfillment could not be verified.');
        saveStore(store);
        const result = { integration: 'PHARMACY_FULFILLMENT', succeeded: false, status: 'FAILED', message: 'Simulated dependency failure.' };
        return json({ error: result.message, result }, 502);
      }
      const previous = refill.state;
      refill.state = 'RESOLVED';
      refill.resolvedAt = nowIso();
      addAudit(store, refill, 'VERIFICATION', `${String(body.reason ?? 'Human confirmed fulfillment.')} Simulated pharmacy fulfillment confirmed.`);
      addAudit(store, refill, 'STATE_TRANSITION', 'Simulated pharmacy fulfillment confirmed.', previous, 'RESOLVED');
      saveStore(store);
      return json({ data: refill, result: { integration: 'PHARMACY_FULFILLMENT', succeeded: true, status: 'SIMULATED', message: 'Simulated pharmacy fulfillment confirmed.' } });
    }

    if (action === 'assign' && method === 'POST') {
      if (!['ADMIN', 'PRACTICE_STAFF'].includes(current.role)) return json({ error: 'You are not authorized to assign refill work.' }, 403);
      const assignee = store.users.find(user => user.id === body.userId);
      if (!assignee) return json({ error: 'Assignee not found.' }, 404);
      const task = { id: uid('task'), title: 'Resolve refill workflow', status: 'OPEN', assignee, createdAt: nowIso() };
      refill.tasks = [task];
      addAudit(store, refill, 'ASSIGNMENT', `Assigned refill to ${assignee.name}.`);
      saveStore(store);
      return json({ data: task });
    }

    if (action === 'communicate' && method === 'POST') {
      const type = String(body.type);
      const permissionRoles: Record<string, DemoRole[]> = {
        PROVIDER: ['PRACTICE_STAFF', 'ADMIN'],
        PHARMACY: ['PHARMACY_STAFF', 'ADMIN'],
        PATIENT: ['PRACTICE_STAFF', 'ADMIN'],
      };
      if (!permissionRoles[type]?.includes(current.role)) return json({ error: 'Your demo role is not authorized to send this communication.' }, 403);
      const recipient = type === 'PROVIDER' ? refill.provider.name : type === 'PHARMACY' ? refill.pharmacy.name : refill.patient.displayName;
      const result = body.forceFailure === true
        ? { integration: 'MOCK', succeeded: false, message: 'Simulated dependency failure.', errorMessage: 'MOCK returned a deterministic demo failure. Retry is available.' }
        : { integration: 'MOCK', succeeded: true, message: `Simulated ${type.toLowerCase()} notification delivered.`, errorMessage: null };
      const communication: DemoCommunication = {
        id: uid('communication'),
        recipient,
        recipientRole: type === 'PATIENT' ? 'PATIENT' : type === 'PROVIDER' ? 'PROVIDER' : 'PHARMACY_STAFF',
        channel: 'MOCK_API',
        message: String(body.message ?? ''),
        integration: result.integration,
        succeeded: result.succeeded,
        errorMessage: result.errorMessage,
        attemptCount: 1,
        createdAt: nowIso(),
        sender: current,
      };
      refill.communications.push(communication);
      addAudit(store, refill, 'COMMUNICATION', `Simulated ${type.toLowerCase()} notification ${result.succeeded ? 'succeeded' : 'failed'}.`);
      saveStore(store);
      return json({ data: communication, result }, result.succeeded ? 200 : 502);
    }

    if (action === 'escalate' && method === 'POST') {
      if (!canRoleTransition(current.role, 'ESCALATED') || !transitionMap[refill.state].includes('ESCALATED')) return json({ error: 'This role cannot escalate the refill from its current state.' }, 403);
      const previous = refill.state;
      refill.state = 'ESCALATED';
      addAudit(store, refill, 'STATE_TRANSITION', String(body.reason ?? 'Escalated for staff follow-up.'), previous, 'ESCALATED');
      saveStore(store);
      return json({ data: refill });
    }
  }

  if (path === '/api/ai/analyze-refill' && method === 'POST') {
    const refill = store.refills.find(item => item.id === body.refillId);
    if (!refill) return json({ error: 'Refill not found.' }, 404);
    return json({ analysis: analyze(refill), source: 'deterministic', notice: 'Using bundled deterministic demo rules. No external AI service is required.' });
  }

  return json({ error: `No browser-local demo handler for ${method} ${path}.` }, 404);
}

export function demoFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  return handleRequest(input, init).catch(error => {
    console.error('Browser-local demo request failed', error instanceof Error ? error.message : 'unknown error');
    return json({ error: error instanceof Error ? error.message : 'Unable to complete the browser-local demo request.' }, 500);
  });
}

export function resetDemoStore() {
  localStorage.removeItem(STORE_KEY);
}
