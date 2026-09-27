import Link from 'next/link';
import { DemoRoleSelector } from './demo-role-selector';

export function PhaseHeader() {
  return <header className="phase-header"><Link className="phase-brand" href="/refills">Rx<span>Relay</span></Link><nav aria-label="Primary navigation"><Link href="/refills">Refill queue</Link><Link href="/provider-dashboard">Provider</Link><Link href="/pharmacy-dashboard">Pharmacy</Link><Link href="/patient-tracking">Patient tracking</Link><Link href="/analytics">Analytics</Link><Link href="/go-to-market">Market strategy</Link><Link href="/system-health">System health</Link><Link href="/login">Demo login</Link><Link href="/">Overview</Link></nav><DemoRoleSelector /></header>;
}
