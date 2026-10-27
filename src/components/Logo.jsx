import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { BRAND } from '../config.js';

export default function Logo({ to = '/', light = false, showTagline = false }) {
  return (
    <Link to={to} className={`logo ${light ? 'logo-light' : ''}`}>
      <span className="logo-mark">
        <Icon name="truck" size={22} strokeWidth={2} />
      </span>
      <span className="logo-copy">
        <span className="logo-name">{BRAND.name}</span>
        {showTagline && <span className="logo-tagline">{BRAND.tagline}</span>}
      </span>
    </Link>
  );
}
