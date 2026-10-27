import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import Field from '../components/Field.jsx';
import Icon from '../components/Icon.jsx';
import { BRAND } from '../config.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Login() {
  const { session, login } = useAuth();
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

  if (session) {
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
            <p>Use your union account. New applicants can sign in once the office approves them.</p>
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

            {error && (
              <div className="form-error" role="alert">
                <Icon name="alert" size={16} /> {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-block btn-lg">
              Sign in <Icon name="arrowRight" size={16} />
            </button>
          </form>

          <p className="auth-join">
            Not a member yet? <Link to="/membership">Apply to join the union</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
