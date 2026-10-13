import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div
      className="not-found-page-container"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "var(--paper)",
        textAlign: "center",
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: "520px",
          width: "100%",
          padding: "48px 32px",
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: "64px",
            fontWeight: 900,
            color: "var(--brand)",
            fontFamily: "Plus Jakarta Sans, sans-serif",
            lineHeight: 1,
            marginBottom: "12px",
          }}
        >
          404
        </span>

        <h1 style={{ fontSize: "22px", color: "var(--deep)", margin: "0 0 10px", fontWeight: 800 }}>
          Page Not Found
        </h1>

        <p className="muted" style={{ fontSize: "14px", lineHeight: 1.6, margin: "0 0 28px" }}>
          The page or desk you requested does not exist or may have been moved.
        </p>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
          <Link className="btn btn-primary" to="/dashboard" style={{ padding: "12px 24px" }}>
            📊 Go to Dashboard
          </Link>
          <Link className="btn btn-outline" to="/" style={{ padding: "12px 24px" }}>
            🏠 Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
