import { Link, useParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { NEWS_CATEGORIES } from '../config.js';
import { useStore } from '../lib/store.js';
import { formatDate, initials } from '../lib/format.js';

function categoryLabel(id) {
  return NEWS_CATEGORIES.find((entry) => entry.id === id)?.label || 'Update';
}

export default function NewsArticle() {
  const { id } = useParams();
  const state = useStore();
  const article = state.news.find((entry) => entry.id === id);

  if (!article) {
    return (
      <section className="section">
        <div className="container container-narrow article-missing">
          <span className="empty-icon"><Icon name="megaphone" size={26} /></span>
          <h1>That update could not be found</h1>
          <p>
            It may have been removed from this browser, or the link may be wrong. The latest union
            updates are all on the news page.
          </p>
          <Link to="/news" className="btn btn-primary">
            Back to news <Icon name="arrowRight" size={16} />
          </Link>
        </div>
      </section>
    );
  }

  const related = state.news
    .filter((entry) => entry.id !== article.id)
    .sort((a, b) => {
      const aMatch = a.category === article.category ? 1 : 0;
      const bMatch = b.category === article.category ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch;
      return new Date(b.publishedAt) - new Date(a.publishedAt);
    })
    .slice(0, 3);

  return (
    <article className="article">
      <header className="article-head">
        <div className="container container-narrow">
          <Link to="/news" className="article-back">
            <Icon name="arrowRight" size={15} /> All news
          </Link>
          <span className="badge badge-brand article-category">{categoryLabel(article.category)}</span>
          <h1>{article.title}</h1>
          <p className="article-lede">{article.excerpt}</p>
          <div className="article-meta">
            <span className="avatar avatar-sm">{initials(article.author)}</span>
            <div>
              <strong>{article.author}</strong>
              <span>
                {formatDate(article.publishedAt)} · {article.readMins} min read
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="container container-narrow">
        <div className="article-body">
          {article.body.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>

        <div className="article-foot">
          <div>
            <span className="eyebrow">Member question?</span>
            <p>Call the member line or send the office a message. We answer every one.</p>
          </div>
          <div className="article-foot-actions">
            <Link to="/contact" className="btn btn-outline">Contact the office</Link>
            <Link to="/membership" className="btn btn-primary">
              Join the union <Icon name="arrowRight" size={15} />
            </Link>
          </div>
        </div>

        {related.length > 0 && (
          <section className="article-related">
            <div className="section-head section-head-compact">
              <div>
                <span className="eyebrow">Keep reading</span>
                <h2>More from the union</h2>
              </div>
              <Link to="/news" className="card-link">
                All news <Icon name="arrowRight" size={14} />
              </Link>
            </div>
            <div className="news-grid">
              {related.map((entry) => (
                <Link key={entry.id} to={`/news/${entry.id}`} className="news-card">
                  <span className="badge badge-brand">{categoryLabel(entry.category)}</span>
                  <h3>{entry.title}</h3>
                  <p>{entry.excerpt}</p>
                  <div className="news-card-foot">
                    <span><Icon name="calendar" size={13} /> {formatDate(entry.publishedAt)}</span>
                    <span>{entry.readMins} min read</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}
