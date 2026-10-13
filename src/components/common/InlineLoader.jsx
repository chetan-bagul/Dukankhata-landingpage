export default function InlineLoader({ text = "Loading...", size = "sm" }) {
  const isLarge = size === "lg";
  return (
    <div
      className="inline-loader"
      role="status"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        fontSize: isLarge ? "15px" : "13px",
        color: "var(--mute)",
        fontWeight: 600,
      }}
    >
      <span
        className="loader-spinner"
        aria-hidden="true"
        style={{
          width: isLarge ? "20px" : "14px",
          height: isLarge ? "20px" : "14px",
          border: `2px solid var(--line)`,
          borderTopColor: "var(--brand)",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          display: "inline-block",
        }}
      />
      <span>{text}</span>
    </div>
  );
}
