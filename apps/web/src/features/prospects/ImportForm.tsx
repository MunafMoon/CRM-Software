import { useState } from 'react';
import Papa from 'papaparse';
import { useSave } from '../../hooks/useCrm';
import { Row } from '../../types';
import { Modal, ErrorState } from '../../components/ui';
const mapping: Record<string, string> = {
  'Business Name': 'businessName',
  Category: 'businessCategory',
  'Contact Name': 'contactPerson',
  Phone: 'phone',
  Email: 'email',
  Website: 'website',
  Instagram: 'instagram',
  LinkedIn: 'linkedin',
  City: 'city',
  Source: 'source',
  Notes: 'notes',
};
export function ImportForm({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [report, setReport] = useState<Row>();
  const [error, setError] = useState('');
  const save = useSave();
  async function validate(commit = false) {
    try {
      setReport(
        await save.mutateAsync({
          path: '/prospects/import',
          body: { rows, commit },
        }),
      );
    } catch {
      /* error displayed by mutation */
    }
  }
  return (
    <Modal title="Import prospects" onClose={onClose}>
      <p className="muted">
        Upload a CSV with up to 1,000 rows. We check every row before adding it.
      </p>
      <p className="import-help">
        Columns: Business Name, Category, Contact Name, Phone, Email, Website,
        Instagram, LinkedIn, City, Source, Notes.
      </p>
      <a
        className="text-link"
        download="prospects-template.csv"
        href={`data:text/csv;charset=utf-8,${encodeURIComponent(Object.keys(mapping).join(',') + '\nExample Studio,Professional Services,Asha Patel,+919876543210,asha@example.com,https://example.com,,,Vadodara,Referral,Interested in a website\n')}`}
      >
        Download CSV template
      </a>
      <input
        className="file-input"
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => {
          setReport(undefined);
          setRows([]);
          setError('');
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 2 * 1024 * 1024) {
            setError('Maximum file size is 2 MB');
            return;
          }
          Papa.parse<Row>(file, {
            header: true,
            skipEmptyLines: 'greedy',
            transformHeader: (h) => h.trim(),
            complete: (r) => {
              if (r.errors.length) {
                setError(r.errors.map((x) => x.message).join('; '));
                return;
              }
              setRows(
                r.data.map((row) =>
                  Object.fromEntries(
                    Object.entries(row).map(([k, v]) => [
                      mapping[k] || k,
                      typeof v === 'string' ? v.trim() : v,
                    ]),
                  ),
                ),
              );
            },
          });
        }}
      />
      {rows.length > 0 && <p>{rows.length} rows loaded</p>}
      {error && <p className="error">{error}</p>}
      {save.error && <ErrorState error={save.error} />}{' '}
      {report && (
        <>
          <div className="import-stats">
            <span>
              <strong>{report.valid}</strong> Valid
            </span>
            <span>
              <strong>{report.invalid}</strong> Invalid
            </span>
            <span>
              <strong>{report.duplicates}</strong> Duplicates
            </span>
          </div>
          {report.committed && (
            <p className="success">
              Imported {report.valid} prospects successfully.
            </p>
          )}
          <div className="import-results">
            {report.results
              .filter((r: Row) => r.status !== 'valid')
              .map((r: Row) => (
                <p key={r.row}>
                  Row {r.row}: {r.status} {r.message && `— ${r.message}`}
                </p>
              ))}
          </div>
        </>
      )}
      <div className="form-actions">
        <button className="button secondary" onClick={onClose}>
          Close
        </button>
        {!report?.committed && (
          <button
            className="button"
            disabled={
              !rows.length ||
              save.isPending ||
              !!error ||
              (!!report && report.valid === 0)
            }
            onClick={() => {
              void validate(!!report);
            }}
          >
            {save.isPending
              ? 'Checking…'
              : report
                ? `Import ${report.valid} valid rows`
                : 'Validate CSV'}
          </button>
        )}
      </div>
    </Modal>
  );
}
