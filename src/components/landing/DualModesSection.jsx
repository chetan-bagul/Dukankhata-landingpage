import { useState } from "react";
import { Link } from "react-router-dom";

export default function DualModesSection() {
  // ================= SMALL SHOP DAY CLOSING INTERACTIVE DEMO =================
  const [closingItems, setClosingItems] = useState([
    { id: 1, name: "Masala Chai", price: 10, count: 120 },
    { id: 2, name: "Bun Maska", price: 30, count: 35 },
    { id: 3, name: "Samosa Pav", price: 20, count: 50 },
  ]);
  const [expenses, setExpenses] = useState([
    { id: 1, name: "Milk 5L & Cooking Gas", amount: 240 },
  ]);
  const [closingSubmitted, setClosingSubmitted] = useState(false);

  const updateClosingItem = (id, delta) => {
    setClosingItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, count: Math.max(0, item.count + delta) } : item
      )
    );
    if (closingSubmitted) setClosingSubmitted(false);
  };

  const updateExpenseName = (id, name) => {
    setExpenses((prev) =>
      prev.map((exp) => (exp.id === id ? { ...exp, name } : exp))
    );
    if (closingSubmitted) setClosingSubmitted(false);
  };

  const updateExpenseAmount = (id, rawVal) => {
    const val = rawVal === "" ? 0 : Math.max(0, parseInt(rawVal, 10) || 0);
    setExpenses((prev) =>
      prev.map((exp) => (exp.id === id ? { ...exp, amount: val } : exp))
    );
    if (closingSubmitted) setClosingSubmitted(false);
  };

  const addExpense = (name = "Vegetables & Wages", amount = 160) => {
    setExpenses((prev) => [
      ...prev,
      { id: Date.now(), name, amount },
    ]);
    if (closingSubmitted) setClosingSubmitted(false);
  };

  const removeExpense = (id) => {
    setExpenses((prev) => prev.filter((exp) => exp.id !== id));
    if (closingSubmitted) setClosingSubmitted(false);
  };

  const totalSales = closingItems.reduce((acc, item) => acc + item.price * item.count, 0);
  const drawerCash = Math.round(totalSales * 0.6);
  const upiTotal = totalSales - drawerCash;
  const totalExpenses = expenses.reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0);
  const netProfit = Math.max(0, totalSales - totalExpenses);

  const handleCloseDay = () => {
    setClosingSubmitted(true);
  };

  // ================= LARGE SHOP POS SECTION INTERACTIVE DEMO =================
  const UDHAR_CUSTOMERS = [
    { id: "c1", name: "Ramesh Sharma", mobile: "+91 98765-43210", balance: 1450, limit: 5000 },
    { id: "c2", name: "Anita Verma", mobile: "+91 98230-11223", balance: 2800, limit: 10000 },
    { id: "c3", name: "Vikram Singh", mobile: "+91 98111-22334", balance: 0, limit: 3000 },
  ];

  const [posItems, setPosItems] = useState([
    { id: 101, barcode: "890123", name: "Tata Salt 1kg", price: 28, qty: 2, gst: 0 },
    { id: 102, barcode: "890456", name: "Amul Butter 500g", price: 275, qty: 1, gst: 12 },
    { id: 103, barcode: "890789", name: "Aashirvaad Atta 5kg", price: 240, qty: 1, gst: 5 },
  ]);
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [cashTendered, setCashTendered] = useState(1000);
  const [upiAmount, setUpiAmount] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState("c1");
  const [sendWhatsAppAlert, setSendWhatsAppAlert] = useState(true);
  const [splitCash, setSplitCash] = useState(300);
  const [splitUpi, setSplitUpi] = useState(316);
  const [posPrinted, setPosPrinted] = useState(false);

  const updatePosItem = (id, delta) => {
    setPosItems((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item))
        .filter((item) => item.qty > 0)
    );
    if (posPrinted) setPosPrinted(false);
  };

  const resetPosItems = () => {
    setPosItems([
      { id: 101, barcode: "890123", name: "Tata Salt 1kg", price: 28, qty: 2, gst: 0 },
      { id: 102, barcode: "890456", name: "Amul Butter 500g", price: 275, qty: 1, gst: 12 },
      { id: 103, barcode: "890789", name: "Aashirvaad Atta 5kg", price: 240, qty: 1, gst: 5 },
    ]);
    setSplitCash(300);
    setSplitUpi(316);
    setCashTendered(1000);
    setUpiAmount(null);
    setPosPrinted(false);
  };

  const posSubtotal = posItems.reduce((acc, item) => acc + item.price * item.qty, 0);
  const posGst = Math.round(
    posItems.reduce((acc, item) => acc + (item.price * item.qty * item.gst) / 100, 0)
  );
  const posTotal = posSubtotal + posGst;

  // Cash change calculations
  const cashChange = Math.max(0, cashTendered - posTotal);
  const cashIsShort = cashTendered < posTotal;

  // UPI amount calculation
  const effectiveUpiAmount = upiAmount === "" || upiAmount == null ? posTotal : upiAmount;

  // Udhar customer calculations
  const activeCustomer =
    UDHAR_CUSTOMERS.find((c) => c.id === selectedCustomerId) || UDHAR_CUSTOMERS[0];
  const newUdharTotal = activeCustomer.balance + posTotal;
  const remainingCreditLimit = Math.max(0, activeCustomer.limit - newUdharTotal);

  // Split calculations
  const effectiveSplitCash = Math.min(splitCash, posTotal);
  const effectiveSplitUpi = Math.max(0, posTotal - effectiveSplitCash);

  const handlePrintBill = () => {
    setPosPrinted(true);
  };

  const handleResetSale = () => {
    setPosPrinted(false);
  };

  return (
    <section id="modes" className="landing-section modes-section" aria-labelledby="modes-heading">
      <div className="section-header">
        <span className="eyebrow">TWO PURPOSE-BUILT OPERATING MODES</span>
        <h2 id="modes-heading">Engineered for Every Retail Scale</h2>
        <p>
          Whether you run a high-speed tea stall or a multi-lane supermarket, DukanKhata™ delivers tailored workflows with zero unnecessary friction.
        </p>
      </div>

      <div className="modes-grid">
        {/* ================= SMALL SHOP MODE ================= */}
        <div className="mode-card small-mode-card">
          <div className="mode-card-header">
            <div className="mode-badge-wrap">
              <span className="mode-pill-badge small">
                <span className="dot" aria-hidden="true"></span>
                QUICK COUNTER &amp; KIOSK
              </span>
              <span className="mode-speed-tag">⚡ 30-Sec Closing</span>
            </div>

            <div className="mode-title-group">
              <div className="mode-icon-circle small">
                ☕
              </div>
              <div>
                <h3>Small Shop Mode</h3>
                <p className="mode-tagline">
                  For tea stalls, bakeries, juice bars, street kiosks, and food counters that need fast daily reconciliation without barcode headaches.
                </p>
              </div>
            </div>
          </div>

          {/* Real Day Closing Section Interactive Demo */}
          <div className="mode-ui-preview small-preview" aria-label="Interactive Day Closing Demo">
            <div className="preview-bar-top">
              <span className="preview-store-name">☕ Live Day Closing Counter Demo</span>
              <span className={`preview-status-chip ${closingSubmitted ? "matched" : "pending"}`}>
                {closingSubmitted ? "✓ Day Closed & Locked" : "⚡ Ready to Close"}
              </span>
            </div>

            <div className="preview-items-table">
              {closingItems.map((item) => (
                <div key={item.id} className="preview-table-row">
                  <div className="item-meta">
                    <strong>{item.name}</strong>
                    <small>₹{item.price} / item</small>
                  </div>
                  <div className="stepper-pill interactive">
                    <button
                      type="button"
                      className="demo-step-btn"
                      onClick={() => updateClosingItem(item.id, -1)}
                      aria-label={`Decrease ${item.name}`}
                    >
                      −
                    </button>
                    <span className="step-num">{item.count}</span>
                    <button
                      type="button"
                      className="demo-step-btn"
                      onClick={() => updateClosingItem(item.id, 1)}
                      aria-label={`Increase ${item.name}`}
                    >
                      +
                    </button>
                  </div>
                  <span className="item-total">
                    ₹{(item.price * item.count).toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>

            {/* 🧾 Day Expenses Input Card — Professional Ledger Format */}
            <div className="preview-expense-card" aria-label="Day Expenses Ledger Demo">
              <div className="expense-card-header">
                <div className="expense-header-left">
                  <span className="pro-ledger-icon" aria-hidden="true">🧾</span>
                  <div>
                    <div className="pro-ledger-title">
                      <strong>Day Expenses Ledger</strong>
                      <span className="pro-chip expense">Drawer Payout</span>
                    </div>
                    <span className="pro-ledger-sub">Milk, Vegetables, Fuel &amp; Daily Wages</span>
                  </div>
                </div>
                <div className="pro-ledger-deduction">
                  <span className="deduction-label">Total Outflow</span>
                  <strong className="deduction-val">−₹{totalExpenses.toLocaleString("en-IN")}</strong>
                </div>
              </div>

              <div className="expense-rows-list">
                {expenses.map((exp) => (
                  <div key={exp.id} className="pro-expense-row">
                    <div className="pro-input-group desc">
                      <input
                        type="text"
                        className="pro-expense-input"
                        value={exp.name}
                        onChange={(e) => updateExpenseName(exp.id, e.target.value)}
                        placeholder="Expense item (e.g. Milk 5L & Gas)"
                        aria-label="Expense description"
                      />
                    </div>
                    <div className="pro-input-group amt">
                      <span className="pro-input-curr">₹</span>
                      <input
                        type="number"
                        min="0"
                        className="pro-expense-input number"
                        value={exp.amount === 0 ? "" : exp.amount}
                        onChange={(e) => updateExpenseAmount(exp.id, e.target.value)}
                        placeholder="0"
                        aria-label="Expense amount"
                      />
                    </div>
                    {expenses.length > 1 && (
                      <button
                        type="button"
                        className="pro-expense-del"
                        onClick={() => removeExpense(exp.id)}
                        title="Remove expense"
                        aria-label="Remove expense"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="pro-preset-bar">
                <button
                  type="button"
                  className="pos-preset-btn"
                  style={{ color: "var(--brand)", fontWeight: 800 }}
                  onClick={() => addExpense("Daily Staff Wages", 150)}
                >
                  + Add Expense Row
                </button>
                <div className="pro-preset-group">
                  <button
                    type="button"
                    className="pos-preset-btn"
                    onClick={() => addExpense("Cooking Gas Refill", 220)}
                  >
                    + Gas ₹220
                  </button>
                  <button
                    type="button"
                    className="pos-preset-btn"
                    onClick={() => addExpense("Veg & Packaging", 180)}
                  >
                    + Veg ₹180
                  </button>
                </div>
              </div>
            </div>

            {/* Financial Reconciliation Receipt Grid */}
            <div className="preview-closing-totals pro-grid">
              <div className="closing-metric">
                <span className="metric-label">💵 Drawer Cash (60%)</span>
                <strong className="metric-val">₹{drawerCash.toLocaleString("en-IN")}</strong>
              </div>
              <div className="closing-metric">
                <span className="metric-label">⚡ PhonePe / UPI (40%)</span>
                <strong className="metric-val">₹{upiTotal.toLocaleString("en-IN")}</strong>
              </div>
              <div className="closing-metric expense">
                <span className="metric-label">🧾 Expenses Deducted</span>
                <strong className="metric-val expense-val">−₹{totalExpenses.toLocaleString("en-IN")}</strong>
              </div>
              <div className="closing-metric profit">
                <span className="metric-label">🏆 Net In-Hand Profit</span>
                <strong className="metric-val profit-val">₹{netProfit.toLocaleString("en-IN")}</strong>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-lg"
              style={{ width: "100%", marginTop: "8px", fontWeight: 800 }}
              onClick={handleCloseDay}
            >
              {closingSubmitted
                ? `✓ Reconciled: ₹${totalSales.toLocaleString("en-IN")} Sales − ₹${totalExpenses.toLocaleString("en-IN")} Exp = ₹${netProfit.toLocaleString("en-IN")} Profit`
                : "🔒 Review & Close Day (1-Tap)"}
            </button>
          </div>

          {/* Feature Bullet Points */}
          <ul className="mode-bullet-list">
            <li className="mode-bullet-item">
              <span className="bullet-check small" aria-hidden="true">✓</span>
              <span><strong>30-Second Day Closing:</strong> Tally drawer cash vs PhonePe/GPay QR collections with automatic variance detection.</span>
            </li>
            <li className="mode-bullet-item">
              <span className="bullet-check small" aria-hidden="true">✓</span>
              <span><strong>Daily Expense Ledger:</strong> Log milk, vegetables, fuel, and worker wages directly into profit calculation.</span>
            </li>
            <li className="mode-bullet-item">
              <span className="bullet-check small" aria-hidden="true">✓</span>
              <span><strong>Zero Barcode Setup:</strong> Simple tap counters designed for fast single-counter rush without barcode hardware.</span>
            </li>
            <li className="mode-bullet-item">
              <span className="bullet-check small" aria-hidden="true">✓</span>
              <span><strong>Customer Udhar Khata:</strong> Track customer credit on the fly with 1-click WhatsApp payment reminders.</span>
            </li>
          </ul>

          {/* Card CTA */}
          <div className="mode-card-cta">
            <Link className="btn btn-outline btn-lg mode-btn" to="/signup?mode=SMALL">
              Try Small Shop Mode Free
              <span className="btn-arrow" aria-hidden="true">→</span>
            </Link>
            <span className="mode-cta-footnote">✓ 30-day free trial • No credit card required • 2-min setup</span>
          </div>
        </div>

        {/* ================= LARGE SHOP MODE ================= */}
        <div className="mode-card large-mode-card featured">
          <div className="mode-featured-banner">★ POPULAR FOR SUPERMARKETS &amp; MARTS</div>

          <div className="mode-card-header">
            <div className="mode-badge-wrap">
              <span className="mode-pill-badge large">
                <span className="dot" aria-hidden="true"></span>
                SUPERMARKET &amp; RETAIL POS
              </span>
              <span className="mode-speed-tag gold">⚡ Sub-Second POS</span>
            </div>

            <div className="mode-title-group">
              <div className="mode-icon-circle large">
                🛒
              </div>
              <div>
                <h3>Large Shop Mode</h3>
                <p className="mode-tagline">
                  Full-powered Point of Sale for grocery stores, supermarkets, apparel outlets, pharmacies, and wholesale distribution counters.
                </p>
              </div>
            </div>
          </div>

          {/* Real POS Section Interactive Demo */}
          <div className="mode-ui-preview large-preview" aria-label="Interactive POS Billing Demo">
            <div className="preview-bar-top">
              <span className="preview-store-name">🛒 Live Barcode POS Register Demo</span>
              <span className="preview-status-chip pos">Invoice #INV-2026-1042</span>
            </div>

            <div className="preview-items-table">
              {posItems.length === 0 ? (
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <p style={{ margin: 0, fontSize: "12px", color: "var(--mute)" }}>Cart is empty.</p>
                  <button
                    type="button"
                    className="btn btn-xs btn-outline"
                    onClick={resetPosItems}
                    style={{ marginTop: "6px" }}
                  >
                    + Reload Demo Items
                  </button>
                </div>
              ) : (
                posItems.map((item) => (
                  <div key={item.id} className="preview-table-row">
                    <div className="barcode-tag">{item.barcode}</div>
                    <div className="item-meta">
                      <strong>{item.name}</strong>
                      <small>₹{item.price} • GST {item.gst}%</small>
                    </div>
                    <div className="stepper-pill interactive">
                      <button
                        type="button"
                        className="demo-step-btn"
                        onClick={() => updatePosItem(item.id, -1)}
                        aria-label={`Decrease ${item.name}`}
                      >
                        −
                      </button>
                      <span className="step-num">{item.qty}</span>
                      <button
                        type="button"
                        className="demo-step-btn"
                        onClick={() => updatePosItem(item.id, 1)}
                        aria-label={`Increase ${item.name}`}
                      >
                        +
                      </button>
                    </div>
                    <span className="item-total">
                      ₹{(item.price * item.qty).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="preview-pos-summary">
              <div className="pos-subtotal-bar">
                <span>Subtotal + GST (₹{posGst})</span>
                <strong>₹{posTotal.toLocaleString("en-IN")}</strong>
              </div>
              {/* Real POS Screen Payment Mode Buttons */}
              <div className="pos-payment-grid" aria-label="POS Payment Modes">
                <button
                  type="button"
                  className={`pos-pay-btn cash ${paymentMode === "CASH" ? "active" : ""}`}
                  onClick={() => setPaymentMode("CASH")}
                >
                  💵 Cash
                </button>
                <button
                  type="button"
                  className={`pos-pay-btn upi ${paymentMode === "UPI" ? "active" : ""}`}
                  onClick={() => setPaymentMode("UPI")}
                >
                  ⚡ UPI
                </button>
                <button
                  type="button"
                  className={`pos-pay-btn udhar ${paymentMode === "UDHAR" ? "active" : ""}`}
                  onClick={() => setPaymentMode("UDHAR")}
                >
                  📒 Udhar
                </button>
                <button
                  type="button"
                  className={`pos-pay-btn split ${paymentMode === "SPLIT" ? "active" : ""}`}
                  onClick={() => setPaymentMode("SPLIT")}
                >
                  🔀 Split
                </button>
              </div>

              {/* ================= 1. CASH OPERATION PANEL ================= */}
              {paymentMode === "CASH" && (
                <div className="preview-op-box" aria-label="Cash Tendered & Drawer Management">
                  <div className="op-box-top">
                    <span className="op-box-title cash">
                      💵 Cash Tendered &amp; Drawer
                    </span>
                    <span className="op-badge-tag cash">🗄️ Auto Drawer Pop (F9)</span>
                  </div>

                  <div className="pro-split-field">
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--ink-secondary)" }}>
                      Cash Tendered from Customer:
                    </label>
                    <div className="pro-input-group amt" style={{ width: "100%" }}>
                      <span className="pro-input-curr">₹</span>
                      <input
                        type="number"
                        min="0"
                        className="pro-expense-input number"
                        value={cashTendered === 0 ? "" : cashTendered}
                        onChange={(e) => {
                          setCashTendered(Math.max(0, parseInt(e.target.value, 10) || 0));
                          if (posPrinted) setPosPrinted(false);
                        }}
                        placeholder={posTotal.toString()}
                        aria-label="Cash received amount"
                      />
                    </div>
                  </div>

                  {/* Cash Presets */}
                  <div style={{ display: "flex", gap: "5px", alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--mute)" }}>Presets:</span>
                    <button
                      type="button"
                      className="pos-preset-btn"
                      onClick={() => {
                        setCashTendered(posTotal);
                        if (posPrinted) setPosPrinted(false);
                      }}
                    >
                      Exact ₹{posTotal}
                    </button>
                    <button
                      type="button"
                      className="pos-preset-btn"
                      onClick={() => {
                        setCashTendered((prev) => prev + 100);
                        if (posPrinted) setPosPrinted(false);
                      }}
                    >
                      +₹100
                    </button>
                    <button
                      type="button"
                      className="pos-preset-btn"
                      onClick={() => {
                        setCashTendered((prev) => prev + 500);
                        if (posPrinted) setPosPrinted(false);
                      }}
                    >
                      +₹500
                    </button>
                    <button
                      type="button"
                      className="pos-preset-btn"
                      onClick={() => {
                        setCashTendered(1000);
                        if (posPrinted) setPosPrinted(false);
                      }}
                    >
                      ₹1,000
                    </button>
                    <button
                      type="button"
                      className="pos-preset-btn"
                      onClick={() => {
                        setCashTendered(2000);
                        if (posPrinted) setPosPrinted(false);
                      }}
                    >
                      ₹2,000
                    </button>
                  </div>

                  {/* Return Change Banner */}
                  <div className={`cash-return-banner ${cashIsShort ? "short" : ""}`}>
                    <span className={`cash-return-label ${cashIsShort ? "short" : ""}`}>
                      {cashIsShort ? "⚠️ Cash Short (Due):" : "💵 Change to Return Customer:"}
                    </span>
                    <strong className={`cash-return-val ${cashIsShort ? "short" : ""}`}>
                      {cashIsShort ? `−₹${(posTotal - cashTendered).toLocaleString("en-IN")}` : `₹${cashChange.toLocaleString("en-IN")}`}
                    </strong>
                  </div>

                  <div className="cash-drawer-note">
                    <span>🗄️ Physical cash drawer pops on F9</span>
                    <span>•</span>
                    <span>₹{posTotal.toLocaleString("en-IN")} recorded in drawer cash</span>
                  </div>
                </div>
              )}

              {/* ================= 2. UPI OPERATION PANEL ================= */}
              {paymentMode === "UPI" && (
                <div className="preview-op-box" aria-label="UPI Payment Amount">
                  <div className="op-box-top">
                    <span className="op-box-title upi">
                      ⚡ UPI Payment
                    </span>
                    <span className="op-badge-tag upi">Instant Digital Transfer</span>
                  </div>

                  <div className="pro-split-field">
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--ink-secondary)" }}>
                      UPI Amount Received:
                    </label>
                    <div className="pro-input-group amt" style={{ width: "100%" }}>
                      <span className="pro-input-curr">₹</span>
                      <input
                        type="number"
                        min="0"
                        className="pro-expense-input number"
                        value={upiAmount === null ? posTotal : upiAmount === 0 ? "" : upiAmount}
                        onChange={(e) => {
                          const val = e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
                          setUpiAmount(val);
                          if (posPrinted) setPosPrinted(false);
                        }}
                        placeholder={posTotal.toString()}
                        aria-label="UPI amount collected"
                      />
                    </div>
                  </div>

                  {/* UPI Presets */}
                  <div style={{ display: "flex", gap: "5px", alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--mute)" }}>Presets:</span>
                    <button
                      type="button"
                      className="pos-preset-btn"
                      onClick={() => {
                        setUpiAmount(posTotal);
                        if (posPrinted) setPosPrinted(false);
                      }}
                    >
                      Exact ₹{posTotal}
                    </button>
                    <button
                      type="button"
                      className="pos-preset-btn"
                      onClick={() => {
                        setUpiAmount((prev) => (prev ?? posTotal) + 100);
                        if (posPrinted) setPosPrinted(false);
                      }}
                    >
                      +₹100
                    </button>
                    <button
                      type="button"
                      className="pos-preset-btn"
                      onClick={() => {
                        setUpiAmount((prev) => (prev ?? posTotal) + 500);
                        if (posPrinted) setPosPrinted(false);
                      }}
                    >
                      +₹500
                    </button>
                  </div>

                  {/* UPI Status Banner */}
                  <div className="cash-return-banner" style={{ background: "#FAF5FF", borderColor: "rgba(95, 37, 159, 0.25)" }}>
                    <span className="cash-return-label" style={{ color: "var(--purple)" }}>
                      ⚡ UPI Settlement Amount:
                    </span>
                    <strong className="cash-return-val" style={{ color: "var(--purple)" }}>
                      ₹{effectiveUpiAmount.toLocaleString("en-IN")}
                    </strong>
                  </div>

                  <div className="cash-drawer-note">
                    <span>⚡ Digital UPI payment</span>
                    <span>•</span>
                    <span>Reconciled directly to store day book on F9</span>
                  </div>
                </div>
              )}

              {/* ================= 3. UDHAR OPERATION PANEL ================= */}
              {paymentMode === "UDHAR" && (
                <div className="preview-op-box" aria-label="Customer Udhar Khata & WhatsApp Ledger">
                  <div className="op-box-top">
                    <span className="op-box-title udhar">
                      📒 Customer Credit Khata
                    </span>
                    <span className="op-badge-tag udhar">WhatsApp Ledger</span>
                  </div>

                  <div className="udhar-customer-field">
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--ink-secondary)" }}>
                      Select Customer Khata Account:
                    </label>
                    <select
                      className="udhar-customer-select"
                      value={selectedCustomerId}
                      onChange={(e) => {
                        setSelectedCustomerId(e.target.value);
                        if (posPrinted) setPosPrinted(false);
                      }}
                      aria-label="Select customer"
                    >
                      {UDHAR_CUSTOMERS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.mobile}) — Khata Due: ₹{c.balance.toLocaleString("en-IN")}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 3-Way Ledger Math */}
                  <div className="udhar-calc-grid">
                    <div className="udhar-calc-col">
                      <span>Previous Khata</span>
                      <strong>₹{activeCustomer.balance.toLocaleString("en-IN")}</strong>
                    </div>
                    <div className="udhar-calc-col">
                      <span>+ Current Bill</span>
                      <strong>₹{posTotal.toLocaleString("en-IN")}</strong>
                    </div>
                    <div className="udhar-calc-col highlight">
                      <span>= New Balance Due</span>
                      <strong>₹{newUdharTotal.toLocaleString("en-IN")}</strong>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "var(--mute)" }}>
                    <span>Credit Limit: ₹{activeCustomer.limit.toLocaleString("en-IN")}</span>
                    <span style={{ color: "var(--cash)", fontWeight: 700 }}>Safe Headroom: ₹{remainingCreditLimit.toLocaleString("en-IN")} ✓</span>
                  </div>

                  {/* <label className="udhar-whatsapp-row">
                    <input
                      type="checkbox"
                      checked={sendWhatsAppAlert}
                      onChange={(e) => setSendWhatsAppAlert(e.target.checked)}
                    />
                    <span>1-Click WhatsApp bill &amp; balance reminder to {activeCustomer.mobile}</span>
                  </label> */}
                </div>
              )}

              {/* ================= 4. SPLIT OPERATION PANEL ================= */}
              {paymentMode === "SPLIT" && (
                <div className="preview-op-box" aria-label="Split Payment Allocation">
                  <div className="op-box-top">
                    <span className="op-box-title split">
                      🔀 Split Payment Settlement
                    </span>
                    <div style={{ display: "flex", gap: "5px" }}>
                      <button
                        type="button"
                        className="pos-preset-btn"
                        onClick={() => {
                          setSplitCash(posTotal);
                          setSplitUpi(0);
                          if (posPrinted) setPosPrinted(false);
                        }}
                      >
                        💵 All Cash
                      </button>
                      <button
                        type="button"
                        className="pos-preset-btn"
                        onClick={() => {
                          setSplitCash(0);
                          setSplitUpi(posTotal);
                          if (posPrinted) setPosPrinted(false);
                        }}
                      >
                        ⚡ All UPI
                      </button>
                      <button
                        type="button"
                        className="pos-preset-btn"
                        onClick={() => {
                          const half = Math.round(posTotal / 2);
                          setSplitCash(half);
                          setSplitUpi(posTotal - half);
                          if (posPrinted) setPosPrinted(false);
                        }}
                      >
                        50/50 Split
                      </button>
                    </div>
                  </div>

                  <div className="pro-split-grid">
                    <div className="pro-split-field">
                      <label>💵 Cash Portion</label>
                      <div className="pro-input-group amt">
                        <span className="pro-input-curr">₹</span>
                        <input
                          type="number"
                          min="0"
                          max={posTotal}
                          className="pro-expense-input number"
                          value={effectiveSplitCash}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(posTotal, parseInt(e.target.value, 10) || 0));
                            setSplitCash(val);
                            setSplitUpi(Math.max(0, posTotal - val));
                            if (posPrinted) setPosPrinted(false);
                          }}
                          placeholder="0"
                          aria-label="Cash paid in split"
                        />
                      </div>
                    </div>

                    <div className="pro-split-field">
                      <label>⚡ UPI / QR Balance</label>
                      <div className="pro-input-group amt">
                        <span className="pro-input-curr">₹</span>
                        <input
                          type="number"
                          min="0"
                          max={posTotal}
                          className="pro-expense-input number"
                          value={effectiveSplitUpi}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(posTotal, parseInt(e.target.value, 10) || 0));
                            setSplitUpi(val);
                            setSplitCash(Math.max(0, posTotal - val));
                            if (posPrinted) setPosPrinted(false);
                          }}
                          placeholder="0"
                          aria-label="UPI balance in split"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Cash Quick Presets */}
                  <div style={{ display: "flex", gap: "5px", alignItems: "center", flexWrap: "wrap", paddingTop: "2px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--mute)" }}>Presets:</span>
                    <button
                      type="button"
                      className="pos-preset-btn"
                      onClick={() => {
                        const c = Math.min(posTotal, effectiveSplitCash + 100);
                        setSplitCash(c);
                        setSplitUpi(Math.max(0, posTotal - c));
                        if (posPrinted) setPosPrinted(false);
                      }}
                    >
                      +₹100
                    </button>
                    <button
                      type="button"
                      className="pos-preset-btn"
                      onClick={() => {
                        const c = Math.min(posTotal, effectiveSplitCash + 200);
                        setSplitCash(c);
                        setSplitUpi(Math.max(0, posTotal - c));
                        if (posPrinted) setPosPrinted(false);
                      }}
                    >
                      +₹200
                    </button>
                    <button
                      type="button"
                      className="pos-preset-btn"
                      onClick={() => {
                        const c = Math.min(posTotal, effectiveSplitCash + 500);
                        setSplitCash(c);
                        setSplitUpi(Math.max(0, posTotal - c));
                        if (posPrinted) setPosPrinted(false);
                      }}
                    >
                      +₹500
                    </button>
                    {posItems.length < 3 && (
                      <button
                        type="button"
                        className="pos-preset-btn"
                        style={{ marginLeft: "auto" }}
                        onClick={resetPosItems}
                      >
                        ↺ Reset Cart
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ================= 5. AUTHENTIC THERMAL PRINTED BILL SLIP ================= */}
              {posPrinted && (
                <div className="pos-thermal-slip" aria-label="Printed Thermal Invoice Receipt">
                  <div className="slip-header">
                    <span className="slip-title">🛒 DUKANKHATA SUPERMART</span>
                    <span className="slip-sub">TAX INVOICE #INV-2026-1042 • GSTIN: 27AABCS1429B1Z</span>
                    <span className="slip-sub">Date: 13-Oct-2026 12:35 PM • POS Counter #01</span>
                  </div>

                  <div className="slip-table">
                    {posItems.map((item) => (
                      <div key={item.id} className="slip-row">
                        <span>{item.name} ({item.qty} × ₹{item.price})</span>
                        <strong>₹{(item.price * item.qty).toLocaleString("en-IN")}</strong>
                      </div>
                    ))}
                    <div className="slip-row" style={{ color: "var(--mute)" }}>
                      <span>GST (CGST + SGST)</span>
                      <span>₹{posGst}</span>
                    </div>
                    <div className="slip-row total">
                      <span>GRAND TOTAL</span>
                      <span>₹{posTotal.toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  <div className="slip-pay-info">
                    {paymentMode === "CASH" && (
                      <>
                        <span>PAYMENT: 💵 CASH TENDERED ₹{cashTendered.toLocaleString("en-IN")}</span>
                        <span>RETURNED CHANGE: ₹{cashChange.toLocaleString("en-IN")}</span>
                        <span style={{ color: "var(--cash)" }}>✓ PHYSICAL CASH DRAWER POPPED (F9)</span>
                      </>
                    )}
                    {paymentMode === "UPI" && (
                      <>
                        <span>PAYMENT: ⚡ UPI DIRECT ₹{effectiveUpiAmount.toLocaleString("en-IN")}</span>
                        <span>STATUS: COMPLETED &amp; RECONCILED</span>
                        <span style={{ color: "var(--purple)" }}>✓ DIGITAL LEDGER VERIFIED (F9)</span>
                      </>
                    )}
                    {paymentMode === "UDHAR" && (
                      <>
                        <span>PAYMENT: 📒 UDHAR (CREDIT) ₹{posTotal.toLocaleString("en-IN")}</span>
                        <span>CUSTOMER: {activeCustomer.name} ({activeCustomer.mobile})</span>
                        <span>PREV KHATA: ₹{activeCustomer.balance.toLocaleString("en-IN")} ➜ NEW KHATA: ₹{newUdharTotal.toLocaleString("en-IN")}</span>
                        {sendWhatsAppAlert && (
                          <span style={{ color: "var(--cash)" }}>✓ WHATSAPP INVOICE &amp; LEDGER SENT</span>
                        )}
                      </>
                    )}
                    {paymentMode === "SPLIT" && (
                      <>
                        <span>PAYMENT: 🔀 MULTI-MODE SPLIT</span>
                        <span>CASH PORTION: ₹{effectiveSplitCash.toLocaleString("en-IN")}</span>
                        <span>UPI PORTION: ₹{effectiveSplitUpi.toLocaleString("en-IN")}</span>
                        <span style={{ color: "var(--brand)" }}>✓ SPLIT LEDGER BALANCED</span>
                      </>
                    )}
                  </div>

                  <div className="slip-footer">
                    <span>*** GST RULE 46 COMPLIANT • 80MM THERMAL SLIP ***</span>
                    <button
                      type="button"
                      className="pos-preset-btn"
                      style={{ margin: "6px auto 0", display: "block" }}
                      onClick={handleResetSale}
                    >
                      ↺ Next Customer / New Bill (Esc)
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              className="btn btn-primary btn-lg"
              style={{ width: "100%", marginTop: "8px", fontWeight: 800 }}
              onClick={posPrinted ? handleResetSale : handlePrintBill}
            >
              {posPrinted
                ? "✓ Bill Printed & Recorded (Start Next Sale)"
                : "Complete Sale & Print Bill (F9)"}
            </button>
          </div>

          {/* Feature Bullet Points */}
          <ul className="mode-bullet-list">
            <li className="mode-bullet-item">
              <span className="bullet-check large" aria-hidden="true">✓</span>
              <span><strong>Sub-Second POS Scanner:</strong> Lightning-fast barcode scanning, instant SKU search &amp; thermal receipt printing.</span>
            </li>
            <li className="mode-bullet-item">
              <span className="bullet-check large" aria-hidden="true">✓</span>
              <span><strong>GST Rule 46 Invoicing:</strong> Auto-computes CGST/SGST/IGST breakdowns with item HSN codes ready for 1-click GSTR filing.</span>
            </li>
            <li className="mode-bullet-item">
              <span className="bullet-check large" aria-hidden="true">✓</span>
              <span><strong>Live Inventory &amp; Reorders:</strong> Automated stock deduction on checkout, low-stock warnings, and supplier purchase inwards.</span>
            </li>
            <li className="mode-bullet-item">
              <span className="bullet-check large" aria-hidden="true">✓</span>
              <span><strong>Multi-Counter Cashier Logins:</strong> Delegate billing counters with shift cash balancing while owner profit metrics stay private.</span>
            </li>
          </ul>

          {/* Card CTA */}
          <div className="mode-card-cta">
            <Link className="btn btn-primary btn-lg mode-btn large" to="/signup?mode=LARGE">
              Try Large Shop Mode Free
              <span className="btn-arrow" aria-hidden="true">→</span>
            </Link>
            <span className="mode-cta-footnote">✓ Full POS billing • Inventory engine • GST invoicing included</span>
          </div>
        </div>
      </div>
    </section>
  );
}
