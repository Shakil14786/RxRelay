'use client';

import { useEffect, useState } from 'react';
import { demoFetch as fetch } from '@/lib/demo-store';
import { PhaseHeader } from '@/components/phase-header';

export default function SystemHealthPage() { const [health, setHealth] = useState<Record<string, string> | null>(null); const [error, setError] = useState(''); useEffect(() => { fetch('/api/system-health').then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error); setHealth(body.data); }).catch(caught => setError(caught.message)); }, []); return <div className="phase-shell"><PhaseHeader /><main className="phase-main"><div className="phase-kicker">OPERATIONS</div><h1 className="phase-title">System health</h1><p className="phase-subtitle">Service visibility for the RxRelay demonstration environment.</p>{error ? <div className="error-box">{error}</div> : !health ? <div className="loading">Checking system health...</div> : <section className="health-grid">{Object.entries(health).map(([name, status]) => <article className="health-card" key={name}><div><span className={`health-dot health-${status.toLowerCase()}`} />{name.replace(/([A-Z])/g, ' $1').trim()}</div><strong className={`health-label health-${status.toLowerCase()}`}>{status}</strong>{status === 'Simulated' && <small>MOCK / SANDBOX</small>}</article>)}</section>}</main></div>; }
