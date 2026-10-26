import Icon from './Icon.jsx';
import StatusBadge from './StatusBadge.jsx';
import { formatNumber } from '../lib/format.js';

const TYPE_META = {
  'Dry Van': { icon: 'package', tone: 'orange' },
  Reefer: { icon: 'snowflake', tone: 'ice' },
  Flatbed: { icon: 'flatbed', tone: 'amber' },
  Tanker: { icon: 'fuel', tone: 'steel' },
  'Curtain-side': { icon: 'truck', tone: 'violet' }
};

export default function VehicleCard({ vehicle, footer }) {
  const meta = TYPE_META[vehicle.type] || { icon: 'truck', tone: 'orange' };
  return (
    <article className="vehicle-card">
      <div className={`vehicle-art vehicle-art-${meta.tone}`}>
        <span className="vehicle-unit">{vehicle.unit}</span>
        <Icon name={meta.icon} size={76} strokeWidth={1.1} className="vehicle-icon" />
        <span className="vehicle-type">{vehicle.type}</span>
      </div>
      <div className="vehicle-body">
        <div className="vehicle-head">
          <h3>
            {vehicle.make} <span>{vehicle.year}</span>
          </h3>
          <StatusBadge status={vehicle.status} />
        </div>
        <dl className="vehicle-specs">
          <div>
            <dt>Capacity</dt>
            <dd>{vehicle.capacityTons} t</dd>
          </div>
          <div>
            <dt>Plate</dt>
            <dd>{vehicle.plate}</dd>
          </div>
          <div>
            <dt>Driver</dt>
            <dd>{vehicle.driver}</dd>
          </div>
          <div>
            <dt>Odometer</dt>
            <dd>{formatNumber(vehicle.odometer)} km</dd>
          </div>
        </dl>
        {footer && <div className="vehicle-footer">{footer}</div>}
      </div>
    </article>
  );
}
