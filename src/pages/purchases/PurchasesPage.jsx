import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getProducts } from "../../api/productApi";
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  getSupplierLedger,
  paySupplier,
} from "../../api/supplierApi";
import { getPurchases, getPurchase, createPurchase } from "../../api/purchaseApi";
import { getApiErrorMessage } from "../../api/apiError";
import { newIdempotencyKey } from "../../api/idempotency";

function formatMoney(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function PurchasesPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER" || user?.role === "ADMIN";

  // Navigation / View Tabs: 'NEW_PURCHASE' | 'HISTORY' | 'SUPPLIERS'
  const [activeTab, setActiveTab] = useState("NEW_PURCHASE");

  // Core Data
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // ================= 1. NEW PURCHASE FORM STATE =================
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [purchaseNotes, setPurchaseNotes] = useState("");
  const [purchaseRows, setPurchaseRows] = useState([
    { productId: "", quantity: "1", unitCost: "", notes: "" },
  ]);
  const [paidNowAmount, setPaidNowAmount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("CASH"); // 'CASH' | 'UPI' | 'BANK_TRANSFER'
  const [purchaseSubmitting, setPurchaseSubmitting] = useState(false);

  // ================= 2. PURCHASE HISTORY & DETAILS =================
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("ALL"); // 'ALL' | 'UNPAID' | 'PARTIAL' | 'PAID'
  const [inspectedPurchase, setInspectedPurchase] = useState(null);
  const [inspectedPurchaseLoading, setInspectedPurchaseLoading] = useState(false);
  const [showPurchaseDetailModal, setShowPurchaseDetailModal] = useState(false);

  // ================= 3. SUPPLIER DIRECTORY & LEDGER =================
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierLedger, setSupplierLedger] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");

  // Supplier Create / Edit Modal
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState(null);
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    mobile: "",
    address: "",
    gstin: "",
    email: "",
    notes: "",
  });
  const [supplierSubmitting, setSupplierSubmitting] = useState(false);

  // Supplier Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "CASH",
    reference: "",
    notes: "",
  });
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // ================= LOAD INITIAL DATA =================
  async function loadData(refreshSelected = false) {
    setLoading(true);
    setError("");
    try {
      const [pRes, sRes, hRes] = await Promise.all([
        getProducts(),
        getSuppliers(),
        getPurchases(),
      ]);

      const rawProducts = pRes.data?.data || pRes.data || [];
      const rawSuppliers = sRes.data?.data || sRes.data || [];
      const rawPurchases = hRes.data?.data || hRes.data || [];

      const cleanSuppliers = Array.isArray(rawSuppliers) ? rawSuppliers : [];
      setProducts(Array.isArray(rawProducts) ? rawProducts : []);
      setSuppliers(cleanSuppliers);
      setPurchases(Array.isArray(rawPurchases) ? rawPurchases : []);

      if (refreshSelected && selectedSupplier) {
        const updated = cleanSuppliers.find((s) => s.id === selectedSupplier.id);
        if (updated) {
          setSelectedSupplier(updated);
          await loadSupplierLedger(updated.id);
        }
      } else if (!selectedSupplier && cleanSuppliers.length > 0) {
        // Auto-select first supplier for ledger convenience
        setSelectedSupplier(cleanSuppliers[0]);
        loadSupplierLedger(cleanSuppliers[0].id);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load purchases and supplier records."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Load Supplier Ledger
  async function loadSupplierLedger(supId) {
    if (!supId) return;
    setLedgerLoading(true);
    try {
      const res = await getSupplierLedger(supId);
      const raw = res.data?.data || res.data || [];
      setSupplierLedger(Array.isArray(raw) ? raw : []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load supplier ledger timeline."));
    } finally {
      setLedgerLoading(false);
    }
  }

  // ================= CALCULATIONS =================
  // Purchase Total
  const purchaseSubtotal = useMemo(() => {
    return purchaseRows.reduce((acc, row) => {
      const qty = Number(row.quantity || 0);
      const cost = Number(row.unitCost || 0);
      return acc + (qty > 0 && cost > 0 ? qty * cost : 0);
    }, 0);
  }, [purchaseRows]);

  const purchaseRemainingPayable = useMemo(() => {
    const paid = Number(paidNowAmount || 0);
    return Math.max(0, purchaseSubtotal - paid);
  }, [purchaseSubtotal, paidNowAmount]);

  // Aggregate Metrics
  const totalPayableOverall = useMemo(() => {
    return suppliers.reduce(
      (acc, s) => acc + Math.max(0, Number(s.balancePayable || s.payableBalance || 0)),
      0
    );
  }, [suppliers]);

  const totalPurchasesAmount = useMemo(() => {
    return purchases.reduce((acc, p) => acc + Number(p.total || p.totalAmount || 0), 0);
  }, [purchases]);

  // Filtered History
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const q = historySearch.toLowerCase().trim();
      const matchesQuery =
        !q ||
        p.purchaseNumber?.toLowerCase().includes(q) ||
        p.supplierName?.toLowerCase().includes(q) ||
        p.supplierInvoiceNumber?.toLowerCase().includes(q);

      if (!matchesQuery) return false;

      const status = (p.paymentStatus || "").toUpperCase();
      if (historyStatusFilter === "UNPAID") return status === "UNPAID";
      if (historyStatusFilter === "PARTIAL") return status === "PARTIAL" || status === "PARTIALLY_PAID";
      if (historyStatusFilter === "PAID") return status === "PAID";
      return true;
    });
  }, [purchases, historySearch, historyStatusFilter]);

  // Filtered Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const q = supplierSearch.toLowerCase().trim();
      return (
        !q ||
        s.name?.toLowerCase().includes(q) ||
        s.mobile?.includes(q) ||
        s.gstin?.toLowerCase().includes(q) ||
        s.address?.toLowerCase().includes(q)
      );
    });
  }, [suppliers, supplierSearch]);

  // ================= ROW OPERATIONS =================
  const handleAddRow = () => {
    setPurchaseRows((prev) => [
      ...prev,
      { productId: "", quantity: "1", unitCost: "", notes: "" },
    ]);
  };

  const handleRemoveRow = (index) => {
    if (purchaseRows.length <= 1) return;
    setPurchaseRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateRow = (index, field, value) => {
    setPurchaseRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const updated = { ...row, [field]: value };
        // If selecting product, auto-fill unitCost from product cost or price if not set
        if (field === "productId") {
          const prod = products.find((p) => String(p.id) === String(value));
          if (prod && (!updated.unitCost || Number(updated.unitCost) === 0)) {
            updated.unitCost = prod.averageCostPrice || prod.costPrice || prod.sellingPrice || "";
          }
        }
        return updated;
      })
    );
  };

  // ================= SUBMIT PURCHASE ORDER =================
  async function handleCreatePurchaseSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!selectedSupplierId) {
      setError("Please select a supplier for this purchase order.");
      return;
    }

    if (purchaseRows.length === 0) {
      setError("Please add at least one product item to the purchase.");
      return;
    }

    for (let i = 0; i < purchaseRows.length; i++) {
      const row = purchaseRows[i];
      if (!row.productId) {
        setError(`Row #${i + 1}: Please select a product.`);
        return;
      }
      if (Number(row.quantity) <= 0) {
        setError(`Row #${i + 1}: Received quantity must be greater than 0.`);
        return;
      }
      if (Number(row.unitCost) < 0) {
        setError(`Row #${i + 1}: Unit purchase cost cannot be negative.`);
        return;
      }
    }

    const paidNum = Number(paidNowAmount || 0);
    if (paidNum < 0) {
      setError("Paid amount cannot be negative.");
      return;
    }
    if (paidNum > purchaseSubtotal && purchaseSubtotal > 0) {
      setError("Initial paid amount cannot exceed total purchase invoice value.");
      return;
    }

    setPurchaseSubmitting(true);

    try {
      const payload = {
        supplierId: selectedSupplierId,
        supplierInvoiceNumber: supplierInvoiceNo.trim() || undefined,
        purchaseDate: purchaseDate || undefined,
        paidAmount: paidNum,
        paymentMethod: paidNum > 0 ? paymentMethod : undefined,
        note: purchaseNotes.trim() || undefined,
        items: purchaseRows.map((r) => ({
          productId: r.productId,
          quantity: Number(r.quantity),
          unitCost: Number(r.unitCost),
          notes: r.notes?.trim() || undefined,
        })),
      };

      const idempotencyKey = newIdempotencyKey();
      const res = await createPurchase(payload, idempotencyKey);
      const created = res.data?.data || res.data;

      setMessage(
        `✓ Purchase #${created?.purchaseNumber || "Order"} created successfully! Authoritative inventory stock received and supplier payable ledger updated.`
      );

      // Reset form
      setPurchaseRows([{ productId: "", quantity: "1", unitCost: "", notes: "" }]);
      setPaidNowAmount("0");
      setSupplierInvoiceNo("");
      setPurchaseNotes("");

      await loadData(true);
      setActiveTab("HISTORY");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create purchase order."));
    } finally {
      setPurchaseSubmitting(false);
    }
  }

  // ================= VIEW PURCHASE DETAILS =================
  async function openPurchaseDetails(p) {
    setInspectedPurchase(p);
    setShowPurchaseDetailModal(true);
    setInspectedPurchaseLoading(true);
    try {
      const res = await getPurchase(p.id);
      const full = res.data?.data || res.data;
      if (full) {
        setInspectedPurchase(full);
      }
    } catch {
      // Keep basic info if detail endpoint fails
    } finally {
      setInspectedPurchaseLoading(false);
    }
  }

  // ================= SUPPLIER CRUD =================
  const openAddSupplierModal = () => {
    setEditingSupplierId(null);
    setSupplierForm({
      name: "",
      mobile: "",
      address: "",
      gstin: "",
      email: "",
      notes: "",
    });
    setError("");
    setMessage("");
    setShowSupplierModal(true);
  };

  const openEditSupplierModal = (s, e) => {
    if (e) e.stopPropagation();
    setEditingSupplierId(s.id);
    setSupplierForm({
      name: s.name || "",
      mobile: s.mobile || "",
      address: s.address || "",
      gstin: s.gstin || "",
      email: s.email || "",
      notes: s.notes || "",
    });
    setError("");
    setMessage("");
    setShowSupplierModal(true);
  };

  async function handleSupplierSubmit(e) {
    e.preventDefault();
    if (!supplierForm.name.trim()) {
      setError("Supplier name is required.");
      return;
    }

    setSupplierSubmitting(true);
    setError("");
    setMessage("");

    try {
      if (editingSupplierId) {
        await updateSupplier(editingSupplierId, supplierForm);
        setMessage(`Supplier "${supplierForm.name}" updated successfully.`);
      } else {
        const res = await createSupplier(supplierForm);
        const created = res.data?.data || res.data;
        setMessage(`Supplier "${supplierForm.name}" added successfully.`);
        if (created?.id) {
          setSelectedSupplierId(String(created.id));
        }
      }
      setShowSupplierModal(false);
      await loadData(true);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save supplier profile."));
    } finally {
      setSupplierSubmitting(false);
    }
  }

  // ================= SUPPLIER PAYMENT =================
  const openPaymentModal = (supplier = null) => {
    if (!isOwner) {
      setError("Only owners or authorized managers can record supplier payments.");
      return;
    }
    const target = supplier || selectedSupplier;
    if (!target) {
      setError("Please select a supplier to record payment.");
      return;
    }
    setSelectedSupplier(target);
    const payable = Number(target.balancePayable || target.payableBalance || 0);
    setPaymentForm({
      amount: payable > 0 ? String(payable) : "",
      method: "CASH",
      reference: "",
      notes: "",
    });
    setError("");
    setMessage("");
    setShowPaymentModal(true);
  };

  async function handlePaymentSubmit(e) {
    e.preventDefault();
    const amountNum = Number(paymentForm.amount);
    if (!selectedSupplier || amountNum <= 0) {
      setError("Please enter a valid positive payment amount.");
      return;
    }

    const currentPayable = Number(
      selectedSupplier.balancePayable || selectedSupplier.payableBalance || 0
    );

    if (amountNum > currentPayable && currentPayable > 0) {
      if (
        !window.confirm(
          `Payment amount (₹${amountNum}) exceeds outstanding payable (₹${currentPayable}). Record as supplier advance balance?`
        )
      ) {
        return;
      }
    }

    setPaymentSubmitting(true);
    setError("");
    setMessage("");

    try {
      const idempotencyKey = newIdempotencyKey();
      await paySupplier(
        selectedSupplier.id,
        {
          amount: amountNum,
          paymentMethod: paymentForm.method,
          reference: paymentForm.reference.trim() || undefined,
          notes: paymentForm.notes.trim() || undefined,
        },
        idempotencyKey
      );

      setMessage(
        `✓ Payment of ${formatMoney(amountNum)} recorded for "${selectedSupplier.name}". Supplier payable updated.`
      );
      setShowPaymentModal(false);
      await loadData(true);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to record supplier payment."));
    } finally {
      setPaymentSubmitting(false);
    }
  }

  return (
    <div className="purchases-page-root">
      {/* Top Header Card */}
      <div className="closing-header-card">
        <div>
          <div className="eyebrow" style={{ marginBottom: "6px" }}>
            SUPPLY CHAIN &amp; INVENTORY INFLOW
          </div>
          <h1 style={{ fontSize: "24px", color: "var(--deep)" }}>
            Purchases &amp; Supplier Management
          </h1>
          <p className="muted" style={{ fontSize: "13.5px" }}>
            Receive goods, maintain historical purchase invoices, record payments, and track vendor Udhar payables.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {isOwner && (
            <>
              <button
                className={`btn ${activeTab === "NEW_PURCHASE" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setActiveTab("NEW_PURCHASE")}
              >
                📥 New Purchase Order
              </button>
              <button
                className="btn btn-outline"
                onClick={openAddSupplierModal}
              >
                👤 + Add Supplier
              </button>
            </>
          )}
          <Link className="btn btn-tonal" to="/inventory">
            📦 Stock Inventory
          </Link>
        </div>
      </div>

      {error && <div className="alert-banner error" style={{ marginBottom: "16px" }}>{error}</div>}
      {message && <div className="alert-banner info" style={{ marginBottom: "16px" }}>{message}</div>}

      {/* Aggregate KPI Summary Cards */}
      <div className="dashboard-metrics-grid" style={{ marginBottom: "20px" }}>
        <div className="dashboard-metric-card">
          <span className="metric-label">Total Suppliers</span>
          <div className="metric-value">{suppliers.length} Vendors</div>
          <div className="metric-sub">Registered supplier directory</div>
        </div>

        <div className="dashboard-metric-card">
          <span className="metric-label">Outstanding Payables</span>
          <div
            className="metric-value"
            style={{ color: totalPayableOverall > 0 ? "var(--orange)" : "var(--cash)" }}
          >
            {formatMoney(totalPayableOverall)}
          </div>
          <div className="metric-sub">Pending supplier dues</div>
        </div>

        <div className="dashboard-metric-card">
          <span className="metric-label">Total Invoiced Purchases</span>
          <div className="metric-value" style={{ color: "var(--brand)" }}>
            {formatMoney(totalPurchasesAmount)}
          </div>
          <div className="metric-sub">{purchases.length} lifetime purchase orders</div>
        </div>

        <div className="dashboard-metric-card">
          <span className="metric-label">Catalogue SKUs</span>
          <div className="metric-value" style={{ color: "var(--deep)" }}>
            {products.length} Products
          </div>
          <div className="metric-sub">Available for stock receiving</div>
        </div>
      </div>

      {/* Tab Navigation Header */}
      <div className="products-filter-header" style={{ marginBottom: "20px" }}>
        <div className="history-preset-chips">
          <button
            className={`preset-chip ${activeTab === "NEW_PURCHASE" ? "active" : ""}`}
            onClick={() => setActiveTab("NEW_PURCHASE")}
          >
            📥 Create Purchase Order
          </button>
          <button
            className={`preset-chip ${activeTab === "HISTORY" ? "active" : ""}`}
            onClick={() => setActiveTab("HISTORY")}
          >
            📜 Purchase Invoices ({purchases.length})
          </button>
          <button
            className={`preset-chip ${activeTab === "SUPPLIERS" ? "active" : ""}`}
            onClick={() => setActiveTab("SUPPLIERS")}
          >
            🏢 Supplier Directory &amp; Khata ({suppliers.length})
          </button>
        </div>

        <button
          className="btn btn-sm btn-outline"
          onClick={() => loadData(true)}
          disabled={loading}
          title="Refresh all records"
        >
          🔄 Refresh
        </button>
      </div>

      {/* =========================================================================
          VIEW 1: CREATE NEW PURCHASE ORDER
          ========================================================================= */}
      {activeTab === "NEW_PURCHASE" && (
        <div className="card" style={{ padding: "24px" }}>
          <form onSubmit={handleCreatePurchaseSubmit}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", borderBottom: "1px solid var(--line)", paddingBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h2 style={{ fontSize: "18px", color: "var(--deep)", margin: 0 }}>
                  Record Incoming Stock &amp; Purchase Invoice
                </h2>
                <span className="muted" style={{ fontSize: "13px" }}>
                  Items added here will increase authoritative on-hand stock and post payable balance to vendor ledger.
                </span>
              </div>
              <span className="badge" style={{ background: "var(--tint)", color: "var(--brand)", fontWeight: 700, padding: "6px 12px", borderRadius: "20px" }}>
                Transactional Inflow
              </span>
            </div>

            {/* Supplier & Header Metadata */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "20px" }}>
              <div className="input-group">
                <label htmlFor="purchase-supplier-select">
                  Select Supplier *
                </label>
                <div style={{ display: "flex", gap: "6px" }}>
                  <select
                    id="purchase-supplier-select"
                    required
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    <option value="">-- Choose Vendor / Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Payable: {formatMoney(s.balancePayable || 0)})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={openAddSupplierModal}
                    title="Add new supplier"
                    style={{ padding: "0 10px" }}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="purchase-invoice-no">Supplier Invoice / Bill #</label>
                <input
                  id="purchase-invoice-no"
                  placeholder="e.g. INV-2026-904"
                  value={supplierInvoiceNo}
                  onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label htmlFor="purchase-date-input">Invoice Date</label>
                <input
                  id="purchase-date-input"
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                />
              </div>
            </div>

            {/* Line Items Table */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <h3 style={{ fontSize: "15px", color: "var(--deep)", margin: 0, fontWeight: 700 }}>
                  Purchase Items ({purchaseRows.length})
                </h3>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={handleAddRow}
                >
                  + Add Line Item
                </button>
              </div>

              <div className="table-wrap" style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-sm)" }}>
                <table>
                  <thead style={{ background: "var(--surface-low)" }}>
                    <tr>
                      <th style={{ minWidth: "220px" }}>Product *</th>
                      <th style={{ width: "120px" }}>Received Qty *</th>
                      <th style={{ width: "140px" }}>Unit Cost (₹) *</th>
                      <th style={{ width: "140px", textAlign: "right" }}>Line Total</th>
                      <th style={{ width: "50px", textAlign: "center" }}>Act</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseRows.map((row, idx) => {
                      const qty = Number(row.quantity || 0);
                      const cost = Number(row.unitCost || 0);
                      const lineTotal = qty * cost;

                      return (
                        <tr key={idx}>
                          <td>
                            <select
                              required
                              value={row.productId}
                              onChange={(e) => handleUpdateRow(idx, "productId", e.target.value)}
                              style={{ width: "100%", minHeight: "36px", fontSize: "13px" }}
                            >
                              <option value="">-- Select Product --</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} {p.sku ? `(${p.sku})` : ""} — In Stock: {p.currentStock || 0}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              required
                              type="number"
                              min="0.001"
                              step="any"
                              placeholder="1"
                              value={row.quantity}
                              onChange={(e) => handleUpdateRow(idx, "quantity", e.target.value)}
                              style={{ width: "100%", minHeight: "36px", padding: "4px 8px" }}
                            />
                          </td>
                          <td>
                            <input
                              required
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={row.unitCost}
                              onChange={(e) => handleUpdateRow(idx, "unitCost", e.target.value)}
                              style={{ width: "100%", minHeight: "36px", padding: "4px 8px" }}
                            />
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 700, color: "var(--deep)" }}>
                            {formatMoney(lineTotal)}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={() => handleRemoveRow(idx)}
                              disabled={purchaseRows.length <= 1}
                              style={{ color: "var(--bad)", borderColor: "var(--line)", padding: "2px 8px" }}
                              title="Delete row"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Summary & Payment Panel */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", background: "var(--surface-low)", padding: "20px", borderRadius: "var(--radius-md)", border: "1px solid var(--line)" }}>
              <div>
                <div className="input-group" style={{ marginBottom: "12px" }}>
                  <label htmlFor="purchase-notes-input">Purchase Remarks / Notes</label>
                  <input
                    id="purchase-notes-input"
                    placeholder="e.g. Delivery received in good condition / Batch #847"
                    value={purchaseNotes}
                    onChange={(e) => setPurchaseNotes(e.target.value)}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div className="input-group">
                    <label htmlFor="purchase-paid-now">Initial Payment Paid (₹)</label>
                    <input
                      id="purchase-paid-now"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={paidNowAmount}
                      onChange={(e) => setPaidNowAmount(e.target.value)}
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="purchase-payment-method">Payment Mode</label>
                    <select
                      id="purchase-payment-method"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      disabled={Number(paidNowAmount) <= 0}
                    >
                      <option value="CASH">💵 Cash</option>
                      <option value="UPI">📱 UPI / QR</option>
                      <option value="BANK_TRANSFER">🏦 Bank Transfer / NEFT</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                  <button
                    type="button"
                    className="preset-chip"
                    onClick={() => setPaidNowAmount("0")}
                  >
                    Full Credit (₹0 Paid)
                  </button>
                  <button
                    type="button"
                    className="preset-chip"
                    onClick={() => setPaidNowAmount(String(purchaseSubtotal))}
                  >
                    Paid in Full ({formatMoney(purchaseSubtotal)})
                  </button>
                </div>
              </div>

              {/* Financial Calculation Review */}
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", borderLeft: "1px solid var(--line)", paddingLeft: "16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", color: "var(--mute)" }}>
                    <span>Gross Invoice Subtotal:</span>
                    <strong style={{ color: "var(--deep)" }}>{formatMoney(purchaseSubtotal)}</strong>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", color: "var(--mute)" }}>
                    <span>Paid at Receiving:</span>
                    <strong style={{ color: "var(--cash)" }}>- {formatMoney(paidNowAmount)}</strong>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: 800, borderTop: "1px dashed var(--line)", paddingTop: "8px", color: purchaseRemainingPayable > 0 ? "var(--orange)" : "var(--cash)" }}>
                    <span>Remaining Balance Payable:</span>
                    <span>{formatMoney(purchaseRemainingPayable)}</span>
                  </div>
                </div>

                <div style={{ marginTop: "16px" }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: "100%", padding: "12px", fontSize: "15px" }}
                    disabled={purchaseSubmitting || purchaseRows.length === 0}
                  >
                    {purchaseSubmitting ? "Receiving & Saving..." : "💾 Confirm & Save Purchase Order"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: PURCHASE INVOICES HISTORY & DETAILS
          ========================================================================= */}
      {activeTab === "HISTORY" && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--line)", flexWrap: "wrap", gap: "12px" }}>
            <div className="history-preset-chips">
              <button
                className={`preset-chip ${historyStatusFilter === "ALL" ? "active" : ""}`}
                onClick={() => setHistoryStatusFilter("ALL")}
              >
                All Purchases ({purchases.length})
              </button>
              <button
                className={`preset-chip ${historyStatusFilter === "UNPAID" ? "active" : ""}`}
                onClick={() => setHistoryStatusFilter("UNPAID")}
              >
                Pending Dues
              </button>
              <button
                className={`preset-chip ${historyStatusFilter === "PARTIAL" ? "active" : ""}`}
                onClick={() => setHistoryStatusFilter("PARTIAL")}
              >
                Partially Paid
              </button>
              <button
                className={`preset-chip ${historyStatusFilter === "PAID" ? "active" : ""}`}
                onClick={() => setHistoryStatusFilter("PAID")}
              >
                Fully Paid
              </button>
            </div>

            <div className="pos-search-bar" style={{ minWidth: "240px" }}>
              <span className="pos-search-icon" aria-hidden="true">🔍</span>
              <input
                placeholder="Search PO #, supplier, invoice..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
              />
              {historySearch && (
                <button className="pos-search-clear" onClick={() => setHistorySearch("")}>
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>PO Number &amp; Date</th>
                  <th>Supplier / Vendor</th>
                  <th>Invoice Ref</th>
                  <th>Total Amount</th>
                  <th>Paid Amount</th>
                  <th>Balance Payable</th>
                  <th>Payment Status</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: "center", padding: "36px" }}>
                      <div className="loading" style={{ minHeight: "60px" }}>
                        Loading historical purchases...
                      </div>
                    </td>
                  </tr>
                ) : filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: "center", padding: "36px" }} className="muted">
                      No purchase invoices match the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((p) => {
                    const status = (p.paymentStatus || "UNPAID").toUpperCase();
                    const isPaid = status === "PAID";
                    const isPartial = status === "PARTIAL" || status === "PARTIALLY_PAID";

                    return (
                      <tr key={p.id} className="product-table-row">
                        <td>
                          <strong style={{ display: "block", color: "var(--deep)", fontSize: "14px" }}>
                            {p.purchaseNumber || `PO #${p.id}`}
                          </strong>
                          <small style={{ color: "var(--mute)", fontSize: "11.5px" }}>
                            {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ""}
                          </small>
                        </td>
                        <td>
                          <strong style={{ color: "var(--deep)", fontSize: "13.5px" }}>
                            {p.supplierName || "—"}
                          </strong>
                        </td>
                        <td>
                          <span style={{ fontSize: "13px", color: "var(--mute)" }}>
                            {p.supplierInvoiceNumber || "—"}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: "var(--deep)" }}>
                          {formatMoney(p.total || p.totalAmount)}
                        </td>
                        <td style={{ fontWeight: 600, color: "var(--cash)" }}>
                          {formatMoney(p.paidAmount || 0)}
                        </td>
                        <td
                          style={{
                            fontWeight: 700,
                            color: Number(p.payableAmount || 0) > 0 ? "var(--orange)" : "var(--mute)",
                          }}
                        >
                          {formatMoney(p.payableAmount || 0)}
                        </td>
                        <td>
                          <span
                            className={`product-status-chip ${
                              isPaid ? "active" : isPartial ? "active" : "low-stock"
                            }`}
                            style={{
                              background: isPaid
                                ? "var(--tint)"
                                : isPartial
                                ? "var(--gold-tint)"
                                : "var(--bad-tint)",
                              color: isPaid
                                ? "var(--brand)"
                                : isPartial
                                ? "var(--gold-dark)"
                                : "var(--bad)",
                            }}
                          >
                            {isPaid ? "✓ Paid" : isPartial ? "🌗 Partial" : "⚠️ Unpaid"}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => openPurchaseDetails(p)}
                          >
                            🔍 View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 3: SUPPLIER DIRECTORY & KHATA LEDGER
          ========================================================================= */}
      {activeTab === "SUPPLIERS" && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 380px) 1fr", gap: "20px", alignItems: "start" }}>
          {/* Left: Supplier Directory List */}
          <div className="card" style={{ padding: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h2 style={{ fontSize: "17px", color: "var(--deep)", margin: 0 }}>
                Vendors &amp; Suppliers ({suppliers.length})
              </h2>
              {isOwner && (
                <button className="btn btn-sm btn-primary" onClick={openAddSupplierModal}>
                  + Add
                </button>
              )}
            </div>

            <div className="pos-search-bar" style={{ marginBottom: "14px", width: "100%" }}>
              <span className="pos-search-icon" aria-hidden="true">🔍</span>
              <input
                placeholder="Search vendor name, phone, GSTIN..."
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "600px", overflowY: "auto" }}>
              {filteredSuppliers.length === 0 ? (
                <p className="muted" style={{ padding: "20px 0", textAlign: "center" }}>
                  No suppliers found.
                </p>
              ) : (
                filteredSuppliers.map((s) => {
                  const isSelected = selectedSupplier?.id === s.id;
                  const payable = Number(s.balancePayable || s.payableBalance || 0);

                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedSupplier(s);
                        loadSupplierLedger(s.id);
                      }}
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
                          📱 {s.mobile || "No mobile"} {s.gstin ? `• GST: ${s.gstin}` : ""}
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
                          {payable > 0 ? "Payable" : "Settled"}
                        </small>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Selected Supplier Profile & Ledger Timeline */}
          {selectedSupplier ? (
            <div className="card" style={{ padding: "22px" }}>
              {/* Supplier Header Banner */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--line)", paddingBottom: "16px", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <div className="eyebrow" style={{ marginBottom: "4px" }}>VENDOR KHATA</div>
                  <h2 style={{ fontSize: "20px", color: "var(--deep)", margin: 0 }}>
                    {selectedSupplier.name}
                  </h2>
                  <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginTop: "6px", fontSize: "13px", color: "var(--mute)" }}>
                    {selectedSupplier.mobile && <span>📱 {selectedSupplier.mobile}</span>}
                    {selectedSupplier.gstin && <span>🏛️ GSTIN: {selectedSupplier.gstin}</span>}
                    {selectedSupplier.address && <span>📍 {selectedSupplier.address}</span>}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {isOwner && (
                    <>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={(e) => openEditSupplierModal(selectedSupplier, e)}
                      >
                        ✏️ Edit Profile
                      </button>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => openPaymentModal(selectedSupplier)}
                      >
                        💳 Record Payment
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Outstanding Balance Banner */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface-low)", padding: "14px 18px", borderRadius: "var(--radius-md)", border: "1px solid var(--line)", marginBottom: "20px" }}>
                <div>
                  <span className="muted" style={{ fontSize: "13px" }}>Outstanding Balance Payable</span>
                  <div style={{ fontSize: "24px", fontWeight: 800, color: Number(selectedSupplier.balancePayable || 0) > 0 ? "var(--orange)" : "var(--cash)" }}>
                    {formatMoney(selectedSupplier.balancePayable || 0)}
                  </div>
                </div>

                {isOwner && Number(selectedSupplier.balancePayable || 0) > 0 && (
                  <button
                    className="btn btn-outline"
                    onClick={() => openPaymentModal(selectedSupplier)}
                    style={{ borderColor: "var(--brand)", color: "var(--brand)", background: "#FFFFFF" }}
                  >
                    Pay Full Due ({formatMoney(selectedSupplier.balancePayable)})
                  </button>
                )}
              </div>

              {/* Ledger Transactions Timeline */}
              <div>
                <h3 style={{ fontSize: "16px", color: "var(--deep)", marginBottom: "12px", fontWeight: 700 }}>
                  Supplier Statement &amp; Transaction Ledger
                </h3>

                {ledgerLoading ? (
                  <div className="loading" style={{ minHeight: "120px" }}>
                    Loading supplier transactions...
                  </div>
                ) : supplierLedger.length === 0 ? (
                  <p className="muted" style={{ padding: "30px 0", textAlign: "center" }}>
                    No transactions recorded for this supplier.
                  </p>
                ) : (
                  <div className="table-wrap" style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-sm)" }}>
                    <table>
                      <thead style={{ background: "var(--surface-low)" }}>
                        <tr>
                          <th>Date &amp; Time</th>
                          <th>Transaction Type</th>
                          <th>Reference / Invoice</th>
                          <th style={{ textAlign: "right" }}>Amount (₹)</th>
                          <th style={{ textAlign: "right" }}>Balance After</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supplierLedger.map((tx) => {
                          const isDebit = tx.type === "PAYMENT" || tx.type === "DEBIT";

                          return (
                            <tr key={tx.id}>
                              <td>
                                <span style={{ fontSize: "13px", color: "var(--deep)" }}>
                                  {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "—"}
                                </span>
                              </td>
                              <td>
                                <span
                                  className={`product-status-chip ${
                                    isDebit ? "active" : "low-stock"
                                  }`}
                                >
                                  {tx.type || (isDebit ? "PAYMENT" : "PURCHASE")}
                                </span>
                              </td>
                              <td>
                                <span style={{ fontSize: "13px", color: "var(--mute)" }}>
                                  {tx.reference || tx.notes || "—"}
                                </span>
                              </td>
                              <td
                                style={{
                                  textAlign: "right",
                                  fontWeight: 700,
                                  color: isDebit ? "var(--cash)" : "var(--orange)",
                                }}
                              >
                                {isDebit ? `- ${formatMoney(tx.amount)}` : `+ ${formatMoney(tx.amount)}`}
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
            <div className="card" style={{ padding: "40px", textAlign: "center" }}>
              <p className="muted">Select a supplier on the left to view their detailed profile and transaction ledger.</p>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL 1: PURCHASE ORDER DETAILS DRAWER
          ========================================================================= */}
      {showPurchaseDetailModal && inspectedPurchase && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setShowPurchaseDetailModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="purchase-detail-title"
        >
          <div className="inventory-drawer-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "640px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "12px" }}>
              <div>
                <span className="eyebrow" style={{ marginBottom: "4px" }}>PURCHASE INVOICE</span>
                <h3 id="purchase-detail-title" style={{ fontSize: "19px", color: "var(--deep)", margin: 0 }}>
                  {inspectedPurchase.purchaseNumber || `PO #${inspectedPurchase.id}`}
                </h3>
              </div>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setShowPurchaseDetailModal(false)}
              >
                ✕
              </button>
            </div>

            {inspectedPurchaseLoading ? (
              <div className="loading" style={{ minHeight: "150px" }}>
                Loading purchase items...
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Meta details */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", background: "var(--surface-low)", padding: "12px 16px", borderRadius: "8px", fontSize: "13.5px" }}>
                  <div>
                    <span className="muted">Vendor / Supplier:</span>
                    <strong style={{ display: "block", color: "var(--deep)" }}>{inspectedPurchase.supplierName || "—"}</strong>
                  </div>
                  <div>
                    <span className="muted">Supplier Invoice Ref:</span>
                    <strong style={{ display: "block", color: "var(--deep)" }}>{inspectedPurchase.supplierInvoiceNumber || "—"}</strong>
                  </div>
                  <div>
                    <span className="muted">Recorded Date:</span>
                    <strong style={{ display: "block", color: "var(--deep)" }}>
                      {inspectedPurchase.createdAt ? new Date(inspectedPurchase.createdAt).toLocaleString() : "—"}
                    </strong>
                  </div>
                  <div>
                    <span className="muted">Payment Status:</span>
                    <strong style={{ display: "block", color: "var(--brand)" }}>{inspectedPurchase.paymentStatus || "UNPAID"}</strong>
                  </div>
                </div>

                {/* Items breakdown */}
                <div>
                  <h4 style={{ fontSize: "14px", color: "var(--deep)", marginBottom: "8px", fontWeight: 700 }}>
                    Received Stock Items
                  </h4>
                  <div className="table-wrap" style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-sm)" }}>
                    <table>
                      <thead style={{ background: "var(--surface-low)" }}>
                        <tr>
                          <th>Item Name</th>
                          <th style={{ textAlign: "right" }}>Qty</th>
                          <th style={{ textAlign: "right" }}>Cost (₹)</th>
                          <th style={{ textAlign: "right" }}>Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(inspectedPurchase.items || []).length === 0 ? (
                          <tr>
                            <td colSpan="4" style={{ textAlign: "center", padding: "16px" }} className="muted">
                              Summary line item only.
                            </td>
                          </tr>
                        ) : (
                          inspectedPurchase.items.map((item, idx) => (
                            <tr key={idx}>
                              <td>{item.productName || `Product #${item.productId}`}</td>
                              <td style={{ textAlign: "right", fontWeight: 600 }}>{item.quantity}</td>
                              <td style={{ textAlign: "right" }}>{formatMoney(item.unitCost)}</td>
                              <td style={{ textAlign: "right", fontWeight: 700 }}>
                                {formatMoney(Number(item.quantity) * Number(item.unitCost))}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totals */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", borderTop: "1px solid var(--line)", paddingTop: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                    <span>Total Purchase Value:</span>
                    <strong style={{ color: "var(--deep)" }}>{formatMoney(inspectedPurchase.total || inspectedPurchase.totalAmount)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                    <span>Amount Paid:</span>
                    <strong style={{ color: "var(--cash)" }}>{formatMoney(inspectedPurchase.paidAmount || 0)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", fontWeight: 800 }}>
                    <span>Outstanding Payable:</span>
                    <span style={{ color: "var(--orange)" }}>{formatMoney(inspectedPurchase.payableAmount || 0)}</span>
                  </div>
                </div>

                <button
                  className="btn btn-outline"
                  onClick={() => setShowPurchaseDetailModal(false)}
                >
                  Close Details
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: ADD / EDIT SUPPLIER MODAL
          ========================================================================= */}
      {showSupplierModal && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setShowSupplierModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="supplier-modal-title"
        >
          <div className="inventory-drawer-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "12px" }}>
              <div>
                <span className="eyebrow" style={{ marginBottom: "4px" }}>
                  {editingSupplierId ? "EDIT VENDOR" : "NEW VENDOR"}
                </span>
                <h3 id="supplier-modal-title" style={{ fontSize: "19px", color: "var(--deep)", margin: 0 }}>
                  {editingSupplierId ? "Update Supplier Profile" : "Register New Supplier"}
                </h3>
              </div>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setShowSupplierModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSupplierSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="input-group">
                <label htmlFor="sup-name-input">Supplier / Firm Name *</label>
                <input
                  id="sup-name-input"
                  required
                  placeholder="e.g. Balaji Traders Pvt Ltd"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label htmlFor="sup-mobile-input">Mobile / Contact Number</label>
                <input
                  id="sup-mobile-input"
                  placeholder="e.g. 9876543210"
                  value={supplierForm.mobile}
                  onChange={(e) => setSupplierForm({ ...supplierForm, mobile: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label htmlFor="sup-gstin-input">GSTIN (Optional)</label>
                <input
                  id="sup-gstin-input"
                  placeholder="e.g. 29AAAAA0000A1Z5"
                  value={supplierForm.gstin}
                  onChange={(e) => setSupplierForm({ ...supplierForm, gstin: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label htmlFor="sup-address-input">Warehouse / Office Address</label>
                <input
                  id="sup-address-input"
                  placeholder="e.g. Plot 42, APMC Market, Bangalore"
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => setShowSupplierModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={supplierSubmitting}
                >
                  {supplierSubmitting ? "Saving..." : editingSupplierId ? "Update Profile" : "Register Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: RECORD SUPPLIER PAYMENT
          ========================================================================= */}
      {showPaymentModal && selectedSupplier && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setShowPaymentModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-modal-title"
        >
          <div className="inventory-drawer-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "12px" }}>
              <div>
                <span className="eyebrow gold" style={{ marginBottom: "4px" }}>VENDOR SETTLEMENT</span>
                <h3 id="payment-modal-title" style={{ fontSize: "19px", color: "var(--deep)", margin: 0 }}>
                  Record Payment: {selectedSupplier.name}
                </h3>
              </div>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setShowPaymentModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ background: "var(--surface-low)", padding: "10px 14px", borderRadius: "8px", display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
              <span>Current Outstanding Payable:</span>
              <strong style={{ color: "var(--orange)" }}>
                {formatMoney(selectedSupplier.balancePayable || 0)}
              </strong>
            </div>

            <form onSubmit={handlePaymentSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="input-group">
                <label htmlFor="pay-amount-input">Payment Amount (₹) *</label>
                <input
                  id="pay-amount-input"
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 5000"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label>Payment Method *</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                >
                  <option value="CASH">💵 Cash</option>
                  <option value="UPI">📱 UPI (Google Pay / PhonePe / QR)</option>
                  <option value="BANK_TRANSFER">🏦 Bank Transfer / NEFT / IMPS</option>
                  <option value="CHEQUE">📝 Cheque / Draft</option>
                </select>
              </div>

              <div className="input-group">
                <label htmlFor="pay-ref-input">Transaction Reference / UTR #</label>
                <input
                  id="pay-ref-input"
                  placeholder="e.g. UPI Ref #948201 / Cheque #00492"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label htmlFor="pay-notes-input">Payment Remarks (Optional)</label>
                <input
                  id="pay-notes-input"
                  placeholder="e.g. Clearance for invoice #8492"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => setShowPaymentModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={paymentSubmitting}
                >
                  {paymentSubmitting ? "Recording Payment..." : "Confirm Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
