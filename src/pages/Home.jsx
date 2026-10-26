import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { SERVICES, BRAND } from '../config.js';
import { useStore } from '../lib/store.js';
import { formatCurrency } from '../lib/format.js';

const STATS = [
  { value: '1,240+', label: 'Loads moved this year' },
  { value: '98.4%', label: 'On-time delivery' },
  { value: '16', label: 'Regions covered' },
  { value: '24/7', label: 'Dispatch support' }
];

const STEPS = [
  {
    icon: 'fileText',
    title: 'Tell us what moves',
    copy: 'Share the route, weight and service level. You get a transparent estimate in seconds — no phone tag.'
  },
  {
    icon: 'truck',
    title: 'We assign the trailer',
    copy: 'Dispatch matches your freight to the right vehicle and driver, then confirms the pickup window with you.'
  },
  {
    icon: 'route',
    title: 'Follow it live',
    copy: 'Track every status change from pickup to proof of delivery using the reference on your booking.'
  }
];

const ROUTES = [
  { from: 'Tema', to: 'Kumasi', km: 240, service: 'FTL · Dry Van' },
  { from: 'Accra', to: 'Takoradi', km: 220, service: 'Reefer · 2–8°C' },
  { from: 'Tema', to: 'Tamale', km: 640, service: 'Flatbed · Heavy haul' },
  { from: 'Kumasi', to: 'Accra', km: 250, service: 'LTL · Consolidated' },
  { from: 'Accra', to: 'Ho', km: 160, service: 'Expedited · 24 hrs' },
  { from: 'Takoradi', to: 'Tema', km: 230, service: 'Tanker · Hazmat' }
];

const TESTIMONIALS = [
  {
    quote:
      'The reefer team sends temperature logs with every delivery. Our audits stopped being a scramble.',
    name: 'Yaw Darko',
    role: 'Supply Chain Lead, ColdChain Foods'
  },
  {
    quote:
      'We moved an 18-metre steel load to Tamale with permits sorted before we even asked. That is rare.',
    name: 'Esi Owusu',
    role: 'Project Manager, BuildRight Construction'
  },
  {
    quote:
      'Bookings used to take a day of emails. Now we get a reference and a live status before lunch.',
    name: 'Adwoa Boadi',
    role: 'Operations, Mercado Retail'
  }
];

