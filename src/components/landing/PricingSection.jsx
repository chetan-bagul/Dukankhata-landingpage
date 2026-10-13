import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getPlans } from "../../api/subscriptionApi";

const DEFAULT_SMALL_PLANS = [
  {
    code: "SMALL_MONTHLY",
    name: "Small Shop Monthly",
    amount: "150",
    durationDays: 30,
    badge: "Most Popular for Small Shops",
    desc: "Single counter shops, tea stalls & local kirana stores starting digital closing.",
    features: [
      "⚡ 30-Sec Fast Daily Shop Closing",
      "💵 Cash Drawer vs PhonePe/GPay Reconciliation",
      "📉 Store Operating Expense & Cash Outflow Log",
      "📒 Customer Udhar Khata Ledger (Optional)",
      "💬 1-Click WhatsApp Payment Reminders",
      "📄 Clean Executive Daily P&L Audit PDF",
      "☁️ Automatic Daily Cloud Backup",
    ],
    highlight: false,
  },
  {
    code: "SMALL_YEARLY",
    name: "Small Shop Yearly",
    amount: "1500",
    durationDays: 365,
    badge: "Save ₹300 (2 Months Free)",
    desc: "Year-round effortless closing & ledger accounting for busy retail shops (₹125/month).",
    features: [
      "⚡ Everything in Small Shop Monthly Included",
      "💰 Save 17% Over Monthly Billing (2 Months Free)",
      "📈 Monthly P&L Financial Trend Reports",
      "📱 Multi-Device Tablet & Mobile App Sync",
      "📑 Custom Shop Logo & QR Code on Audit Reports",
      "🛡️ Priority WhatsApp & VIP Phone Support",
    ],
    highlight: true,
  },
];

const DEFAULT_LARGE_PLANS = [
  {
    code: "LARGE_MONTHLY",
    name: "Large Shop Monthly",
    amount: "299",
    durationDays: 30,
    badge: "Best for Retail Counters",
    desc: "Full-speed barcode billing for marts, apparel, electronics & groceries.",
    features: [
      "⚡ High-Speed Barcode Scanning & POS Billing",
      "🧾 GST Rule 46 Tax Invoices + 80mm/58mm Thermal Prints",
      "📦 Real-Time SKU Inventory & Low-Stock Alerts",
      "🔄 Customer Sales Returns & Credit Note Handling",
      "🚚 Supplier Purchases & Vendor Inward Entry",
      "👥 Multi-Counter Cashier Logins & Shifts",
      "💼 Staff Commission Tracking (Optional)",
    ],
    highlight: false,
  },
  {
    code: "LARGE_YEARLY",
    name: "Large Shop Yearly",
    amount: "2999",
    durationDays: 365,
    badge: "Save ₹589 (2 Months Free)",
    desc: "Unlimited retail power for supermarkets, departmental stores & distributors.",
    features: [
      "🛒 Everything in Large Shop Monthly Included",
      "💰 2 Months Free with Annual Billing",
      "🏢 Unlimited Cashier Counters & Staff Logins",
      "📊 Advanced Financial Analytics & GSTR-1 Summaries",
      "🏷️ Barcode Generation & Product Label Printing",
      "🛡️ Anti-Theft Void Monitoring & Audit Security Trail",
      "📞 Dedicated 24/7 Account Manager & Priority Line",
    ],
    highlight: true,
  },
];

