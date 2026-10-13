import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getSales, posGetSale, downloadInvoice, parsePaginationHeaders } from "../../api/posApi";
import { listReturns, returnSale } from "../../api/returnApi";
import { getApiErrorMessage } from "../../api/apiError";
import { newIdempotencyKey } from "../../api/idempotency";
import InvoicePreviewModal from "../../components/documents/InvoicePreviewModal";
import { printInvoiceDocument } from "../../utils/printInvoice";

function formatMoney(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function ReturnsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const isOwner = user?.role === "OWNER" || user?.role === "ADMIN";

  // Tab View: 'BILLS' | 'RETURN_DESK' | 'RETURNS_HISTORY'
  const [activeTab, setActiveTab] = useState(() => {
    if (location.pathname === "/bills") return "BILLS";
    return "BILLS";
  });

  // Data states
  const [sales, setSales] = useState([]);
  const [returnsList, setReturnsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Server Pagination state for POS sales
  const [salesPage, setSalesPage] = useState(0);
  const [hasMoreSales, setHasMoreSales] = useState(false);
  const [loadingMoreSales, setLoadingMoreSales] = useState(false);

  // ================= 1. BILLS / SALES SEARCH & FILTER =================
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // 'ALL' | 'COMPLETED' | 'RETURNED'
  const [paymentFilter, setPaymentFilter] = useState("ALL"); // 'ALL' | 'CASH' | 'UPI' | 'UDHAR'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ================= 2. INVOICE SNAPSHOT MODAL =================
  const [inspectedSale, setInspectedSale] = useState(null);
  const [inspectedSaleLoading, setInspectedSaleLoading] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [previewSale, setPreviewSale] = useState(null);

  // ================= 3. RETURN DESK =================
  const [searchSaleInput, setSearchSaleInput] = useState("");
  const [targetSale, setTargetSale] = useState(null);
  const [findingSale, setFindingSale] = useState(false);
  const [returnReason, setReturnReason] = useState("Customer Return / Defective Item");
  const [refundMethod, setRefundMethod] = useState("CASH"); // 'CASH' | 'UPI' | 'UDHAR'
  const [returnSubmitting, setReturnSubmitting] = useState(false);

  // Load Sales & Returns
  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [salesRes, returnsRes] = await Promise.allSettled([
        getSales(0, 25),
        listReturns(),
      ]);

      if (salesRes.status === "fulfilled") {
        const raw = salesRes.value.data?.data || salesRes.value.data || [];
        setSales(Array.isArray(raw) ? raw : []);
        const meta = parsePaginationHeaders(salesRes.value?.headers);
        setSalesPage(meta.page);
        setHasMoreSales(meta.hasMore);
      }

      if (returnsRes.status === "fulfilled") {
        const raw = returnsRes.value.data?.data || returnsRes.value.data || [];
        setReturnsList(Array.isArray(raw) ? raw : []);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load sales and return records."));
    } finally {
      setLoading(false);
    }
  }

  // Load more bills from server when X-Has-More is true
  async function handleLoadMoreSales() {
    if (loadingMoreSales || !hasMoreSales) return;
    setLoadingMoreSales(true);
    try {
      const nextPage = salesPage + 1;
      const res = await getSales(nextPage, 25);
      const raw = res.data?.data || res.data || [];
      const newItems = Array.isArray(raw) ? raw : [];
      const meta = parsePaginationHeaders(res.headers);

      setSales((prev) => {
        const existingIds = new Set(prev.map((s) => s.id));
        const filteredNew = newItems.filter((s) => !existingIds.has(s.id));
        return [...prev, ...filteredNew];
      });
      setSalesPage(meta.page);
      setHasMoreSales(meta.hasMore);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load more bills from server."));
    } finally {
      setLoadingMoreSales(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Sales
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.invoiceNumber?.toLowerCase().includes(q) ||
        s.customerName?.toLowerCase().includes(q) ||
        s.customerMobile?.includes(q) ||
        String(s.id).toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Status check
      const isReturned =
        s.status === "RETURNED" ||
        returnsList.some((r) => r.saleId === s.id || r.invoiceNumber === s.invoiceNumber);

      if (statusFilter === "COMPLETED" && isReturned) return false;
      if (statusFilter === "RETURNED" && !isReturned) return false;

      // Payment method filter
      if (paymentFilter !== "ALL") {
        const cash = Number(s.cashAmount || s.payments?.find((p) => p.method === "CASH")?.amount || 0);
        const upi = Number(s.upiAmount || s.payments?.find((p) => p.method === "UPI")?.amount || 0);
        const udhar = Number(
          s.creditAmount || s.udharAmount || s.payments?.find((p) => p.method === "UDHAR")?.amount || 0
        );
        if (paymentFilter === "CASH" && !(cash > 0)) return false;
        if (paymentFilter === "UPI" && !(upi > 0)) return false;
        if (paymentFilter === "UDHAR" && !(udhar > 0)) return false;
      }

      return true;
    });
  }, [sales, returnsList, searchQuery, statusFilter, paymentFilter]);

  // Aggregate Metrics
  const totalSalesVolume = useMemo(() => {
    return sales.reduce((acc, s) => acc + Number(s.total || s.totalAmount || 0), 0);
  }, [sales]);

  const totalRefundsVolume = useMemo(() => {
    return returnsList.reduce(
      (acc, r) => acc + Number(r.refundTotal || r.amount || r.total || 0),
      0
    );
  }, [returnsList]);

  // Paginated Rows
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSales.slice(start, start + pageSize);
  }, [filteredSales, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredSales.length / pageSize) || 1;

  // ================= VIEW INVOICE DETAIL =================
  const openInvoiceDetails = async (sale) => {
    setInspectedSale(sale);
    setShowInvoiceModal(true);
    setInspectedSaleLoading(true);
    setError("");

    try {
      const res = await posGetSale(sale.id);
      const full = res.data?.data || res.data;
      if (full) {
        setInspectedSale(full);
      }
    } catch {
      // Keep basic sale snapshot if detail endpoint fails
    } finally {
      setInspectedSaleLoading(false);
    }
  };

  // Download / Preview PDF
  const handleDownloadInvoicePdf = async (saleId, e) => {
    if (e) e.stopPropagation();
    const existing = (inspectedSale && String(inspectedSale.id) === String(saleId))
      ? inspectedSale
      : sales.find((s) => String(s.id) === String(saleId));

    if (existing) {
      // If we don't have items array yet, fetch full sale details
      if (!existing.items || existing.items.length === 0) {
        try {
          const res = await posGetSale(saleId);
          const full = res.data?.data || res.data;
          setPreviewSale(full || existing);
          return;
        } catch {
          setPreviewSale(existing);
          return;
        }
      }
      setPreviewSale(existing);
      return;
    }

    setDownloadingPdf(true);
    setError("");
    try {
      const res = await posGetSale(saleId);
      const full = res.data?.data || res.data;
      if (full) {
        setPreviewSale(full);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load invoice for printing."));
    } finally {
      setDownloadingPdf(false);
    }
  };

  // ================= INITIATE RETURN WORKFLOW =================
  const initiateReturnForSale = (sale) => {
    setTargetSale(sale);
    setSearchSaleInput(sale.invoiceNumber || sale.id);
    setReturnReason("Customer Return / Defective Item");

    // Auto-select refund method matching primary payment mode
    if (Number(sale.creditAmount || sale.udharAmount || 0) > 0) {
      setRefundMethod("UDHAR");
    } else if (Number(sale.upiAmount || 0) > 0) {
      setRefundMethod("UPI");
    } else {
      setRefundMethod("CASH");
    }

    setActiveTab("RETURN_DESK");
    setError("");
    setMessage("");
  };

  // Find sale by invoice # or UUID
  const handleFindSale = async (e) => {
    e.preventDefault();
    const query = searchSaleInput.trim();
    if (!query) {
      setError("Please enter an Invoice Number or Sale UUID.");
      return;
    }

    setFindingSale(true);
    setError("");
    setMessage("");
    setTargetSale(null);

    try {
      // Look in loaded sales first
      let found = sales.find(
        (s) =>
          s.invoiceNumber?.toLowerCase() === query.toLowerCase() ||
          String(s.id).toLowerCase() === query.toLowerCase()
      );

      if (!found) {
        // Try backend lookup
        const res = await posGetSale(query);
        found = res.data?.data || res.data;
      }

      if (!found) {
        setError(`No sale invoice found matching "${query}". Check the UUID or invoice number.`);
        return;
      }

      setTargetSale(found);

      // Default refund method
      if (Number(found.creditAmount || found.udharAmount || 0) > 0) {
        setRefundMethod("UDHAR");
      } else if (Number(found.upiAmount || 0) > 0) {
        setRefundMethod("UPI");
      } else {
        setRefundMethod("CASH");
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Sale not found. Please verify the sale identifier."));
    } finally {
      setFindingSale(false);
    }
  };

  // Process Return Submission
  async function handleProcessReturnSubmit(e) {
    e.preventDefault();
    if (!targetSale) return;

    // Check if already returned
    const alreadyReturned = returnsList.some(
      (r) => r.saleId === targetSale.id || r.invoiceNumber === targetSale.invoiceNumber
    );

    if (alreadyReturned) {
      setError(
        `Invoice "${targetSale.invoiceNumber || targetSale.id}" has already been returned and refunded.`
      );
      return;
    }

    const saleTotal = Number(targetSale.total || targetSale.totalAmount || 0);

    if (
      !window.confirm(
        `Confirm Full Return for Invoice #${targetSale.invoiceNumber || targetSale.id}?\n\n` +
          `• Refund Amount: ${formatMoney(saleTotal)}\n` +
          `• Refund Mode: ${refundMethod}\n` +
          `• Reason: ${returnReason}\n\n` +
          `Stock quantities will be restocked to inventory, salesperson commissions reversed, and ${
            refundMethod === "UDHAR" ? "customer Udhar balance credited." : "cash/UPI refunded."
          }`
      )
    ) {
      return;
    }

    setReturnSubmitting(true);
    setError("");
    setMessage("");

    try {
      const idempotencyKey = newIdempotencyKey();
      const payload = {
        reason: returnReason.trim() || "Customer return",
        refunds: [
          {
            method: refundMethod,
            amount: saleTotal,
          },
        ],
      };

      await returnSale(targetSale.id, payload, idempotencyKey);

      setMessage(
        `✓ Return processed successfully for Invoice #${
          targetSale.invoiceNumber || targetSale.id
        }! Inventory stock restocked and refund of ${formatMoney(saleTotal)} logged.`
      );

      setTargetSale(null);
      setSearchSaleInput("");
      await loadData();
      setActiveTab("RETURNS_HISTORY");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to process sale return."));
    } finally {
      setReturnSubmitting(false);
    }
  }

  return (
    <div className="returns-page-root">
      {/* Top Header Card */}
      <div className="closing-header-card">
        <div>
          <div className="eyebrow" style={{ marginBottom: "6px" }}>
            SALES, INVOICES &amp; RETURNS
          </div>
          <h1 style={{ fontSize: "24px", color: "var(--deep)" }}>
            Bills, Invoices &amp; Sales Returns
          </h1>
          <p className="muted" style={{ fontSize: "13.5px" }}>
            Search historical bills, view saved tax snapshots, download A4 invoices, and execute controlled sales returns.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            className={`btn ${activeTab === "BILLS" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setActiveTab("BILLS")}
          >
            📜 Bills &amp; Invoices
          </button>
          <button
            className={`btn ${activeTab === "RETURN_DESK" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setActiveTab("RETURN_DESK")}
          >
            🔄 Return Desk
          </button>
          <button
            className={`btn ${activeTab === "RETURNS_HISTORY" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setActiveTab("RETURNS_HISTORY")}
          >
            📋 Return History
          </button>
        </div>
      </div>

      {error && <div className="alert-banner error" style={{ marginBottom: "16px" }}>{error}</div>}
      {message && <div className="alert-banner info" style={{ marginBottom: "16px" }}>{message}</div>}

      {/* Aggregate KPI Summary Cards */}
      <div className="dashboard-metrics-grid" style={{ marginBottom: "20px" }}>
        <div className="dashboard-metric-card">
          <span className="metric-label">Invoiced Bills</span>
          <div className="metric-value">{sales.length} Invoices</div>
          <div className="metric-sub">Recorded retail counter sales</div>
        </div>

        <div className="dashboard-metric-card">
          <span className="metric-label">Gross Sales Invoiced</span>
          <div className="metric-value" style={{ color: "var(--brand)" }}>
            {formatMoney(totalSalesVolume)}
          </div>
          <div className="metric-sub">Lifetime counter billings</div>
        </div>

        <div className="dashboard-metric-card">
          <span className="metric-label">Processed Returns</span>
          <div
            className="metric-value"
            style={{ color: returnsList.length > 0 ? "var(--orange)" : "var(--cash)" }}
          >
            {returnsList.length} Returns
          </div>
          <div className="metric-sub">
            Total refunded: {formatMoney(totalRefundsVolume)}
          </div>
        </div>

        <div className="dashboard-metric-card">
          <span className="metric-label">Return Rate</span>
          <div className="metric-value" style={{ color: "var(--deep)" }}>
            {sales.length > 0
              ? `${((returnsList.length / sales.length) * 100).toFixed(1)}%`
              : "0.0%"}
          </div>
          <div className="metric-sub">Against total bill count</div>
        </div>
      </div>

      {/* =========================================================================
          VIEW 1: BILLS & INVOICE LIST
          ========================================================================= */}
      {activeTab === "BILLS" && (
        <div className="card">
          {/* Filter & Search Bar */}
          <div className="products-filter-header">
            <div className="history-preset-chips">
              <button
                className={`preset-chip ${statusFilter === "ALL" ? "active" : ""}`}
                onClick={() => {
                  setStatusFilter("ALL");
                  setCurrentPage(1);
                }}
              >
                All Bills ({sales.length})
              </button>
              <button
                className={`preset-chip ${statusFilter === "COMPLETED" ? "active" : ""}`}
                onClick={() => {
                  setStatusFilter("COMPLETED");
                  setCurrentPage(1);
                }}
              >
                ✓ Completed
              </button>
              <button
                className={`preset-chip ${statusFilter === "RETURNED" ? "active" : ""}`}
                onClick={() => {
                  setStatusFilter("RETURNED");
                  setCurrentPage(1);
                }}
              >
                🔄 Returned ({returnsList.length})
              </button>

              <select
                value={paymentFilter}
                onChange={(e) => {
                  setPaymentFilter(e.target.value);
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
                <option value="ALL">All Payments</option>
                <option value="CASH">💵 Cash Bills</option>
                <option value="UPI">📱 UPI Bills</option>
                <option value="UDHAR">📒 Udhar Bills</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <div className="pos-search-bar" style={{ minWidth: "260px" }}>
                <span className="pos-search-icon" aria-hidden="true">🔍</span>
                <input
                  placeholder="Search invoice #, customer name, mobile..."
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
                title="Refresh bills"
              >
                🔄
              </button>
            </div>
          </div>

          {/* Bills Table */}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice # &amp; Date</th>
                  <th>Customer</th>
                  <th style={{ textAlign: "right" }}>Bill Amount</th>
                  <th>Payment Allocation</th>
                  <th>Status</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "36px" }}>
                      <div className="loading" style={{ minHeight: "60px" }}>
                        Loading bills and invoice ledger...
                      </div>
                    </td>
                  </tr>
                ) : paginatedSales.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "36px" }} className="muted">
                      No bills match the selected filter.
                    </td>
                  </tr>
                ) : (
                  paginatedSales.map((s) => {
                    const isReturned =
                      s.status === "RETURNED" ||
                      returnsList.some((r) => r.saleId === s.id || r.invoiceNumber === s.invoiceNumber);

                    const cash = Number(s.cashAmount || s.payments?.find((p) => p.method === "CASH")?.amount || 0);
                    const upi = Number(s.upiAmount || s.payments?.find((p) => p.method === "UPI")?.amount || 0);
                    const udhar = Number(
                      s.creditAmount || s.udharAmount || s.payments?.find((p) => p.method === "UDHAR")?.amount || 0
                    );

                    return (
                      <tr key={s.id} className="product-table-row">
                        <td>
                          <strong style={{ display: "block", color: "var(--deep)", fontSize: "14px" }}>
                            {s.invoiceNumber || `Bill #${s.id}`}
                          </strong>
                          <small style={{ color: "var(--mute)", fontSize: "11.5px" }}>
                            {s.createdAt ? new Date(s.createdAt).toLocaleString() : ""}
                          </small>
                        </td>
                        <td>
                          <strong style={{ color: "var(--deep)", fontSize: "13.5px" }}>
                            {s.customerName || "Walk-in Customer"}
                          </strong>
                          {s.customerMobile && (
                            <small style={{ display: "block", color: "var(--mute)", fontSize: "11.5px" }}>
                              📱 {s.customerMobile}
                            </small>
                          )}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "var(--deep)", fontSize: "14.5px" }}>
                          {formatMoney(s.total || s.totalAmount)}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", fontSize: "11.5px" }}>
                            {cash > 0 && (
                              <span className="badge" style={{ background: "var(--tint)", color: "var(--cash)" }}>
                                💵 Cash: {formatMoney(cash)}
                              </span>
                            )}
                            {upi > 0 && (
                              <span className="badge" style={{ background: "var(--purple-tint)", color: "var(--purple)" }}>
                                📱 UPI: {formatMoney(upi)}
                              </span>
                            )}
                            {udhar > 0 && (
                              <span className="badge" style={{ background: "var(--gold-tint)", color: "var(--orange)" }}>
                                📒 Udhar: {formatMoney(udhar)}
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
                          <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => openInvoiceDetails(s)}
                              title="View full invoice details"
                            >
                              🔍 View
                            </button>
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={(e) => handleDownloadInvoicePdf(s.id, e)}
                              disabled={downloadingPdf}
                              title="Download PDF Invoice"
                            >
                              📥 PDF
                            </button>
                            {!isReturned && (
                              <button
                                className="btn btn-sm btn-tonal"
                                onClick={() => initiateReturnForSale(s)}
                                title="Process return for this invoice"
                              >
                                🔄 Return
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

          {/* Pagination Controls */}
          <div className="pagination-controls" style={{ flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <span>
                Showing {(currentPage - 1) * pageSize + 1} to{" "}
                {Math.min(currentPage * pageSize, filteredSales.length)} of{" "}
                {filteredSales.length} loaded bills
              </span>
              {hasMoreSales && (
                <button
                  className="btn btn-sm btn-tonal"
                  onClick={handleLoadMoreSales}
                  disabled={loadingMoreSales}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px" }}
                  title="Backend has more sales records. Click to fetch next 25."
                >
                  {loadingMoreSales ? (
                    <>
                      <span>⏳</span>
                      <span>Loading page {salesPage + 2}...</span>
                    </>
                  ) : (
                    <>
                      <span>⬇️</span>
                      <span>Load Next 25 from Server (Page {salesPage + 2})</span>
                    </>
                  )}
                </button>
              )}
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
                <option value="10">10 / page</option>
                <option value="25">25 / page</option>
                <option value="50">50 / page</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: RETURN DESK (FIND & PROCESS RETURN)
          ========================================================================= */}
      {activeTab === "RETURN_DESK" && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 420px) 1fr", gap: "20px", alignItems: "start" }}>
          {/* Search Sale Form */}
          <div className="card" style={{ padding: "24px" }}>
            <div className="eyebrow" style={{ marginBottom: "4px" }}>RETURN AUTHORIZATION</div>
            <h2 style={{ fontSize: "18px", color: "var(--deep)", margin: "0 0 14px" }}>
              Find Original Sale Invoice
            </h2>
            <p className="muted" style={{ fontSize: "13px", marginBottom: "16px" }}>
              Enter the invoice number (e.g. <code>INV-84920</code>) or paste the sale UUID to verify return eligibility.
            </p>

            <form onSubmit={handleFindSale} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="input-group">
                <label htmlFor="search-sale-input">Invoice Number or Sale UUID *</label>
                <input
                  id="search-sale-input"
                  required
                  placeholder="e.g. INV-1004 or 3fa85f64-5717-4562-b3fc..."
                  value={searchSaleInput}
                  onChange={(e) => setSearchSaleInput(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={findingSale || !searchSaleInput.trim()}
              >
                {findingSale ? "Looking up sale..." : "🔍 Find Sale Invoice"}
              </button>
            </form>
          </div>

          {/* Target Sale Return Execution Card */}
          {targetSale ? (
            <div className="card" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--line)", paddingBottom: "14px", marginBottom: "18px" }}>
                <div>
                  <div className="eyebrow gold" style={{ marginBottom: "4px" }}>RETURN SCOPE</div>
                  <h2 style={{ fontSize: "20px", color: "var(--deep)", margin: 0 }}>
                    Invoice #{targetSale.invoiceNumber || targetSale.id}
                  </h2>
                  <span className="muted" style={{ fontSize: "12.5px" }}>
                    Billed on {targetSale.createdAt ? new Date(targetSale.createdAt).toLocaleString() : "—"}
                  </span>
                </div>

                <span className="badge" style={{ background: "var(--tint)", color: "var(--brand)", padding: "6px 12px", fontWeight: 700, borderRadius: "20px" }}>
                  Eligible for Full Return
                </span>
              </div>

              {/* Transaction Snapshot Summary */}
              <div style={{ background: "var(--surface-low)", padding: "14px 18px", borderRadius: "8px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "18px", fontSize: "13.5px" }}>
                <div>
                  <span className="muted">Customer:</span>
                  <strong style={{ display: "block", color: "var(--deep)" }}>
                    {targetSale.customerName || "Walk-in Customer"}
                  </strong>
                </div>
                <div>
                  <span className="muted">Original Sale Total:</span>
                  <strong style={{ display: "block", color: "var(--deep)", fontSize: "16px" }}>
                    {formatMoney(targetSale.total || targetSale.totalAmount)}
                  </strong>
                </div>
                <div>
                  <span className="muted">Primary Payment:</span>
                  <strong style={{ display: "block", color: "var(--cash)" }}>
                    {Number(targetSale.creditAmount || 0) > 0
                      ? "Udhar Credit"
                      : Number(targetSale.upiAmount || 0) > 0
                      ? "UPI"
                      : "Cash"}
                  </strong>
                </div>
              </div>

              {/* Line items snapshot */}
              <div style={{ marginBottom: "18px" }}>
                <h3 style={{ fontSize: "14px", color: "var(--deep)", marginBottom: "8px", fontWeight: 700 }}>
                  Items to Restock to Inventory ({targetSale.items?.length || 0})
                </h3>
                <div className="table-wrap" style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-sm)" }}>
                  <table>
                    <thead style={{ background: "var(--surface-low)" }}>
                      <tr>
                        <th>Item</th>
                        <th style={{ textAlign: "right" }}>Qty</th>
                        <th style={{ textAlign: "right" }}>Unit Price</th>
                        <th style={{ textAlign: "right" }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(targetSale.items || []).map((item, i) => (
                        <tr key={i}>
                          <td>{item.productName || `Product #${item.productId}`}</td>
                          <td style={{ textAlign: "right", fontWeight: 700 }}>{item.quantity}</td>
                          <td style={{ textAlign: "right" }}>{formatMoney(item.unitPrice)}</td>
                          <td style={{ textAlign: "right", fontWeight: 700 }}>
                            {formatMoney(Number(item.quantity) * Number(item.unitPrice))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Process Return Form */}
              <form onSubmit={handleProcessReturnSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px", borderTop: "1px solid var(--line)", paddingTop: "16px" }}>
                <div className="input-group">
                  <label htmlFor="return-reason-input">Reason for Return *</label>
                  <input
                    id="return-reason-input"
                    required
                    placeholder="e.g. Defective item / Customer changed mind"
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label>Refund Disbursement Method *</label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value)}
                  >
                    <option value="CASH">💵 Cash Refund (Counter Cashout)</option>
                    <option value="UPI">📱 UPI / QR Reversal</option>
                    <option value="UDHAR">📒 Customer Khata Balance Credit</option>
                  </select>
                </div>

                <div style={{ background: "var(--gold-tint)", padding: "12px 16px", borderRadius: "8px", border: "1px solid rgba(232, 196, 104, 0.4)", fontSize: "13px", color: "var(--gold-dark)" }}>
                  ⚠️ <strong>Ledger &amp; Stock Effects:</strong> Processing this return will restock all line item quantities to inventory, cancel any salesperson commission, and issue an authoritative refund of {formatMoney(targetSale.total || targetSale.totalAmount)}.
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setTargetSale(null)}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    disabled={returnSubmitting}
                  >
                    {returnSubmitting
                      ? "Processing Return..."
                      : `Confirm & Process Full Return (${formatMoney(targetSale.total || targetSale.totalAmount)})`}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="card" style={{ padding: "40px", textAlign: "center" }}>
              <p className="muted">
                Use the search box on the left or click <strong>"Return"</strong> on any bill in the Bills tab to load a sale for return.
              </p>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          VIEW 3: RETURNS HISTORY TIMELINE
          ========================================================================= */}
      {activeTab === "RETURNS_HISTORY" && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
            <h2 style={{ fontSize: "17px", color: "var(--deep)", margin: 0 }}>
              Completed Returns Ledger ({returnsList.length})
            </h2>
            <button className="btn btn-sm btn-outline" onClick={loadData} disabled={loading}>
              🔄 Refresh
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Original Invoice #</th>
                  <th>Return Date &amp; Time</th>
                  <th>Return Reason</th>
                  <th>Refund Method</th>
                  <th style={{ textAlign: "right" }}>Refund Amount</th>
                  <th>Audit Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "36px" }}>
                      <div className="loading" style={{ minHeight: "60px" }}>
                        Loading returns history...
                      </div>
                    </td>
                  </tr>
                ) : returnsList.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "36px" }} className="muted">
                      No sales returns have been processed yet.
                    </td>
                  </tr>
                ) : (
                  returnsList.map((r, i) => (
                    <tr key={r.id || i} className="product-table-row">
                      <td>
                        <strong style={{ color: "var(--deep)", fontSize: "14px" }}>
                          {r.invoiceNumber || `Sale #${r.saleId || r.id}`}
                        </strong>
                      </td>
                      <td>
                        <span style={{ fontSize: "13px", color: "var(--mute)" }}>
                          {r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "13px", color: "var(--deep)" }}>
                          {r.reason || "Customer return"}
                        </span>
                      </td>
                      <td>
                        <span className="badge" style={{ background: "var(--surface-low)", color: "var(--deep)" }}>
                          {r.refundMethod || (r.refunds && r.refunds[0]?.method) || "CASH"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "var(--bad)", fontSize: "14.5px" }}>
                        - {formatMoney(r.refundTotal || r.amount || r.total)}
                      </td>
                      <td>
                        <span className="product-status-chip low-stock">
                          ✓ Reversal Logged
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: INVOICE HISTORICAL SNAPSHOT
          ========================================================================= */}
      {showInvoiceModal && inspectedSale && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setShowInvoiceModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="invoice-snapshot-title"
        >
          <div className="inventory-drawer-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "660px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "12px" }}>
              <div>
                <span className="eyebrow" style={{ marginBottom: "4px" }}>TAX INVOICE SNAPSHOT</span>
                <h3 id="invoice-snapshot-title" style={{ fontSize: "19px", color: "var(--deep)", margin: 0 }}>
                  {inspectedSale.invoiceNumber || `Bill #${inspectedSale.id}`}
                </h3>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={(e) => handleDownloadInvoicePdf(inspectedSale.id, e)}
                  disabled={downloadingPdf}
                >
                  📥 Download PDF
                </button>
                <button className="btn btn-sm btn-outline" onClick={() => setShowInvoiceModal(false)}>
                  ✕
                </button>
              </div>
            </div>

            {inspectedSaleLoading ? (
              <div className="loading" style={{ minHeight: "160px" }}>
                Loading saved invoice snapshot...
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Shop and Customer header */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", background: "var(--surface-low)", padding: "12px 16px", borderRadius: "8px", fontSize: "13px" }}>
                  <div>
                    <span className="muted">Store / Merchant:</span>
                    <strong style={{ display: "block", color: "var(--deep)" }}>
                      {user?.shopName || "DukanKhata Store"}
                    </strong>
                    <small style={{ color: "var(--mute)" }}>GSTIN: {user?.gstin || "Unregistered"}</small>
                  </div>

                  <div>
                    <span className="muted">Billed Customer:</span>
                    <strong style={{ display: "block", color: "var(--deep)" }}>
                      {inspectedSale.customerName || "Walk-in Customer"}
                    </strong>
                    <small style={{ color: "var(--mute)" }}>
                      📱 {inspectedSale.customerMobile || "No mobile"}
                    </small>
                  </div>
                </div>

                {/* Line items */}
                <div>
                  <h4 style={{ fontSize: "14px", color: "var(--deep)", marginBottom: "8px", fontWeight: 700 }}>
                    Historical Billed Items ({inspectedSale.items?.length || 0})
                  </h4>
                  <div className="table-wrap" style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-sm)" }}>
                    <table>
                      <thead style={{ background: "var(--surface-low)" }}>
                        <tr>
                          <th>Item</th>
                          <th style={{ textAlign: "right" }}>Qty</th>
                          <th style={{ textAlign: "right" }}>Unit Price</th>
                          <th style={{ textAlign: "right" }}>Line Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(inspectedSale.items || []).map((item, idx) => (
                          <tr key={idx}>
                            <td>
                              <strong>{item.productName || `Product #${item.productId}`}</strong>
                              {item.sku && (
                                <small style={{ display: "block", color: "var(--mute)" }}>
                                  SKU: {item.sku} {item.hsnCode ? `• HSN: ${item.hsnCode}` : ""}
                                </small>
                              )}
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 600 }}>{item.quantity}</td>
                            <td style={{ textAlign: "right" }}>{formatMoney(item.unitPrice)}</td>
                            <td style={{ textAlign: "right", fontWeight: 700 }}>
                              {formatMoney(Number(item.quantity) * Number(item.unitPrice))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financial Summary Breakdown */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", borderTop: "1px solid var(--line)", paddingTop: "12px", fontSize: "13.5px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span className="muted">Subtotal:</span>
                    <strong style={{ color: "var(--deep)" }}>
                      {formatMoney(inspectedSale.subtotal || inspectedSale.total || inspectedSale.totalAmount)}
                    </strong>
                  </div>

                  {Number(inspectedSale.taxAmount || 0) > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span className="muted">Total GST / Tax:</span>
                      <strong style={{ color: "var(--deep)" }}>
                        {formatMoney(inspectedSale.taxAmount)}
                      </strong>
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: 800, borderTop: "1px dashed var(--line)", paddingTop: "8px" }}>
                    <span>Authoritative Invoice Total:</span>
                    <span style={{ color: "var(--brand)" }}>
                      {formatMoney(inspectedSale.total || inspectedSale.totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Payment Breakdown */}
                <div style={{ background: "var(--surface-low)", padding: "12px 16px", borderRadius: "8px", fontSize: "13px" }}>
                  <span className="muted" style={{ display: "block", marginBottom: "6px", fontWeight: 700 }}>
                    Payment Allocation Snapshot
                  </span>
                  <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                    {Number(inspectedSale.cashAmount || inspectedSale.payments?.find((p) => p.method === "CASH")?.amount || 0) > 0 && (
                      <span>💵 Cash: <strong>{formatMoney(inspectedSale.cashAmount || inspectedSale.payments?.find((p) => p.method === "CASH")?.amount)}</strong></span>
                    )}
                    {Number(inspectedSale.upiAmount || inspectedSale.payments?.find((p) => p.method === "UPI")?.amount || 0) > 0 && (
                      <span>📱 UPI: <strong>{formatMoney(inspectedSale.upiAmount || inspectedSale.payments?.find((p) => p.method === "UPI")?.amount)}</strong></span>
                    )}
                    {Number(inspectedSale.creditAmount || inspectedSale.udharAmount || inspectedSale.payments?.find((p) => p.method === "UDHAR")?.amount || 0) > 0 && (
                      <span>📒 Udhar Credit: <strong>{formatMoney(inspectedSale.creditAmount || inspectedSale.udharAmount || inspectedSale.payments?.find((p) => p.method === "UDHAR")?.amount)}</strong></span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    className="btn btn-outline"
                    style={{ flex: 1 }}
                    onClick={() => setShowInvoiceModal(false)}
                  >
                    Close Snapshot
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => setPreviewSale(inspectedSale)}
                  >
                    📄 Print / Save Invoice PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Professional Tax Invoice Preview Modal */}
      <InvoicePreviewModal
        isOpen={Boolean(previewSale)}
        onClose={() => setPreviewSale(null)}
        sale={previewSale}
        shopInfo={user || {}}
      />
    </div>
  );
}
