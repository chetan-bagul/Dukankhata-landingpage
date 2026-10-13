import { Link } from "react-router-dom";

export default function AccessDenied({
  title = "Access Restricted",
  message = "You do not have permission to view or manage this module. Please contact your store owner.",
}) {
  return (
    <div
      className="access-denied-card"
      role="alert"
      style={{
        padding: "48px 24px",
        textAlign: "center",
        background: "#FFFFFF",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-md)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        maxWidth: "540px",
        margin: "40px auto",
      }}
    >
      <span style={{ fontSize: "48px", marginBottom: "16px" }} aria-hidden="true">
        🔒
      </span>
      <h2 style={{ fontSize: "20px", color: "var(--deep)", margin: "0 0 8px", fontWeight: 800 }}>
        {title}
      </h2>
      <p className="muted" style={{ fontSize: "14px", lineHeight: 1.6, margin: "0 0 24px", maxWidth: "420px" }}>
        {message}
      </p>

      <div style={{ display: "flex", gap: "10px" }}>
        <Link className="btn btn-primary" to="/dashboard">
          Back to Dashboard
        </Link>
        <Link className="btn btn-outline" to="/pos">
          Open POS Counter
        </Link>
      </div>
    </div>
  );
}