export default function PricingSection() {
  const { user } = useAuth();
  const userMode = user?.operatingMode === "LARGE" ? "LARGE" : user?.operatingMode === "SMALL" ? "SMALL" : null;

  // If user is authenticated, strictly lock to their mode. For anonymous visitors, default to "SMALL".
  const [visitorMode, setVisitorMode] = useState("SMALL");
  const activeMode = userMode || visitorMode;

  const [apiPlans, setApiPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch live realtime plans from backend API
  useEffect(() => {
    let isMounted = true;
    getPlans()
      .then((res) => {
        if (!isMounted) return;
        const raw = Array.isArray(res)
          ? res
          : Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res?.data?.data)
              ? res.data.data
              : [];
        if (raw.length > 0) {
          setApiPlans(raw);
        }
      })
      .catch(() => {
        // Fallback amounts remain active
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Merge live backend plan amounts
  const smallPlans = DEFAULT_SMALL_PLANS.map((fallback) => {
    const fromBackend = apiPlans.find((p) => p.code === fallback.code);
    return {
      ...fallback,
      name: fromBackend?.name || fallback.name,
      amount: fromBackend?.amount != null ? String(fromBackend.amount) : fallback.amount,
      durationDays: fromBackend?.durationDays || fallback.durationDays,
    };
  });

  const largePlans = DEFAULT_LARGE_PLANS.map((fallback) => {
    const fromBackend = apiPlans.find((p) => p.code === fallback.code);
    return {
      ...fallback,
      name: fromBackend?.name || fallback.name,
      amount: fromBackend?.amount != null ? String(fromBackend.amount) : fallback.amount,
      durationDays: fromBackend?.durationDays || fallback.durationDays,
    };
  });

  const activePlans = activeMode === "SMALL" ? smallPlans : largePlans;

  return (
    <section id="pricing" className="pricing-wrapper" aria-labelledby="pricing-heading">
      <div className="landing-section">
        <div className="section-header">
          <span className="eyebrow">
            {userMode
              ? userMode === "SMALL"
                ? "☕ YOUR SMALL SHOP PLAN"
                : "🛒 YOUR LARGE SHOP POS PLAN"
              : "TRANSPARENT PRICING"}
          </span>
          <h2 id="pricing-heading">
            {userMode
              ? userMode === "SMALL"
                ? "Small Shop Subscription Plans"
                : "Large Shop POS Subscription Plans"
              : "Separated Plans for Both Shop Modes"}
          </h2>
          <p>
            Start with our 30-day full-access free trial. Live authoritative pricing fetched directly from our billing server.
          </p>
        </div>

        {/* Operating Mode Selector Tabs: Only shown for visitors who aren't logged in */}
        {!userMode && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "12px",
              marginBottom: "24px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className={`preset-chip ${activeMode === "SMALL" ? "active" : ""}`}
              style={{
                padding: "10px 24px",
                fontSize: "14.5px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                borderRadius: "30px",
                cursor: "pointer",
              }}
              onClick={() => setVisitorMode("SMALL")}
            >
              <span>☕</span>
              <span>Small Shop Mode Plans</span>
            </button>
            <button
              type="button"
              className={`preset-chip ${activeMode === "LARGE" ? "active" : ""}`}
              style={{
                padding: "10px 24px",
                fontSize: "14.5px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                borderRadius: "30px",
                cursor: "pointer",
              }}
              onClick={() => setVisitorMode("LARGE")}
            >
              <span>🛒</span>
              <span>Large Shop POS Plans</span>
            </button>
          </div>
        )}

        {/* Mode Summary Banner */}
        <div
          className="card"
          style={{
            maxWidth: "760px",
            margin: "0 auto 36px",
            padding: "14px 20px",
            textAlign: "center",
            background: activeMode === "SMALL" ? "var(--tint)" : "var(--gold-tint)",
            border:
              activeMode === "SMALL"
                ? "1px solid rgba(15, 61, 47, 0.2)"
                : "1px solid rgba(199, 146, 56, 0.3)",
            color: activeMode === "SMALL" ? "var(--brand)" : "var(--gold-dark)",
            fontSize: "13.5px",
            lineHeight: 1.5,
          }}
        >
          {activeMode === "SMALL" ? (
            <>
              <strong>☕ Small Shop Mode:</strong> Crafted for single-counter stores focusing on
              30-sec daily closing, physical drawer cash vs UPI balancing, operating expenses, and
              optional Udhar khata without barcode hassles.
            </>
          ) : (
            <>
              <strong>🛒 Large Shop POS Mode:</strong> Built for high-volume retail counters,
              supermarkets, and grocery marts needing barcode scanning, real-time SKU inventory,
              GST tax invoices (A4 &amp; thermal), and vendor purchases.
            </>
          )}
        </div>

        {/* Pricing Cards Grid */}
        <div className="pricing-grid">
          {activePlans.map((plan) => {
            const isFeatured = plan.highlight;
            return (
              <div
                key={plan.code}
                className={`pricing-card ${isFeatured ? "featured" : ""}`}
              >
                {isFeatured && <div className="featured-pill">{plan.badge}</div>}

                <h3 className="plan-name">{plan.name}</h3>
                <p className="plan-desc">{plan.desc}</p>

                <div className="plan-price-row">
                  <span className="plan-currency">₹</span>
                  <span className="plan-amount">
                    {Number(plan.amount).toLocaleString("en-IN")}
                  </span>
                  <span className="plan-period">/ {plan.durationDays} days</span>
                </div>

                <div className="plan-features-list">
                  {plan.features.map((feat, i) => (
                    <div key={i} className="plan-feature">
                      <span className="check" aria-hidden="true">
                        ✓
                      </span>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <Link
                  to={user ? "/subscription" : `/signup?mode=${activeMode}`}
                  className={`btn ${isFeatured ? "btn-primary" : "btn-outline"}`}
                  style={{ width: "100%", marginTop: "auto" }}
                >
                  {user ? "View & Renew Plan" : "Start 30-Day Free Trial"}
                </Link>
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: "36px",
            textAlign: "center",
            fontSize: "13px",
            color: "var(--mute)",
            display: "flex",
            justifyContent: "center",
            gap: "24px",
            flexWrap: "wrap",
          }}
        >
          <span>🔒 100% Secure Razorpay Checkout</span>
          <span>⚡ Live Realtime Pricing from Server</span>
          <span>💳 Cancel Anytime with Full Data Export</span>
        </div>
      </div>
    </section>
  );
}
