import { getApiErrorDetails } from "../../api/apiError";

export default function ErrorState({
  error,
  title = "Unable to load data",
  onRetry,
  compact = false,
}) {
  const details = typeof error === "object" ? getApiErrorDetails(error) : { message: String(error || "An error occurred.") };

  if (compact) {
    return (
      <div
        className="alert-banner error"
        role="alert"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span>⚠️</span>
          <span>{details.message}</span>
        </div>
        {onRetry && (
          <button
            className="btn btn-sm btn-outline"
            onClick={onRetry}
            style={{ background: "#FFFFFF", color: "var(--bad)", borderColor: "var(--bad)" }}
          >
            🔄 Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="error-state-card"
      role="alert"
      style={{
        padding: "40px 24px",
        textAlign: "center",
        background: "var(--bad-tint)",
        border: "1.5px solid #FCA5A5",
        borderRadius: "var(--radius-md)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <span style={{ fontSize: "36px" }} aria-hidden="true">
        ⚠️
      </span>
      <h3 style={{ fontSize: "17px", color: "var(--bad)", margin: 0, fontWeight: 700 }}>
        {title}
      </h3>
      <p style={{ fontSize: "13.5px", color: "#991B1B", maxWidth: "440px", margin: 0, lineHeight: 1.5 }}>
        {details.message}
      </p>

      {details.correlationId && (
        <code style={{ fontSize: "11px", color: "var(--mute)", background: "#FFFFFF", padding: "2px 8px", borderRadius: "4px" }}>
          Trace ID: {details.correlationId}
        </code>
      )}

      {onRetry && (
        <button
          className="btn btn-primary"
          onClick={onRetry}
          style={{ marginTop: "10px", background: "var(--bad)", borderColor: "var(--bad)" }}
        >
          🔄 Try Again
        </button>
      )}
    </div>
  );
}
