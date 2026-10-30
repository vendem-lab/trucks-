import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero.jsx';
import Field from '../components/Field.jsx';
import Icon from '../components/Icon.jsx';
import { BRAND, ENQUIRY_TYPES, FAQS } from '../config.js';
import { addMessage } from '../lib/store.js';
import { isValidEmail } from '../lib/format.js';
import { useToast } from '../context/ToastContext.jsx';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/authContext.js';
import { accountLinkFor } from '../lib/sessionLinks.js';

const INITIAL = {
  name: '',
  email: '',
  phone: '',
  type: 'general',
  subject: '',
  message: ''
};

export default function Contact() {
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const account = accountLinkFor(session);
  const [form, setForm] = useState(() => ({
    ...INITIAL,
    type: ENQUIRY_TYPES.some((type) => type.id === searchParams.get('type'))
      ? searchParams.get('type')
      : INITIAL.type,
    subject: searchParams.get('subject') || INITIAL.subject
  }));
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);
  const { push } = useToast();

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = 'Tell us your name.';
    if (!isValidEmail(form.email)) next.email = 'Enter a valid email address.';
    if (!form.subject.trim()) next.subject = 'Add a short subject.';
    if (form.message.trim().length < 10) next.message = 'Add a little more detail (10+ characters).';
    setErrors(next);
    if (Object.keys(next).length) {
      push('Check the highlighted fields before sending.', 'error');
      return;
    }
    try {
      await addMessage(form);
      setForm(INITIAL);
      setSent(true);
      push('Message sent. The union office will get back to you.', 'success');
    } catch (error) {
      push(error.message || 'Could not send your message. Please try again.', 'error');
    }
  };

  return (
    <>
      <PageHero
        eyebrow="Contact the union"
        title="Someone answers. Usually the same day."
        description="Membership questions, dues, legal support or a problem with a load — the office is here on weekdays, and the member line runs around the clock for emergencies."
      />

      <section className="section">
        <div className="container contact-layout">
          <div className="contact-details">
            <h2 className="sr-only">Contact details</h2>
            <div className="contact-cards">
              <a className="contact-card" href={`tel:${BRAND.memberLine.replace(/\s/g, '')}`}>
                <span className="addon-icon">
                  <Icon name="phone" size={20} />
                </span>
                <div>
                  <span>Member line · 24/7</span>
                  <strong>{BRAND.memberLine}</strong>
                </div>
              </a>
              <a className="contact-card" href={`tel:${BRAND.phone.replace(/\s/g, '')}`}>
                <span className="addon-icon">
                  <Icon name="briefcase" size={20} />
                </span>
                <div>
                  <span>Union office</span>
                  <strong>{BRAND.phone}</strong>
                </div>
              </a>
              <a className="contact-card" href={`mailto:${BRAND.email}`}>
                <span className="addon-icon">
                  <Icon name="mail" size={20} />
                </span>
                <div>
                  <span>Email</span>
                  <strong>{BRAND.email}</strong>
                </div>
              </a>
              <div className="contact-card">
                <span className="addon-icon">
                  <Icon name="mapPin" size={20} />
                </span>
                <div>
                  <span>Union House</span>
                  <strong>{BRAND.address}</strong>
                </div>
              </div>
              <div className="contact-card">
                <span className="addon-icon">
                  <Icon name="clock" size={20} />
                </span>
                <div>
                  <span>Office hours</span>
                  <strong>{BRAND.hours}</strong>
                </div>
              </div>
              <Link to={session ? account.to : '/membership'} className="contact-card">
                <span className="addon-icon">
                  <Icon name="idCard" size={20} />
                </span>
                <div>
                  <span>{session ? 'Your membership' : 'Not a member yet?'}</span>
                  <strong>{session ? account.label : 'Join the union'}</strong>
                </div>
              </Link>
            </div>

            <div className="card contact-urgent">
              <span className="contact-urgent-icon">
                <Icon name="alert" size={20} />
              </span>
              <div>
                <h3>Accident, arrest or a breakdown?</h3>
                <p>
                  Call the member line immediately and quote your member number. The duty officer can
                  reach the union lawyer and the welfare fund after hours.
                </p>
              </div>
            </div>

            <div className="card contact-office-card">
              <h3>Come to the office</h3>
              <p>
                The membership and dues desks are on the ground floor at Union House. Bring your
                licence and vehicle registration if you are joining in person.
              </p>
              <div className="contact-office-row">
                <Icon name="mapPin" size={16} /> {BRAND.address}
              </div>
              <div className="contact-office-row">
                <Icon name="clock" size={16} /> {BRAND.hours}
              </div>
            </div>
          </div>

          <div className="card contact-form-card">
            {sent ? (
              <div className="contact-sent">
                <span className="quote-success-icon">
                  <Icon name="checkCircle" size={30} />
                </span>
                <h2>Message received</h2>
                <p>
                  Thanks for reaching out. The office will reply to your email. For anything urgent,
                  call the member line on {BRAND.memberLine}.
                </p>
                <button type="button" className="btn btn-outline" onClick={() => setSent(false)}>
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <div className="card-head">
                  <div>
                    <h2>Send a message</h2>
                    <p>We reply to every enquiry, usually within one working day.</p>
                  </div>
                </div>

                <div className="form-grid">
                  <Field label="Full name" htmlFor="contact-name" required error={errors.name}>
                    <input
                      id="contact-name"
                      value={form.name}
                      onChange={update('name')}
                      placeholder="Your name"
                      autoComplete="name"
                    />
                  </Field>
                  <Field label="Email" htmlFor="contact-email" required error={errors.email}>
                    <input
                      id="contact-email"
                      type="email"
                      value={form.email}
                      onChange={update('email')}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </Field>
                  <Field label="Phone" htmlFor="contact-phone">
                    <input
                      id="contact-phone"
                      type="tel"
                      value={form.phone}
                      onChange={update('phone')}
                      placeholder="+233 24 000 0000"
                      autoComplete="tel"
                    />
                  </Field>
                  <Field label="What is this about?" htmlFor="contact-type">
                    <select id="contact-type" value={form.type} onChange={update('type')}>
                      {ENQUIRY_TYPES.map((type) => (
                        <option key={type.id} value={type.id}>{type.label}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label="Subject" htmlFor="contact-subject" required error={errors.subject}>
                  <input
                    id="contact-subject"
                    value={form.subject}
                    onChange={update('subject')}
                    placeholder="e.g. Dues payment not showing"
                  />
                </Field>

                <Field label="Message" htmlFor="contact-message" required error={errors.message}>
                  <textarea
                    id="contact-message"
                    rows="6"
                    value={form.message}
                    onChange={update('message')}
                    placeholder="Tell us what happened and include your member number if you have one…"
                  />
                </Field>

                <button type="submit" className="btn btn-primary btn-block">
                  Send message <Icon name="send" size={16} />
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container container-narrow">
          <div className="section-head">
            <div>
              <span className="eyebrow">FAQ</span>
              <h2>Questions we get a lot</h2>
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
