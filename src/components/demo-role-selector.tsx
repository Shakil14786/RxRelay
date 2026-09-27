'use client';

import { useEffect, useState } from 'react';
import { demoFetch as fetch } from '@/lib/demo-store';

type DemoUser = { id: string; name: string; role: string };
const roleLabels: Record<string, string> = { PHARMACY_STAFF: 'Pharmacy Staff', PRACTICE_STAFF: 'Refill Coordinator', PROVIDER: 'Provider', ADMIN: 'Practice Admin' };

export function DemoRoleSelector() {
  const [users, setUsers] = useState<DemoUser[]>([]); const [selected, setSelected] = useState('');
  useEffect(() => { fetch('/api/demo/role').then(response => response.json()).then(body => { setUsers(body.users ?? []); setSelected(body.current?.id ?? ''); }).catch(() => undefined); }, []);
  async function changeRole(userId: string) { const response = await fetch('/api/demo/role', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) }); if (response.ok) { setSelected(userId); window.location.reload(); } }
  return <label className="role-switcher"><span>DEMO ROLE</span><select value={selected} onChange={event => changeRole(event.target.value)} aria-label="Select demo role">{users.map(user => <option key={user.id} value={user.id}>{roleLabels[user.role] ?? user.role} · {user.name}</option>)}</select></label>;
}
