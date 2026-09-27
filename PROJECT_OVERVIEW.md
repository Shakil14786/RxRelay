# RxRelay Project Overview

## Runtime storage mode

The active UI uses the browser-local demo adapter in `src/lib/demo-store.ts`. It bundles six synthetic refill scenarios and stores role selection and workflow changes in the current visitor's browser `localStorage`. This mode requires no hosted database and can run on Vercel, but data is not shared across visitors and is cleared when that browser's site data is cleared. The landing page provides a reset control.

The Prisma schema and `/api/*` server routes remain as a separate PostgreSQL-backed foundation; the browser UI currently uses its local adapter rather than those routes. The browser-local demo is not suitable for real patient data or production use.

## 1. Product Summary

RxRelay is a B2B prescription refill orchestration platform for pharmacies, physician practices, refill coordinators, providers, and practice administrators.

The product helps teams understand why a refill is stuck, identify who must act, coordinate the next operational step, verify the result, and resolve the refill.

Core product model:

```text
UNDERSTAND -> ROUTE -> ACT -> VERIFY -> RESOLVE
```

All application data is synthetic demonstration data. This is a hackathon MVP and is not a HIPAA compliance claim.

## 2. What Was Built

### Optional PostgreSQL backend foundation

The following backend features remain available in the repository as a separate PostgreSQL implementation. They are not used by the active browser-local demo pages.

- Next.js application with TypeScript
- PostgreSQL database through Prisma
- Zod validation
- Environment-based configuration
- Synthetic seed data
- Centralized workflow state machine
- Server-side workflow validation
- Server-side role permissions
- Transactional audit logging

### Refill Workflow

Supported states:

```text
NEW
PHARMACY_REVIEW
BLOCKED
MISSING_INFORMATION
AWAITING_PROVIDER
AWAITING_PATIENT
AWAITING_INSURANCE
ACTION_REQUIRED
IN_REVIEW
APPROVAL_RECEIVED
PHARMACY_PROCESSING
RESOLVED
ESCALATED
CANCELLED
```

The workflow service is the only place allowed to change refill state. It checks:

1. The refill exists.
2. The acting user exists.
3. The requested transition is valid.
4. The user role is allowed to perform the transition.
5. The database update and audit event are written together.

Invalid transitions are rejected by the server and do not modify the refill.

### Refill Queue

In the active browser demo, queue data is loaded from the local browser store, not PostgreSQL.

Route:

```text
/refills
```

The queue shows database-backed refill requests with:

- Refill ID
- Synthetic patient
- Medication
- Pharmacy
- Provider
- Current workflow state
- Blocker
- Priority
- Assigned user
- Search
- Status filters
- Priority filters

Each refill links to its detail page.

### Refill Detail

Route:

```text
/refills/[id]
```

The detail page shows:

- Synthetic patient information
- Medication information
- Pharmacy
- Provider
- Current workflow state
- Blocker
- Priority
- Assigned user
- Next action
- Workflow timeline
- Audit history
- Action center
- AI workflow insight
- Simulated communication center

In the active browser demo, timeline and audit events are persisted in the visitor's browser `localStorage`. The optional PostgreSQL API foundation persists its events in database records.

### Action Center

The action center only displays valid workflow actions for the current state.

Examples:

```text
NEW -> Start pharmacy review
AWAITING_PROVIDER -> Start provider review, Escalate
ACTION_REQUIRED -> Move to in review, Escalate
IN_REVIEW -> Record provider approval, Escalate
APPROVAL_RECEIVED -> Send to pharmacy
PHARMACY_PROCESSING -> Verify simulated pharmacy fulfillment, then resolve
```

Important actions require a confirmation dialog before calling the transition API.
Resolution is only available from `PHARMACY_PROCESSING` through the dedicated fulfillment-verification endpoint. A successful simulated pharmacy confirmation and the resolution/audit events are recorded together; a failed confirmation leaves the refill open and records the failed verification attempt.

### AI Workflow Insight

The AI feature is operational only. It does not diagnose, prescribe, approve medication, deny medication, change dosage, or make clinical decisions.

