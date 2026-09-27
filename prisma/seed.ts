import { PrismaClient, BlockerType, Priority, RefillState, UserRole } from '@prisma/client';
import { determineBlocker } from '../src/lib/blockers';

const prisma = new PrismaClient();

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.aIRecommendation.deleteMany();
  await prisma.communication.deleteMany();
  await prisma.workflowTask.deleteMany();
  await prisma.refillRequest.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.medication.deleteMany();
  await prisma.pharmacy.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const organization = await prisma.organization.create({ data: { name: 'Northstar Primary Care - Demo' } });
  const [admin, practiceStaff, provider, pharmacyStaff] = await Promise.all([
    prisma.user.create({ data: { organizationId: organization.id, name: 'Alex Morgan', email: 'alex.morgan@northstar.demo', role: UserRole.ADMIN } }),
    prisma.user.create({ data: { organizationId: organization.id, name: 'Priya Shah', email: 'priya.shah@northstar.demo', role: UserRole.PRACTICE_STAFF } }),
    prisma.user.create({ data: { organizationId: organization.id, name: 'Dr. Jordan Lee', email: 'jordan.lee@northstar.demo', role: UserRole.PROVIDER } }),
    prisma.user.create({ data: { organizationId: organization.id, name: 'Morgan Ellis', email: 'morgan.ellis@northstar.demo', role: UserRole.PHARMACY_STAFF } }),
  ]);

  const pharmacy = await prisma.pharmacy.create({ data: { organizationId: organization.id, name: 'Harborview Pharmacy (MOCK)', location: 'Synthetic City' } });
  const providerRecord = await prisma.provider.create({ data: { organizationId: organization.id, name: provider.name, specialty: 'Primary Care' } });
  const medications = await Promise.all([
    prisma.medication.create({ data: { name: 'Lisinopril', strength: '20 mg' } }),
    prisma.medication.create({ data: { name: 'Metformin ER', strength: '500 mg' } }),
    prisma.medication.create({ data: { name: 'Atorvastatin', strength: '40 mg' } }),
    prisma.medication.create({ data: { name: 'Levothyroxine', strength: '75 mcg' } }),
    prisma.medication.create({ data: { name: 'Amlodipine', strength: '10 mg' } }),
    prisma.medication.create({ data: { name: 'Eliquis', strength: '5 mg' } }),
  ]);
  const patientNames = ['Elena Rodriguez', 'Marcus Chen', 'Sofia Patel', 'Daniel Nguyen', 'Linda ONeil', 'Jamie Brooks'];
  const patients = await Promise.all(patientNames.map((displayName, index) => prisma.patient.create({ data: { organizationId: organization.id, displayName, syntheticId: `SYN-DEMO-${String(index + 1).padStart(3, '0')}` } })));

  const scenarios = [
    { patient: patients[0], medication: medications[0], blockerInput: { refillsRemaining: 0 }, state: RefillState.AWAITING_PROVIDER, priority: Priority.URGENT, reason: 'Synthetic scenario: no refills remain.' },
    { patient: patients[1], medication: medications[1], blockerInput: { refillsRemaining: 2, requiredInformation: 'recent blood pressure reading' }, state: RefillState.MISSING_INFORMATION, priority: Priority.HIGH, reason: 'Synthetic scenario: required information is missing.' },
    { patient: patients[2], medication: medications[2], blockerInput: { refillsRemaining: 2, insuranceStatus: 'BLOCKED' }, state: RefillState.AWAITING_INSURANCE, priority: Priority.HIGH, reason: 'Synthetic scenario: payer coverage check is blocked.' },
    { patient: patients[3], medication: medications[3], blockerInput: { refillsRemaining: 1, providerReviewRequired: true }, state: RefillState.AWAITING_PROVIDER, priority: Priority.NORMAL, reason: 'Synthetic scenario: provider review is required.' },
    { patient: patients[4], medication: medications[4], blockerInput: { refillsRemaining: 3 }, state: RefillState.RESOLVED, priority: Priority.NORMAL, reason: 'Synthetic scenario: refill successfully resolved.' },
    { patient: patients[5], medication: medications[5], blockerInput: { refillsRemaining: 0 }, state: RefillState.ESCALATED, priority: Priority.URGENT, reason: 'Synthetic scenario: escalation after missed response SLA.' },
  ];

  for (const scenario of scenarios) {
    const blocker = determineBlocker(scenario.blockerInput);
    const refill = await prisma.refillRequest.create({
      data: {
        organizationId: organization.id,
        patientId: scenario.patient.id,
        medicationId: scenario.medication.id,
        pharmacyId: pharmacy.id,
        providerId: providerRecord.id,
        state: scenario.state,
        blocker: blocker.blocker,
        priority: scenario.priority,
        refillsRemaining: scenario.blockerInput.refillsRemaining,
        requiredInformation: scenario.blockerInput.requiredInformation,
        insuranceStatus: scenario.blockerInput.insuranceStatus,
        nextAction: blocker.nextAction,
        reason: scenario.reason,
        resolvedAt: scenario.state === RefillState.RESOLVED ? new Date() : undefined,
      },
    });
    await prisma.auditLog.create({ data: { refillId: refill.id, userId: pharmacyStaff.id, previousState: null, newState: RefillState.NEW, reason: 'Synthetic refill received from mock pharmacy.', metadata: { synthetic: true } } });
    await prisma.auditLog.create({ data: { refillId: refill.id, userId: admin.id, previousState: RefillState.NEW, newState: scenario.state, reason: scenario.reason, metadata: { seeded: true, synthetic: true } } });
    if (scenario.state === RefillState.AWAITING_PROVIDER) {
      await prisma.workflowTask.create({ data: { refillId: refill.id, assigneeId: practiceStaff.id, title: blocker.nextAction } });
    }
  }

  console.log(`Seeded ${scenarios.length} synthetic refill scenarios for ${organization.name}.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
