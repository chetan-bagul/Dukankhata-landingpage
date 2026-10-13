import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getAuditEvents } from "../../api/auditApi";
import { getApiErrorMessage } from "../../api/apiError";

export default function AuditPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER" || user?.role === "ADMIN";

  // Data states
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("ALL"); // 'ALL' | 'SUCCESS' | 'FAILED'
  const [resourceFilter, setResourceFilter] = useState("ALL"); // 'ALL' | 'AUTH' | 'POS' | 'CLOSING' | 'FINANCE' | 'INVENTORY' | 'CUSTOMER' | 'STAFF' | 'SETTINGS'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Inspection Drawer
  const [inspectedEvent, setInspectedEvent] = useState(null);

  async function loadAuditData() {
    setLoading(true);
    setError("");
    try {
      const data = await getAuditEvents(200);
      const raw = Array.isArray(data) ? data : data?.data || [];
      setEvents(raw);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load security audit records."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAuditData();
  }, []);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        ev.action?.toLowerCase().includes(q) ||
        ev.actorName?.toLowerCase().includes(q) ||
        ev.actorMobile?.includes(q) ||
        ev.correlationId?.toLowerCase().includes(q) ||
        ev.requestPath?.toLowerCase().includes(q) ||
        ev.ipAddress?.includes(q);

      if (!matchesSearch) return false;

      if (outcomeFilter !== "ALL" && ev.outcome !== outcomeFilter) return false;
      if (resourceFilter !== "ALL" && ev.resource !== resourceFilter) return false;

      return true;
    });
  }, [events, searchQuery, outcomeFilter, resourceFilter]);

  // Aggregate Metrics
  const totalSuccess = useMemo(() => events.filter((e) => e.outcome === "SUCCESS").length, [events]);
  const totalFailed = useMemo(() => events.filter((e) => e.outcome !== "SUCCESS").length, [events]);

  // Paginated Rows
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEvents.slice(start, start + pageSize);
  }, [filteredEvents, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredEvents.length / pageSize) || 1;

  // Resource Categories for Filter
  const resourceCategories = [
    "AUTH",
    "POS",
    "CLOSING",
    "FINANCE",
    "INVENTORY",
    "CUSTOMER",
    "STAFF",
    "PURCHASE",
    "SETTINGS",
  ];

  return (
    <div className="audit-page-root">
      {/* Top Header Card */}
      <div className="closing-header-card">
        <div>
          <div className="eyebrow" style={{ marginBottom: "6px" }}>
            IMMUTABLE SECURITY AUDIT
          </div>
          <h1 style={{ fontSize: "24px", color: "var(--deep)" }}>
            Activity History &amp; Security Audit
          </h1>
          <p className="muted" style={{ fontSize: "13.5px" }}>
            Chronological audit trail of system transactions, authentication events, IP addresses, and correlation IDs.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            className="btn btn-outline"
            onClick={loadAuditData}
            disabled={loading}
          >
            🔄 Refresh Trail
          </button>
          <Link className="btn btn-tonal" to="/team">
            🔑 Team &amp; Permissions
          </Link>
        </div>
      </div>

      {error && <div className="alert-banner error" style={{ marginBottom: "16px" }}>{error}</div>}

      {/* Access Protection Notice */}
      {!isOwner && (
        <div className="alert-banner info" style={{ marginBottom: "20px" }}>
          ℹ️ <strong>View-Only Mode:</strong> Audit logs are restricted to store owners and security administrators.
        </div>
      )}

      {/* Aggregate KPI Summary Cards */}
      <div className="dashboard-metrics-grid" style={{ marginBottom: "20px" }}>
        <div className="dashboard-metric-card">
          <span className="metric-label">Logged Audit Events</span>
          <div className="metric-value">{events.length} Events</div>
          <div className="metric-sub">Chronological server ledger</div>
        </div>

        <div className="dashboard-metric-card">
          <span className="metric-label">Successful Operations</span>
          <div className="metric-value" style={{ color: "var(--cash)" }}>
            {totalSuccess} OK
          </div>
          <div className="metric-sub">Verified system operations</div>
        </div>

        <div className="dashboard-metric-card">
          <span className="metric-label">Failed / Flagged Events</span>
          <div
            className="metric-value"
            style={{ color: totalFailed > 0 ? "var(--bad)" : "var(--deep)" }}
          >
            {totalFailed} Alerts
          </div>
          <div className="metric-sub">Security or validation rejections</div>
        </div>

        <div className="dashboard-metric-card">
          <span className="metric-label">Audit Policy</span>
          <div className="metric-value" style={{ color: "var(--brand)" }}>
            Immutable
          </div>
          <div className="metric-sub">Sanitized for credential safety</div>
        </div>
      </div>

      {/* Audit Log Table Card */}
      <div className="card">
        {/* Search & Filter Header */}
        <div className="products-filter-header">
          <div className="history-preset-chips">
            <button
              className={`preset-chip ${outcomeFilter === "ALL" ? "active" : ""}`}
              onClick={() => {
                setOutcomeFilter("ALL");
                setCurrentPage(1);
              }}
            >
              All Events ({events.length})
            </button>
            <button
              className={`preset-chip ${outcomeFilter === "SUCCESS" ? "active" : ""}`}
              onClick={() => {
                setOutcomeFilter("SUCCESS");
                setCurrentPage(1);
              }}
            >
              ✓ Success ({totalSuccess})
            </button>
            <button
              className={`preset-chip ${outcomeFilter === "FAILED" ? "active" : ""}`}
              onClick={() => {
                setOutcomeFilter("FAILED");
                setCurrentPage(1);
              }}
            >
              ⚠️ Failed ({totalFailed})
            </button>

            <select
              value={resourceFilter}
              onChange={(e) => {
                setResourceFilter(e.target.value);
                setCurrentPage(1);
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
              <option value="ALL">All Resource Domains</option>
              {resourceCategories.map((rc) => (
                <option key={rc} value={rc}>
                  {rc}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <div className="pos-search-bar" style={{ minWidth: "260px" }}>
              <span className="pos-search-icon" aria-hidden="true">🔍</span>
              <input
                placeholder="Search action, actor, IP, correlation ID..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {searchQuery && (
                <button className="pos-search-clear" onClick={() => setSearchQuery("")}>
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action &amp; Resource</th>
                <th>Actor / User</th>
                <th>Status</th>
                <th>Correlation ID</th>
                <th>Client IP</th>
                <th style={{ textAlign: "center" }}>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "36px" }}>
                    <div className="loading" style={{ minHeight: "60px" }}>Loading security audit logs...</div>
                  </td>
                </tr>
              ) : paginatedEvents.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "36px" }} className="muted">
                    No audit records match the selected filter.
                  </td>
                </tr>
              ) : (
                paginatedEvents.map((ev, i) => {
                  const isSuccess = ev.outcome === "SUCCESS";

                  return (
                    <tr
                      key={ev.id || i}
                      className="product-table-row"
                      style={{ cursor: "pointer" }}
                      onClick={() => setInspectedEvent(ev)}
                    >
                      <td style={{ fontSize: "12.5px", color: "var(--deep)", fontWeight: 600 }}>
                        {ev.createdAt ? new Date(ev.createdAt).toLocaleString() : "—"}
                      </td>
                      <td>
                        <strong style={{ display: "block", color: "var(--deep)", fontSize: "13.5px" }}>
                          {ev.action}
                        </strong>
                        <small style={{ color: "var(--mute)", fontSize: "11px" }}>
                          Domain: {ev.resource || "SYSTEM"}
                        </small>
                      </td>
                      <td>
                        <strong style={{ display: "block", color: "var(--deep)", fontSize: "13px" }}>
                          {ev.actorName || "System / Unauthenticated"}
                        </strong>
                        {ev.actorMobile && (
                          <small style={{ color: "var(--mute)", fontSize: "11px" }}>
                            📱 {ev.actorMobile}
                          </small>
                        )}
                      </td>
                      <td>
                        <span
                          className={`product-status-chip ${isSuccess ? "active" : "low-stock"}`}
                          style={{ fontSize: "11px" }}
                        >
                          {isSuccess ? "✓ SUCCESS" : "⚠️ FAILED"}
                        </span>
                      </td>
                      <td>
                        <code style={{ fontSize: "11px", color: "var(--mute)" }}>
                          {ev.correlationId ? ev.correlationId.slice(0, 12) + "..." : "—"}
                        </code>
                      </td>
                      <td>
                        <span style={{ fontSize: "12px", color: "var(--mute)", fontFamily: "monospace" }}>
                          {ev.ipAddress || "—"}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => setInspectedEvent(ev)}
                          title="Inspect audit payload"
                        >
                          👁️ View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination-controls">
            <div>
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, filteredEvents.length)} of{" "}
              {filteredEvents.length} audit entries
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                className="btn btn-sm btn-outline"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                ← Prev
              </button>
              <span style={{ fontWeight: 700, color: "var(--deep)" }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="btn btn-sm btn-outline"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next →
              </button>

              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{ width: "auto", minHeight: "32px", padding: "4px 8px", fontSize: "12.5px" }}
              >
                <option value="15">15 / page</option>
                <option value="30">30 / page</option>
                <option value="50">50 / page</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Security Privacy Notice */}
      <div style={{ marginTop: "20px", background: "var(--surface-low)", padding: "14px 18px", borderRadius: "8px", fontSize: "12.5px", color: "var(--mute)", border: "1px solid var(--line)" }}>
        🛡️ <strong>Sanitization &amp; Non-Repudiation Policy:</strong> Audit events are generated server-side during request processing. Passwords, JWT session tokens, and credit card numbers are strictly omitted and sanitized before persistence.
      </div>

      {/* ================= MODAL: AUDIT EVENT INSPECTION ================= */}
      {inspectedEvent && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setInspectedEvent(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="inspect-audit-title"
        >
          <div className="inventory-drawer-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "620px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "12px" }}>
              <div>
                <span className="eyebrow" style={{ marginBottom: "4px" }}>SECURITY EVENT DETAILS</span>
                <h3 id="inspect-audit-title" style={{ fontSize: "19px", color: "var(--deep)", margin: 0 }}>
                  {inspectedEvent.action}
                </h3>
              </div>
              <button className="btn btn-sm btn-outline" onClick={() => setInspectedEvent(null)}>
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", background: "var(--surface-low)", padding: "12px 16px", borderRadius: "8px", fontSize: "13px" }}>
              <div>
                <span className="muted">Resource Domain:</span>
                <strong style={{ display: "block", color: "var(--deep)" }}>
                  {inspectedEvent.resource || "SYSTEM"}
                </strong>
              </div>
              <div>
                <span className="muted">Operation Outcome:</span>
                <strong
                  style={{
                    display: "block",
                    color: inspectedEvent.outcome === "SUCCESS" ? "var(--cash)" : "var(--bad)",
                  }}
                >
                  {inspectedEvent.outcome}
                </strong>
              </div>
              <div>
                <span className="muted">Actor Name:</span>
                <strong style={{ display: "block", color: "var(--deep)" }}>
                  {inspectedEvent.actorName || "Unauthenticated Client"}
                </strong>
              </div>
              <div>
                <span className="muted">Client IP Address:</span>
                <strong style={{ display: "block", color: "var(--deep)", fontFamily: "monospace" }}>
                  {inspectedEvent.ipAddress || "—"}
                </strong>
              </div>
              <div>
                <span className="muted">Timestamp:</span>
                <strong style={{ display: "block", color: "var(--deep)" }}>
                  {inspectedEvent.createdAt ? new Date(inspectedEvent.createdAt).toLocaleString() : "—"}
                </strong>
              </div>
              <div>
                <span className="muted">Request Endpoint:</span>
                <strong style={{ display: "block", color: "var(--deep)", wordBreak: "break-all" }}>
                  {inspectedEvent.requestPath || "—"}
                </strong>
              </div>
            </div>

            <div>
              <span className="muted" style={{ fontSize: "12px", display: "block", marginBottom: "4px", fontWeight: 700 }}>
                CORRELATION &amp; TRACE IDENTIFIER
              </span>
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid var(--line)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontSize: "12px",
                  fontFamily: "monospace",
                  color: "var(--deep)",
                }}
              >
                {inspectedEvent.correlationId || "No correlation UUID attached"}
              </div>
            </div>

            {inspectedEvent.details && (
              <div>
                <span className="muted" style={{ fontSize: "12px", display: "block", marginBottom: "4px", fontWeight: 700 }}>
                  SANITIZED EVENT METADATA
                </span>
                <pre
                  style={{
                    background: "var(--surface-low)",
                    border: "1px solid var(--line)",
                    borderRadius: "8px",
                    padding: "12px",
                    fontSize: "12px",
                    overflowX: "auto",
                    margin: 0,
                  }}
                >
                  {typeof inspectedEvent.details === "object"
                    ? JSON.stringify(inspectedEvent.details, null, 2)
                    : String(inspectedEvent.details)}
                </pre>
              </div>
            )}

            <button
              className="btn btn-outline"
              onClick={() => setInspectedEvent(null)}
              style={{ width: "100%" }}
            >
              Close Event Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
