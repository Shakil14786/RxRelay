import { PhaseHeader } from '@/components/phase-header';
import { RefillQueue } from '@/components/refill-queue';

export default function RefillsPage() {
  return <div className="phase-shell"><PhaseHeader /><main className="phase-main"><div className="phase-kicker">CARE OPERATIONS</div><h1 className="phase-title">Refill queue</h1><p className="phase-subtitle">See what is stuck, who owns the next step, and what needs verification.</p><RefillQueue /></main></div>;
}
