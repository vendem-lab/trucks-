import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children, role }) {
  const { session, authLoading, authError } = useAuth();
  const location = useLocation();

  if (authLoading) {
    return <section className="section"><div className="container">Checking your account…</div></section>;
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (session.profileMissing || session.profileError) {
    return (
      <section className="section">
        <div className="container container-narrow">
          <div className="card">
            <h2>Account setup needs attention</h2>
            <p role="alert">{authError || session.profileError || 'Your Firebase account has no union profile yet.'}</p>
            <p>Contact the union office to finish linking your account.</p>
          </div>
        </div>
      </section>
    );
  }

  if (session.role === 'member' && session.memberStatus === 'pending') {
    return (
      <section className="section"><div className="container container-narrow"><div className="card">
        <h2>Application awaiting approval</h2>
        <p>Your member portal will be available after the union office approves your application.</p>
      </div></div></section>
    );
  }

  if (role && session.role !== role) {
    return <Navigate to={session.role === 'staff' ? '/admin' : '/portal'} replace />;
  }

  return children;
}
