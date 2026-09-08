import { useData } from '../hooks/useCrm';
import { Row, money, label } from '../types';
import { LoadingState, ErrorState, EmptyState } from '../components/ui';
import { PageHeader } from '../layouts/Shell';
import { Funnel } from './Dashboard';
function Breakdown({ title, rows }: { title: string; rows: Row[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section className="card">
      <div className="card-header">
        <h2>{title}</h2>
        <span className="muted">Prospects · Won revenue</span>
      </div>
      <div className="breakdown">
        {rows.length ? (
          rows.map((r) => (
            <div key={r.name}>
              <div>
                <strong>{r.name}</strong>
                <span>
                  {r.count} · {money(r.revenue)}
                </span>
              </div>
              <div className="progress-track">
                <div style={{ width: `${(r.count / max) * 100}%` }} />
              </div>
            </div>
          ))
        ) : (
          <EmptyState />
        )}
      </div>
    </section>
  );
}
export function Analytics() {
  const q = useData('/analytics');
  if (q.isPending) return <LoadingState />;
  if (q.error) return <ErrorState error={q.error} />;
  const d = q.data;
  const max = Math.max(1, ...d.monthlyRevenue.map((r: Row) => r.value));
  return (
    <>
      <PageHeader
        eyebrow="A CLEARER PICTURE"
        title="Analytics"
        description="Understand what’s working. Do more of it."
      />
      <div className="rate-grid">
        {Object.entries(d.rates).map(([k, v]) => (
          <div className="card rate" key={k}>
            <span>{label(k)} rate</span>
            <strong>{v as number}%</strong>
          </div>
        ))}
      </div>
      <div className="dashboard-columns">
        <section className="card">
          <div className="card-header">
            <h2>Acquisition funnel</h2>
          </div>
          <Funnel data={d.funnel} />
          <p className="chart-note">
            Unique prospects per milestone. Stages may be skipped, so counts
            need not decrease.
          </p>
        </section>
        <section className="card">
          <div className="card-header">
            <div>
              <h2>Monthly booked revenue</h2>
              <p>Won deals by actual close date</p>
            </div>
            <strong>{money(d.kpis.revenue)}</strong>
          </div>
          <div className="revenue-chart">
            {d.monthlyRevenue.map((r: Row) => (
              <div className="chart-column" key={r.month}>
                <span>{money(r.value)}</span>
                <div
                  style={{ height: `${Math.max(2, (r.value / max) * 150)}px` }}
                />
                <small>
                  {new Date(`${r.month}-01`).toLocaleDateString('en-IN', {
                    month: 'short',
                  })}
                </small>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="dashboard-columns">
        <Breakdown title="Prospects by source" rows={d.bySource} />
        <Breakdown title="Prospects by category" rows={d.byCategory} />
      </div>
      <div className="dashboard-columns">
        <section className="card">
          <div className="card-header">
            <h2>Prospects by stage</h2>
          </div>
          <div className="stage-stats">
            {Object.entries(d.counts).map(([k, v]) => (
              <div key={k}>
                <span>{label(k)}</span>
                <strong>{v as number}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="card">
          <div className="card-header">
            <h2>Outreach performance</h2>
          </div>
          <div className="stage-stats">
            {Object.entries(d.outreachStats).map(([k, v]) => (
              <div key={k}>
                <span>{label(k)}</span>
                <strong>{v as number}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="info-banner">
        Best source: <strong>{d.bySource[0]?.name || 'Not enough data'}</strong>{' '}
        · Best category:{' '}
        <strong>{d.byCategory[0]?.name || 'Not enough data'}</strong>. Ranked by
        won revenue, then won clients, then prospect volume.
      </div>
      <p className="chart-note">
        Contact = contacted / prospects. Response = replied / contacted. Meeting
        = meeting prospects / contacted. Proposal = proposal prospects / meeting
        prospects. Close = clients / proposal prospects. Conversion = clients /
        prospects. Revenue means booked deal value, not cash collected. Outreach
        counts are manually recorded attempts.
      </p>
    </>
  );
}
