import { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import Icon from '../../components/Icon.jsx';
import Field from '../../components/Field.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { REGIONS, TIERS } from '../../config.js';
import { useAuth } from '../../context/authContext.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useStore } from '../../lib/store.js';
import {
  SMS_MAX_LENGTH,
  SMS_TEMPLATES,
  buildRecipients,
  describeAudience,
  fetchSmsStatus,
  previewMessage,
  sendSms,
  smsSegments
} from '../../lib/sms.js';
import { formatDateTime } from '../../lib/format.js';

const AUDIENCES = [
  { id: 'all', label: 'All active members' },
  { id: 'dues', label: 'Members with outstanding dues' },
  { id: 'region', label: 'Members in a region' },
  { id: 'tier', label: 'Members on a tier' },
  { id: 'load-alerts', label: 'Members matching a load alert' },
  { id: 'members', label: 'Selected members' }
];

const TEMPLATE_ORDER = ['announcement', 'dues', 'status', 'loadAlert'];

export default function Sms() {
  const state = useStore();
  const { session } = useAuth();
  const { push } = useToast();

  const [smsStatus, setSmsStatus] = useState({ loading: true });
  const [audienceType, setAudienceType] = useState('all');
  const [region, setRegion] = useState(REGIONS[0]);
  const [tier, setTier] = useState(TIERS[0].id);
  const [loadId, setLoadId] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [kind, setKind] = useState('announcement');
  const [message, setMessage] = useState(SMS_TEMPLATES.announcement.message);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetchSmsStatus().then((result) => {
      if (active) setSmsStatus({ ...result, loading: false });
    });
    return () => {
      active = false;
    };
  }, []);

  const openLoads = useMemo(
    () => (state.loads || []).filter((load) => load.status === 'open'),
    [state.loads]
  );
  const effectiveLoadId = loadId || openLoads[0]?.id || '';

  const audience = useMemo(() => {
    if (audienceType === 'region') return { type: 'region', value: region };
    if (audienceType === 'tier') return { type: 'tier', value: tier };
    if (audienceType === 'load-alerts') return { type: 'load-alerts', value: effectiveLoadId };
    if (audienceType === 'members') return { type: 'members', ids: selectedIds };
    if (audienceType === 'dues') return { type: 'dues' };
    return { type: 'all' };
  }, [audienceType, region, tier, effectiveLoadId, selectedIds]);

  const resolved = useMemo(() => buildRecipients(audience, state), [audience, state]);
  const preview = previewMessage(message, resolved.recipients);
  const segments = smsSegments(preview);
  const audienceText = describeAudience(audience, state);
  const activeMembers = useMemo(
    () =>
      (state.members || [])
        .filter((member) => member.status === 'active')
        .slice()
        .sort((a, b) => String(a.name).localeCompare(String(b.name))),
    [state.members]
  );
  const filteredMembers = useMemo(() => {
    const term = memberSearch.trim().toLowerCase();
    if (!term) return activeMembers;
    return activeMembers.filter((member) =>
      [member.name, member.memberNumber, member.phone, member.region, member.city]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [activeMembers, memberSearch]);

  const history = useMemo(
    () =>
      [...(state.smsMessages || [])]
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .slice(0, 12),
    [state.smsMessages]
  );

  const configured = Boolean(smsStatus.configured || smsStatus.demo);
  const canSend =
    configured && resolved.recipients.length > 0 && message.trim().length > 0 && !busy;

  const applyTemplate = (key) => {
    const template = SMS_TEMPLATES[key];
    if (!template) return;
    setKind(template.kind);
    setMessage(template.message);
    setAudienceType(template.audience);
    setError('');
  };

  const toggleMember = (id) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]
    );
  };

  const handleSend = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await sendSms({
        kind,
        audience,
        message,
        sentBy: session?.name || 'Union office'
      });
      setConfirmOpen(false);
      push(
        `SMS sent to ${result.recipients} member${result.recipients === 1 ? '' : 's'}.`,
        'success'
      );
      if (result.failed) {
        push(`${result.failed} message(s) failed. Check the SMS history.`, 'error');
      }
    } catch (sendError) {
      setError(sendError.message || 'Could not send the SMS.');
      push(sendError.message || 'Could not send the SMS.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-stat-grid sms-stat-grid">
        <div className="stat-card">
          <span className="stat-card-icon"><Icon name="message" size={20} /></span>
          <div>
            <span className="stat-card-label">Provider</span>
            <strong className="stat-card-value">Arkesel</strong>
            <span className="stat-card-hint">
              {smsStatus.loading
                ? 'Checking configuration…'
                : smsStatus.demo
                  ? 'Demo mode · simulated'
                  : smsStatus.configured
                    ? `Sender ${smsStatus.sender || 'HAULWAY'}`
                    : 'Not configured yet'}
            </span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-card-icon"><Icon name="users" size={20} /></span>
          <div>
            <span className="stat-card-label">Reachable members</span>
            <strong className="stat-card-value">{resolved.recipients.length}</strong>
            <span className="stat-card-hint">{audienceText}</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-card-icon"><Icon name="clipboard" size={20} /></span>
          <div>
            <span className="stat-card-label">Messages sent</span>
            <strong className="stat-card-value">{(state.smsMessages || []).length}</strong>
            <span className="stat-card-hint">Latest 12 shown below</span>
          </div>
        </div>
      </div>

      {!smsStatus.loading && !configured && (
        <div className="inline-note">
          <Icon name="alert" size={16} />
          <span>
            {smsStatus.error ||
              'SMS is not configured. Add ARKESEL_API_KEY and ARKESEL_SENDER_ID to your Vercel or Netlify environment, then redeploy.'}
          </span>
        </div>
      )}
      {smsStatus.demo && (
        <div className="inline-note">
          <Icon name="checkCircle" size={16} />
          <span>
            Demo mode is on. Messages are simulated and saved to this browser only. Add the Arkesel
            environment variables and deploy to send real texts.
          </span>
        </div>
      )}

      <section className="card">
        <div className="card-head">
          <div>
            <h2>Compose SMS</h2>
            <p>Choose who should receive the message, then review the text before sending.</p>
          </div>
          {configured && (
            <span className="badge badge-success">
              <Icon name="check" size={13} /> Ready
            </span>
          )}
        </div>

        <div className="form-grid">
          <Field label="Audience" htmlFor="sms-audience">
            <select
              id="sms-audience"
              value={audienceType}
              onChange={(event) => setAudienceType(event.target.value)}
            >
              {AUDIENCES.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.label}</option>
              ))}
            </select>
          </Field>

          {audienceType === 'region' && (
            <Field label="Region" htmlFor="sms-region">
              <select id="sms-region" value={region} onChange={(event) => setRegion(event.target.value)}>
                {REGIONS.map((entry) => (
                  <option key={entry} value={entry}>{entry}</option>
                ))}
              </select>
            </Field>
          )}

          {audienceType === 'tier' && (
            <Field label="Membership tier" htmlFor="sms-tier">
              <select id="sms-tier" value={tier} onChange={(event) => setTier(event.target.value)}>
                {TIERS.map((entry) => (
                  <option key={entry.id} value={entry.id}>{entry.name}</option>
                ))}
              </select>
            </Field>
          )}

          {audienceType === 'load-alerts' && (
            <Field
              label="Load"
              htmlFor="sms-load"
              hint="Only members with a matching active job alert are included."
            >
              <select id="sms-load" value={effectiveLoadId} onChange={(event) => setLoadId(event.target.value)}>
                {openLoads.length ? (
                  openLoads.map((load) => (
                    <option key={load.id} value={load.id}>
                      {load.reference} · {load.origin} to {load.destination}
                    </option>
                  ))
                ) : (
                  <option value="">No open loads</option>
                )}
              </select>
            </Field>
          )}
        </div>

        {audienceType === 'members' && (
          <div className="sms-member-picker">
            <div className="sms-member-picker-head">
              <strong>Choose members</strong>
              <span>{selectedIds.length} selected</span>
            </div>
            <input
              className="input"
              value={memberSearch}
              onChange={(event) => setMemberSearch(event.target.value)}
              placeholder="Search name, number, phone or region…"
              aria-label="Search members for SMS"
            />
            <div className="sms-member-list">
              {filteredMembers.length ? (
                filteredMembers.map((member) => (
                  <label key={member.id} className="sms-member-option">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(member.id)}
                      onChange={() => toggleMember(member.id)}
                    />
                    <span>
                      <strong>{member.name}</strong>
                      <span>{member.memberNumber} · {member.phone}</span>
                    </span>
                  </label>
                ))
              ) : (
                <p className="field-hint">No active members match that search.</p>
              )}
            </div>
          </div>
        )}

        <div className="sms-template-row">
          <span>Templates:</span>
          {TEMPLATE_ORDER.map((key) => (
            <button
              key={key}
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => applyTemplate(key)}
            >
              {SMS_TEMPLATES[key].label}
            </button>
          ))}
        </div>

        <Field
          label="Message"
          htmlFor="sms-message"
          hint={`Placeholders: {{firstName}}, {{name}}, {{memberNumber}}, {{amount}}, {{count}}, {{loadTitle}}, {{origin}}, {{destination}}, {{rate}}. ${segments.length}/${SMS_MAX_LENGTH} characters · ${segments.segments} SMS · ${segments.encoding}.`}
        >
          <textarea
            id="sms-message"
            rows={5}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={SMS_MAX_LENGTH}
          />
        </Field>

        <div className="sms-preview">
          <div className="sms-preview-head">
            <strong>Preview</strong>
            <span>{resolved.recipients[0]?.name || 'No recipient'}</span>
          </div>
          <p>{preview || 'Choose an audience and write a message to see the preview.'}</p>
        </div>

        <div className="sms-send-row">
          <div>
            <strong>{resolved.recipients.length} recipient{resolved.recipients.length === 1 ? '' : 's'}</strong>
            <span className="table-sub">
              {resolved.skipped > 0
                ? `${resolved.skipped} member(s) without a usable phone number will be skipped.`
                : 'All matching members have a usable phone number.'}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setConfirmOpen(true)}
            disabled={!canSend}
          >
            <Icon name="message" size={16} /> Review and send
          </button>
        </div>
      </section>

      <section className="card card-flush">
        <div className="card-head">
          <div>
            <h2>SMS history</h2>
            <p>Every send is logged with its audience and delivery result.</p>
          </div>
        </div>
        {history.length ? (
          <div className="table-wrap">
            <table className="data-table admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Audience</th>
                  <th>Recipients</th>
                  <th>Status</th>
                  <th>Sent by</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDateTime(entry.createdAt)}</td>
                    <td>{SMS_TEMPLATES[entry.kind === 'load-alert' ? 'loadAlert' : entry.kind]?.label || entry.kind}</td>
                    <td>
                      {entry.audience}
                      <span className="table-sub">{entry.preview || entry.message}</span>
                    </td>
                    <td>
                      {entry.recipients}
                      {entry.failed > 0 && <span className="table-sub">{entry.failed} failed</span>}
                    </td>
                    <td>
                      <StatusBadge
                        status={entry.status}
                        label={entry.status === 'partial' ? 'Partial' : undefined}
                      />
                      {entry.simulated && <span className="table-sub">Simulated</span>}
                    </td>
                    <td>{entry.createdByName || 'Staff'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="inline-empty">
            <Icon name="message" size={16} /> No SMS messages have been sent yet.
          </div>
        )}
      </section>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Send SMS"
        subtitle={`${audienceText} · ${resolved.recipients.length} recipient${resolved.recipients.length === 1 ? '' : 's'}`}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmOpen(false)} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSend} disabled={busy}>
              <Icon name="message" size={15} /> {busy ? 'Sending…' : 'Send now'}
            </button>
          </>
        }
      >
        <div className="sms-confirm">
          <p>
            This will send <strong>{resolved.recipients.length}</strong> SMS message
            {resolved.recipients.length === 1 ? '' : 's'} through Arkesel using the{' '}
            <strong>{smsStatus.sender || 'HAULWAY'}</strong> sender ID.
          </p>
          <div className="sms-preview">
            <div className="sms-preview-head">
              <strong>Preview</strong>
              <span>{resolved.recipients[0]?.name || 'No recipient'}</span>
            </div>
            <p>{preview}</p>
          </div>
          {error && <div className="field-error">{error}</div>}
        </div>
      </Modal>
    </div>
  );
}
