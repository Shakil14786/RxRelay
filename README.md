# RxRelay

RxRelay is a synthetic-data MVP foundation for prescription refill orchestration.

The active application is the Next.js app in `src/app`; start it with `npm run dev` and open `http://localhost:3000`. The interactive demo uses bundled synthetic data and saves changes in each visitor's browser `localStorage`, so it works on Vercel without a hosted database. Data is not shared between visitors and is removed if browser site data is cleared. Use the landing-page reset control to restore the original demo examples.

Prisma/PostgreSQL schemas and API routes remain in the repository as a separate backend foundation, but the active browser demo does not call those database routes.

## Phase 1 scope

- Prisma PostgreSQL schema and optional server API foundation
- Bundled browser-local synthetic seed data with six refill scenarios
- Centralized, allow-listed workflow state machine
- Zod transition validation
- Role and permission definitions
- Deterministic blocker rules
- Transactional audit logging for transitions
- Pharmacy fulfillment verification before a refill can be resolved
- A B2B customer-journey and go-to-market hypothesis at `/go-to-market`
- Demo role entry at `/login` and role-specific provider/pharmacy dashboard views
- Synthetic-ID refill status preview at `/patient-tracking` (not a secure patient portal)
- Browser-local mock workflows, role selection, analytics, patient lookup, and activity history

All demonstration data is synthetic and does not represent real patients. This project is not a HIPAA compliance claim and has no real healthcare integrations.
The role selector is a demonstration tool, not authentication or production access control. Do not enter real patient information.
Browser storage is not a shared or durable production database. Do not use real patient information.
