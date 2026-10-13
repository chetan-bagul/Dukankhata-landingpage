import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getCurrentSubscription,
  getPlans,
  createSubscriptionOrder,
  verifySubscriptionPayment,
} from "../../api/subscriptionApi";
import { getApiErrorMessage } from "../../api/apiError";

function formatMoney(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function loadRazorpaySdk() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Unable to load Razorpay Checkout SDK."));
    document.body.appendChild(script);
  });
}

const MODE_PLAN_METADATA = {
  SMALL_MONTHLY: {
    mode: "SMALL",
    displayName: "Small Shop Monthly",
    desc: "Single counter shops, tea stalls & local kirana stores starting digital closing.",
    badge: "Most Popular for Small Shops",
    features: [
      "⚡ 30-Sec Fast Daily Shop Closing",
      "💵 Cash Drawer vs PhonePe/GPay Reconciliation & Variance Alert",
      "📉 Store Operating Expense & Daily Cash Outflow Log",
      "📒 Digital Customer Udhar Khata (Optional Ledger)",
      "💬 1-Click WhatsApp Payment Reminder Links",
      "📄 Clean Executive Daily P&L Audit PDF",
      "☁️ Automatic Daily Cloud Backup",
    ],
  },
  SMALL_YEARLY: {
    mode: "SMALL",
    displayName: "Small Shop Yearly",
    desc: "Year-round effortless closing & ledger accounting for busy retail shops (₹125/month).",
    badge: "Save ₹300 (2 Months Free)",
    features: [
      "⚡ Everything in Small Shop Monthly Included",
      "💰 Save 17% Over Monthly Billing (2 Months Free)",
      "📈 Monthly P&L Financial Trend Reports",
      "📱 Multi-Device Tablet & Mobile App Sync",
      "📑 Custom Shop Logo & QR Code on Audit Reports",
      "🛡️ Priority WhatsApp & VIP Phone Support",
    ],
  },
  LARGE_MONTHLY: {
    mode: "LARGE",
    displayName: "Large Shop Monthly",
    desc: "Full-speed barcode billing for marts, apparel, supermarkets & wholesale outlets.",
    badge: "Best for Retail Counters",
    features: [
      "⚡ High-Speed Barcode Scanning & POS Billing",
      "🧾 GST Rule 46 Tax Invoices + 80mm/58mm Thermal Prints",
      "📦 Real-Time SKU Inventory & Low-Stock Alerts",
      "🔄 Customer Sales Returns & Credit Note Handling",
      "🚚 Supplier Purchases & Vendor Inward Entry",
      "👥 Multi-Counter Cashier Logins & Shifts",
      "💼 Staff Commission Tracking (Optional)",
    ],
  },
  LARGE_YEARLY: {
    mode: "LARGE",
    displayName: "Large Shop Yearly",
    desc: "Unlimited retail operations for supermarkets, departmental chains & wholesalers.",
    badge: "Save ₹589 (2 Months Free)",
    features: [
      "🛒 Everything in Large Shop Monthly Included",
      "💰 2 Months Free with Annual Billing",
      "🏢 Unlimited Cashier Counters & Staff Logins",
      "📊 Advanced Financial Analytics & GSTR-1 Summaries",
      "🏷️ Barcode Generation & Product Label Printing",
      "🛡️ Anti-Theft Void Monitoring & Security Audit Trail",
      "📞 Dedicated 24/7 Account Manager & Priority Line",
    ],
  },
};

const DEFAULT_PLANS = [
  { code: "SMALL_MONTHLY", name: "Small Shop Monthly", amount: 150, durationDays: 30 },
  { code: "SMALL_YEARLY", name: "Small Shop Yearly", amount: 1500, durationDays: 365 },
  { code: "LARGE_MONTHLY", name: "Large Shop Monthly", amount: 299, durationDays: 30 },
  { code: "LARGE_YEARLY", name: "Large Shop Yearly", amount: 2999, durationDays: 365 },
];

