import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getNotifications,
  sendNotification,
  retryNotification,
} from "../../api/notificationApi";
import { getApiErrorMessage } from "../../api/apiError";

export default function NotificationsPage() {
  const { user, enableUdhar } = useAuth();
  const isOwner = user?.role === "OWNER" || user?.role === "ADMIN";

  // Data states
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // 'ALL' | 'SENT' | 'QUEUED' | 'FAILED'
  const [channelFilter, setChannelFilter] = useState("ALL"); // 'ALL' | 'WHATSAPP' | 'SMS'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Compose / Queue Notification Form
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [form, setForm] = useState({
    channel: "WHATSAPP",
    type: "UDHAR_REMINDER",
    recipient: "",
    subject: "DukanKhata Notification",
    message: "",
  });
  const [sending, setSending] = useState(false);

  // Detail Modal
  const [inspectedNotification, setInspectedNotification] = useState(null);
  const [retryingId, setRetryingId] = useState(null);

  // Load notifications
  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const data = await getNotifications();
      const raw = Array.isArray(data) ? data : data?.data || [];
      setItems(raw);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load notification queue records."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((n) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        n.recipient?.includes(q) ||
        n.subject?.toLowerCase().includes(q) ||
        n.type?.toLowerCase().includes(q) ||
        n.message?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (statusFilter !== "ALL" && n.status !== statusFilter) return false;
      if (channelFilter !== "ALL" && n.channel !== channelFilter) return false;

      return true;
    });
  }, [items, searchQuery, statusFilter, channelFilter]);

  // Aggregate Metrics
  const totalSent = useMemo(() => items.filter((n) => n.status === "SENT").length, [items]);
  const totalFailed = useMemo(() => items.filter((n) => n.status === "FAILED").length, [items]);
  const totalQueued = useMemo(() => items.filter((n) => n.status === "QUEUED" || n.status === "PENDING").length, [items]);

  // Paginated rows
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;

  // Submit Compose Notification
  async function handleComposeSubmit(e) {
    e.preventDefault();
    if (form.recipient.replace(/\D/g, "").length < 10) {
      setError("Please enter a valid 10-digit recipient phone number.");
      return;
    }

    if (!form.message.trim()) {
      setError("Notification message body cannot be blank.");
      return;
    }

    setSending(true);
    setError("");
    setMessage("");

    try {
      await sendNotification({
        ...form,
        recipient: form.recipient.trim(),
        message: form.message.trim(),
      });

      setMessage(`✓ ${form.channel} message queued for dispatch to +91 ${form.recipient}.`);
      setForm({
        channel: "WHATSAPP",
        type: "UDHAR_REMINDER",
        recipient: "",
        subject: "DukanKhata Notification",
        message: "",
      });
      setShowComposeModal(false);
      await loadData();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to queue notification."));
    } finally {
      setSending(false);
    }
  }

  // Retry Failed Notification
  async function handleRetry(id, e) {
    if (e) e.stopPropagation();
    setRetryingId(id);
    setError("");
    setMessage("");

    try {
      await retryNotification(id);
      setMessage("✓ Notification retry dispatched to message broker.");
      await loadData();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to retry notification."));
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <div className="notifications-page-root">
      {/* Top Header Card */}
      <div className="closing-header-card">
        <div>
          <div className="eyebrow" style={{ marginBottom: "6px" }}>
            MESSAGING &amp; COMMUNICATIONS
          </div>
          <h1 style={{ fontSize: "24px", color: "var(--deep)" }}>
            Notifications &amp; Message Queue
          </h1>
          <p className="muted" style={{ fontSize: "13.5px" }}>
            Track WhatsApp and SMS delivery status, monitor delivery attempts, and manage customer communications.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {isOwner && (
            <button className="btn btn-primary" onClick={() => setShowComposeModal(true)}>
              ✉️ + Compose Message
            </button>
          )}
          {enableUdhar && (
            <Link className="btn btn-tonal" to="/customers">
              📒 Customer Khata
            </Link>
          )}
        </div>
      </div>

      {error && <div className="alert-banner error" style={{ marginBottom: "16px" }}>{error}</div>}
      {message && <div className="alert-banner info" style={{ marginBottom: "16px" }}>{message}</div>}

      {/* Aggregate KPI Summary Cards */}
      <div className="dashboard-metrics-grid" style={{ marginBottom: "20px" }}>
        <div className="dashboard-metric-card">
          <span className="metric-label">Total Messages</span>
          <div className="metric-value">{items.length} Logged</div>
          <div className="metric-sub">Lifetime queued communications</div>
        </div>

        <div className="dashboard-metric-card">
          <span className="metric-label">Dispatched &amp; Sent</span>
          <div className="metric-value" style={{ color: "var(--cash)" }}>
            {totalSent} Sent
          </div>
          <div className="metric-sub">Provider confirmed delivery</div>
        </div>

        <div className="dashboard-metric-card">
          <span className="metric-label">In Queue / Processing</span>
          <div className="metric-value" style={{ color: "var(--brand)" }}>
            {totalQueued} Queued
          </div>
          <div className="metric-sub">Awaiting gateway transmission</div>
        </div>

        <div className="dashboard-metric-card">
          <span className="metric-label">Delivery Failures</span>
          <div
            className="metric-value"
            style={{ color: totalFailed > 0 ? "var(--bad)" : "var(--deep)" }}
          >
            {totalFailed} Failed
          </div>
          <div className="metric-sub">Eligible for manual retry</div>
        </div>
      </div>

      {/* Main Delivery Table Card */}
      <div className="card">
        {/* Search and Filters */}
        <div className="products-filter-header">
          <div className="history-preset-chips">
            <button
              className={`preset-chip ${statusFilter === "ALL" ? "active" : ""}`}
              onClick={() => {
                setStatusFilter("ALL");
                setCurrentPage(1);
              }}
            >
              All ({items.length})
            </button>
            <button
              className={`preset-chip ${statusFilter === "SENT" ? "active" : ""}`}
              onClick={() => {
                setStatusFilter("SENT");
                setCurrentPage(1);
              }}
            >
              ✓ Sent ({totalSent})
            </button>
            <button
              className={`preset-chip ${statusFilter === "QUEUED" ? "active" : ""}`}
              onClick={() => {
                setStatusFilter("QUEUED");
                setCurrentPage(1);
              }}
            >
              ⏳ Queued ({totalQueued})
            </button>
            <button
              className={`preset-chip ${statusFilter === "FAILED" ? "active" : ""}`}
              onClick={() => {
                setStatusFilter("FAILED");
                setCurrentPage(1);
              }}
            >
              ⚠️ Failed ({totalFailed})
            </button>

            <select
              value={channelFilter}
              onChange={(e) => {
                setChannelFilter(e.target.value);
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
              <option value="ALL">All Channels</option>
              <option value="WHATSAPP">📱 WhatsApp</option>
              <option value="SMS">💬 SMS</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <div className="pos-search-bar" style={{ minWidth: "240px" }}>
              <span className="pos-search-icon" aria-hidden="true">🔍</span>
              <input
                placeholder="Search phone, subject, type..."
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

            <button
              className="btn btn-sm btn-outline"
              onClick={loadData}
              disabled={loading}
              title="Refresh messages"
            >
              🔄
            </button>
          </div>
        </div>

        {/* Notifications Table */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Channel &amp; Type</th>
                <th>Recipient Mobile</th>
                <th>Subject / Purpose</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>Queued At</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "36px" }}>
                    <div className="loading" style={{ minHeight: "60px" }}>Loading message queue...</div>
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "36px" }} className="muted">
                    No notification records match the selected filter.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((n) => {
                  const isSent = n.status === "SENT";
                  const isFailed = n.status === "FAILED";
                  const isWhatsApp = n.channel === "WHATSAPP";

                  return (
                    <tr
                      key={n.id}
                      className="product-table-row"
                      style={{ cursor: "pointer" }}
                      onClick={() => setInspectedNotification(n)}
                    >
                      <td>
                        <strong style={{ display: "block", color: "var(--deep)", fontSize: "13.5px" }}>
                          {isWhatsApp ? "📱 WhatsApp" : "💬 SMS"} • {n.type}
                        </strong>
                        <small style={{ color: "var(--mute)", fontSize: "11px" }}>
                          Provider: {n.provider || "Gateway"}
                        </small>
                      </td>
                      <td style={{ fontWeight: 600 }}>+91 {n.recipient}</td>
                      <td>
                        <span style={{ fontSize: "13px", color: "var(--deep)" }}>
                          {n.subject || "Store Notification"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`product-status-chip ${
                            isSent ? "active" : isFailed ? "low-stock" : "inactive"
                          }`}
                        >
                          {isSent ? "✓ SENT" : isFailed ? "⚠️ FAILED" : "⏳ QUEUED"}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "13px", color: "var(--mute)" }}>
                          {n.attempts || 1} attempt{Number(n.attempts || 1) === 1 ? "" : "s"}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "12.5px", color: "var(--mute)" }}>
                          {n.createdAt ? new Date(n.createdAt).toLocaleString() : "—"}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => setInspectedNotification(n)}
                            title="Inspect message payload"
                          >
                            👁️ View
                          </button>
                          {isFailed && (
                            <button
                              className="btn btn-sm btn-tonal"
                              onClick={(e) => handleRetry(n.id, e)}
                              disabled={retryingId === n.id}
                              title="Retry failed message"
                            >
                              {retryingId === n.id ? "Retrying..." : "🔄 Retry"}
                            </button>
                          )}
                        </div>
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
              {Math.min(currentPage * pageSize, filteredItems.length)} of{" "}
              {filteredItems.length} messages
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
            </div>
          </div>
        )}
      </div>

      {/* Advisory Notice */}
      <div style={{ marginTop: "20px", background: "var(--surface-low)", padding: "14px 18px", borderRadius: "8px", fontSize: "12.5px", color: "var(--mute)", border: "1px solid var(--line)" }}>
        💡 <strong>Delivery Transparency Policy:</strong> Notification records reflect gateway queue and dispatch responses. A message marked as <code>QUEUED</code> indicates successful job submission, while <code>SENT</code> indicates confirmed delivery handshake from the SMS/WhatsApp provider.
      </div>

      {/* ================= MODAL 1: COMPOSE NOTIFICATION ================= */}
      {showComposeModal && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setShowComposeModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="compose-modal-title"
        >
          <div className="inventory-drawer-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "12px" }}>
              <div>
                <span className="eyebrow" style={{ marginBottom: "4px" }}>DISPATCH MESSAGE</span>
                <h3 id="compose-modal-title" style={{ fontSize: "19px", color: "var(--deep)", margin: 0 }}>
                  Queue Customer Notification
                </h3>
              </div>
              <button className="btn btn-sm btn-outline" onClick={() => setShowComposeModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleComposeSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="input-group">
                  <label>Channel *</label>
                  <select
                    value={form.channel}
                    onChange={(e) => setForm({ ...form, channel: e.target.value })}
                  >
                    <option value="WHATSAPP">📱 WhatsApp Message</option>
                    <option value="SMS">💬 SMS Text</option>
                  </select>
                </div>

                <div className="input-group">
                  <label>Notification Type *</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    <option value="UDHAR_REMINDER">Udhar Reminder</option>
                    <option value="INVOICE">Invoice Receipt</option>
                    <option value="PAYMENT_RECEIPT">Payment Confirmation</option>
                    <option value="LOW_STOCK">Low Stock Alert</option>
                    <option value="SUPPLIER_PAYMENT">Supplier Payout</option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="compose-phone-input">Recipient Mobile (10 digits) *</label>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span
                    style={{
                      padding: "0 12px",
                      background: "var(--surface-low)",
                      border: "1.5px solid var(--line)",
                      borderRight: "none",
                      borderRadius: "8px 0 0 8px",
                      fontSize: "13.5px",
                      fontWeight: 700,
                      height: "42px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    +91
                  </span>
                  <input
                    id="compose-phone-input"
                    required
                    type="tel"
                    maxLength={10}
                    placeholder="9876543210"
                    value={form.recipient}
                    onChange={(e) => setForm({ ...form, recipient: e.target.value.replace(/\D/g, "") })}
                    style={{ borderRadius: "0 8px 8px 0" }}
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="compose-subject-input">Message Subject *</label>
                <input
                  id="compose-subject-input"
                  required
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label htmlFor="compose-body-input">Message Content *</label>
                <textarea
                  id="compose-body-input"
                  required
                  rows={5}
                  placeholder="Namaste, this is a message from DukanKhata Store..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "13px" }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => setShowComposeModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={sending}
                >
                  {sending ? "Queuing..." : "Queue & Send"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: INSPECT NOTIFICATION ================= */}
      {inspectedNotification && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setInspectedNotification(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="inspect-notif-title"
        >
          <div className="inventory-drawer-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "580px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "12px" }}>
              <div>
                <span className="eyebrow" style={{ marginBottom: "4px" }}>DISPATCH INSPECTION</span>
                <h3 id="inspect-notif-title" style={{ fontSize: "19px", color: "var(--deep)", margin: 0 }}>
                  Notification #{inspectedNotification.id}
                </h3>
              </div>
              <button className="btn btn-sm btn-outline" onClick={() => setInspectedNotification(null)}>
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", background: "var(--surface-low)", padding: "12px 16px", borderRadius: "8px", fontSize: "13px" }}>
              <div>
                <span className="muted">Channel:</span>
                <strong style={{ display: "block", color: "var(--deep)" }}>
                  {inspectedNotification.channel} ({inspectedNotification.type})
                </strong>
              </div>
              <div>
                <span className="muted">Recipient:</span>
                <strong style={{ display: "block", color: "var(--deep)" }}>
                  +91 {inspectedNotification.recipient}
                </strong>
              </div>
              <div>
                <span className="muted">Status:</span>
                <strong
                  style={{
                    display: "block",
                    color:
                      inspectedNotification.status === "SENT"
                        ? "var(--cash)"
                        : inspectedNotification.status === "FAILED"
                        ? "var(--bad)"
                        : "var(--brand)",
                  }}
                >
                  {inspectedNotification.status}
                </strong>
              </div>
              <div>
                <span className="muted">Created At:</span>
                <strong style={{ display: "block", color: "var(--deep)" }}>
                  {inspectedNotification.createdAt
                    ? new Date(inspectedNotification.createdAt).toLocaleString()
                    : "—"}
                </strong>
              </div>
            </div>

            <div>
              <span className="muted" style={{ fontSize: "12px", display: "block", marginBottom: "4px", fontWeight: 700 }}>
                DISPATCHED MESSAGE BODY
              </span>
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid var(--line)",
                  borderRadius: "8px",
                  padding: "14px",
                  fontSize: "13.5px",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.6,
                }}
              >
                {inspectedNotification.message || inspectedNotification.subject || "No content body recorded."}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className="btn btn-outline"
                style={{ flex: 1 }}
                onClick={() => setInspectedNotification(null)}
              >
                Close
              </button>
              {inspectedNotification.status === "FAILED" && (
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    const id = inspectedNotification.id;
                    setInspectedNotification(null);
                    handleRetry(id);
                  }}
                >
                  🔄 Retry Dispatch
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
