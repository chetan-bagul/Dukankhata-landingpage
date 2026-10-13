import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getShopSettings, updateShopSettings } from "../../api/shopApi";
import { getApiErrorMessage } from "../../api/apiError";

export default function ShopSettingsPage() {
  const { user, logout, enableUdhar, enableStaff, updateFeatures } = useAuth();
  const navigate = useNavigate();
  const isOwner = user?.role === "OWNER" || user?.role === "ADMIN";

  // Tab navigation: 'PROFILE' | 'INVOICE_TAX' | 'OPERATING_MODE' | 'ACCOUNT_SECURITY'
  const [activeTab, setActiveTab] = useState("PROFILE");

  // Form State
  const [initialForm, setInitialForm] = useState({
    name: "",
    legalName: "",
    mobile: "",
    email: "",
    gstin: "",
    state: "",
    stateCode: "",
    pincode: "",
    addressLine: "",
    city: "",
    invoiceFooterNote: "Thank you for shopping with us! Please visit again.",
  });

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Load Settings
  async function loadSettings() {
    setLoading(true);
    setError("");
    try {
      const res = await getShopSettings();
      const data = res.data?.data || res.data || {};
      const merged = {
        name: data.name || user?.shopName || "",
        legalName: data.legalName || data.name || "",
        mobile: data.mobile || user?.mobile || "",
        email: data.email || "",
        gstin: (data.gstin || user?.gstin || "").toUpperCase(),
        state: data.state || "",
        stateCode: data.stateCode || "",
        pincode: data.pincode || "",
        addressLine: data.addressLine || data.address || "",
        city: data.city || "",
        invoiceFooterNote:
          data.invoiceFooterNote || "Thank you for shopping with us! Please visit again.",
      };
      setInitialForm(merged);
      setForm(merged);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load shop settings."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  // Track if form has unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(initialForm);
  }, [form, initialForm]);

  // Handle Input Changes
  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
    setMessage("");
  };

  // Save Settings
  async function handleSaveSettings(e) {
    e.preventDefault();
    if (!isOwner) {
      setError("Only store owners are authorized to modify business settings.");
      return;
    }

    if (!form.name.trim()) {
      setError("Shop name is required.");
      return;
    }

    if (form.gstin && form.gstin.length !== 15) {
      setError("GSTIN must be exactly 15 alphanumeric characters (e.g. 29AAAAA0000A1Z5).");
      return;
    }

    if (form.pincode && form.pincode.length !== 6) {
      setError("Postal Pincode must be a 6-digit Indian PIN code.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        ...form,
        gstin: form.gstin ? form.gstin.toUpperCase().trim() : undefined,
      };

      const res = await updateShopSettings(payload);
      const saved = res.data?.data || res.data || payload;

      setInitialForm({ ...form, ...saved });
      setMessage("✓ Shop settings and invoice identity saved successfully!");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update shop settings."));
    } finally {
      setSaving(false);
    }
  }

  // Handle Logout
  const handleAccountLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="shop-settings-page-root">
      {/* Top Header Card */}
      <div className="closing-header-card">
        <div>
          <div className="eyebrow" style={{ marginBottom: "6px" }}>
            STORE CONFIGURATION &amp; IDENTITY
          </div>
          <h1 style={{ fontSize: "24px", color: "var(--deep)" }}>
            Shop Settings &amp; Business Profile
          </h1>
          <p className="muted" style={{ fontSize: "13.5px" }}>
            Manage merchant identity, GSTIN invoice headers, operating mode, and account security.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {hasUnsavedChanges && (
            <span
              className="badge"
              style={{
                background: "var(--gold-tint)",
                color: "var(--gold-dark)",
                fontWeight: 700,
                padding: "6px 12px",
                borderRadius: "20px",
                border: "1px solid rgba(232, 196, 104, 0.4)",
              }}
            >
              ⚠️ Unsaved Changes
            </span>
          )}
          <button
            className="btn btn-primary"
            onClick={handleSaveSettings}
            disabled={saving || !isOwner}
          >
            {saving ? "Saving Changes..." : "💾 Save Settings"}
          </button>
        </div>
      </div>

      {error && <div className="alert-banner error" style={{ marginBottom: "16px" }}>{error}</div>}
      {message && <div className="alert-banner info" style={{ marginBottom: "16px" }}>{message}</div>}

      {/* Settings Tab Navigation */}
      <div className="products-filter-header" style={{ marginBottom: "20px" }}>
        <div className="history-preset-chips">
          <button
            className={`preset-chip ${activeTab === "PROFILE" ? "active" : ""}`}
            onClick={() => setActiveTab("PROFILE")}
          >
            🏢 Business Profile
          </button>
          <button
            className={`preset-chip ${activeTab === "INVOICE_TAX" ? "active" : ""}`}
            onClick={() => setActiveTab("INVOICE_TAX")}
          >
            📜 Invoice &amp; Tax Configuration
          </button>
          <button
            className={`preset-chip ${activeTab === "OPERATING_MODE" ? "active" : ""}`}
            onClick={() => setActiveTab("OPERATING_MODE")}
          >
            ⚙️ Operating Mode
          </button>
          <button
            className={`preset-chip ${activeTab === "ACCOUNT_SECURITY" ? "active" : ""}`}
            onClick={() => setActiveTab("ACCOUNT_SECURITY")}
          >
            🔐 Account &amp; Security
          </button>
        </div>

        <button
          className="btn btn-sm btn-outline"
          onClick={loadSettings}
          disabled={loading}
          title="Reload settings from server"
        >
          🔄 Reload
        </button>
      </div>

      {loading ? (
        <div className="card" style={{ padding: "48px", textAlign: "center" }}>
          <div className="loading" style={{ minHeight: "80px" }}>Loading shop settings...</div>
        </div>
      ) : (
        <form onSubmit={handleSaveSettings}>
          {/* =========================================================================
              TAB 1: BUSINESS PROFILE
              ========================================================================= */}
          {activeTab === "PROFILE" && (
            <div className="card" style={{ padding: "28px" }}>
              <div className="eyebrow" style={{ marginBottom: "6px" }}>MERCHANT IDENTITY</div>
              <h2 style={{ fontSize: "19px", color: "var(--deep)", margin: "0 0 16px" }}>
                Store &amp; Location Profile
              </h2>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                <div className="input-group">
                  <label htmlFor="shop-name-input">Shop / Trading Name *</label>
                  <input
                    id="shop-name-input"
                    required
                    placeholder="e.g. DukanKhata Supermart"
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                  />
                  <small className="muted" style={{ fontSize: "11.5px" }}>
                    Displayed on your POS screen and header of customer receipts.
                  </small>
                </div>

                <div className="input-group">
                  <label htmlFor="legal-name-input">Legal Entity / Registered Name</label>
                  <input
                    id="legal-name-input"
                    placeholder="e.g. DukanKhata Retail Enterprises Pvt Ltd"
                    value={form.legalName}
                    onChange={(e) => handleChange("legalName", e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="shop-mobile-input">Primary Business Phone</label>
                  <input
                    id="shop-mobile-input"
                    placeholder="e.g. 9876543210"
                    value={form.mobile}
                    onChange={(e) => handleChange("mobile", e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="shop-email-input">Official Business Email</label>
                  <input
                    id="shop-email-input"
                    type="email"
                    placeholder="e.g. billing@dukankhata.in"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                  />
                </div>
              </div>

              <div className="eyebrow" style={{ marginBottom: "6px", marginTop: "12px" }}>STORE PHYSICAL ADDRESS</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
                <div className="input-group" style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="address-line-input">Shop Address Line</label>
                  <input
                    id="address-line-input"
                    placeholder="e.g. Shop #12, Ground Floor, Market Road"
                    value={form.addressLine}
                    onChange={(e) => handleChange("addressLine", e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="city-input">City / Town</label>
                  <input
                    id="city-input"
                    placeholder="e.g. Bengaluru"
                    value={form.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="state-input">State</label>
                  <input
                    id="state-input"
                    placeholder="e.g. Karnataka"
                    value={form.state}
                    onChange={(e) => handleChange("state", e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="pincode-input">PIN Code (6 digits)</label>
                  <input
                    id="pincode-input"
                    maxLength={6}
                    placeholder="e.g. 560001"
                    value={form.pincode}
                    onChange={(e) => handleChange("pincode", e.target.value.replace(/\D/g, ""))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 2: INVOICE & TAX CONFIGURATION
              ========================================================================= */}
          {activeTab === "INVOICE_TAX" && (
            <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 1.2fr) minmax(280px, 0.8fr)", gap: "20px", alignItems: "start" }}>
              {/* Left: Invoice Fields */}
              <div className="card" style={{ padding: "28px" }}>
                <div className="eyebrow" style={{ marginBottom: "6px" }}>TAX &amp; BILLING SETTINGS</div>
                <h2 style={{ fontSize: "19px", color: "var(--deep)", margin: "0 0 16px" }}>
                  Invoice Header &amp; Tax Parameters
                </h2>

                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div className="input-group">
                    <label htmlFor="gstin-input">Goods &amp; Services Tax ID (GSTIN)</label>
                    <input
                      id="gstin-input"
                      maxLength={15}
                      placeholder="e.g. 29ABCDE1234F1Z5"
                      value={form.gstin}
                      onChange={(e) => handleChange("gstin", e.target.value.toUpperCase())}
                      style={{ letterSpacing: "0.05em", fontFamily: "monospace", fontSize: "14px" }}
                    />
                    <small className="muted" style={{ fontSize: "11.5px" }}>
                      15-character GST identification number printed on B2B / B2C tax invoices.
                    </small>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div className="input-group">
                      <label htmlFor="state-code-input">State Code (2 digits)</label>
                      <input
                        id="state-code-input"
                        maxLength={2}
                        placeholder="e.g. 29"
                        value={form.stateCode}
                        onChange={(e) => handleChange("stateCode", e.target.value.replace(/\D/g, ""))}
                      />
                    </div>

                    <div className="input-group">
                      <label htmlFor="tax-state-input">Jurisdiction State</label>
                      <input
                        id="tax-state-input"
                        placeholder="e.g. Karnataka"
                        value={form.state}
                        onChange={(e) => handleChange("state", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label htmlFor="footer-note-input">Custom Invoice Footer Message</label>
                    <textarea
                      id="footer-note-input"
                      rows={3}
                      placeholder="e.g. Goods once sold will not be exchanged after 7 days. Thank you!"
                      value={form.invoiceFooterNote}
                      onChange={(e) => handleChange("invoiceFooterNote", e.target.value)}
                      style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "13px" }}
                    />
                  </div>
                </div>
              </div>

              {/* Right: Live Invoice Preview */}
              <div className="card" style={{ padding: "24px", background: "var(--surface-low)" }}>
                <div className="eyebrow" style={{ marginBottom: "6px" }}>LIVE PREVIEW</div>
                <h3 style={{ fontSize: "16px", color: "var(--deep)", margin: "0 0 14px", fontWeight: 700 }}>
                  A4 Customer Invoice Header Preview
                </h3>

                <div style={{ background: "#FFFFFF", padding: "18px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "12.5px" }}>
                  <div style={{ textAlign: "center", borderBottom: "1px dashed var(--line)", paddingBottom: "12px", marginBottom: "12px" }}>
                    <strong style={{ fontSize: "16px", color: "var(--deep)", display: "block" }}>
                      {form.name || "DukanKhata Store"}
                    </strong>
                    {form.legalName && form.legalName !== form.name && (
                      <span style={{ fontSize: "11.5px", color: "var(--mute)", display: "block" }}>
                        ({form.legalName})
                      </span>
                    )}
                    <span style={{ color: "var(--mute)", display: "block", marginTop: "2px" }}>
                      {form.addressLine || "Address line"}, {form.city || "City"} {form.pincode}
                    </span>
                    {form.gstin && (
                      <strong style={{ color: "var(--brand)", display: "block", marginTop: "4px" }}>
                        GSTIN: {form.gstin}
                      </strong>
                    )}
                    {form.mobile && <span style={{ color: "var(--mute)" }}>Ph: +91 {form.mobile}</span>}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--mute)", fontSize: "11px", marginBottom: "8px" }}>
                    <span>INV #2026-001</span>
                    <span>Date: 10/10/2026</span>
                  </div>

                  <div style={{ borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", padding: "6px 0", margin: "8px 0", textAlign: "center", color: "var(--mute)", fontStyle: "italic" }}>
                    [ Itemized Product Breakdown ]
                  </div>

                  <div style={{ textAlign: "center", borderTop: "1px dashed var(--line)", paddingTop: "10px", marginTop: "10px", color: "var(--mute)", fontSize: "11.5px" }}>
                    {form.invoiceFooterNote}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 3: OPERATING MODE
              ========================================================================= */}
          {activeTab === "OPERATING_MODE" && (
            <div className="card" style={{ padding: "28px" }}>
              <div className="eyebrow" style={{ marginBottom: "6px" }}>WORKFLOW CONFIGURATION</div>
              <h2 style={{ fontSize: "19px", color: "var(--deep)", margin: "0 0 16px" }}>
                Current Operating Mode
              </h2>
              <p className="muted" style={{ fontSize: "13.5px", marginBottom: "20px" }}>
                Operating mode determines which desks, sidebar navigation groups, and reconciliation dashboards are rendered in your workspace.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "24px" }}>
                {/* 1. Small Shop Mode */}
                <div
                  className={`mode-select-card ${user?.operatingMode === "SMALL" ? "selected" : ""}`}
                  style={{ cursor: "default" }}
                >
                  <div className="mode-select-radio"></div>
                  <div className="mode-select-content">
                    <div className="mode-select-title-row">
                      <strong className="mode-select-title">Small Shop Mode</strong>
                      {user?.operatingMode === "SMALL" && (
                        <span className="mode-select-tag">✓ ACTIVE</span>
                      )}
                    </div>
                    <p className="mode-select-desc">
                      Streamlined daily closing, rapid 30-second sales reconciliation, drawer variance calculation, and cash/UPI balance tracking.
                    </p>
                  </div>
                </div>

                {/* 2. Large Shop Mode */}
                <div
                  className={`mode-select-card ${user?.operatingMode === "LARGE" ? "selected" : ""}`}
                  style={{ cursor: "default" }}
                >
                  <div className="mode-select-radio"></div>
                  <div className="mode-select-content">
                    <div className="mode-select-title-row">
                      <strong className="mode-select-title">Large Shop POS Mode</strong>
                      {user?.operatingMode === "LARGE" && (
                        <span className="mode-select-tag">✓ ACTIVE</span>
                      )}
                    </div>
                    <p className="mode-select-desc">
                      Full Point of Sale (POS) counter billing, live product SKU inventory, barcode scanning, purchase orders, and sales returns.
                    </p>
                  </div>
                </div>

                {/* 3. Hybrid Both Mode */}
                <div
                  className={`mode-select-card ${
                    user?.operatingMode === "BOTH" || !user?.operatingMode ? "selected" : ""
                  }`}
                  style={{ cursor: "default" }}
                >
                  <div className="mode-select-radio"></div>
                  <div className="mode-select-content">
                    <div className="mode-select-title-row">
                      <strong className="mode-select-title">Hybrid Mode (All Modules)</strong>
                      {(user?.operatingMode === "BOTH" || !user?.operatingMode) && (
                        <span className="mode-select-tag">✓ ACTIVE</span>
                      )}
                    </div>
                    <p className="mode-select-desc">
                      Simultaneous access to both Daily Closing and POS Counter Register with automatic synchronization (`syncPosToClosing`).
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ background: "var(--surface-low)", padding: "14px 18px", borderRadius: "8px", fontSize: "13px", color: "var(--mute)", marginBottom: "28px" }}>
                💡 <strong>Mode Policy:</strong> Your operating mode is provisioned at merchant registration. To request a plan upgrade or operating mode migration, please visit the{" "}
                <Link to="/subscription" style={{ color: "var(--brand)", fontWeight: 700 }}>
                  Subscription &amp; Billing
                </Link>{" "}
                page.
              </div>

              {/* Optional Store Modules & Feature Toggles */}
              <div style={{ borderTop: "1px solid var(--line)", paddingTop: "24px" }}>
                <div className="eyebrow" style={{ marginBottom: "6px" }}>OPTIONAL SERVICES &amp; EXTENSIONS</div>
                <h3 style={{ fontSize: "18px", color: "var(--deep)", margin: "0 0 8px", fontWeight: 700 }}>
                  Optional Store Modules (Activate / Deactivate)
                </h3>
                <p className="muted" style={{ fontSize: "13.5px", marginBottom: "20px" }}>
                  Turn optional business workflows on or off based on your shop's needs. Deactivating a service cleanly hides all its buttons, cards, calculators, and navigation across the entire website.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
                  {/* Module 1: Customer Udhar Khata */}
                  <div
                    className="card"
                    style={{
                      padding: "20px",
                      borderRadius: "12px",
                      border: enableUdhar ? "2px solid var(--brand)" : "1px solid var(--line)",
                      background: enableUdhar ? "var(--surface)" : "var(--surface-low)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "28px" }}>📒</span>
                          <div>
                            <h4 style={{ fontSize: "16px", margin: 0, color: "var(--deep)" }}>Customer Udhar Khata</h4>
                            <span style={{ fontSize: "12px", color: "var(--mute)" }}>Credit Ledger &amp; Customer Dues</span>
                          </div>
                        </div>
                        <span
                          className="badge"
                          style={{
                            background: enableUdhar ? "var(--tint)" : "var(--surface-low)",
                            color: enableUdhar ? "var(--brand)" : "var(--mute)",
                            border: enableUdhar ? "1px solid rgba(15, 61, 47, 0.2)" : "1px solid var(--line)",
                            fontWeight: 700,
                            padding: "4px 10px",
                            borderRadius: "20px",
                            fontSize: "11.5px",
                          }}
                        >
                          {enableUdhar ? "🟢 ACTIVE" : "⚪ DEACTIVATED"}
                        </span>
                      </div>

                      <p style={{ fontSize: "13px", color: "var(--mute)", lineHeight: "1.5", margin: "0 0 16px" }}>
                        Maintains customer credit accounts, payment logs, WhatsApp debt reminders, and Udhar payment mode in Daily Closing &amp; POS.
                      </p>

                      <div
                        style={{
                          fontSize: "12px",
                          padding: "10px 12px",
                          borderRadius: "8px",
                          background: enableUdhar ? "rgba(15, 61, 47, 0.05)" : "rgba(0,0,0,0.03)",
                          color: enableUdhar ? "var(--brand)" : "var(--mute)",
                          marginBottom: "16px",
                        }}
                      >
                        {enableUdhar ? (
                          <span>✓ Visible on Sidebar, Dashboard KPI, POS checkout &amp; Daily Closing desk.</span>
                        ) : (
                          <span>✕ Hidden across all pages. No customer credit features are displayed.</span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "10px", alignItems: "center", paddingTop: "12px", borderTop: "1px solid var(--line)" }}>
                      <button
                        type="button"
                        id="toggle-udhar-button"
                        className={`btn ${enableUdhar ? "btn-outline" : "btn-primary"}`}
                        style={{
                          flex: 1,
                          fontWeight: 700,
                          color: enableUdhar ? "var(--bad)" : "#FFFFFF",
                          borderColor: enableUdhar ? "rgba(224, 76, 76, 0.4)" : "transparent",
                        }}
                        onClick={() => {
                          const next = !enableUdhar;
                          updateFeatures({ enableUdhar: next });
                          setMessage(
                            next
                              ? "✓ Customer Udhar Khata activated! Navigation and features are now visible."
                              : "✕ Customer Udhar Khata deactivated and hidden across the website."
                          );
                        }}
                      >
                        {enableUdhar ? "🔴 Deactivate Udhar Khata" : "🟢 Activate Udhar Khata"}
                      </button>
                    </div>
                  </div>

                  {/* Module 2: Staff & Commission */}
                  <div
                    className="card"
                    style={{
                      padding: "20px",
                      borderRadius: "12px",
                      border: enableStaff ? "2px solid var(--brand)" : "1px solid var(--line)",
                      background: enableStaff ? "var(--surface)" : "var(--surface-low)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "28px" }}>👥</span>
                          <div>
                            <h4 style={{ fontSize: "16px", margin: 0, color: "var(--deep)" }}>Staff &amp; Commissions</h4>
                            <span style={{ fontSize: "12px", color: "var(--mute)" }}>Salesmen, Targets &amp; Payouts</span>
                          </div>
                        </div>
                        <span
                          className="badge"
                          style={{
                            background: enableStaff ? "var(--tint)" : "var(--surface-low)",
                            color: enableStaff ? "var(--brand)" : "var(--mute)",
                            border: enableStaff ? "1px solid rgba(15, 61, 47, 0.2)" : "1px solid var(--line)",
                            fontWeight: 700,
                            padding: "4px 10px",
                            borderRadius: "20px",
                            fontSize: "11.5px",
                          }}
                        >
                          {enableStaff ? "🟢 ACTIVE" : "⚪ DEACTIVATED"}
                        </span>
                      </div>

                      <p style={{ fontSize: "13px", color: "var(--mute)", lineHeight: "1.5", margin: "0 0 16px" }}>
                        Tracks cashier sales performance, calculates commission percentages, logs payouts, and assigns salespeople to POS orders.
                      </p>

                      <div
                        style={{
                          fontSize: "12px",
                          padding: "10px 12px",
                          borderRadius: "8px",
                          background: enableStaff ? "rgba(15, 61, 47, 0.05)" : "rgba(0,0,0,0.03)",
                          color: enableStaff ? "var(--brand)" : "var(--mute)",
                          marginBottom: "16px",
                        }}
                      >
                        {enableStaff ? (
                          <span>✓ Visible on Sidebar, Dashboard Quick Nav, Team desk &amp; POS cashier picker.</span>
                        ) : (
                          <span>✕ Hidden across all pages. No staff commission features are displayed.</span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "10px", alignItems: "center", paddingTop: "12px", borderTop: "1px solid var(--line)" }}>
                      <button
                        type="button"
                        id="toggle-staff-button"
                        className={`btn ${enableStaff ? "btn-outline" : "btn-primary"}`}
                        style={{
                          flex: 1,
                          fontWeight: 700,
                          color: enableStaff ? "var(--bad)" : "#FFFFFF",
                          borderColor: enableStaff ? "rgba(224, 76, 76, 0.4)" : "transparent",
                        }}
                        onClick={() => {
                          const next = !enableStaff;
                          updateFeatures({ enableStaff: next });
                          setMessage(
                            next
                              ? "✓ Staff & Commission module activated! Navigation and features are now visible."
                              : "✕ Staff & Commission module deactivated and hidden across the website."
                          );
                        }}
                      >
                        {enableStaff ? "🔴 Deactivate Staff & Comm." : "🟢 Activate Staff & Comm."}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 4: ACCOUNT & SECURITY
              ========================================================================= */}
          {activeTab === "ACCOUNT_SECURITY" && (
            <div className="card" style={{ padding: "28px" }}>
              <div className="eyebrow" style={{ marginBottom: "6px" }}>AUTHENTICATION &amp; ACCESS</div>
              <h2 style={{ fontSize: "19px", color: "var(--deep)", margin: "0 0 16px" }}>
                Account Information &amp; Session Management
              </h2>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", background: "var(--surface-low)", padding: "20px", borderRadius: "var(--radius-md)", marginBottom: "24px" }}>
                <div>
                  <span className="muted" style={{ fontSize: "12.5px" }}>Authenticated User</span>
                  <strong style={{ display: "block", fontSize: "16px", color: "var(--deep)" }}>
                    {user?.name || "Merchant Owner"}
                  </strong>
                </div>

                <div>
                  <span className="muted" style={{ fontSize: "12.5px" }}>Registered Mobile</span>
                  <strong style={{ display: "block", fontSize: "16px", color: "var(--deep)" }}>
                    +91 {user?.mobile || "—"}
                  </strong>
                </div>

                <div>
                  <span className="muted" style={{ fontSize: "12.5px" }}>Account Role</span>
                  <strong style={{ display: "block", fontSize: "16px", color: "var(--brand)" }}>
                    {user?.role || "OWNER"}
                  </strong>
                </div>

                <div>
                  <span className="muted" style={{ fontSize: "12.5px" }}>Subscription Tier</span>
                  <strong style={{ display: "block", fontSize: "16px", color: "var(--deep)" }}>
                    {user?.subscriptionStatus || "ACTIVE (PRO)"}
                  </strong>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--line)", paddingTop: "20px", flexWrap: "wrap", gap: "14px" }}>
                <div>
                  <strong style={{ display: "block", color: "var(--deep)", fontSize: "14px" }}>
                    Terminate Current Active Session
                  </strong>
                  <span className="muted" style={{ fontSize: "12.5px" }}>
                    Clears your local session storage token and signs out of this device securely.
                  </span>
                </div>

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleAccountLogout}
                  style={{ color: "var(--bad)", borderColor: "var(--line)" }}
                >
                  🚪 Sign Out of Device
                </button>
              </div>
            </div>
          )}

          {/* Bottom Sticky Action Bar */}
          {hasUnsavedChanges && (
            <div
              style={{
                position: "sticky",
                bottom: "20px",
                background: "var(--deep)",
                color: "#FFFFFF",
                padding: "14px 24px",
                borderRadius: "var(--radius-md)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow: "var(--shadow-xl)",
                marginTop: "20px",
                zIndex: 80,
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <span>You have unsaved changes to your shop configuration.</span>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setForm(initialForm)}
                  style={{ background: "transparent", color: "#FFFFFF", borderColor: "rgba(255,255,255,0.3)" }}
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ background: "var(--accent-gold)", color: "var(--deep)", borderColor: "var(--accent-gold)" }}
                >
                  {saving ? "Saving..." : "Save Settings Now"}
                </button>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
