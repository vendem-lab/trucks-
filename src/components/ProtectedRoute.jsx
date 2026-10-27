import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children, role }) {
  const { session } = useAuth();
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (role && session.role !== role) {
    return <Navigate to={session.role === 'staff' ? '/admin' : '/portal'} replace />;
  }

  return children;
}
