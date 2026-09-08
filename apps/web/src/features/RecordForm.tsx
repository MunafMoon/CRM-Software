import { useState } from 'react';
import { useData, useSave } from '../hooks/useCrm';
import { Row, services, today, label } from '../types';
import { Modal, FormField, ErrorState } from '../components/ui';
export function RecordForm({
  kind,
  prospectId,
  record,
  onClose,
}: {
  kind: string;
  prospectId?: string;
  record?: Row;
  onClose: () => void;
}) {
  const prospects = useData<{ items: Row[] }>('/prospects?limit=500');
  const mutation = useSave();
  const [data, setData] = useState<Row>(
    record
      ? {
          ...record,
          date: record.date?.slice(0, 10),
          meetingDate: record.meetingDate?.slice(0, 10),
          expectedCloseDate: record.expectedCloseDate?.slice(0, 10) || '',
        }
      : {
          prospectId: prospectId || '',
          date: today(),
          time: '10:00',
          type: 'CALL',
          notes: '',
          status:
            kind === 'deals'
              ? 'QUALIFIED'
              : kind === 'meetings'
                ? 'SCHEDULED'
                : 'PENDING',
          title: '',
          meetingDate: today(),
          meetingTime: '11:00',
          meetingType: 'GOOGLE_MEET',
          meetingLink: '',
          location: '',
          serviceType: 'Website Development',
          value: 0,
          expectedCloseDate: '',
          channel: 'EMAIL',
          message: '',
          response: '',
          positiveReply: false,
          meetingGenerated: false,
        },
  );
  const set = (k: string, v: unknown) => setData((d) => ({ ...d, [k]: v }));
  const input = (k: string, title: string, type = 'text', required = false) => (
    <FormField key={k} label={title}>
      <input
        type={type}
        required={required}
        min={type === 'number' ? 0 : undefined}
        value={data[k] ?? ''}
        onChange={(e) => set(k, e.target.value)}
      />
    </FormField>
  );
  const select = (k: string, title: string, options: string[]) => (
    <FormField key={k} label={title}>
      <select value={data[k]} onChange={(e) => set(k, e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {label(o)}
          </option>
        ))}
      </select>
    </FormField>
  );
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = { ...data };
    if (kind === 'outreach') {
      delete body.status;
      delete body.sentAt;
      delete body.responseAt;
    }
    await mutation.mutateAsync({
      path: `/${kind}${record ? `/${record.id}` : ''}`,
      body,
      method: record ? 'PATCH' : 'POST',
    });
    onClose();
  }
  return (
    <Modal
      title={`${record ? 'Edit' : 'Add'} ${kind === 'followups' ? 'follow-up' : kind === 'outreach' ? 'outreach record' : kind.replace(/s$/, '')}`}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          void submit(e).catch(() => {});
        }}
      >
        <div className="form-grid">
          {!prospectId && !record && (
            <FormField label="Prospect *">
              <select
                required
                value={data.prospectId}
                onChange={(e) => set('prospectId', e.target.value)}
              >
                <option value="">Choose a prospect</option>
                {prospects.data?.items.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.businessName}
                  </option>
                ))}
              </select>
            </FormField>
          )}
          {kind === 'followups' && (
            <>
              {input('date', 'Date *', 'date', true)}
              {input('time', 'Time (IST) *', 'time', true)}
              {select('type', 'Channel', [
                'CALL',
                'WHATSAPP',
                'EMAIL',
                'LINKEDIN',
                'MEETING',
                'OTHER',
              ])}
              {select('status', 'Status', ['PENDING', 'COMPLETED', 'MISSED'])}
            </>
          )}
          {kind === 'meetings' && (
            <>
              {input('title', 'Meeting title *', 'text', true)}
              {input('meetingDate', 'Date *', 'date', true)}
              {input('meetingTime', 'Time (IST) *', 'time', true)}
              {select('meetingType', 'Meeting type', [
                'PHONE',
                'GOOGLE_MEET',
                'ZOOM',
                'OFFICE',
                'CLIENT_LOCATION',
              ])}
              {input('meetingLink', 'Meeting link', 'url')}
              {input('location', 'Location')}
              {select('status', 'Status', [
                'SCHEDULED',
                'COMPLETED',
                'CANCELLED',
                'NO_SHOW',
              ])}
            </>
          )}
          {kind === 'deals' && (
            <>
              {input('title', 'Deal title *', 'text', true)}
              {select('serviceType', 'Service', services)}
              {input('value', 'Deal value (₹) *', 'number', true)}
              {input('expectedCloseDate', 'Expected close date', 'date')}
              {select('status', 'Stage', [
                'QUALIFIED',
                'MEETING',
                'PROPOSAL',
                'NEGOTIATION',
                'WON',
                'LOST',
              ])}
            </>
          )}
          {kind === 'outreach' && (
            <>
              {select('channel', 'Channel', [
                'EMAIL',
                'WHATSAPP',
                'LINKEDIN',
                'PHONE',
                'INSTAGRAM',
              ])}
              <FormField label="Message sent *">
                <textarea
                  required
                  value={data.message}
                  onChange={(e) => set('message', e.target.value)}
                />
              </FormField>
              <FormField label="Response received">
                <textarea
                  value={data.response}
                  onChange={(e) => set('response', e.target.value)}
                />
              </FormField>
              <label className="check">
                <input
                  type="checkbox"
                  checked={data.positiveReply}
                  onChange={(e) => set('positiveReply', e.target.checked)}
                />
                Positive reply
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={data.meetingGenerated}
                  onChange={(e) => set('meetingGenerated', e.target.checked)}
                />
                Generated a meeting
              </label>
              <p className="muted">
                This records communication you have already sent. It does not
                send a message.
              </p>
            </>
          )}
          {kind !== 'outreach' && kind !== 'deals' && (
            <FormField label="Notes">
              <textarea
                value={data.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
            </FormField>
          )}
        </div>
        {mutation.error && <ErrorState error={mutation.error} />}
        <div className="form-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save record'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
