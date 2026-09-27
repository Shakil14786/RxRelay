'use client';

import { FormEvent, useState } from 'react';
import { demoFetch as fetch } from '@/lib/demo-store';

type TrackingResult = {
  patientId: string;
  medication: string;
  state: string;
  blocker: string | null;
  nextStep: string;
  pharmacy: string;
  pharmacyLocation: string;
  updatedAt: string;
};

const stateLabels: Record<string, string> = {
  NEW: 'Request received',
  PHARMACY_REVIEW: 'Pharmacy is reviewing the request',
  BLOCKED: 'More information is needed to continue',
  MISSING_INFORMATION: 'The clinic needs more information',
  AWAITING_PROVIDER: 'Waiting for the provider',
  AWAITING_PATIENT: 'Waiting for you or your care team',
  AWAITING_INSURANCE: 'Insurance requirement is being checked',
  ACTION_REQUIRED: 'Your care team is taking action',
  IN_REVIEW: 'Provider review is in progress',
  APPROVAL_RECEIVED: 'Provider response received',
  PHARMACY_PROCESSING: 'Pharmacy is preparing the refill',
  RESOLVED: 'Refill processing is complete',
  ESCALATED: 'The care team is following up',
  CANCELLED: 'This refill request was closed',
};

export function PatientTracking() {
  const [syntheticId, setSyntheticId] = useState('');
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function track(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`/api/patient-tracking?syntheticId=${encodeURIComponent(syntheticId.trim())}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to find that demo refill.');
      setResult(body.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to find that demo refill.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="detail-card tracking-card">
      <div className="phase-kicker">PATIENT STATUS PREVIEW</div>
      <h2>Track a demo refill</h2>
      <p>Enter a synthetic demo patient ID, such as SYN-DEMO-001. This preview is not a patient account or a secure real-world tracking service.</p>
      <form className="tracking-form" onSubmit={track}>
        <label htmlFor="synthetic-id">Synthetic patient ID</label>
        <div><input id="synthetic-id" value={syntheticId} onChange={event => setSyntheticId(event.target.value)} placeholder="SYN-DEMO-001" required maxLength={40} /><button className="overview-primary" disabled={loading}>{loading ? 'Checking...' : 'Check status'} <span>→</span></button></div>
      </form>
      {error && <div className="error-box" role="alert">{error}</div>}
      {result && <article className="tracking-result" aria-live="polite">
        <div className="dashboard-refill-head"><div className="phase-kicker">REFILL STATUS</div><span className={`badge state state-${result.state}`}>{result.state.replaceAll('_', ' ')}</span></div>
        <h3>{stateLabels[result.state] ?? result.state}</h3>
        <p><strong>Medication:</strong> {result.medication}</p>
        <p><strong>Next step:</strong> {result.nextStep}</p>
        <p><strong>Pharmacy:</strong> {result.pharmacy} · {result.pharmacyLocation}</p>
        <small>Last updated {new Date(result.updatedAt).toLocaleString()}</small>
      </article>}
    </section>
  );
}
