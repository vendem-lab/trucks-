import { useMemo, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import Field from '../../components/Field.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import Icon from '../../components/Icon.jsx';
import { NEWS_CATEGORIES } from '../../config.js';
import { addNews, deleteNews, updateNews, useStore } from '../../lib/store.js';
import { formatDate, toInputDate } from '../../lib/format.js';
import { useToast } from '../../context/ToastContext.jsx';

const EMPTY = {
  title: '',
  category: 'announcement',
  excerpt: '',
  body: '',
  author: 'Union office',
  publishedAt: toInputDate(new Date().toISOString()),
  featured: false,
  readMins: '2'
};

function toForm(article) {
  return {
    title: article.title || '',
    category: article.category || 'announcement',
    excerpt: article.excerpt || '',
    body: Array.isArray(article.body) ? article.body.join('\n\n') : String(article.body || ''),
    author: article.author || 'Union office',
    publishedAt: toInputDate(article.publishedAt),
    featured: Boolean(article.featured),
    readMins: String(article.readMins || 2)
  };
}

function categoryLabel(id) {
  return NEWS_CATEGORIES.find((entry) => entry.id === id)?.label || id;
}

export default function NewsAdmin() {
  const state = useStore();
  const { push } = useToast();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [deleteId, setDeleteId] = useState(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...state.news]
      .filter((article) => {
        if (categoryFilter !== 'all' && article.category !== categoryFilter) return false;
        if (!term) return true;
        return [article.title, article.excerpt, article.author]
          .join(' ')
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }, [state.news, search, categoryFilter]);

  const deleting = deleteId ? state.news.find((article) => article.id === deleteId) : null;

  const update = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY);
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = (article) => {
    setEditingId(article.id);
    setForm(toForm(article));
    setErrors({});
    setFormOpen(true);
  };

  const handleSave = (event) => {
    event.preventDefault();
    const next = {};
    if (!form.title.trim()) next.title = 'Add a title.';
    if (!form.excerpt.trim()) next.excerpt = 'Add a short excerpt.';
    if (!form.body.trim()) next.body = 'Write the article body.';
    if (!form.author.trim()) next.author = 'Add an author.';
    if (!form.publishedAt) next.publishedAt = 'Choose a publication date.';
    setErrors(next);
    if (Object.keys(next).length) {
      push('Check the highlighted fields.', 'error');
      return;
    }

    const payload = {
      ...form,
      publishedAt: new Date(`${form.publishedAt}T09:00:00`).toISOString(),
      readMins: Number(form.readMins) || 2
    };

    if (editingId) {
      updateNews(editingId, payload);
      push('Article updated.', 'success');
    } else {
      addNews(payload);
      push('Article published.', 'success');
    }
    setFormOpen(false);
  };

  const handleDelete = () => {
    if (!deleting) return;
    deleteNews(deleting.id);
    push('Article deleted.', 'success');
    setDeleteId(null);
  };

  return (
    <div className="admin-page">
      <div className="admin-toolbar">
        <div className="admin-toolbar-filters">
          <div className="search-input">
            <Icon name="search" size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search articles…"
              aria-label="Search news"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            {NEWS_CATEGORIES.map((category) => (
              <option key={category.id} value={category.id}>{category.label}</option>
            ))}
          </select>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          <Icon name="plus" size={16} /> New article
        </button>
      </div>

      <div className="admin-count">
        <span>{filtered.length} of {state.news.length} articles</span>
      </div>

      <div className="card card-flush">
        {filtered.length ? (
          <div className="table-wrap">
            <table className="data-table admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Author</th>
                  <th>Published</th>
                  <th>Read</th>
                  <th>Featured</th>
                  <th className="table-actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((article) => (
                  <tr key={article.id}>
                    <td>
                      <span className="table-strong">{article.title}</span>
                      <span className="table-sub">{article.excerpt}</span>
                    </td>
                    <td><span className="badge badge-brand">{categoryLabel(article.category)}</span></td>
                    <td>{article.author}</td>
                    <td>{formatDate(article.publishedAt)}</td>
                    <td>{article.readMins} min</td>
                    <td>{article.featured ? <span className="badge badge-warning">Featured</span> : '—'}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => openEdit(article)}
                          aria-label={`Edit ${article.title}`}
                        >
                          <Icon name="edit" size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn icon-btn-danger"
                          onClick={() => setDeleteId(article.id)}
                          aria-label={`Delete ${article.title}`}
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon="megaphone"
            title="No articles match"
            description="Adjust the search or filters, or publish a new update."
            action={
              <button type="button" className="btn btn-primary" onClick={openCreate}>
                <Icon name="plus" size={16} /> New article
              </button>
            }
          />
        )}
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? 'Edit article' : 'New article'}
        subtitle={editingId ? 'Changes appear on the public site immediately.' : 'Publish an update to the news page.'}
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>Cancel</button>
            <button type="submit" form="news-form" className="btn btn-primary">
              {editingId ? 'Save changes' : 'Publish article'}
            </button>
          </>
        }
      >
        <form id="news-form" onSubmit={handleSave} className="modal-form" noValidate>
          <Field label="Title" htmlFor="news-title" required error={errors.title}>
            <input id="news-title" value={form.title} onChange={update('title')} placeholder="e.g. Dues calendar confirmed for 2027" />
          </Field>
          <div className="form-grid">
            <Field label="Category" htmlFor="news-category">
              <select id="news-category" value={form.category} onChange={update('category')}>
                {NEWS_CATEGORIES.map((category) => (
                  <option key={category.id} value={category.id}>{category.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Author" htmlFor="news-author" required error={errors.author}>
              <input id="news-author" value={form.author} onChange={update('author')} placeholder="e.g. Ama Mensah" />
            </Field>
            <Field label="Publication date" htmlFor="news-date" required error={errors.publishedAt}>
              <input id="news-date" type="date" value={form.publishedAt} onChange={update('publishedAt')} />
            </Field>
            <Field label="Read time" htmlFor="news-read">
              <div className="input-suffix">
                <input id="news-read" type="number" min="1" value={form.readMins} onChange={update('readMins')} />
                <span>min</span>
              </div>
            </Field>
          </div>
          <Field label="Excerpt" htmlFor="news-excerpt" required error={errors.excerpt}>
            <textarea id="news-excerpt" rows="2" value={form.excerpt} onChange={update('excerpt')} placeholder="One or two sentences for the news list…" />
          </Field>
          <Field
            label="Article body"
            htmlFor="news-body"
            required
            error={errors.body}
            hint="Leave a blank line between paragraphs."
          >
            <textarea id="news-body" rows="10" value={form.body} onChange={update('body')} placeholder="Write the update…" />
          </Field>
          <label className="switch-field">
            <input type="checkbox" checked={form.featured} onChange={update('featured')} />
            <span className="switch-ui" />
            <span>
              <strong>Feature on the news page</strong>
              <span>Only one article can be featured at a time.</span>
            </span>
          </label>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleteId(null)}
        title="Delete article?"
        subtitle={deleting ? deleting.title : ''}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDeleteId(null)}>Cancel</button>
            <button type="button" className="btn btn-danger" onClick={handleDelete}>Delete article</button>
          </>
        }
      >
        <p className="confirm-copy">
          This removes the article from the public site and from this browser. This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
