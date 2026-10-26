export default function PageHero({ eyebrow, title, description, children, align = 'left' }) {
  return (
    <section className={`page-hero page-hero-${align}`}>
      <div className="container page-hero-inner">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p className="page-hero-copy">{description}</p>}
        {children}
      </div>
    </section>
  );
}
