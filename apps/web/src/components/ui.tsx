import {
  ReactNode,
  ReactElement,
  cloneElement,
  isValidElement,
  useId,
  useEffect,
  useRef,
} from 'react';
import {
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Inbox,
  ArrowUpRight,
} from 'lucide-react';
import { label, Row } from '../types';
export function StatusBadge({ value }: { value: string }) {
  return <span className={`badge status-${value}`}>{label(value)}</span>;
}
export function PriorityBadge({ value }: { value: string }) {
  return (
    <span className={`priority priority-${value}`}>
      <i />
      {label(value)}
    </span>
  );
}
export function FormField({
  label: caption,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <label className="field">
      <span id={`${id}-label`}>{caption}</span>
      {isValidElement(children)
        ? cloneElement(children as ReactElement<Record<string, unknown>>, {
            'aria-labelledby': `${id}-label`,
            'aria-describedby': error ? `${id}-error` : undefined,
            'aria-invalid': error ? true : undefined,
          })
        : children}
      {error && (
        <small id={`${id}-error`} className="error">
          {error}
        </small>
      )}
    </label>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function ConfirmationDialog({
  title,
  description,
  busy,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p>{description}</p>
      <div className="form-actions">
        <button className="button secondary" onClick={onClose}>
          Cancel
        </button>
        <button className="button danger" disabled={busy} onClick={onConfirm}>
          {busy ? 'Deleting…' : 'Delete prospect'}
        </button>
      </div>
    </Modal>
  );
}
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search prospects…',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="search-input">
      <Search size={17} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
export function Pagination({
  page,
  pages,
  total,
  onChange,
}: {
  page: number;
  pages: number;
  total: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="pagination">
      <span>
        {total} records · Page {page} of {Math.max(1, pages)}
      </span>
      <div>
        <button
          className="icon-button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={18} />
        </button>
        <button
          className="icon-button"
          aria-label="Next page"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
export function EmptyState({
  title = 'Nothing here yet',
  description = 'Add your first record to get started.',
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <Inbox size={30} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function LoadingState() {
  return (
    <div className="loading" role="status">
      <span />
      Loading your workspace…
    </div>
  );
}
export function ErrorState({ error }: { error: Error }) {
  return (
    <div className="error-banner" role="alert">
      {error.message}
    </div>
  );
}
export function KpiCard({
  title,
  value,
  subtitle,
  icon,
  accent = false,
}: {
  title: string;
  value: ReactNode;
  subtitle: string;
  icon: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={`kpi ${accent ? 'accent' : ''}`}>
      <div className="kpi-top">
        <span>{title}</span>
        {icon}
      </div>
      <strong>{value}</strong>
      <div className="kpi-bottom">
        <span>{subtitle}</span>
        <ArrowUpRight size={16} />
      </div>
    </div>
  );
}
export function DataTable({
  rows,
  columns,
  onRow,
}: {
  rows: Row[];
  columns: { key: string; title: string; render?: (r: Row) => ReactNode }[];
  onRow?: (row: Row) => void;
}) {
  if (!rows.length) return <EmptyState />;
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className={onRow ? 'clickable' : ''}
              onClick={() => onRow?.(r)}
            >
              {columns.map((c) => (
                <td key={c.key}>{c.render ? c.render(r) : r[c.key] || '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Avatar({
  name,
  small = false,
}: {
  name: string;
  small?: boolean;
}) {
  return (
    <span
      className={`avatar ${small ? 'small' : ''}`}
      style={{
        background: ['#e6eddf', '#f3e7dd', '#e4e9f5', '#ede4f2'][
          name.length % 4
        ],
      }}
    >
      {name
        .split(' ')
        .slice(0, 2)
        .map((s) => s[0])
        .join('')}
    </span>
  );
}
