import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getClosings } from "../../api/closingApi";
import { getReport } from "../../api/reportApi";
import { getFinancialSummary } from "../../api/financeApi";
import { listCustomers } from "../../api/customerApi";
import { getLowStock } from "../../api/inventoryApi";
import { getPurchases } from "../../api/purchaseApi";
import { getSales } from "../../api/posApi";

function formatMoney(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function getCustomerBalance(c) {
  if (!c) return 0;
  if (c.balance !== undefined && c.balance !== null && !isNaN(Number(c.balance))) {
    return Number(c.balance);
  }
  if (c.currentBalance !== undefined && c.currentBalance !== null && !isNaN(Number(c.currentBalance))) {
    return Number(c.currentBalance);
  }
  if (c.outstandingBalance !== undefined && c.outstandingBalance !== null && !isNaN(Number(c.outstandingBalance))) {
    return Number(c.outstandingBalance);
  }
  return 0;
}

function isSameDate(dateVal, targetDateStr) {
  if (!dateVal || !targetDateStr) return false;
  if (typeof dateVal === "string" && dateVal.startsWith(targetDateStr)) return true;
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return false;
    const local = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    if (local === targetDateStr) return true;
    const iso = d.toISOString().slice(0, 10);
    if (iso === targetDateStr) return true;
  } catch {
    return false;
  }
  return false;
}

const DASHBOARD_CACHE_KEY = "dk_dash_cache_v3_";

