/**
 * Loading placeholders. Keep them shaped like the content they replace so the
 * page doesn't jump when real data arrives.
 */

export default function Skeleton({ variant = 'text', width, height, className = '' }) {
  const classes = ['skeleton', `skeleton-${variant}`, className].filter(Boolean).join(' ');
  return <span className={classes} style={{ width, height }} aria-hidden="true" />;
}

export function SkeletonCard({ lines = 3, className = '' }) {
  return (
    <div className={`skeleton-card ${className}`.trim()} aria-hidden="true">
      <Skeleton variant="title" />
      <div className="skeleton-stack">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton key={index} width={index === lines - 1 ? '62%' : '100%'} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 3, lines = 3, className = '' }) {
  return (
    <div className={`skeleton-grid ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} lines={lines} />
      ))}
    </div>
  );
}

export function SkeletonList({ count = 3, avatar = false, className = '' }) {
  return (
    <div className={`skeleton-list ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div className="skeleton-row" key={index}>
          {avatar && <Skeleton variant="avatar" />}
          <div className="skeleton-stack">
            <Skeleton width={index % 2 ? '58%' : '74%'} />
            <Skeleton width="42%" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4, className = '' }) {
  return (
    <div className={`skeleton-table ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: rows }).map((_, row) => (
        <div
          className="skeleton-table-row"
          key={row}
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((__, column) => (
            <Skeleton key={column} width={column === 0 ? '72%' : '54%'} />
          ))}
        </div>
      ))}
    </div>
  );
}
