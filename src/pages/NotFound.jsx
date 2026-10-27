import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';

export default function NotFound() {
  return (
    <section className="not-found">
      <div className="container not-found-inner">
        <span className="not-found-code">404</span>
        <h1>This route does not exist.</h1>
        <p>
          The page may have moved, or the link may be wrong. Let us get you back to something useful.
        </p>
        <div className="not-found-actions">
          <Link to="/" className="btn btn-primary">
            Back to home <Icon name="arrowRight" size={16} />
          </Link>
          <Link to="/loads" className="btn btn-outline">
            Open the load board
          </Link>
          <Link to="/contact" className="btn btn-ghost">
            Contact the union
          </Link>
        </div>
      </div>
    </section>
  );
}
