import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero.jsx';
import Field from '../components/Field.jsx';
import Icon from '../components/Icon.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import {
  BRAND,
  FAQS,
  MEMBER_BENEFITS,
  REGIONS,
  TIERS,
  TIER_BY_ID,
  TRAILER_TYPES
} from '../config.js';
import { createMemberAccount, submitMemberApplication } from '../lib/auth.js';
import { getMemberByEmail, isDemoMode } from '../lib/store.js';
import { isValidEmail, isValidPhone } from '../lib/format.js';
import { useAuth } from '../context/authContext.js';
import { useToast } from '../context/ToastContext.jsx';

const EMPTY = {
  name: '',
  email: '',
  phone: '',
  password: '',
  tier: 'independent',
  region: 'Greater Accra',
  city: '',
  vehicleType: 'Dry van',
  vehiclePlate: '',
  licenseNumber: '',
  emergencyName: '',
  emergencyPhone: '',
  notes: ''
};

const JOIN_STEPS = [
  {
    icon: 'fileText',
    title: 'Send your details',
    copy: 'Tell us what you drive and where you operate. It takes about three minutes.'
  },
  {
    icon: 'idCard',
    title: 'We check your licence',
    copy: 'The membership office verifies your licence and vehicle details, usually within two working days.'
  },
  {
    icon: 'checkCircle',
    title: 'Start using your membership',
    copy: 'Once approved you can sign in, claim loads and access legal cover and training.'
  }
];

