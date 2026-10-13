import { useState, useMemo } from "react";
import {
  generateInvoiceA4Html,
  generateThermalReceiptHtml,
  printInvoiceDocument,
} from "../../utils/printInvoice";

export default function InvoicePreviewModal({
  isOpen,
  onClose,
  sale,
  shopInfo,
}) {
  const [format, setFormat] = useState("A4"); // 'A4' | 'THERMAL'

  const html = useMemo(() => {
    if (!sale) return "";
    return format === "THERMAL"
      ? generateThermalReceiptHtml({ sale, shopInfo })
      : generateInvoiceA4Html({ sale, shopInfo });
  }, [sale, shopInfo, format]);

  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    printInvoiceDocument({ sale, shopInfo, format });
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
          maxWidth: format === "THERMAL" ? "480px" : "900px",
          height: "90vh",
          display: "flex",
          flexDirection: "column",
          padding: "20px",
          borderRadius: "12px",
          background: "#FFFFFF",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          transition: "max-width 0.2s ease",
        }}
      >
        {/* Header bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "12px", marginBottom: "12px" }}>
          <div>
            <h3 style={{ fontSize: "18px", margin: 0, color: "var(--deep)" }}>
              🧾 Invoice &amp; Bill Preview
            </h3>
            <span style={{ fontSize: "12px", color: "var(--mute)" }}>
              Invoice #{sale.invoiceNumber || sale.id?.slice(0, 8)}
            </span>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {/* Format toggle chips */}
            <div className="history-preset-chips" style={{ margin: 0 }}>
              <button
                type="button"
                className={`preset-chip ${format === "A4" ? "active" : ""}`}
                onClick={() => setFormat("A4")}
                style={{ padding: "4px 10px", fontSize: "12px" }}
              >
                📄 A4 Tax Invoice
              </button>
              <button
                type="button"
                className={`preset-chip ${format === "THERMAL" ? "active" : ""}`}
                onClick={() => setFormat("THERMAL")}
                style={{ padding: "4px 10px", fontSize: "12px" }}
              >
                🧾 80mm Thermal
              </button>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePrint}
              style={{ fontWeight: 700 }}
            >
              🖨️ Print / Save PDF
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              style={{ padding: "8px 12px" }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Live Document Preview Frame */}
        <div style={{ flex: 1, overflow: "hidden", borderRadius: "8px", border: "1px solid #D1D5DB", background: "#F3F4F6" }}>
          <iframe
            title="Invoice Preview"
            srcDoc={html}
            style={{ width: "100%", height: "100%", border: "none", background: "#FFFFFF" }}
          />
        </div>
      </div>
    </div>
  );
}
