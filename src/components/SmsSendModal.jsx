import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import Icon from './Icon.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useStore } from '../lib/store.js';
import {
  SMS_MAX_LENGTH,
  buildRecipients,
  previewMessage,
  sendSms,
  smsSegments
} from '../lib/sms.js';

export default function SmsSendModal({
  open,
  onClose,
  title = 'Send SMS',
  subtitle = '',
  kind = 'announcement',
  audience,
  defaultMessage = '',
  sentBy = '',
  onSent
}) {
  const state = useStore();
  const { push } = useToast();
  const [message, setMessage] = useState(defaultMessage);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setMessage(defaultMessage);
    setError('');
    setBusy(false);
  }, [open, defaultMessage]);

  const resolved = useMemo(
    () => (open && audience ? buildRecipients(audience, state) : { recipients: [], skipped: 0 }),
    [open, audience, state]
  );
  const preview = previewMessage(message, resolved.recipients);
  const segments = smsSegments(preview);

  const handleSend = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await sendSms({ kind, audience, message, sentBy });
      push(
        `SMS sent to ${result.recipients} member${result.recipients === 1 ? '' : 's'}.`,
        'success'
      );
      onSent?.(result);
      onClose?.();
    } catch (sendError) {
      setError(sendError.message || 'Could not send the SMS.');
      push(sendError.message || 'Could not send the SMS.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle || `${resolved.recipients.length} recipient${resolved.recipients.length === 1 ? '' : 's'}`}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSend}
            disabled={busy || !resolved.recipients.length || !message.trim()}
          >
            <Icon name="send" size={15} /> {busy ? 'Sending…' : 'Send SMS'}
          </button>
        </>
      }
    >
      <div className="sms-confirm">
        <label className="field">
          <span className="field-label">Message</span>
          <textarea
            rows={5}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={SMS_MAX_LENGTH}
          />
          <span className="field-hint">
            {segments.length}/{SMS_MAX_LENGTH} characters · {segments.segments} SMS ·{' '}
            {segments.encoding}
          </span>
        </label>

        {resolved.recipients.length ? (
          <div className="sms-preview">
            <div className="sms-preview-head">
              <strong>Preview</strong>
              <span>{resolved.recipients[0]?.name}</span>
            </div>
            <p>{preview}</p>
          </div>
        ) : (
          <div className="inline-note">
            <Icon name="alert" size={16} />
            <span>No member with a usable phone number matches this message.</span>
          </div>
        )}

        {error && <div className="field-error">{error}</div>}
      </div>
    </Modal>
  );
}
