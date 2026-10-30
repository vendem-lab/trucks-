import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Field from '../../components/Field.jsx';
import Icon from '../../components/Icon.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { REGIONS, TIER_BY_ID, TRAILER_TYPES } from '../../config.js';
import { useAuth } from '../../context/authContext.js';
import { useToast } from '../../context/ToastContext.jsx';
import {
  isDemoMode,
  removeFleetPhoto,
  saveFleetPhoto,
  updateMember,
  useStore
} from '../../lib/store.js';
import { compressVehiclePhoto } from '../../lib/image.js';
import { changeMemberPassword } from '../../lib/auth.js';
import { formatDate, isValidPhone } from '../../lib/format.js';

export default function Profile() {
  const { session } = useAuth();
  const state = useStore();
  const { push } = useToast();
  const member = state.members.find((entry) => entry.id === session?.memberId);

  const [form, setForm] = useState(() => ({
    name: member?.name || '',
    phone: member?.phone || '',
    region: member?.region || '',
    city: member?.city || '',
    vehicleType: member?.vehicleType || 'Dry van',
    vehiclePlate: member?.vehiclePlate || '',
    licenseNumber: member?.licenseNumber || '',
    emergencyName: member?.emergencyName || '',
    emergencyPhone: member?.emergencyPhone || '',
    notes: member?.notes || '',
    password: ''
  }));
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);
  const [photo, setPhoto] = useState('');
  const [savedPhoto, setSavedPhoto] = useState('');
  const [photoTouched, setPhotoTouched] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const photoInput = useRef(null);

  useEffect(() => {
    if (photoTouched) return;
    const published = state.fleet.find((entry) => entry.memberId === member?.id);
    setPhoto(published?.photo || '');
    setSavedPhoto(published?.photo || '');
  }, [state.fleet, member?.id, photoTouched]);

  if (!member) return null;

  const tier = TIER_BY_ID[member.tier] || TIER_BY_ID.independent;
  const canPublishPhoto = member.status === 'active';

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setSaved(false);
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const handlePhotoFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError('');
    try {
      const dataUrl = await compressVehiclePhoto(file);
      setPhoto(dataUrl);
      setPhotoTouched(true);
      setSaved(false);
    } catch (error) {
      setPhotoError(error.message || 'That photo could not be prepared. Try another image.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const clearPhoto = () => {
    setPhoto('');
    setPhotoTouched(true);
    setPhotoError('');
    setSaved(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = 'Enter your full name.';
    if (!isValidPhone(form.phone)) next.phone = 'Enter a valid phone number.';
    if (!form.city.trim()) next.city = 'Enter your city or town.';
    if (!form.vehiclePlate.trim()) next.vehiclePlate = 'Enter your vehicle registration.';
    if (!form.licenseNumber.trim()) next.licenseNumber = 'Enter your licence number.';
    if (!form.emergencyName.trim()) next.emergencyName = 'Add an emergency contact.';
    if (!isValidPhone(form.emergencyPhone)) next.emergencyPhone = 'Add a valid emergency number.';
    if (form.password && form.password.length < 6) next.password = 'Use at least 6 characters.';
    setErrors(next);
    if (Object.keys(next).length) {
      push('Check the highlighted fields before saving.', 'error');
      return;
    }

    const patch = { ...form };
    const nextPassword = patch.password;
    delete patch.password;
    try {
      if (nextPassword) await changeMemberPassword(nextPassword);
      const saveResult = updateMember(member.id, patch);
      if (saveResult?.then) await saveResult;
      if (photo !== savedPhoto) {
        const fleetResult = photo
          ? saveFleetPhoto(member.id, photo)
          : removeFleetPhoto(member.id);
        if (fleetResult?.then) await fleetResult;
        setSavedPhoto(photo);
        setPhotoTouched(false);
      }
    } catch (error) {
      push(error.message || 'Could not update your profile.', 'error');
      return;
    }
    setForm((current) => ({ ...current, password: '' }));
    setSaved(true);
    push(
      photo !== savedPhoto
        ? 'Your member details and vehicle photo have been updated.'
        : 'Your member details have been updated.',
      'success'
    );
  };

  return (
    <div className="profile-layout">
      <form className="card profile-card" onSubmit={handleSubmit} noValidate>
        <div className="card-head">
          <div>
            <h2>Member details</h2>
            <p>Keep this current so the office can reach you and your family.</p>
          </div>
          {saved && <span className="badge badge-success">Saved</span>}
        </div>

        {member.status !== 'active' && (
          <div className="inline-note">
            <Icon name="alert" size={16} />
            <span>
              Your membership is marked {member.status}. Some benefits stay paused until the office
              reactivates your record. Call the member line if you think this is wrong.
            </span>
          </div>
        )}

        <fieldset className="form-section">
          <legend><span className="form-step">1</span> Contact</legend>
          <div className="form-grid">
            <Field label="Full name" htmlFor="profile-name" required error={errors.name}>
              <input id="profile-name" value={form.name} onChange={update('name')} />
            </Field>
            <Field label="Email" htmlFor="profile-email" hint="Contact the office to change your sign-in email.">
              <input id="profile-email" value={member.email} readOnly disabled />
            </Field>
            <Field label="Phone" htmlFor="profile-phone" required error={errors.phone}>
              <input id="profile-phone" type="tel" value={form.phone} onChange={update('phone')} />
            </Field>
            <Field label="Region" htmlFor="profile-region" required>
              <select id="profile-region" value={form.region} onChange={update('region')}>
                {REGIONS.map((region) => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </Field>
            <Field label="City or town" htmlFor="profile-city" required error={errors.city}>
              <input id="profile-city" value={form.city} onChange={update('city')} />
            </Field>
            <Field label="New password" htmlFor="profile-password" hint="Leave blank to keep your current password." error={errors.password}>
              <input
                id="profile-password"
                type="password"
                value={form.password}
                onChange={update('password')}
                placeholder="Optional"
                autoComplete="new-password"
              />
            </Field>
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend><span className="form-step">2</span> Vehicle & licence</legend>
          <div className="form-grid">
            <Field label="Vehicle type" htmlFor="profile-vehicle" required>
              <select id="profile-vehicle" value={form.vehicleType} onChange={update('vehicleType')}>
                {TRAILER_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </Field>
            <Field label="Vehicle registration" htmlFor="profile-plate" required error={errors.vehiclePlate}>
              <input id="profile-plate" value={form.vehiclePlate} onChange={update('vehiclePlate')} />
            </Field>
            <Field label="Licence number" htmlFor="profile-licence" required error={errors.licenseNumber}>
              <input id="profile-licence" value={form.licenseNumber} onChange={update('licenseNumber')} />
            </Field>
          </div>

          <div className="vehicle-photo">
            <div className="vehicle-photo-preview">
              {photo ? (
                <img src={photo} alt={`${form.vehicleType} operated by ${form.name || member.name}`} />
              ) : (
                <span className="vehicle-photo-empty">
                  <Icon name="camera" size={30} />
                  <span>No public photo yet</span>
                </span>
              )}
            </div>
            <div className="vehicle-photo-copy">
              <h3>Public vehicle photo</h3>
              <p>
                Show visiting customers what you drive. Your photo appears on the public fleet page
                with your name, vehicle type and region. Your registration, phone, licence and
                emergency contacts are never shown.
              </p>
              <input
                ref={photoInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoFile}
                hidden
              />
              <div className="vehicle-photo-actions">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => photoInput.current?.click()}
                  disabled={photoBusy || !canPublishPhoto}
                >
                  <Icon name="camera" size={15} /> {photo ? 'Replace photo' : 'Add photo'}
                </button>
                {photo && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={clearPhoto}
                    disabled={photoBusy}
                  >
                    Remove
                  </button>
                )}
              </div>
              {photoBusy && <span className="field-hint">Preparing your photo…</span>}
              {photoError && <span className="field-error">{photoError}</span>}
              {!canPublishPhoto && (
                <span className="field-hint">
                  You can publish a photo once your membership is active.
                </span>
              )}
            </div>
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend><span className="form-step">3</span> Emergency contact</legend>
          <div className="form-grid">
            <Field label="Contact name" htmlFor="profile-emergency-name" required error={errors.emergencyName}>
              <input id="profile-emergency-name" value={form.emergencyName} onChange={update('emergencyName')} />
            </Field>
            <Field label="Contact phone" htmlFor="profile-emergency-phone" required error={errors.emergencyPhone}>
              <input
                id="profile-emergency-phone"
                type="tel"
                value={form.emergencyPhone}
                onChange={update('emergencyPhone')}
              />
            </Field>
          </div>
          <Field label="Notes for the office" htmlFor="profile-notes" hint="Routes, availability or anything the welfare officer should know.">
            <textarea id="profile-notes" rows="3" value={form.notes} onChange={update('notes')} />
          </Field>
        </fieldset>

        <div className="profile-save">
          <button type="submit" className="btn btn-primary">
            <Icon name="check" size={16} /> Save changes
          </button>
          <span>
            {isDemoMode()
              ? 'Changes are stored in this browser for the demo.'
              : 'Changes are saved to your union member record.'}
          </span>
        </div>
      </form>

      <aside className="profile-aside">
        <section className="card profile-summary">
          <div className="profile-summary-head">
            <span className="avatar avatar-lg">{member.name.slice(0, 1)}</span>
            <div>
              <h3>{member.name}</h3>
              <span>{member.memberNumber}</span>
            </div>
            <StatusBadge status={member.status} />
          </div>
          <dl className="settings-list">
            <div><dt>Tier</dt><dd>{tier.name}</dd></div>
            <div><dt>Monthly dues</dt><dd>GH₵{tier.price}</dd></div>
            <div><dt>Region</dt><dd>{member.region}</dd></div>
            <div><dt>Joined</dt><dd>{formatDate(member.joinedAt)}</dd></div>
            <div><dt>Vehicle</dt><dd>{member.vehicleType}</dd></div>
            <div><dt>Registration</dt><dd>{member.vehiclePlate || '—'}</dd></div>
            <div><dt>Public fleet photo</dt><dd>{savedPhoto ? 'Published' : 'Not published'}</dd></div>
          </dl>
          <Link to="/portal/dues" className="btn btn-outline btn-block btn-sm">
            <Icon name="wallet" size={14} /> Dues & payments
          </Link>
          <Link to="/fleet" className="btn btn-ghost btn-block btn-sm">
            <Icon name="truck" size={14} /> View the public fleet
          </Link>
        </section>

        <section className="card profile-help">
          <span className="service-icon"><Icon name="shield" size={22} /></span>
          <h3>Need to change your tier?</h3>
          <p>
            Tier changes are handled by the membership office so your dues are adjusted correctly.
            Send a message or call the member line.
          </p>
          <Link to="/contact" className="btn btn-outline btn-block btn-sm">Contact the office</Link>
        </section>
      </aside>
    </div>
  );
}
