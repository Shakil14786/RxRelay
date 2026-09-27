import { DemoLogin } from '@/components/demo-login';
import { PhaseHeader } from '@/components/phase-header';

export default function LoginPage() {
  return <div className="phase-shell"><PhaseHeader /><main className="phase-main demo-login-main">
    <div className="phase-kicker">WELCOME TO RXRELAY</div>
    <h1 className="phase-title">Enter the demo workspace.</h1>
    <p className="phase-subtitle">Choose a seeded role to explore its workflow.</p>
    <DemoLogin />
    <p className="synthetic-note">Demo role selection is not identity verification, login security, or production access control. Synthetic data only.</p>
  </main></div>;
}