export default function SubscriptionPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER" || user?.role === "ADMIN";

  // Strict operating mode: Small shops only see small shop plans, large shops only see large shop plans
  const shopMode = user?.operatingMode === "LARGE" ? "LARGE" : "SMALL";

  // Data states
  const [plans, setPlans] = useState([]);
  const [currentSub, setCurrentSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  const [checkoutStep, setCheckoutStep] = useState("IDLE"); // 'IDLE' | 'ORDER_CREATING' | 'PAYING' | 'VERIFYING' | 'SUCCESS'
  const [verifiedResult, setVerifiedResult] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Load live plans & current subscription status from backend API
  async function loadSubscriptionData() {
    setLoading(true);
    setError("");
    try {
      const [plansRes, currentRes] = await Promise.allSettled([
        getPlans(),
        getCurrentSubscription(),
      ]);

      if (plansRes.status === "fulfilled") {
        const resVal = plansRes.value;
        const rawPlans = Array.isArray(resVal)
          ? resVal
          : Array.isArray(resVal?.data)
          ? resVal.data
          : Array.isArray(resVal?.data?.data)
          ? resVal.data.data
          : [];

        if (rawPlans.length > 0) {
          setPlans(rawPlans);
        } else {
          setPlans(DEFAULT_PLANS);
        }
      } else {
        setPlans(DEFAULT_PLANS);
      }

      if (currentRes.status === "fulfilled") {
        const rawCurrent = currentRes.value.data?.data || currentRes.value.data;
        setCurrentSub(rawCurrent || null);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load subscription details."));
      setPlans(DEFAULT_PLANS);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  // Initiate Plan Purchase
  async function handleSelectPlan(plan) {
    if (!isOwner) {
      setError("Only store owners are authorized to initiate subscription billing.");
      return;
    }

    setCheckoutPlan(plan);
    setCheckoutStep("ORDER_CREATING");
    setError("");
    setMessage("");

    try {
      // 1. Create server-side order with authoritative plan code
      const orderRes = await createSubscriptionOrder(plan.code);
      const orderData = orderRes.data?.data || orderRes.data;

      if (!orderData?.orderId) {
        throw new Error("Invalid order response from server.");
      }

      // 2. Load Razorpay SDK
      setCheckoutStep("PAYING");
      await loadRazorpaySdk();

      // 3. Open Razorpay Checkout
      const options = {
        key: orderData.keyId,
        amount: Math.round(Number(orderData.amount) * 100),
        currency: orderData.currency || "INR",
        order_id: orderData.orderId,
        name: "DukanKhata™",
        description: `${orderData.planName || plan.name} Subscription (${plan.durationDays} Days)`,
        prefill: {
          name: user?.name || "",
          contact: user?.mobile || "",
        },
        theme: {
          color: "#0F3D2F",
        },
        handler: async (response) => {
          setCheckoutStep("VERIFYING");
          try {
            const verifyPayload = {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            };

            const verifyRes = await verifySubscriptionPayment(verifyPayload);
            const verifiedSub = verifyRes.data?.data || verifyRes.data;

            setCurrentSub(verifiedSub);
            setVerifiedResult(response);
            setCheckoutStep("SUCCESS");
            setMessage("✓ Payment verified by banking server. Your DukanKhata™ subscription is active!");
            await loadSubscriptionData();
          } catch (vErr) {
            setError(
              getApiErrorMessage(
                vErr,
                "Payment received, but cryptographic backend verification failed. Please contact support."
              )
            );
            setCheckoutStep("IDLE");
          }
        },
        modal: {
          ondismiss: () => {
            setCheckoutStep("IDLE");
            setMessage("Checkout was cancelled. No charges were deducted.");
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp) => {
        setCheckoutStep("IDLE");
        setError(`Payment failed: ${resp.error.description || "Card/UPI transaction declined."}`);
      });
      rzp.open();
    } catch (err) {
      setCheckoutStep("IDLE");
      setError(getApiErrorMessage(err, "Unable to initialize Razorpay checkout."));
    }
  }

  // Calculate days remaining
  const daysRemaining = currentSub?.endsAt
    ? Math.max(
        0,
        Math.ceil((new Date(currentSub.endsAt) - new Date()) / (1000 * 60 * 60 * 24))
      )
    : null;

  // STRICT MODE FILTERING:
  // Small shop users ONLY see small shop plans (SMALL_MONTHLY, SMALL_YEARLY)
  // Large shop users ONLY see large shop plans (LARGE_MONTHLY, LARGE_YEARLY)
  const availablePlans = (plans.length > 0 ? plans : DEFAULT_PLANS).filter((p) => {
    const meta = MODE_PLAN_METADATA[p.code];
    if (meta) {
      return meta.mode === shopMode;
    }
    return shopMode === "SMALL" ? p.code?.includes("SMALL") : p.code?.includes("LARGE");
  });

  return (
    <div className="subscription-page-root">
      {/* Top Header Card */}
      <div className="closing-header-card">
        <div>
          <div className="eyebrow" style={{ marginBottom: "6px" }}>
            {shopMode === "SMALL" ? "☕ SMALL SHOP BILLING" : "🛒 LARGE SHOP POS BILLING"}
          </div>
          <h1 style={{ fontSize: "24px", color: "var(--deep)" }}>
            {shopMode === "SMALL"
              ? "Small Shop Subscription Plans"
              : "Large Shop POS Subscription Plans"}
          </h1>
          <p className="muted" style={{ fontSize: "13.5px" }}>
            Authoritative realtime pricing fetched directly from the billing backend.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            className="btn btn-outline"
            onClick={loadSubscriptionData}
            disabled={loading}
          >
            🔄 Refresh Status
          </button>
          <Link className="btn btn-tonal" to="/dashboard">
            📊 Back to Dashboard
          </Link>
        </div>
      </div>

      {error && <div className="alert-banner error" style={{ marginBottom: "16px" }}>{error}</div>}
      {message && <div className="alert-banner info" style={{ marginBottom: "16px" }}>{message}</div>}

      {/* Verification / Progress Indicator */}
      {checkoutStep === "ORDER_CREATING" && (
        <div className="alert-banner info" style={{ marginBottom: "20px" }}>
          <div className="loading" style={{ minHeight: "24px" }}>
            Creating secure Razorpay order on server...
          </div>
        </div>
      )}

      {checkoutStep === "VERIFYING" && (
        <div className="alert-banner info" style={{ marginBottom: "20px" }}>
          <div className="loading" style={{ minHeight: "24px" }}>
            🔒 Verifying payment signature with banking server... Please do not refresh.
          </div>
        </div>
      )}

      {checkoutStep === "SUCCESS" && (
        <div
          className="alert-banner"
          style={{
            background: "var(--tint)",
            color: "var(--brand)",
            marginBottom: "20px",
            border: "1px solid rgba(15, 61, 47, 0.2)",
          }}
        >
          <div>
            <strong style={{ fontSize: "15px", display: "block" }}>
              🎉 Subscription Verified &amp; Activated!
            </strong>
            <span style={{ fontSize: "13px" }}>
              Payment Reference: <code>{verifiedResult?.razorpay_payment_id}</code> • Order:{" "}
              <code>{verifiedResult?.razorpay_order_id}</code>
            </span>
          </div>
        </div>
      )}

      {/* Current Subscription Status Card */}
      {currentSub && (
        <div
          className="card"
          style={{
            padding: "24px",
            marginBottom: "24px",
            borderLeft: "4px solid var(--brand)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: "14px",
            }}
          >
            <div>
              <div className="eyebrow" style={{ marginBottom: "4px" }}>
                CURRENT PLAN TIER
              </div>
              <h2 style={{ fontSize: "20px", color: "var(--deep)", margin: "0 0 6px" }}>
                {currentSub.planName || currentSub.name || "DukanKhata Active Plan"}
              </h2>
              <div
                style={{
                  display: "flex",
                  gap: "16px",
                  flexWrap: "wrap",
                  fontSize: "13px",
                  color: "var(--mute)",
                }}
              >
                <span>
                  Status:{" "}
                  <strong
                    style={{
                      color: currentSub.status === "ACTIVE" ? "var(--cash)" : "var(--orange)",
                    }}
                  >
                    {currentSub.status || "ACTIVE"}
                  </strong>
                </span>
                {currentSub.endsAt && (
                  <span>
                    Valid Until:{" "}
                    <strong>{new Date(currentSub.endsAt).toLocaleDateString()}</strong>
                    {daysRemaining !== null && ` (${daysRemaining} days remaining)`}
                  </span>
                )}
              </div>
            </div>

            <span
              className="badge"
              style={{
                background: currentSub.status === "ACTIVE" ? "var(--tint)" : "var(--gold-tint)",
                color: currentSub.status === "ACTIVE" ? "var(--brand)" : "var(--gold-dark)",
                padding: "8px 16px",
                borderRadius: "20px",
                fontWeight: 800,
                fontSize: "13px",
              }}
            >
              {currentSub.status === "ACTIVE" ? "✓ ACTIVE SUBSCRIBER" : "⏳ 30-DAY TRIAL"}
            </span>
          </div>
        </div>
      )}

      {/* Mode-Specific Explanatory Banner */}
      <div
        className="card"
        style={{
          padding: "16px 20px",
          marginBottom: "24px",
          background: shopMode === "SMALL" ? "var(--tint)" : "var(--gold-tint)",
          border:
            shopMode === "SMALL"
              ? "1px solid rgba(15, 61, 47, 0.2)"
              : "1px solid rgba(199, 146, 56, 0.3)",
          color: shopMode === "SMALL" ? "var(--brand)" : "var(--gold-dark)",
          fontSize: "13.5px",
          lineHeight: 1.5,
        }}
      >
        {shopMode === "SMALL" ? (
          <div>
            <strong>☕ Small Shop Mode Active:</strong> Your shop is operating in Small Shop Mode.
            The plans below are exclusively tailored for single-counter stores focusing on 30-sec
            daily closing, physical drawer cash vs UPI balancing, expense tracking, and optional
            customer Udhar khata without barcode hassles.
          </div>
        ) : (
          <div>
            <strong>🛒 Large Shop POS Mode Active:</strong> Your shop is operating in Large Shop POS
            Mode. The plans below provide unlimited access to high-speed barcode checkout,
            real-time SKU inventory tracking, GST Rule 46 tax invoices (A4 &amp; thermal), and
            multi-counter cashiers.
          </div>
        )}
      </div>

      {/* Mode-Filtered Plans Grid */}
      <div style={{ marginBottom: "20px" }}>
        <div className="eyebrow" style={{ marginBottom: "6px" }}>
          {shopMode === "SMALL" ? "AVAILABLE SMALL SHOP PLANS" : "AVAILABLE LARGE POS PLANS"}
        </div>
        <h2 style={{ fontSize: "20px", color: "var(--deep)", margin: "0 0 16px" }}>
          Choose or Extend Your Subscription
        </h2>

        {loading ? (
          <div className="card" style={{ padding: "48px", textAlign: "center" }}>
            <div className="loading" style={{ minHeight: "80px" }}>
              Loading realtime plans from billing server...
            </div>
          </div>
        ) : availablePlans.length === 0 ? (
          <div className="card" style={{ padding: "40px", textAlign: "center" }}>
            <p className="muted">No plans available for this operating mode.</p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "24px",
            }}
          >
            {availablePlans.map((p) => {
              const meta = MODE_PLAN_METADATA[p.code] || {};
              const planName = p.name || meta.displayName || "Store Plan";
              const planDesc = meta.desc || "Complete operating store plan.";
              const isCurrent =
                currentSub?.planCode === p.code || currentSub?.planName === p.name;

              return (
                <div
                  key={p.code}
                  className="card"
                  style={{
                    padding: "26px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    border: isCurrent
                      ? "2.5px solid var(--brand)"
                      : "1px solid var(--line)",
                    position: "relative",
                    boxShadow: isCurrent ? "var(--shadow-md)" : "var(--shadow-sm)",
                  }}
                >
                  {isCurrent && (
                    <div
                      style={{
                        position: "absolute",
                        top: "14px",
                        right: "14px",
                        background: "var(--brand)",
                        color: "#FFFFFF",
                        fontSize: "11px",
                        fontWeight: 800,
                        padding: "3px 10px",
                        borderRadius: "12px",
                      }}
                    >
                      CURRENT PLAN
                    </div>
                  )}

                  {!isCurrent && meta.badge && (
                    <div
                      style={{
                        position: "absolute",
                        top: "14px",
                        right: "14px",
                        background: "var(--gold-tint)",
                        color: "var(--gold-dark)",
                        fontSize: "11px",
                        fontWeight: 800,
                        padding: "3px 10px",
                        borderRadius: "12px",
                        border: "1px solid rgba(199, 146, 56, 0.3)",
                      }}
                    >
                      {meta.badge}
                    </div>
                  )}

                  <div>
                    <span style={{ fontSize: "28px", display: "block", marginBottom: "8px" }}>
                      {shopMode === "SMALL" ? "☕" : "🛒"}
                    </span>
                    <h3
                      style={{
                        fontSize: "19px",
                        color: "var(--deep)",
                        margin: "0 0 6px",
                        fontWeight: 800,
                      }}
                    >
                      {planName}
                    </h3>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: "4px",
                        marginBottom: "12px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "34px",
                          fontWeight: 800,
                          color: "var(--brand)",
                          fontFamily: "Plus Jakarta Sans",
                        }}
                      >
                        {formatMoney(p.amount)}
                      </span>
                      <span className="muted" style={{ fontSize: "13px" }}>
                        / {p.durationDays} days
                      </span>
                    </div>

                    <p
                      className="muted"
                      style={{ fontSize: "13px", lineHeight: 1.5, marginBottom: "16px" }}
                    >
                      {planDesc}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "9px",
                        fontSize: "13px",
                        color: "var(--deep)",
                        marginBottom: "24px",
                        borderTop: "1px solid var(--line)",
                        paddingTop: "16px",
                      }}
                    >
                      {(meta.features || [
                        "✓ Daily Closing & Cash Reconciliation",
                        "✓ Customer Udhar Ledger & WhatsApp Links",
                        "✓ Real-Time Reports & PDF Audits",
                      ]).map((feat, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    {isOwner ? (
                      <button
                        className={`btn ${isCurrent ? "btn-outline" : "btn-primary"}`}
                        style={{ width: "100%", padding: "12px", fontSize: "14px", fontWeight: 700 }}
                        disabled={checkoutStep !== "IDLE"}
                        onClick={() => handleSelectPlan(p)}
                      >
                        {checkoutStep !== "IDLE" && checkoutPlan?.code === p.code
                          ? "Processing Order..."
                          : isCurrent
                          ? "Extend Subscription"
                          : `Choose ${planName}`}
                      </button>
                    ) : (
                      <p className="muted" style={{ fontSize: "12px", textAlign: "center", margin: 0 }}>
                        Only the store owner can renew or activate plans.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Razorpay Trust Notice */}
      <div
        className="card"
        style={{ background: "var(--surface-low)", padding: "18px 22px", marginTop: "16px" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "24px" }}>🔒</span>
          <div>
            <strong style={{ fontSize: "14px", color: "var(--deep)", display: "block" }}>
              100% Secure Payments via Razorpay
            </strong>
            <span className="muted" style={{ fontSize: "12.5px" }}>
              Supports all Indian UPI apps (Google Pay, PhonePe, Paytm), Debit/Credit Cards, and Net
              Banking. Plans are activated immediately upon authoritative server signature validation.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
