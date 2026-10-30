import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero.jsx';
import FleetCard from '../components/FleetCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Icon from '../components/Icon.jsx';
import { useStore } from '../lib/store.js';

function newestFirst(a, b) {
  const updated = new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
  if (updated) return updated;
  return String(a.displayName || '').localeCompare(String(b.displayName || ''));
}

export default function Fleet() {
  const state = useStore();
  const [vehicleType, setVehicleType] = useState('all');
  const [region, setRegion] = useState('all');

  const fleet = useMemo(
    () =>
      [...(state.fleet || [])]
        .filter((vehicle) => vehicle.active !== false)
        .sort(newestFirst),
    [state.fleet]
  );

  const types = useMemo(
    () => Array.from(new Set(fleet.map((vehicle) => vehicle.vehicleType).filter(Boolean))).sort(),
    [fleet]
  );
  const regions = useMemo(
    () => Array.from(new Set(fleet.map((vehicle) => vehicle.region).filter(Boolean))).sort(),
    [fleet]
  );

  const filtered = useMemo(
    () =>
      fleet.filter(
        (vehicle) =>
          (vehicleType === 'all' || vehicle.vehicleType === vehicleType) &&
          (region === 'all' || vehicle.region === region)
      ),
    [fleet, vehicleType, region]
  );

  return (
    <>
      <PageHero
        eyebrow="Member fleet"
        title="The vehicles behind the union."
        description="Browse vehicles operated by active union members, including trucks, buses and tankers. Filter by type or region, then contact the office about availability."
      >
        <div className="fleet-summary">
          <div><strong>{fleet.length}</strong><span>published vehicles</span></div>
          <div><strong>{types.length}</strong><span>vehicle types</span></div>
          <div><strong>{regions.length}</strong><span>regions represented</span></div>
        </div>
      </PageHero>

      <section className="section">
        <div className="container">
          <h2 className="sr-only">Published member vehicles</h2>
          <div className="fleet-filter">
            <div className="chip-row" role="group" aria-label="Filter by vehicle type">
              <button
                type="button"
                className={`chip ${vehicleType === 'all' ? 'is-active' : ''}`}
                onClick={() => setVehicleType('all')}
              >
                All vehicles
              </button>
              {types.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`chip ${vehicleType === type ? 'is-active' : ''}`}
                  onClick={() => setVehicleType(type)}
                >
                  {type}
                </button>
              ))}
            </div>

            <label className="fleet-region">
              <span>Region</span>
              <select value={region} onChange={(event) => setRegion(event.target.value)}>
                <option value="all">All regions</option>
                {regions.map((entry) => (
                  <option key={entry} value={entry}>{entry}</option>
                ))}
              </select>
            </label>
          </div>

          {state.loading ? (
            <div className="card"><p>Loading the member fleet…</p></div>
          ) : filtered.length ? (
            <div className="fleet-grid">
              {filtered.map((vehicle) => (
                <FleetCard key={vehicle.id} vehicle={vehicle} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="truck"
              title={fleet.length ? 'No vehicles match those filters' : 'No member vehicles are listed yet'}
              description={
                fleet.length
                  ? 'Try another vehicle type or region.'
                  : 'No active member vehicles are currently listed. Contact the union office for transport enquiries.'
              }
              action={
                <Link to="/contact?type=loads&subject=Vehicle%20availability%20request" className="btn btn-primary">
                  Ask about availability <Icon name="arrowRight" size={16} />
                </Link>
              }
            />
          )}

          <div className="inline-note fleet-privacy">
            <Icon name="shield" size={16} />
            <span>
              We publish only the vehicle photo or illustration, member name, vehicle type, city and region.
              Registration numbers, phone numbers, licence details and emergency contacts stay private.
            </span>
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="container cta-inner">
          <div>
            <h2>Need a vehicle for a job?</h2>
            <p>
              Tell the union office what you need, where and when. We can help connect your request
              with an active member who operates the right vehicle.
            </p>
          </div>
          <div className="cta-actions">
            <Link to="/contact?type=loads&subject=Vehicle%20request" className="btn btn-primary btn-lg">
              Request a vehicle <Icon name="arrowRight" size={18} />
            </Link>
            <Link to="/contact" className="btn btn-ghost btn-lg">
              <Icon name="phone" size={17} /> Contact the union
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
