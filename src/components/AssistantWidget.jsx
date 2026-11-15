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
import {
  DRAG_THRESHOLD,
  clampPosition,
  panelLayout,
  readStoredPosition,
  savePosition
} from '../lib/assistantPosition.js';

let counter = 0;
const nextId = () => `assistant-${(counter += 1)}`;

function useViewport() {
  const [size, setSize] = useState(() => ({
    width: typeof window === 'undefined' ? 1024 : window.innerWidth,
    height: typeof window === 'undefined' ? 768 : window.innerHeight
  }));

  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  return size;
}

export default function AssistantWidget() {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [position, setPosition] = useState(readStoredPosition);
  const [dragging, setDragging] = useState(false);
  const logRef = useRef(null);
  const inputRef = useRef(null);
  const dragRef = useRef(null);
  const draggedRef = useRef(false);
  const viewport = useViewport();

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

  // A window resize can leave a saved position off screen.
  useEffect(() => {
    setPosition((current) => {
      if (!current) return current;
      const next = clampPosition(current, viewport.width, viewport.height);
      return next.x === current.x && next.y === current.y ? current : next;
    });
  }, [viewport.width, viewport.height]);

  const handlePointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
      moved: false,
      last: null
    };
    // Capture keeps move/up events coming when the cursor leaves the button,
    // but it throws for pointers the browser no longer considers active.
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      /* drag still works without capture */
    }
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    if (!drag.moved) {
      drag.moved = true;
      setDragging(true);
    }

    const next = clampPosition(
      { x: drag.originX + dx, y: drag.originY + dy },
      viewport.width,
      viewport.height
    );
    drag.last = next;
    setPosition(next);
  };

  const handlePointerUp = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    dragRef.current = null;
    setDragging(false);
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch {
      /* pointer already released */
    }

    if (drag.moved) {
      draggedRef.current = true;
      if (drag.last) savePosition(drag.last);
    }
  };

  const handleLaunchClick = () => {
    // A drag ends with a click event; swallow that one.
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    setOpen((value) => !value);
  };

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

  const launchStyle = position
    ? { left: `${position.x}px`, top: `${position.y}px`, right: 'auto', bottom: 'auto' }
    : undefined;

  return (
    <>
      {open && (
        <section
          id="union-assistant"
          className="assistant-panel"
          style={panelLayout(position, viewport.width, viewport.height)}
          role="dialog"
          aria-label="Union assistant"
        >
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
        className={`assistant-launch ${open ? 'is-open' : ''} ${dragging ? 'is-dragging' : ''}`}
        style={launchStyle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleLaunchClick}
        aria-expanded={open}
        aria-controls="union-assistant"
        aria-label={open ? 'Close the union assistant' : 'Open the union assistant'}
      >
        <Icon name={open ? 'close' : 'message'} size={22} />
      </button>
    </>
  );
}
