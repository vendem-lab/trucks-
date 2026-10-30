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
        .filter((vehicle) => vehicle.active !== false && vehicle.photo)
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
        description="Members publish a photo of the truck, bus or tanker they operate. Browse the fleet by vehicle type and region — then join the union to put your own vehicle on the map."
      >
        <div className="fleet-summary">
          <div><strong>{fleet.length}</strong><span>published vehicles</span></div>
          <div><strong>{types.length}</strong><span>vehicle types</span></div>
          <div><strong>{regions.length}</strong><span>regions represented</span></div>
        </div>
      </PageHero>

      <section className="section">
        <div className="container">
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
              title={fleet.length ? 'No vehicles match those filters' : 'No vehicle photos published yet'}
              description={
                fleet.length
                  ? 'Try another vehicle type or region.'
                  : 'Active members can add a photo from their portal profile. Once published, their vehicle appears here for customers to see.'
              }
              action={
                <Link to="/membership" className="btn btn-primary">
                  Join the union <Icon name="arrowRight" size={16} />
                </Link>
              }
            />
          )}

          <div className="inline-note fleet-privacy">
            <Icon name="shield" size={16} />
            <span>
              We publish only the vehicle photo, member name, vehicle type, city and region.
              Registration numbers, phone numbers, licence details and emergency contacts stay private.
            </span>
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="container cta-inner">
          <div>
            <h2>Put your vehicle on the map.</h2>
            <p>
              Join the union, then add a photo from your member portal. Customers can see what you
              operate, and you keep every private detail off the public page.
            </p>
          </div>
          <div className="cta-actions">
            <Link to="/membership" className="btn btn-primary btn-lg">
              Join the union <Icon name="arrowRight" size={18} />
            </Link>
            <Link to="/login" className="btn btn-ghost btn-lg">
              <Icon name="lock" size={17} /> Member login
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