The panel displays:

- What is happening
- Blocker
- Recommended next action
- Responsible role
- Explanation
- Confidence
- Human review requirement
- Communication summary when available

The optional PostgreSQL API AI service works as follows:

1. The server loads refill context from PostgreSQL.
2. A minimal workflow context is sent to Gemini when configured.
3. Gemini output is parsed as JSON.
4. Zod validates the response.
5. Unsafe or malformed recommendations are rejected.
6. A validated recommendation is stored in `AIRecommendation`.
7. The user must review and confirm any recommended state change.
8. The existing workflow service performs the actual transition.

If Gemini is missing, unavailable, or returns invalid data, deterministic rules are used.

Example fallback:

```text
refillsRemaining === 0
-> blocker: NO_REFILLS
-> recommended state: AWAITING_PROVIDER
-> next action: Provider approval required
-> responsible role: PROVIDER
-> human review: required
```

The UI displays:

```text
AI unavailable - deterministic workflow rules are being used.
```

### Mock Integrations

All integrations are simulated and labelled `MOCK`, `SIMULATED`, or `SANDBOX`.

Implemented mock services:

- Pharmacy submission
- Provider notification
- Patient notification
- Insurance status check
- Pharmacy fulfillment
- Pharmacy notification

Each mock service returns deterministic success or failure results.

Mock failures:

- Return a failure response
- Do not advance refill state
- Persist a failed communication when applicable
- Create an audit event
- Show an error in the UI
- Provide a retry action

No real EHR, pharmacy, PBM, fax, SMS, or email service is connected.

### Communication Center

The communication center appears on the refill detail page.

Supported actions:

- Notify provider
- Notify pharmacy
- Notify patient

Before sending, the user sees a confirmation dialog stating that the message is simulated.

Each attempt stores:

- Recipient
- Recipient role
- Communication channel
- Message
- Sender
- Integration name
- Success or failure
- Error message
- Attempt count
- Timestamp

Each communication also creates an audit event and appears in the detail timeline after refresh.

### Demo Roles

The application includes a demo role selector:

- Pharmacy Staff
- Refill Coordinator
- Provider
- Practice Admin

The selector is for demonstration only and is not an authentication or production access-control system. Do not use real patient information.

The selected user is stored in a secure server cookie. The backend resolves the selected user and applies permissions server-side.

Example permissions:

- Pharmacy Staff: pharmacy review, pharmacy notification, pharmacy processing
- Refill Coordinator: assignment, provider notification, patient notification, escalation
- Provider: provider review and authorized workflow decisions
- Practice Admin: broad operational access and escalation

Hiding a button in the UI is not the security boundary. APIs also validate permissions.

### Analytics

Route:

```text
/analytics
```

Active browser demo analytics are calculated from the local browser store. The optional PostgreSQL API analytics are calculated from database data.

Metrics include:

- Total refill requests
- Open requests
- Blocked requests
- Awaiting provider
- Awaiting patient
- Resolved requests
- Escalated requests
- Average time to resolution
- Requests grouped by blocker
- Requests grouped by workflow state

### System Health

Route:

```text
/system-health
```

The health page displays:

- Database status
- AI service status
- Pharmacy integration status
- Provider notification status
- Patient notification status
- Insurance integration status

External services are clearly marked as simulated.

### Role and patient demo pages

- `/login` selects a seeded demo user and sets the existing demo-role cookie. This is a role picker, not identity verification or real authentication.
- `/provider-dashboard` and `/pharmacy-dashboard` show refill work grouped by the relevant workflow states and link to the existing refill detail/action flow. Select the matching demo role to see actions for that role.
- `/patient-tracking` looks up a refill using a synthetic demo patient ID and displays a limited status, next step, medication, and pharmacy. This is a demonstration preview, not a secure patient portal or real patient access channel.
- Patient tracking is scoped to the current demo user's organization and returns only a minimal status view. Never enter real patient information.

## 3. Database Entities

The Prisma schema contains:

