import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function SessionExpired({
  message = "Your session has expired or was revoked. Please log in again to continue.",
}) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLoginRedirect = async () => {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <div
      className="session-expired-card"
      role="alert"
      style={{
        padding: "48px 24px",
        textAlign: "center",
        background: "#FFFFFF",
        border: "1.5px solid var(--line)",
        borderRadius: "var(--radius-md)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        maxWidth: "500px",
        margin: "60px auto",
      }}
    >
      <span style={{ fontSize: "44px", marginBottom: "14px" }} aria-hidden="true">
        ⏳
      </span>
      <h2 style={{ fontSize: "20px", color: "var(--deep)", margin: "0 0 8px", fontWeight: 800 }}>
        Session Expired
      </h2>
      <p className="muted" style={{ fontSize: "14px", lineHeight: 1.5, margin: "0 0 24px" }}>
        {message}
      </p>

      <button className="btn btn-primary" onClick={handleLoginRedirect} style={{ padding: "12px 28px" }}>
        Log In to DukanKhata™
      </button>
    </div>
  );
}
