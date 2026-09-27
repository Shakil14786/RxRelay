import { PhaseHeader } from '@/components/phase-header';
import { RoleDashboard } from '@/components/role-dashboard';

export default function PharmacyDashboardPage() {
  return <div className="phase-shell"><PhaseHeader /><main className="phase-main"><RoleDashboard role="PHARMACY_STAFF" /></main></div>;
}
