import Icon from './Icon.jsx';
import { TIER_BY_ID } from '../config.js';

function joinedYear(value) {
  const date = new Date(value || '');
  return Number.isNaN(date.getTime()) ? '' : String(date.getFullYear());
}

export default function FleetCard({ vehicle }) {
  const tier = TIER_BY_ID[vehicle.tier];
  const year = joinedYear(vehicle.joinedAt);
  const location = [vehicle.city, vehicle.region].filter(Boolean).join(', ');

  return (
    <article className="fleet-card">
      <div className="fleet-photo">
        <img
          src={vehicle.photo}
          alt={`${vehicle.vehicleType} operated by ${vehicle.displayName}`}
          loading="lazy"
        />
        <span className="fleet-type">
          <Icon name="truck" size={13} /> {vehicle.vehicleType}
        </span>
      </div>
      <div className="fleet-body">
        <div className="fleet-title">
          <h3>{vehicle.displayName}</h3>
          {tier && <span className="fleet-tier">{tier.name}</span>}
        </div>
        {location && (
          <p className="fleet-location">
            <Icon name="mapPin" size={14} /> {location}
          </p>
        )}
        <div className="fleet-foot">
          {year && (
            <span>
              <Icon name="calendar" size={13} /> Member since {year}
            </span>
          )}
          <span className="fleet-verified">
            <Icon name="checkCircle" size={13} /> Verified member
          </span>
        </div>
      </div>
    </article>
  );
}
