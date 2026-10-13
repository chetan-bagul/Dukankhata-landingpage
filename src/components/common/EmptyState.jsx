export default function EmptyState({
  icon = "📦",
  title = "No records found",
  description = "Get started by creating your first entry or adjust your search filter.",
  actionLabel,
  onAction,
  actionLink,
}) {
  return (
    <div
      className="empty-state-card"
      style={{
        padding: "48px 24px",
        textAlign: "center",
        background: "#FFFFFF",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--line)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span style={{ fontSize: "40px", lineHeight: 1, marginBottom: "14px" }} aria-hidden="true">
        {icon}
      </span>
      <h3 style={{ fontSize: "17px", color: "var(--deep)", margin: "0 0 6px", fontWeight: 700 }}>
        {title}
      </h3>
      <p className="muted" style={{ fontSize: "13.5px", maxWidth: "420px", margin: "0 0 18px", lineHeight: 1.5 }}>
        {description}
      </p>

      {actionLabel && onAction && (
        <button className="btn btn-primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}

      {actionLabel && actionLink && (
        <a className="btn btn-primary" href={actionLink}>
          {actionLabel}
        </a>
      )}
    </div>
  );
}
