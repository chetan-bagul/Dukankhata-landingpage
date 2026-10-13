import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getReport, downloadReport } from "../../api/reportApi";
import { getClosings, getClosing } from "../../api/closingApi";
import { getApiErrorMessage } from "../../api/apiError";
import { useAuth } from "../../context/AuthContext";
import ReportPreviewModal from "../../components/documents/ReportPreviewModal";
import { printReportDocument } from "../../utils/printReport";

function formatMoney(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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

export default function ReportsPage() {
  const { user, enableUdhar } = useAuth();
  const navigate = useNavigate();

  // Date Filter Range
  const [filterPreset, setFilterPreset] = useState("month"); // 'today' | 'week' | 'month' | 'custom'
  const [from, setFrom] = useState(getMonthStart());
  const [to, setTo] = useState(todayStr);
  const [statusFilter, setStatusFilter] = useState("ALL"); // 'ALL' | 'CLOSED' | 'DRAFT'
  const [searchQuery, setSearchQuery] = useState("");

  // Data states
  const [reportData, setReportData] = useState(null);
  const [allClosings, setAllClosings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [error, setError] = useState("");

  // Inspection Drawer State
  const [inspectingClosing, setInspectingClosing] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Preset filter applicator
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

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [repRes, closingsRes] = await Promise.allSettled([
        getReport(from, to),
        getClosings(),
      ]);

      if (repRes.status === "fulfilled" && repRes.value) {
        setReportData(repRes.value);
      } else {
        setReportData(null);
      }

      if (closingsRes.status === "fulfilled" && closingsRes.value) {
        const raw = closingsRes.value.data?.data || closingsRes.value.data || [];
        setAllClosings(Array.isArray(raw) ? raw : []);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load daily closing history."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [from, to]);

  // Merge report days with full closings list to provide comprehensive status
  const filteredRows = useMemo(() => {
    let rows = [];

    if (reportData?.days && Array.isArray(reportData.days)) {
      rows = reportData.days.map((d) => {
        const full = allClosings.find((c) => c.businessDate === d.date);
        const expAmt = Array.isArray(full?.expenses)
          ? full.expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
          : Number(d.expenses || full?.expenses || 0);
        const drawerCount =
          (Number(d.cash ?? full?.cash) || 0) +
          (Number(d.upi ?? full?.upi) || 0) +
          (Number(d.udhar ?? full?.udhar) || 0);
        const isDrawerOnly =
          d.actualCollection != null &&
          Math.abs(Number(d.actualCollection) - drawerCount) < 0.01;
        const coll =
          isDrawerOnly && expAmt > 0
            ? Number(d.actualCollection) + expAmt
            : Number(d.actualCollection != null ? d.actualCollection : drawerCount + expAmt);
        const variance = coll - Number(d.expectedSales || 0);
        const netProfit = coll - expAmt;

        return {
          id: full?.id || d.date,
          businessDate: d.date,
          expectedSales: d.expectedSales,
          cash: d.cash ?? full?.cash,
          upi: d.upi ?? full?.upi,
          udhar: d.udhar ?? full?.udhar,
          actualCollection: coll,
          variance: variance,
          expenses: expAmt,
          netProfit: netProfit,
          status: full?.status || "CLOSED",
          items: full?.items || [],
          expenseList: full?.expenses || [],
          raw: full,
        };
      });
    } else if (allClosings.length > 0) {
      rows = allClosings.map((c) => {
        const expAmt = Array.isArray(c.expenses)
          ? c.expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
          : Number(c.expenses || 0);
        const drawerCount =
          (Number(c.cash) || 0) + (Number(c.upi) || 0) + (Number(c.udhar) || 0);
        const isDrawerOnly =
          c.actualCollection != null &&
          Math.abs(Number(c.actualCollection) - drawerCount) < 0.01;
        const coll =
          isDrawerOnly && expAmt > 0
            ? Number(c.actualCollection) + expAmt
            : Number(c.actualCollection != null ? c.actualCollection : drawerCount + expAmt);
        const variance = coll - Number(c.expectedSales || 0);
        const netProfit = coll - expAmt;

        return {
          id: c.id,
          businessDate: c.businessDate,
          expectedSales: c.expectedSales,
          cash: c.cash,
          upi: c.upi,
          udhar: c.udhar,
          actualCollection: coll,
          variance: variance,
          expenses: expAmt,
          netProfit: netProfit,
          status: c.status || "CLOSED",
          items: c.items || [],
          expenseList: c.expenses || [],
          raw: c,
        };
      });
    }

    // Apply Status Filter
    if (statusFilter !== "ALL") {
      rows = rows.filter((r) => r.status === statusFilter);
    }

    // Apply Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter((r) => r.businessDate.includes(q));
    }

    return rows;
  }, [reportData, allClosings, statusFilter, searchQuery]);

  // Open Inspection Modal
  const handleInspect = async (row) => {
    setInspectLoading(true);
    setInspectingClosing(row);

    // If row has an ID, attempt to fetch deep details
    if (row.raw?.id) {
      try {
        const res = await getClosing(row.raw.id);
        const detailed = res.data?.data || res.data;
        if (detailed) {
          setInspectingClosing({
            ...row,
            ...detailed,
          });
        }
      } catch {
        // Fallback to existing snapshot
      } finally {
        setInspectLoading(false);
      }
    } else {
      setInspectLoading(false);
    }
  };

  // PDF Download Handler
  const handleDownloadPdf = async () => {
    setDownloading(true);
    setError("");
    try {
      await downloadReport(from, to);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to generate A4 PDF report."));
    } finally {
      setDownloading(false);
    }
  };

  const summary = reportData?.summary;

  return (
    <div className="closing-history-page">
      {/* Header & Page Title */}
      <div className="closing-header-card">
        <div>
          <div className="eyebrow" style={{ marginBottom: "6px" }}>REPORTS &amp; AUDIT</div>
          <h1 style={{ fontSize: "24px", color: "var(--deep)" }}>Daily Closing History</h1>
          <p className="muted" style={{ fontSize: "13.5px" }}>
            Searchable historical records with snapshotted prices, drawer reconciliation, and exportable PDF summaries.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            className="btn btn-primary"
            onClick={() => setShowReportModal(true)}
            disabled={loading}
          >
            📄 Preview &amp; Print A4 Report
          </button>
          <button
            className="btn btn-outline"
            onClick={() => {
              printReportDocument({
                from,
                to,
                summary: reportData?.summary,
                rows: filteredRows,
                shopInfo: user || {},
                enableUdhar,
              });
            }}
            disabled={loading}
            title="Fast 1-click print or save to PDF"
          >
            🖨️ Quick Print
          </button>
          <Link className="btn btn-outline" to="/small-shop">
            + Open Daily Closing Desk
          </Link>
        </div>
      </div>

      {error && <div className="alert-banner error" style={{ marginBottom: "16px" }}>{error}</div>}

      {/* Preset Filters & Custom Range Bar */}
      <div className="history-filter-bar">
        <div className="history-preset-chips">
          <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--mute)", marginRight: "4px" }}>
            PRESETS:
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

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: "auto", minHeight: "36px", padding: "4px 10px", fontSize: "13px" }}
          >
            <option value="ALL">All Statuses</option>
            <option value="CLOSED">Finalized Only</option>
            <option value="DRAFT">Drafts Only</option>
          </select>

          <input
            placeholder="Search date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "140px", minHeight: "36px", padding: "4px 10px", fontSize: "13px" }}
          />

          <button
            className="btn btn-sm btn-outline"
            onClick={loadData}
            disabled={loading}
            title="Refresh historical records"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Aggregate KPI Summary Cards */}
      {summary && (
        <div className="dashboard-metrics-grid" style={{ marginBottom: "20px" }}>
          <div className="dashboard-metric-card">
            <span className="metric-label">Total Expected Sales</span>
            <div className="metric-value">{formatMoney(summary.expectedSales)}</div>
            <div className="metric-sub">Across {summary.closedDays || filteredRows.length} days</div>
          </div>

          <div className="dashboard-metric-card">
            <span className="metric-label">Total Collections (Cash+UPI)</span>
            <div className="metric-value" style={{ color: "var(--cash)" }}>
              {formatMoney(summary.actualCollection)}
            </div>
            <div className="metric-sub">Verified in drawer &amp; bank</div>
          </div>

          <div className="dashboard-metric-card">
            <span className="metric-label">Total Day Expenses</span>
            <div className="metric-value" style={{ color: "var(--bad)" }}>
              - {formatMoney(summary.expenses)}
            </div>
            <div className="metric-sub">Direct logged shop payouts</div>
          </div>

          <div className="dashboard-metric-card">
            <span className="metric-label">Net Profit</span>
            <div className="metric-value" style={{ color: "var(--brand)" }}>
              {formatMoney(summary.netProfit)}
            </div>
            <div className="metric-sub">Authoritative server calculation</div>
          </div>
        </div>
      )}

      {/* Main Historical Closings Table */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Business Date</th>
                <th>Status</th>
                <th>Expected Sales</th>
                <th>Cash</th>
                <th>UPI</th>
                <th>Udhar</th>
                <th>Actual Collections</th>
                <th>Variance</th>
                <th>Expenses</th>
                <th>Net Profit</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: "center", padding: "32px" }}>
                    <div className="loading" style={{ minHeight: "60px" }}>
                      Loading historical closings...
                    </div>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: "center", padding: "36px" }} className="muted">
                    No closing records found for the selected range ({from} to {to}).
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id || row.businessDate} style={{ cursor: "pointer" }} onClick={() => handleInspect(row)}>
                    <td style={{ fontWeight: 700 }}>{row.businessDate}</td>
                    <td>
                      <span className={`closing-status-pill ${row.status === "CLOSED" ? "closed" : "draft"}`} style={{ padding: "3px 8px", fontSize: "11px" }}>
                        {row.status}
                      </span>
                    </td>
                    <td>{formatMoney(row.expectedSales)}</td>
                    <td>{formatMoney(row.cash)}</td>
                    <td>{formatMoney(row.upi)}</td>
                    <td>{formatMoney(row.udhar)}</td>
                    <td style={{ fontWeight: 700, color: "var(--cash)" }}>{formatMoney(row.actualCollection)}</td>
                    <td className={Number(row.variance) >= 0 ? "good-text" : "bad-text"}>
                      {Number(row.variance) >= 0 ? "+" : ""}{formatMoney(row.variance)}
                    </td>
                    <td style={{ color: "var(--bad)" }}>- {formatMoney(row.expenses)}</td>
                    <td style={{ fontWeight: 800, color: "var(--deep)" }}>
                      {formatMoney(row.netProfit)}
                    </td>
                    <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => handleInspect(row)}
                          title="Inspect item breakdown"
                        >
                          👁️ Inspect
                        </button>
                        <Link
                          className="btn btn-sm btn-tonal"
                          to={`/small-shop?date=${row.businessDate}`}
                          title="Open in closing desk"
                        >
                          Desk ↗
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= INSPECTION MODAL / DRAWER ================= */}
      {inspectingClosing && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setInspectingClosing(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="inspect-modal-title"
        >
          <div className="closing-detail-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="closing-detail-header">
              <div>
                <span className="eyebrow" style={{ marginBottom: "4px" }}>CLOSING AUDIT RECORD</span>
                <h3 id="inspect-modal-title" style={{ fontSize: "20px", color: "var(--deep)" }}>
                  Closing for {inspectingClosing.businessDate}
                </h3>
              </div>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setInspectingClosing(null)}
                aria-label="Close inspection"
              >
                ✕
              </button>
            </div>

            {inspectLoading ? (
              <div className="loading" style={{ minHeight: "120px" }}>Loading detailed line items...</div>
            ) : (
              <>
                {/* 1. Status & Overview */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface-low)", padding: "12px 16px", borderRadius: "10px" }}>
                  <div>
                    <span style={{ fontSize: "12px", color: "var(--mute)", display: "block" }}>RECORD STATUS</span>
                    <strong style={{ fontSize: "14px", color: "var(--deep)" }}>
                      {inspectingClosing.status === "CLOSED" ? "🔒 Locked & Finalized" : "📝 Active Draft"}
                    </strong>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "12px", color: "var(--mute)", display: "block" }}>NET PROFIT</span>
                    <strong style={{ fontSize: "18px", color: "var(--brand)", fontFamily: "Plus Jakarta Sans" }}>
                      {formatMoney(inspectingClosing.netProfit)}
                    </strong>
                  </div>
                </div>

                {/* 2. Items Sold Breakdown */}
                <div className="closing-detail-section">
                  <h4>1. Items Sold &amp; Price Snapshots</h4>
                  {Array.isArray(inspectingClosing.items) && inspectingClosing.items.length > 0 ? (
                    <div style={{ background: "#FFFFFF", border: "1px solid var(--line)", borderRadius: "8px", padding: "8px 12px" }}>
                      {inspectingClosing.items.map((item, idx) => (
                        <div key={idx} className="detail-line-item">
                          <div>
                            <strong>{item.productName || item.name || `Item #${item.productId}`}</strong>
                            <span style={{ display: "block", fontSize: "11.5px", color: "var(--mute)" }}>
                              {item.quantity} units sold @ {formatMoney(item.sellingPrice || item.unitPrice)}
                            </span>
                          </div>
                          <strong style={{ color: "var(--deep)" }}>
                            {formatMoney(Number(item.quantity || 0) * Number(item.sellingPrice || item.unitPrice || 0))}
                          </strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted" style={{ fontSize: "13px" }}>No individual item tallies recorded for this closing.</p>
                  )}
                </div>

                {/* 3. Collections Breakdown */}
                <div className="closing-detail-section">
                  <h4>2. Drawer Collections Breakdown</h4>
                  <div style={{ background: "#FFFFFF", border: "1px solid var(--line)", borderRadius: "8px", padding: "8px 12px" }}>
                    <div className="detail-line-item">
                      <span>💵 Cash in Hand:</span>
                      <strong>{formatMoney(inspectingClosing.cash)}</strong>
                    </div>
                    <div className="detail-line-item">
                      <span>⚡ PhonePe / UPI Verified:</span>
                      <strong>{formatMoney(inspectingClosing.upi)}</strong>
                    </div>
                    <div className="detail-line-item">
                      <span>📒 Customer Udhar Given:</span>
                      <strong>{formatMoney(inspectingClosing.udhar)}</strong>
                    </div>
                    {Number(inspectingClosing.expenses) > 0 && (
                      <div className="detail-line-item">
                        <span>🧾 Expenses Paid from Drawer:</span>
                        <strong style={{ color: "var(--brand)" }}>+{formatMoney(inspectingClosing.expenses)}</strong>
                      </div>
                    )}
                    <div className="detail-line-item" style={{ borderTop: "1.5px solid var(--line)", paddingTop: "8px", fontWeight: 800 }}>
                      <span>Total Accounted Collections:</span>
                      <strong style={{ color: "var(--cash)" }}>{formatMoney(inspectingClosing.actualCollection)}</strong>
                    </div>
                  </div>
                </div>

                {/* 4. Logged Expenses */}
                <div className="closing-detail-section">
                  <h4>3. Itemized Day Expenses</h4>
                  {Array.isArray(inspectingClosing.expenseList || inspectingClosing.expenses) &&
                  (inspectingClosing.expenseList || inspectingClosing.expenses).length > 0 ? (
                    <div style={{ background: "#FFFFFF", border: "1px solid var(--line)", borderRadius: "8px", padding: "8px 12px" }}>
                      {(inspectingClosing.expenseList || inspectingClosing.expenses).map((exp, idx) => (
                        <div key={idx} className="detail-line-item">
                          <span>{exp.description || "General Expense"}</span>
                          <strong style={{ color: "var(--bad)" }}>- {formatMoney(exp.amount)}</strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted" style={{ fontSize: "13px" }}>No expenses logged for this day.</p>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                  <button
                    className="btn btn-outline"
                    style={{ flex: 1 }}
                    onClick={() => setInspectingClosing(null)}
                  >
                    Close
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => {
                      setInspectingClosing(null);
                      navigate(`/small-shop?date=${inspectingClosing.businessDate}`);
                    }}
                  >
                    Open in Closing Desk ↗
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Report Preview & Print Modal */}
      <ReportPreviewModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        from={from}
        to={to}
        summary={reportData?.summary}
        rows={filteredRows}
        shopInfo={user || {}}
        enableUdhar={enableUdhar}
      />
    </div>
  );
}
