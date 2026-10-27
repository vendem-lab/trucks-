import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children, role }) {
  const { session, authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) {
    return <section className="section"><div className="container">Checking your account…</div></section>;
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (role && session.role !== role) {
    return <Navigate to={session.role === 'staff' ? '/admin' : '/portal'} replace />;
  }

  return children;
}
