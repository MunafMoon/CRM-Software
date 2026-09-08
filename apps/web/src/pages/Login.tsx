import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { useAuth } from '../auth/Auth';
import { FormField } from '../components/ui';
export function Login() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;
  return (
    <div className="login-page">
      <div className="login-story">
        <div className="brand">
          <span className="brand-symbol">f</span>folio.
        </div>
        <div>
          <span className="eyebrow">YOUR INDEPENDENT AMBITION. ORGANIZED.</span>
          <h1>
            Good relationships.
            <br />
            Great business.
          </h1>
          <p>
            One thoughtful workspace for every prospect,
            <br />
            conversation, and next big opportunity.
          </p>
          {[
            'A clear view of your sales pipeline',
            'Follow-ups that never fall through',
            'More time for the work you love',
          ].map((t) => (
            <div className="login-benefit" key={t}>
              <Check size={17} />
              {t}
            </div>
          ))}
        </div>
        <small>Made for studios, freelancers, and growing agencies.</small>
      </div>
      <div className="login-form">
        <span className="eyebrow">WELCOME TO YOUR WORKSPACE</span>
        <h2>Let’s pick up where you left off.</h2>
        <p className="muted">Sign in to Folio to make your next move.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            try {
              await login(email, password);
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <FormField label="Email address">
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourstudio.com"
            />
          </FormField>
          <FormField label="Password">
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormField>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="button" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in to your workspace'}
            <ArrowRight size={17} />
          </button>
        </form>
        <small className="muted">
          Use the administrator account configured during setup.
        </small>
      </div>
    </div>
  );
}
