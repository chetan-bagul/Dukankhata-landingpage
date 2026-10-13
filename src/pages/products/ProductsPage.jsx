import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getProducts,
  createProduct,
  updateProduct,
  deactivateProduct,
} from "../../api/productApi";
import { getApiErrorMessage } from "../../api/apiError";

function formatMoney(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const INITIAL_FORM = {
  id: null,
  name: "",
  sku: "",
  sellingPrice: "",
  costPrice: "",
  hsnCode: "",
  gstRate: "0",
  currentStock: "",
  minStockThreshold: "5",
  active: true,
};

export default function ProductsPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";

  // Data states
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState("ALL"); // 'ALL' | 'ACTIVE' | 'LOW_STOCK' | 'OUT_OF_STOCK'

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadProducts() {
    setLoading(true);
    setError("");
    try {
      const res = await getProducts();
      const raw = res.data?.data || res.data || [];
      setProducts(Array.isArray(raw) ? raw : []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load products catalog."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search text filter
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name?.toLowerCase().includes(q) ||
        p.hsnCode?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        String(p.sellingPrice).includes(q);

      if (!matchesSearch) return false;

      // Status filters
      const stock = Number(p.currentStock ?? 10);
      const minThreshold = Number(p.minStockThreshold ?? p.reorderLevel ?? 5);

      if (filterMode === "ACTIVE") return p.active !== false;
      if (filterMode === "LOW_STOCK") return stock > 0 && stock <= minThreshold;
      if (filterMode === "OUT_OF_STOCK") return stock <= 0;
      return true;
    });
  }, [products, searchQuery, filterMode]);

  // Paginated rows
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;

  // Open Create Modal
  const handleOpenCreate = () => {
    if (!isOwner) {
      setError("Only store owners are authorized to add products.");
      return;
    }
    setForm(INITIAL_FORM);
    setIsEditing(false);
    setError("");
    setMessage("");
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (p) => {
    if (!isOwner) {
      setError("Only store owners are authorized to edit products.");
      return;
    }
    setForm({
      id: p.id,
      name: p.name || "",
      sku: p.sku || "",
      sellingPrice: String(p.sellingPrice || ""),
      costPrice: p.costPrice != null ? String(p.costPrice) : "",
      hsnCode: p.hsnCode || "",
      gstRate: String(p.gstRate || "0"),
      currentStock: p.currentStock != null ? String(p.currentStock) : "",
      minStockThreshold: String(p.minStockThreshold || p.reorderLevel || "5"),
      active: p.active !== false,
    });
    setIsEditing(true);
    setError("");
    setMessage("");
    setShowModal(true);
  };

  // Save Product (Create or Update)
  async function handleSaveProduct(e) {
    e.preventDefault();
    if (!form.name.trim() || Number(form.sellingPrice) <= 0) {
      setError("Please provide a valid product name and positive selling price.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        sellingPrice: Number(form.sellingPrice),
        costPrice: form.costPrice ? Number(form.costPrice) : null,
        hsnCode: form.hsnCode.trim() || null,
        gstRate: Number(form.gstRate) || 0,
        currentStock: form.currentStock !== "" ? Number(form.currentStock) : undefined,
        minStockThreshold: Number(form.minStockThreshold) || 5,
        active: form.active,
      };

      if (isEditing && form.id) {
        await updateProduct(form.id, payload);
        setMessage(`Product "${form.name}" updated successfully.`);
      } else {
        await createProduct(payload);
        setMessage(`Product "${form.name}" created successfully.`);
      }

      setShowModal(false);
      await loadProducts();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save product. Check inputs."));
    } finally {
      setSaving(false);
    }
  }

  // Deactivate Product
  async function handleDeactivate(p) {
    if (!isOwner) {
      setError("Only store owners are authorized to deactivate products.");
      return;
    }

    if (!window.confirm(`Are you sure you want to deactivate "${p.name}"?`)) {
      return;
    }

    setError("");
    setMessage("");
    try {
      await deactivateProduct(p.id);
      setMessage(`Product "${p.name}" deactivated.`);
      await loadProducts();
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to deactivate product."));
    }
  }

  return (
    <div className="products-catalog-page">
      {/* Top Header Card */}
      <div className="closing-header-card">
        <div>
          <div className="eyebrow" style={{ marginBottom: "6px" }}>STORE INVENTORY</div>
          <h1 style={{ fontSize: "24px", color: "var(--deep)" }}>Product Catalogue</h1>
          <p className="muted" style={{ fontSize: "13.5px" }}>
            Manage your store's item catalog, pricing, GST rates, barcodes, and stock levels.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {isOwner && (
            <button className="btn btn-primary" onClick={handleOpenCreate}>
              + Add New Product
            </button>
          )}
          <Link className="btn btn-outline" to="/inventory">
            📦 Stock Adjustments
          </Link>
          <Link className="btn btn-outline" to="/pos">
            🛒 Open POS
          </Link>
        </div>
      </div>

      {error && <div className="alert-banner error" style={{ marginBottom: "16px" }}>{error}</div>}
      {message && <div className="alert-banner info" style={{ marginBottom: "16px" }}>{message}</div>}

      {/* Filter & Search Bar */}
      <div className="products-filter-header">
        {/* Preset Category Chips */}
        <div className="history-preset-chips">
          <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--mute)", marginRight: "4px" }}>
            FILTER:
          </span>
          <button
            className={`preset-chip ${filterMode === "ALL" ? "active" : ""}`}
            onClick={() => {
              setFilterMode("ALL");
              setCurrentPage(1);
            }}
          >
            All ({products.length})
          </button>
          <button
            className={`preset-chip ${filterMode === "ACTIVE" ? "active" : ""}`}
            onClick={() => {
              setFilterMode("ACTIVE");
              setCurrentPage(1);
            }}
          >
            Active Only
          </button>
          <button
            className={`preset-chip ${filterMode === "LOW_STOCK" ? "active" : ""}`}
            onClick={() => {
              setFilterMode("LOW_STOCK");
              setCurrentPage(1);
            }}
          >
            ⚠️ Low Stock
          </button>
          <button
            className={`preset-chip ${filterMode === "OUT_OF_STOCK" ? "active" : ""}`}
            onClick={() => {
              setFilterMode("OUT_OF_STOCK");
              setCurrentPage(1);
            }}
          >
            Out of Stock
          </button>
        </div>

        {/* Search & Refresh */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div className="pos-search-bar" style={{ minWidth: "240px" }}>
            <span className="pos-search-icon" aria-hidden="true">🔍</span>
            <input
              placeholder="Search by name, SKU, HSN..."
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
            onClick={loadProducts}
            disabled={loading}
            title="Refresh product catalogue"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Products Table Card */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product Name &amp; SKU</th>
                <th>Selling Price</th>
                <th>GST &amp; HSN</th>
                <th>Current Stock</th>
                <th>Reorder Level</th>
                <th>Status</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "36px" }}>
                    <div className="loading" style={{ minHeight: "60px" }}>
                      Loading catalogue items...
                    </div>
                  </td>
                </tr>
              ) : paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "40px" }} className="muted">
                    No products found matching your search.
                    {isOwner && (
                      <div style={{ marginTop: "12px" }}>
                        <button className="btn btn-sm btn-primary" onClick={handleOpenCreate}>
                          + Add First Product
                        </button>
                      </div>
                    )}
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
                      <td style={{ fontWeight: 800, color: "var(--brand)", fontSize: "14.5px" }}>
                        {formatMoney(p.sellingPrice)}
                      </td>
                      <td>
                        <span style={{ fontSize: "13px" }}>
                          GST {p.gstRate || 0}%
                        </span>
                        {p.hsnCode && (
                          <small style={{ display: "block", color: "var(--mute)", fontSize: "11px" }}>
                            HSN: {p.hsnCode}
                          </small>
                        )}
                      </td>
                      <td>
                        <span
                          className={`product-status-chip ${
                            isOut ? "low-stock" : isLow ? "low-stock" : "active"
                          }`}
                        >
                          {isOut ? "Out of Stock (0)" : `${stock} units`}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "13px", color: "var(--mute)" }}>
                          {minThreshold} units
                        </span>
                      </td>
                      <td>
                        <span
                          className={`product-status-chip ${
                            p.active !== false ? "active" : "inactive"
                          }`}
                        >
                          {p.active !== false ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                          {isOwner ? (
                            <>
                              <button
                                className="btn btn-sm btn-outline"
                                onClick={() => handleOpenEdit(p)}
                                title="Edit Product"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                className="btn btn-sm btn-outline"
                                style={{ color: "var(--bad)" }}
                                onClick={() => handleDeactivate(p)}
                                title="Deactivate Product"
                              >
                                🗑️
                              </button>
                            </>
                          ) : (
                            <span className="muted" style={{ fontSize: "12px" }}>
                              View Only
                            </span>
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

      {/* ================= MODAL: CREATE / EDIT PRODUCT ================= */}
      {showModal && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setShowModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-modal-title"
        >
          <div className="product-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "12px" }}>
              <h3 id="product-modal-title" style={{ fontSize: "19px", color: "var(--deep)" }}>
                {isEditing ? `Edit Product: ${form.name}` : "Create New Product"}
              </h3>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setShowModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Product Name */}
              <div className="input-group">
                <label htmlFor="prod-name">Product Name *</label>
                <input
                  id="prod-name"
                  required
                  placeholder="e.g. Basmati Rice 5kg / Special Chai"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              {/* SKU / Barcode */}
              <div className="input-group">
                <label htmlFor="prod-sku">Barcode / SKU Identifier (Optional)</label>
                <input
                  id="prod-sku"
                  placeholder="e.g. 8901234567890 / RICE-5KG"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                />
              </div>

              {/* Pricing row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div className="input-group">
                  <label htmlFor="prod-selling">Selling Price (₹) *</label>
                  <input
                    id="prod-selling"
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={form.sellingPrice}
                    onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="prod-cost">Cost Price (₹) (Optional)</label>
                  <input
                    id="prod-cost"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.costPrice}
                    onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                  />
                </div>
              </div>

              {/* HSN & GST */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div className="input-group">
                  <label htmlFor="prod-hsn">HSN / SAC Code</label>
                  <input
                    id="prod-hsn"
                    placeholder="e.g. 1006 / 1905"
                    value={form.hsnCode}
                    onChange={(e) => setForm({ ...form, hsnCode: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="prod-gst">GST Rate</label>
                  <select
                    id="prod-gst"
                    value={form.gstRate}
                    onChange={(e) => setForm({ ...form, gstRate: e.target.value })}
                  >
                    <option value="0">0% (Nil / Exempt)</option>
                    <option value="5">5% (Essential Goods)</option>
                    <option value="12">12% (Standard Low)</option>
                    <option value="18">18% (Standard High)</option>
                    <option value="28">28% (Luxury / Aerated)</option>
                  </select>
                </div>
              </div>

              {/* Stock & Threshold */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div className="input-group">
                  <label htmlFor="prod-stock">Current Stock Qty</label>
                  <input
                    id="prod-stock"
                    type="number"
                    min="0"
                    placeholder="e.g. 50"
                    value={form.currentStock}
                    onChange={(e) => setForm({ ...form, currentStock: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="prod-threshold">Min Reorder Level</label>
                  <input
                    id="prod-threshold"
                    type="number"
                    min="1"
                    placeholder="e.g. 5"
                    value={form.minStockThreshold}
                    onChange={(e) => setForm({ ...form, minStockThreshold: e.target.value })}
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div style={{ marginTop: "4px" }}>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  />
                  <span>Active product (available for billing in POS &amp; Closing)</span>
                </label>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={saving}
                >
                  {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
