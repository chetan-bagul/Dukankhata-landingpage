import { useState } from "react";
import { Link } from "react-router-dom";

export default function HeroSection() {
  // Interactive mini-simulator for realistic shop closing preview
  const [salesQty, setSalesQty] = useState(14);
  const unitPrice = 60;
  const expectedSales = salesQty * unitPrice;
  const cashCollected = Math.round(expectedSales * 0.65);
  const upiCollected = Math.round(expectedSales * 0.35);
  const totalCollected = cashCollected + upiCollected;
  const expenses = 240;
  const netProfit = totalCollected - expenses;

  return (
    <section className="hero-wrapper" aria-labelledby="hero-heading">
      <div className="hero-container">
        {/* Left Column: Value Proposition */}
        <div className="hero-content">
          <div className="hero-badge-row">
            <span className="eyebrow">RETAIL MANAGEMENT SAAS</span>
            <span className="hero-trust-chip">
              <span className="dot" aria-hidden="true"></span>
              100% GST &amp; Udhar Compliant
            </span>
          </div>

          <h1 id="hero-heading" className="hero-title">
            Your Entire Shop, <br />
            <span className="highlight">Under Control.</span>
          </h1>

          <p className="hero-subtitle">
            The all-in-one retail operating system for Indian merchants. Perform lightning-fast <strong>30-second daily closings</strong>, process <strong>high-speed POS billing</strong>, manage <strong>inventory &amp; purchases</strong>, maintain <strong>customer Udhar ledgers</strong>, and access audit-grade financial reports.
          </p>

          <div className="hero-cta-group">
            <Link className="btn btn-primary btn-lg" to="/signup">
              Start Free 30-Day Trial
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </Link>
            <a className="btn btn-outline btn-lg" href="#preview">
              Explore Live Demo
            </a>
          </div>

          <div className="hero-guarantee">
            <span>✓ No Credit Card Required</span>
            <span>✓ 2-Minute Setup</span>
            <span>✓ Works on Mobile &amp; PC</span>
          </div>
        </div>

        {/* Right Column: Live Interactive Daily Closing Snapshot Preview */}
        <div className="hero-snapshot-card" aria-label="Interactive Closing Preview">
          <div className="snapshot-header">
            <div>
              <span className="snapshot-mode-badge">SMALL SHOP MODE</span>
              <h3 style={{ fontSize: "18px", marginTop: "4px", color: "var(--deep)" }}>
                30-Second Daily Reconciliation
              </h3>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "11px", color: "var(--mute)", display: "block" }}>BUSINESS DATE</span>
              <strong style={{ fontSize: "13px", color: "var(--brand)" }}>Today's Closing</strong>
            </div>
          </div>

          <div style={{ marginBottom: "14px", fontSize: "13px", color: "var(--ink-secondary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Adjust simulated item sales:</span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                className="btn btn-sm btn-outline"
                style={{ width: "32px", height: "32px", padding: 0, fontSize: "16px" }}
                onClick={() => setSalesQty(Math.max(1, salesQty - 1))}
                aria-label="Decrease items"
              >
                −
              </button>
              <strong style={{ minWidth: "28px", textAlign: "center", fontSize: "15px" }}>{salesQty}</strong>
              <button
                className="btn btn-sm btn-outline"
                style={{ width: "32px", height: "32px", padding: 0, fontSize: "16px" }}
                onClick={() => setSalesQty(salesQty + 1)}
                aria-label="Increase items"
              >
                +
              </button>
            </div>
          </div>

          <div className="snapshot-metric-grid">
            <div className="snapshot-metric">
              <span>Expected Sales ({salesQty} × ₹{unitPrice})</span>
              <strong>₹{expectedSales.toLocaleString("en-IN")}</strong>
            </div>
            <div className="snapshot-metric">
              <span>Cash + UPI Collections</span>
              <strong style={{ color: "var(--cash)" }}>₹{totalCollected.toLocaleString("en-IN")}</strong>
            </div>
          </div>

          <div className="snapshot-metric-grid">
            <div className="snapshot-metric">
              <span>Recorded Expenses</span>
              <strong style={{ color: "var(--bad)" }}>₹{expenses.toLocaleString("en-IN")}</strong>
            </div>
            <div className="snapshot-metric">
              <span>Reconciliation Variance</span>
              <strong style={{ color: totalCollected - expectedSales >= 0 ? "var(--cash)" : "var(--bad)" }}>
                {totalCollected - expectedSales >= 0 ? "+₹0.00" : "-₹" + Math.abs(totalCollected - expectedSales)}
              </strong>
            </div>
          </div>

          <div className="snapshot-profit-banner">
            <div>
              <span className="label">Today's Autorun Net Profit</span>
              <div style={{ fontSize: "12px", color: "#c8ddd4" }}>Collected minus direct expenses</div>
            </div>
            <span className="val">₹{netProfit.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
