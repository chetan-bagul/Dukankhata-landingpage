export default function OfflineOrNetworkError({
  onRetry,
  message = "No internet connection detected or server is temporarily unreachable.",
}) {
  return (
    <div
      className="offline-error-card"
      role="alert"
      style={{
        padding: "40px 24px",
        textAlign: "center",
        background: "var(--surface-low)",
        border: "1.5px solid var(--line)",
        borderRadius: "var(--radius-md)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        maxWidth: "500px",
        margin: "30px auto",
      }}
    >
      <span style={{ fontSize: "40px", marginBottom: "12px" }} aria-hidden="true">
        📡
      </span>
      <h3 style={{ fontSize: "18px", color: "var(--deep)", margin: "0 0 6px", fontWeight: 700 }}>
        Network Disconnected
      </h3>
      <p className="muted" style={{ fontSize: "13.5px", lineHeight: 1.5, margin: "0 0 20px" }}>
        {message}
      </p>

      {onRetry && (
        <button className="btn btn-primary" onClick={onRetry}>
          🔄 Check Connection &amp; Retry
        </button>
      )}
    </div>
  );
}
