import { useMemo, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import Icon from '../../components/Icon.jsx';
import { ENQUIRY_TYPES } from '../../config.js';
import { deleteMessage, markMessageRead, useStore } from '../../lib/store.js';
import { formatDateTime, initials, timeAgo } from '../../lib/format.js';
import { useToast } from '../../context/ToastContext.jsx';

function typeLabel(id) {
  return ENQUIRY_TYPES.find((entry) => entry.id === id)?.label || 'General';
}

export default function Enquiries() {
  const state = useStore();
  const { push } = useToast();
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const unreadCount = state.messages.filter((message) => !message.read).length;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...state.messages]
      .filter((message) => {
        if (filter === 'unread' && message.read) return false;
        if (typeFilter !== 'all' && message.type !== typeFilter) return false;
        if (!term) return true;
        return [message.name, message.email, message.subject, message.message]
          .join(' ')
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [state.messages, filter, typeFilter, search]);

  const selected = selectedId
    ? state.messages.find((message) => message.id === selectedId) || null
    : null;

  const deleting = deleteId ? state.messages.find((message) => message.id === deleteId) : null;

  const open = (message) => {
    setSelectedId(message.id);
    if (!message.read) markMessageRead(message.id, true);
  };

  const toggleRead = (message) => {
    markMessageRead(message.id, !message.read);
    push(message.read ? 'Marked as unread.' : 'Marked as read.', 'success');
  };

  const handleDelete = () => {
    if (!deleting) return;
    deleteMessage(deleting.id);
    if (selectedId === deleting.id) setSelectedId(null);
    setDeleteId(null);
    push('Enquiry deleted.', 'success');
  };

  return (
    <div className="admin-page">
      <div className="admin-toolbar">
        <div className="admin-toolbar-filters">
          <div className="chip-row">
            <button
              type="button"
              className={`chip ${filter === 'all' ? 'is-active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({state.messages.length})
            </button>
            <button
              type="button"
              className={`chip ${filter === 'unread' ? 'is-active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </button>
          </div>
          <div className="search-input">
            <Icon name="search" size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search subject, name or message…"
              aria-label="Search enquiries"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            aria-label="Filter by enquiry type"
          >
            <option value="all">All topics</option>
            {ENQUIRY_TYPES.map((type) => (
              <option key={type.id} value={type.id}>{type.label}</option>
            ))}
          </select>
        </div>
        <span className="admin-count-inline">
          <Icon name="mail" size={15} /> {unreadCount} unread
        </span>
      </div>

      {filtered.length ? (
        <div className="inbox">
          <div className="inbox-list">
            {filtered.map((message) => (
              <button
                key={message.id}
                type="button"
                className={`inbox-item ${message.read ? '' : 'is-unread'} ${selectedId === message.id ? 'is-active' : ''}`}
                onClick={() => open(message)}
              >
                <span className="avatar">{initials(message.name)}</span>
                <span className="inbox-item-copy">
                  <span className="inbox-item-top">
                    <strong>{message.name}</strong>
                    <time>{timeAgo(message.createdAt)}</time>
                  </span>
                  <span className="inbox-item-subject">{message.subject}</span>
                  <span className="inbox-item-preview">{message.message}</span>
                  <span className="badge badge-muted inbox-item-type">{typeLabel(message.type)}</span>
                </span>
                {!message.read && <span className="inbox-dot" aria-label="Unread" />}
              </button>
            ))}
          </div>

          <div className="inbox-detail card">
            {selected ? (
              <>
                <div className="inbox-detail-head">
                  <div>
                    <span className="badge badge-brand">{typeLabel(selected.type)}</span>
                    <h2>{selected.subject}</h2>
                    <p>
                      <strong>{selected.name}</strong> ·{' '}
                      <a href={`mailto:${selected.email}`}>{selected.email}</a>
                      {selected.phone ? ` · ${selected.phone}` : ''}
                    </p>
                    <span className="inbox-detail-date">{formatDateTime(selected.createdAt)}</span>
                  </div>
                  <div className="table-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => toggleRead(selected)}
                      aria-label={selected.read ? 'Mark unread' : 'Mark read'}
                      title={selected.read ? 'Mark unread' : 'Mark read'}
                    >
                      <Icon name="mail" size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn-danger"
                      onClick={() => setDeleteId(selected.id)}
                      aria-label="Delete enquiry"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </div>

                <div className="inbox-body">
                  {selected.message.split('\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>

                <div className="inbox-reply">
                  <a
                    href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject)}`}
                    className="btn btn-primary"
                  >
                    <Icon name="send" size={15} /> Reply by email
                  </a>
                  <a
                    href={`tel:${String(selected.phone || '').replace(/\s/g, '')}`}
                    className="btn btn-outline"
                  >
                    <Icon name="phone" size={15} /> Call back
                  </a>
                  <span>Reply opens your email client.</span>
                </div>
              </>
            ) : (
              <EmptyState
                icon="mail"
                title="Select an enquiry"
                description="Choose a message on the left to read it and reply."
              />
            )}
          </div>
        </div>
      ) : (
        <EmptyState
          icon="checkCircle"
          title={filter === 'unread' ? 'No unread enquiries' : 'No enquiries match'}
          description={
            filter === 'unread'
              ? 'You are all caught up. New contact form messages will appear here.'
              : 'Try another topic or clear the search. Messages sent through the public contact form appear here.'
          }
          action={
            filter === 'unread' ? (
              <button type="button" className="btn btn-outline" onClick={() => setFilter('all')}>
                View all enquiries
              </button>
            ) : null
          }
        />
      )}

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleteId(null)}
        title="Delete enquiry?"
        subtitle={deleting ? deleting.subject : ''}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDeleteId(null)}>Cancel</button>
            <button type="button" className="btn btn-danger" onClick={handleDelete}>Delete enquiry</button>
          </>
        }
      >
        <p className="confirm-copy">
          This removes the enquiry from the inbox. It cannot be recovered.
        </p>
      </Modal>
    </div>
  );
}
