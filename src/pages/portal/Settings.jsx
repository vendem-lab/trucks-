import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import { useAuth } from '../../context/authContext.js';
import { useToast } from '../../context/ToastContext.jsx';
import { updateMemberPublicProfile, useStore } from '../../lib/store.js';

export default function Settings() {
  const { session } = useAuth();
  const state = useStore();
  const { push } = useToast();
  const member = state.members.find((entry) => entry.id === session?.memberId);
  const [publicProfile, setPublicProfile] = useState(member?.publicProfile !== false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPublicProfile(member?.publicProfile !== false);
  }, [member?.publicProfile]);

  if (!member) return null;

  const isDirty = publicProfile !== (member.publicProfile !== false);
  const canEditVisibility = member.status === 'active';

  const handleSave = async (event) => {
    event.preventDefault();
    setBusy(true);
    setSaved(false);
    try {
      await updateMemberPublicProfile(member.id, publicProfile);
      setSaved(true);
      push('Your public listing setting has been saved.', 'success');
    } catch (error) {
      push(error.message || 'Could not save your settings.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="portal-page portal-settings">
      <div className="page-intro">
        <span className="eyebrow">Member account</span>
        <h2>Settings</h2>
        <p>Manage how your membership appears in the public directory.</p>
      </div>

      <form className="card portal-settings-card" onSubmit={handleSave}>
        <div className="card-head">
          <div>
            <h3>Public fleet directory</h3>
            <p>Choose whether visitors can find your vehicle in the member fleet.</p>
          </div>
          {saved && (
            <span className="badge badge-success">
              <Icon name="check" size={13} /> Saved
            </span>
          )}
        </div>

        <label className="switch-field portal-setting-switch">
          <input
            type="checkbox"
            checked={publicProfile}
            disabled={!canEditVisibility || busy}
            onChange={(event) => {
              setPublicProfile(event.target.checked);
              setSaved(false);
            }}
            aria-describedby="public-profile-description"
          />
          <span className="switch-ui" aria-hidden="true" />
          <span>
            <strong>Show my vehicle in the public directory</strong>
            <span id="public-profile-description">
              When enabled, your name, vehicle type, city, region and vehicle photo may appear on
              the fleet page. Your registration, phone, licence and emergency contact remain private.
              If you hide your listing, an uploaded photo is kept and restored when you turn it back
              on.
            </span>
          </span>
        </label>

        {!canEditVisibility && (
          <div className="inline-note portal-setting-note">
            <Icon name="clock" size={16} />
            <span>
              Your listing can be published after the union office activates your membership.
            </span>
          </div>
        )}

        <div className="settings-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!isDirty || busy || !canEditVisibility}
          >
            <Icon name="check" size={16} /> {busy ? 'Saving…' : 'Save settings'}
          </button>
          <Link to="/portal/profile" className="btn btn-outline">
            <Icon name="user" size={16} /> Edit profile details
          </Link>
        </div>
      </form>

      <section className="card portal-settings-help">
        <span className="service-icon">
          <Icon name="shield" size={22} />
        </span>
        <div>
          <h3>Profile and sign-in details</h3>
          <p>
            Update your contact, vehicle and emergency-contact information, or change your password,
            from your profile page. Your sign-in email can be changed by contacting the union office.
          </p>
          <Link to="/portal/profile" className="btn btn-ghost btn-sm">
            Go to my profile <Icon name="arrowRight" size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}