export default function Home() {
  const state = useStore();
  const navigate = useNavigate();
  const [reference, setReference] = useState('');
  const featuredFleet = state.fleet.slice(0, 3);

  const handleTrack = (event) => {
    event.preventDefault();
    const value = reference.trim();
    navigate(value ? `/track?ref=${encodeURIComponent(value)}` : '/track');
  };

  return (
    <>
      <section className="hero">
        <div className="hero-glow" aria-hidden="true" />
        <div className="container hero-inner">
          <div className="hero-copy">
            <span className="eyebrow eyebrow-light">
              <span className="eyebrow-dot" /> Road freight across West Africa
            </span>
            <h1>
              Freight that arrives
              <span className="hero-accent"> exactly when it should.</span>
            </h1>
            <p className="hero-lede">
              Full truckload, part load, cold chain and expedited runs — one platform from quote to
              proof of delivery. Real trailers, real drivers, and a status feed you can actually trust.
            </p>
            <div className="hero-actions">
              <Link to="/quote" className="btn btn-primary btn-lg">
                Get an instant quote
                <Icon name="arrowRight" size={18} />
              </Link>
              <Link to="/track" className="btn btn-ghost btn-lg">
                <Icon name="search" size={17} /> Track a shipment
              </Link>
            </div>
            <form className="hero-track" onSubmit={handleTrack}>
              <label className="sr-only" htmlFor="hero-reference">
                Shipment reference
              </label>
              <Icon name="package" size={18} className="hero-track-icon" />
              <input
                id="hero-reference"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Enter a reference, e.g. HW-2026-1042"
                autoComplete="off"
              />
              <button type="submit" className="btn btn-dark btn-sm">
                Track
              </button>
            </form>
            <p className="hero-note">
              <Icon name="shield" size={14} /> Fully insured · GPS on every trailer · No hidden fees
            </p>
          </div>

          <div className="hero-panel">
            <div className="hero-card hero-card-main">
              <div className="hero-card-head">
                <span className="hero-card-label">Live shipment</span>
                <StatusBadge status="in_transit" />
              </div>
              <div className="hero-route">
                <div>
                  <span className="hero-route-code">ACC</span>
                  <span className="hero-route-city">Accra</span>
                </div>
                <div className="hero-route-line">
                  <span className="hero-route-truck">
                    <Icon name="truck" size={18} />
                  </span>
                </div>
                <div>
                  <span className="hero-route-code">TKD</span>
                  <span className="hero-route-city">Takoradi</span>
                </div>
              </div>
              <div className="hero-progress">
                <span style={{ width: '62%' }} />
              </div>
              <div className="hero-card-meta">
                <div>
                  <span>Reference</span>
                  <strong>HW-2026-1042</strong>
                </div>
                <div>
                  <span>Trailer</span>
                  <strong>HW-102 · Reefer</strong>
                </div>
                <div>
                  <span>ETA</span>
                  <strong>Tomorrow, 14:30</strong>
                </div>
              </div>
            </div>

            <div className="hero-card hero-card-float">
              <span className="hero-float-icon">
                <Icon name="temperature" size={18} />
              </span>
              <div>
                <strong>2.8°C</strong>
                <span>Trailer temperature · stable</span>
              </div>
            </div>

            <div className="hero-card hero-card-float hero-card-float-2">
              <span className="hero-float-icon hero-float-icon-green">
                <Icon name="checkCircle" size={18} />
              </span>
              <div>
                <strong>POD signed</strong>
                <span>Kumasi · 09:12 today</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-strip">
        <div className="container stats-grid">
          {STATS.map((stat) => (
            <div key={stat.label} className="stat-block">
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Services</span>
              <h2>One partner for every kind of load</h2>
            </div>
            <p className="section-lede">
              From a single pallet to a 35-tonne machine, we match the trailer and the route to the freight.
            </p>
          </div>

          <div className="services-grid">
            {SERVICES.map((service) => (
              <article key={service.id} className="service-card">
                <span className="service-icon">
                  <Icon name={service.icon} size={24} />
                </span>
                <h3>{service.name}</h3>
                <p>{service.tagline}</p>
                <span className="service-transit">
                  <Icon name="clock" size={14} /> {service.transit}
                </span>
                <Link to={`/services#${service.id}`} className="service-link">
                  Explore service <Icon name="arrowRight" size={15} />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">How it works</span>
              <h2>Booked in minutes, tracked the whole way</h2>
            </div>
            <Link to="/quote" className="btn btn-outline">
              Start a booking <Icon name="arrowRight" size={16} />
            </Link>
          </div>

          <div className="steps-grid">
            {STEPS.map((step, index) => (
              <article key={step.title} className="step-card">
                <span className="step-number">0{index + 1}</span>
                <span className="step-icon">
                  <Icon name={step.icon} size={22} />
                </span>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container coverage">
          <div className="coverage-copy">
            <span className="eyebrow">Coverage</span>
            <h2>Routes we run every week</h2>
            <p>
              Our network connects the ports at Tema and Takoradi to the northern corridor, with
              scheduled departures and partner hubs in every regional capital.
            </p>
            <ul className="check-list">
              <li><Icon name="check" size={16} /> Port-to-door container movements</li>
              <li><Icon name="check" size={16} /> Cross-dock consolidation in Accra and Kumasi</li>
              <li><Icon name="check" size={16} /> Escorted heavy haul to the northern border</li>
            </ul>
            <Link to="/fleet" className="btn btn-outline">
              See the fleet <Icon name="arrowRight" size={16} />
            </Link>
          </div>

          <div className="route-list">
            {ROUTES.map((route) => (
              <div key={`${route.from}-${route.to}`} className="route-row">
                <div className="route-cities">
                  <strong>{route.from}</strong>
                  <span className="route-arrow">
                    <Icon name="arrowRight" size={14} />
                  </span>
                  <strong>{route.to}</strong>
                </div>
                <div className="route-meta">
                  <span>{route.km} km</span>
                  <span className="route-service">{route.service}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-dark">
        <div className="container">
          <div className="section-head section-head-dark">
            <div>
              <span className="eyebrow eyebrow-light">The fleet</span>
              <h2>Trailers built for the work</h2>
            </div>
            <Link to="/fleet" className="btn btn-ghost">
              View all vehicles <Icon name="arrowRight" size={16} />
            </Link>
          </div>

          <div className="home-fleet-grid">
            {featuredFleet.map((vehicle) => (
              <article key={vehicle.id} className="home-fleet-card">
                <div className="home-fleet-head">
                  <span className="home-fleet-unit">{vehicle.unit}</span>
                  <StatusBadge status={vehicle.status} />
                </div>
                <div className="home-fleet-art">
                  <Icon
                    name={vehicle.type === 'Reefer' ? 'snowflake' : vehicle.type === 'Flatbed' ? 'flatbed' : 'truck'}
                    size={64}
                    strokeWidth={1.2}
                  />
                </div>
                <h3>{vehicle.make}</h3>
                <p>
                  {vehicle.type} · {vehicle.capacityTons}t · {vehicle.year}
                </p>
                <span className="home-fleet-driver">
                  <Icon name="user" size={14} /> {vehicle.driver}
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Customers</span>
              <h2>Trusted by teams that cannot be late</h2>
            </div>
          </div>

          <div className="testimonial-grid">
            {TESTIMONIALS.map((item) => (
              <figure key={item.name} className="testimonial">
                <div className="testimonial-stars" aria-label="Five out of five">
                  {[0, 1, 2, 3, 4].map((star) => (
                    <Icon key={star} name="star" size={15} />
                  ))}
                </div>
                <blockquote>{item.quote}</blockquote>
                <figcaption>
                  <span className="avatar avatar-sm">{item.name.slice(0, 1)}</span>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.role}</span>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="container cta-inner">
          <div>
            <h2>Ready to move something?</h2>
            <p>
              Get a firm estimate in under a minute. No account needed — just the route and the weight.
            </p>
          </div>
          <div className="cta-actions">
            <Link to="/quote" className="btn btn-primary btn-lg">
              Get a quote <Icon name="arrowRight" size={18} />
            </Link>
            <a href={`tel:${BRAND.phone.replace(/\s/g, '')}`} className="btn btn-ghost btn-lg">
              <Icon name="phone" size={17} /> {BRAND.phone}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
