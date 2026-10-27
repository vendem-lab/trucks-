import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import LoadCard from '../components/LoadCard.jsx';
import Logo from '../components/Logo.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { BRAND, MEMBER_BENEFITS, PILLARS, NEWS_CATEGORIES, EVENT_TYPES } from '../config.js';
import { useStore } from '../lib/store.js';
import { formatDate } from '../lib/format.js';
import { eventDateParts } from '../lib/union.js';

const STATS = [
  { value: '12,400+', label: 'Members across Ghana' },
  { value: '16', label: 'Regions organised' },
  { value: 'GH₵2.1m', label: 'Recovered in unpaid dues' },
  { value: '24/7', label: 'Member support line' }
];

const DUES_SPLIT = [
  { label: 'Legal & representation', value: '35%' },
  { label: 'Training & safety', value: '25%' },
  { label: 'Welfare fund', value: '25%' },
  { label: 'Running the union', value: '15%' }
];

const TESTIMONIALS = [
  {
    quote:
      'I was owed four months of running money by a broker. The union’s lawyer had it settled in three weeks. That alone was worth ten years of dues.',
    name: 'Kwame Boateng',
    role: 'Flatbed driver · Kumasi'
  },
  {
    quote:
      'The load board changed how I plan my week. I know the rate before I call, and I have never driven to a pickup that did not exist.',
    name: 'Mary Adjei',
    role: 'Reefer driver · Kumasi'
  },
  {
    quote:
      'When my truck was off the road, the welfare fund covered two weeks of hospital bills. I did not have to borrow from a money lender.',
    name: 'Abdul Rahman',
    role: 'Owner-operator · Bolgatanga'
  }
];

function categoryLabel(id) {
  return NEWS_CATEGORIES.find((entry) => entry.id === id)?.label || 'Update';
}

function eventTypeLabel(id) {
  return EVENT_TYPES.find((entry) => entry.id === id)?.label || 'Event';
}

