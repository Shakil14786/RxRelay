'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { demoFetch as fetch } from '@/lib/demo-store';

type DashboardRole = 'PROVIDER' | 'PHARMACY_STAFF';
type Refill = {
  id: string;
  patient: { displayName: string };
  medication: { name: string; strength: string };
  pharmacy: { name: string };
  provider: { name: string };
  state: string;
  blocker: string | null;
  priority: string;
  nextAction: string | null;
};
type Props = { role: DashboardRole };

const roleCopy = {
  PROVIDER: {
    title: 'Provider dashboard',
    kicker: 'PROVIDER WORKSPACE',
    subtitle: 'Review requests waiting for provider attention. Clinical decisions remain yours.',
    states: ['AWAITING_PROVIDER', 'IN_REVIEW', 'ACTION_REQUIRED'],
    empty: 'No provider review requests are waiting in this demo queue.',
  },
  PHARMACY_STAFF: {
    title: 'Pharmacy dashboard',
    kicker: 'PHARMACY WORKSPACE',
    subtitle: 'Review submitted requests and see when a clinic, payer, or pharmacy is the next handoff.',
    states: ['NEW', 'PHARMACY_REVIEW', 'BLOCKED', 'MISSING_INFORMATION', 'AWAITING_PROVIDER', 'AWAITING_PATIENT', 'AWAITING_INSURANCE', 'ACTION_REQUIRED', 'IN_REVIEW', 'APPROVAL_RECEIVED', 'PHARMACY_PROCESSING', 'ESCALATED'],
    empty: 'No pharmacy work is waiting in this demo queue.',
  },
} satisfies Record<DashboardRole, {
  title: string;
  kicker: string;
  subtitle: string;
  states: string[];
  empty: string;
}>;

export function RoleDashboard({ role }: Props) {
  const [refills, setRefills] = useState<Refill[]>([]);
  const [viewerRole, setViewerRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const copy = roleCopy[role];

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch('/api/refills', { signal: controller.signal }),
      fetch('/api/demo/role', { signal: controller.signal }),
    ])
      .then(async ([queueResponse, roleResponse]) => {
        const [queueBody, roleBody] = await Promise.all([queueResponse.json(), roleResponse.json()]);
        if (!queueResponse.ok) throw new Error(queueBody.error || 'Unable to load the refill queue.');
        if (!roleResponse.ok) throw new Error(roleBody.error || 'Unable to load the demo role.');
        setRefills(queueBody.data);
        setViewerRole(roleBody.current.role);
      })
      .catch(caught => {
        if (!(caught instanceof DOMException && caught.name === 'AbortError')) setError(caught instanceof Error ? caught.message : 'Unable to load this dashboard.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const expectedRole = role === 'PROVIDER' ? 'PROVIDER' : 'PHARMACY_STAFF';
  const roleMatches = viewerRole === expectedRole;
  const work = roleMatches ? refills.filter(refill => copy.states.includes(refill.state)) : [];

  return (
    <>
      <div className="phase-kicker">{copy.kicker}</div>
      <h1 className="phase-title">{copy.title}</h1>
      <p className="phase-subtitle">{copy.subtitle}</p>
      <p className="demo-disclaimer">Demo workspace only. Select the matching demo role to see role-appropriate actions. This is not authentication.</p>
      {viewerRole && viewerRole !== expectedRole && (
        <div className="error-box" role="status">
          Current demo role is {viewerRole.replaceAll('_', ' ')}. <Link href="/login">Switch demo role</Link> to {roleCopy[role].title.toLowerCase()}.
        </div>
      )}
      <section className="dashboard-summary" aria-label="Work summary">
        <article className="metric-tile"><span>Requests in this view</span><strong>{loading ? '—' : work.length}</strong></article>
        <article className="metric-tile"><span>Urgent requests</span><strong>{loading ? '—' : work.filter(item => item.priority === 'URGENT').length}</strong></article>
        <article className="metric-tile"><span>Needs attention</span><strong>{loading ? '—' : work.filter(item => !['PHARMACY_PROCESSING', 'RESOLVED'].includes(item.state)).length}</strong></article>
      </section>
      {error ? <div className="error-box" role="alert">{error}</div>
        : loading ? <div className="loading" role="status">Loading role-specific refill work...</div>
          : work.length === 0 ? <div className="empty dashboard-empty">{copy.empty}</div>
            : <section className="dashboard-work" aria-label="Refill work">
              {work.map(refill => (
                <article className="detail-card dashboard-refill" key={refill.id}>
                  <div className="dashboard-refill-head">
                    <div><span className={`badge priority priority-${refill.priority}`}>{refill.priority}</span><span className={`badge state state-${refill.state}`}>{refill.state.replaceAll('_', ' ')}</span></div>
                    <Link className="primary-link" href={`/refills/${refill.id}`}>Open refill →</Link>
                  </div>
                  <h2>{refill.patient.displayName}</h2>
                  <p>{refill.medication.name} {refill.medication.strength}</p>
                  <p><strong>Blocker:</strong> {refill.blocker?.replaceAll('_', ' ') ?? 'None identified'}</p>
                  <p><strong>Next step:</strong> {refill.nextAction ?? 'Review refill details'}</p>
                  <small>{role === 'PROVIDER' ? `Pharmacy: ${refill.pharmacy.name}` : `Provider: ${refill.provider.name}`}</small>
                </article>
              ))}
            </section>}
    </>
  );
}
