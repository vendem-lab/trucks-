import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero.jsx';
import Icon from '../components/Icon.jsx';
import { NEWS_CATEGORIES } from '../config.js';
import { useStore } from '../lib/store.js';
import { formatDate } from '../lib/format.js';

function categoryLabel(id) {
  return NEWS_CATEGORIES.find((entry) => entry.id === id)?.label || 'Update';
}

export default function News() {
  const state = useStore();
  const [category, setCategory] = useState('all');

  const articles = useMemo(
    () =>
      [...state.news]
        .filter((article) => category === 'all' || article.category === category)
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)),
    [state.news, category]
  );

  const featured = articles.find((article) => article.featured) || articles[0] || null;
  const rest = articles.filter((article) => article.id !== featured?.id);

  return (
    <>
      <PageHero
        eyebrow="News & updates"
        title="What the union is doing, in plain language."
        description="Rate agreements, safety rules, member wins and notices from the office. No jargon and no press releases written for somebody else."
      />

      <section className="section">
        <div className="container">
          <div className="news-filter">
            <div className="chip-row">
              <button
                type="button"
                className={`chip ${category === 'all' ? 'is-active' : ''}`}
                onClick={() => setCategory('all')}
              >
                All updates
              </button>
              {NEWS_CATEGORIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`chip ${category === item.id ? 'is-active' : ''}`}
                  onClick={() => setCategory(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <span className="news-count">
              {articles.length} {articles.length === 1 ? 'article' : 'articles'}
            </span>
          </div>

          {state.loading ? (
            <div className="card">
              <p>Loading union updates…</p>
            </div>
          ) : (
            <>
          {featured && (
            <Link to={`/news/${featured.id}`} className="news-feature">
              <div className="news-feature-art" aria-hidden="true">
                <span className="news-feature-badge">{categoryLabel(featured.category)}</span>
                <Icon name="megaphone" size={64} strokeWidth={1.3} />
                <span className="news-feature-mark">HU</span>
              </div>
              <div className="news-feature-body">
                <span className="eyebrow">Latest from the office</span>
                <h2>{featured.title}</h2>
                <p>{featured.excerpt}</p>
                <div className="news-feature-meta">
                  <span><Icon name="calendar" size={14} /> {formatDate(featured.publishedAt)}</span>
                  <span><Icon name="clock" size={14} /> {featured.readMins} min read</span>
                  <span><Icon name="user" size={14} /> {featured.author}</span>
                </div>
                <span className="news-feature-link">
                  Read the full update <Icon name="arrowRight" size={16} />
                </span>
              </div>
            </Link>
          )}

          {rest.length ? (
            <div className="news-grid">
              {rest.map((article) => (
                <Link key={article.id} to={`/news/${article.id}`} className="news-card">
                  <span className="badge badge-brand">{categoryLabel(article.category)}</span>
                  <h3>{article.title}</h3>
                  <p>{article.excerpt}</p>
                  <div className="news-card-foot">
                    <span><Icon name="calendar" size={13} /> {formatDate(article.publishedAt)}</span>
                    <span>{article.readMins} min read</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="news-empty">
              <Icon name="megaphone" size={26} />
              <h3>Nothing in this category yet</h3>
              <p>Try another category, or check back after the next members’ meeting.</p>
            </div>
          )}
            </>
          )}
        </div>
      </section>

      <section className="cta-band">
        <div className="container cta-inner">
          <div>
            <h2>Get union updates where you already are.</h2>
            <p>
              Members receive a short SMS digest after every national executive meeting. Update your
              contact details in the portal to make sure you are on the list.
            </p>
          </div>
          <div className="cta-actions">
            <Link to="/portal/profile" className="btn btn-primary btn-lg">
              Update my details <Icon name="arrowRight" size={18} />
            </Link>
            <Link to="/contact" className="btn btn-ghost btn-lg">Ask the office</Link>
          </div>
        </div>
      </section>
    </>
  );
}
