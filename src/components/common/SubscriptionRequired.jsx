import { Link } from "react-router-dom";

export default function SubscriptionRequired({
  title = "Subscription Required",
  message = "Your trial has expired or an active plan is required to access this feature.",
}) {
  return (
    <div
      className="subscription-required-card"
      role="alert"
      style={{
        padding: "48px 24px",
        textAlign: "center",
        background: "#FFFFFF",
        border: "1.5px solid var(--gold-dark)",
        borderRadius: "var(--radius-md)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        maxWidth: "520px",
        margin: "40px auto",
      }}
    >
      <span style={{ fontSize: "44px", marginBottom: "14px" }} aria-hidden="true">
        ⭐
      </span>
      <h2 style={{ fontSize: "20px", color: "var(--deep)", margin: "0 0 8px", fontWeight: 800 }}>
        {title}
      </h2>
      <p className="muted" style={{ fontSize: "14px", lineHeight: 1.6, margin: "0 0 24px", maxWidth: "420px" }}>
        {message}
      </p>

      <div style={{ display: "flex", gap: "10px" }}>
        <Link className="btn btn-primary" to="/subscription">
          💳 View Subscription Plans
        </Link>
        <Link className="btn btn-outline" to="/dashboard">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
