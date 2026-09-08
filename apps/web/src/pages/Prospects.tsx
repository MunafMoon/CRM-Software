import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Upload,
  SlidersHorizontal,
  LayoutList,
  Columns3,
  ArrowUpRight,
} from 'lucide-react';
import { useData, useSave } from '../hooks/useCrm';
import {
  Row,
  statuses,
  priorities,
  categories,
  sources,
  label,
  money,
} from '../types';
import {
  LoadingState,
  ErrorState,
  SearchInput,
  DataTable,
  Avatar,
  StatusBadge,
  PriorityBadge,
  Pagination,
  EmptyState,
} from '../components/ui';
import { PageHeader, AddButton } from '../layouts/Shell';
import { ProspectForm } from '../features/prospects/ProspectForm';
import { ImportForm } from '../features/prospects/ImportForm';
export function Prospects({ pipeline = false }: { pipeline?: boolean }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [add, setAdd] = useState(false);
  const [importing, setImporting] = useState(false);
  const [filters, setFilters] = useState(false);
  const [view, setView] = useState(pipeline ? 'kanban' : 'table');
  const [search, setSearch] = useState(params.get('search') || '');
  const save = useSave();
  const users = useData<Row[]>('/users');
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== (params.get('search') || '')) {
        const p = new URLSearchParams(params);
        if (search) p.set('search', search);
        else p.delete('search');
        p.set('page', '1');
        setParams(p, { replace: true });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [search, params, setParams]);
  useEffect(() => setView(pipeline ? 'kanban' : 'table'), [pipeline]);
  const q = new URLSearchParams(params);
  q.set('limit', view === 'kanban' ? '500' : '20');
  const query = useData<{
    items: Row[];
    total: number;
    page: number;
    pages: number;
  }>(`/prospects?${q}`);
  function filter(key: string, value: string) {
    const p = new URLSearchParams(params);
    if (value) p.set(key, value);
    else p.delete(key);
    p.set('page', '1');
    setParams(p);
  }
  async function move(id: string, status: string) {
    const prospect = query.data?.items.find((p) => p.id === id);
    if (prospect && prospect.status !== status)
      await save.mutateAsync({
        path: `/prospects/${id}`,
        method: 'PUT',
        body: { ...prospect, status },
      });
  }
  return (
    <>
      <PageHeader
        eyebrow={
          pipeline ? 'MOVE YOUR BUSINESS FORWARD' : 'RELATIONSHIPS START HERE'
        }
        title={pipeline ? 'Sales pipeline' : 'Prospects'}
        description={
          pipeline
            ? 'A clear path from first hello to your next client.'
            : 'Your next great collaboration is in here.'
        }
        action={
          <div className="header-actions">
            <button
              className="button secondary"
              onClick={() => setImporting(true)}
            >
              <Upload size={16} />
              Import CSV
            </button>
            <AddButton onClick={() => setAdd(true)} />
          </div>
        }
      />
      <div className="card">
        <div className="list-toolbar">
          <div className="tabs">
            <button
              className={view === 'table' ? 'active' : ''}
              onClick={() => setView('table')}
            >
              <LayoutList size={16} />
              Table
            </button>
            <button
              className={view === 'kanban' ? 'active' : ''}
              onClick={() => setView('kanban')}
            >
              <Columns3 size={16} />
              Board
            </button>
          </div>
          <SearchInput value={search} onChange={setSearch} />
          <button
            className={`button secondary ${filters ? 'selected' : ''}`}
            onClick={() => setFilters(!filters)}
          >
            <SlidersHorizontal size={16} />
            Filters{' '}
            {params.size > 1 && (
              <span className="count-pill">
                {[...params.keys()].filter((k) => k !== 'page').length}
              </span>
            )}
          </button>
        </div>
        {filters && (
          <div className="filter-grid">
            {[
              ['status', 'Stage', statuses],
              ['priority', 'Priority', priorities],
              ['businessCategory', 'Category', categories],
              ['source', 'Source', sources],
            ].map(([key, title, options]) => (
              <label className="field" key={key as string}>
                <span>{title as string}</span>
                <select
                  value={params.get(key as string) || ''}
                  onChange={(e) => filter(key as string, e.target.value)}
                >
                  <option value="">All</option>
                  {(options as string[]).map((v) => (
                    <option value={v} key={v}>
                      {label(v)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label className="field">
              <span>City</span>
              <input
                value={params.get('city') || ''}
                onChange={(e) => filter('city', e.target.value)}
              />
            </label>
            <label className="field">
              <span>Assigned user</span>
              <select
                value={params.get('assignedTo') || ''}
                onChange={(e) => filter('assignedTo', e.target.value)}
              >
                <option value="">Anyone</option>
                {users.data?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                  </option>
                ))}
              </select>
            </label>
            {[
              ['createdFrom', 'Created from'],
              ['createdTo', 'Created until'],
              ['followupDate', 'Follow-up date'],
            ].map(([k, t]) => (
              <label key={k} className="field">
                <span>{t}</span>
                <input
                  type="date"
                  value={params.get(k) || ''}
                  onChange={(e) => filter(k, e.target.value)}
                />
              </label>
            ))}
            <button
              className="text-button"
              onClick={() => {
                setParams({});
                setSearch('');
              }}
            >
              Clear filters
            </button>
          </div>
        )}
        {query.isPending ? (
          <LoadingState />
        ) : query.error ? (
          <ErrorState error={query.error} />
        ) : view === 'table' ? (
          <>
            <DataTable
              rows={query.data.items}
              onRow={(p) => navigate(`/prospects/${p.id}`)}
              columns={[
                {
                  key: 'businessName',
                  title: 'Business',
                  render: (p) => (
                    <div className="business-cell">
                      <Avatar name={p.businessName} />
                      <div>
                        <Link to={`/prospects/${p.id}`} className="strong">
                          {p.businessName}
                        </Link>
                        <small>
                          {p.contactPerson || p.email || 'No contact added'}
                        </small>
                      </div>
                    </div>
                  ),
                },
                { key: 'businessCategory', title: 'Category' },
                { key: 'city', title: 'City' },
                {
                  key: 'status',
                  title: 'Stage',
                  render: (p) => <StatusBadge value={p.status} />,
                },
                {
                  key: 'priority',
                  title: 'Priority',
                  render: (p) => <PriorityBadge value={p.priority} />,
                },
                {
                  key: 'estimatedValue',
                  title: 'Est. value',
                  render: (p) => <strong>{money(p.estimatedValue)}</strong>,
                },
                { key: 'source', title: 'Source' },
                {
                  key: 'id',
                  title: '',
                  render: () => <ArrowUpRight size={16} />,
                },
              ]}
            />
            <Pagination
              page={query.data.page}
              pages={query.data.pages}
              total={query.data.total}
              onChange={(p) => filter('page', String(p))}
            />
          </>
        ) : (
          <>
            <div className="kanban">
              {statuses.map((status) => {
                const items = query.data.items.filter(
                  (p) => p.status === status,
                );
                return (
                  <section
                    key={status}
                    className="kanban-column"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      void move(
                        e.dataTransfer.getData('text/plain'),
                        status,
                      ).catch(() => {});
                    }}
                  >
                    <header>
                      <StatusBadge value={status} />
                      <span>{items.length}</span>
                    </header>
                    <small className="kanban-total">
                      {money(
                        items.reduce((v, p) => v + Number(p.estimatedValue), 0),
                      )}
                    </small>
                    {items.map((p) => (
                      <article
                        className="kanban-card"
                        key={p.id}
                        draggable={!save.isPending}
                        onDragStart={(e) =>
                          e.dataTransfer.setData('text/plain', p.id)
                        }
                      >
                        <div>
                          <Avatar name={p.businessName} small />
                          <PriorityBadge value={p.priority} />
                        </div>
                        <Link
                          to={`/prospects/${p.id}`}
                          aria-disabled={save.isPending}
                          onClick={(e) => {
                            if (save.isPending) e.preventDefault();
                          }}
                        >
                          {p.businessName}
                        </Link>
                        <p>{p.businessCategory}</p>
                        <strong>{money(p.estimatedValue)}</strong>
                        <select
                          aria-label={`Move ${p.businessName} to stage`}
                          value={p.status}
                          disabled={save.isPending}
                          onChange={(e) => {
                            void move(p.id, e.target.value).catch(() => {});
                          }}
                        >
                          {statuses.map((s) => (
                            <option key={s} value={s}>
                              {label(s)}
                            </option>
                          ))}
                        </select>
                      </article>
                    ))}
                    {!items.length && (
                      <div className="drop-hint">Drop a prospect here</div>
                    )}
                  </section>
                );
              })}
            </div>
            {query.data.total > 500 && (
              <p className="error-banner">
                Board shows 500 prospects. Use filters to narrow the results.
              </p>
            )}
            {!query.data.total && (
              <EmptyState
                title="Your pipeline is ready"
                description="Add a prospect to begin."
              />
            )}
          </>
        )}
        {save.error && <ErrorState error={save.error} />}
      </div>
      {add && <ProspectForm onClose={() => setAdd(false)} />}{' '}
      {importing && <ImportForm onClose={() => setImporting(false)} />}
    </>
  );
}
