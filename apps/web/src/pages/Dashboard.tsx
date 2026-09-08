import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  ArrowUpRight,
  IndianRupee,
  Handshake,
  Clock3,
  CalendarDays,
  ArrowRight,
  Check,
  Phone,
  Mail,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '../auth/Auth';
import { useData, useSave } from '../hooks/useCrm';
import { Row, money, dateLabel, label } from '../types';
import {
  LoadingState,
  ErrorState,
  KpiCard,
  Avatar,
  StatusBadge,
  EmptyState,
} from '../components/ui';
import { PageHeader, AddButton } from '../layouts/Shell';
import { ProspectForm } from '../features/prospects/ProspectForm';
import { RecordForm } from '../features/RecordForm';
export function FollowupList({ items }: { items: Row[] }) {
  const save = useSave();
  const [edit, setEdit] = useState<Row>();
  return (
    <>
      {items.length ? (
        items.map((f) => (
          <div className="followup-item" key={f.id}>
            <div className={`channel-icon ${f.type.toLowerCase()}`}>
              {f.type === 'EMAIL' ? (
                <Mail size={17} />
              ) : f.type === 'WHATSAPP' ? (
                <MessageCircle size={17} />
              ) : (
                <Phone size={17} />
              )}
            </div>
            <div className="grow">
              <Link to={`/prospects/${f.prospectId}`} className="strong">
                {f.prospect?.businessName || label(f.type)}
              </Link>
              <p>{f.notes || `${label(f.type)} follow-up`}</p>
              <small>
                {dateLabel(f.date)} · {f.time}
              </small>
            </div>
            <button className="text-button" onClick={() => setEdit(f)}>
              Reschedule
            </button>
            <button
              className="complete-button"
              disabled={save.isPending}
              aria-label={`Complete follow-up for ${f.prospect?.businessName || 'prospect'}`}
              onClick={() =>
                save.mutate({
                  path: `/followups/${f.id}`,
                  method: 'PATCH',
                  body: { status: 'COMPLETED' },
                })
              }
            >
              <Check size={16} />
            </button>
          </div>
        ))
      ) : (
        <EmptyState
          title="You’re all caught up"
          description="No follow-ups in this list."
        />
      )}
      {save.error && <ErrorState error={save.error} />}{' '}
      {edit && (
        <RecordForm
          kind="followups"
          record={edit}
          onClose={() => setEdit(undefined)}
        />
      )}
    </>
  );
}
export function Funnel({ data }: { data: Row[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="funnel">
      {data.map((d, i) => (
        <div className="funnel-row" key={d.name}>
          <span>{d.name}</span>
          <div className="funnel-track">
            <div
              style={{
                width: `${Math.max(2, (d.value / max) * 100)}%`,
                background: [
                  '#24594a',
                  '#3e7560',
                  '#64917b',
                  '#8aab91',
                  '#b0c5a7',
                  '#d2dfbf',
                ][i],
              }}
            />
          </div>
          <strong>{d.value}</strong>
        </div>
      ))}
    </div>
  );
}
export function Dashboard() {
  const { user } = useAuth();
  const query = useData('/dashboard');
  const [add, setAdd] = useState(false);
  if (query.isPending) return <LoadingState />;
  if (query.error) return <ErrorState error={query.error} />;
  const d = query.data,
    k = d.kpis;
  return (
    <>
      <PageHeader
        eyebrow="YOUR BUSINESS, AT A GLANCE"
        title={`Good to see you, ${user!.firstName}.`}
        description="Here’s what’s happening with your business today."
        action={
          <div className="header-actions">
            <span className="date-chip">
              <CalendarDays size={15} />
              {dateLabel(d.today)}
            </span>
            <AddButton onClick={() => setAdd(true)} />
          </div>
        }
      />
      <div className="overview-label">
        <h2>Overview</h2>
        <span className="muted">Your entire workspace · All time</span>
      </div>
      <div className="kpi-grid">
        <KpiCard
          title="Total prospects"
          value={k.total}
          subtitle={`+${k.newThisWeek} added in the last 7 days`}
          icon={<Users size={18} />}
        />
        <KpiCard
          title="Pipeline value"
          value={money(k.pipeline)}
          subtitle="Across all open deals"
          icon={<IndianRupee size={18} />}
        />
        <KpiCard
          title="Won clients"
          value={k.won}
          subtitle={`${d.rates.conversion}% prospect conversion`}
          icon={<Handshake size={18} />}
        />
        <KpiCard
          title="Booked revenue"
          value={money(k.revenue)}
          subtitle="Total value of won deals"
          icon={<ArrowUpRight size={18} />}
          accent
        />
      </div>
      <div className="metric-strip">
        {[
          ['Contacted', k.contacted],
          ['Due today', k.followupsToday],
          ['Meetings scheduled', k.meetings],
          ['Proposals sent', k.proposals],
          ['Lost opportunities', k.lost],
        ].map(([t, v]) => (
          <div key={t}>
            <span>{t}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
      <div className="dashboard-columns">
        <section className="card">
          <div className="card-header">
            <div>
              <h2>Sales funnel</h2>
              <p>Every conversation is a step forward.</p>
            </div>
            <Link className="text-link" to="/analytics">
              View analytics <ArrowUpRight size={15} />
            </Link>
          </div>
          <Funnel data={d.funnel} />
          <div className="funnel-summary">
            <span>
              <i /> Prospect-to-client conversion
            </span>
            <strong>
              {d.rates.conversion}% <ArrowUpRight size={16} />
            </strong>
          </div>
        </section>
        <section className="card">
          <div className="card-header">
            <div>
              <h2>
                Today’s follow-ups{' '}
                <span className="count-pill">{d.todayFollowups.length}</span>
              </h2>
              <p>A timely hello goes a long way.</p>
            </div>
            <Link className="text-link" to="/followups">
              View all <ArrowUpRight size={15} />
            </Link>
          </div>
          {d.overdueFollowups.length > 0 && (
            <Link to="/today" className="overdue-banner">
              <Clock3 size={15} />
              {d.overdueFollowups.length} overdue follow-ups need your attention
              <ArrowRight size={15} />
            </Link>
          )}
          <FollowupList items={d.todayFollowups.slice(0, 3)} />
        </section>
      </div>
      <div className="dashboard-columns lower">
        <section className="card">
          <div className="card-header">
            <div>
              <h2>Recently added prospects</h2>
              <p>Fresh opportunities for your studio.</p>
            </div>
            <Link className="text-link" to="/prospects">
              All prospects <ArrowUpRight size={15} />
            </Link>
          </div>
          {d.recentProspects.length ? (
            <div className="mini-table">
              {d.recentProspects.map((p: Row) => (
                <Link
                  className="prospect-mini"
                  key={p.id}
                  to={`/prospects/${p.id}`}
                >
                  <Avatar name={p.businessName} />
                  <div className="grow">
                    <strong>{p.businessName}</strong>
                    <small>
                      {p.businessCategory} · {p.city}
                    </small>
                  </div>
                  <StatusBadge value={p.status} />
                  <span className="mini-value">{money(p.estimatedValue)}</span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </section>
        <section className="card">
          <div className="card-header">
            <div>
              <h2>Recent activity</h2>
              <p>The small steps that move things along.</p>
            </div>
            <span className="live-label">
              <i />
              Live
            </span>
          </div>
          <div className="timeline">
            {d.activities.slice(0, 5).map((a: Row) => (
              <div className="timeline-item" key={a.id}>
                <span className="timeline-dot" />
                <div>
                  <p>{a.description}</p>
                  <Link to={`/prospects/${a.prospectId}`}>
                    {a.prospect.businessName}
                  </Link>
                  <small>
                    {dateLabel(a.createdAt)} · {a.user.firstName}
                  </small>
                </div>
              </div>
            ))}
            {!d.activities.length && (
              <EmptyState title="Your story starts here" />
            )}
          </div>
        </section>
      </div>
      <Link to="/today" className="daily-banner">
        <span className="daily-icon">✧</span>
        <div>
          <strong>A little focus. A lot of possibility.</strong>
          <p>Your daily workspace brings your next best actions together.</p>
        </div>
        <span>
          Open today’s workspace <ArrowRight size={17} />
        </span>
      </Link>
      {add && <ProspectForm onClose={() => setAdd(false)} />}
    </>
  );
}
