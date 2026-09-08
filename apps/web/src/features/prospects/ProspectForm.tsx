import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  categories,
  sources,
  statuses,
  priorities,
  label,
  Row,
} from '../../types';
import { useData, useSave } from '../../hooks/useCrm';
import { Modal, FormField, ErrorState } from '../../components/ui';
const schema = z.object({
  businessName: z.string().trim().min(1, 'Business name is required'),
  contactPerson: z.string(),
  email: z.union([z.literal(''), z.string().email()]),
  phone: z.string(),
  whatsapp: z.string(),
  website: z.union([z.literal(''), z.string().url()]),
  instagram: z.union([z.literal(''), z.string().url()]),
  linkedin: z.union([z.literal(''), z.string().url()]),
  businessCategory: z.string(),
  city: z.string().min(1),
  state: z.string(),
  country: z.string().min(1),
  source: z.string(),
  estimatedValue: z.coerce.number().min(0),
  priority: z.string(),
  status: z.string(),
  notes: z.string(),
  assignedTo: z.string().optional(),
});
type Values = z.infer<typeof schema>;
export function ProspectForm({
  prospect,
  onClose,
}: {
  prospect?: Row;
  onClose: () => void;
}) {
  const users = useData<Row[]>('/users');
  const mutation = useSave();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: prospect
      ? Object.fromEntries(
          Object.keys(schema.shape).map((k) => [k, prospect[k] ?? '']),
        )
      : {
          businessName: '',
          contactPerson: '',
          email: '',
          phone: '',
          whatsapp: '',
          website: '',
          instagram: '',
          linkedin: '',
          businessCategory: 'Dental Clinic',
          city: 'Vadodara',
          state: 'Gujarat',
          country: 'India',
          source: 'Google Maps',
          estimatedValue: 0,
          priority: 'MEDIUM',
          status: 'NEW',
          notes: '',
        },
  });
  async function submit(values: Values) {
    await mutation.mutateAsync({
      path: prospect ? `/prospects/${prospect.id}` : '/prospects',
      body: { ...values, assignedTo: values.assignedTo || undefined },
      method: prospect ? 'PUT' : 'POST',
    });
    onClose();
  }
  const input = (key: keyof Values, caption: string, type = 'text') => (
    <FormField key={key} label={caption} error={errors[key]?.message}>
      <input type={type} {...register(key)} />
    </FormField>
  );
  const select = (key: keyof Values, caption: string, options: string[]) => (
    <FormField key={key} label={caption}>
      <select {...register(key)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {label(o)}
          </option>
        ))}
      </select>
    </FormField>
  );
  return (
    <Modal
      title={prospect ? 'Edit prospect' : 'Add a new prospect'}
      onClose={onClose}
    >
      <p className="muted">
        Start with the business. Build the relationship from here.
      </p>
      <form
        onSubmit={handleSubmit((v) => {
          void submit(v).catch(() => {});
        })}
      >
        <div className="form-grid">
          {input('businessName', 'Business name *')}
          {input('contactPerson', 'Contact person')}
          {input('email', 'Email', 'email')}
          {input('phone', 'Phone (with country code)')}
          {input('whatsapp', 'WhatsApp (with country code)')}
          {input('website', 'Website', 'url')}
          {select('businessCategory', 'Business category', categories)}
          {select('source', 'Source', sources)}
          {input('city', 'City *')}
          {input('state', 'State')}
          {input('country', 'Country *')}
          {input('estimatedValue', 'Estimated value (₹)', 'number')}
          {select('priority', 'Priority', priorities)}
          {select('status', 'Stage', statuses)}
          {input('instagram', 'Instagram URL', 'url')}
          {input('linkedin', 'LinkedIn URL', 'url')}
          <FormField label="Assigned to">
            <select {...register('assignedTo')}>
              <option value="">Me</option>
              {users.data?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Initial notes">
            <textarea rows={3} {...register('notes')} />
          </FormField>
        </div>
        {mutation.error && <ErrorState error={mutation.error} />}
        <div className="form-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button" disabled={mutation.isPending}>
            {mutation.isPending
              ? 'Saving…'
              : prospect
                ? 'Save changes'
                : 'Create prospect'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
