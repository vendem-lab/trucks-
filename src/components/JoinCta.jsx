import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useAuth } from '../context/authContext.js';
import { joinTargetFor } from '../lib/sessionLinks.js';

/**
 * Membership call to action that adapts to the signed-in account.
 * Signed-in members are sent to their portal instead of the application form.
 */
export default function JoinCta({ className = 'btn btn-primary', iconSize = 16 }) {
  const { session, authLoading } = useAuth();
  if (authLoading) return null;
  const target = joinTargetFor(session);

  return (
    <Link to={target.to} className={className}>
      {target.label}
      <Icon name="arrowRight" size={iconSize} />
    </Link>
  );
}
