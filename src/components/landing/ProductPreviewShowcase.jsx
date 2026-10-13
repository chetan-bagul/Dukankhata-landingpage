import { useState } from "react";

export default function ProductPreviewShowcase() {
  const [activeTab, setActiveTab] = useState("pos"); // 'pos' | 'closing' | 'udhar'

  // POS State
  const [cart, setCart] = useState([
    { id: 1, name: "Basmati Rice 5kg", price: 340, qty: 1, gst: 5 },
    { id: 2, name: "Fortune Mustard Oil 1L", price: 165, qty: 2, gst: 5 },
    { id: 3, name: "Tata Salt 1kg", price: 28, qty: 3, gst: 0 },
  ]);

  const updateCartQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = Math.max(0, item.qty + delta);
            return { ...item, qty: newQty };
          }
          return item;
        })
        .filter((item) => item.qty > 0)
    );
  };

  const posSubtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const posTax = Math.round(
    cart.reduce((acc, item) => acc + (item.price * item.qty * item.gst) / 100, 0)
  );
  const posTotal = posSubtotal + posTax;
  const [payMode, setPayMode] = useState("CASH");

  return (
    <section id="preview" className="landing-section" aria-labelledby="preview-heading">
      <div className="section-header">
        <span className="eyebrow">INTERACTIVE PRODUCT PREVIEW</span>
        <h2 id="preview-heading">Experience the Clean, Fast SaaS Interface</h2>
        <p>
          Test-drive the actual responsive workflows built specifically for retail counters. No bloated menus, no clutter.
        </p>
      </div>

      <div className="preview-container">
        {/* Top Control Bar */}
        <div className="preview-header-bar">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#4ade80" }}></span>
            <strong style={{ fontSize: "14px", letterSpacing: "0.02em" }}>DukanKhata™ Terminal</strong>
          </div>

          <div className="preview-tab-controls" role="tablist">
            <button
              className={`preview-tab-btn ${activeTab === "pos" ? "active" : ""}`}
              onClick={() => setActiveTab("pos")}
              role="tab"
              aria-selected={activeTab === "pos"}
            >
              🛒 POS Billing Register
            </button>
            <button
              className={`preview-tab-btn ${activeTab === "closing" ? "active" : ""}`}
              onClick={() => setActiveTab("closing")}
              role="tab"
              aria-selected={activeTab === "closing"}
            >
              ☕ 30-Sec Daily Closing
            </button>
            <button
              className={`preview-tab-btn ${activeTab === "udhar" ? "active" : ""}`}
              onClick={() => setActiveTab("udhar")}
              role="tab"
              aria-selected={activeTab === "udhar"}
            >
              📒 Customer Udhar Ledger
            </button>
          </div>
        </div>

        {/* Tab 1: POS Billing */}
        {activeTab === "pos" && (
          <div className="preview-body">
            <div className="mockup-grid">
              {/* Cart Items */}
              <div className="mockup-card">
                <div className="mockup-card-title">
                  <span>Current Cart ({cart.reduce((s, i) => s + i.qty, 0)} items)</span>
                  <span style={{ fontSize: "12px", color: "var(--mute)" }}>Invoice #INV-2026-084</span>
                </div>

                {cart.length === 0 ? (
                  <p className="muted" style={{ padding: "20px 0", textAlign: "center" }}>
                    Cart is empty. Tap + to add items back.
                  </p>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="mockup-row">
                      <div>
                        <strong>{item.name}</strong>
                        <span className="sub">₹{item.price} • GST {item.gst}%</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <button
                            className="btn btn-sm btn-outline"
                            style={{ width: "26px", height: "26px", padding: 0 }}
                            onClick={() => updateCartQty(item.id, -1)}
                          >
                            −
                          </button>
                          <strong style={{ minWidth: "20px", textAlign: "center", fontSize: "13px" }}>{item.qty}</strong>
                          <button
                            className="btn btn-sm btn-outline"
                            style={{ width: "26px", height: "26px", padding: 0 }}
                            onClick={() => updateCartQty(item.id, 1)}
                          >
                            +
                          </button>
                        </div>
                        <strong style={{ minWidth: "70px", textAlign: "right", color: "var(--deep)" }}>
                          ₹{(item.price * item.qty).toLocaleString("en-IN")}
                        </strong>
                      </div>
                    </div>
                  ))
                )}

                {cart.length < 3 && (
                  <button
                    className="btn btn-sm btn-tonal"
                    style={{ marginTop: "16px" }}
                    onClick={() =>
                      setCart([
                        { id: 1, name: "Basmati Rice 5kg", price: 340, qty: 1, gst: 5 },
                        { id: 2, name: "Fortune Mustard Oil 1L", price: 165, qty: 2, gst: 5 },
                        { id: 3, name: "Tata Salt 1kg", price: 28, qty: 3, gst: 0 },
                      ])
                    }
                  >
                    + Reset Demo Items
                  </button>
                )}
              </div>

              {/* Checkout & Split Payment Preview */}
              <div className="mockup-card">
                <div className="mockup-card-title">
                  <span>Payment Settlement</span>
                  <span className="mockup-badge paid">Split Enabled</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", margin: "16px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "var(--mute)" }}>
                    <span>Items Subtotal</span>
                    <span>₹{posSubtotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "var(--mute)" }}>
                    <span>Calculated GST (CGST + SGST)</span>
                    <span>₹{posTax.toLocaleString("en-IN")}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "18px",
                      fontWeight: 800,
                      color: "var(--deep)",
                      paddingTop: "12px",
                      borderTop: "1px solid var(--line)",
                    }}
                  >
                    <span>Authoritative Total</span>
                    <span>₹{posTotal.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <div className="pos-payment-grid" style={{ margin: "16px 0" }}>
                  <button
                    type="button"
                    className={`pos-pay-btn cash ${payMode === "CASH" ? "active" : ""}`}
                    onClick={() => setPayMode("CASH")}
                  >
                    💵 Cash
                  </button>
                  <button
                    type="button"
                    className={`pos-pay-btn upi ${payMode === "UPI" ? "active" : ""}`}
                    onClick={() => setPayMode("UPI")}
                  >
                    ⚡ UPI
                  </button>
                  <button
                    type="button"
                    className={`pos-pay-btn udhar ${payMode === "UDHAR" ? "active" : ""}`}
                    onClick={() => setPayMode("UDHAR")}
                  >
                    📒 Udhar
                  </button>
                  <button
                    type="button"
                    className={`pos-pay-btn split ${payMode === "SPLIT" ? "active" : ""}`}
                    onClick={() => setPayMode("SPLIT")}
                  >
                    🔀 Split
                  </button>
                </div>

                <button className="btn btn-primary btn-lg" style={{ width: "100%", marginTop: "4px", fontWeight: 800 }}>
                  Complete Sale &amp; Print Bill (F9)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Daily Closing */}
        {activeTab === "closing" && (
          <div className="preview-body">
            <div className="mockup-grid">
              <div className="mockup-card">
                <div className="mockup-card-title">
                  <span>Menu Sales Tally (Tea &amp; Snacks)</span>
                  <span className="mockup-badge paid">Live Tally</span>
                </div>
                <div className="mockup-row">
                  <div>
                    <strong>Special Masala Chai</strong>
                    <span className="sub">₹15 each • 120 cups</span>
                  </div>
                  <strong>₹1,800</strong>
                </div>
                <div className="mockup-row">
                  <div>
                    <strong>Samosa / Bun Maska</strong>
                    <span className="sub">₹25 each • 45 pieces</span>
                  </div>
                  <strong>₹1,125</strong>
                </div>
                <div className="mockup-row">
                  <div>
                    <strong>Filter Coffee</strong>
                    <span className="sub">₹20 each • 30 cups</span>
                  </div>
                  <strong>₹600</strong>
                </div>
                <div style={{ marginTop: "14px", display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                  <span>Expected Gross Sales:</span>
                  <span style={{ color: "var(--brand)" }}>₹3,525</span>
                </div>
              </div>

              <div className="mockup-card">
                <div className="mockup-card-title">
                  <span>Reconciliation &amp; Expense Summary</span>
                  <span className="mockup-badge phonepe">PhonePe Verified</span>
                </div>
                <div className="mockup-row">
                  <span>💵 Cash in Hand</span>
                  <strong style={{ color: "var(--cash)" }}>₹2,200</strong>
                </div>
                <div className="mockup-row">
                  <span>⚡ UPI Verified Collections</span>
                  <strong style={{ color: "var(--purple)" }}>₹1,325</strong>
                </div>
                <div className="mockup-row">
                  <span>🧾 Day Expenses (Milk &amp; Sugar)</span>
                  <strong style={{ color: "var(--bad)" }}>- ₹950</strong>
                </div>
                <div
                  style={{
                    background: "var(--tint)",
                    padding: "14px",
                    borderRadius: "10px",
                    marginTop: "16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontWeight: 700, color: "var(--deep)" }}>Locked Net Profit:</span>
                  <strong style={{ fontSize: "20px", color: "var(--cash)" }}>₹2,575</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Customer Udhar Ledger */}
        {activeTab === "udhar" && (
          <div className="preview-body">
            <div className="mockup-grid">
              <div className="mockup-card">
                <div className="mockup-card-title">
                  <span>Customer Profile: Ramesh Sharma</span>
                  <span className="mockup-badge udhar">Outstanding Udhar</span>
                </div>
                <div style={{ marginBottom: "16px", fontSize: "13px", color: "var(--mute)" }}>
                  Mobile: <strong>+91 98765 43210</strong> • Credit Limit: ₹5,000
                </div>
                <div className="mockup-row">
                  <div>
                    <strong>Grocery Purchase #1042</strong>
                    <span className="sub">Today, 10:15 AM • Credit Purchase</span>
                  </div>
                  <strong style={{ color: "var(--orange)" }}>+ ₹850</strong>
                </div>
                <div className="mockup-row">
                  <div>
                    <strong>UPI Repayment Received</strong>
                    <span className="sub">Yesterday, 6:30 PM • Ref #9283</span>
                  </div>
                  <strong style={{ color: "var(--cash)" }}>- ₹1,000</strong>
                </div>
                <div className="mockup-row">
                  <div>
                    <strong>Monthly Ration Pack</strong>
                    <span className="sub">01 Oct 2026 • Credit Purchase</span>
                  </div>
                  <strong style={{ color: "var(--orange)" }}>+ ₹2,400</strong>
                </div>
              </div>

              <div className="mockup-card">
                <div className="mockup-card-title">
                  <span>Ledger Summary &amp; Reminder</span>
                </div>
                <div
                  style={{
                    padding: "16px",
                    background: "var(--orange-tint)",
                    borderRadius: "12px",
                    border: "1px solid rgba(245, 124, 0, 0.2)",
                    marginBottom: "16px",
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--orange)", display: "block" }}>
                    TOTAL OUTSTANDING DUE
                  </span>
                  <strong style={{ fontSize: "28px", color: "#b25900", fontFamily: "Plus Jakarta Sans" }}>
                    ₹2,250
                  </strong>
                </div>
                <button className="btn btn-outline" style={{ width: "100%", marginBottom: "10px", borderColor: "#25D366", color: "#128C7E" }}>
                  💬 Send WhatsApp Bill &amp; Payment Link
                </button>
                <button className="btn btn-primary" style={{ width: "100%" }}>
                  Record Cash / UPI Repayment
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
