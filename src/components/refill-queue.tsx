'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { demoFetch as fetch } from '@/lib/demo-store';

type Refill = { id: string; patient: { displayName: string }; medication: { name: string; strength: string }; pharmacy: { name: string }; provider: { name: string }; state: string; blocker: string | null; priority: string; tasks: { assignee: { name: string } | null }[] };
const states = ['', 'NEW', 'BLOCKED', 'AWAITING_PROVIDER', 'MISSING_INFORMATION', 'AWAITING_INSURANCE', 'IN_REVIEW', 'APPROVAL_RECEIVED', 'PHARMACY_PROCESSING', 'RESOLVED', 'ESCALATED'];
const priorities = ['', 'URGENT', 'HIGH', 'NORMAL', 'LOW'];

export function RefillQueue() {
  const [refills, setRefills] = useState<Refill[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [sort, setSort] = useState('priority');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (status) params.set('status', status);
    if (priority) params.set('priority', priority);
    setLoading(true);
    fetch(`/api/refills?${params}`, { signal: controller.signal })
      .then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Unable to load the refill queue.'); return body.data as Refill[]; })
      .then(data => { setRefills([...data].sort((left, right) => sort === 'patient' ? left.patient.displayName.localeCompare(right.patient.displayName) : sort === 'status' ? left.state.localeCompare(right.state) : sort === 'priority' ? ['URGENT', 'HIGH', 'NORMAL', 'LOW'].indexOf(left.priority) - ['URGENT', 'HIGH', 'NORMAL', 'LOW'].indexOf(right.priority) : 0)); setError(''); })
      .catch(caught => { if (caught.name !== 'AbortError') setError(caught.message); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [search, status, priority, sort]);

  function clearFilters() { setSearch(''); setStatus(''); setPriority(''); setSort('priority'); }

  return <>
    <div className="queue-card">
      <div className="queue-tools"><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search patient, medication, pharmacy..." aria-label="Search refills" /><select value={status} onChange={event => setStatus(event.target.value)} aria-label="Filter by status"><option value="">All statuses</option>{states.slice(1).map(value => <option key={value} value={value}>{value}</option>)}</select><select value={priority} onChange={event => setPriority(event.target.value)} aria-label="Filter by priority"><option value="">All priorities</option>{priorities.slice(1).map(value => <option key={value} value={value}>{value}</option>)}</select><select value={sort} onChange={event => setSort(event.target.value)} aria-label="Sort refills"><option value="priority">Sort: priority</option><option value="patient">Sort: patient</option><option value="status">Sort: status</option></select><button className="clear-filters" onClick={clearFilters} disabled={!search && !status && !priority && sort === 'priority'}>Clear</button></div>
      {loading ? <div className="loading" role="status">Loading synthetic refill requests...</div> : error ? <div className="error-box" role="alert">{error}</div> : refills.length === 0 ? <div className="empty">No refill requests match these filters.</div> : <div className="queue-table-wrap"><table className="phase-table"><thead><tr><th>Refill / patient</th><th>Medication</th><th>Pharmacy</th><th>Provider</th><th>Status</th><th>Blocker</th><th>Priority</th><th>Assigned</th></tr></thead><tbody>{refills.map(refill => <tr key={refill.id}><td data-label="Refill / patient"><Link className="primary-link" href={`/refills/${refill.id}`}>{refill.id.slice(-8)}</Link><div className="muted">{refill.patient.displayName}</div></td><td data-label="Medication">{refill.medication.name} {refill.medication.strength}</td><td data-label="Pharmacy">{refill.pharmacy.name}</td><td data-label="Provider">{refill.provider.name}</td><td data-label="Status"><span className={`badge state state-${refill.state}`}>{refill.state}</span></td><td data-label="Blocker">{refill.blocker ?? 'None identified'}</td><td data-label="Priority"><span className={`badge priority priority-${refill.priority}`}>{refill.priority}</span></td><td data-label="Assigned">{refill.tasks[0]?.assignee?.name ?? 'Unassigned'}</td></tr>)}</tbody></table></div>}
    </div>
  </>;
}
