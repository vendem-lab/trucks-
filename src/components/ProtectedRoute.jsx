import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext.js';

export default function ProtectedRoute({ children, role }) {
  const { session, authLoading, authError, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const signOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

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
            {session.profileMissing ? (
              <>
                <p>Finish a membership application to link this account to the union register.</p>
                <Link to="/membership" className="btn btn-primary">Complete my application</Link>
              </>
            ) : (
              <p>Contact the union office to finish linking your account.</p>
            )}
            <p><button type="button" className="btn btn-ghost" onClick={signOut}>Sign out</button></p>
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
        <button type="button" className="btn btn-ghost" onClick={signOut}>Sign out</button>
      </div></div></section>
    );
  }

  if (role && session.role !== role) {
    return <Navigate to={session.role === 'staff' ? '/admin' : '/portal'} replace />;
  }

  return children;
}
