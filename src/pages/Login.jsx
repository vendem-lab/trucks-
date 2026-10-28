import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import Field from '../components/Field.jsx';
import Icon from '../components/Icon.jsx';
import { BRAND } from '../config.js';
import { useAuth } from '../context/authContext.js';
import { useToast } from '../context/ToastContext.jsx';

export default function Login() {
  const { session, authLoading, authError, login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { push } = useToast();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const requested = location.state?.from || '';
  const fallback = session?.role === 'staff' ? '/admin' : '/portal';
  const target =
    requested &&
    ((session?.role === 'staff' && requested.startsWith('/admin')) ||
      (session?.role === 'member' && requested.startsWith('/portal')))
      ? requested
      : fallback;

  if (authLoading) {
    return <div className="auth-page"><main className="auth-main"><div className="auth-card">Checking your account…</div></main></div>;
  }

  if (session?.profileMissing && !session.profileError) {
    return <Navigate to="/membership" replace />;
  }

  if (session && !session.profileError) {
    return <Navigate to={target} replace />;
  }

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = await login(form.email, form.password);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const destination =
      requested &&
      ((result.session.role === 'staff' && requested.startsWith('/admin')) ||
        (result.session.role === 'member' && requested.startsWith('/portal')))
        ? requested
        : result.session.role === 'staff'
          ? '/admin'
          : '/portal';
    push(`Welcome back, ${result.session.name}.`, 'success');
    navigate(destination, { replace: true });
  };

  const handleGoogleSignIn = async () => {
    setError('');
    const result = await loginWithGoogle();
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.session.profileMissing) {
      push('Complete your membership application to join the union.', 'success');
      navigate('/membership', { replace: true });
      return;
    }
    const destination = requested &&
      ((result.session.role === 'staff' && requested.startsWith('/admin')) ||
       (result.session.role === 'member' && requested.startsWith('/portal')))
      ? requested
      : result.session.role === 'staff' ? '/admin' : '/portal';
    push(`Welcome, ${result.session.name}.`, 'success');
    navigate(destination, { replace: true });
  };

  return (
    <div className="auth-page">
      <div className="auth-aside">
        <Link to="/" className="auth-back">
          <Icon name="arrowRight" size={16} /> Back to site
        </Link>
        <div className="auth-aside-copy">
          <Logo light showTagline />
          <h1>Your union, in your pocket.</h1>
          <p>
            Check your dues, manage job alerts and keep your member details current. Union staff use
            the same sign-in to reach the admin workspace.
          </p>
          <ul className="auth-features">
            <li><Icon name="check" size={16} /> Verified load board and job alerts</li>
            <li><Icon name="check" size={16} /> Dues statements and mobile money receipts</li>
            <li><Icon name="check" size={16} /> Legal cover and welfare fund access</li>
          </ul>
        </div>
        <p className="auth-aside-foot">
          © {new Date().getFullYear()} {BRAND.legalName}
        </p>
      </div>

      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-card-head">
            <span className="eyebrow">Member & staff access</span>
            <h2>Sign in</h2>
          <p>Use your union account. Applicants can access the member portal after office approval.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <Field label="Email" htmlFor="login-email" required>
              <input
                id="login-email"
                type="email"
                value={form.email}
                onChange={update('email')}
                placeholder="you@example.com"
                autoComplete="username"
              />
            </Field>

            <Field label="Password" htmlFor="login-password" required>
              <div className="password-wrap">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={update('password')}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Icon name="eye" size={17} />
                </button>
              </div>
            </Field>

            {(error || authError) && (
              <div className="form-error" role="alert">
                <Icon name="alert" size={16} /> {error || authError}
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-block btn-lg">
              Sign in <Icon name="arrowRight" size={16} />
            </button>
          </form>

          {!import.meta.env.VITE_USE_DEMO_DATA && <>
            <div className="auth-divider" aria-hidden="true"><span>or</span></div>
            <button type="button" className="btn btn-outline btn-block btn-lg" onClick={handleGoogleSignIn}>
              <svg aria-hidden="true" viewBox="0 0 48 48" width="18" height="18">
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.7 17.7 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.4-4.6 7.1l7.4 5.7c4.3-4 6.9-10 6.9-17.3z" />
                <path fill="#FBBC05" d="M10.4 28.7a14.5 14.5 0 0 1 0-9.4l-7.8-6.1a24 24 0 0 0 0 21.6l7.8-6.1z" />
                <path fill="#34A853" d="M24 48c6.5 0 12-2.1 16-5.7l-7.4-5.7c-2.1 1.4-4.8 2.2-8.6 2.2-6.3 0-11.7-4.2-13.6-9.9l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
              </svg>
              Continue with Google
            </button>
          </>}

          <p className="auth-join">
            Not a member yet? <Link to="/membership">Apply to join the union</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
