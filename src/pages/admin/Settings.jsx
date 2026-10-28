import { useEffect, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import Field from '../../components/Field.jsx';
import Icon from '../../components/Icon.jsx';
import { BRAND, DEMO_MEMBER, DEMO_STAFF, TIERS } from '../../config.js';
import { isDemoMode, resetDemoData, updateSettings, useStore } from '../../lib/store.js';
import { isValidEmail, isValidPhone } from '../../lib/format.js';
import { useAuth } from '../../context/authContext.js';
import { useToast } from '../../context/ToastContext.jsx';

const FIELDS = [
  { key: 'unionName', label: 'Union name', placeholder: "Haulway Drivers' Union" },
  { key: 'email', label: 'Office email', type: 'email', placeholder: 'members@example.org' },
  { key: 'phone', label: 'Office phone', type: 'tel', placeholder: '+233 30 000 0000' },
  { key: 'memberLine', label: '24-hour member line', type: 'tel', placeholder: '+233 24 000 0000' },
  { key: 'address', label: 'Office address', placeholder: 'Union House, Accra' },
  { key: 'hours', label: 'Office hours', placeholder: 'Mon–Fri · 08:00–17:00' }
];

export default function Settings() {
  const state = useStore();
  const { push } = useToast();
  const { logout } = useAuth();
  const [form, setForm] = useState(() => ({
    unionName: state.settings.unionName || '',
    email: state.settings.email || '',
    phone: state.settings.phone || '',
    memberLine: state.settings.memberLine || '',
    address: state.settings.address || '',
    hours: state.settings.hours || '',
    duesGraceDays: String(state.settings.duesGraceDays ?? 14),
    notifyEnquiries: Boolean(state.settings.notifyEnquiries),
    duesReminder: Boolean(state.settings.duesReminder)
  }));
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    setForm({
      unionName: state.settings.unionName || '',
      email: state.settings.email || '',
      phone: state.settings.phone || '',
      memberLine: state.settings.memberLine || '',
      address: state.settings.address || '',
      hours: state.settings.hours || '',
      duesGraceDays: String(state.settings.duesGraceDays ?? 14),
      notifyEnquiries: Boolean(state.settings.notifyEnquiries),
      duesReminder: Boolean(state.settings.duesReminder)
    });
  }, [state.settings]);

  const update = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const next = {};
    if (!form.unionName.trim()) next.unionName = 'Enter the union name.';
    if (!isValidEmail(form.email)) next.email = 'Enter a valid email address.';
    if (!isValidPhone(form.phone)) next.phone = 'Enter a valid phone number.';
    if (!isValidPhone(form.memberLine)) next.memberLine = 'Enter a valid member line.';
    if (!form.address.trim()) next.address = 'Enter the office address.';
    if (!form.hours.trim()) next.hours = 'Enter the office hours.';
    if (!(Number(form.duesGraceDays) >= 0)) next.duesGraceDays = 'Use a number of days (0 or more).';
    setErrors(next);
    if (Object.keys(next).length) {
      push('Check the highlighted fields.', 'error');
      return;
    }

    try {
      await updateSettings({
        ...form,
        duesGraceDays: Number(form.duesGraceDays) || 0
      });
      setSaved(true);
      push('Union settings saved.', 'success');
    } catch (error) {
      push(error.message || 'Could not save union settings.', 'error');
    }
  };

  const handleReset = async () => {
    if (!isDemoMode()) {
      push('Demo reset is disabled in Firebase live mode.', 'error');
      setResetOpen(false);
      return;
    }
    resetDemoData();
    await logout();
    setResetOpen(false);
    push('Demo data restored. Sign in again with a demo account.', 'success');
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'haulway-union-demo-data.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    push('Demo data exported as JSON.', 'success');
  };

  const counts = [
    { label: 'Members', value: state.members.length },
    { label: 'Loads', value: state.loads.length },
    { label: 'Dues invoices', value: state.dues.length },
    { label: 'News articles', value: state.news.length },
    { label: 'Events', value: state.events.length },
    { label: 'Enquiries', value: state.messages.length },
    { label: 'Job alerts', value: state.alerts.length },
    { label: 'Registrations', value: state.registrations.length }
  ];

  return (
    <div className="admin-page settings-page">
      <div className="admin-grid admin-grid-settings">
        <form className="card" onSubmit={handleSave} noValidate>
          <div className="card-head">
            <div>
              <h2>Union details</h2>
              <p>Shown on the public site, in emails and on member statements.</p>
            </div>
            {saved && (
              <span className="badge badge-success">
                <Icon name="check" size={13} /> Saved
              </span>
            )}
          </div>

          <div className="form-grid">
            {FIELDS.map((field) => (
              <Field
                key={field.key}
                label={field.label}
                htmlFor={`settings-${field.key}`}
                required
                error={errors[field.key]}
              >
                <input
                  id={`settings-${field.key}`}
                  type={field.type || 'text'}
                  value={form[field.key]}
                  onChange={update(field.key)}
                  placeholder={field.placeholder}
                />
              </Field>
            ))}
          </div>

          <div className="settings-section">
            <div className="card-head card-head-compact">
              <div>
                <h3>Dues rules</h3>
                <p>How much time members get before cover pauses.</p>
              </div>
            </div>
            <div className="form-grid">
              <Field
                label="Grace period"
                htmlFor="settings-grace"
                required
                error={errors.duesGraceDays}
                hint="Days after the due date before legal cover pauses."
              >
                <div className="input-suffix">
                  <input
                    id="settings-grace"
                    type="number"
                    min="0"
                    value={form.duesGraceDays}
                    onChange={update('duesGraceDays')}
                  />
                  <span>days</span>
                </div>
              </Field>
              <Field label="Monthly dues" htmlFor="settings-dues-preview" hint="Set on the membership page tiers.">
                <input
                  id="settings-dues-preview"
                  value={TIERS.map((tier) => `GH₵${tier.price}`).join(' · ')}
                  readOnly
                  disabled
                />
              </Field>
            </div>

            <label className="switch-field">
              <input
                type="checkbox"
                checked={form.duesReminder}
                onChange={update('duesReminder')}
              />
              <span className="switch-ui" />
              <span>
                <strong>Dues reminders</strong>
                <span>Send a reminder before the due date and again inside the grace period.</span>
              </span>
            </label>

            <label className="switch-field">
              <input
                type="checkbox"
                checked={form.notifyEnquiries}
                onChange={update('notifyEnquiries')}
              />
              <span className="switch-ui" />
              <span>
                <strong>Enquiry notifications</strong>
                <span>Email the office when a new contact form message arrives.</span>
              </span>
            </label>
          </div>

          <div className="settings-actions">
            <button type="submit" className="btn btn-primary">
              <Icon name="check" size={16} /> Save settings
            </button>
            <span className="settings-note">{isDemoMode() ? 'Changes are stored in this browser for the demo.' : 'Changes are stored in Firestore.'}</span>
          </div>
        </form>

        <div className="admin-stack">
          {isDemoMode() && <>
          <section className="card">
            <div className="card-head">
              <div>
                <h2>Demo accounts</h2>
                <p>Use these to test both sides of the platform.</p>
              </div>
            </div>
            <ul className="settings-account-list">
              <li>
                <span className="quick-action-icon"><Icon name="briefcase" size={18} /></span>
                <div>
                  <strong>Union staff</strong>
                  <span>{DEMO_STAFF.email}</span>
                  <code>{DEMO_STAFF.password}</code>
                </div>
              </li>
              <li>
                <span className="quick-action-icon"><Icon name="idCard" size={18} /></span>
                <div>
                  <strong>Member</strong>
                  <span>{DEMO_MEMBER.email}</span>
                  <code>{DEMO_MEMBER.password}</code>
                </div>
              </li>
            </ul>
            <div className="inline-note">
              <Icon name="lock" size={16} />
              <span>
                Sign-in is a front-end demo. There is no real identity provider and no server.
              </span>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <h2>Demo data</h2>
                <p>Everything lives in this browser only.</p>
              </div>
            </div>
            <dl className="settings-list">
              {counts.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
            <div className="settings-data-actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={exportData}>
                <Icon name="download" size={14} /> Export JSON
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => setResetOpen(true)}>
                <Icon name="refresh" size={14} /> Reset demo data
              </button>
            </div>
            <p className="settings-note">
              Resetting restores the seeded union, signs you out and discards every change made in
              this browser.
            </p>
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <h2>About this build</h2>
                <p>Provisional branding and demo constraints.</p>
              </div>
            </div>
            <dl className="settings-list">
              <div><dt>Platform</dt><dd>{BRAND.name} · demo</dd></div>
              <div><dt>Union name</dt><dd>Provisional, pending client confirmation</dd></div>
              <div><dt>Currency</dt><dd>Ghana cedi (GH₵)</dd></div>
              <div><dt>Storage key</dt><dd><code>haulway_union_v1</code></dd></div>
              <div><dt>Payments</dt><dd>Recorded locally, no gateway</dd></div>
            </dl>
            <p className="settings-note">
              Replace the provisional union name, address and contact details once the client confirms
              them. No real member data should be entered into this demo.
            </p>
          </section>
          </>}
        </div>
      </div>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset demo data?"
        subtitle="This restores the seeded union and signs you out."
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setResetOpen(false)}>Cancel</button>
            <button type="button" className="btn btn-danger" onClick={handleReset}>
              Reset everything
            </button>
          </>
        }
      >
        <p className="confirm-copy">
          All members, loads, dues, news, events and enquiries added in this browser will be replaced
          with the original demo data. This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
