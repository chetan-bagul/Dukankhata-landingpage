export default function RetryButton({
  onRetry,
  loading = false,
  label = "Retry",
  size = "md",
  className = "btn btn-outline",
}) {
  return (
    <button
      type="button"
      className={className}
      disabled={loading}
      onClick={onRetry}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        minHeight: size === "sm" ? "32px" : "40px",
        fontSize: size === "sm" ? "12.5px" : "13.5px",
      }}
    >
      <span aria-hidden="true">{loading ? "⏳" : "🔄"}</span>
      <span>{loading ? "Retrying..." : label}</span>
    </button>
  );
}
