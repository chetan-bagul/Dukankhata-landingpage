import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { getProducts } from "../../api/productApi";
import { listCustomers } from "../../api/customerApi";
import { listStaff } from "../../api/staffApi";
import { createSale, getSales, downloadInvoice } from "../../api/posApi";
import { newIdempotencyKey } from "../../api/idempotency";
import { getApiErrorMessage } from "../../api/apiError";
import { useAuth } from "../../context/AuthContext";
import InvoicePreviewModal from "../../components/documents/InvoicePreviewModal";
import { printInvoiceDocument } from "../../utils/printInvoice";

function formatMoney(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function PosPage() {
  const { user, enableUdhar, enableStaff } = useAuth();
  const searchInputRef = useRef(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Data states
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [recentBillsDrawerOpen, setRecentBillsDrawerOpen] = useState(false);
  const [recentBillsSearch, setRecentBillsSearch] = useState("");
  const [previewSale, setPreviewSale] = useState(null);
  const [loading, setLoading] = useState(true);

  // Catalog search & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL"); // 'ALL' | 'IN_STOCK' | 'LOW_STOCK'

  // Cart state
  const [cart, setCart] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [sellerId, setSellerId] = useState("");

  // Custom Item Modal/Form
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customItem, setCustomItem] = useState({
    name: "",
    price: "",
    hsnCode: "",
    gstRate: "0",
  });

  // Split Payment Inputs
  const [cash, setCash] = useState("");
  const [upi, setUpi] = useState("");
  const [udhar, setUdhar] = useState("");

  // Status & Transaction Result
  const [submitting, setSubmitting] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [error, setError] = useState("");
  const [completedSale, setCompletedSale] = useState(null);

  // Mobile Checkout Drawer
  const [mobileCheckoutOpen, setMobileCheckoutOpen] = useState(false);

  // Load catalog, customers, staff, and recent sales
  async function loadInitialData() {
    setLoading(true);
    setError("");
    try {
      const [prodRes, custRes, staffRes, salesRes] = await Promise.allSettled([
        getProducts(),
        enableUdhar ? listCustomers() : Promise.resolve([]),
        enableStaff ? listStaff() : Promise.resolve({ data: [] }),
        getSales(),
      ]);

      const rawProducts = prodRes.status === "fulfilled" ? (prodRes.value.data?.data || prodRes.value.data || []) : [];
      const rawCustomers = custRes.status === "fulfilled" ? (custRes.value || []) : [];
      const rawStaff = staffRes.status === "fulfilled" ? (staffRes.value.data?.data || staffRes.value.data || []) : [];
      const rawSales = salesRes.status === "fulfilled" ? (salesRes.value.data?.data || salesRes.value.data || []) : [];

      setProducts(Array.isArray(rawProducts) ? rawProducts : []);
      setCustomers(Array.isArray(rawCustomers) ? rawCustomers : []);
      setStaff(Array.isArray(rawStaff) ? rawStaff : []);
      setRecentSales(Array.isArray(rawSales) ? rawSales : []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load products or customers."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  // Filtered Products Catalog
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search filter
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name?.toLowerCase().includes(q) ||
        p.hsnCode?.toLowerCase().includes(q) ||
        String(p.sellingPrice).includes(q);

      if (!matchesSearch) return false;

      // Category filter
      const stock = Number(p.currentStock ?? 10);
      const minThreshold = Number(p.minStockThreshold ?? 5);

      if (selectedCategory === "IN_STOCK") return stock > 0;
      if (selectedCategory === "LOW_STOCK") return stock > 0 && stock <= minThreshold;
      return true;
    });
  }, [products, searchQuery, selectedCategory]);

  // Filtered Recent Bills for Drawer
  const filteredRecentSales = useMemo(() => {
    const q = recentBillsSearch.toLowerCase().trim();
    if (!q) return recentSales;
    return recentSales.filter((s) => {
      return (
        s.invoiceNumber?.toLowerCase().includes(q) ||
        s.customerName?.toLowerCase().includes(q) ||
        s.customerMobile?.includes(q) ||
        String(s.total || s.totalAmount || "").includes(q)
      );
    });
  }, [recentSales, recentBillsSearch]);

  // Cart Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  }, [cart]);

  const estimatedGst = useMemo(() => {
    return cart.reduce((acc, item) => {
      const rate = Number(item.gstRate || 0);
      return acc + (item.price * item.qty * rate) / 100;
    }, 0);
  }, [cart]);

  const grandTotal = subtotal; // In retail billing, unit price is inclusive or base
  const totalPaid =
    (Number(cash) || 0) + (Number(upi) || 0) + (enableUdhar ? (Number(udhar) || 0) : 0);
  const remaining = grandTotal - totalPaid;
  const changeDue = totalPaid > grandTotal && Number(cash) > 0 ? totalPaid - grandTotal : 0;

  // Selected Customer Details
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => String(c.id) === String(customerId)) || null;
  }, [customers, customerId]);

  // Cart Actions
  const addToCart = (product) => {
    setError("");
    const stockAvailable = Number(product.currentStock ?? 999);

    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        if (existing.qty >= stockAvailable) {
          setError(`Cannot add more. Only ${stockAvailable} in stock.`);
          return prev;
        }
        return prev.map((i) =>
          i.id === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: Number(product.sellingPrice),
          qty: 1,
          hsnCode: product.hsnCode || null,
          gstRate: Number(product.gstRate || 0),
          custom: false,
        },
      ];
    });
  };

  const updateCartQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const nextQty = Math.max(0, item.qty + delta);
            return { ...item, qty: nextQty };
          }
          return item;
        })
        .filter((item) => item.qty > 0)
    );
  };

  const removeCartItem = (id) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const clearCart = () => {
    if (cart.length > 0 && window.confirm("Clear all items in the current cart?")) {
      setCart([]);
      setCash("");
      setUpi("");
      setUdhar("");
      setError("");
    }
  };

  // Add Custom Manual Item
  const handleAddCustomItem = (e) => {
    e.preventDefault();
    if (!customItem.name.trim() || Number(customItem.price) <= 0) {
      setError("Please enter a valid custom item name and selling price.");
      return;
    }

    setCart((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        name: customItem.name.trim(),
        price: Number(customItem.price),
        qty: 1,
        hsnCode: customItem.hsnCode.trim() || null,
        gstRate: Number(customItem.gstRate || 0),
        custom: true,
      },
    ]);

    setCustomItem({ name: "", price: "", hsnCode: "", gstRate: "0" });
    setShowCustomModal(false);
  };

  // Fast Payment Shortcuts
  const setExactCash = () => {
    setCash(String(grandTotal.toFixed(2)));
    setUpi("");
    setUdhar("");
  };

  const setExactUpi = () => {
    setUpi(String(grandTotal.toFixed(2)));
    setCash("");
    setUdhar("");
  };

  const setExactUdhar = () => {
    if (!customerId) {
      setError("Please select a customer before allocating full Udhar credit.");
      return;
    }
    setUdhar(String(grandTotal.toFixed(2)));
    setCash("");
    setUpi("");
  };

  const addCashPreset = (amount) => {
    const current = Number(cash || 0);
    setCash(String(current + amount));
  };

  // Execute Idempotent Checkout
  async function handleCheckout() {
    setError("");

    if (!cart.length) {
      setError("Cart is empty. Please add at least one product.");
      return;
    }

    // Payment validation: total payment must equal total bill amount (within 0.05 rounding)
    if (Math.abs(remaining) > 0.05 && changeDue === 0) {
      setError(
        `Total payments (₹${totalPaid.toFixed(2)}) must equal invoice total (₹${grandTotal.toFixed(2)}). Remaining: ₹${remaining.toFixed(2)}`
      );
      return;
    }

    if (Number(udhar) > 0 && !customerId) {
      setError("Please select a registered Customer to record Udhar credit.");
      return;
    }

    setSubmitting(true);
    const idempotencyKey = newIdempotencyKey();

    try {
      const payload = {
        customerId: enableUdhar ? (customerId || null) : null,
        sellerId: enableStaff ? (sellerId || null) : null,
        items: cart.map((i) => ({
          productId: i.custom ? null : i.id,
          itemName: i.name,
          unitPrice: Number(i.price),
          quantity: Number(i.qty),
          hsnCode: i.hsnCode || null,
          gstRate: Number(i.gstRate || 0),
        })),
        payments: [
          { method: "CASH", amount: changeDue > 0 ? Number(cash) - changeDue : Number(cash || 0) },
          { method: "UPI", amount: Number(upi || 0) },
          ...(enableUdhar ? [{ method: "UDHAR", amount: Number(udhar || 0) }] : []),
        ].filter((p) => p.amount > 0),
      };

      const res = await createSale(payload, idempotencyKey);
      const saleData = res.data || res;

      const selCust = customers.find((c) => c.id === customerId);
      if (selCust) {
        if (!saleData.customerName) saleData.customerName = selCust.name;
        if (!saleData.customerMobile) saleData.customerMobile = selCust.mobile;
      }

      // Checkout confirmed: save receipt, prepend to recent sales, clear cart
      setCompletedSale(saleData);
      setRecentSales((prev) => [saleData, ...prev]);
      setCart([]);
      setCash("");
      setUpi("");
      setUdhar("");
      setCustomerId("");
      setSellerId("");
      setMobileCheckoutOpen(false);

      // Re-fetch products to update live stock count
      getProducts().then((pRes) => {
        const raw = pRes.data?.data || pRes.data || [];
        setProducts(Array.isArray(raw) ? raw : []);
      });
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "POS checkout failed. Please verify items, prices, and try again."
        )
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Download Invoice PDF
  const handleDownloadPdf = async (saleId) => {
    setDownloadingInvoice(true);
    try {
      await downloadInvoice(saleId);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to download PDF invoice."));
    } finally {
      setDownloadingInvoice(false);
    }
  };

  return (
    <div className="pos-page-root">
      {/* Top Header Card */}
      <div className="closing-header-card" style={{ marginBottom: "16px" }}>
        <div>
          <div className="eyebrow gold" style={{ marginBottom: "6px" }}>LARGE SHOP POS</div>
          <h1 style={{ fontSize: "24px", color: "var(--deep)" }}>High-Speed Counter Billing</h1>
          <p className="muted" style={{ fontSize: "13.5px" }}>
            Scan barcodes, search products, split Cash / UPI / Udhar payments, and generate GST invoices.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            className="btn btn-primary"
            onClick={() => setRecentBillsDrawerOpen(true)}
            title="View bills created at this POS register"
            style={{ display: "inline-flex", alignItems: "center", gap: "7px" }}
          >
            <span>📜 Recent Bills</span>
            {recentSales.length > 0 && (
              <span
                style={{
                  background: "#FFFFFF",
                  color: "var(--brand)",
                  fontSize: "11.5px",
                  fontWeight: 800,
                  padding: "1px 7px",
                  borderRadius: "12px",
                }}
              >
                {recentSales.length}
              </span>
            )}
          </button>
          <button
            className="btn btn-outline"
            onClick={() => setShowCustomModal(true)}
            title="Add a custom or uncatalogued item"
          >
            + Custom Item
          </button>
          <Link className="btn btn-outline" to="/returns" title="View all bills and sales returns ledger">
            📑 Bills Ledger
          </Link>
          <Link className="btn btn-outline" to="/inventory">
            📦 Inventory Desk
          </Link>
        </div>
      </div>

      {error && <div className="alert-banner error" style={{ marginBottom: "16px" }}>{error}</div>}

      {/* Main 2-Column POS Register Layout */}
      <div className="pos-layout">
        {/* ================= LEFT COLUMN: Catalog & Fast Search ================= */}
        <div className="pos-catalog-panel">
          {/* Search Input */}
          <div className="pos-search-bar">
            <span className="pos-search-icon" aria-hidden="true">🔍</span>
            <input
              ref={searchInputRef}
              placeholder="Search by product name, HSN, or price..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search products"
              autoComplete="off"
            />
            {searchQuery && (
              <button
                className="pos-search-clear"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Filter Chips */}
          <div className="pos-category-chips">
            <button
              className={`pos-category-chip ${selectedCategory === "ALL" ? "active" : ""}`}
              onClick={() => setSelectedCategory("ALL")}
            >
              All Products ({products.length})
            </button>
            <button
              className={`pos-category-chip ${selectedCategory === "IN_STOCK" ? "active" : ""}`}
              onClick={() => setSelectedCategory("IN_STOCK")}
            >
              In Stock Only
            </button>
            <button
              className={`pos-category-chip ${selectedCategory === "LOW_STOCK" ? "active" : ""}`}
              onClick={() => setSelectedCategory("LOW_STOCK")}
            >
              ⚠️ Low Stock
            </button>
          </div>

          {/* Product Cards Grid */}
          <div className="pos-product-grid">
            {loading ? (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px" }}>
                <div className="loading" style={{ minHeight: "80px" }}>Loading catalog items...</div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px" }} className="muted">
                <p>No products found matching "{searchQuery}".</p>
                <button
                  className="btn btn-sm btn-tonal"
                  style={{ marginTop: "10px" }}
                  onClick={() => setShowCustomModal(true)}
                >
                  + Add as Custom Item
                </button>
              </div>
            ) : (
              filteredProducts.map((p) => {
                const stock = Number(p.currentStock ?? 10);
                const isOutOfStock = stock <= 0;
                const isLow = stock > 0 && stock <= Number(p.minStockThreshold || 5);

                return (
                  <button
                    key={p.id}
                    className="pos-product-card"
                    onClick={() => addToCart(p)}
                    disabled={isOutOfStock}
                    title={`${p.name} - ${formatMoney(p.sellingPrice)}`}
                  >
                    <div>
                      <span className="pos-product-name">{p.name}</span>
                      {p.hsnCode && (
                        <span style={{ fontSize: "11px", color: "var(--mute)", display: "block" }}>
                          HSN: {p.hsnCode}
                        </span>
                      )}
                    </div>

                    <div className="pos-product-footer">
                      <span className="pos-product-price">
                        {formatMoney(p.sellingPrice)}
                      </span>
                      <span className={`pos-stock-pill ${isLow ? "low" : ""}`}>
                        {isOutOfStock ? "Out of Stock" : `Stock: ${stock}`}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ================= RIGHT COLUMN: Cart & Split Payment ================= */}
        <div className="pos-cart-panel">
          <div className="pos-cart-header">
            <h3 style={{ fontSize: "17px", color: "var(--deep)", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🛒</span>
              <span>Active Bill ({cart.reduce((s, i) => s + i.qty, 0)} items)</span>
            </h3>
            {cart.length > 0 && (
              <button
                className="btn btn-sm btn-outline"
                style={{ color: "var(--bad)", fontSize: "12px", padding: "4px 8px" }}
                onClick={clearCart}
              >
                Clear
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="pos-cart-items-list">
            {cart.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0" }} className="muted">
                <span style={{ fontSize: "28px" }}>🛒</span>
                <p style={{ fontSize: "13.5px", marginTop: "6px" }}>
                  Cart is empty. Tap any product on the left to add.
                </p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="pos-cart-item">
                  <div>
                    <strong style={{ display: "block", color: "var(--deep)" }}>
                      {item.name}
                    </strong>
                    <small style={{ color: "var(--mute)" }}>
                      {formatMoney(item.price)} {item.gstRate > 0 ? `(GST ${item.gstRate}%)` : ""}
                    </small>
                  </div>

                  {/* Qty Steppers */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <button
                      className="stepper-btn"
                      style={{ width: "32px", height: "32px", fontSize: "16px" }}
                      onClick={() => updateCartQty(item.id, -1)}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <strong style={{ minWidth: "22px", textAlign: "center", fontSize: "14px" }}>
                      {item.qty}
                    </strong>
                    <button
                      className="stepper-btn"
                      style={{ width: "32px", height: "32px", fontSize: "16px" }}
                      onClick={() => updateCartQty(item.id, 1)}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  <div style={{ textAlign: "right", minWidth: "75px" }}>
                    <strong style={{ color: "var(--deep)", display: "block" }}>
                      {formatMoney(item.price * item.qty)}
                    </strong>
                    <button
                      type="button"
                      onClick={() => removeCartItem(item.id)}
                      style={{ color: "var(--bad)", fontSize: "11px", fontWeight: 600 }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Selectors: Customer (Udhar) & Salesperson */}
          {(enableUdhar || enableStaff) && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: enableUdhar && enableStaff ? "1fr 1fr" : "1fr",
                gap: "10px",
              }}
            >
              {enableUdhar && (
                <div className="input-group">
                  <label htmlFor="pos-customer-select">Customer (Udhar)</label>
                  <select
                    id="pos-customer-select"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                  >
                    <option value="">Walk-in Customer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        #{c.customerNumber} {c.name} {Number(c.currentBalance) < 0 ? `(Due: ${formatMoney(Math.abs(c.currentBalance))})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {enableStaff && (
                <div className="input-group">
                  <label htmlFor="pos-staff-select">Seller / Cashier</label>
                  <select
                    id="pos-staff-select"
                    value={sellerId}
                    onChange={(e) => setSellerId(e.target.value)}
                  >
                    <option value="">Store Counter</option>
                    {staff.filter((s) => s.active).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.commissionRate}%)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Split Payment Allocation Box */}
          <div className="pos-split-payment-box">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--brand)", textTransform: "uppercase" }}>
                Split Payment Settlement
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                <button className="pos-preset-btn" onClick={setExactCash}>💵 All Cash</button>
                <button className="pos-preset-btn" onClick={setExactUpi}>⚡ All UPI</button>
                {enableUdhar && <button className="pos-preset-btn" onClick={setExactUdhar}>📒 All Udhar</button>}
              </div>
            </div>

            {/* Cash Input & Quick Presets */}
            <div className="pos-payment-input-row">
              <span className="pos-payment-label" style={{ color: "var(--cash)" }}>💵 Cash</span>
              <div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={cash}
                  onChange={(e) => setCash(e.target.value)}
                />
              </div>
            </div>

            {/* Cash Presets */}
            <div style={{ display: "flex", gap: "6px", marginLeft: "88px", flexWrap: "wrap" }}>
              <button className="pos-preset-btn" onClick={() => addCashPreset(100)}>+₹100</button>
              <button className="pos-preset-btn" onClick={() => addCashPreset(200)}>+₹200</button>
              <button className="pos-preset-btn" onClick={() => addCashPreset(500)}>+₹500</button>
              <button className="pos-preset-btn" onClick={() => addCashPreset(2000)}>+₹2000</button>
            </div>

            {/* UPI Input */}
            <div className="pos-payment-input-row">
              <span className="pos-payment-label" style={{ color: "var(--purple)" }}>⚡ UPI</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={upi}
                onChange={(e) => setUpi(e.target.value)}
              />
            </div>

            {/* Udhar Credit Input */}
            {enableUdhar && (
              <div className="pos-payment-input-row">
                <span className="pos-payment-label" style={{ color: "var(--orange)" }}>📒 Udhar</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={udhar}
                  onChange={(e) => setUdhar(e.target.value)}
                />
              </div>
            )}

            {changeDue > 0 && (
              <div style={{ background: "var(--tint)", padding: "8px 12px", borderRadius: "6px", display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ fontWeight: 700, color: "var(--brand)" }}>Change to Return Customer:</span>
                <strong style={{ color: "var(--cash)" }}>{formatMoney(changeDue)}</strong>
              </div>
            )}
          </div>

          {/* Totals Summary */}
          <div className="pos-totals-summary">
            <div className="pos-total-row">
              <span>Items Subtotal</span>
              <span>{formatMoney(subtotal)}</span>
            </div>
            {estimatedGst > 0 && (
              <div className="pos-total-row">
                <span>Estimated GST (CGST + SGST)</span>
                <span>{formatMoney(estimatedGst)}</span>
              </div>
            )}
            <div className="pos-total-row grand-total">
              <span>Grand Total</span>
              <span style={{ color: "var(--brand)" }}>{formatMoney(grandTotal)}</span>
            </div>
            <div className="pos-total-row" style={{ fontSize: "12.5px" }}>
              <span>Allocated: {formatMoney(totalPaid)}</span>
              <span style={{ color: Math.abs(remaining) <= 0.05 ? "var(--cash)" : "var(--bad)", fontWeight: 700 }}>
                {Math.abs(remaining) <= 0.05
                  ? "✓ Payment Balanced"
                  : remaining > 0
                  ? `Due: ${formatMoney(remaining)}`
                  : `Change: ${formatMoney(changeDue)}`}
              </span>
            </div>
          </div>

          {/* Checkout CTA Button */}
          <button
            className="btn btn-primary btn-lg"
            style={{ width: "100%", marginTop: "4px" }}
            onClick={handleCheckout}
            disabled={submitting || cart.length === 0}
          >
            {submitting ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25"></circle>
                  <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1"></path>
                </svg>
                <span>Processing Invoice...</span>
              </>
            ) : (
              <span>Complete Sale &amp; Print Bill ({formatMoney(grandTotal)})</span>
            )}
          </button>
        </div>
      </div>

      {/* ================= MODAL: ADD CUSTOM ITEM ================= */}
      {showCustomModal && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setShowCustomModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="custom-item-title"
        >
          <div className="form-card" style={{ maxWidth: "440px", width: "90%", margin: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h3 id="custom-item-title" style={{ fontSize: "18px", color: "var(--deep)" }}>
              Add Custom Item to Cart
            </h3>
            <form onSubmit={handleAddCustomItem} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="input-group">
                <label>Item Name / Description</label>
                <input
                  required
                  placeholder="e.g. Loose Sugar 2kg"
                  value={customItem.name}
                  onChange={(e) => setCustomItem({ ...customItem, name: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label>Selling Price (₹)</label>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={customItem.price}
                  onChange={(e) => setCustomItem({ ...customItem, price: e.target.value })}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div className="input-group">
                  <label>HSN (Optional)</label>
                  <input
                    placeholder="1701"
                    value={customItem.hsnCode}
                    onChange={(e) => setCustomItem({ ...customItem, hsnCode: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label>GST Rate</label>
                  <select
                    value={customItem.gstRate}
                    onChange={(e) => setCustomItem({ ...customItem, gstRate: e.target.value })}
                  >
                    <option value="0">0% GST</option>
                    <option value="5">5% GST</option>
                    <option value="12">12% GST</option>
                    <option value="18">18% GST</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => setShowCustomModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Add to Cart
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: SALE CONFIRMATION & INVOICE RECEIPT ================= */}
      {completedSale && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setCompletedSale(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="sale-success-title"
        >
          <div className="form-card" style={{ maxWidth: "480px", width: "90%", margin: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "36px" }}>🎉</span>
              <h3 id="sale-success-title" style={{ fontSize: "22px", color: "var(--deep)", marginTop: "6px" }}>
                Sale Completed Successfully!
              </h3>
              <p className="muted" style={{ fontSize: "14px" }}>
                Invoice Number: <strong>{completedSale.invoiceNumber || `#INV-${completedSale.id}`}</strong>
              </p>
            </div>

            <div style={{ background: "var(--surface-low)", padding: "16px", borderRadius: "10px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "13.5px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Total Bill Amount:</span>
                <strong style={{ fontSize: "16px", color: "var(--brand)" }}>
                  {formatMoney(completedSale.totalAmount || completedSale.total)}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--mute)" }}>
                <span>Payment Settlement:</span>
                <span>
                  {completedSale.payments
                    ? completedSale.payments.map((p) => `${p.method}: ${formatMoney(p.amount)}`).join(" • ")
                    : "Settled"}
                </span>
              </div>
              {completedSale.customerName && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--mute)" }}>
                  <span>Customer:</span>
                  <strong>{completedSale.customerName}</strong>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
              <button
                className="btn btn-primary btn-lg"
                style={{ flex: 1, fontWeight: 700 }}
                onClick={() => setShowInvoiceModal(true)}
              >
                📄 Preview &amp; Print Bill (A4 / Thermal)
              </button>
              <button
                className="btn btn-outline btn-lg"
                style={{ flex: 1 }}
                onClick={() => setCompletedSale(null)}
              >
                + Next Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= RECENT BILLS SLIDE-OVER DRAWER ================= */}
      {recentBillsDrawerOpen && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setRecentBillsDrawerOpen(false)}
          style={{ zIndex: 9998, display: "flex", justifyContent: "flex-end" }}
        >
          <div
            className="pos-recent-bills-drawer"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "540px",
              height: "100vh",
              background: "#FFFFFF",
              boxShadow: "-10px 0 30px rgba(0,0,0,0.18)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--line)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--surface-low)",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "18px",
                    color: "var(--deep)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span>📜 Recent Bills</span>
                  <span
                    style={{
                      background: "var(--tint)",
                      color: "var(--brand)",
                      fontSize: "12px",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      fontWeight: 700,
                    }}
                  >
                    {recentSales.length} Invoices
                  </span>
                </h3>
                <span style={{ fontSize: "12.5px", color: "var(--mute)" }}>
                  Invoices created at this POS register
                </span>
              </div>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setRecentBillsDrawerOpen(false)}
                aria-label="Close drawer"
                style={{ fontSize: "16px", padding: "4px 10px", borderRadius: "50%" }}
              >
                ✕
              </button>
            </div>

            {/* Search filter in drawer */}
            <div
              style={{
                padding: "12px 20px",
                borderBottom: "1px solid var(--line)",
                display: "flex",
                gap: "10px",
                background: "#FAFAFA",
              }}
            >
              <div className="pos-search-bar" style={{ flex: 1, margin: 0 }}>
                <span className="pos-search-icon" aria-hidden="true">
                  🔍
                </span>
                <input
                  placeholder="Search recent bills by invoice #, customer..."
                  value={recentBillsSearch}
                  onChange={(e) => setRecentBillsSearch(e.target.value)}
                  style={{ width: "100%", fontSize: "13px" }}
                />
                {recentBillsSearch && (
                  <button className="pos-search-clear" onClick={() => setRecentBillsSearch("")}>
                    ✕
                  </button>
                )}
              </div>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => {
                  getSales().then((r) => {
                    const raw = r.data?.data || r.data || [];
                    setRecentSales(Array.isArray(raw) ? raw : []);
                  });
                }}
                title="Refresh bills"
              >
                🔄
              </button>
            </div>

            {/* Bills List Scroll */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              {recentSales.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--mute)" }}>
                  <div style={{ fontSize: "42px", marginBottom: "12px" }}>🧾</div>
                  <h4 style={{ margin: "0 0 6px 0", color: "var(--deep)" }}>No bills yet</h4>
                  <p style={{ fontSize: "13px", margin: 0 }}>
                    When you bill customers at the counter, they will appear right here for instant
                    preview &amp; reprinting.
                  </p>
                </div>
              ) : filteredRecentSales.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--mute)" }}>
                  <p style={{ fontSize: "13.5px" }}>
                    No recent bills match &quot;{recentBillsSearch}&quot;
                  </p>
                  <button className="btn btn-sm btn-outline" onClick={() => setRecentBillsSearch("")}>
                    Clear Filter
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {filteredRecentSales.map((sale) => {
                    const cashAmt = Number(
                      sale.cashAmount ||
                        sale.payments?.find((p) => p.method === "CASH")?.amount ||
                        0
                    );
                    const upiAmt = Number(
                      sale.upiAmount ||
                        sale.payments?.find((p) => p.method === "UPI")?.amount ||
                        0
                    );
                    const udharAmt = Number(
                      sale.creditAmount ||
                        sale.udharAmount ||
                        sale.payments?.find((p) => p.method === "UDHAR")?.amount ||
                        0
                    );
                    const isReturned = sale.status === "RETURNED";

                    return (
                      <div
                        key={sale.id}
                        className="card"
                        style={{
                          padding: "14px",
                          borderRadius: "10px",
                          border: "1px solid var(--line)",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          background: "#FFFFFF",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                          }}
                        >
                          <div>
                            <strong
                              style={{
                                fontSize: "14.5px",
                                color: "var(--deep)",
                                display: "block",
                              }}
                            >
                              {sale.invoiceNumber || `INV-${sale.id.slice(0, 8).toUpperCase()}`}
                            </strong>
                            <span style={{ fontSize: "11.5px", color: "var(--mute)" }}>
                              {sale.createdAt
                                ? new Date(sale.createdAt).toLocaleString("en-IN", {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })
                                : "Just now"}
                            </span>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <strong
                              style={{
                                fontSize: "16px",
                                color: "var(--brand)",
                                display: "block",
                              }}
                            >
                              {formatMoney(sale.total || sale.totalAmount)}
                            </strong>
                            <span
                              style={{
                                fontSize: "10.5px",
                                fontWeight: 700,
                                padding: "2px 6px",
                                borderRadius: "4px",
                                background: isReturned ? "var(--orange-tint)" : "var(--tint)",
                                color: isReturned ? "var(--orange)" : "var(--cash)",
                              }}
                            >
                              {isReturned ? "RETURNED" : "✓ COMPLETED"}
                            </span>
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: "12.5px",
                            color: "var(--mute)",
                          }}
                        >
                          <span>
                            👤 {sale.customerName || "Walk-in Customer"}
                            {sale.customerMobile ? ` (${sale.customerMobile})` : ""}
                          </span>
                          <span style={{ fontSize: "11.5px" }}>
                            {sale.items?.length || 1} {sale.items?.length === 1 ? "item" : "items"}
                          </span>
                        </div>

                        {/* Payment Breakdown Chips */}
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", fontSize: "11px" }}>
                          {cashAmt > 0 && (
                            <span
                              className="badge"
                              style={{ background: "var(--tint)", color: "var(--cash)" }}
                            >
                              💵 Cash: {formatMoney(cashAmt)}
                            </span>
                          )}
                          {upiAmt > 0 && (
                            <span
                              className="badge"
                              style={{ background: "var(--purple-tint)", color: "var(--purple)" }}
                            >
                              📱 UPI: {formatMoney(upiAmt)}
                            </span>
                          )}
                          {udharAmt > 0 && (
                            <span
                              className="badge"
                              style={{ background: "var(--gold-tint)", color: "var(--orange)" }}
                            >
                              📒 Udhar: {formatMoney(udharAmt)}
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            marginTop: "4px",
                            borderTop: "1px dashed var(--line)",
                            paddingTop: "8px",
                          }}
                        >
                          <button
                            className="btn btn-sm btn-primary"
                            style={{
                              flex: 1,
                              fontSize: "12px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "5px",
                            }}
                            onClick={() => {
                              setPreviewSale(sale);
                              setShowInvoiceModal(true);
                            }}
                          >
                            <span>👁️ View &amp; Print</span>
                          </button>
                          <button
                            className="btn btn-sm btn-outline"
                            style={{ fontSize: "12px" }}
                            onClick={() => handleDownloadPdf(sale.id)}
                            disabled={downloadingInvoice}
                            title="Download PDF"
                          >
                            ⬇️ PDF
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div
              style={{
                padding: "14px 20px",
                borderTop: "1px solid var(--line)",
                background: "var(--surface-low)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Link
                to="/returns"
                className="btn btn-outline"
                style={{ fontSize: "13px" }}
                onClick={() => setRecentBillsDrawerOpen(false)}
              >
                📑 Full Bills Ledger
              </Link>
              <button
                className="btn btn-outline"
                style={{ fontSize: "13px" }}
                onClick={() => setRecentBillsDrawerOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Preview & Print Modal */}
      <InvoicePreviewModal
        isOpen={showInvoiceModal}
        onClose={() => {
          setShowInvoiceModal(false);
          setPreviewSale(null);
        }}
        sale={previewSale || completedSale}
        shopInfo={user || {}}
      />
    </div>
  );
}
