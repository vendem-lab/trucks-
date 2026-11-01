import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero.jsx';
import Field from '../components/Field.jsx';
import Icon from '../components/Icon.jsx';
import { BRAND } from '../config.js';
import { validateDeliveryConfirmation } from '../lib/deliveries.js';
import { submitDeliveryConfirmation } from '../lib/store.js';
import { useToast } from '../context/ToastContext.jsx';

const INITIAL = {
  reference: '',
  contactEmail: '',
  outcome: 'delivered',
  note: ''
};

export default function ConfirmDelivery() {
  const { push } = useToast();
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [sent, setSent] = useState(null);

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setFormError('');
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const next = validateDeliveryConfirmation(form);
    setErrors(next);
    if (Object.keys(next).length) {
      push('Check the highlighted fields before submitting.', 'error');
      return;
    }
    try {
      const saved = await submitDeliveryConfirmation(form);
      setSent(saved);
      setForm(INITIAL);
      setErrors({});
    } catch (error) {
      setFormError(error.message || 'Could not record the confirmation. Please try again.');
    }
  };

  return (
    <>
      <PageHero
        eyebrow="For shippers"
        title="Confirm a delivery."
        description="Tell the union office whether a load arrived. Use the reference on the load, for example LD-2026-1049, and the email address the load was posted with."
      />

      <section className="section">
        <div className="container post-load-layout">
          <div className="post-load-copy">
            <span className="eyebrow">How it works</span>
            <h2>The driver marks it, you confirm it.</h2>
            <p>
              When a driver finishes a load they record the delivery, a short note and sometimes a
              photo of the signed waybill. Your confirmation closes the loop and helps the union
              track which shippers and drivers keep their word.
            </p>
            <ul className="check-list">
              <li><Icon name="check" size={16} /> Only the email used to post the load can confirm it</li>
              <li><Icon name="check" size={16} /> Confirm delivery or report a problem with the load</li>
              <li><Icon name="check" size={16} /> The union office reviews every confirmation</li>
            </ul>
            <div className="inline-note">
              <Icon name="shield" size={16} />
              <span>
                A problem report does not remove the load from the board. The office calls both sides
                before anything changes.
              </span>
            </div>
          </div>

          <div className="card post-load-card">
            {sent ? (
              <div className="post-load-success">
                <span className="quote-success-icon">
                  <Icon name={sent.outcome === 'problem' ? 'alert' : 'checkCircle'} size={30} />
                </span>
                <h2>{sent.outcome === 'problem' ? 'Problem reported' : 'Delivery confirmed'}</h2>
                <p>
                  Thank you. Reference <strong>{sent.loadReference}</strong> has been passed to the
                  union office for review. We will call you if we need anything else.
                </p>
                <button type="button" className="btn btn-outline" onClick={() => setSent(null)}>
                  Confirm another delivery
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <div className="card-head">
                  <div>
                    <h2>Delivery confirmation</h2>
                    <p>Use the reference from your load posting.</p>
                  </div>
                  <span className="card-chip">Shippers</span>
                </div>

                {formError && (
                  <div className="form-error" role="alert">
                    <Icon name="alert" size={16} /> {formError}
                  </div>
                )}

                <div className="form-grid">
                  <Field
                    label="Load reference"
                    htmlFor="confirm-reference"
                    required
                    error={errors.reference}
                    hint="Shown as LD-2026-0000 on the load."
                  >
                    <input
                      id="confirm-reference"
                      value={form.reference}
                      onChange={update('reference')}
                      placeholder="LD-2026-1049"
                      autoComplete="off"
                    />
                  </Field>
                  <Field
                    label="Email used on the load"
                    htmlFor="confirm-email"
                    required
                    error={errors.contactEmail}
                    hint="The contact email the union office has on file."
                  >
                    <input
                      id="confirm-email"
                      type="email"
                      value={form.contactEmail}
                      onChange={update('contactEmail')}
                      placeholder="ops@shipper.com"
                      autoComplete="email"
                    />
                  </Field>
                </div>

                <fieldset className="radio-fieldset">
                  <legend className="field-label">What happened?</legend>
                  <label className={`radio-option ${form.outcome === 'delivered' ? 'is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="confirm-outcome"
                      value="delivered"
                      checked={form.outcome === 'delivered'}
                      onChange={update('outcome')}
                    />
                    <span>
                      <strong>The load was delivered</strong>
                      <em>The cargo arrived and the waybill was signed.</em>
                    </span>
                  </label>
                  <label className={`radio-option ${form.outcome === 'problem' ? 'is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="confirm-outcome"
                      value="problem"
                      checked={form.outcome === 'problem'}
                      onChange={update('outcome')}
                    />
                    <span>
                      <strong>There was a problem</strong>
                      <em>Late, short, damaged, or never delivered.</em>
                    </span>
                  </label>
                  {errors.outcome && <span className="field-error">{errors.outcome}</span>}
                </fieldset>

                <Field
                  label="Note for the office"
                  htmlFor="confirm-note"
                  error={errors.note}
                  hint="Optional, but helpful if something went wrong."
                >
                  <textarea
                    id="confirm-note"
                    rows="3"
                    value={form.note}
                    onChange={update('note')}
                    placeholder="Arrived on time and the count was correct."
                  />
                </Field>

                <button type="submit" className="btn btn-primary btn-block">
                  <Icon name="checkCircle" size={16} /> Send confirmation
                </button>
                <p className="post-load-foot">
                  Cannot find your reference? Call the office on {BRAND.phone} or email{' '}
                  <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="card">
            <div className="card-head">
              <div>
                <h2>Posting a new load?</h2>
                <p>Every shipper is verified before a load reaches the board.</p>
              </div>
              <Link to="/loads#post-load" className="btn btn-outline">
                <Icon name="plus" size={16} /> Post a load
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
