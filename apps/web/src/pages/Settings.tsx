import { useState } from 'react';
import { useAuth } from '../auth/Auth';
import { useData, useSave } from '../hooks/useCrm';
import { Row } from '../types';
import { FormField, ErrorState, DataTable, Modal } from '../components/ui';
import { PageHeader, AddButton } from '../layouts/Shell';
export function Settings() {
  const { user, reload } = useAuth();
  const [data, setData] = useState<Row>({ ...user });
  const [add, setAdd] = useState(false);
  const [success, setSuccess] = useState(false);
  const [member, setMember] = useState<Row>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'SALES',
  });
  const save = useSave();
  const users = useData<Row[]>('/users');
  return (
    <>
      <PageHeader
        eyebrow="MAKE IT YOURS"
        title="Settings"
        description="Your profile, daily goals, and growing team."
      />
      <section className="card settings-card">
        <div className="card-header">
          <h2>Profile & daily targets</h2>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(
              { path: '/settings', body: data, method: 'PATCH' },
              {
                onSuccess: () => {
                  void reload();
                  setSuccess(true);
                },
              },
            );
          }}
        >
          <div className="form-grid">
            {[
              ['firstName', 'First name', 'text'],
              ['lastName', 'Last name', 'text'],
              [
                'dailyProspectTarget',
                'Daily prospects contacted target',
                'number',
              ],
              [
                'dailyFollowUpTarget',
                'Daily follow-ups completed target',
                'number',
              ],
              [
                'dailyMeetingTarget',
                'Daily meetings scheduled target',
                'number',
              ],
            ].map(([k, t, type]) => (
              <FormField key={k} label={t}>
                <input
                  type={type}
                  required={k !== 'lastName'}
                  min={type === 'number' ? 1 : undefined}
                  value={data[k]}
                  onChange={(e) => {
                    setData({ ...data, [k]: e.target.value });
                    setSuccess(false);
                  }}
                />
              </FormField>
            ))}
            <FormField label="Email">
              <input disabled value={user!.email} />
            </FormField>
          </div>
          {save.error && <ErrorState error={save.error} />}{' '}
          {success && <p className="success">Settings saved.</p>}
          <div className="form-actions">
            <button className="button" disabled={save.isPending}>
              Save settings
            </button>
          </div>
        </form>
      </section>
      <section className="card">
        <div className="card-header">
          <div>
            <h2>Team members</h2>
            <p>
              One shared agency workspace. Admins manage users and deletion.
            </p>
          </div>
          {user!.role === 'ADMIN' && (
            <AddButton onClick={() => setAdd(true)}>Add member</AddButton>
          )}
        </div>
        {users.error && <ErrorState error={users.error} />}
        <DataTable
          rows={users.data || []}
          columns={[
            { key: 'firstName', title: 'First name' },
            { key: 'lastName', title: 'Last name' },
            { key: 'email', title: 'Email' },
            { key: 'role', title: 'Role' },
          ]}
        />
      </section>
      {add && (
        <Modal title="Add team member" onClose={() => setAdd(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(
                { path: '/users', body: member },
                {
                  onSuccess: () => {
                    setAdd(false);
                    setMember({
                      firstName: '',
                      lastName: '',
                      email: '',
                      password: '',
                      role: 'SALES',
                    });
                  },
                },
              );
            }}
          >
            <div className="form-grid">
              {[
                ['firstName', 'First name', 'text'],
                ['lastName', 'Last name', 'text'],
                ['email', 'Email', 'email'],
                ['password', 'Initial password (12+ characters)', 'password'],
              ].map(([k, t, type]) => (
                <FormField key={k} label={t}>
                  <input
                    type={type}
                    required={k !== 'lastName'}
                    minLength={k === 'password' ? 12 : undefined}
                    value={member[k]}
                    onChange={(e) =>
                      setMember({ ...member, [k]: e.target.value })
                    }
                  />
                </FormField>
              ))}
              <FormField label="Role">
                <select
                  value={member.role}
                  onChange={(e) =>
                    setMember({ ...member, role: e.target.value })
                  }
                >
                  {['ADMIN', 'SALES', 'MARKETING'].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </FormField>
            </div>
            {save.error && <ErrorState error={save.error} />}
            <div className="form-actions">
              <button className="button" disabled={save.isPending}>
                Create member
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
