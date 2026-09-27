import { PhaseHeader } from '@/components/phase-header';
import { RefillWorkspace } from '@/components/refill-workspace';

type PageProps = { params: Promise<{ id: string }> };

export default async function RefillDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <div className="phase-shell"><PhaseHeader /><main className="phase-main"><RefillWorkspace id={id} /></main></div>;
}
