import Icon from './Icon.jsx';

export default function StatCard({ icon = 'chart', label, value, hint, tone = 'brand' }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon stat-icon-${tone}`}>
        <Icon name={icon} size={20} />
      </div>
      <div className="stat-copy">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{value}</span>
        {hint && <span className="stat-hint">{hint}</span>}
      </div>
    </div>
  );
}