export default function Membership() {
  const { session } = useAuth();
  const { push } = useToast();
  const applyingWithAccount = Boolean(session?.profileMissing);
  const [form, setForm] = useState(() => ({
    ...EMPTY,
    name: applyingWithAccount ? session?.name || '' : '',
    email: applyingWithAccount ? session?.email || '' : ''
  }));
  const [errors, setErrors] = useState({});
  const [created, setCreated] = useState(null);

  const member =
    session?.role === 'member' && !session.profileMissing
      ? { ...session, tier: session.tier }
      : null;
  const isStaff = session?.role === 'staff' && !session.profileMissing;

  useEffect(() => {
    if (!applyingWithAccount) return;
    setForm((current) => ({
      ...current,
      name: current.name || session?.name || '',
      email: session?.email || current.email
    }));
  }, [applyingWithAccount, session?.name, session?.email]);

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const chooseTier = (tierId) => {
    setForm((current) => ({ ...current, tier: tierId }));
    document.getElementById('join')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = 'Enter your full name.';
    if (!isValidEmail(form.email)) next.email = 'Enter a valid email address.';
    if (!applyingWithAccount && getMemberByEmail(form.email)) next.email = 'That email already has a member record.';
    if (!isValidPhone(form.phone)) next.phone = 'Enter a phone number we can reach you on.';
    if (!applyingWithAccount && form.password.length < 6) next.password = 'Use at least 6 characters.';
    if (!form.city.trim()) next.city = 'Enter your city or town.';
    if (!form.vehiclePlate.trim()) next.vehiclePlate = 'Enter your vehicle registration.';
    if (!form.licenseNumber.trim()) next.licenseNumber = 'Enter your licence number.';
    if (!form.emergencyName.trim()) next.emergencyName = 'Add an emergency contact.';
    if (!isValidPhone(form.emergencyPhone)) next.emergencyPhone = 'Add a valid emergency number.';
    setErrors(next);
    if (Object.keys(next).length) {
      push('Check the highlighted fields before applying.', 'error');
      return;
    }

    try {
      const member = applyingWithAccount
        ? await submitMemberApplication(form)
        : await createMemberAccount(form);
      setCreated(member);
      setForm(EMPTY);
      push('Application received. Your account is pending office approval.', 'success');
    } catch (error) {
      const messages = {
        'auth/email-already-in-use': 'That email already has an account. Try signing in.',
        'auth/weak-password': 'Choose a stronger password with at least 6 characters.'
      };
      setErrors((current) => ({ ...current, email: messages[error.code] || error.message }));
      push('We could not submit your application. Check the form and try again.', 'error');
    }
  };

  return (
    <>
      <PageHero
        eyebrow="Membership"
        title="Join once. Stand together every day."
        description="Membership is open to any professional driver, owner-operator or small fleet in Ghana. Pick the tier that fits how you work, and the union handles the rest."
      >
        <div className="page-hero-actions">
          <a href="#join" className="btn btn-primary">
            Start your application <Icon name="arrowRight" size={16} />
          </a>
          <a href="#tiers" className="btn btn-outline">Compare tiers</a>
        </div>
      </PageHero>

      <section className="section" id="tiers">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Dues & tiers</span>
              <h2>One union, three ways to belong</h2>
            </div>
            <p className="section-lede">
              Every tier includes representation, the verified load board and the member line. Higher
              tiers add cover for the vehicle and the crew.
            </p>
          </div>

          <div className="tier-grid">
            {TIERS.map((tier) => (
              <article
                key={tier.id}
                className={`tier-card ${tier.featured ? 'tier-card-featured' : ''}`}
              >
                {tier.featured && <span className="tier-flag">Most members choose this</span>}
                <div className="tier-head">
                  <h3>{tier.name}</h3>
                  <p>{tier.tagline}</p>
                </div>
                <div className="tier-price">
                  <strong>GH₵{tier.price}</strong>
                  <span>/ {tier.period}</span>
                </div>
                <p className="tier-copy">{tier.description}</p>
                <ul className="tier-perks">
                  {tier.perks.map((perk) => (
                    <li key={perk}>
                      <Icon name="check" size={15} /> {perk}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={`btn ${tier.featured ? 'btn-primary' : 'btn-outline'} btn-block`}
                  onClick={() => chooseTier(tier.id)}
                >
                  Apply as {tier.name.toLowerCase()}
                </button>
              </article>
            ))}
          </div>

          <p className="tier-note">
            <Icon name="wallet" size={15} />
            Pay monthly by mobile money, bank transfer or cash at Union House. Dues are reviewed at the
            Annual General Meeting and published to members.
          </p>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">What members get</span>
              <h2>More than a card in your wallet</h2>
            </div>
            <p className="section-lede">
              The union exists to make the job safer, fairer and more predictable. These are the
              services every member can use.
            </p>
          </div>
          <div className="benefit-grid">
            {MEMBER_BENEFITS.map((benefit) => (
              <article key={benefit.title} className="benefit-card">
                <span className="benefit-icon">
                  <Icon name={benefit.icon} size={22} />
                </span>
                <h3>{benefit.title}</h3>
                <p>{benefit.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="join">
        <div className="container join-layout">
          <div className="join-main">
            {session?.role === 'member' && session.memberStatus === 'pending' && !session.profileMissing ? (
              <div className="card join-signed-in">
                <span className="empty-icon"><Icon name="clock" size={26} /></span>
                <h2>Your application is awaiting approval</h2>
                <p>
                  The membership office is checking the details for {session.email}. Your member
                  number activates once the application is approved.
                </p>
                <div className="join-signed-in-actions">
                  <Link to="/portal" className="btn btn-outline">
                    View application status
                  </Link>
                </div>
              </div>
            ) : member ? (
              <div className="card join-signed-in">
                <span className="empty-icon"><Icon name="checkCircle" size={26} /></span>
                <h2>You are already a member</h2>
                <p>
                  Your membership is linked to {session.email}. Manage your profile, dues and alerts
                  from the member portal.
                </p>
                <div className="join-signed-in-actions">
                  <Link to="/portal" className="btn btn-primary">
                    Open my portal <Icon name="arrowRight" size={16} />
                  </Link>
                  <Link to="/portal/dues" className="btn btn-outline">View my dues</Link>
                </div>
              </div>
            ) : isStaff ? (
              <div className="card join-signed-in">
                <span className="empty-icon"><Icon name="shield" size={26} /></span>
                <h2>You are signed in as union staff</h2>
                <p>
                  Staff accounts manage the register from the admin workspace. Sign out first if you
                  need to submit a membership application for a driver.
                </p>
                <div className="join-signed-in-actions">
                  <Link to="/admin" className="btn btn-primary">
                    Open the admin workspace <Icon name="arrowRight" size={16} />
                  </Link>
                </div>
              </div>
            ) : created ? (
              <div className="card application-success">
                <span className="quote-success-icon">
                  <Icon name="checkCircle" size={30} />
                </span>
                <span className="eyebrow">Application received</span>
                <h2>Welcome to the union, {created.name.split(' ')[0]}.</h2>
                <p>
                  Your application is with the membership office. We verify licence and vehicle
                  details within two working days, then your member number activates.
                </p>
                <dl className="application-receipt">
                  <div><dt>Member number</dt><dd>{created.memberNumber}</dd></div>
                  <div><dt>Tier</dt><dd>{TIER_BY_ID[created.tier]?.name}</dd></div>
                  <div><dt>Status</dt><dd><StatusBadge status={created.status} /></dd></div>
                  <div><dt>Sign-in email</dt><dd>{created.email}</dd></div>
                </dl>
                <div className="application-success-actions">
                  <Link to="/login" className="btn btn-primary">
                    Sign in after approval <Icon name="arrowRight" size={16} />
                  </Link>
                  <Link to="/loads" className="btn btn-outline">Browse the load board</Link>
                </div>
                <p className="application-help">
                  Need to change something? Call the member line on {BRAND.memberLine} and quote your
                  member number.
                </p>
              </div>
            ) : (
              <form className="card join-form-card" onSubmit={handleSubmit} noValidate>
                <div className="card-head">
                  <div>
                    <span className="eyebrow">Application</span>
                    <h2>Become a member</h2>
                    <p>All fields are required unless marked otherwise.</p>
                  </div>
                  <span className="card-chip">Ghana</span>
                </div>

                {applyingWithAccount && (
                  <div className="inline-note inline-note-info">
                    <Icon name="checkCircle" size={16} />
                    <span>
                      Your Google account is verified. Finish this application and the office will
                      review it before your portal opens.
                    </span>
                  </div>
                )}

                <fieldset className="form-section">
                  <legend><span className="form-step">1</span> About you</legend>
                  <div className="form-grid">
                    <Field label="Full name" htmlFor="join-name" required error={errors.name}>
                      <input
                        id="join-name"
                        value={form.name}
                        onChange={update('name')}
                        placeholder="e.g. Kofi Mensah"
                        autoComplete="name"
                      />
                    </Field>
                    <Field
                      label="Email"
                      htmlFor="join-email"
                      required
                      error={errors.email}
                      hint={applyingWithAccount ? 'Linked to your Google account.' : ''}
                    >
                      <input
                        id="join-email"
                        type="email"
                        value={form.email}
                        onChange={update('email')}
                        placeholder="you@example.com"
                        autoComplete="email"
                        readOnly={applyingWithAccount}
                      />
                    </Field>
                    <Field label="Phone" htmlFor="join-phone" required error={errors.phone}>
                      <input
                        id="join-phone"
                        type="tel"
                        value={form.phone}
                        onChange={update('phone')}
                        placeholder="+233 24 000 0000"
                        autoComplete="tel"
                      />
                    </Field>
                    {!applyingWithAccount && (
                      <Field
                        label="Create a password"
                        htmlFor="join-password"
                        required
                        error={errors.password}
                        hint="You will use this to sign in to the member portal."
                      >
                        <input
                          id="join-password"
                          type="password"
                          value={form.password}
                          onChange={update('password')}
                          placeholder="At least 6 characters"
                          autoComplete="new-password"
                        />
                      </Field>
                    )}
                  </div>
                </fieldset>

                <fieldset className="form-section">
                  <legend><span className="form-step">2</span> Membership & vehicle</legend>
                  <div className="form-grid">
                    <Field label="Membership tier" htmlFor="join-tier" required>
                      <select id="join-tier" value={form.tier} onChange={update('tier')}>
                        {TIERS.map((tier) => (
                          <option key={tier.id} value={tier.id}>
                            {tier.name} — GH₵{tier.price}/month
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Region" htmlFor="join-region" required>
                      <select id="join-region" value={form.region} onChange={update('region')}>
                        {REGIONS.map((region) => (
                          <option key={region} value={region}>{region}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="City or town" htmlFor="join-city" required error={errors.city}>
                      <input
                        id="join-city"
                        value={form.city}
                        onChange={update('city')}
                        placeholder="e.g. Tema"
                      />
                    </Field>
                    <Field label="Vehicle type" htmlFor="join-vehicle" required>
                      <select id="join-vehicle" value={form.vehicleType} onChange={update('vehicleType')}>
                        {TRAILER_TYPES.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </Field>
                    <Field
                      label="Vehicle registration"
                      htmlFor="join-plate"
                      required
                      error={errors.vehiclePlate}
                    >
                      <input
                        id="join-plate"
                        value={form.vehiclePlate}
                        onChange={update('vehiclePlate')}
                        placeholder="e.g. GT 4821-24"
                      />
                    </Field>
                    <Field
                      label="Licence number"
                      htmlFor="join-licence"
                      required
                      error={errors.licenseNumber}
                    >
                      <input
                        id="join-licence"
                        value={form.licenseNumber}
                        onChange={update('licenseNumber')}
                        placeholder="e.g. DL-448201"
                      />
                    </Field>
                  </div>
                </fieldset>

                <fieldset className="form-section">
                  <legend><span className="form-step">3</span> Emergency contact</legend>
                  <div className="form-grid">
                    <Field
                      label="Contact name"
                      htmlFor="join-emergency-name"
                      required
                      error={errors.emergencyName}
                    >
                      <input
                        id="join-emergency-name"
                        value={form.emergencyName}
                        onChange={update('emergencyName')}
                        placeholder="e.g. Efua Mensah"
                      />
                    </Field>
                    <Field
                      label="Contact phone"
                      htmlFor="join-emergency-phone"
                      required
                      error={errors.emergencyPhone}
                    >
                      <input
                        id="join-emergency-phone"
                        type="tel"
                        value={form.emergencyPhone}
                        onChange={update('emergencyPhone')}
                        placeholder="+233 24 000 0000"
                      />
                    </Field>
                  </div>
                  <Field
                    label="Anything else we should know?"
                    htmlFor="join-notes"
                    hint="Optional — routes, experience or support you need."
                  >
                    <textarea
                      id="join-notes"
                      rows="3"
                      value={form.notes}
                      onChange={update('notes')}
                      placeholder="e.g. I run Accra–Kumasi most weeks and want fuel rebate details."
                    />
                  </Field>
                </fieldset>

                <button type="submit" className="btn btn-primary btn-lg btn-block">
                  Submit application <Icon name="arrowRight" size={17} />
                </button>
                <p className="join-terms">
                  By applying you agree to the union’s member handbook and dues schedule.{' '}
                  {isDemoMode()
                    ? 'This demo stores your details in this browser only.'
                    : 'Your details are sent securely to the union office for review.'}
                </p>
              </form>
            )}
          </div>

          <aside className="join-aside">
            <div className="card join-steps-card">
              <div className="card-head">
                <div>
                  <h3>What happens next</h3>
                  <p>From application to member card.</p>
                </div>
              </div>
              <ol className="join-steps">
                {JOIN_STEPS.map((step, index) => (
                  <li key={step.title}>
                    <span className="step-icon"><Icon name={step.icon} size={20} /></span>
                    <div>
                      <strong>{index + 1}. {step.title}</strong>
                      <span>{step.copy}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="card join-help-card">
              <h3>Need help applying?</h3>
              <p>
                The membership desk is open weekdays. Call and we will complete the form with you over
                the phone.
              </p>
              <a href={`tel:${BRAND.memberLine.replace(/\s/g, '')}`} className="join-help-link">
                <Icon name="phone" size={16} /> {BRAND.memberLine}
              </a>
              <a href={`mailto:${BRAND.email}`} className="join-help-link">
                <Icon name="mail" size={16} /> {BRAND.email}
              </a>
              <p className="join-help-hours">
                <Icon name="clock" size={14} /> {BRAND.hours}
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container container-narrow">
          <div className="section-head">
            <div>
              <span className="eyebrow">FAQ</span>
              <h2>Questions before you join</h2>
            </div>
          </div>
          <div className="faq-list">
            {FAQS.map((faq) => (
              <details key={faq.question} className="faq-item">
                <summary>
                  {faq.question}
                  <Icon name="chevronDown" size={18} />
                </summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