export default function Home() {
  const state = useStore();
  const openLoads = state.loads.filter((load) => load.status === 'open').slice(0, 3);
  const latestNews = [...state.news]
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, 3);
  const upcoming = [...state.events]
    .filter((event) => new Date(event.startDate).getTime() >= Date.now() - 86400000)
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    .slice(0, 3);

  return (
    <>
      <section className="hero hero-union">
        <div className="hero-glow" aria-hidden="true" />
        <div className="container hero-inner">
          <div className="hero-copy">
            <span className="eyebrow eyebrow-light">
              <span className="eyebrow-dot" /> Haulway Drivers’ Union · Ghana
            </span>
            <h1>
              One union.
              <span className="hero-accent"> Every driver.</span>
            </h1>
            <p className="hero-lede">
              Better rates, safer roads and a fair deal for the people who keep Ghana moving.
              Independent drivers and owner-operators standing together — with legal cover, verified
              loads and a welfare fund that shows its books.
            </p>
            <div className="hero-actions">
              <Link to="/membership" className="btn btn-primary btn-lg">
                Join the union <Icon name="arrowRight" size={18} />
              </Link>
              <Link to="/loads" className="btn btn-ghost btn-lg">
                <Icon name="clipboard" size={17} /> Browse verified loads
              </Link>
            </div>
            <div className="hero-proof">
              <div><strong>12,400+</strong><span>members</span></div>
              <div><strong>16</strong><span>regions</span></div>
              <div><strong>24/7</strong><span>member line</span></div>
            </div>
            <p className="hero-note">
              <Icon name="shield" size={14} /> Independent · Member-governed · No party affiliation
            </p>
          </div>

          <div className="hero-panel">
            <div className="hero-card hero-card-main union-card">
              <div className="union-card-head">
                <Logo light />
                <StatusBadge status="active" label="Member" />
              </div>
              <span className="union-card-label">Union member card</span>
              <strong className="union-card-name">Kofi Mensah</strong>
              <span className="union-card-number">HU-2026-0001</span>
              <div className="union-card-grid">
                <div><span>Tier</span><strong>Owner-operator</strong></div>
                <div><span>Region</span><strong>Greater Accra</strong></div>
                <div><span>Valid through</span><strong>31 Dec 2026</strong></div>
              </div>
              <div className="union-card-foot">
                <span><Icon name="checkCircle" size={15} /> Dues paid · October 2026</span>
                <span className="union-card-chip">HU</span>
              </div>
            </div>

            <div className="hero-card hero-card-float">
              <span className="hero-float-icon">
                <Icon name="clipboard" size={18} />
              </span>
              <div>
                <strong>GH₵6,200</strong>
                <span>Tema → Kumasi · flatbed</span>
              </div>
            </div>

            <div className="hero-card hero-card-float hero-card-float-2">
              <span className="hero-float-icon hero-float-icon-green">
                <Icon name="shield" size={18} />
              </span>
              <div>
                <strong>Legal cover active</strong>
                <span>One call, no fee</span>
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
              <span className="eyebrow">What we do</span>
              <h2>A union built around the driver, not the desk</h2>
            </div>
            <p className="section-lede">
              We are not a broker and we do not take a cut of your load. Every member gets the same
              representation, whatever they drive.
            </p>
          </div>

          <div className="services-grid">
            {PILLARS.map((pillar) => (
              <article key={pillar.title} className="service-card">
                <span className="service-icon">
                  <Icon name={pillar.icon} size={24} />
                </span>
                <h3>{pillar.title}</h3>
                <p>{pillar.copy}</p>
                <Link to="/about" className="service-link">
                  How it works <Icon name="arrowRight" size={15} />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt" id="loads">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Load board</span>
              <h2>Verified loads, posted before the phone starts ringing</h2>
            </div>
            <Link to="/loads" className="btn btn-outline">
              Open the load board <Icon name="arrowRight" size={16} />
            </Link>
          </div>

          <div className="load-grid">
            {openLoads.map((load) => (
              <LoadCard key={load.id} load={load}>
                <span className="load-lock"><Icon name="lock" size={14} /> Members only</span>
                <Link to="/loads" className="btn btn-outline btn-sm">
                  View load
                </Link>
              </LoadCard>
            ))}
          </div>

          <div className="load-board-note">
            <Icon name="shield" size={18} />
            <p>
              Every shipper is checked by the union office before a load goes live. Contact details
              unlock when your membership is active.
            </p>
            <Link to="/membership" className="card-link">
              Become a member <Icon name="arrowRight" size={14} />
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container coverage">
          <div className="coverage-copy">
            <span className="eyebrow">What your dues pay for</span>
            <h2>Small monthly dues. Real cover when it matters.</h2>
            <p>
              Dues start at GH₵60 a month. They fund the lawyer, the welfare fund and the training
              programme — and the accounts are presented to members every year.
            </p>
            <ul className="check-list">
              {MEMBER_BENEFITS.slice(0, 4).map((benefit) => (
                <li key={benefit.title}>
                  <Icon name="check" size={16} /> {benefit.title}
                </li>
              ))}
            </ul>
            <Link to="/membership" className="btn btn-primary">
              See membership tiers <Icon name="arrowRight" size={16} />
            </Link>
          </div>

          <div className="dues-split">
            <div className="card dues-split-card">
              <div className="card-head">
                <div>
                  <h3>Where the money goes</h3>
                  <p>Published every quarter to members.</p>
                </div>
                <span className="card-chip">2026</span>
              </div>
              <ul className="dues-split-list">
                {DUES_SPLIT.map((item) => (
                  <li key={item.label}>
                    <div>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                    <div className="dues-split-track">
                      <span style={{ width: item.value }} />
                    </div>
                  </li>
                ))}
              </ul>
              <div className="inline-note">
                <Icon name="fileText" size={16} />
                <span>Full audited accounts are tabled at the Annual General Meeting in December.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="home-split">
            <div>
              <div className="section-head section-head-compact">
                <div>
                  <span className="eyebrow">News</span>
                  <h2>From the union office</h2>
                </div>
                <Link to="/news" className="card-link">
                  All news <Icon name="arrowRight" size={14} />
                </Link>
              </div>
              <div className="news-list">
                {latestNews.map((article) => (
                  <Link key={article.id} to={`/news/${article.id}`} className="news-row">
                    <span className="news-row-meta">
                      <span className="badge badge-brand">{categoryLabel(article.category)}</span>
                      <time>{formatDate(article.publishedAt)}</time>
                    </span>
                    <strong>{article.title}</strong>
                    <p>{article.excerpt}</p>
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <div className="section-head section-head-compact">
                <div>
                  <span className="eyebrow">Events</span>
                  <h2>Meet, train, decide</h2>
                </div>
                <Link to="/events" className="card-link">
                  All events <Icon name="arrowRight" size={14} />
                </Link>
              </div>
              <div className="event-mini-list">
                {upcoming.map((event) => {
                  const parts = eventDateParts(event.startDate);
                  return (
                    <Link key={event.id} to="/events" className="event-mini">
                      <span className="event-date">
                        <strong>{parts.day}</strong>
                        <span>{parts.month}</span>
                      </span>
                      <div>
                        <span className="event-mini-type">{eventTypeLabel(event.type)}</span>
                        <strong>{event.title}</strong>
                        <span><Icon name="mapPin" size={13} /> {event.location}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Members</span>
              <h2>Drivers who decided not to carry it alone</h2>
            </div>
          </div>

          <div className="testimonial-grid">
            {TESTIMONIALS.map((item) => (
              <figure key={item.name} className="testimonial">
                <div className="testimonial-stars" role="img" aria-label="Five out of five">
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
            <h2>Your licence is your livelihood. Protect it.</h2>
            <p>
              Join in under five minutes. Applications are reviewed within two working days, and your
              first month of legal cover starts as soon as you are approved.
            </p>
          </div>
          <div className="cta-actions">
            <Link to="/membership" className="btn btn-primary btn-lg">
              Join the union <Icon name="arrowRight" size={18} />
            </Link>
            <a href={`tel:${BRAND.memberLine.replace(/\s/g, '')}`} className="btn btn-ghost btn-lg">
              <Icon name="phone" size={17} /> {BRAND.memberLine}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
