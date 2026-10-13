import { useEffect } from "react";

export default function ToastNotification({
  message,
  type = "info", // 'info' | 'success' | 'error' | 'warning'
  duration = 4000,
  onClose,
}) {
  useEffect(() => {
    if (!message || !onClose) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const typeStyles = {
    success: { bg: "var(--tint)", text: "var(--brand)", border: "rgba(15, 61, 47, 0.2)", icon: "✓" },
    error: { bg: "var(--bad-tint)", text: "var(--bad)", border: "rgba(211, 47, 47, 0.2)", icon: "⚠️" },
    warning: { bg: "var(--gold-tint)", text: "var(--gold-dark)", border: "rgba(232, 196, 104, 0.4)", icon: "⏳" },
    info: { bg: "var(--surface-low)", text: "var(--deep)", border: "var(--line)", icon: "ℹ️" },
  }[type] || { bg: "var(--surface-low)", text: "var(--deep)", border: "var(--line)", icon: "ℹ️" };

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 999,
        background: typeStyles.bg,
        color: typeStyles.text,
        border: `1.5px solid ${typeStyles.border}`,
        borderRadius: "var(--radius-md)",
        padding: "14px 20px",
        boxShadow: "var(--shadow-xl)",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        maxWidth: "400px",
        animation: "fadeIn 0.2s ease-out",
        fontSize: "13.5px",
        fontWeight: 600,
      }}
    >
      <span aria-hidden="true">{typeStyles.icon}</span>
      <span style={{ flex: 1 }}>{message}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss message"
          style={{
            background: "none",
            border: "none",
            color: "inherit",
            cursor: "pointer",
            padding: "2px",
            fontSize: "14px",
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