function getCachedDashboard(date) {
  try {
    const raw = sessionStorage.getItem(DASHBOARD_CACHE_KEY + date);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setCachedDashboard(date, data) {
  try {
    sessionStorage.setItem(DASHBOARD_CACHE_KEY + date, JSON.stringify(data));
  } catch {
    // ignore storage error
  }
}

export default function DashboardPage() {
  const { user, enableUdhar, enableStaff } = useAuth();
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const cachedInitial = getCachedDashboard(todayStr);

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [loading, setLoading] = useState(!cachedInitial);
  const [error, setError] = useState("");

  // Real API Data States (instant zero-lag initial render from cache)
  const [reportData, setReportData] = useState(() => cachedInitial?.reportData || null);
  const [financeData, setFinanceData] = useState(() => cachedInitial?.financeData || null);
  const [closingsList, setClosingsList] = useState(() => cachedInitial?.closingsList || []);
  const [customerStats, setCustomerStats] = useState(() => cachedInitial?.customerStats || { count: 0, totalUdhar: 0 });
  const [lowStockItems, setLowStockItems] = useState(() => cachedInitial?.lowStockItems || []);
  const [recentPurchases, setRecentPurchases] = useState(() => cachedInitial?.recentPurchases || []);
  const [posSalesList, setPosSalesList] = useState(() => cachedInitial?.posSalesList || []);

  const mode = user?.operatingMode || "BOTH";
  const isOwner = user?.role === "OWNER";
  const showSmall = mode === "SMALL" || mode === "BOTH";
  const showLarge = mode === "LARGE" || mode === "BOTH";

  async function loadDashboardData() {
    const cached = getCachedDashboard(selectedDate);
    if (!cached) {
      setLoading(true);
    }
    setError("");

    try {
      // Execute available real APIs concurrently
      const results = await Promise.allSettled([
        getReport(selectedDate, selectedDate),
        getFinancialSummary(selectedDate, selectedDate),
        getClosings(),
        enableUdhar ? listCustomers() : Promise.resolve([]),
        showLarge ? getLowStock() : Promise.resolve({ data: [] }),
        showLarge ? getPurchases() : Promise.resolve({ data: [] }),
        showLarge ? getSales(0, 50) : Promise.resolve({ data: [] }),
      ]);

      // 1. Report Summary
      if (results[0].status === "fulfilled" && results[0].value) {
        setReportData(results[0].value?.summary || results[0].value || null);
      } else {
        setReportData(null);
      }

      // 2. Financial Summary
      if (results[1].status === "fulfilled" && results[1].value) {
        const rawFinance = results[1].value.data?.data || results[1].value.data || results[1].value;
        setFinanceData(rawFinance || null);
      } else {
        setFinanceData(null);
      }

      // 3. Closings List
      if (results[2].status === "fulfilled" && results[2].value) {
        const raw = results[2].value.data?.data || results[2].value.data || results[2].value || [];
        setClosingsList(Array.isArray(raw) ? raw : []);
      }

      // 4. Customer Udhar
      if (results[3].status === "fulfilled" && results[3].value) {
        const rawCusts = results[3].value;
        const customers = Array.isArray(rawCusts)
          ? rawCusts
          : rawCusts?.data || rawCusts?.customers || [];
        const cleanCusts = Array.isArray(customers) ? customers : [];

        const totalOutstanding = cleanCusts.reduce((acc, c) => {
          const bal = getCustomerBalance(c);
          if (bal < 0) return acc + Math.abs(bal);
          if (bal > 0 && (c.hasUdhar || c.type === "UDHAR" || c.isUdhar)) return acc + bal;
          return acc;
        }, 0);

        setCustomerStats({
          count: cleanCusts.length,
          totalUdhar: totalOutstanding,
        });
      }

      // 5. Low Stock
      if (results[4].status === "fulfilled" && results[4].value) {
        const resVal = results[4].value;
        const items = resVal?.data?.data || resVal?.data || resVal || [];
        setLowStockItems(Array.isArray(items) ? items : []);
      }

      // 6. Recent Purchases
      if (results[5].status === "fulfilled" && results[5].value) {
        const resVal = results[5].value;
        const purchases = resVal?.data?.data || resVal?.data || resVal || [];
        setRecentPurchases(Array.isArray(purchases) ? purchases.slice(0, 5) : []);
      }

      // 7. POS Sales / Bills (Large Shop Mode)
      if (results[6].status === "fulfilled" && results[6].value) {
        const resVal = results[6].value;
        const sales = resVal?.data?.data || resVal?.data || resVal || [];
        setPosSalesList(Array.isArray(sales) ? sales : []);
      }

      // Save fresh metrics into cache for instant 0ms subsequent loads
      setCachedDashboard(selectedDate, {
        reportData: results[0].status === "fulfilled" && results[0].value ? results[0].value?.summary || results[0].value || null : null,
        financeData: results[1].status === "fulfilled" && results[1].value ? results[1].value.data?.data || results[1].value.data || results[1].value || null : null,
        closingsList: results[2].status === "fulfilled" && results[2].value ? (Array.isArray(results[2].value.data?.data || results[2].value.data) ? results[2].value.data?.data || results[2].value.data : []) : [],
        customerStats: results[3].status === "fulfilled" && results[3].value ? {
          count: Array.isArray(results[3].value?.data || results[3].value) ? (results[3].value?.data || results[3].value).length : 0,
          totalUdhar: Array.isArray(results[3].value?.data || results[3].value) ? (results[3].value?.data || results[3].value).reduce((acc, c) => acc + (getCustomerBalance(c) < 0 ? Math.abs(getCustomerBalance(c)) : 0), 0) : 0,
        } : { count: 0, totalUdhar: 0 },
        lowStockItems: results[4].status === "fulfilled" && results[4].value ? (Array.isArray(results[4].value.data?.data || results[4].value.data) ? results[4].value.data?.data || results[4].value.data : []) : [],
        recentPurchases: results[5].status === "fulfilled" && results[5].value ? (Array.isArray(results[5].value.data?.data || results[5].value.data) ? (results[5].value.data?.data || results[5].value.data).slice(0, 5) : []) : [],
        posSalesList: results[6].status === "fulfilled" && results[6].value ? (Array.isArray(results[6].value.data?.data || results[6].value.data) ? results[6].value.data?.data || results[6].value.data : []) : [],
      });
    } catch (err) {
      setError("Unable to sync some dashboard metrics. Please check network connectivity.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, [selectedDate]);

  // Filter POS sales matching selectedDate (or all sales if created today)
  const posDaySales = useMemo(() => {
    return (posSalesList || []).filter((s) => {
      if (s.status === "RETURNED") return false;
      if (!s.createdAt) return true;
      return isSameDate(s.createdAt, selectedDate);
    });
  }, [posSalesList, selectedDate]);

  // Aggregate metrics from POS sales for selectedDate
  const posDayMetrics = useMemo(() => {
    let salesTotal = 0;
    let cashTotal = 0;
    let upiTotal = 0;
    let udharTotal = 0;

    posDaySales.forEach((s) => {
      salesTotal += Number(s.total || s.totalAmount || 0);

      const cash = Number(
        s.cashAmount ||
        s.payments?.find((p) => p.method === "CASH")?.amount ||
        0
      );
      const upi = Number(
        s.upiAmount ||
        s.payments?.find((p) => p.method === "UPI")?.amount ||
        0
      );
      const udhar = Number(
        s.creditAmount ||
        s.udharAmount ||
        s.payments?.find((p) => p.method === "UDHAR")?.amount ||
        0
      );

      cashTotal += cash;
      upiTotal += upi;
      udharTotal += udhar;
    });

    return {
      salesTotal,
      cashTotal,
      upiTotal,
      udharTotal,
      collectionTotal: cashTotal + upiTotal,
      count: posDaySales.length,
    };
  }, [posDaySales]);

  // Determine today's closing status
  const todayClosing = closingsList.find((c) => c.businessDate === selectedDate) || closingsList[0];
  const closingStatus = todayClosing?.status || (posDayMetrics.count > 0 ? "LIVE POS" : "PENDING");

  // Effective Top-Level Metrics (Combining Register Closing + POS Counter Sales)
  const todaySalesValue = useMemo(() => {
    const closingSales = Number(reportData?.expectedSales || todayClosing?.expectedSales || 0);
    const posSales = posDayMetrics.salesTotal;
    const finRevenue = Number(financeData?.revenue || financeData?.grossRevenue || financeData?.totalSales || 0);

    if (posSales > 0 && closingSales > 0) return posSales + closingSales;
    if (posSales > 0) return posSales;
    if (closingSales > 0) return closingSales;
    return finRevenue;
  }, [reportData, todayClosing, posDayMetrics.salesTotal, financeData]);

  const cashCollection = useMemo(() => {
    const closingCash = Number(reportData?.cash ?? todayClosing?.cash ?? 0);
    return closingCash + posDayMetrics.cashTotal;
  }, [reportData, todayClosing, posDayMetrics.cashTotal]);

  const upiCollection = useMemo(() => {
    const closingUpi = Number(reportData?.upi ?? todayClosing?.upi ?? 0);
    return closingUpi + posDayMetrics.upiTotal;
  }, [reportData, todayClosing, posDayMetrics.upiTotal]);

  const totalCollections = useMemo(() => {
    const directColl = Number(reportData?.actualCollection || 0);
    if (directColl > 0 && posDayMetrics.collectionTotal === 0) return directColl;
    return cashCollection + upiCollection;
  }, [reportData, posDayMetrics.collectionTotal, cashCollection, upiCollection]);

  const totalExpenses = useMemo(() => {
    const repExp = Number(reportData?.expenses || 0);
    const finExp = Number(financeData?.otherExpenses || financeData?.expenses || 0);
    const closingExp = Array.isArray(todayClosing?.expenses)
      ? todayClosing.expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
      : Number(todayClosing?.expenses || 0);
    return Math.max(repExp, finExp, closingExp);
  }, [reportData, financeData, todayClosing]);

  const netProfitValue = useMemo(() => {
    const finProfit = Number(financeData?.netProfit || 0);
    if (finProfit !== 0) return finProfit;
    const repProfit = Number(reportData?.netProfit || 0);
    if (repProfit !== 0) return repProfit;
    return todaySalesValue - totalExpenses;
  }, [financeData, reportData, todaySalesValue, totalExpenses]);

  // Total Customer Udhar Outstanding
  const totalUdharDue = useMemo(() => {
    return customerStats.totalUdhar + (posDayMetrics.udharTotal > 0 ? posDayMetrics.udharTotal : 0);
  }, [customerStats.totalUdhar, posDayMetrics.udharTotal]);

  return (
    <div className="dashboard-container">
      {/* Action Bar & Quick Action Buttons */}
      <div className="dashboard-actions-bar">
        <div>
          <h1 style={{ fontSize: "26px", color: "var(--deep)", marginBottom: "4px" }}>
            Welcome, {user?.name || "Merchant"}
          </h1>
          <p className="muted" style={{ fontSize: "14px" }}>
            Store: <strong>{user?.shopName}</strong> • Mode:{" "}
            <strong>
              {mode === "SMALL"
                ? "Small Shop Mode"
                : mode === "LARGE"
                ? "Large POS Mode"
                : "Hybrid Enterprise (Both Modes)"}
            </strong>
          </p>
        </div>

        {/* Date Filter & Refresh */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div className="dashboard-date-filter">
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--mute)" }}>DATE</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              aria-label="Filter dashboard by date"
            />
          </div>
          <button
            className="btn btn-sm btn-outline"
            onClick={loadDashboardData}
            disabled={loading}
            title="Refresh dashboard data"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Primary Action Banners depending on mode */}
      <div className="dashboard-quick-actions" style={{ marginBottom: "24px" }}>
        {showLarge && (
          <Link className="btn btn-primary btn-lg" to="/pos">
            <span>🛒</span>
            <span>New POS Bill</span>
          </Link>
        )}
        {showSmall && (
          <Link className="btn btn-accent btn-lg" to="/small-shop">
            <span>🧾</span>
            <span>
              {closingStatus === "CLOSED" ? "View Today's Closing" : "Continue Daily Closing"}
            </span>
          </Link>
        )}
        {enableUdhar && (
          <Link className="btn btn-outline btn-lg" to="/customers">
            <span>📒</span>
            <span>Customer Udhar Khata</span>
          </Link>
        )}
        {isOwner && showLarge && (
          <Link className="btn btn-outline btn-lg" to="/inventory">
            <span>📦</span>
            <span>Stock &amp; Inventory</span>
          </Link>
        )}
      </div>

      {error && <div className="alert-banner error" style={{ marginBottom: "20px" }}>{error}</div>}

      {/* ================= METRICS OVERVIEW CARDS ================= */}
      <div className="dashboard-metrics-grid">
        {/* Metric 1: Today's Sales */}
        <Link to={showLarge ? "/pos" : "/reports"} className="dashboard-metric-card">
          <div className="dashboard-metric-card-top">
            <span className="metric-label">Today's Sales</span>
            <span className="metric-icon-badge" aria-hidden="true">💰</span>
          </div>
          <div className="metric-value">
            {loading ? "..." : formatMoney(todaySalesValue)}
          </div>
          <div className="metric-sub">
            <span>{selectedDate === todayStr ? "Today" : selectedDate}</span>
            {posDayMetrics.count > 0 && (
              <span>• {posDayMetrics.count} POS {posDayMetrics.count === 1 ? "bill" : "bills"}</span>
            )}
            <span>• Tap to view details →</span>
          </div>
        </Link>

        {/* Metric 2: Cash & UPI Collections */}
        <Link to={showLarge ? "/returns" : "/reports"} className="dashboard-metric-card">
          <div className="dashboard-metric-card-top">
            <span className="metric-label">Collections Breakdown</span>
            <span className="metric-icon-badge" aria-hidden="true">⚡</span>
          </div>
          <div className="metric-value" style={{ color: "var(--cash)" }}>
            {loading ? "..." : formatMoney(totalCollections)}
          </div>
          <div className="metric-sub">
            <span>
              💵 Cash: {loading ? "..." : formatMoney(cashCollection)} • ⚡ UPI:{" "}
              {loading ? "..." : formatMoney(upiCollection)}
            </span>
          </div>
        </Link>

        {/* Metric 3: Total Outstanding Udhar */}
        {enableUdhar && (
          <Link to="/customers" className="dashboard-metric-card">
            <div className="dashboard-metric-card-top">
              <span className="metric-label">Customer Udhar Due</span>
              <span className="metric-icon-badge" aria-hidden="true">📒</span>
            </div>
            <div className="metric-value" style={{ color: totalUdharDue > 0 ? "var(--orange)" : "var(--deep)" }}>
              {loading ? "..." : formatMoney(totalUdharDue)}
            </div>
            <div className="metric-sub">
              <span>Across {customerStats.count} registered {customerStats.count === 1 ? "customer" : "customers"} →</span>
            </div>
          </Link>
        )}

        {/* Metric 4: Recorded Expenses */}
        <Link to="/finance" className="dashboard-metric-card">
          <div className="dashboard-metric-card-top">
            <span className="metric-label">Recorded Expenses</span>
            <span className="metric-icon-badge" aria-hidden="true">🧾</span>
          </div>
          <div className="metric-value" style={{ color: "var(--bad)" }}>
            {loading ? "..." : formatMoney(totalExpenses)}
          </div>
          <div className="metric-sub">
            <span>Direct day expenses &amp; vendor payouts →</span>
          </div>
        </Link>
      </div>

      {/* ================= SECOND ROW: RECONCILIATION & INVENTORY ================= */}
      <div className="dashboard-two-col">
        {/* Left Widget: Closing Reconciliation Summary */}
        <div className="dashboard-widget-card">
          <div className="widget-header">
            <h3>
              <span>🧾</span>
              <span>
                {showLarge && mode === "LARGE"
                  ? "POS Register & Daily Profit"
                  : "Daily Reconciliation & Profit"}
              </span>
            </h3>
            <span
              className={`header-chip ${
                closingStatus === "CLOSED" || closingStatus === "LIVE POS"
                  ? "active"
                  : closingStatus === "DRAFT"
                  ? "trial"
                  : ""
              }`}
            >
              STATUS: {closingStatus}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
              <span className="muted">Expected Counter Sales:</span>
              <strong>{loading ? "..." : formatMoney(todaySalesValue)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
              <span className="muted">Actual Drawer + UPI Total:</span>
              <strong style={{ color: "var(--cash)" }}>
                {loading ? "..." : formatMoney(totalCollections)}
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
              <span className="muted">Reconciliation Variance:</span>
              <strong
                style={{
                  color:
                    Number(totalCollections - todaySalesValue + posDayMetrics.udharTotal) >= 0
                      ? "var(--cash)"
                      : "var(--bad)",
                }}
              >
                {Number(totalCollections - todaySalesValue + posDayMetrics.udharTotal) >= 0 ? "+" : ""}
                {loading ? "..." : formatMoney(totalCollections - todaySalesValue + posDayMetrics.udharTotal)}
              </strong>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px",
                background: "var(--tint)",
                borderRadius: "var(--radius-sm)",
                marginTop: "4px",
              }}
            >
              <div>
                <strong style={{ display: "block", color: "var(--deep)", fontSize: "15px" }}>
                  Authoritative Net Profit
                </strong>
                <small style={{ color: "var(--mute)" }}>
                  Calculated from sales minus expenses
                </small>
              </div>
              <strong style={{ fontSize: "22px", color: "var(--cash)", fontFamily: "Plus Jakarta Sans" }}>
                {loading ? "..." : formatMoney(netProfitValue)}
              </strong>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "auto", paddingTop: "8px" }}>
            {showLarge ? (
              <>
                <Link className="btn btn-outline btn-sm" to="/pos" style={{ flex: 1 }}>
                  🛒 Counter Billing
                </Link>
                <Link className="btn btn-outline btn-sm" to="/returns" style={{ flex: 1 }}>
                  📜 Bills &amp; Invoices
                </Link>
              </>
            ) : (
              <>
                <Link className="btn btn-outline btn-sm" to="/small-shop" style={{ flex: 1 }}>
                  Open Closing Desk
                </Link>
                <Link className="btn btn-outline btn-sm" to="/reports" style={{ flex: 1 }}>
                  Historical Reports
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Right Widget: Low Stock & Operations */}
        <div className="dashboard-widget-card">
          <div className="widget-header">
            <h3>
              <span>📦</span>
              <span>Stock Alerts &amp; Operations</span>
            </h3>
            {lowStockItems.length > 0 && (
              <span className="low-stock-badge">{lowStockItems.length} LOW STOCK</span>
            )}
          </div>

          {showLarge ? (
            <div>
              {lowStockItems.length === 0 ? (
                <div style={{ padding: "24px 0", textAlign: "center" }}>
                  <span style={{ fontSize: "28px" }}>✅</span>
                  <p className="muted" style={{ fontSize: "14px", marginTop: "8px" }}>
                    All products are within healthy stock thresholds.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {lowStockItems.slice(0, 4).map((item) => (
                    <div key={item.id} className="low-stock-item">
                      <div>
                        <strong>{item.name}</strong>
                        <span style={{ display: "block", fontSize: "11.5px", color: "var(--mute)" }}>
                          Min Threshold: {item.minStockThreshold || 5} units
                        </span>
                      </div>
                      <span className="low-stock-badge">
                        {item.currentStock || 0} remaining
                      </span>
                    </div>
                  ))}
                  {lowStockItems.length > 4 && (
                    <Link to="/inventory" style={{ fontSize: "12.5px", color: "var(--brand)", fontWeight: 700, marginTop: "8px" }}>
                      + View all {lowStockItems.length} low stock items →
                    </Link>
                  )}
                </div>
              )}

              <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--line)", display: "flex", gap: "8px" }}>
                <Link className="btn btn-outline btn-sm" to="/inventory" style={{ flex: 1 }}>
                  Stock Inventory
                </Link>
                <Link className="btn btn-outline btn-sm" to="/purchases" style={{ flex: 1 }}>
                  New Purchase
                </Link>
              </div>
            </div>
          ) : (
            <div style={{ padding: "16px 0" }}>
              <p className="muted" style={{ fontSize: "14px" }}>
                Your shop is currently operating in <strong>Small Shop Mode</strong>.
              </p>
              <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <Link className="btn btn-outline btn-sm" to="/small-shop">
                  Manage Quick Products
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= LARGE SHOP: RECENT BILLS & INVOICES WIDGET ================= */}
      {showLarge && (
        <div className="card" style={{ marginBottom: "28px", padding: "20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "24px" }}>📜</span>
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", color: "var(--deep)" }}>
                  Recent POS Counter Bills &amp; Invoices
                </h3>
                <span style={{ fontSize: "12.5px", color: "var(--mute)" }}>
                  Counter transactions generated in Large Shop POS
                </span>
              </div>
              <span
                style={{
                  background: "var(--tint)",
                  color: "var(--brand)",
                  fontSize: "12px",
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: "10px",
                }}
              >
                {posSalesList.length} Recorded
              </span>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <Link to="/pos" className="btn btn-outline btn-sm">
                + New Sale
              </Link>
              <Link to="/returns" className="btn btn-primary btn-sm">
                View All Bills Ledger →
              </Link>
            </div>
          </div>

          {posSalesList.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "36px 20px",
                color: "var(--mute)",
                background: "var(--surface-low)",
                borderRadius: "10px",
              }}
            >
              <span style={{ fontSize: "36px", display: "block", marginBottom: "8px" }}>🧾</span>
              <h4 style={{ margin: "0 0 6px 0", color: "var(--deep)" }}>No bills created yet</h4>
              <p style={{ margin: 0, fontSize: "13.5px" }}>
                Generate customer bills at the POS counter to see live tax invoices and receipts here.
              </p>
              <Link to="/pos" className="btn btn-primary btn-sm" style={{ marginTop: "14px" }}>
                Open POS Billing Register
              </Link>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Date &amp; Time</th>
                    <th>Customer</th>
                    <th style={{ textAlign: "right" }}>Bill Amount</th>
                    <th>Payment Breakdown</th>
                    <th>Status</th>
                    <th style={{ textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {posSalesList.slice(0, 5).map((sale) => {
                    const cashAmt = Number(
                      sale.cashAmount ||
                        sale.payments?.find((p) => p.method === "CASH")?.amount ||
                        0
                    );
                    const upiAmt = Number(
                      sale.upiAmount ||
                        sale.payments?.find((p) => p.method === "UPI")?.amount ||
                        0
                    );
                    const udharAmt = Number(
                      sale.creditAmount ||
                        sale.udharAmount ||
                        sale.payments?.find((p) => p.method === "UDHAR")?.amount ||
                        0
                    );
                    const isReturned = sale.status === "RETURNED";

                    return (
                      <tr key={sale.id} className="product-table-row">
                        <td>
                          <strong style={{ color: "var(--deep)", fontSize: "14px" }}>
                            {sale.invoiceNumber || `INV-${sale.id.slice(0, 8).toUpperCase()}`}
                          </strong>
                        </td>
                        <td style={{ fontSize: "12px", color: "var(--mute)" }}>
                          {sale.createdAt
                            ? new Date(sale.createdAt).toLocaleString("en-IN", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })
                            : "—"}
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: "var(--deep)" }}>
                            {sale.customerName || "Walk-in Customer"}
                          </span>
                          {sale.customerMobile && (
                            <small
                              style={{ display: "block", color: "var(--mute)", fontSize: "11px" }}
                            >
                              {sale.customerMobile}
                            </small>
                          )}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontWeight: 700,
                            color: "var(--brand)",
                            fontSize: "14.5px",
                          }}
                        >
                          {formatMoney(sale.total || sale.totalAmount)}
                        </td>
                        <td>
                          <div
                            style={{ display: "flex", gap: "4px", flexWrap: "wrap", fontSize: "11px" }}
                          >
                            {cashAmt > 0 && (
                              <span
                                className="badge"
                                style={{ background: "var(--tint)", color: "var(--cash)" }}
                              >
                                💵 Cash: {formatMoney(cashAmt)}
                              </span>
                            )}
                            {upiAmt > 0 && (
                              <span
                                className="badge"
                                style={{ background: "var(--purple-tint)", color: "var(--purple)" }}
                              >
                                📱 UPI: {formatMoney(upiAmt)}
                              </span>
                            )}
                            {udharAmt > 0 && (
                              <span
                                className="badge"
                                style={{ background: "var(--gold-tint)", color: "var(--orange)" }}
                              >
                                📒 Udhar: {formatMoney(udharAmt)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`product-status-chip ${isReturned ? "low-stock" : "active"}`}
                          >
                            {isReturned ? "🔄 RETURNED" : "✓ COMPLETED"}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <Link to="/returns" className="btn btn-sm btn-outline">
                            View Bill →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= QUICK NAVIGATION & STORE MODULES ================= */}
      <section className="quick-nav-section">
        <div className="quick-nav-header">
          <div className="quick-nav-title-group">
            <h3 className="quick-nav-title">
              <span>⚡</span> Quick Navigation &amp; Store Modules
            </h3>
            <p className="quick-nav-subtitle">
              Instant access to core counter desks, ledgers, finance analytics, and shop administration.
            </p>
          </div>
          <span className="badge badge-cash" style={{ fontSize: "12px", padding: "4px 10px" }}>
            Operational Suite
          </span>
        </div>

        <div className="quick-nav-grid">
          {mode === "SMALL" ? (
            <Link className="quick-nav-card quick-nav-expenses" to="/finance?tab=EXPENSES">
              <div className="quick-nav-top">
                <div className="quick-nav-icon-wrap" aria-hidden="true">🧾</div>
                <span className="quick-nav-badge">Store Payouts</span>
              </div>
              <div className="quick-nav-body">
                <h4>Operating Expenses</h4>
                <p>Track store utilities, milk, rent, fuel, daily payouts, and overheads.</p>
              </div>
              <div className="quick-nav-footer">
                <span>Manage Expenses</span>
                <span className="quick-nav-arrow" aria-hidden="true">→</span>
              </div>
            </Link>
          ) : (
            <Link className="quick-nav-card quick-nav-pos" to="/pos">
              <div className="quick-nav-top">
                <div className="quick-nav-icon-wrap" aria-hidden="true">🛒</div>
                <span className="quick-nav-badge">Retail Billing</span>
              </div>
              <div className="quick-nav-body">
                <h4>Point of Sale (POS)</h4>
                <p>Barcode billing, fast receipt thermal printing, and split payments.</p>
              </div>
              <div className="quick-nav-footer">
                <span>Open POS Counter</span>
                <span className="quick-nav-arrow" aria-hidden="true">→</span>
              </div>
            </Link>
          )}

          <Link className="quick-nav-card quick-nav-desk" to="/small-shop">
            <div className="quick-nav-top">
              <div className="quick-nav-icon-wrap" aria-hidden="true">🧾</div>
              <span className="quick-nav-badge">Daily Register</span>
            </div>
            <div className="quick-nav-body">
              <h4>Daily Closing Desk</h4>
              <p>Count items sold, log cash in hand, and calculate net profit.</p>
            </div>
            <div className="quick-nav-footer">
              <span>Open Closing Desk</span>
              <span className="quick-nav-arrow" aria-hidden="true">→</span>
            </div>
          </Link>

          {enableUdhar && (
            <Link className="quick-nav-card quick-nav-udhar" to="/customers">
              <div className="quick-nav-top">
                <div className="quick-nav-icon-wrap" aria-hidden="true">📒</div>
                <span className="quick-nav-badge">Credit Ledger</span>
              </div>
              <div className="quick-nav-body">
                <h4>Customer Udhar Khata</h4>
                <p>Maintain customer credit balances, log payments, and send WhatsApp reminders.</p>
              </div>
              <div className="quick-nav-footer">
                <span>Manage Udhar</span>
                <span className="quick-nav-arrow" aria-hidden="true">→</span>
              </div>
            </Link>
          )}

          <Link className="quick-nav-card quick-nav-finance" to="/finance">
            <div className="quick-nav-top">
              <div className="quick-nav-icon-wrap" aria-hidden="true">💰</div>
              <span className="quick-nav-badge">Profit &amp; Loss</span>
            </div>
            <div className="quick-nav-body">
              <h4>Financial Analytics</h4>
              <p>Authoritative gross profit, margins, revenue breakdowns, and expense tracking.</p>
            </div>
            <div className="quick-nav-footer">
              <span>View Financials</span>
              <span className="quick-nav-arrow" aria-hidden="true">→</span>
            </div>
          </Link>

          <Link className="quick-nav-card quick-nav-inventory" to="/inventory">
            <div className="quick-nav-top">
              <div className="quick-nav-icon-wrap" aria-hidden="true">📦</div>
              <span className="quick-nav-badge">Stock Control</span>
            </div>
            <div className="quick-nav-body">
              <h4>Inventory &amp; Stock</h4>
              <p>Real-time stock valuation, low-stock warnings, and barcode catalog.</p>
            </div>
            <div className="quick-nav-footer">
              <span>Check Inventory</span>
              <span className="quick-nav-arrow" aria-hidden="true">→</span>
            </div>
          </Link>

          <Link className="quick-nav-card quick-nav-purchases" to="/purchases">
            <div className="quick-nav-top">
              <div className="quick-nav-icon-wrap" aria-hidden="true">🚛</div>
              <span className="quick-nav-badge">Supplier Inward</span>
            </div>
            <div className="quick-nav-body">
              <h4>Purchases &amp; Vendors</h4>
              <p>Log purchase bills, inward shipments, and track supplier payables.</p>
            </div>
            <div className="quick-nav-footer">
              <span>Manage Purchases</span>
              <span className="quick-nav-arrow" aria-hidden="true">→</span>
            </div>
          </Link>

          {enableStaff && (
            <Link className="quick-nav-card quick-nav-staff" to="/staff">
              <div className="quick-nav-top">
                <div className="quick-nav-icon-wrap" aria-hidden="true">👥</div>
                <span className="quick-nav-badge">Team &amp; Sales</span>
              </div>
              <div className="quick-nav-body">
                <h4>Staff &amp; Commissions</h4>
                <p>Track cashier sales volume, commission percentages, and payout logs.</p>
              </div>
              <div className="quick-nav-footer">
                <span>Manage Staff</span>
                <span className="quick-nav-arrow" aria-hidden="true">→</span>
              </div>
            </Link>
          )}

          <Link className="quick-nav-card quick-nav-reports" to="/reports">
            <div className="quick-nav-top">
              <div className="quick-nav-icon-wrap" aria-hidden="true">📊</div>
              <span className="quick-nav-badge">Business Insights</span>
            </div>
            <div className="quick-nav-body">
              <h4>Reports &amp; GST</h4>
              <p>Daily sales summaries, top-selling items, and tax breakdown reports.</p>
            </div>
            <div className="quick-nav-footer">
              <span>View Reports</span>
              <span className="quick-nav-arrow" aria-hidden="true">→</span>
            </div>
          </Link>

          <Link className="quick-nav-card quick-nav-sub" to="/subscription">
            <div className="quick-nav-top">
              <div className="quick-nav-icon-wrap" aria-hidden="true">💳</div>
              <span className="quick-nav-badge">Plan &amp; Billing</span>
            </div>
            <div className="quick-nav-body">
              <h4>Plans &amp; Subscription</h4>
              <p>Manage subscription status, branch limits, plan renewals, and billing.</p>
            </div>
            <div className="quick-nav-footer">
              <span>Manage Subscription</span>
              <span className="quick-nav-arrow" aria-hidden="true">→</span>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
