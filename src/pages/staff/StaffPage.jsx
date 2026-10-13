import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  listStaff,
  createStaff,
  updateStaff,
  deactivateStaff,
  getStaffLedger,
  payoutStaff,
} from "../../api/staffApi";
import { getApiErrorMessage } from "../../api/apiError";
import { newIdempotencyKey } from "../../api/idempotency";

function formatMoney(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function StaffPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER" || user?.role === "ADMIN";

  // Data states
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffLedger, setStaffLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterActive, setFilterActive] = useState("ALL"); // 'ALL' | 'ACTIVE' | 'INACTIVE'

  // Staff Modal (Create / Edit)
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [staffForm, setStaffForm] = useState({
    name: "",
    mobile: "",
    commissionRate: "2.0",
    role: "SELLER",
    active: true,
  });
  const [staffSubmitting, setStaffSubmitting] = useState(false);

  // Payout Modal
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("CASH");
  const [payoutNotes, setPayoutNotes] = useState("");
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);

  // Load staff list
  async function loadStaffData(keepSelectedId = null) {
    setLoading(true);
    setError("");
    try {
      const res = await listStaff();
      const raw = res.data?.data || res.data || [];
      const clean = Array.isArray(raw) ? raw : [];
      setStaffList(clean);

      const targetId = keepSelectedId || selectedStaff?.id;
      if (targetId) {
        const found = clean.find((s) => s.id === targetId);
        if (found) {
          setSelectedStaff(found);
          await loadLedger(found.id);
        }
      } else if (clean.length > 0 && !selectedStaff) {
        setSelectedStaff(clean[0]);
        await loadLedger(clean[0].id);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load staff directory."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStaffData();
  }, []);

  // Load ledger
  async function loadLedger(staffId) {
    if (!staffId) return;
    setLedgerLoading(true);
    try {
      const res = await getStaffLedger(staffId);
      const raw = res.data?.data || res.data || [];
      setStaffLedger(Array.isArray(raw) ? raw : []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load commission statement ledger."));
    } finally {
      setLedgerLoading(false);
    }
  }

  const handleSelectStaff = (s) => {
    setSelectedStaff(s);
    setError("");
    setMessage("");
    loadLedger(s.id);
  };

  // Filtered Staff
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name?.toLowerCase().includes(q) ||
        s.mobile?.includes(q) ||
        String(s.id).includes(q);

      if (!matchesSearch) return false;

      if (filterActive === "ACTIVE" && !s.active) return false;
      if (filterActive === "INACTIVE" && s.active) return false;
      return true;
    });
  }, [staffList, searchQuery, filterActive]);

  // Aggregate Metrics
  const totalPayableCommission = useMemo(() => {
    return staffList.reduce(
      (acc, s) => acc + Math.max(0, Number(s.payable || s.payableCommission || 0)),
      0
    );
  }, [staffList]);

  const activeStaffCount = useMemo(() => {
    return staffList.filter((s) => s.active).length;
  }, [staffList]);

  // ================= STAFF CRUD =================
  const openAddStaff = () => {
    setEditingStaffId(null);
    setStaffForm({
      name: "",
      mobile: "",
      commissionRate: "2.0",
      role: "SELLER",
      active: true,
    });
    setError("");
    setMessage("");
    setShowStaffModal(true);
  };

  const openEditStaff = (s, e) => {
    if (e) e.stopPropagation();
    setEditingStaffId(s.id);
    setStaffForm({
      name: s.name || "",
      mobile: s.mobile || "",
      commissionRate: String(s.commissionRate ?? "2.0"),
      role: s.role || "SELLER",
      active: s.active !== false,
    });
    setError("");
    setMessage("");
    setShowStaffModal(true);
  };

  async function handleStaffFormSubmit(e) {
    e.preventDefault();
    if (!staffForm.name.trim()) {
      setError("Staff name is required.");
      return;
    }

    const rateNum = Number(staffForm.commissionRate || 0);
    if (rateNum < 0 || rateNum > 100) {
      setError("Commission rate must be between 0% and 100%.");
      return;
    }

    setStaffSubmitting(true);
    setError("");
    setMessage("");

    try {
      if (editingStaffId) {
        await updateStaff(editingStaffId, {
          ...staffForm,
          commissionRate: rateNum,
        });
        setMessage(`Staff "${staffForm.name}" updated successfully.`);
      } else {
        const res = await createStaff({
          ...staffForm,
          commissionRate: rateNum,
        });
        const created = res.data?.data || res.data;
        setMessage(`Staff "${staffForm.name}" created successfully.`);
        if (created?.id) setSelectedStaff(created);
      }
      setShowStaffModal(false);
      await loadStaffData(editingStaffId);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save staff record."));
    } finally {
      setStaffSubmitting(false);
    }
  }

  async function handleDeactivateStaff(s, e) {
    if (e) e.stopPropagation();
    if (!isOwner) {
      setError("Only store owners are authorized to deactivate staff.");
      return;
    }

    const payable = Number(s.payable || 0);
    if (payable > 0) {
      if (
        !window.confirm(
          `Notice: Staff member "${s.name}" still has an unpaid commission balance of ${formatMoney(
            payable
          )}. Deactivate account anyway?`
        )
      ) {
        return;
      }
    } else {
      if (!window.confirm(`Deactivate staff member "${s.name}"?`)) return;
    }

    try {
      await deactivateStaff(s.id);
      setMessage(`Staff member "${s.name}" deactivated.`);
      await loadStaffData();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to deactivate staff."));
    }
  }

  // ================= COMMISSION PAYOUT =================
  const openPayout = () => {
    if (!selectedStaff) return;
    const pending = Number(selectedStaff.payable || 0);
    setPayoutAmount(pending > 0 ? String(pending) : "");
    setPayoutMethod("CASH");
    setPayoutNotes("");
    setError("");
    setMessage("");
    setShowPayoutModal(true);
  };

  async function handlePayoutSubmit(e) {
    e.preventDefault();
    const amountNum = Number(payoutAmount);
    if (!selectedStaff || amountNum <= 0) {
      setError("Please enter a valid positive payout amount.");
      return;
    }

    const currentPayable = Number(selectedStaff.payable || 0);
    if (amountNum > currentPayable && currentPayable > 0) {
      if (
        !window.confirm(
          `Payout amount (${formatMoney(amountNum)}) exceeds current unpaid commission (${formatMoney(
            currentPayable
          )}). Record as advance commission payout?`
        )
      ) {
        return;
      }
    }

    setPayoutSubmitting(true);
    setError("");
    setMessage("");

    try {
      const idempotencyKey = newIdempotencyKey();
      await payoutStaff(
        selectedStaff.id,
        {
          amount: amountNum,
          paymentMethod: payoutMethod,
          description: payoutNotes.trim() || `Commission payout via ${payoutMethod}`,
        },
        idempotencyKey
      );

      setMessage(
        `✓ Payout of ${formatMoney(amountNum)} disbursed to "${selectedStaff.name}".`
      );
      setShowPayoutModal(false);
      await loadStaffData(selectedStaff.id);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to record commission payout."));
    } finally {
      setPayoutSubmitting(false);
    }
  }

  return (
    <div className="staff-page-root">
      {/* Top Header Card */}
      <div className="closing-header-card">
        <div>
          <div className="eyebrow" style={{ marginBottom: "6px" }}>
            STAFF &amp; SELLER COMMISSIONS
          </div>
          <h1 style={{ fontSize: "24px", color: "var(--deep)" }}>
            Staff &amp; Commission Ledger
          </h1>
          <p className="muted" style={{ fontSize: "13.5px" }}>
            Manage staff profiles, track sales commissions, review reversals on returns, and disburse verified payouts.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {isOwner && (
            <button className="btn btn-primary" onClick={openAddStaff}>
              👤 + Add Staff Member
            </button>
          )}
          <Link className="btn btn-outline" to="/team">
            🔑 Team Logins &amp; Roles
          </Link>
        </div>
      </div>

      {error && <div className="alert-banner error" style={{ marginBottom: "16px" }}>{error}</div>}
      {message && <div className="alert-banner info" style={{ marginBottom: "16px" }}>{message}</div>}

      {/* Aggregate KPI Summary Cards */}
      <div className="dashboard-metrics-grid" style={{ marginBottom: "20px" }}>
        <div className="dashboard-metric-card">
          <span className="metric-label">Total Staff</span>
          <div className="metric-value">{staffList.length} Members</div>
          <div className="metric-sub">{activeStaffCount} active sellers</div>
        </div>

        <div className="dashboard-metric-card">
          <span className="metric-label">Outstanding Commissions</span>
          <div
            className="metric-value"
            style={{ color: totalPayableCommission > 0 ? "var(--orange)" : "var(--cash)" }}
          >
            {formatMoney(totalPayableCommission)}
          </div>
          <div className="metric-sub">Pending staff payouts</div>
        </div>

        <div className="dashboard-metric-card">
          <span className="metric-label">Selected Seller Balance</span>
          <div className="metric-value" style={{ color: "var(--brand)" }}>
            {selectedStaff ? formatMoney(selectedStaff.payable || 0) : "₹0.00"}
          </div>
          <div className="metric-sub">{selectedStaff?.name || "No staff selected"}</div>
        </div>

        <div className="dashboard-metric-card">
          <span className="metric-label">Commission Model</span>
          <div className="metric-value" style={{ color: "var(--deep)" }}>
            {selectedStaff ? `${selectedStaff.commissionRate || 0}%` : "—"}
          </div>
          <div className="metric-sub">Billed on POS sales</div>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 380px) 1fr", gap: "20px", alignItems: "start" }}>
        {/* ================= COLUMN 1: STAFF DIRECTORY LIST ================= */}
        <div className="card" style={{ padding: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h2 style={{ fontSize: "17px", color: "var(--deep)", margin: 0 }}>
              Staff Directory ({staffList.length})
            </h2>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => loadStaffData()}
              disabled={loading}
              title="Refresh staff"
            >
              🔄
            </button>
          </div>

          <div className="pos-search-bar" style={{ marginBottom: "12px", width: "100%" }}>
            <span className="pos-search-icon" aria-hidden="true">🔍</span>
            <input
              placeholder="Search staff name, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="history-preset-chips" style={{ marginBottom: "14px" }}>
            <button
              className={`preset-chip ${filterActive === "ALL" ? "active" : ""}`}
              onClick={() => setFilterActive("ALL")}
            >
              All ({staffList.length})
            </button>
            <button
              className={`preset-chip ${filterActive === "ACTIVE" ? "active" : ""}`}
              onClick={() => setFilterActive("ACTIVE")}
            >
              Active ({activeStaffCount})
            </button>
            <button
              className={`preset-chip ${filterActive === "INACTIVE" ? "active" : ""}`}
              onClick={() => setFilterActive("INACTIVE")}
            >
              Inactive
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "560px", overflowY: "auto" }}>
            {loading ? (
              <div className="loading" style={{ minHeight: "100px" }}>Loading staff...</div>
            ) : filteredStaff.length === 0 ? (
              <p className="muted" style={{ padding: "24px 0", textAlign: "center" }}>
                No staff members match the search.
              </p>
            ) : (
              filteredStaff.map((s) => {
                const isSelected = selectedStaff?.id === s.id;
                const payable = Number(s.payable || 0);

                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelectStaff(s)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "var(--radius-sm)",
                      border: `1.5px solid ${isSelected ? "var(--brand)" : "var(--line)"}`,
                      background: isSelected ? "var(--tint)" : "#FFFFFF",
                      cursor: "pointer",
                      transition: "all var(--transition-fast)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <strong style={{ display: "block", color: "var(--deep)", fontSize: "14px" }}>
                        {s.name}
                      </strong>
                      <small style={{ color: "var(--mute)", fontSize: "12px" }}>
                        {s.active ? "✓ Active" : "🚫 Inactive"} • {s.commissionRate || 0}% commission
                      </small>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <strong
                        style={{
                          fontSize: "14.5px",
                          display: "block",
                          color: payable > 0 ? "var(--orange)" : "var(--cash)",
                        }}
                      >
                        {formatMoney(payable)}
                      </strong>
                      <small style={{ color: "var(--mute)", fontSize: "11px" }}>
                        {payable > 0 ? "Pending Payout" : "Settled"}
                      </small>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ================= COLUMN 2: SELECTED STAFF LEDGER & PAYOUT ================= */}
        {selectedStaff ? (
          <div className="card" style={{ padding: "22px" }}>
            {/* Header info */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--line)", paddingBottom: "16px", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <div className="eyebrow" style={{ marginBottom: "4px" }}>COMMISSION ACCOUNT</div>
                <h2 style={{ fontSize: "20px", color: "var(--deep)", margin: 0 }}>
                  {selectedStaff.name}
                </h2>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginTop: "6px", fontSize: "13px", color: "var(--mute)" }}>
                  {selectedStaff.mobile && <span>📱 {selectedStaff.mobile}</span>}
                  <span>Commission Rate: <strong>{selectedStaff.commissionRate || 0}%</strong></span>
                  <span>Status: <strong>{selectedStaff.active ? "Active Seller" : "Inactive"}</strong></span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {isOwner && (
                  <>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={(e) => openEditStaff(selectedStaff, e)}
                    >
                      ✏️ Edit
                    </button>
                    {selectedStaff.active && (
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={(e) => handleDeactivateStaff(selectedStaff, e)}
                        style={{ color: "var(--bad)", borderColor: "var(--line)" }}
                      >
                        🚫 Deactivate
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Pending Payout Banner */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface-low)", padding: "16px 20px", borderRadius: "var(--radius-md)", border: "1px solid var(--line)", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <span className="muted" style={{ fontSize: "13px" }}>Unpaid Pending Commission</span>
                <div style={{ fontSize: "26px", fontWeight: 800, color: Number(selectedStaff.payable || 0) > 0 ? "var(--orange)" : "var(--cash)" }}>
                  {formatMoney(selectedStaff.payable || 0)}
                </div>
              </div>

              {isOwner && (
                <button
                  className="btn btn-primary"
                  onClick={openPayout}
                  disabled={Number(selectedStaff.payable || 0) <= 0}
                >
                  💵 Disburse Payout ({formatMoney(selectedStaff.payable || 0)})
                </button>
              )}
            </div>

            {/* Commission Statement Ledger */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h3 style={{ fontSize: "16px", color: "var(--deep)", margin: 0, fontWeight: 700 }}>
                  Commission Statement &amp; Payout Ledger
                </h3>
                <span className="muted" style={{ fontSize: "12.5px" }}>
                  Chronological Audit Trail
                </span>
              </div>

              {ledgerLoading ? (
                <div className="loading" style={{ minHeight: "140px" }}>
                  Loading commission events...
                </div>
              ) : staffLedger.length === 0 ? (
                <p className="muted" style={{ padding: "36px 0", textAlign: "center" }}>
                  No commission earnings or payout events recorded for this staff member.
                </p>
              ) : (
                <div className="table-wrap" style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-sm)" }}>
                  <table>
                    <thead style={{ background: "var(--surface-low)" }}>
                      <tr>
                        <th>Date &amp; Time</th>
                        <th>Event Type</th>
                        <th>Reference / Description</th>
                        <th style={{ textAlign: "right" }}>Amount (₹)</th>
                        <th style={{ textAlign: "right" }}>Balance After</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffLedger.map((tx) => {
                        const isPayout = tx.type === "PAYOUT" || Number(tx.amount || 0) < 0;
                        const isReversal = tx.type === "COMMISSION_REVERSED" || tx.type === "REVERSAL";

                        return (
                          <tr key={tx.id} className="product-table-row">
                            <td>
                              <span style={{ fontSize: "13px", color: "var(--deep)" }}>
                                {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "—"}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`product-status-chip ${
                                  isPayout ? "active" : isReversal ? "low-stock" : "active"
                                }`}
                              >
                                {tx.type || (isPayout ? "PAYOUT" : "COMMISSION")}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: "13px", color: "var(--mute)" }}>
                                {tx.description || tx.reference || "Commission event"}
                              </span>
                            </td>
                            <td
                              style={{
                                textAlign: "right",
                                fontWeight: 700,
                                color: isPayout ? "var(--bad)" : isReversal ? "var(--bad)" : "var(--cash)",
                              }}
                            >
                              {isPayout
                                ? `- ${formatMoney(tx.amount)}`
                                : `+ ${formatMoney(tx.amount)}`}
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 600, color: "var(--deep)" }}>
                              {formatMoney(tx.balanceAfter)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: "48px", textAlign: "center" }}>
            <p className="muted">Select a staff member on the left to view their commission ledger and disburse payouts.</p>
          </div>
        )}
      </div>

      {/* ================= MODAL 1: ADD / EDIT STAFF ================= */}
      {showStaffModal && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setShowStaffModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="staff-modal-title"
        >
          <div className="inventory-drawer-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "12px" }}>
              <div>
                <span className="eyebrow" style={{ marginBottom: "4px" }}>
                  {editingStaffId ? "EDIT PROFILE" : "NEW STAFF"}
                </span>
                <h3 id="staff-modal-title" style={{ fontSize: "19px", color: "var(--deep)", margin: 0 }}>
                  {editingStaffId ? `Edit: ${staffForm.name}` : "Register New Staff Member"}
                </h3>
              </div>
              <button className="btn btn-sm btn-outline" onClick={() => setShowStaffModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleStaffFormSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="input-group">
                <label htmlFor="staff-name-input">Full Name *</label>
                <input
                  id="staff-name-input"
                  required
                  placeholder="e.g. Suresh Kumar"
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label htmlFor="staff-mobile-input">Mobile Number</label>
                <input
                  id="staff-mobile-input"
                  placeholder="e.g. 9876543210"
                  value={staffForm.mobile}
                  onChange={(e) => setStaffForm({ ...staffForm, mobile: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label htmlFor="staff-rate-input">Commission Percentage (%) *</label>
                <input
                  id="staff-rate-input"
                  required
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="e.g. 2.5"
                  value={staffForm.commissionRate}
                  onChange={(e) => setStaffForm({ ...staffForm, commissionRate: e.target.value })}
                />
                <small className="muted" style={{ fontSize: "11.5px" }}>
                  Earned automatically when selected as salesperson during POS billing.
                </small>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "4px 0" }}>
                <input
                  type="checkbox"
                  id="staff-active-checkbox"
                  checked={staffForm.active}
                  onChange={(e) => setStaffForm({ ...staffForm, active: e.target.checked })}
                  style={{ width: "16px", height: "16px", accentColor: "var(--brand)" }}
                />
                <label htmlFor="staff-active-checkbox" style={{ fontSize: "13px", cursor: "pointer" }}>
                  Active salesperson (eligible for POS assignments)
                </label>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => setShowStaffModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={staffSubmitting}
                >
                  {staffSubmitting ? "Saving..." : editingStaffId ? "Update Profile" : "Register Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: COMMISSION PAYOUT ================= */}
      {showPayoutModal && selectedStaff && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setShowPayoutModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="payout-modal-title"
        >
          <div className="inventory-drawer-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "12px" }}>
              <div>
                <span className="eyebrow gold" style={{ marginBottom: "4px" }}>PAYOUT DISBURSEMENT</span>
                <h3 id="payout-modal-title" style={{ fontSize: "19px", color: "var(--deep)", margin: 0 }}>
                  Disburse Payout: {selectedStaff.name}
                </h3>
              </div>
              <button className="btn btn-sm btn-outline" onClick={() => setShowPayoutModal(false)}>
                ✕
              </button>
            </div>

            <div style={{ background: "var(--surface-low)", padding: "10px 14px", borderRadius: "8px", display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
              <span>Eligible Unpaid Commission:</span>
              <strong style={{ color: "var(--brand)" }}>
                {formatMoney(selectedStaff.payable || 0)}
              </strong>
            </div>

            <form onSubmit={handlePayoutSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="input-group">
                <label htmlFor="payout-amount-input">Payout Amount (₹) *</label>
                <input
                  id="payout-amount-input"
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 1000"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label>Disbursement Method *</label>
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value)}
                >
                  <option value="CASH">💵 Cash (Drawer Cashout)</option>
                  <option value="UPI">📱 UPI / PhonePe / GPay</option>
                  <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
                </select>
              </div>

              <div className="input-group">
                <label htmlFor="payout-notes-input">Payout Remarks (Optional)</label>
                <input
                  id="payout-notes-input"
                  placeholder="e.g. Month-end commission clearance"
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => setShowPayoutModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={payoutSubmitting}
                >
                  {payoutSubmitting ? "Disbursing..." : "Confirm & Pay"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
