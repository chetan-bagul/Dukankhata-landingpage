import { useMemo } from "react";
import { generateReportHtml, printReportDocument } from "../../utils/printReport";

export default function ReportPreviewModal({
  isOpen,
  onClose,
  from,
  to,
  summary,
  rows,
  shopInfo,
  enableUdhar,
}) {
  if (!isOpen) return null;

  const html = useMemo(() => {
    return generateReportHtml({ from, to, summary, rows, shopInfo, enableUdhar });
  }, [from, to, summary, rows, shopInfo, enableUdhar]);

  const handlePrint = () => {
    printReportDocument({ from, to, summary, rows, shopInfo, enableUdhar });
  };

  return (
    <div
      className="mobile-drawer-overlay"
      onClick={onClose}
      style={{ zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
    >
      <div
        className="form-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "95%",
          maxWidth: "920px",
          height: "90vh",
          display: "flex",
          flexDirection: "column",
          padding: "20px",
          borderRadius: "12px",
          background: "#FFFFFF",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        }}
      >
        {/* Header bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "12px", marginBottom: "12px" }}>
          <div>
            <h3 style={{ fontSize: "18px", margin: 0, color: "var(--deep)" }}>
              📊 Executive Sales &amp; Profit Report Preview
            </h3>
            <span style={{ fontSize: "12px", color: "var(--mute)" }}>
              A4 Format • Period: {from} to {to}
            </span>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePrint}
              style={{ fontWeight: 700 }}
            >
              🖨️ Print / Save as PDF
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              style={{ padding: "8px 14px" }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Live Document Preview Frame */}
        <div style={{ flex: 1, overflow: "hidden", borderRadius: "8px", border: "1px solid #D1D5DB", background: "#F3F4F6" }}>
          <iframe
            title="Report Preview"
            srcDoc={html}
            style={{ width: "100%", height: "100%", border: "none", background: "#FFFFFF" }}
          />
        </div>
      </div>
    </div>
  );
}
