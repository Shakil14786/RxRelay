'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { demoFetch as fetch } from '@/lib/demo-store';

type DemoUser = { id: string; name: string; role: string };
const roleLabels: Record<string, string> = {
  PROVIDER: 'Provider',
  PHARMACY_STAFF: 'Pharmacy staff',
  PRACTICE_STAFF: 'Refill coordinator',
  ADMIN: 'Practice admin',
};

export function DemoLogin() {
  const [users, setUsers] = useState<DemoUser[]>([]);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/demo/role')
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Unable to load demo accounts.');
        setUsers(body.users);
        setSelected(body.current.id);
      })
      .catch(caught => setError(caught instanceof Error ? caught.message : 'Unable to load demo accounts.'));
  }, []);

  async function enterDemo() {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/demo/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selected }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to enter the demo.');
      const destination = body.user.role === 'PROVIDER'
        ? '/provider-dashboard'
        : body.user.role === 'PHARMACY_STAFF'
          ? '/pharmacy-dashboard'
          : '/refills';
      window.location.assign(destination);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to enter the demo.');
      setSaving(false);
    }
  }

  return (
    <section className="detail-card demo-login-card">
      <div className="phase-kicker">DEMO ACCESS</div>
      <h2>Choose a workspace role</h2>
      <p>This prototype uses seeded demo users. It does not verify your identity or create a real account.</p>
      <label htmlFor="demo-user">Continue as</label>
      <select id="demo-user" value={selected} onChange={event => setSelected(event.target.value)} disabled={!users.length || saving}>
        {users.map(user => <option key={user.id} value={user.id}>{roleLabels[user.role] ?? user.role} · {user.name}</option>)}
      </select>
      {error && <div className="error-box" role="alert">{error}</div>}
      <button className="overview-primary" disabled={!selected || saving} onClick={enterDemo}>{saving ? 'Opening workspace...' : 'Continue to workspace'} <span>→</span></button>
      <Link className="back-link" href="/">Back to overview</Link>
    </section>
  );
}
