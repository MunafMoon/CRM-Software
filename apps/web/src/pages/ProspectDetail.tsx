import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Phone,
  Mail,
  MessageCircle,
  Globe,
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../auth/Auth';
import { useData, useSave } from '../hooks/useCrm';
import { Row, money, dateLabel, label } from '../types';
import {
  LoadingState,
  ErrorState,
  Avatar,
  StatusBadge,
  PriorityBadge,
  ConfirmationDialog,
  EmptyState,
} from '../components/ui';
import { ProspectForm } from '../features/prospects/ProspectForm';
import { RecordForm } from '../features/RecordForm';
import { FollowupList } from './Dashboard';
export function ProspectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const cache = useQueryClient();
  const { user } = useAuth();
  const query = useData(`/prospects/${id}`);
  const save = useSave();
  const [edit, setEdit] = useState(false);
  const [kind, setKind] = useState('');
  const [tab, setTab] = useState('Activity');
  const [note, setNote] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (query.isPending) return <LoadingState />;
  if (query.error) return <ErrorState error={query.error} />;
  const p = query.data;
  async function mark(status: string) {
    await save.mutateAsync({
      path: `/prospects/${id}`,
      body: { ...p, status },
      method: 'PUT',
    });
  }
  const external = (url: string) => /^https?:\/\//i.test(url);
  return (
    <>
      <Link className="back-link" to="/prospects">
        <ArrowLeft size={16} />
        All prospects
      </Link>
      <div className="detail-header">
        <Avatar name={p.businessName} />
        <div className="grow">
          <h1>{p.businessName}</h1>
          <p>
            {p.businessCategory} <span>·</span> {p.city}, {p.state}
          </p>
        </div>
        <button className="button secondary" onClick={() => setEdit(true)}>
          <Pencil size={15} />
          Edit prospect
        </button>
        {user?.role === 'ADMIN' && (
          <button
            className="icon-button"
            aria-label="Delete prospect"
            onClick={() => setDeleting(true)}
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
      <div className="detail-layout">
        <aside className="card detail-info">
          <div className="detail-badges">
            <StatusBadge value={p.status} />
            <PriorityBadge value={p.priority} />
          </div>
          <span className="muted">Estimated deal value</span>
          <h2 className="deal-value">{money(p.estimatedValue)}</h2>
          <div className="quick-contact">
            {p.phone && (
              <a href={`tel:+${p.phone}`} aria-label="Call prospect">
                <Phone size={18} />
              </a>
            )}
            {p.email && (
              <a href={`mailto:${p.email}`} aria-label="Email prospect">
                <Mail size={18} />
              </a>
            )}
            {(p.whatsapp || p.phone) && (
              <a
                target="_blank"
                rel="noreferrer"
                href={`https://wa.me/${(p.whatsapp || p.phone).replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${p.contactPerson || 'there'}, I’d love to discuss how we can help ${p.businessName}.`)}`}
                aria-label="Open WhatsApp"
              >
                <MessageCircle size={18} />
              </a>
            )}
            {p.website && external(p.website) && (
              <a
                href={p.website}
                target="_blank"
                rel="noreferrer"
                aria-label="Open website"
              >
                <Globe size={18} />
              </a>
            )}
          </div>
          <dl>
            {[
              ['Contact', p.contactPerson],
              ['Email', p.email],
              ['Phone', p.phone],
              ['Source', p.source],
              ['Assigned to', `${p.assignee.firstName} ${p.assignee.lastName}`],
              ['Country', p.country],
              ['Added', dateLabel(p.createdAt)],
            ].map(([t, v]) => (
              <div key={t}>
                <dt>{t}</dt>
                <dd>{v || '—'}</dd>
              </div>
            ))}
          </dl>
          <div className="social-links">
            {['website', 'instagram', 'linkedin']
              .filter((k) => p[k] && external(p[k]))
              .map((k) => (
                <a key={k} href={p[k]} target="_blank" rel="noreferrer">
                  {label(k)} ↗
                </a>
              ))}
          </div>
          {p.notes && (
            <div className="initial-note">
              <h3>Initial notes</h3>
              <p>{p.notes}</p>
            </div>
          )}
          <div className="detail-actions">
            <button
              className="button"
              disabled={save.isPending || p.status === 'WON'}
              onClick={() => {
                void mark('WON').catch(() => {});
              }}
            >
              Mark won
            </button>
            <button
              className="button secondary"
              disabled={save.isPending || ['WON', 'LOST'].includes(p.status)}
              onClick={() => {
                void mark('LOST').catch(() => {});
              }}
            >
              Mark lost
            </button>
          </div>
          {p.client && (
            <Link className="text-link" to="/clients">
              View clients →
            </Link>
          )}
        </aside>
        <section className="card detail-content">
          <div className="detail-toolbar">
            <button
              className="button secondary"
              onClick={() => setKind('followups')}
            >
              <Plus size={15} />
              Follow-up
            </button>
            <button
              className="button secondary"
              onClick={() => setKind('meetings')}
            >
              <Plus size={15} />
              Meeting
            </button>
            <button
              className="button secondary"
              onClick={() => setKind('deals')}
            >
              <Plus size={15} />
              Deal
            </button>
            <button
              className="button secondary"
              onClick={() => setKind('outreach')}
            >
              <Plus size={15} />
              Log outreach
            </button>
          </div>
          <div className="tabs detail-tabs">
            {[
              'Activity',
              'Notes',
              'Follow-ups',
              'Meetings',
              'Deals',
              'Communication',
            ].map((t) => (
              <button
                className={tab === t ? 'active' : ''}
                key={t}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="detail-tab-body">
            {tab === 'Activity' && (
              <div className="timeline">
                {p.activities.map((a: Row) => (
                  <div className="timeline-item" key={a.id}>
                    <span className="timeline-dot" />
                    <div>
                      <p>{a.description}</p>
                      <small>
                        {dateLabel(a.createdAt)} ·{' '}
                        {new Date(a.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Asia/Kolkata',
                        })}{' '}
                        · {a.user.firstName}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {tab === 'Notes' && (
              <>
                <form
                  className="note-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    save.mutate(
                      {
                        path: `/prospects/${id}/notes`,
                        body: { content: note },
                      },
                      { onSuccess: () => setNote('') },
                    );
                  }}
                >
                  <textarea
                    aria-label="New note"
                    placeholder="Add context, ideas, or a reminder for your next conversation…"
                    required
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <button
                    className="button"
                    disabled={save.isPending || !note.trim()}
                  >
                    Add note
                  </button>
                </form>
                {p.noteEntries.map((n: Row) => (
                  <article className="note-card" key={n.id}>
                    <p>{n.content}</p>
                    <small>
                      {n.user.firstName} · {dateLabel(n.createdAt)}
                    </small>
                  </article>
                ))}
              </>
            )}
            {tab === 'Follow-ups' && (
              <>
                <FollowupList
                  items={p.followups.filter((f: Row) => f.status === 'PENDING')}
                />
                {p.followups
                  .filter((f: Row) => f.status !== 'PENDING')
                  .map((f: Row) => (
                    <article key={f.id} className="record-line">
                      <span>
                        {label(f.type)} · {dateLabel(f.date)}
                      </span>
                      <StatusBadge value={f.status} />
                    </article>
                  ))}
              </>
            )}
            {tab === 'Meetings' &&
              (p.meetings.length ? (
                p.meetings.map((m: Row) => (
                  <article className="note-card" key={m.id}>
                    <strong>{m.title}</strong>
                    <p>
                      {dateLabel(m.meetingDate)} · {m.meetingTime} ·{' '}
                      {label(m.meetingType)}
                    </p>
                    <StatusBadge value={m.status} />
                    {m.meetingLink && external(m.meetingLink) && (
                      <a
                        className="text-link"
                        href={m.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Join meeting ↗
                      </a>
                    )}
                  </article>
                ))
              ) : (
                <EmptyState title="No meetings scheduled" />
              ))}
            {tab === 'Deals' &&
              (p.deals.length ? (
                p.deals.map((d: Row) => (
                  <article className="note-card" key={d.id}>
                    <div className="record-line">
                      <strong>{d.title}</strong>
                      <strong>{money(d.value)}</strong>
                    </div>
                    <p>
                      {d.serviceType} · Expected{' '}
                      {dateLabel(d.expectedCloseDate)}
                    </p>
                    <StatusBadge value={d.status} />
                  </article>
                ))
              ) : (
                <EmptyState title="No deals yet" />
              ))}
            {tab === 'Communication' &&
              (p.outreach.length ? (
                p.outreach.map((o: Row) => (
                  <article className="note-card" key={o.id}>
                    <strong>{label(o.channel)}</strong>
                    <small> · {dateLabel(o.sentAt)}</small>
                    <p>{o.message}</p>
                    {o.response && <blockquote>{o.response}</blockquote>}
                  </article>
                ))
              ) : (
                <EmptyState
                  title="No outreach recorded"
                  description="Log a call or a message after you send it."
                />
              ))}
          </div>
        </section>
      </div>
      {save.error && <ErrorState error={save.error} />}{' '}
      {error && <p className="error-banner">{error}</p>}
      {edit && (
        <ProspectForm prospect={p} onClose={() => setEdit(false)} />
      )}{' '}
      {kind && (
        <RecordForm kind={kind} prospectId={id} onClose={() => setKind('')} />
      )}{' '}
      {deleting && (
        <ConfirmationDialog
          title="Delete this prospect?"
          description="This permanently deletes the prospect and its notes, activities, follow-ups, meetings, outreach, and deals. Converted clients cannot be deleted."
          busy={busy}
          onClose={() => setDeleting(false)}
          onConfirm={() => {
            setBusy(true);
            void api(`/prospects/${id}`, { method: 'DELETE' })
              .then(async () => {
                await cache.invalidateQueries();
                navigate('/prospects');
              })
              .catch((e) => {
                setError(e.message);
                setDeleting(false);
              })
              .finally(() => setBusy(false));
          }}
        />
      )}
    </>
  );
}
