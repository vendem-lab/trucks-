import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero.jsx';
import Icon from '../components/Icon.jsx';
import { BRAND, LEADERSHIP, PILLARS, REGIONS } from '../config.js';
import { initials } from '../lib/format.js';

const STEPS = [
  {
    icon: 'users',
    title: 'Members set the agenda',
    copy: 'Regional meetings decide the bargaining priorities each year. Any member in good standing can put a motion forward.'
  },
  {
    icon: 'flag',
    title: 'Representatives negotiate',
    copy: 'Elected regional representatives and the national executive sit across the table from shippers, operators and regulators.'
  },
  {
    icon: 'scale',
    title: 'The office enforces it',
    copy: 'A small staff team turns agreements into casework, training, welfare payments and the daily running of the load board.'
  }
];

export default function About() {
  return (
    <>
      <PageHero
        eyebrow="Who we are"
        title="An independent union, owned by its members."
        description="Haulway Drivers’ Union represents independent drivers, owner-operators and small fleets across Ghana. We are not a broker, a party or a recruitment agency. We are the people who drive."
      >
        <div className="page-hero-actions">
          <Link to="/membership" className="btn btn-primary">
            Join the union <Icon name="arrowRight" size={16} />
          </Link>
          <Link to="/contact" className="btn btn-outline">Talk to the office</Link>
        </div>
      </PageHero>

      <section className="section">
        <div className="container about-grid">
          <div className="about-copy">
            <span className="eyebrow">Our story</span>
            <h2>Started at a lorry park. Still answerable to drivers.</h2>
            <p>
              The union began in {BRAND.founded} when a group of long-haul drivers in Tema started
              keeping a written record of every unpaid trip. What began as a shared notebook became a
              bargaining committee, then a welfare fund, then a national union.
            </p>
            <p>
              We do not own trucks and we do not sell freight. That independence is the point. When we
              sit down with a shipper or a regulator, our only obligation is to the members in the room
              behind us.
            </p>
            <p>
              Today the union organises in all sixteen regions, runs a verified load board and funds
              legal cover, training and emergency welfare from member dues. The accounts are audited
              and presented at the Annual General Meeting.
            </p>
            <div className="about-facts">
              <div><strong>{BRAND.founded}</strong><span>Founded in Tema</span></div>
              <div><strong>16</strong><span>Regions organised</span></div>
              <div><strong>100%</strong><span>Member-governed</span></div>
            </div>
          </div>

          <aside className="card about-card">
            <div className="card-head">
              <div>
                <h3>At a glance</h3>
                <p>The union in numbers.</p>
              </div>
              <span className="card-chip">2026</span>
            </div>
            <dl className="settings-list">
              <div><dt>Members</dt><dd>12,400+</dd></div>
              <div><dt>Regions</dt><dd>All 16</dd></div>
              <div><dt>Head office</dt><dd>Accra</dd></div>
              <div><dt>Member line</dt><dd>{BRAND.memberLine}</dd></div>
              <div><dt>Dues from</dt><dd>GH₵60 / month</dd></div>
              <div><dt>Affiliation</dt><dd>None — independent</dd></div>
            </dl>
            <div className="inline-note">
              <Icon name="shield" size={16} />
              <span>Every member gets the same representation, regardless of tier or employer.</span>
            </div>
          </aside>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">What we stand for</span>
              <h2>Three things we will not trade away</h2>
            </div>
            <p className="section-lede">
              Every campaign, negotiation and service has to serve one of these. If it does not, we do
              not do it.
            </p>
          </div>
          <div className="services-grid">
            {PILLARS.map((pillar) => (
              <article key={pillar.title} className="service-card">
                <span className="service-icon"><Icon name={pillar.icon} size={24} /></span>
                <h3>{pillar.title}</h3>
                <p>{pillar.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">How it works</span>
              <h2>Member-led, not office-led</h2>
            </div>
          </div>
          <div className="steps-grid">
            {STEPS.map((step, index) => (
              <article key={step.title} className="step-card">
                <span className="step-number">0{index + 1}</span>
                <span className="step-icon"><Icon name={step.icon} size={22} /></span>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt" id="leadership">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Leadership</span>
              <h2>The people elected to represent you</h2>
            </div>
            <p className="section-lede">
              Officers are elected by members and serve a three-year term. They are drivers and
              operators first.
            </p>
          </div>
          <div className="leader-grid">
            {LEADERSHIP.map((leader) => (
              <article key={leader.name} className="leader-card">
                <span className="avatar avatar-lg">{initials(leader.name)}</span>
                <div>
                  <h3>{leader.name}</h3>
                  <span className="leader-role">{leader.role}</span>
                  <span className="leader-region"><Icon name="mapPin" size={13} /> {leader.region}</span>
                  <p>{leader.bio}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Where we organise</span>
              <h2>A representative in every region</h2>
            </div>
            <p className="section-lede">
              Regional representatives are the first call for members who need help locally. Find yours
              through the member line.
            </p>
          </div>
          <div className="region-grid">
            {REGIONS.map((region) => (
              <span key={region} className="region-chip">
                <Icon name="mapPin" size={14} /> {region}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="container cta-inner">
          <div>
            <h2>Put a union behind your licence.</h2>
            <p>Join today and your first month of legal cover starts when your application is approved.</p>
          </div>
          <div className="cta-actions">
            <Link to="/membership" className="btn btn-primary btn-lg">
              Join the union <Icon name="arrowRight" size={18} />
            </Link>
            <Link to="/contact" className="btn btn-ghost btn-lg">Ask a question</Link>
          </div>
        </div>
      </section>
    </>
  );
}
