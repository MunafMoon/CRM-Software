import { Link } from 'react-router-dom';
import { Sun, ArrowUpRight } from 'lucide-react';
import { useData } from '../hooks/useCrm';
import { Row, dateLabel, money, label } from '../types';
import { LoadingState, ErrorState, Avatar, EmptyState } from '../components/ui';
import { PageHeader } from '../layouts/Shell';
import { FollowupList } from './Dashboard';
export function Today() {
  const q = useData('/dashboard');
  if (q.isPending) return <LoadingState />;
  if (q.error) return <ErrorState error={q.error} />;
  const d = q.data;
  return (
    <>
      <PageHeader
        eyebrow={dateLabel(d.today)}
        title="Make today count."
        description="A little focus on the right things goes a long way."
        action={
          <span className="date-chip">
            <Sun size={18} />
            Your daily workspace
          </span>
        }
      />
      <div className="target-grid">
        {Object.entries(d.targets).map(([key, value]) => {
          const t = value as Row;
          return (
            <div className="card target" key={key}>
              <span>
                {key === 'prospects'
                  ? 'Prospects contacted'
                  : key === 'followups'
                    ? 'Follow-ups completed'
                    : 'Meetings scheduled'}
              </span>
              <strong>
                {t.done}
                <small> / {t.target}</small>
              </strong>
              <div className="progress-track">
                <div
                  style={{
                    width: `${Math.min(100, (t.done / t.target) * 100)}%`,
                  }}
                />
              </div>
              <small>
                {Math.max(0, t.target - t.done)} to reach today’s target
              </small>
            </div>
          );
        })}
      </div>
      <div className="dashboard-columns">
        <section className="card">
          <div className="card-header">
            <h2>
              Today’s follow-ups{' '}
              <span className="count-pill">{d.todayFollowups.length}</span>
            </h2>
          </div>
          <FollowupList items={d.todayFollowups} />
        </section>
        <section className="card">
          <div className="card-header">
            <h2>
              Overdue{' '}
              <span className="count-pill warm">
                {d.overdueFollowups.length}
              </span>
            </h2>
          </div>
          <FollowupList items={d.overdueFollowups} />
        </section>
      </div>
      <div className="dashboard-columns">
        {[
          ['New prospects to contact', d.newProspects],
          ['Interested prospects', d.interestedProspects],
          ['Meetings today', d.todayMeetings],
          ['Pending proposals', d.pendingProposals],
        ].map(([title, rows]) => (
          <section className="card" key={title as string}>
            <div className="card-header">
              <h2>{title as string}</h2>
              <ArrowUpRight size={16} />
            </div>
            {(rows as Row[]).length ? (
              (rows as Row[]).map((p) => (
                <Link
                  key={p.id}
                  to={`/prospects/${p.prospectId || p.id}`}
                  className="prospect-mini"
                >
                  <Avatar name={p.businessName || p.prospect.businessName} />
                  <div className="grow">
                    <strong>{p.businessName || p.title}</strong>
                    <small>
                      {p.meetingTime
                        ? `${p.meetingTime} · ${label(p.meetingType)}`
                        : p.serviceType || p.businessCategory}
                    </small>
                  </div>
                  <span>{money(p.value || p.estimatedValue || 0)}</span>
                </Link>
              ))
            ) : (
              <EmptyState
                title="Nothing pending"
                description="Your next opportunity is a conversation away."
              />
            )}
          </section>
        ))}
      </div>
      <section className="card">
        <div className="card-header">
          <h2>Upcoming follow-ups</h2>
          <Link className="text-link" to="/followups">
            View all →
          </Link>
        </div>
        <FollowupList items={d.upcomingFollowups} />
      </section>
    </>
  );
}
