export default function FormFieldError({ error }) {
  if (!error) return null;

  return (
    <span
      className="inline-error"
      role="alert"
      style={{
        fontSize: "12px",
        color: "var(--bad)",
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        marginTop: "4px",
      }}
    >
      <span aria-hidden="true">⚠️</span>
      <span>{error}</span>
    </span>
  );
}
