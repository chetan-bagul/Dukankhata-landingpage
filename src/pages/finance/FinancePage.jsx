import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getFinancialSummary,
  getExpenses,
  addExpense,
  deleteExpense,
} from "../../api/financeApi";
import { getReport, downloadReport } from "../../api/reportApi";
import { getApiErrorMessage } from "../../api/apiError";
import ReportPreviewModal from "../../components/documents/ReportPreviewModal";
import { printReportDocument } from "../../utils/printReport";

function formatMoney(n) {
  const abs = Math.abs(Number(n || 0));
  const formatted = `₹${abs.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  return Number(n || 0) < 0 ? `- ${formatted}` : formatted;
}

const todayStr = new Date().toISOString().slice(0, 10);

const getMonthStart = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
};

const getSevenDaysAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return d.toISOString().slice(0, 10);
};

export default function FinancePage() {
  const { user, enableUdhar } = useAuth();
  const isOwner = user?.role === "OWNER" || user?.role === "ADMIN";

  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");

  // Tab: 'DASHBOARD' | 'EXPENSES' | 'PROFIT_BRIDGE'
  const [activeTab, setActiveTab] = useState(
    tabParam === "EXPENSES" || tabParam === "PROFIT_BRIDGE" ? tabParam : "DASHBOARD"
  );

  useEffect(() => {
    if (tabParam === "EXPENSES" || tabParam === "PROFIT_BRIDGE" || tabParam === "DASHBOARD") {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Date filters
  const [filterPreset, setFilterPreset] = useState("month"); // 'today' | 'week' | 'month' | 'custom'
  const [from, setFrom] = useState(getMonthStart());
  const [to, setTo] = useState(todayStr);

  // Core Data
  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Expense form state
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    expenseDate: todayStr,
    category: "OTHER",
    description: "",
    amount: "",
    paymentMethod: "CASH",
    recurringMonthly: false,
  });
  const [expenseSubmitting, setExpenseSubmitting] = useState(false);

  // Expense search & category filter
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("ALL");
  const [expensePage, setExpensePage] = useState(1);
  const [expensePageSize, setExpensePageSize] = useState(10);

  // Apply preset dates
  const applyPreset = (preset) => {
    setFilterPreset(preset);
    if (preset === "today") {
      setFrom(todayStr);
      setTo(todayStr);
    } else if (preset === "week") {
      setFrom(getSevenDaysAgo());
      setTo(todayStr);
    } else if (preset === "month") {
      setFrom(getMonthStart());
      setTo(todayStr);
    }
  };

  // Load finance summary, expenses, and daily report breakdown
  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [sumRes, expRes, repRes] = await Promise.allSettled([
        getFinancialSummary(from, to),
        getExpenses(from, to),
        getReport(from, to),
      ]);

      const rawSummary = sumRes.status === "fulfilled" ? (sumRes.value.data?.data || sumRes.value.data) : null;
      const rawExpenses = expRes.status === "fulfilled" ? (expRes.value.data?.data || expRes.value.data || []) : [];
      const rawReport = repRes.status === "fulfilled" ? repRes.value : null;

      setSummary(rawSummary || null);
      setExpenses(Array.isArray(rawExpenses) ? rawExpenses : []);
      setReportData(rawReport || null);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load financial P&L records."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [from, to]);

  // Download PDF Report
  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    setError("");
    try {
      await downloadReport(from, to);
      setMessage("✓ Financial P&L PDF report downloaded successfully.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to download financial report PDF."));
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Submit new expense
  async function handleExpenseSubmit(e) {
    e.preventDefault();
    const amountNum = Number(expenseForm.amount);
    if (amountNum <= 0) {
      setError("Please enter a valid positive expense amount.");
      return;
    }

    if (!expenseForm.description.trim()) {
      setError("Please provide a description for the expense.");
      return;
    }

    setExpenseSubmitting(true);
    setError("");
    setMessage("");

    try {
      await addExpense({
        ...expenseForm,
        amount: amountNum,
        description: expenseForm.description.trim(),
      });

      setMessage(`✓ Logged ${expenseForm.category} expense of ${formatMoney(amountNum)}.`);
      setExpenseForm({
        expenseDate: todayStr,
        category: "OTHER",
        description: "",
        amount: "",
        paymentMethod: "CASH",
        recurringMonthly: false,
      });
      setShowAddExpenseModal(false);
      await loadData();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to record expense."));
    } finally {
      setExpenseSubmitting(false);
    }
  }

  // Delete expense
  async function handleDeleteExpense(id, description) {
    if (!isOwner) {
      setError("Only store owners are authorized to delete expense entries.");
      return;
    }

    if (!window.confirm(`Delete expense "${description || "entry"}"? This will update P&L calculations.`)) {
      return;
    }

    try {
      await deleteExpense(id);
      setMessage("Expense entry deleted.");
      await loadData();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete expense entry."));
    }
  }

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const q = expenseSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        e.description?.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q) ||
        String(e.expenseDate).includes(q);

      if (!matchesSearch) return false;

      if (expenseCategoryFilter !== "ALL" && e.category !== expenseCategoryFilter) {
        return false;
      }

      return true;
    });
  }, [expenses, expenseSearch, expenseCategoryFilter]);

  const reportRows = useMemo(() => {
    if (reportData?.days && Array.isArray(reportData.days)) {
      return reportData.days.map((d) => ({
        businessDate: d.businessDate || d.date,
        expectedSales: d.expectedSales,
        cash: d.cash,
        upi: d.upi,
        udhar: d.udhar,
        actualCollection: d.actualCollection,
        variance: d.variance,
        expenses: d.expenses,
        netProfit: d.netProfit,
      }));
    }
    return [];
  }, [reportData]);

  const totalFilteredExpenses = useMemo(() => {
    return filteredExpenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
  }, [filteredExpenses]);

  // Paginated Expenses
  const paginatedExpenses = useMemo(() => {
    const start = (expensePage - 1) * expensePageSize;
    return filteredExpenses.slice(start, start + expensePageSize);
  }, [filteredExpenses, expensePage, expensePageSize]);

  const expenseTotalPages = Math.ceil(filteredExpenses.length / expensePageSize) || 1;

  // Expense Categories for Filter & Dropdown
  const expenseCategories = [
    "RENT",
    "ELECTRICITY",
    "GAS",
    "STAFF_SALARY",
    "TRANSPORT",
    "MAINTENANCE",
    "MARKETING",
    "SUPPLIES",
    "OTHER",
  ];

  return (
    <div className="finance-page-root">
      {/* Top Header Card */}
      <div className="closing-header-card">
        <div>
          <div className="eyebrow" style={{ marginBottom: "6px" }}>
            FINANCIAL INTELLIGENCE &amp; P&amp;L
          </div>
          <h1 style={{ fontSize: "24px", color: "var(--deep)" }}>
            Financial Analytics &amp; Profit Ledger
          </h1>
          <p className="muted" style={{ fontSize: "13.5px" }}>
            Authoritative revenue, COGS, operating overheads, gross margin, and true net profit accounting.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            className="btn btn-primary"
            onClick={() => setShowReportModal(true)}
            disabled={loading}
          >
            📄 Preview &amp; Print A4 P&amp;L Report
          </button>
          <button
            className="btn btn-outline"
            onClick={() => {
              printReportDocument({
                from,
                to,
                summary: reportData?.summary || summary,
                rows: reportRows,
                shopInfo: user || {},
                enableUdhar,
              });
            }}
            disabled={loading}
            title="Fast 1-click print or save to PDF"
          >
            🖨️ Quick Print
          </button>
          {isOwner && (
            <button
              className="btn btn-outline"
              onClick={() => setShowAddExpenseModal(true)}
            >
              💸 + Log Expense
            </button>
          )}
          <Link className="btn btn-tonal" to="/reports">
            📜 Daily Closings
          </Link>
        </div>
      </div>

      {error && <div className="alert-banner error" style={{ marginBottom: "16px" }}>{error}</div>}
      {message && <div className="alert-banner info" style={{ marginBottom: "16px" }}>{message}</div>}

      {/* Date Filter & Presets Bar */}
      <div className="history-filter-bar" style={{ marginBottom: "20px" }}>
        <div className="history-preset-chips">
          <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--mute)", marginRight: "4px" }}>
            PERIOD:
          </span>
          <button
            className={`preset-chip ${filterPreset === "today" ? "active" : ""}`}
            onClick={() => applyPreset("today")}
          >
            Today
          </button>
          <button
            className={`preset-chip ${filterPreset === "week" ? "active" : ""}`}
            onClick={() => applyPreset("week")}
          >
            Last 7 Days
          </button>
          <button
            className={`preset-chip ${filterPreset === "month" ? "active" : ""}`}
            onClick={() => applyPreset("month")}
          >
            This Month
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div className="dashboard-date-filter">
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--mute)" }}>FROM</span>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFilterPreset("custom");
                setFrom(e.target.value);
              }}
            />
          </div>

          <div className="dashboard-date-filter">
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--mute)" }}>TO</span>
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setFilterPreset("custom");
                setTo(e.target.value);
              }}
            />
          </div>

          <button
            className="btn btn-sm btn-outline"
            onClick={loadData}
            disabled={loading}
            title="Refresh finance figures"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Tab Navigation Header */}
      <div className="products-filter-header" style={{ marginBottom: "20px" }}>
        <div className="history-preset-chips">
          <button
            className={`preset-chip ${activeTab === "DASHBOARD" ? "active" : ""}`}
            onClick={() => setActiveTab("DASHBOARD")}
          >
            📊 Financial Overview
          </button>
          <button
            className={`preset-chip ${activeTab === "PROFIT_BRIDGE" ? "active" : ""}`}
            onClick={() => setActiveTab("PROFIT_BRIDGE")}
          >
            🌉 P&amp;L Profit Calculation Bridge
          </button>
          <button
            className={`preset-chip ${activeTab === "EXPENSES" ? "active" : ""}`}
            onClick={() => setActiveTab("EXPENSES")}
          >
            💸 Operating Expenses ({expenses.length})
          </button>
        </div>
      </div>

      {/* =========================================================================
          VIEW 1: FINANCIAL OVERVIEW KPI DASHBOARD
          ========================================================================= */}
      {activeTab === "DASHBOARD" && (
        <>
          {loading ? (
            <div className="card" style={{ padding: "48px", textAlign: "center" }}>
              <div className="loading" style={{ minHeight: "80px" }}>
                Calculating authoritative financial statements...
              </div>
            </div>
          ) : summary ? (
            <>
              {/* Primary P&L KPI Cards */}
              <div className="dashboard-metrics-grid" style={{ marginBottom: "20px" }}>
                <div className="dashboard-metric-card">
                  <span className="metric-label">Gross Sales Revenue</span>
                  <div className="metric-value" style={{ color: "var(--deep)" }}>
                    {formatMoney(summary.revenue)}
                  </div>
                  <div className="metric-sub">Total retail sales booked</div>
                </div>

                <div className="dashboard-metric-card">
                  <span className="metric-label">Cost of Goods Sold (COGS)</span>
                  <div className="metric-value" style={{ color: "var(--mute)" }}>
                    {formatMoney(summary.cogs)}
                  </div>
                  <div className="metric-sub">Inventory product cost</div>
                </div>

                <div className="dashboard-metric-card">
                  <span className="metric-label">Gross Profit</span>
                  <div className="metric-value" style={{ color: "var(--cash)" }}>
                    {formatMoney(summary.grossProfit)}
                  </div>
                  <div className="metric-sub">
                    <strong>{summary.grossMarginPercent || 0}%</strong> gross margin
                  </div>
                </div>

                <div className="dashboard-metric-card">
                  <span className="metric-label">Accounting Net Profit</span>
                  <div
                    className="metric-value"
                    style={{
                      color: Number(summary.netProfit || 0) >= 0 ? "var(--brand)" : "var(--bad)",
                    }}
                  >
                    {formatMoney(summary.netProfit)}
                  </div>
                  <div className="metric-sub">
                    <strong>{summary.netMarginPercent || 0}%</strong> net margin
                  </div>
                </div>
              </div>

              {/* Secondary Collections & Overhead Summary Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px", marginBottom: "24px" }}>
                {/* Overhead Expense Breakdown */}
                <div className="card" style={{ padding: "20px" }}>
                  <h3 style={{ fontSize: "16px", color: "var(--deep)", marginBottom: "14px", fontWeight: 700 }}>
                    📉 Operating Deductions Breakdown
                  </h3>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                      <span className="muted">Daily Counter Closing Expenses:</span>
                      <strong style={{ color: "var(--bad)" }}>
                        - {formatMoney(summary.closingExpenses)}
                      </strong>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                      <span className="muted">Other Operating Overheads (Rent, Utilities):</span>
                      <strong style={{ color: "var(--bad)" }}>
                        - {formatMoney(summary.otherExpenses)}
                      </strong>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                      <span className="muted">Salesperson Commission Payouts:</span>
                      <strong style={{ color: "var(--bad)" }}>
                        - {formatMoney(summary.commissionExpenses)}
                      </strong>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", fontWeight: 800, paddingTop: "8px" }}>
                      <span>Total Operating Deductions:</span>
                      <span style={{ color: "var(--bad)" }}>
                        -{" "}
                        {formatMoney(
                          Number(summary.closingExpenses || 0) +
                            Number(summary.otherExpenses || 0) +
                            Number(summary.commissionExpenses || 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cash Flow vs Profit Notice */}
                <div className="card" style={{ padding: "20px", background: "var(--surface-low)" }}>
                  <h3 style={{ fontSize: "16px", color: "var(--deep)", marginBottom: "10px", fontWeight: 700 }}>
                    💡 Accounting Policy Notice
                  </h3>
                  <p className="muted" style={{ fontSize: "13px", lineHeight: 1.6, margin: "0 0 12px" }}>
                    DukanKhata calculates <strong>Authoritative Net Profit</strong> via accrual gross margin less operational expenses and commissions.
                  </p>
                  <p className="muted" style={{ fontSize: "13px", lineHeight: 1.6, margin: 0 }}>
                    Cash drawer inflow (Cash + UPI) reflects liquidity and collections, while Net Profit accurately tracks merchant retained earnings without Udhar distortion.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="card" style={{ padding: "40px", textAlign: "center" }}>
              <p className="muted">No financial records found for the selected date range ({from} to {to}).</p>
            </div>
          )}
        </>
      )}

      {/* =========================================================================
          VIEW 2: STEP-BY-STEP WATERFALL PROFIT BRIDGE
          ========================================================================= */}
      {activeTab === "PROFIT_BRIDGE" && summary && (
        <div className="card" style={{ padding: "28px" }}>
          <div className="eyebrow" style={{ marginBottom: "6px" }}>P&amp;L RECONCILIATION</div>
          <h2 style={{ fontSize: "20px", color: "var(--deep)", margin: "0 0 16px" }}>
            Step-by-Step Waterfall Accounting Bridge
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: "var(--surface-low)", padding: "20px", borderRadius: "var(--radius-md)", border: "1px solid var(--line)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", padding: "8px 0" }}>
              <span>Gross Sales Revenue (Total Billed Inflow)</span>
              <strong style={{ color: "var(--deep)" }}>{formatMoney(summary.revenue)}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", padding: "8px 0", color: "var(--bad)" }}>
              <span>− Cost of Goods Sold (Inventory Base Cost)</span>
              <strong>- {formatMoney(summary.cogs)}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: 800, padding: "10px 0", borderTop: "1.5px solid var(--line)", borderBottom: "1.5px solid var(--line)", color: "var(--brand)" }}>
              <span>= Gross Profit ({summary.grossMarginPercent || 0}% Gross Margin)</span>
              <span>{formatMoney(summary.grossProfit)}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", padding: "6px 0", color: "var(--bad)" }}>
              <span>− Daily Closing Counter Expenses</span>
              <strong>- {formatMoney(summary.closingExpenses)}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", padding: "6px 0", color: "var(--bad)" }}>
              <span>− Operating Overhead Expenses (Rent, Bills, Transport)</span>
              <strong>- {formatMoney(summary.otherExpenses)}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", padding: "6px 0", color: "var(--bad)" }}>
              <span>− Salesperson Commission Payouts</span>
              <strong>- {formatMoney(summary.commissionExpenses)}</strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "20px",
                fontWeight: 800,
                padding: "14px 18px",
                borderRadius: "8px",
                marginTop: "10px",
                background: Number(summary.netProfit || 0) >= 0 ? "var(--tint)" : "var(--bad-tint)",
                color: Number(summary.netProfit || 0) >= 0 ? "var(--brand)" : "var(--bad)",
              }}
            >
              <span>= Authoritative Net Accounting Profit ({summary.netMarginPercent || 0}% Margin)</span>
              <span>{formatMoney(summary.netProfit)}</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 3: OPERATING EXPENSES MANAGER
          ========================================================================= */}
      {activeTab === "EXPENSES" && (
        <div className="card">
          {/* Header & Filter */}
          <div className="products-filter-header">
            <div className="history-preset-chips">
              <select
                value={expenseCategoryFilter}
                onChange={(e) => {
                  setExpenseCategoryFilter(e.target.value);
                  setExpensePage(1);
                }}
                style={{
                  width: "auto",
                  minHeight: "32px",
                  padding: "4px 10px",
                  fontSize: "12.5px",
                  borderRadius: "20px",
                  border: "1px solid var(--line)",
                  background: "#FFFFFF",
                }}
              >
                <option value="ALL">All Categories ({expenses.length})</option>
                {expenseCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <span className="badge" style={{ background: "var(--surface-low)", color: "var(--deep)" }}>
                Total: {formatMoney(totalFilteredExpenses)}
              </span>
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <div className="pos-search-bar" style={{ minWidth: "240px" }}>
                <span className="pos-search-icon" aria-hidden="true">🔍</span>
                <input
                  placeholder="Search expense description, category..."
                  value={expenseSearch}
                  onChange={(e) => {
                    setExpenseSearch(e.target.value);
                    setExpensePage(1);
                  }}
                />
                {expenseSearch && (
                  <button className="pos-search-clear" onClick={() => setExpenseSearch("")}>
                    ✕
                  </button>
                )}
              </div>

              {isOwner && (
                <button className="btn btn-sm btn-primary" onClick={() => setShowAddExpenseModal(true)}>
                  + Log Expense
                </button>
              )}
            </div>
          </div>

          {/* Expenses Table */}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description / Vendor</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th>Payment Mode</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "36px" }}>
                      <div className="loading" style={{ minHeight: "60px" }}>
                        Loading expenses...
                      </div>
                    </td>
                  </tr>
                ) : paginatedExpenses.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "36px" }} className="muted">
                      No operating expenses recorded for this period ({from} to {to}).
                    </td>
                  </tr>
                ) : (
                  paginatedExpenses.map((exp) => (
                    <tr key={exp.id} className="product-table-row">
                      <td style={{ fontWeight: 600 }}>{exp.expenseDate}</td>
                      <td>
                        <span className="badge" style={{ background: "var(--surface-low)", color: "var(--deep)", fontWeight: 700 }}>
                          {exp.category}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: "var(--deep)", fontSize: "13.5px" }}>
                          {exp.description}
                        </strong>
                        {exp.recurringMonthly && (
                          <small style={{ display: "block", color: "var(--brand)", fontSize: "11px" }}>
                            🔁 Monthly Recurring
                          </small>
                        )}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "var(--bad)", fontSize: "14.5px" }}>
                        - {formatMoney(exp.amount)}
                      </td>
                      <td>
                        <span className="badge" style={{ background: "var(--tint)", color: "var(--brand)" }}>
                          {exp.paymentMethod || "CASH"}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {isOwner && (
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => handleDeleteExpense(exp.id, exp.description)}
                            style={{ color: "var(--bad)", borderColor: "var(--line)", padding: "2px 8px" }}
                            title="Delete this expense"
                          >
                            🗑️ Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {expenseTotalPages > 1 && (
            <div className="pagination-controls">
              <div>
                Showing {(expensePage - 1) * expensePageSize + 1} to{" "}
                {Math.min(expensePage * expensePageSize, filteredExpenses.length)} of{" "}
                {filteredExpenses.length} expenses
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  className="btn btn-sm btn-outline"
                  disabled={expensePage <= 1}
                  onClick={() => setExpensePage((p) => Math.max(1, p - 1))}
                >
                  ← Prev
                </button>
                <span style={{ fontWeight: 700, color: "var(--deep)" }}>
                  Page {expensePage} of {expenseTotalPages}
                </span>
                <button
                  className="btn btn-sm btn-outline"
                  disabled={expensePage >= expenseTotalPages}
                  onClick={() => setExpensePage((p) => Math.min(expenseTotalPages, p + 1))}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD OPERATING EXPENSE
          ========================================================================= */}
      {showAddExpenseModal && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setShowAddExpenseModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="expense-modal-title"
        >
          <div className="inventory-drawer-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "12px" }}>
              <div>
                <span className="eyebrow" style={{ marginBottom: "4px" }}>OPERATING OVERHEAD</span>
                <h3 id="expense-modal-title" style={{ fontSize: "19px", color: "var(--deep)", margin: 0 }}>
                  Record Business Expense
                </h3>
              </div>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setShowAddExpenseModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExpenseSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="input-group">
                <label htmlFor="exp-date-input">Expense Date *</label>
                <input
                  id="exp-date-input"
                  type="date"
                  required
                  value={expenseForm.expenseDate}
                  onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label htmlFor="exp-category-select">Expense Category *</label>
                <select
                  id="exp-category-select"
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                >
                  {expenseCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label htmlFor="exp-amount-input">Expense Amount (₹) *</label>
                <input
                  id="exp-amount-input"
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 1500"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label htmlFor="exp-desc-input">Description / Purpose *</label>
                <input
                  id="exp-desc-input"
                  required
                  placeholder="e.g. Electricity bill for September / Shop cleaning"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label>Disbursement Payment Mode</label>
                <select
                  value={expenseForm.paymentMethod}
                  onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                >
                  <option value="CASH">💵 Cash</option>
                  <option value="UPI">📱 UPI / QR</option>
                  <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "4px 0" }}>
                <input
                  type="checkbox"
                  id="recurring-checkbox"
                  checked={expenseForm.recurringMonthly}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, recurringMonthly: e.target.checked })
                  }
                  style={{ width: "16px", height: "16px", accentColor: "var(--brand)" }}
                />
                <label htmlFor="recurring-checkbox" style={{ fontSize: "13px", cursor: "pointer" }}>
                  Recurring monthly overhead (e.g. Monthly Rent)
                </label>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => setShowAddExpenseModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={expenseSubmitting}
                >
                  {expenseSubmitting ? "Recording..." : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Financial P&L Statement Preview Modal */}
      <ReportPreviewModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        from={from}
        to={to}
        summary={reportData?.summary || summary}
        rows={reportRows}
        shopInfo={user || {}}
        enableUdhar={enableUdhar}
      />
    </div>
  );
}
