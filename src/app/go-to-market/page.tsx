import { PhaseHeader } from '@/components/phase-header';

const stages = [
  {
    name: 'Awareness',
    signal: 'A practice reports frequent refill calls, faxes, or requests with no clear owner.',
    action: 'Reach practice operations leaders through targeted outreach, pharmacy referrals, and a short refill-gap benchmark.',
  },
  {
    name: 'Qualification',
    signal: 'The practice can identify a refill coordinator, estimate request volume, and share a de-identified sample workflow.',
    action: 'Run a workflow discovery session; quantify handoffs, aging requests, and time spent on follow-up.',
  },
  {
    name: 'Pilot',
    signal: 'An operations champion and provider sponsor agree to a small, measurable pilot using synthetic or approved test data.',
    action: 'Configure roles and queues, train staff, and pilot with one team and a narrow set of administrative blockers.',
  },
  {
    name: 'Adoption',
    signal: 'Staff actively use the queue, assign next steps, and record outcomes; providers respond within the agreed workflow.',
    action: 'Review weekly workflow data, resolve onboarding friction, and keep clinical decisions with authorized professionals.',
  },
  {
    name: 'Renewal and expansion',
    signal: 'The pilot improves time-to-resolution and follow-up workload without increasing unresolved or incorrectly closed requests.',
    action: 'Share a measured outcome review, renew the team, then expand to additional locations or pharmacy partners.',
  },
];

export default function GoToMarketPage() {
  return (
    <div className="phase-shell">
      <PhaseHeader />
      <main className="phase-main">
        <div className="phase-kicker">CUSTOMER JOURNEY</div>
        <h1 className="phase-title">Start where refill work gets stuck.</h1>
        <p className="phase-subtitle">A focused B2B path from a measurable practice pilot to repeatable adoption.</p>

        <section className="detail-card market-position">
          <div>
            <span className="fact-label">INITIAL MARKET</span>
            <strong>Independent and small-group primary-care practices</strong>
            <p>They manage recurring refill volume with lean teams, making handoff delays visible and a focused pilot practical.</p>
          </div>
          <div>
            <span className="fact-label">BUYING GROUP</span>
            <strong>Practice manager buys; refill coordinator uses</strong>
            <p>Providers influence workflow and retain clinical authority. Pharmacy partners can refer practices and validate handoff needs.</p>
          </div>
        </section>

        <section className="market-funnel" aria-label="Customer journey stages">
          {stages.map((stage, index) => (
            <article className="detail-card market-stage" key={stage.name}>
              <div className="market-stage-heading">
                <span className="market-stage-number">0{index + 1}</span>
                <h2>{stage.name}</h2>
              </div>
              <div>
                <span className="fact-label">ADVANCE SIGNAL</span>
                <p>{stage.signal}</p>
              </div>
              <div>
                <span className="fact-label">NEXT ACTION</span>
                <p>{stage.action}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="analytics-grid market-bottom">
          <article className="detail-card">
            <h2>Commercial hypothesis</h2>
            <p>Offer a time-boxed, paid pilot with implementation support; price the ongoing service per practice location or refill-volume tier. Validate willingness to pay and support cost during pilots before setting a permanent price.</p>
          </article>
          <article className="detail-card">
            <h2>Value and expansion signals</h2>
            <p>Track median time from request to verified outcome, aged open refills, staff follow-up touches, provider response time, and percentage resolved with a recorded verification. Compare against the pilot baseline, then expand only when workflow quality holds.</p>
          </article>
        </section>
        <p className="synthetic-note">Market, pricing, and pilot details are hypotheses for validation. This demonstration uses synthetic data and simulated integrations.</p>
      </main>
    </div>
  );
}
