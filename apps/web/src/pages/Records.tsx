import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Check, CalendarDays } from 'lucide-react';
import { useData, useSave } from '../hooks/useCrm';
import { Row, money, dateLabel, label, today } from '../types';
import {
  LoadingState,
  ErrorState,
  SearchInput,
  DataTable,
  StatusBadge,
  FormField,
  Modal,
} from '../components/ui';
import { PageHeader, AddButton } from '../layouts/Shell';
import { RecordForm } from '../features/RecordForm';
const titles: Record<string, [string, string]> = {
  followups: ['Follow-ups', 'A thoughtful next step for every conversation.'],
  meetings: [
    'Meetings',
    'Make room for conversations that move things forward.',
  ],
  deals: ['Deals', 'Turn promising conversations into signed projects.'],
  clients: ['Clients', 'The relationships you’ve worked to build.'],
  outreach: ['Outreach', 'Keep a clear record of every hello and every reply.'],
};
export function Records({ kind }: { kind: string }) {
  const query = useData<Row[]>(`/${kind}`);
  const save = useSave();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState<Row | null | undefined>();
  const [client, setClient] = useState<Row>();
  const title = titles[kind];
  const rows =
    query.data
      ?.filter((r) =>
        `${r.title || ''} ${r.businessName || r.prospect?.businessName || ''} ${r.notes || ''}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      )
      .filter((r) => {
        if (kind !== 'followups')
          return filter === 'all' || r.status === filter;
        const day = r.date.slice(0, 10);
        return (
          filter === 'all' ||
          (filter === 'completed' && r.status === 'COMPLETED') ||
          (r.status === 'PENDING' &&
            ((filter === 'today' && day === today()) ||
              (filter === 'overdue' && day < today()) ||
              (filter === 'upcoming' && day > today())))
        );
      }) || [];
  const columns = [
    {
      key: 'business',
      title: 'Business',
      render: (r: Row) => (
        <Link className="strong text-link" to={`/prospects/${r.prospectId}`}>
          {r.businessName || r.prospect?.businessName}
        </Link>
      ),
    },
    ...(kind === 'followups'
      ? [
          {
            key: 'date',
            title: 'When',
            render: (r: Row) => (
              <span
                className={
                  r.status === 'PENDING' && r.date.slice(0, 10) < today()
                    ? 'error'
                    : ''
                }
              >
                {dateLabel(r.date)} · {r.time}
              </span>
            ),
          },
          { key: 'type', title: 'Channel', render: (r: Row) => label(r.type) },
          { key: 'notes', title: 'Notes' },
        ]
      : kind === 'meetings'
        ? [
            { key: 'title', title: 'Meeting' },
            {
              key: 'meetingDate',
              title: 'When',
              render: (r: Row) =>
                `${dateLabel(r.meetingDate)} · ${r.meetingTime}`,
            },
            {
              key: 'meetingType',
              title: 'Type',
              render: (r: Row) => label(r.meetingType),
            },
            {
              key: 'meetingLink',
              title: 'Join',
              render: (r: Row) =>
                r.meetingLink ? (
                  <a
                    className="text-link"
                    href={r.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Join ↗
                  </a>
                ) : (
                  '—'
                ),
            },
          ]
        : kind === 'deals'
          ? [
              { key: 'title', title: 'Deal' },
              { key: 'serviceType', title: 'Service' },
              {
                key: 'value',
                title: 'Value',
                render: (r: Row) => money(r.value),
              },
              {
                key: 'expectedCloseDate',
                title: 'Expected close',
                render: (r: Row) => dateLabel(r.expectedCloseDate),
              },
            ]
          : kind === 'clients'
            ? [
                {
                  key: 'services',
                  title: 'Services',
                  render: (r: Row) => r.services.join(', '),
                },
                {
                  key: 'projectValue',
                  title: 'Project value',
                  render: (r: Row) => money(r.projectValue),
                },
                {
                  key: 'monthlyRetainer',
                  title: 'Monthly retainer',
                  render: (r: Row) => money(r.monthlyRetainer),
                },
                {
                  key: 'startDate',
                  title: 'Started',
                  render: (r: Row) => dateLabel(r.startDate),
                },
              ]
            : [
                {
                  key: 'channel',
                  title: 'Channel',
                  render: (r: Row) => label(r.channel),
                },
                {
                  key: 'message',
                  title: 'Message',
                  render: (r: Row) => (
                    <span className="truncate">{r.message}</span>
                  ),
                },
                {
                  key: 'sentAt',
                  title: 'Sent',
                  render: (r: Row) => dateLabel(r.sentAt),
                },
                {
                  key: 'response',
                  title: 'Response',
                  render: (r: Row) => r.response || 'Awaiting reply',
                },
              ]),
    ...(kind !== 'outreach'
      ? [
          {
            key: 'status',
            title: 'Status',
            render: (r: Row) => <StatusBadge value={r.status} />,
          },
        ]
      : []),
    {
      key: 'actions',
      title: 'Actions',
      render: (r: Row) => (
        <div className="row-actions">
          {kind === 'followups' && r.status !== 'COMPLETED' && (
            <button
              className="icon-button"
              title="Complete"
              aria-label="Complete follow-up"
              disabled={save.isPending}
              onClick={() =>
                save.mutate({
                  path: `/followups/${r.id}`,
                  method: 'PATCH',
                  body: { status: 'COMPLETED' },
                })
              }
            >
              <Check size={16} />
            </button>
          )}
          <button
            className="icon-button"
            aria-label={`Edit ${kind === 'followups' ? 'or reschedule follow-up' : kind}`}
            onClick={() => (kind === 'clients' ? setClient(r) : setForm(r))}
          >
            {kind === 'followups' ? (
              <CalendarDays size={16} />
            ) : (
              <Pencil size={16} />
            )}
          </button>
        </div>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="KEEP YOUR BUSINESS MOVING"
        title={title[0]}
        description={title[1]}
        action={
          kind !== 'clients' && (
            <AddButton onClick={() => setForm(null)}>
              {kind === 'outreach'
                ? 'Log outreach'
                : `Add ${kind === 'followups' ? 'follow-up' : kind.replace(/s$/, '')}`}
            </AddButton>
          )
        }
      />
      {kind === 'clients' && (
        <p className="info-banner">
          Clients appear automatically when a deal is won. Project value is the
          sum of their won deals.
        </p>
      )}
      <div className="card">
        <div className="list-toolbar">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={`Search ${title[0].toLowerCase()}…`}
          />
          {kind === 'followups' ? (
            <div className="tabs">
              {['all', 'today', 'overdue', 'upcoming', 'completed'].map((t) => (
                <button
                  key={t}
                  className={filter === t ? 'active' : ''}
                  onClick={() => setFilter(t)}
                >
                  {label(t)}
                </button>
              ))}
            </div>
          ) : (
            kind !== 'outreach' && (
              <select
                aria-label="Filter by status"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All statuses</option>
                {[...new Set(query.data?.map((r) => r.status))].map((s) => (
                  <option key={s} value={s}>
                    {label(s)}
                  </option>
                ))}
              </select>
            )
          )}
        </div>
        {query.isPending ? (
          <LoadingState />
        ) : query.error ? (
          <ErrorState error={query.error} />
        ) : (
          <DataTable rows={rows} columns={columns} />
        )}
        <div className="pagination">
          {rows.length} records{' '}
          {query.data?.length === 1000 && '· Most recent 1,000 records'}
        </div>
        {save.error && <ErrorState error={save.error} />}
      </div>
      {form !== undefined && (
        <RecordForm
          kind={kind}
          record={form || undefined}
          onClose={() => setForm(undefined)}
        />
      )}{' '}
      {client && (
        <Modal title="Update client" onClose={() => setClient(undefined)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(
                {
                  path: `/clients/${client.id}`,
                  method: 'PATCH',
                  body: {
                    status: client.status,
                    monthlyRetainer: client.monthlyRetainer,
                  },
                },
                { onSuccess: () => setClient(undefined) },
              );
            }}
          >
            <FormField label="Client status">
              <select
                value={client.status}
                onChange={(e) =>
                  setClient({ ...client, status: e.target.value })
                }
              >
                {['ACTIVE', 'INACTIVE', 'COMPLETED'].map((s) => (
                  <option key={s} value={s}>
                    {label(s)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Monthly retainer (₹)">
              <input
                type="number"
                min="0"
                value={client.monthlyRetainer}
                onChange={(e) =>
                  setClient({ ...client, monthlyRetainer: e.target.value })
                }
              />
            </FormField>
            {save.error && <ErrorState error={save.error} />}
            <div className="form-actions">
              <button className="button" disabled={save.isPending}>
                Save changes
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
