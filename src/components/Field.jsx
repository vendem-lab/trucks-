export default function Field({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  children,
  className = ''
}) {
  return (
    <label className={`field ${error ? 'field-invalid' : ''} ${className}`} htmlFor={htmlFor}>
      {label && (
        <span className="field-label">
          {label}
          {required && <span className="field-required" aria-hidden="true"> *</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="field-error">{error}</span>
      ) : hint ? (
        <span className="field-hint">{hint}</span>
      ) : null}
    </label>
  );
}
