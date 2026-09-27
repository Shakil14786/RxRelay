'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { demoFetch as fetch } from '@/lib/demo-store';

type Metrics = { total: number; open: number; blocked: number; awaitingProvider: number; resolved: number; escalated: number; averageResolutionHours: number };

export function Overview() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { fetch('/api/analytics').then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error); setMetrics(body.data); }).catch(() => setError('Operational metrics are temporarily unavailable.')); }, []);
  if (error) return <div className="error-box" role="alert">{error}</div>;
  if (!metrics) return <div className="overview-loading" role="status"><span /><span /><span /></div>;
  const cards = [
    { label: 'Refills requiring attention', value: metrics.open, detail: 'Open operational work', href: '/refills', tone: 'coral' },
    { label: 'Blocked refills', value: metrics.blocked, detail: 'Need a next action', href: '/refills?status=BLOCKED', tone: 'amber' },
    { label: 'Awaiting provider', value: metrics.awaitingProvider, detail: 'Provider action pending', href: '/refills?status=AWAITING_PROVIDER', tone: 'blue' },
    { label: 'Resolved', value: metrics.resolved, detail: `${metrics.averageResolutionHours} hrs average`, href: '/analytics', tone: 'green' },
  ];
  return <><div className="overview-strip"><span className="live-dot" /> Live operations view <span className="overview-divider" /> {metrics.total} synthetic refill requests tracked</div><section className="overview-grid">{cards.map(card => <Link href={card.href} className={`overview-card overview-${card.tone}`} key={card.label}><div><span>{card.label}</span><strong>{card.value}</strong><small>{card.detail}</small></div><b>→</b></Link>)}</section><section className="overview-flow"><div><span className="phase-kicker">HOW REFILLFLOW WORKS</span><h2>One clear next step at every handoff.</h2></div><div className="flow-steps"><span className="flow-done">Understand</span><i>→</i><span className="flow-done">Route</span><i>→</i><span className="flow-active">Act</span><i>→</i><span>Verify</span><i>→</i><span>Resolve</span></div></section></>;
}
