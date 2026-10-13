import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getProducts } from "../../api/productApi";
import {
  getLowStock,
  receiveStock,
  adjustStock,
  getStockHistory,
} from "../../api/inventoryApi";
import { getApiErrorMessage } from "../../api/apiError";
import {
  getCached,
  setCached,
  CACHE_KEYS,
  TTL,
} from "../../services/cacheService";

function formatMoney(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function InventoryPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";

  // Fast L1/L2 Cache Initializer (0ms instant mount)
  const cachedProds = getCached(CACHE_KEYS.PRODUCTS)?.data;
  const initialProducts = Array.isArray(cachedProds) ? cachedProds : [];

  // Data states
  const [products, setProducts] = useState(() => initialProducts);
  const [lowStockList, setLowStockList] = useState([]);
  const [loading, setLoading] = useState(() => initialProducts.length === 0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState("ALL"); // 'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'HEALTHY'

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Action Modals State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Form Inputs
  const [formProductId, setFormProductId] = useState("");
  const [actionQty, setActionQty] = useState("");
  const [actionNote, setActionNote] = useState("");
  const [adjustDirection, setAdjustDirection] = useState("IN"); // 'IN' | 'OUT'
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Movement History Data
  const [stockHistory, setStockHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  async function loadInventoryData() {
    if (products.length === 0) setLoading(true);
    setError("");
    try {
      const [prodRes, lowRes] = await Promise.all([
        getProducts(),
        getLowStock(),
      ]);

      const rawProducts = prodRes.data?.data || prodRes.data || [];
      const rawLow = lowRes.data?.data || lowRes.data || [];

      const prods = Array.isArray(rawProducts) ? rawProducts : [];
      setProducts(prods);
      setLowStockList(Array.isArray(rawLow) ? rawLow : []);
      if (prods.length > 0) setCached(CACHE_KEYS.PRODUCTS, prods, TTL.PRODUCTS);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load inventory records."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventoryData();
  }, []);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name?.toLowerCase().includes(q) ||
        p.hsnCode?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      const stock = Number(p.currentStock ?? 10);
      const minThreshold = Number(p.minStockThreshold ?? p.reorderLevel ?? 5);

      if (filterMode === "LOW_STOCK") return stock > 0 && stock <= minThreshold;
      if (filterMode === "OUT_OF_STOCK") return stock <= 0;
      if (filterMode === "HEALTHY") return stock > minThreshold;
      return true;
    });
  }, [products, searchQuery, filterMode]);

  // Aggregate Metrics
  const totalValuation = useMemo(() => {
    return products.reduce((acc, p) => {
      const stock = Number(p.currentStock || 0);
      return acc + (stock > 0 ? stock * Number(p.sellingPrice || 0) : 0);
    }, 0);
  }, [products]);

  const outOfStockCount = useMemo(() => {
    return products.filter((p) => Number(p.currentStock || 0) <= 0).length;
  }, [products]);

  // Paginated Rows
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;

  // Open Receive Modal (from row or global header)
  const openReceive = (product = null) => {
    if (!isOwner) {
      setError("Only store owners are authorized to receive stock.");
      return;
    }
    const target = product || products[0] || null;
    setSelectedProduct(target);
    setFormProductId(target ? String(target.id) : "");
    setActionQty("");
    setActionNote("");
    setError("");
    setMessage("");
    setShowReceiveModal(true);
  };

  // Open Adjust Modal (from row or global header)
  const openAdjust = (product = null) => {
    if (!isOwner) {
      setError("Only store owners are authorized to adjust stock.");
      return;
    }
    const target = product || products[0] || null;
    setSelectedProduct(target);
    setFormProductId(target ? String(target.id) : "");
    setActionQty("");
    setActionNote("");
    setAdjustDirection("IN");
    setError("");
    setMessage("");
    setShowAdjustModal(true);
  };

  // Open Movement History
  const openHistory = async (product) => {
    setSelectedProduct(product);
    setHistoryLoading(true);
    setStockHistory([]);
    setError("");
    setShowHistoryModal(true);

    try {
      const res = await getStockHistory(product.id);
      const raw = res.data?.data || res.data || [];
      setStockHistory(Array.isArray(raw) ? raw : []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load stock history timeline."));
    } finally {
      setHistoryLoading(false);
    }
  };

  // Submit Receive Stock
  async function handleReceiveSubmit(e) {
    e.preventDefault();
    const activeTarget =
      selectedProduct || products.find((p) => String(p.id) === String(formProductId));
    const qtyNum = Number(actionQty);

    if (!activeTarget || qtyNum <= 0) {
      setError("Please select a product and enter a valid positive quantity to receive.");
      return;
    }

    setActionSubmitting(true);
    setError("");
    setMessage("");

    try {
      await receiveStock(activeTarget.id, {
        quantity: qtyNum,
        note: actionNote.trim() || undefined,
      });

      setMessage(
        `Successfully received ${qtyNum} units of "${activeTarget.name}". Authoritative stock updated.`
      );
      setShowReceiveModal(false);
      await loadInventoryData();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to receive stock."));
    } finally {
      setActionSubmitting(false);
    }
  }

  // Submit Stock Adjustment
  async function handleAdjustSubmit(e) {
    e.preventDefault();
    const activeTarget =
      selectedProduct || products.find((p) => String(p.id) === String(formProductId));
    const qtyNum = Number(actionQty);

    if (!activeTarget || qtyNum <= 0) {
      setError("Please select a product and enter a valid positive quantity for adjustment.");
      return;
    }

    if (!actionNote.trim()) {
      setError("Please provide a reason / audit note for this stock adjustment.");
      return;
    }

    if (adjustDirection === "OUT" && qtyNum > Number(activeTarget.currentStock || 0)) {
      if (
        !window.confirm(
          `Adjusting OUT ${qtyNum} units will result in negative or zero stock for "${activeTarget.name}". Proceed?`
        )
      ) {
        return;
      }
    }

    setActionSubmitting(true);
    setError("");
    setMessage("");

    try {
      await adjustStock(activeTarget.id, {
        quantity: qtyNum,
        direction: adjustDirection,
        note: actionNote.trim(),
      });

      setMessage(
        `Stock adjusted ${adjustDirection === "IN" ? "+In" : "-Out"} by ${qtyNum} units for "${activeTarget.name}".`
      );
      setShowAdjustModal(false);
      await loadInventoryData();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to adjust stock."));
    } finally {
      setActionSubmitting(false);
    }
  }

  // Active target for modals
  const modalTarget = useMemo(() => {
    return (
      selectedProduct ||
      products.find((p) => String(p.id) === String(formProductId)) ||
      null
    );
  }, [selectedProduct, formProductId, products]);

  return (
    <div className="inventory-page-root">
      {/* Top Header Card */}
      <div className="closing-header-card">
        <div>
          <div className="eyebrow" style={{ marginBottom: "6px" }}>STOCK CONTROL</div>
          <h1 style={{ fontSize: "24px", color: "var(--deep)" }}>Inventory &amp; Stock Management</h1>
          <p className="muted" style={{ fontSize: "13.5px" }}>
            Real-time stock ledger, batch receiving, low-stock threshold alerts, and audit adjustments.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {isOwner && (
            <>
              <button className="btn btn-primary" onClick={() => openReceive(null)}>
                📥 Receive Stock
              </button>
              <button className="btn btn-outline" onClick={() => openAdjust(null)}>
                ⚖️ Stock Adjustment
              </button>
            </>
          )}
          <Link className="btn btn-outline" to="/purchases">
            🚚 Supplier Purchases
          </Link>
          <Link className="btn btn-tonal" to="/pos">
            🛒 Open POS
          </Link>
        </div>
      </div>

      {error && <div className="alert-banner error" style={{ marginBottom: "16px" }}>{error}</div>}
      {message && <div className="alert-banner info" style={{ marginBottom: "16px" }}>{message}</div>}

      {/* Low Stock Warning Banner */}
      {lowStockList.length > 0 && (
        <div className="alert-banner error" style={{ marginBottom: "20px" }}>
          <span aria-hidden="true" style={{ fontSize: "18px" }}>⚠️</span>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <strong>{lowStockList.length} products have reached or breached their minimum reorder threshold.</strong>
              <div style={{ fontSize: "12.5px", opacity: 0.9 }}>
                Review stock levels below and initiate supplier orders to avoid counter stockouts.
              </div>
            </div>
            <button
              className="btn btn-sm btn-outline"
              style={{ background: "#FFFFFF", color: "var(--bad)", borderColor: "var(--bad)" }}
              onClick={() => {
                setFilterMode("LOW_STOCK");
                setCurrentPage(1);
              }}
            >
              Filter Low Stock SKUs
            </button>
          </div>
        </div>
      )}

      {/* Aggregate KPI Summary Cards */}
      <div className="dashboard-metrics-grid" style={{ marginBottom: "20px" }}>
        <div className="dashboard-metric-card">
          <span className="metric-label">Tracked SKUs</span>
          <div className="metric-value">{products.length} Items</div>
          <div className="metric-sub">Active inventory catalog</div>
        </div>

        <div className="dashboard-metric-card">
          <span className="metric-label">Low Stock Warnings</span>
          <div className="metric-value" style={{ color: lowStockList.length > 0 ? "var(--bad)" : "var(--cash)" }}>
            {lowStockList.length} SKUs
          </div>
          <div className="metric-sub">At or below reorder threshold</div>
        </div>

        <div className="dashboard-metric-card">
          <span className="metric-label">Out of Stock Items</span>
          <div className="metric-value" style={{ color: outOfStockCount > 0 ? "var(--bad)" : "var(--deep)" }}>
            {outOfStockCount} SKUs
          </div>
          <div className="metric-sub">Zero available counter units</div>
        </div>

        <div className="dashboard-metric-card">
          <span className="metric-label">Estimated Stock Valuation</span>
          <div className="metric-value" style={{ color: "var(--brand)" }}>
            {formatMoney(totalValuation)}
          </div>
          <div className="metric-sub">Based on current selling price</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="products-filter-header">
        <div className="history-preset-chips">
          <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--mute)", marginRight: "4px" }}>
            VIEW:
          </span>
          <button
            className={`preset-chip ${filterMode === "ALL" ? "active" : ""}`}
            onClick={() => {
              setFilterMode("ALL");
              setCurrentPage(1);
            }}
          >
            All Items ({products.length})
          </button>
          <button
            className={`preset-chip ${filterMode === "LOW_STOCK" ? "active" : ""}`}
            onClick={() => {
              setFilterMode("LOW_STOCK");
              setCurrentPage(1);
            }}
          >
            ⚠️ Low Stock ({lowStockList.length})
          </button>
          <button
            className={`preset-chip ${filterMode === "OUT_OF_STOCK" ? "active" : ""}`}
            onClick={() => {
              setFilterMode("OUT_OF_STOCK");
              setCurrentPage(1);
            }}
          >
            Out of Stock ({outOfStockCount})
          </button>
          <button
            className={`preset-chip ${filterMode === "HEALTHY" ? "active" : ""}`}
            onClick={() => {
              setFilterMode("HEALTHY");
              setCurrentPage(1);
            }}
          >
            Healthy Stock
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div className="pos-search-bar" style={{ minWidth: "240px" }}>
            <span className="pos-search-icon" aria-hidden="true">🔍</span>
            <input
              placeholder="Search product, SKU, HSN..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
            {searchQuery && (
              <button
                className="pos-search-clear"
                onClick={() => setSearchQuery("")}
              >
                ✕
              </button>
            )}
          </div>

          <button
            className="btn btn-sm btn-outline"
            onClick={loadInventoryData}
            disabled={loading}
            title="Refresh inventory"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Main Stock Table */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product &amp; SKU</th>
                <th>Selling Price</th>
                <th>Available Stock</th>
                <th>Reorder Level</th>
                <th>Stock Valuation</th>
                <th>Status</th>
                <th style={{ textAlign: "center" }}>Stock Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "36px" }}>
                    <div className="loading" style={{ minHeight: "60px" }}>
                      Loading inventory records...
                    </div>
                  </td>
                </tr>
              ) : paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "36px" }} className="muted">
                    No inventory records match the selected filter.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => {
                  const stock = Number(p.currentStock ?? 10);
                  const minThreshold = Number(p.minStockThreshold ?? p.reorderLevel ?? 5);
                  const isLow = stock > 0 && stock <= minThreshold;
                  const isOut = stock <= 0;

                  return (
                    <tr key={p.id} className="product-table-row">
                      <td>
                        <strong style={{ display: "block", color: "var(--deep)", fontSize: "14px" }}>
                          {p.name}
                        </strong>
                        <small style={{ color: "var(--mute)", fontSize: "11.5px" }}>
                          ID: #{p.id} {p.sku ? `• SKU: ${p.sku}` : ""}
                        </small>
                      </td>
                      <td style={{ fontWeight: 600 }}>{formatMoney(p.sellingPrice)}</td>
                      <td>
                        <strong
                          style={{
                            fontSize: "15px",
                            color: isOut ? "var(--bad)" : isLow ? "var(--orange)" : "var(--cash)",
                          }}
                        >
                          {stock} units
                        </strong>
                      </td>
                      <td>
                        <span style={{ fontSize: "13px", color: "var(--mute)" }}>
                          {minThreshold} units
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: "var(--deep)" }}>
                        {formatMoney(stock > 0 ? stock * Number(p.sellingPrice || 0) : 0)}
                      </td>
                      <td>
                        <span
                          className={`product-status-chip ${
                            isOut ? "low-stock" : isLow ? "low-stock" : "active"
                          }`}
                        >
                          {isOut ? "Out of Stock" : isLow ? "⚠️ Low Stock" : "✓ In Stock"}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                          {isOwner && (
                            <>
                              <button
                                className="btn btn-sm btn-outline"
                                onClick={() => openReceive(p)}
                                title="Receive stock batch"
                              >
                                📥 Receive
                              </button>
                              <button
                                className="btn btn-sm btn-outline"
                                onClick={() => openAdjust(p)}
                                title="Adjust stock"
                              >
                                ⚖️ Adjust
                              </button>
                            </>
                          )}
                          <button
                            className="btn btn-sm btn-tonal"
                            onClick={() => openHistory(p)}
                            title="View stock movement history"
                          >
                            📜 History
                          </button>
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
        <div className="pagination-controls">
          <div>
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, filteredProducts.length)} of{" "}
            {filteredProducts.length} items
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              className="btn btn-sm btn-outline"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              ← Previous
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

      {/* ================= MODAL 1: RECEIVE STOCK ================= */}
      {showReceiveModal && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setShowReceiveModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="receive-modal-title"
        >
          <div className="inventory-drawer-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "12px" }}>
              <div>
                <span className="eyebrow" style={{ marginBottom: "4px" }}>STOCK RECEIVING</span>
                <h3 id="receive-modal-title" style={{ fontSize: "19px", color: "var(--deep)" }}>
                  Receive Stock Batch
                </h3>
              </div>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setShowReceiveModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReceiveSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Product Selector */}
              <div className="input-group">
                <label htmlFor="receive-prod-select">Select Product *</label>
                <select
                  id="receive-prod-select"
                  value={formProductId}
                  onChange={(e) => {
                    setFormProductId(e.target.value);
                    const p = products.find((x) => String(x.id) === e.target.value);
                    setSelectedProduct(p || null);
                  }}
                  required
                >
                  <option value="">-- Choose Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Current: {p.currentStock || 0} units)
                    </option>
                  ))}
                </select>
              </div>

              {modalTarget && (
                <div style={{ background: "var(--surface-low)", padding: "10px 14px", borderRadius: "8px", display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                  <span>Current Shelf Stock:</span>
                  <strong style={{ color: "var(--deep)" }}>{modalTarget.currentStock || 0} units</strong>
                </div>
              )}

              <div className="input-group">
                <label htmlFor="receive-qty">Received Quantity (Units) *</label>
                <input
                  id="receive-qty"
                  required
                  type="number"
                  min="0.001"
                  step="any"
                  placeholder="e.g. 25"
                  value={actionQty}
                  onChange={(e) => setActionQty(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label htmlFor="receive-note">Batch / Supplier Note (Optional)</label>
                <input
                  id="receive-note"
                  placeholder="e.g. Vendor delivery ref #8492 / Fresh batch"
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                />
              </div>

              <p className="muted" style={{ fontSize: "12px" }}>
                💡 Tip: If you are logging a full supplier purchase order with payment terms, use the{" "}
                <Link to="/purchases" style={{ color: "var(--brand)", fontWeight: 700 }}>
                  Supplier Purchases
                </Link>{" "}
                desk instead.
              </p>

              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => setShowReceiveModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={actionSubmitting || !modalTarget}
                >
                  {actionSubmitting ? "Receiving..." : "Confirm & Receive Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: STOCK ADJUSTMENT ================= */}
      {showAdjustModal && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setShowAdjustModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="adjust-modal-title"
        >
          <div className="inventory-drawer-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "12px" }}>
              <div>
                <span className="eyebrow gold" style={{ marginBottom: "4px" }}>AUDIT ADJUSTMENT</span>
                <h3 id="adjust-modal-title" style={{ fontSize: "19px", color: "var(--deep)" }}>
                  Record Stock Adjustment
                </h3>
              </div>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setShowAdjustModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Product Selector */}
              <div className="input-group">
                <label htmlFor="adjust-prod-select">Select Product *</label>
                <select
                  id="adjust-prod-select"
                  value={formProductId}
                  onChange={(e) => {
                    setFormProductId(e.target.value);
                    const p = products.find((x) => String(x.id) === e.target.value);
                    setSelectedProduct(p || null);
                  }}
                  required
                >
                  <option value="">-- Choose Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Current: {p.currentStock || 0} units)
                    </option>
                  ))}
                </select>
              </div>

              {modalTarget && (
                <div style={{ background: "var(--surface-low)", padding: "10px 14px", borderRadius: "8px", display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                  <span>Authoritative Stock:</span>
                  <strong style={{ color: "var(--deep)" }}>{modalTarget.currentStock || 0} units</strong>
                </div>
              )}

              <div className="input-group">
                <label>Adjustment Direction *</label>
                <select
                  value={adjustDirection}
                  onChange={(e) => setAdjustDirection(e.target.value)}
                >
                  <option value="IN">Adjustment IN (+ Add Found / Unaccounted Stock)</option>
                  <option value="OUT">Adjustment OUT (- Deduct Damaged / Expired / Lost)</option>
                </select>
              </div>

              <div className="input-group">
                <label htmlFor="adjust-qty">Quantity to Adjust *</label>
                <input
                  id="adjust-qty"
                  required
                  type="number"
                  min="0.001"
                  step="any"
                  placeholder="e.g. 5"
                  value={actionQty}
                  onChange={(e) => setActionQty(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label htmlFor="adjust-note">Reason / Audit Note (Required) *</label>
                <input
                  id="adjust-note"
                  required
                  placeholder="e.g. Damaged packet / Physical audit count correction"
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => setShowAdjustModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={actionSubmitting || !modalTarget}
                >
                  {actionSubmitting ? "Adjusting..." : "Apply Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: MOVEMENT HISTORY TIMELINE ================= */}
      {showHistoryModal && selectedProduct && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setShowHistoryModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="history-modal-title"
        >
          <div className="inventory-drawer-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "12px" }}>
              <div>
                <span className="eyebrow" style={{ marginBottom: "4px" }}>STOCK TIMELINE</span>
                <h3 id="history-modal-title" style={{ fontSize: "19px", color: "var(--deep)" }}>
                  Movement History: {selectedProduct.name}
                </h3>
              </div>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setShowHistoryModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface-low)", padding: "10px 14px", borderRadius: "8px" }}>
              <span>Current On-Hand Balance:</span>
              <strong style={{ fontSize: "16px", color: "var(--brand)" }}>
                {selectedProduct.currentStock || 0} units
              </strong>
            </div>

            {historyLoading ? (
              <div className="loading" style={{ minHeight: "120px" }}>
                Loading stock movements...
              </div>
            ) : stockHistory.length === 0 ? (
              <p className="muted" style={{ padding: "24px 0", textAlign: "center" }}>
                No stock movement events recorded for this product.
              </p>
            ) : (
              <div className="movement-history-timeline">
                {stockHistory.map((h) => {
                  const isPositive = Number(h.quantity || 0) > 0;
                  return (
                    <div key={h.id} className="movement-history-row">
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span
                            className={`stock-movement-badge ${
                              isPositive ? "in" : "out"
                            }`}
                          >
                            {h.type || (isPositive ? "RECEIVE" : "SALE / ADJUST")}
                          </span>
                          <span style={{ fontSize: "11.5px", color: "var(--mute)" }}>
                            {h.createdAt ? new Date(h.createdAt).toLocaleString() : ""}
                          </span>
                        </div>
                        {h.note && (
                          <small style={{ display: "block", color: "var(--mute)", marginTop: "4px" }}>
                            Note: {h.note}
                          </small>
                        )}
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <strong
                          style={{
                            fontSize: "14.5px",
                            color: isPositive ? "var(--cash)" : "var(--bad)",
                          }}
                        >
                          {isPositive ? `+${h.quantity}` : h.quantity}
                        </strong>
                        <small style={{ display: "block", color: "var(--mute)" }}>
                          Balance: {h.balanceAfter ?? "—"}
                        </small>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              className="btn btn-outline"
              style={{ marginTop: "10px", width: "100%" }}
              onClick={() => setShowHistoryModal(false)}
            >
              Close Timeline
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
