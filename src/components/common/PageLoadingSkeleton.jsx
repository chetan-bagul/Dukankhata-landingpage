export default function PageLoadingSkeleton({ rows = 4, title = "Loading page data..." }) {
  return (
    <div
      className="page-loading-skeleton"
      role="status"
      aria-live="polite"
      aria-label={title}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        padding: "24px",
        background: "#FFFFFF",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--line)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
        <div
          className="skeleton-pulse"
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "var(--surface-low)",
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            className="skeleton-pulse"
            style={{
              width: "40%",
              height: "18px",
              borderRadius: "4px",
              background: "var(--surface-low)",
              marginBottom: "6px",
            }}
          />
          <div
            className="skeleton-pulse"
            style={{
              width: "60%",
              height: "12px",
              borderRadius: "4px",
              background: "var(--surface-low)",
            }}
          />
        </div>
      </div>

      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="skeleton-pulse"
          style={{
            width: "100%",
            height: "44px",
            borderRadius: "8px",
            background: "var(--surface-low)",
            opacity: 1 - i * 0.15,
          }}
        />
      ))}
      <span className="sr-only" style={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0,0,0,0)" }}>
        {title}
      </span>
    </div>
  );
}
