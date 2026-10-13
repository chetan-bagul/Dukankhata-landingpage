import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  listCustomers,
  createCustomer,
  updateCustomer,
  deactivateCustomer,
  getLedger,
  addCharge,
  addPayment,
} from "../../api/customerApi";
import { getApiErrorMessage } from "../../api/apiError";
import { newIdempotencyKey } from "../../api/idempotency";
import {
  getCached,
  setCached,
  CACHE_KEYS,
  TTL,
} from "../../services/cacheService";

function formatMoney(n) {
  const abs = Math.abs(Number(n || 0));
  return `₹${abs.toLocaleString("en-IN", {
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

export default function CustomersPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER" || user?.role === "ADMIN";

  // Fast L1/L2 Cache Initializer (0ms instant mount)
  const cachedCusts = getCached(CACHE_KEYS.CUSTOMERS)?.data;
  const initialCustomers = Array.isArray(cachedCusts) ? cachedCusts : [];

  // Data states
  const [customers, setCustomers] = useState(() => initialCustomers);
  const [selectedCustomer, setSelectedCustomer] = useState(() => initialCustomers[0] || null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [loading, setLoading] = useState(() => initialCustomers.length === 0);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState("ALL"); // 'ALL' | 'UDHAR' | 'SETTLED' | 'ADVANCE'

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerForm, setCustomerForm] = useState({
    name: "",
    mobile: "",
    address: "",
  });
  const [customerSubmitting, setCustomerSubmitting] = useState(false);

  // Transaction Action Modal ('CHARGE' | 'PAYMENT' | 'ADVANCE')
  const [txModalMode, setTxModalMode] = useState(null);
  const [txAmount, setTxAmount] = useState("");
  const [txDescription, setTxDescription] = useState("");
  const [txPaymentMethod, setTxPaymentMethod] = useState("CASH");
  const [txReference, setTxReference] = useState("");
  const [txSubmitting, setTxSubmitting] = useState(false);

  // Load Customers
  async function loadCustomersData(keepSelectedId = null) {
    if (customers.length === 0) setLoading(true);
    setError("");
    try {
      const data = await listCustomers();
      const rawList = Array.isArray(data)
        ? data
        : data?.data || data?.customers || [];
      setCustomers(rawList);
      setCached(CACHE_KEYS.CUSTOMERS, rawList, TTL.CUSTOMERS);

      const targetId = keepSelectedId || selectedCustomer?.id;
      if (targetId) {
        const found = rawList.find((c) => String(c.id) === String(targetId));
        if (found) {
          setSelectedCustomer(found);
          await loadCustomerLedger(found.id);
        } else if (rawList.length > 0) {
          setSelectedCustomer(rawList[0]);
          await loadCustomerLedger(rawList[0].id);
        }
      } else if (rawList.length > 0) {
        setSelectedCustomer(rawList[0]);
        await loadCustomerLedger(rawList[0].id);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load customer directory."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomersData();
  }, []);

  // Load Customer Ledger
  async function loadCustomerLedger(customerId) {
    if (!customerId) return;
    setLedgerLoading(true);
    try {
      const data = await getLedger(customerId);
      const raw = Array.isArray(data) ? data : data?.data || data?.ledger || [];
      setLedgerEntries(raw);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load customer statement ledger."));
    } finally {
      setLedgerLoading(false);
    }
  }

  // Handle select customer
  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setError("");
    setMessage("");
    loadCustomerLedger(customer.id);
  };

  // ================= FILTERS & AGGREGATIONS =================
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name?.toLowerCase().includes(q) ||
        c.mobile?.includes(q) ||
        String(c.customerNumber || "").includes(q) ||
        String(c.id).includes(q);

      if (!matchesSearch) return false;

      const bal = getCustomerBalance(c);
      if (filterMode === "UDHAR") return bal < 0; // Negative balance = owes Udhar
      if (filterMode === "SETTLED") return bal === 0;
      if (filterMode === "ADVANCE") return bal > 0; // Positive balance = advance deposit
      return true;
    });
  }, [customers, searchQuery, filterMode]);

  const totalUdharOutstanding = useMemo(() => {
    return customers.reduce((acc, c) => {
      const bal = getCustomerBalance(c);
      return acc + (bal < 0 ? Math.abs(bal) : 0);
    }, 0);
  }, [customers]);

  const totalAdvanceDeposits = useMemo(() => {
    return customers.reduce((acc, c) => {
      const bal = getCustomerBalance(c);
      return acc + (bal > 0 ? bal : 0);
    }, 0);
  }, [customers]);

  const customersWithUdharCount = useMemo(() => {
    return customers.filter((c) => getCustomerBalance(c) < 0).length;
  }, [customers]);

  // Paginated Customers
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredCustomers.length / pageSize) || 1;

  // ================= CUSTOMER CRUD =================
  const openCreateModal = () => {
    setEditingCustomer(null);
    setCustomerForm({ name: "", mobile: "", address: "" });
    setError("");
    setMessage("");
    setShowCustomerModal(true);
  };

  const openEditModal = (c, e) => {
    if (e) e.stopPropagation();
    setEditingCustomer(c);
    setCustomerForm({
      name: c.name || "",
      mobile: c.mobile || "",
      address: c.address || "",
    });
    setError("");
    setMessage("");
    setShowCustomerModal(true);
  };

  async function handleCustomerFormSubmit(e) {
    e.preventDefault();
    if (!customerForm.name.trim()) {
      setError("Customer name is required.");
      return;
    }

    setCustomerSubmitting(true);
    setError("");
    setMessage("");

    try {
      if (editingCustomer) {
        const updated = await updateCustomer(editingCustomer.id, {
          name: customerForm.name.trim(),
          mobile: customerForm.mobile.trim() || undefined,
          address: customerForm.address.trim() || undefined,
        });
        setMessage(`✓ Customer "${customerForm.name}" updated successfully.`);
        setShowCustomerModal(false);
        const targetId = updated?.id || editingCustomer.id;
        await loadCustomersData(targetId);
      } else {
        const created = await createCustomer({
          name: customerForm.name.trim(),
          mobile: customerForm.mobile.trim() || undefined,
          address: customerForm.address.trim() || undefined,
        });
        setMessage(`✓ Customer "${customerForm.name}" registered successfully.`);
        setShowCustomerModal(false);
        const targetId = created?.id || created?.customerId;
        await loadCustomersData(targetId);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save customer."));
    } finally {
      setCustomerSubmitting(false);
    }
  }

  async function handleDeactivateCustomer(c, e) {
    if (e) e.stopPropagation();
    if (!isOwner) {
      setError("Only store owners are authorized to deactivate customers.");
      return;
    }

    const bal = getCustomerBalance(c);
    if (bal < 0) {
      if (
        !window.confirm(
          `Warning: Customer "${c.name}" still has an outstanding Udhar balance of ${formatMoney(
            bal
          )}. Are you sure you want to deactivate?`
        )
      ) {
        return;
      }
    } else {
      if (!window.confirm(`Deactivate customer "${c.name}"?`)) return;
    }

    try {
      await deactivateCustomer(c.id);
      setMessage(`Customer "${c.name}" has been deactivated.`);
      if (selectedCustomer?.id === c.id) {
        setSelectedCustomer(null);
        setLedgerEntries([]);
      }
      await loadCustomersData();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to deactivate customer."));
    }
  }

  // ================= TRANSACTION POSTING (CHARGE / PAYMENT / ADVANCE) =================
  const openTransactionModal = (mode, customer = null) => {
    const target = customer || selectedCustomer;
    if (!target) {
      setError("Please select a customer first.");
      return;
    }
    setSelectedCustomer(target);
    setTxModalMode(mode);
    const targetBal = getCustomerBalance(target);
    setTxAmount(
      mode === "PAYMENT" && targetBal < 0
        ? String(Math.abs(targetBal))
        : ""
    );
    setTxDescription("");
    setTxPaymentMethod("CASH");
    setTxReference("");
    setError("");
    setMessage("");
  };

  async function handleTransactionSubmit(e) {
    e.preventDefault();
    const amountNum = Number(txAmount);
    if (!selectedCustomer || isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid positive transaction amount.");
      return;
    }

    setTxSubmitting(true);
    setError("");
    setMessage("");

    try {
      const idempotencyKey = newIdempotencyKey();
      const custId = selectedCustomer.id;

      if (txModalMode === "CHARGE") {
        await addCharge(
          custId,
          {
            amount: amountNum,
            description: txDescription.trim() || "Udhar Charge / Counter Credit",
            reference: txReference.trim() || undefined,
          },
          idempotencyKey
        );
        setMessage(
          `✓ Udhar charge of ${formatMoney(amountNum)} posted for "${selectedCustomer.name}".`
        );
      } else {
        // PAYMENT or ADVANCE
        const defaultDesc =
          txModalMode === "ADVANCE"
            ? "Customer Advance Deposit"
            : `Udhar Settlement (${txPaymentMethod})`;

        await addPayment(
          custId,
          {
            amount: amountNum,
            paymentMethod: txPaymentMethod,
            description: txDescription.trim() || defaultDesc,
            reference: txReference.trim() || undefined,
          },
          idempotencyKey
        );
        setMessage(
          `✓ Payment of ${formatMoney(amountNum)} received for "${selectedCustomer.name}".`
        );
      }

      setTxModalMode(null);
      await loadCustomersData(custId);
      await loadCustomerLedger(custId);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to record transaction."));
    } finally {
      setTxSubmitting(false);
    }
  }

  // ================= WHATSAPP REMINDER LINK =================
  const getWhatsAppReminderUrl = (customer) => {
    if (!customer?.mobile) return null;
    const cleanPhone = customer.mobile.replace(/\D/g, "");
    const bal = getCustomerBalance(customer);
    const shop = user?.shopName || "DukanKhata Store";

    let text = "";
    if (bal < 0) {
      text = `Namaste ${customer.name}, this is a gentle reminder from ${shop}. Your current outstanding Udhar balance is ${formatMoney(
        bal
      )}. Kindly settle at your convenience. Thank you!`;
    } else if (bal > 0) {
      text = `Namaste ${customer.name}, your account at ${shop} has an advance credit balance of ${formatMoney(
        bal
      )}. Thank you for your business!`;
    } else {
      text = `Namaste ${customer.name}, your account balance with ${shop} is fully settled. Thank you!`;
    }

    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="customers-page-root">
      {/* Top Header Card */}
      <div className="closing-header-card">
        <div>
          <div className="eyebrow" style={{ marginBottom: "6px" }}>
            CUSTOMER CREDIT &amp; UDHAR KHATA
          </div>
          <h1 style={{ fontSize: "24px", color: "var(--deep)" }}>
            Customers &amp; Udhar Ledger
          </h1>
          <p className="muted" style={{ fontSize: "13.5px" }}>
            Maintain customer profiles, credit sales ledger, advance deposits, and authoritative payment reconciliations.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={openCreateModal}>
            👤 + Register Customer
          </button>
          {selectedCustomer && (
            <>
              <button
                className="btn btn-outline"
                onClick={() => openTransactionModal("CHARGE")}
                title="Add credit charge"
              >
                ➕ Record Udhar
              </button>
              <button
                className="btn btn-tonal"
                onClick={() => openTransactionModal("PAYMENT")}
                title="Receive payment"
              >
                💵 Receive Payment
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="alert-banner error" style={{ marginBottom: "16px" }}>{error}</div>}
      {message && <div className="alert-banner info" style={{ marginBottom: "16px" }}>{message}</div>}

      {/* Aggregate KPI Summary Cards */}
      <div className="dashboard-metrics-grid" style={{ marginBottom: "20px" }}>
        <div className="dashboard-metric-card">
          <span className="metric-label">Total Customers</span>
          <div className="metric-value">{customers.length} Accounts</div>
          <div className="metric-sub">Registered customer khata</div>
        </div>

        <div className="dashboard-metric-card">
          <span className="metric-label">Outstanding Udhar Due</span>
          <div
            className="metric-value"
            style={{ color: totalUdharOutstanding > 0 ? "var(--orange)" : "var(--cash)" }}
          >
            {formatMoney(totalUdharOutstanding)}
          </div>
          <div className="metric-sub">
            Owed across {customersWithUdharCount} customer{customersWithUdharCount === 1 ? "" : "s"}
          </div>
        </div>

        <div className="dashboard-metric-card">
          <span className="metric-label">Advance Customer Deposits</span>
          <div className="metric-value" style={{ color: "var(--brand)" }}>
            {formatMoney(totalAdvanceDeposits)}
          </div>
          <div className="metric-sub">Pre-paid customer credits</div>
        </div>

        <div className="dashboard-metric-card">
          <span className="metric-label">Settled Accounts</span>
          <div className="metric-value" style={{ color: "var(--deep)" }}>
            {customers.filter((c) => Number(c.balance || 0) === 0).length} Cleared
          </div>
          <div className="metric-sub">Zero pending balance</div>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 390px) 1fr", gap: "20px", alignItems: "start" }}>
        {/* ================= COLUMN 1: CUSTOMER DIRECTORY LIST ================= */}
        <div className="card" style={{ padding: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h2 style={{ fontSize: "17px", color: "var(--deep)", margin: 0 }}>
              Customer List ({customers.length})
            </h2>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => loadCustomersData()}
              disabled={loading}
              title="Refresh customer list"
            >
              🔄
            </button>
          </div>

          {/* Search Box */}
          <div className="pos-search-bar" style={{ marginBottom: "12px", width: "100%" }}>
            <span className="pos-search-icon" aria-hidden="true">🔍</span>
            <input
              placeholder="Search name, phone, #ID..."
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

          {/* Filter Chips */}
          <div className="history-preset-chips" style={{ marginBottom: "14px", flexWrap: "wrap" }}>
            <button
              className={`preset-chip ${filterMode === "ALL" ? "active" : ""}`}
              onClick={() => {
                setFilterMode("ALL");
                setCurrentPage(1);
              }}
            >
              All ({customers.length})
            </button>
            <button
              className={`preset-chip ${filterMode === "UDHAR" ? "active" : ""}`}
              onClick={() => {
                setFilterMode("UDHAR");
                setCurrentPage(1);
              }}
            >
              ⚠️ Udhar ({customersWithUdharCount})
            </button>
            <button
              className={`preset-chip ${filterMode === "ADVANCE" ? "active" : ""}`}
              onClick={() => {
                setFilterMode("ADVANCE");
                setCurrentPage(1);
              }}
            >
              💰 Advance
            </button>
            <button
              className={`preset-chip ${filterMode === "SETTLED" ? "active" : ""}`}
              onClick={() => {
                setFilterMode("SETTLED");
                setCurrentPage(1);
              }}
            >
              ✓ Settled
            </button>
          </div>

          {/* Customer Cards List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "560px", overflowY: "auto" }}>
            {loading ? (
              <div className="loading" style={{ minHeight: "100px" }}>
                Loading customers...
              </div>
            ) : paginatedCustomers.length === 0 ? (
              <p className="muted" style={{ padding: "24px 0", textAlign: "center" }}>
                No customer accounts match your search.
              </p>
            ) : (
              paginatedCustomers.map((c) => {
                const isSelected = selectedCustomer?.id === c.id;
                const bal = getCustomerBalance(c);
                const hasUdhar = bal < 0;
                const hasAdvance = bal > 0;

                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCustomer(c)}
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
                        #{c.customerNumber || c.id} {c.name}
                      </strong>
                      <small style={{ color: "var(--mute)", fontSize: "12px" }}>
                        📱 {c.mobile || "No mobile"}
                      </small>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <strong
                        style={{
                          fontSize: "14.5px",
                          display: "block",
                          color: hasUdhar ? "var(--orange)" : hasAdvance ? "var(--cash)" : "var(--mute)",
                        }}
                      >
                        {hasUdhar
                          ? `- ${formatMoney(bal)}`
                          : hasAdvance
                          ? `+ ${formatMoney(bal)}`
                          : "₹0.00"}
                      </strong>
                      <span
                        className={`product-status-chip ${
                          hasUdhar ? "low-stock" : hasAdvance ? "active" : "inactive"
                        }`}
                        style={{ fontSize: "10.5px", padding: "2px 6px" }}
                      >
                        {hasUdhar ? "Udhar Owed" : hasAdvance ? "Advance" : "Settled"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* List Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", paddingTop: "10px", borderTop: "1px solid var(--line)", fontSize: "12px" }}>
              <button
                className="btn btn-sm btn-outline"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                ← Prev
              </button>
              <span className="muted">
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
          )}
        </div>

        {/* ================= COLUMN 2: SELECTED CUSTOMER DETAILS & LEDGER ================= */}
        {selectedCustomer ? (
          <div className="card" style={{ padding: "22px" }}>
            {/* Customer Header Info & Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--line)", paddingBottom: "16px", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <div className="eyebrow" style={{ marginBottom: "4px" }}>
                  CUSTOMER KHATA PROFILE
                </div>
                <h2 style={{ fontSize: "20px", color: "var(--deep)", margin: 0 }}>
                  #{selectedCustomer.customerNumber || selectedCustomer.id} {selectedCustomer.name}
                </h2>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginTop: "6px", fontSize: "13px", color: "var(--mute)" }}>
                  {selectedCustomer.mobile && <span>📱 {selectedCustomer.mobile}</span>}
                  {selectedCustomer.address && <span>📍 {selectedCustomer.address}</span>}
                  <span>Account: Active</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                {selectedCustomer.mobile && (
                  <a
                    className="btn btn-sm btn-outline"
                    href={getWhatsAppReminderUrl(selectedCustomer)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ borderColor: "#25D366", color: "#128C7E", background: "#FFFFFF" }}
                  >
                    💬 WhatsApp Statement
                  </a>
                )}
                <button
                  className="btn btn-sm btn-outline"
                  onClick={(e) => openEditModal(selectedCustomer, e)}
                >
                  ✏️ Edit
                </button>
                {isOwner && (
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={(e) => handleDeactivateCustomer(selectedCustomer, e)}
                    style={{ color: "var(--bad)", borderColor: "var(--line)" }}
                  >
                    🚫 Deactivate
                  </button>
                )}
              </div>
            </div>

            {/* Running Balance Banner */}
            {(() => {
              const bal = getCustomerBalance(selectedCustomer);
              const hasUdhar = bal < 0;
              const hasAdvance = bal > 0;

              return (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "var(--surface-low)",
                    padding: "16px 20px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--line)",
                    marginBottom: "20px",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div>
                    <span className="muted" style={{ fontSize: "13px" }}>
                      Current Net Account Balance
                    </span>
                    <div
                      style={{
                        fontSize: "26px",
                        fontWeight: 800,
                        color: hasUdhar ? "var(--orange)" : hasAdvance ? "var(--cash)" : "var(--deep)",
                      }}
                    >
                      {hasUdhar
                        ? `- ${formatMoney(bal)} (Udhar Owed to Shop)`
                        : hasAdvance
                        ? `+ ${formatMoney(bal)} (Advance Available)`
                        : "₹0.00 (Account Settled)"}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button
                      className="btn btn-outline"
                      onClick={() => openTransactionModal("CHARGE")}
                      style={{ borderColor: "var(--orange)", color: "var(--orange)", background: "#FFFFFF" }}
                    >
                      ➕ Add Udhar Charge
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => openTransactionModal("PAYMENT")}
                    >
                      💵 Receive Payment
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={() => openTransactionModal("ADVANCE")}
                    >
                      💰 Add Advance
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Ledger Timeline Section */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h3 style={{ fontSize: "16px", color: "var(--deep)", margin: 0, fontWeight: 700 }}>
                  Customer Statement &amp; Transaction Ledger
                </h3>
                <span className="muted" style={{ fontSize: "12.5px" }}>
                  Authoritative Audit Trail
                </span>
              </div>

              {ledgerLoading ? (
                <div className="loading" style={{ minHeight: "140px" }}>
                  Loading transaction history...
                </div>
              ) : ledgerEntries.length === 0 ? (
                <p className="muted" style={{ padding: "36px 0", textAlign: "center" }}>
                  No transaction events recorded for this customer yet.
                </p>
              ) : (
                <div className="table-wrap" style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-sm)" }}>
                  <table>
                    <thead style={{ background: "var(--surface-low)" }}>
                      <tr>
                        <th>Date &amp; Time</th>
                        <th>Transaction Type</th>
                        <th>Description / Reference</th>
                        <th style={{ textAlign: "right" }}>Amount (₹)</th>
                        <th style={{ textAlign: "right" }}>Running Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerEntries.map((tx) => {
                        const isCharge = tx.type === "CHARGE" || tx.type === "DEBIT";
                        const balAfter = Number(tx.balanceAfter || 0);

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
                                  isCharge ? "low-stock" : "active"
                                }`}
                              >
                                {isCharge ? "⚠️ UDHAR CHARGE" : "✓ PAYMENT"}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: "13px", color: "var(--mute)" }}>
                                {tx.description || tx.reference || "Ledger entry"}
                              </span>
                            </td>
                            <td
                              style={{
                                textAlign: "right",
                                fontWeight: 700,
                                color: isCharge ? "var(--orange)" : "var(--cash)",
                              }}
                            >
                              {isCharge ? `- ${formatMoney(tx.amount)}` : `+ ${formatMoney(tx.amount)}`}
                            </td>
                            <td
                              style={{
                                textAlign: "right",
                                fontWeight: 600,
                                color: balAfter < 0 ? "var(--orange)" : balAfter > 0 ? "var(--cash)" : "var(--deep)",
                              }}
                            >
                              {balAfter < 0
                                ? `- ${formatMoney(balAfter)}`
                                : balAfter > 0
                                ? `+ ${formatMoney(balAfter)}`
                                : "₹0.00"}
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
            <p className="muted" style={{ fontSize: "15px" }}>
              Select a customer on the left to view their detailed Khata profile, transaction statement, and record Udhar movements.
            </p>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL 1: ADD / EDIT CUSTOMER
          ========================================================================= */}
      {showCustomerModal && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setShowCustomerModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="customer-modal-title"
        >
          <div className="inventory-drawer-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "12px" }}>
              <div>
                <span className="eyebrow" style={{ marginBottom: "4px" }}>
                  {editingCustomer ? "EDIT CUSTOMER" : "REGISTER CUSTOMER"}
                </span>
                <h3 id="customer-modal-title" style={{ fontSize: "19px", color: "var(--deep)", margin: 0 }}>
                  {editingCustomer ? `Edit: ${editingCustomer.name}` : "Create Customer Khata"}
                </h3>
              </div>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setShowCustomerModal(false)}
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="alert-banner error" style={{ margin: "2px 0", fontSize: "13px", padding: "8px 12px" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCustomerFormSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="input-group">
                <label htmlFor="cust-name-input">Full Name *</label>
                <input
                  id="cust-name-input"
                  required
                  placeholder="e.g. Ramesh Patel"
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label htmlFor="cust-mobile-input">Mobile Number</label>
                <input
                  id="cust-mobile-input"
                  placeholder="e.g. 9876543210"
                  value={customerForm.mobile}
                  onChange={(e) => setCustomerForm({ ...customerForm, mobile: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label htmlFor="cust-addr-input">Address / Landmark (Optional)</label>
                <input
                  id="cust-addr-input"
                  placeholder="e.g. House #14, Main Bazaar, City"
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => setShowCustomerModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={customerSubmitting}
                >
                  {customerSubmitting ? "Saving..." : editingCustomer ? "Update Profile" : "Register Khata"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: TRANSACTION POSTING (CHARGE / PAYMENT / ADVANCE)
          ========================================================================= */}
      {txModalMode && selectedCustomer && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setTxModalMode(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tx-modal-title"
        >
          <div className="inventory-drawer-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "12px" }}>
              <div>
                <span
                  className={`eyebrow ${txModalMode === "CHARGE" ? "" : "gold"}`}
                  style={{ marginBottom: "4px" }}
                >
                  {txModalMode === "CHARGE"
                    ? "CREDIT SALE (UDHAR)"
                    : txModalMode === "ADVANCE"
                    ? "ADVANCE DEPOSIT"
                    : "UDHAR RECOVERY"}
                </span>
                <h3 id="tx-modal-title" style={{ fontSize: "19px", color: "var(--deep)", margin: 0 }}>
                  {txModalMode === "CHARGE"
                    ? `Add Udhar Charge: ${selectedCustomer.name}`
                    : txModalMode === "ADVANCE"
                    ? `Record Advance: ${selectedCustomer.name}`
                    : `Receive Payment: ${selectedCustomer.name}`}
                </h3>
              </div>
              <button className="btn btn-sm btn-outline" onClick={() => setTxModalMode(null)}>
                ✕
              </button>
            </div>

            {/* Current Balance reference */}
            {(() => {
              const modalBal = getCustomerBalance(selectedCustomer);
              const hasUdhar = modalBal < 0;
              const hasAdvance = modalBal > 0;
              return (
                <div style={{ background: "var(--surface-low)", padding: "10px 14px", borderRadius: "8px", display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                  <span>Current Account Balance:</span>
                  <strong
                    style={{
                      color: hasUdhar
                        ? "var(--orange)"
                        : hasAdvance
                        ? "var(--cash)"
                        : "var(--deep)",
                    }}
                  >
                    {hasUdhar
                      ? `- ${formatMoney(modalBal)} (Udhar)`
                      : hasAdvance
                      ? `+ ${formatMoney(modalBal)} (Advance)`
                      : "₹0.00 (Settled)"}
                  </strong>
                </div>
              );
            })()}

            {error && (
              <div className="alert-banner error" style={{ margin: "2px 0", fontSize: "13px", padding: "8px 12px" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleTransactionSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="input-group">
                <label htmlFor="tx-amount-input">
                  {txModalMode === "CHARGE"
                    ? "Udhar Charge Amount (₹) *"
                    : "Received Payment Amount (₹) *"}
                </label>
                <input
                  id="tx-amount-input"
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 500"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                />
              </div>

              {txModalMode !== "CHARGE" && (
                <div className="input-group">
                  <label>Payment Mode *</label>
                  <select
                    value={txPaymentMethod}
                    onChange={(e) => setTxPaymentMethod(e.target.value)}
                  >
                    <option value="CASH">💵 Cash</option>
                    <option value="UPI">📱 UPI (GPay / PhonePe / QR)</option>
                    <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
                    <option value="CHEQUE">📝 Cheque</option>
                  </select>
                </div>
              )}

              <div className="input-group">
                <label htmlFor="tx-desc-input">
                  {txModalMode === "CHARGE"
                    ? "Item / Grocery Description (Optional)"
                    : "Payment Description / Notes"}
                </label>
                <input
                  id="tx-desc-input"
                  placeholder={
                    txModalMode === "CHARGE"
                      ? "e.g. 2kg Rice, Cooking Oil, Counter bill"
                      : txModalMode === "ADVANCE"
                      ? "e.g. Month advance payment"
                      : "e.g. Cash recovery at counter"
                  }
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label htmlFor="tx-ref-input">Bill # / Reference (Optional)</label>
                <input
                  id="tx-ref-input"
                  placeholder="e.g. Bill #8492 or UPI Ref"
                  value={txReference}
                  onChange={(e) => setTxReference(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => setTxModalMode(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={txSubmitting}
                >
                  {txSubmitting
                    ? "Posting..."
                    : txModalMode === "CHARGE"
                    ? "Post Udhar Charge"
                    : "Post Payment Received"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
