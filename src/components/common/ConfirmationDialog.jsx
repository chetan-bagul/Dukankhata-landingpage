import { useEffect, useRef } from "react";

export default function ConfirmationDialog({
  isOpen,
  title = "Confirm Action",
  message = "Are you sure you want to proceed with this action?",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger", // 'danger' | 'primary' | 'warning'
  loading = false,
  onConfirm,
  onCancel,
}) {
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    if (isOpen && confirmBtnRef.current) {
      confirmBtnRef.current.focus();
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && onCancel) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const isDanger = variant === "danger";

  return (
    <div
      className="mobile-drawer-overlay"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-message"
    >
      <div
        className="inventory-drawer-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "460px" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "12px" }}>
          <h3
            id="dialog-title"
            style={{
              fontSize: "18px",
              color: isDanger ? "var(--bad)" : "var(--deep)",
              margin: 0,
              fontWeight: 700,
            }}
          >
            {isDanger ? "⚠️ " : ""}
            {title}
          </h3>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={onCancel}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <p
          id="dialog-message"
          className="muted"
          style={{ fontSize: "14px", lineHeight: 1.5, margin: "14px 0" }}
        >
          {message}
        </p>

        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
          <button
            type="button"
            className="btn btn-outline"
            style={{ flex: 1 }}
            disabled={loading}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className={`btn ${isDanger ? "btn-primary" : "btn-primary"}`}
            style={{
              flex: 1,
              background: isDanger ? "var(--bad)" : undefined,
              borderColor: isDanger ? "var(--bad)" : undefined,
            }}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
