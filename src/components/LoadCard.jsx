import Icon from './Icon.jsx';
import StatusBadge from './StatusBadge.jsx';
import { formatCurrency, formatShortDate, timeAgo } from '../lib/format.js';

export default function LoadCard({ load, unlocked = false, showContact = false, children }) {
  return (
    <article className="load-card">
      <div className="load-card-head">
        <div>
          <span className="load-ref">{load.reference}</span>
          <h3>{load.title}</h3>
        </div>
        <StatusBadge status={load.status} />
      </div>

      <div className="load-route">
        <div className="load-stop">
          <span>From</span>
          <strong>{load.origin}</strong>
        </div>
        <span className="load-route-arrow"><Icon name="arrowRight" size={16} /></span>
        <div className="load-stop">
          <span>To</span>
          <strong>{load.destination}</strong>
        </div>
        <div className="load-rate">
          <span>Rate</span>
          <strong>{formatCurrency(load.rate)}</strong>
        </div>
      </div>

      <div className="load-facts">
        <span><Icon name="truck" size={14} /> {load.trailerType}</span>
        <span><Icon name="weight" size={14} /> {load.weightTons} t</span>
        <span><Icon name="route" size={14} /> {load.distanceKm} km</span>
        <span><Icon name="calendar" size={14} /> {formatShortDate(load.pickupDate)}</span>
      </div>

      {load.requirements && <p className="load-req">{load.requirements}</p>}

      {showContact && unlocked && (
        <div className="load-contact">
          <Icon name="phone" size={15} />
          <div>
            <strong>{load.contactName}</strong>
            <span>{load.contactPhone} · {load.contactEmail}</span>
          </div>
        </div>
      )}

      {load.status === 'filled' && load.filledBy && (
        <div className="load-filled">
          <Icon name="checkCircle" size={15} /> Claimed by {load.filledBy}
        </div>
      )}

      <div className="load-card-foot">
        <span className="load-shipper"><Icon name="building" size={14} /> {load.shipper}</span>
        <span className="load-posted">Posted {timeAgo(load.postedAt)}</span>
      </div>

      {children && <div className="load-card-actions">{children}</div>}
    </article>
  );
}