- Organization
- User
- Patient
- Medication
- Pharmacy
- Provider
- RefillRequest
- WorkflowTask
- Communication
- AuditLog
- AIRecommendation

The seed script creates six fictional refill scenarios:

1. No refills remaining
2. Missing information
3. Insurance blocker
4. Provider review required
5. Successfully resolved refill
6. Escalated refill

## 4. Important API Routes

```text
GET  /api/refills
GET  /api/refills/[id]
POST /api/refills/[id]/transition
POST /api/refills/[id]/verify-fulfillment
POST /api/refills/[id]/assign
POST /api/refills/[id]/escalate
POST /api/refills/[id]/communicate
POST /api/ai/analyze-refill
GET  /api/analytics
GET  /api/system-health
GET  /api/demo/role
POST /api/demo/role
GET  /api/patient-tracking?syntheticId=SYN-DEMO-001
```

All important API inputs are validated server-side with Zod or workflow validation.

## 5. How to Run

From the project directory:

```powershell
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Open:

```text
http://localhost:3000/
```

Useful pages:

```text
http://localhost:3000/refills
http://localhost:3000/analytics
http://localhost:3000/system-health
http://localhost:3000/go-to-market
http://localhost:3000/login
http://localhost:3000/provider-dashboard
http://localhost:3000/pharmacy-dashboard
http://localhost:3000/patient-tracking
```

The Market strategy page documents the initial practice segment, buying group, customer-journey signals/actions, and pilot/pricing hypotheses. These are assumptions to validate, not proven commercial results.

## 6. Environment Variables

Create a local `.env` file.

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/refillflow?schema=public"
GEMINI_API_KEY="optional-server-side-key"
GEMINI_MODEL="gemini-2.0-flash"
DEMO_USER_ID="optional-seeded-user-id"
```

- `DATABASE_URL` is required.
- `GEMINI_API_KEY` is optional because deterministic fallback exists.
- `GEMINI_MODEL` is optional and defaults to `gemini-2.0-flash`.
- `DEMO_USER_ID` is optional and defaults to the seeded admin user.

Never commit `.env` or real secrets.

## 7. Verification Performed

Historical PostgreSQL backend verification (not required for the active browser-local demo):

- PostgreSQL database reads and writes
- Six seeded refill records
- Prisma Client generation
- Prisma schema validation
- TypeScript validation
- Production build
- Refill queue rendering
- Refill detail rendering
- AI deterministic fallback
- Full workflow state transition chain
- Invalid transition rejection
- Role permission enforcement
- Mock communication success
- Mock communication failure
- Communication retry
- Audit event persistence
- Analytics API and page
- System health API and page
- Responsive UI rendering

There is no automated test suite in this project.

## 8. Two-Minute Demo

1. Open `/refills`.
2. Select `Refill Coordinator` from the demo role selector.
3. Open the urgent `NO_REFILLS` refill.
4. Show the AI Workflow Insight panel.
5. Explain that the AI recommends an operational next action only.
6. Confirm a workflow action through the human confirmation dialog.
7. Use the communication center to notify the provider.
8. Enable the simulated failure option and show the failed attempt.
9. Retry the communication successfully.
10. Move the refill through provider review, approval, pharmacy processing, and resolution.
11. Show the persisted timeline and audit history.
12. Open `/analytics` and show demo-store metrics.
13. Open `/system-health` and show simulated integration statuses.

## 9. Security and Safety Boundaries

- Synthetic data only
- No real patient data
- No real healthcare integrations
- No API keys in frontend code
- Server-side permission checks
- Server-side input validation
- Transactional audit logging
- Human confirmation before important actions
- AI limited to operational recommendations
- No autonomous prescribing or clinical decisions
- No HIPAA compliance claim
- Safe user-facing errors without stack traces

## 10. Known Limitations

- Demo role selection is not production authentication.
- External systems are simulated.
- Gemini is optional and falls back to deterministic rules.
- No production billing, EHR, PBM, fax, SMS, or email integrations exist.
- The configured `next lint` command is deprecated and interactive in the installed Next.js version.
- No automated test suite exists.
