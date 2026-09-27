import { PatientTracking } from '@/components/patient-tracking';
import { PhaseHeader } from '@/components/phase-header';

export default function PatientTrackingPage() {
  return <div className="phase-shell"><PhaseHeader /><main className="phase-main">
    <div className="phase-kicker">PATIENT EXPERIENCE</div>
    <h1 className="phase-title">Know where your refill stands.</h1>
    <p className="phase-subtitle">A limited status preview using synthetic demo requests.</p>
    <PatientTracking />
    <p className="synthetic-note">This demo does not send patient notifications, authenticate patients, or provide a secure patient portal. Never enter real patient information.</p>
  </main></div>;
}
