import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { listUsers, createStaffUser, setUserActive } from "../../api/userApi";
import { listStaff } from "../../api/staffApi";
import { getApiErrorMessage } from "../../api/apiError";

export default function TeamPage() {
  const { user, enableStaff } = useAuth();
  const isOwner = user?.role === "OWNER" || user?.role === "ADMIN";

  // Data states
  const [users, setUsers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Create Staff Login Form
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [loginMobile, setLoginMobile] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [userRole, setUserRole] = useState("STAFF");
  const [userSubmitting, setUserSubmitting] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [uRes, sRes] = await Promise.allSettled([listUsers(), listStaff()]);

      if (uRes.status === "fulfilled") {
        const raw = uRes.value.data?.data || uRes.value.data || [];
        setUsers(Array.isArray(raw) ? raw : []);
      }

      if (sRes.status === "fulfilled") {
        const raw = sRes.value.data?.data || sRes.value.data || [];
        setStaff(Array.isArray(raw) ? raw : []);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load team accounts."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Filter available staff who do not yet have a login account
  const linkedStaffIds = useMemo(() => {
    return new Set(users.filter((u) => u.staffId).map((u) => u.staffId));
  }, [users]);

  const availableStaff = useMemo(() => {
    return staff.filter((s) => s.active && !linkedStaffIds.has(s.id));
  }, [staff, linkedStaffIds]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      return (
        !q ||
        u.name?.toLowerCase().includes(q) ||
        u.mobile?.includes(q) ||
        u.role?.toLowerCase().includes(q)
      );
    });
  }, [users, searchQuery]);

  // Handle Create Staff Login
  async function handleCreateUserSubmit(e) {
    e.preventDefault();
    if (!selectedStaffId) {
      setError("Please select an active staff member to link.");
      return;
    }

    if (loginMobile.replace(/\D/g, "").length !== 10) {
      setError("Please enter a valid 10-digit mobile number for login.");
      return;
    }

    if (loginPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setUserSubmitting(true);
    setError("");
    setMessage("");

    try {
      await createStaffUser({
        staffId: selectedStaffId,
        mobile: loginMobile.trim(),
        password: loginPassword,
        role: userRole,
      });

      setMessage("✓ Staff counter login account created successfully.");
      setSelectedStaffId("");
      setLoginMobile("");
      setLoginPassword("");
      await loadData();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create staff login account."));
    } finally {
      setUserSubmitting(false);
    }
  }

  // Toggle User Active Status
  async function handleToggleActive(targetUser) {
    if (!isOwner) {
      setError("Only store owners can enable or disable user accounts.");
      return;
    }

    const nextState = !targetUser.active;
    const actionLabel = nextState ? "Enable" : "Disable";

    if (!window.confirm(`${actionLabel} login access for "${targetUser.name}"?`)) {
      return;
    }

    try {
      await setUserActive(targetUser.id, nextState);
      setMessage(`User "${targetUser.name}" has been ${nextState ? "enabled" : "disabled"}.`);
      await loadData();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update user status."));
    }
  }

  // Auto-fill mobile when staff member is selected
  const handleStaffSelect = (staffId) => {
    setSelectedStaffId(staffId);
    const found = staff.find((s) => String(s.id) === String(staffId));
    if (found?.mobile) {
      setLoginMobile(found.mobile);
    }
  };

  return (
    <div className="team-page-root">
      {/* Top Header Card */}
      <div className="closing-header-card">
        <div>
          <div className="eyebrow" style={{ marginBottom: "6px" }}>
            SECURITY &amp; ACCESS CONTROL
          </div>
          <h1 style={{ fontSize: "24px", color: "var(--deep)" }}>
            Team Management &amp; Permissions
          </h1>
          <p className="muted" style={{ fontSize: "13.5px" }}>
            Create multi-user counter credentials, configure role authorizations, and toggle counter access.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {enableStaff && (
            <Link className="btn btn-outline" to="/staff">
              👤 Staff &amp; Commissions
            </Link>
          )}
          <Link className="btn btn-tonal" to="/audit">
            🛡️ Security Audit Logs
          </Link>
        </div>
      </div>

      {error && <div className="alert-banner error" style={{ marginBottom: "16px" }}>{error}</div>}
      {message && <div className="alert-banner info" style={{ marginBottom: "16px" }}>{message}</div>}

      {/* Main 2-Column Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 400px) 1fr", gap: "20px", alignItems: "start" }}>
        {/* ================= COLUMN 1: CREATE STAFF LOGIN ================= */}
        <div className="card" style={{ padding: "24px" }}>
          <div className="eyebrow" style={{ marginBottom: "4px" }}>COUNTER CREDENTIALS</div>
          <h2 style={{ fontSize: "18px", color: "var(--deep)", margin: "0 0 14px" }}>
            Create Staff Account
          </h2>
          <p className="muted" style={{ fontSize: "13px", marginBottom: "16px" }}>
            Link an existing seller to a secure 10-digit mobile login for counter operations.
          </p>

          <form onSubmit={handleCreateUserSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="input-group">
              <label htmlFor="staff-picker">Select Staff Member *</label>
              <select
                id="staff-picker"
                required
                value={selectedStaffId}
                onChange={(e) => handleStaffSelect(e.target.value)}
              >
                <option value="">-- Choose Active Staff --</option>
                {availableStaff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.mobile ? `(${s.mobile})` : ""}
                  </option>
                ))}
              </select>
              {availableStaff.length === 0 && (
                <small className="muted" style={{ fontSize: "11.5px", marginTop: "4px" }}>
                  {enableStaff ? (
                    <>
                      All active staff members currently have credentials assigned. Add more via{" "}
                      <Link to="/staff" style={{ color: "var(--brand)", fontWeight: 700 }}>
                        Staff Management
                      </Link>
                      .
                    </>
                  ) : (
                    "No staff members available."
                  )}
                </small>
              )}
            </div>

            <div className="input-group">
              <label htmlFor="user-mobile-input">Login Mobile Number (10 digits) *</label>
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
                  id="user-mobile-input"
                  required
                  type="tel"
                  maxLength={10}
                  placeholder="9876543210"
                  value={loginMobile}
                  onChange={(e) => setLoginMobile(e.target.value.replace(/\D/g, ""))}
                  style={{ borderRadius: "0 8px 8px 0" }}
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="user-pass-input">Temporary Password *</label>
              <input
                id="user-pass-input"
                required
                type="password"
                minLength={8}
                placeholder="Minimum 8 characters"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label htmlFor="user-role-select">Assigned Role *</label>
              <select
                id="user-role-select"
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
              >
                <option value="STAFF">Counter Cashier / Seller (STAFF)</option>
                <option value="ADMIN">Store Manager (ADMIN)</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={userSubmitting || !selectedStaffId}
            >
              {userSubmitting ? "Creating Login..." : "Create Counter Login"}
            </button>
          </form>
        </div>

        {/* ================= COLUMN 2: APPLICATION USERS LIST ================= */}
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h2 style={{ fontSize: "18px", color: "var(--deep)", margin: 0 }}>
                Active Users ({users.length})
              </h2>
              <span className="muted" style={{ fontSize: "12.5px" }}>
                Authorized counter and manager accounts
              </span>
            </div>

            <div className="pos-search-bar" style={{ minWidth: "220px" }}>
              <span className="pos-search-icon" aria-hidden="true">🔍</span>
              <input
                placeholder="Search user, mobile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User / Name</th>
                  <th>Login Mobile</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th style={{ textAlign: "center" }}>Access Control</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "36px" }}>
                      <div className="loading" style={{ minHeight: "60px" }}>Loading team members...</div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "36px" }} className="muted">
                      No team members match the search.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = u.id === user?.id;
                    const isStaffRole = u.role === "STAFF" || u.role === "CASHIER";

                    return (
                      <tr key={u.id} className="product-table-row">
                        <td>
                          <strong style={{ display: "block", color: "var(--deep)", fontSize: "14px" }}>
                            {u.name} {isSelf && <span style={{ color: "var(--brand)", fontSize: "11px" }}>(You)</span>}
                          </strong>
                          {u.staffId && (
                            <small style={{ color: "var(--mute)", fontSize: "11.5px" }}>
                              Linked Seller Profile
                            </small>
                          )}
                        </td>
                        <td style={{ fontWeight: 600 }}>{u.mobile}</td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              background: u.role === "OWNER" ? "var(--tint)" : "var(--surface-low)",
                              color: u.role === "OWNER" ? "var(--brand)" : "var(--deep)",
                              fontWeight: 700,
                            }}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`product-status-chip ${u.active ? "active" : "low-stock"}`}
                          >
                            {u.active ? "✓ Active" : "🚫 Disabled"}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {isOwner && isStaffRole && !isSelf ? (
                            <button
                              className={`btn btn-sm ${u.active ? "btn-outline" : "btn-tonal"}`}
                              onClick={() => handleToggleActive(u)}
                            >
                              {u.active ? "Disable Access" : "Enable Access"}
                            </button>
                          ) : (
                            <span className="muted" style={{ fontSize: "12px" }}>
                              {u.role === "OWNER" ? "Protected" : "Managed"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Role-Based Permissions Policy Matrix */}
      <div className="card" style={{ marginTop: "24px", padding: "24px" }}>
        <div className="eyebrow" style={{ marginBottom: "6px" }}>AUTHORIZATION MATRIX</div>
        <h2 style={{ fontSize: "18px", color: "var(--deep)", margin: "0 0 16px" }}>
          Role-Based Access Control Policy
        </h2>

        <div className="table-wrap">
          <table>
            <thead style={{ background: "var(--surface-low)" }}>
              <tr>
                <th>System Module / Capability</th>
                <th style={{ textAlign: "center" }}>Store Owner (OWNER)</th>
                <th style={{ textAlign: "center" }}>Counter Seller / Staff (STAFF)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Point of Sale (POS) Billing &amp; Counter Checkout</strong></td>
                <td style={{ textAlign: "center", color: "var(--cash)", fontWeight: 700 }}>✓ Full Access</td>
                <td style={{ textAlign: "center", color: "var(--cash)", fontWeight: 700 }}>✓ Full Access</td>
              </tr>
              <tr>
                <td><strong>Catalogue &amp; Real-time Stock Quantities</strong></td>
                <td style={{ textAlign: "center", color: "var(--cash)", fontWeight: 700 }}>✓ Full Access</td>
                <td style={{ textAlign: "center", color: "var(--cash)", fontWeight: 700 }}>✓ View Only</td>
              </tr>
              <tr>
                <td><strong>Customer Udhar Khata Ledger</strong></td>
                <td style={{ textAlign: "center", color: "var(--cash)", fontWeight: 700 }}>✓ Full Access</td>
                <td style={{ textAlign: "center", color: "var(--cash)", fontWeight: 700 }}>✓ View &amp; Charge</td>
              </tr>
              <tr>
                <td><strong>Stock Adjustments &amp; Receiving Inflow</strong></td>
                <td style={{ textAlign: "center", color: "var(--cash)", fontWeight: 700 }}>✓ Full Access</td>
                <td style={{ textAlign: "center", color: "var(--bad)", fontWeight: 700 }}>✗ Restricted</td>
              </tr>
              <tr>
                <td><strong>Financial P&amp;L Statements &amp; PDF Reports</strong></td>
                <td style={{ textAlign: "center", color: "var(--cash)", fontWeight: 700 }}>✓ Full Access</td>
                <td style={{ textAlign: "center", color: "var(--bad)", fontWeight: 700 }}>✗ Restricted</td>
              </tr>
              <tr>
                <td><strong>Supplier Purchases &amp; Payables</strong></td>
                <td style={{ textAlign: "center", color: "var(--cash)", fontWeight: 700 }}>✓ Full Access</td>
                <td style={{ textAlign: "center", color: "var(--bad)", fontWeight: 700 }}>✗ Restricted</td>
              </tr>
              <tr>
                <td><strong>Staff Commission Administration &amp; Payouts</strong></td>
                <td style={{ textAlign: "center", color: "var(--cash)", fontWeight: 700 }}>✓ Full Access</td>
                <td style={{ textAlign: "center", color: "var(--bad)", fontWeight: 700 }}>✗ Restricted</td>
              </tr>
              <tr>
                <td><strong>Team Credentials &amp; Access Controls</strong></td>
                <td style={{ textAlign: "center", color: "var(--cash)", fontWeight: 700 }}>✓ Full Access</td>
                <td style={{ textAlign: "center", color: "var(--bad)", fontWeight: 700 }}>✗ Restricted</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: "14px", background: "var(--surface-low)", padding: "12px 16px", borderRadius: "8px", fontSize: "12.5px", color: "var(--mute)" }}>
          🛡️ <strong>Security Enforcement:</strong> Frontend navigation and button visibility provide ergonomic clarity. The backend Spring Boot security filters independently authenticate each JWT session token and enforce role policies at the API layer.
        </div>
      </div>
    </div>
  );
}
