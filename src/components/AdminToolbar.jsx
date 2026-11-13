import Icon from './Icon.jsx';

export default function AdminToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  searchLabel = 'Search',
  children,
  actions,
  count,
  countSuffix,
  total
}) {
  const hasSearch = searchValue !== undefined && typeof onSearchChange === 'function';

  return (
    <div className="admin-toolbar">
      <div className="admin-toolbar-filters">
        {hasSearch && (
          <div className="search-input">
            <Icon name="search" size={16} />
            <input
              value={searchValue}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
              aria-label={searchLabel}
            />
          </div>
        )}
        {children}
      </div>

      {actions && <div className="admin-toolbar-actions">{actions}</div>}

      {count !== undefined && total !== undefined && (
        <div className="admin-count">
          <span>{count} of {total} {countSuffix}</span>
        </div>
      )}
    </div>
  );
}
