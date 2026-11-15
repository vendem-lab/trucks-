import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { useAuth } from '../context/authContext.js';
import { isDemoMode } from '../lib/store.js';
import {
  ASSISTANT_GREETING,
  ASSISTANT_SUGGESTIONS,
  PUBLIC_GREETING,
  PUBLIC_SUGGESTIONS,
  askAssistant
} from '../lib/assistant.js';

let counter = 0;
const nextId = () => `assistant-${(counter += 1)}`;

export default function AssistantWidget() {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const logRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    const node = logRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, busy, open]);

  const send = useCallback(
    async (text) => {
      const content = String(text ?? '').trim();
      if (!content || busy) return;

      const history = [...messages, { id: nextId(), role: 'user', content }];
      setMessages(history);
      setDraft('');
      setBusy(true);

      try {
        const reply = await askAssistant(
          history
            .filter((message) => !message.error)
            .slice(-8)
            .map((message) => ({ role: message.role, content: message.content }))
        );
        setMessages((current) => [...current, { id: nextId(), role: 'assistant', content: reply }]);
      } catch (error) {
        setMessages((current) => [
          ...current,
          {
            id: nextId(),
            role: 'assistant',
            error: true,
            content: error?.message || 'Something went wrong. Please try again.'
          }
        ]);
      } finally {
        setBusy(false);
      }
    },
    [busy, messages]
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    send(draft);
  };

  // The assistant needs a signed-in Firebase account, which demo mode does not have.
  if (isDemoMode()) return null;

  // Approved members get answers from their own record; everyone else gets the
  // public FAQ, which is also what the server enforces without a token.
  const isMember = session?.role === 'member' && !session.profileMissing && !session.profileError;
  const greeting = isMember ? ASSISTANT_GREETING : PUBLIC_GREETING;
  const suggestions = isMember ? ASSISTANT_SUGGESTIONS : PUBLIC_SUGGESTIONS;

  return (
    <>
      {open && (
        <section id="union-assistant" className="assistant-panel" role="dialog" aria-label="Union assistant">
          <header className="assistant-head">
            <span className="assistant-mark">
              <Icon name="spark" size={18} />
            </span>
            <div className="assistant-head-text">
              <strong>Union assistant</strong>
              <span>
                {isMember ? 'Answers from your member record' : 'Membership, dues and office questions'}
              </span>
            </div>
            <button
              type="button"
              className="assistant-close"
              onClick={() => setOpen(false)}
              aria-label="Close the assistant"
            >
              <Icon name="close" size={18} />
            </button>
          </header>

          <div className="assistant-log" ref={logRef} role="log" aria-live="polite">
            <div className="assistant-row">
              <div className="assistant-bubble is-bot">{greeting}</div>
            </div>

            {messages.map((message) => (
              <div
                key={message.id}
                className={`assistant-row ${message.role === 'user' ? 'is-user' : ''}`}
              >
                <div
                  className={[
                    'assistant-bubble',
                    message.role === 'user' ? 'is-user' : 'is-bot',
                    message.error ? 'is-error' : ''
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {!messages.length && (
              <div className="assistant-suggestions">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="assistant-chip"
                    onClick={() => send(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {busy && (
              <div className="assistant-row">
                <div className="assistant-bubble is-bot assistant-typing" aria-label="Assistant is typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>

          <form className="assistant-form" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              className="assistant-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about dues, status or loads"
              maxLength={600}
              aria-label="Message the union assistant"
            />
            <button
              type="submit"
              className="assistant-send"
              disabled={busy || !draft.trim()}
              aria-label="Send message"
            >
              <Icon name="send" size={18} />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className={`assistant-launch ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="union-assistant"
        aria-label={open ? 'Close the union assistant' : 'Open the union assistant'}
      >
        <Icon name={open ? 'close' : 'message'} size={22} />
      </button>
    </>
  );
}
