import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getApiErrorMessage } from "../../api/apiError";
import {
  getProducts,
  createProduct,
  deactivateProduct,
} from "../../api/productApi";
import {
  getClosings,
  saveClosing,
  closeClosing,
  reopenClosing,
  syncPosToClosing,
} from "../../api/closingApi";
import { getSales } from "../../api/posApi";
import { listCustomers, getLedger } from "../../api/customerApi";
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

const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

export default function SmallShopPage() {
  const { user, enableUdhar } = useAuth();
  const isOwner = user?.role === "OWNER";
  const isBothMode = user?.operatingMode === "BOTH";
  const isLargeMode = user?.operatingMode === "LARGE" || user?.operatingMode === "BOTH";

  // Fast L1/L2 Cache Initializers (0ms instant mount)
  const cachedProds = getCached(CACHE_KEYS.PRODUCTS)?.data;
  const cachedClosings = getCached(CACHE_KEYS.CLOSINGS)?.data;

  const [date, setDate] = useState(todayStr);
  const [products, setProducts] = useState(() => (Array.isArray(cachedProds) ? cachedProds : []));
  const [closings, setClosings] = useState(() => (Array.isArray(cachedClosings) ? cachedClosings : []));
  const [sales, setSales] = useState([]);
  const [currentClosing, setCurrentClosing] = useState(null);
  const [unlockedForEdit, setUnlockedForEdit] = useState(false);
  const [khataSummary, setKhataSummary] = useState({ paymentsToday: 0, chargesToday: 0 });
  const [autoTalliedDate, setAutoTalliedDate] = useState(null);

  // Form states
  const [qty, setQty] = useState({});
  const [cash, setCash] = useState("");
  const [upi, setUpi] = useState("");
  const [udhar, setUdhar] = useState("");
  const [expenses, setExpenses] = useState([{ description: "", amount: "" }]);

  // Product quick-add form
  const [productForm, setProductForm] = useState({
    name: "",
    sellingPrice: "",
    hsnCode: "",
    gstRate: "0",
  });

  // UI state
  const [loading, setLoading] = useState(!cachedProds || cachedProds.length === 0);
  const [saving, setSaving] = useState(false);
  const [syncingPos, setSyncingPos] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Load products, closings, and POS sales
  async function loadData() {
    if (products.length === 0) setLoading(true);
    setError("");
    try {
      const [pRes, cRes, sRes] = await Promise.allSettled([
        getProducts(),
        getClosings(),
        getSales(),
      ]);
      const rawProducts = pRes.status === "fulfilled" ? (pRes.value.data?.data || pRes.value.data || []) : [];
      const rawClosings = cRes.status === "fulfilled" ? (cRes.value.data?.data || cRes.value.data || []) : [];
      const rawSales = sRes.status === "fulfilled" ? (sRes.value.data?.data || sRes.value.data || []) : [];

      const prodsArr = Array.isArray(rawProducts) ? rawProducts : [];
      const closingsArr = Array.isArray(rawClosings) ? rawClosings : [];
      setProducts(prodsArr);
      setClosings(closingsArr);
      setSales(Array.isArray(rawSales) ? rawSales : []);

      if (prodsArr.length > 0) setCached(CACHE_KEYS.PRODUCTS, prodsArr, TTL.PRODUCTS);
      if (closingsArr.length > 0) setCached(CACHE_KEYS.CLOSINGS, closingsArr, 5 * 60 * 1000);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load shop items or closings."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Filter and aggregate all POS sales for the selected business date
  const posDaySummary = useMemo(() => {
    const daySales = (sales || []).filter((s) => {
      if (s.status === "RETURNED") return false;
      if (!s.createdAt) return false;
      const d = new Date(s.createdAt);
      const saleDate = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      return saleDate === date;
    });

    const itemMap = {};
    let totalItemsQty = 0;
    let expectedSales = 0;
    let cash = 0;
    let upi = 0;
    let udhar = 0;

    daySales.forEach((sale) => {
      (sale.items || []).forEach((item) => {
        const q = Number(item.quantity || 0);
        const p = Number(item.unitPrice || 0);
        const lineTotal = Number(item.lineTotal != null ? item.lineTotal : q * p);
        const key = item.productId ? `id_${item.productId}` : `name_${(item.name || "").trim().toLowerCase()}`;

        if (!itemMap[key]) {
          itemMap[key] = {
            name: item.name,
            productId: item.productId || null,
            unitPrice: p,
            qty: 0,
            total: 0,
          };
        }
        itemMap[key].qty += q;
        itemMap[key].total += lineTotal;
        totalItemsQty += q;
        expectedSales += lineTotal;
      });

      (sale.payments || []).forEach((pay) => {
        const amt = Number(pay.amount || 0);
        if (pay.method === "CASH") cash += amt;
        else if (pay.method === "UPI") upi += amt;
        else if (pay.method === "UDHAR") udhar += amt;
      });
    });

    const byProductId = {};
    const byName = {};
    Object.values(itemMap).forEach((item) => {
      if (item.productId) byProductId[item.productId] = item;
      if (item.name) byName[item.name.trim().toLowerCase()] = item;
    });

    return {
      saleCount: daySales.length,
      totalItemsQty,
      expectedSales,
      cash,
      upi,
      udhar,
      itemMap,
      byProductId,
      byName,
      itemsList: Object.values(itemMap),
    };
  }, [sales, date]);

  // Calculate and tally all items sold in POS today into Expected Sales and collections
  async function tallyPosSales(summary = posDaySummary) {
    if (!summary || summary.saleCount === 0) {
      setMessage(`No POS sales recorded on ${date} to tally.`);
      return;
    }

    const newQty = {};
    let currentProductsList = [...products];

    for (const item of summary.itemsList) {
      let prod = currentProductsList.find(
        (p) =>
          (item.productId && p.id === item.productId) ||
          p.name?.trim().toLowerCase() === item.name?.trim().toLowerCase()
      );

      // Auto-create item in product catalogue if missing so it has an ID
      if (!prod) {
        try {
          const res = await createProduct({
            name: item.name.trim(),
            sellingPrice: Number(item.unitPrice),
            gstRate: 0,
          });
          const created = res.data?.data || res.data;
          if (created && created.id) {
            prod = created;
            currentProductsList.push(created);
            setProducts([...currentProductsList]);
          }
        } catch {
          // fallback
        }
      }

      if (prod) {
        newQty[prod.id] = (newQty[prod.id] || 0) + item.qty;
      }
    }

    setQty(newQty);
    setCash(String(summary.cash || 0));
    setUpi(String(summary.upi || 0));
    setUdhar(String(summary.udhar || 0));
    setMessage(
      `✓ Successfully tallied all POS selling items for ${date}: ${summary.totalItemsQty} items across ${summary.saleCount} bills totaling ${formatMoney(summary.expectedSales)} into Expected Sales!`
    );
  }

  // Load Khata ledger activity for the selected business date
  async function loadKhataSummary(businessDate) {
    if (!enableUdhar) {
      setKhataSummary({ paymentsToday: 0, chargesToday: 0 });
      return;
    }
    try {
      const custs = await listCustomers().catch(() => []);
      if (!Array.isArray(custs) || custs.length === 0) {
        setKhataSummary({ paymentsToday: 0, chargesToday: 0 });
        return;
      }
      const ledgers = await Promise.allSettled(
        custs.map((c) => getLedger(c.id).catch(() => []))
      );
      let payments = 0;
      let charges = 0;
      ledgers.forEach((res) => {
        if (res.status === "fulfilled" && res.value) {
          const entries = Array.isArray(res.value)
            ? res.value
            : res.value?.entries || res.value?.content || [];
          entries.forEach((tx) => {
            const txDate = tx.createdAt ? tx.createdAt.slice(0, 10) : "";
            if (txDate === businessDate) {
              const amt = Number(tx.amount || 0);
              if (tx.type === "PAYMENT" || tx.type === "CREDIT") {
                payments += amt;
              } else if (tx.type === "CHARGE" || tx.type === "DEBIT") {
                charges += amt;
              }
            }
          });
        }
      });
      setKhataSummary({ paymentsToday: payments, chargesToday: charges });
    } catch {
      setKhataSummary({ paymentsToday: 0, chargesToday: 0 });
    }
  }

  // When selected date or closings list changes, populate form with existing closing or auto-tally
  useEffect(() => {
    loadKhataSummary(date);
    setUnlockedForEdit(false);
    const existing = closings.find((c) => c.businessDate === date);
    setCurrentClosing(existing || null);

    if (existing) {
      // Populate quantities from saved closing
      const loadedQty = {};
      if (Array.isArray(existing.items)) {
        existing.items.forEach((item) => {
          if (item.productId) loadedQty[item.productId] = Number(item.quantity || 0);
        });
      }
      setQty(loadedQty);
      setCash(existing.cash != null ? String(existing.cash) : "");
      setUpi(existing.upi != null ? String(existing.upi) : "");
      setUdhar(existing.udhar != null ? String(existing.udhar) : "");

      if (Array.isArray(existing.expenses) && existing.expenses.length > 0) {
        setExpenses(
          existing.expenses.map((e) => ({
            description: e.description || "",
            amount: e.amount != null ? String(e.amount) : "",
          }))
        );
      } else {
        setExpenses([{ description: "", amount: "" }]);
      }
    } else {
      // Clean day: in Large Shop Mode (or Both mode), automatically tally day's POS items!
      if (
        isLargeMode &&
        posDaySummary.saleCount > 0 &&
        products.length > 0 &&
        autoTalliedDate !== date
      ) {
        setAutoTalliedDate(date);
        tallyPosSales(posDaySummary);
      } else if (!isLargeMode || posDaySummary.saleCount === 0) {
        setQty({});
        setCash("");
        setUpi("");
        setUdhar("");
        setExpenses([{ description: "", amount: "" }]);
      }
    }
  }, [date, closings, posDaySummary, products.length, isLargeMode, autoTalliedDate]);

  // Calculations
  const isFinalized = currentClosing?.status === "CLOSED" && !unlockedForEdit;

  const selectedItems = useMemo(() => {
    return products.filter((p) => Number(qty[p.id] || 0) > 0);
  }, [products, qty]);

  const expectedSales = useMemo(() => {
    return selectedItems.reduce(
      (acc, p) => acc + Number(p.sellingPrice || 0) * Number(qty[p.id] || 0),
      0
    );
  }, [selectedItems, qty]);

  // Physical money remaining in till + digital collections + customer udhar
  const drawerInflow =
    (Number(cash) || 0) + (Number(upi) || 0) + (enableUdhar ? (Number(udhar) || 0) : 0);

  const totalExpenses = useMemo(() => {
    return expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  }, [expenses]);

  // Total Accounted Collections includes counted drawer cash/UPI/Udhar plus payouts taken out of the drawer for day expenses
  const actualCollections = drawerInflow + totalExpenses;

  const variance = actualCollections - expectedSales;
  const netProfit = actualCollections - totalExpenses;

  // Quantity Stepper Handlers
  const changeQty = (productId, delta) => {
    if (isFinalized) return;
    setQty((prev) => {
      const current = Number(prev[productId] || 0);
      const next = Math.max(0, current + delta);
      return {
        ...prev,
        [productId]: next === 0 ? "" : next,
      };
    });
  };

  const setExactQty = (productId, val) => {
    if (isFinalized) return;
    if (val === "" || val === null) {
      setQty((prev) => ({
        ...prev,
        [productId]: "",
      }));
      return;
    }
    // Parse integer, automatically stripping any leading zeroes like "0150" -> 150
    const parsed = parseInt(val, 10);
    const cleanNum = isNaN(parsed) ? "" : Math.max(0, parsed);
    setQty((prev) => ({
      ...prev,
      [productId]: cleanNum === 0 && val === "" ? "" : cleanNum,
    }));
  };

  // Expense row handlers
  const handleExpenseChange = (index, field, value) => {
    if (isFinalized) return;
    setExpenses((prev) =>
      prev.map((exp, i) => (i === index ? { ...exp, [field]: value } : exp))
    );
  };

  const addExpenseRow = () => {
    if (isFinalized) return;
    setExpenses((prev) => [...prev, { description: "", amount: "" }]);
  };

  const removeExpenseRow = (index) => {
    if (isFinalized) return;
    setExpenses((prev) => prev.filter((_, i) => i !== index));
  };

  // Save / Finalize Closing
  async function handleSaveClosing(finalize = false) {
    setError("");
    setMessage("");
    setSaving(true);
    setShowConfirmClose(false);

    try {
      const cleanItems = selectedItems.map((p) => ({
        productId: p.id,
        quantity: Number(qty[p.id] || 0),
      }));

      const cleanExpenses = expenses
        .filter((e) => e.description.trim() && Number(e.amount) > 0)
        .map((e) => ({
          description: e.description.trim(),
          amount: Number(e.amount),
        }));

      const payload = {
        businessDate: date,
        items: cleanItems,
        cash: Number(cash || 0),
        upi: Number(upi || 0),
        udhar: enableUdhar ? Number(udhar || 0) : 0,
        expenses: cleanExpenses,
        actualCollection: actualCollections,
        variance: variance,
        netProfit: netProfit,
      };

      const res = await saveClosing(payload);
      const savedClosingId = res.data?.data?.id || res.data?.id;

      if (finalize && savedClosingId) {
        await closeClosing(savedClosingId);
        setUnlockedForEdit(false);
        setMessage("Day closed and locked successfully. Financial records snapshotted.");
      } else {
        setMessage("Draft closing saved successfully.");
      }

      await loadData();
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to save daily closing."));
    } finally {
      setSaving(false);
    }
  }

  // Re-open / Unlock Day Closing for Store Owner
  async function handleUnlockClosing() {
    if (
      !window.confirm(
        `Are you sure you want to re-open and edit the closing for ${date}? You will be able to update quantities, collections, and expenses.`
      )
    ) {
      return;
    }
    setError("");
    setMessage("");
    try {
      if (currentClosing?.id) {
        await reopenClosing(currentClosing.id).catch(() => { });
      }
    } catch {
      // Graceful fallback to client unlock
    }
    setUnlockedForEdit(true);
    setMessage(`Day closing for ${date} unlocked. You can now adjust numbers and click "Review & Close Day" when finished.`);
  }

  // POS Sync
  async function handleSyncPos() {
    if (!currentClosing?.id) {
      setError("Please save a draft closing first before syncing POS sales.");
      return;
    }
    setSyncingPos(true);
    setError("");
    setMessage("");
    try {
      await syncPosToClosing(currentClosing.id);
      setMessage("POS counter sales synced into closing without double-counting.");
      await loadData();
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to sync POS transactions into closing."));
    } finally {
      setSyncingPos(false);
    }
  }

  // Product Add / Deactivate
  async function handleAddProduct(e) {
    e.preventDefault();
    if (!productForm.name.trim() || Number(productForm.sellingPrice) <= 0) {
      setError("Please enter a valid product name and price.");
      return;
    }
    try {
      await createProduct({
        name: productForm.name.trim(),
        sellingPrice: Number(productForm.sellingPrice),
        hsnCode: productForm.hsnCode.trim() || null,
        gstRate: Number(productForm.gstRate) || 0,
      });
      setProductForm({ name: "", sellingPrice: "", hsnCode: "", gstRate: "0" });
      setMessage("Product added successfully to menu.");
      await loadData();
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to add product."));
    }
  }

  async function handleRemoveProduct(id) {
    if (!window.confirm("Are you sure you want to deactivate this product?")) return;
    try {
      await deactivateProduct(id);
      setMessage("Product deactivated.");
      await loadData();
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to deactivate product."));
    }
  }

  return (
    <div className="small-shop-closing-container">
      {/* Top Header Card */}
      <div className="closing-header-card">
        <div>
          <div className="eyebrow" style={{ marginBottom: "6px" }}>
            {isLargeMode ? "LARGE SHOP POS MODE" : "SMALL SHOP MODE"}
          </div>
          <h1 style={{ fontSize: "24px", color: "var(--deep)" }}>Daily Closing Desk</h1>
          <p className="muted" style={{ fontSize: "13.5px" }}>
            {isLargeMode
              ? "End-of-day sales reconciliation. Automatically calculates all items sold today and tallies them into Expected Sales against drawer cash & UPI."
              : "30-second end-of-day reconciliation. Unit prices are snapshotted permanently into closed records."}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* Status Badge */}
          <div
            className={`closing-status-pill ${isFinalized ? "closed" : unlockedForEdit ? "draft" : currentClosing ? "draft" : "new"
              }`}
          >
            <span className="dot" style={{ width: "6px", height: "6px", borderRadius: "50%", background: "currentColor" }}></span>
            <span>
              {isFinalized
                ? "🔒 FINALIZED & LOCKED"
                : unlockedForEdit
                  ? "🔓 UNLOCKED FOR EDIT"
                  : currentClosing
                    ? "📝 DRAFT IN PROGRESS"
                    : "✨ NOT STARTED"}
            </span>
          </div>

          {/* Date Picker */}
          <div className="dashboard-date-filter">
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--mute)" }}>DATE</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Select closing date"
            />
          </div>

          {/* Tally POS Sales Button */}
          {posDaySummary.saleCount > 0 && !isFinalized && (
            <button
              className="btn btn-sm btn-primary"
              onClick={() => tallyPosSales(posDaySummary)}
              title="Calculate all selling items today and tally into Expected Sales"
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
              id="tally-pos-sales-btn"
            >
              <span>⚡</span>
              <span>Tally POS Sales ({formatMoney(posDaySummary.expectedSales)})</span>
            </button>
          )}

          {/* Sync POS Button if in Both mode */}
          {isBothMode && !isFinalized && (
            <button
              className="btn btn-sm btn-outline"
              onClick={handleSyncPos}
              disabled={syncingPos || !currentClosing}
              title="Sync POS counter sales into this day's closing"
            >
              {syncingPos ? "Syncing POS..." : "⚡ Sync POS Sales"}
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert-banner error" style={{ marginBottom: "16px" }}>{error}</div>}
      {message && <div className="alert-banner info" style={{ marginBottom: "16px" }}>{message}</div>}

      {currentClosing?.status === "CLOSED" && (
        <div
          className="alert-banner info"
          style={{
            marginBottom: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            background: unlockedForEdit ? "#fffbeb" : undefined,
            borderLeft: unlockedForEdit ? "4px solid #f59e0b" : undefined,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>{unlockedForEdit ? "🔓" : "🔒"}</span>
            <div>
              <strong>
                {unlockedForEdit
                  ? `Day closing for ${date} is UNLOCKED for editing.`
                  : `This closing was finalized on ${date}.`}
              </strong>
              <div style={{ fontSize: "13px", color: "var(--mute)", marginTop: "2px" }}>
                {unlockedForEdit
                  ? "You can now edit quantities, drawer cash/UPI, and expenses. Click 'Review & Close Day' when finished to lock again."
                  : "All transactions, quantities, and expenses are locked for accounting integrity."}
              </div>
            </div>
          </div>

          {isOwner && (
            <div>
              {!unlockedForEdit ? (
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={handleUnlockClosing}
                  style={{
                    borderColor: "var(--brand)",
                    color: "var(--brand)",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                  id="reopen-closing-btn"
                >
                  <span>🔓</span>
                  <span>Re-open Day for Editing</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => setUnlockedForEdit(false)}
                  style={{ color: "var(--mute)" }}
                >
                  🔒 Cancel &amp; Re-lock
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3-Column Working Grid */}
      <div className="closing-grid-layout">
        {/* ================= PANEL 1: Items Sold ================= */}
        <section className="closing-panel" aria-labelledby="items-heading">
          <h2 id="items-heading">
            <span>1. Items Sold Tally</span>
            <span style={{ fontSize: "12px", color: "var(--brand)" }}>
              {selectedItems.length} items logged
            </span>
          </h2>

          {/* Today's POS Sales Counter Card */}
          {posDaySummary.saleCount > 0 && (
            <div
              style={{
                background: "linear-gradient(135deg, rgba(15, 61, 47, 0.05), rgba(30, 92, 74, 0.12))",
                border: "1px solid rgba(15, 61, 47, 0.2)",
                borderRadius: "var(--radius-sm)",
                padding: "12px 14px",
                marginBottom: "4px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "15px" }}>🛒</span>
                  <strong style={{ fontSize: "13px", color: "var(--deep)" }}>
                    Today&apos;s POS Counter Sales ({date})
                  </strong>
                </div>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "var(--radius-full)",
                    background: "rgba(15, 61, 47, 0.12)",
                    color: "var(--brand)",
                  }}
                >
                  {posDaySummary.saleCount} {posDaySummary.saleCount === 1 ? "Bill" : "Bills"}
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "6px",
                  marginBottom: "8px",
                }}
              >
                <div
                  style={{
                    background: "#FFFFFF",
                    padding: "6px 8px",
                    borderRadius: "var(--radius-xs)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <div style={{ fontSize: "10.5px", color: "var(--mute)" }}>Sold Units</div>
                  <strong style={{ fontSize: "13px", color: "var(--deep)" }}>
                    {posDaySummary.totalItemsQty} pcs
                  </strong>
                </div>
                <div
                  style={{
                    background: "#FFFFFF",
                    padding: "6px 8px",
                    borderRadius: "var(--radius-xs)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <div style={{ fontSize: "10.5px", color: "var(--mute)" }}>Products</div>
                  <strong style={{ fontSize: "13px", color: "var(--deep)" }}>
                    {posDaySummary.itemsList.length} items
                  </strong>
                </div>
                <div
                  style={{
                    background: "#FFFFFF",
                    padding: "6px 8px",
                    borderRadius: "var(--radius-xs)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <div style={{ fontSize: "10.5px", color: "var(--mute)" }}>Expected Sales</div>
                  <strong style={{ fontSize: "13px", color: "var(--brand)" }}>
                    {formatMoney(posDaySummary.expectedSales)}
                  </strong>
                </div>
              </div>

              {/* Pills of all selling items today */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {posDaySummary.itemsList.map((item, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: "11px",
                      background: "#FFFFFF",
                      border: "1px solid var(--line)",
                      padding: "3px 8px",
                      borderRadius: "var(--radius-xs)",
                      color: "var(--deep)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <strong>{item.name}:</strong>
                    <span style={{ color: "var(--brand)", fontWeight: 700 }}>
                      {item.qty} × {formatMoney(item.unitPrice)}
                    </span>
                    <span style={{ color: "var(--mute)" }}>
                      = {formatMoney(item.total)}
                    </span>
                  </span>
                ))}
              </div>

              {!isFinalized && (
                <div style={{ marginTop: "10px", display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => tallyPosSales(posDaySummary)}
                    style={{ fontSize: "11.5px", padding: "4px 10px", gap: "4px" }}
                  >
                    <span>⚡</span>
                    <span>Tally Day&apos;s Items into Expected Sales</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {loading ? (
              <p className="muted">Loading menu items...</p>
            ) : products.length === 0 ? (
              <p className="muted">No products configured. Add your first product below.</p>
            ) : (
              products.map((p) => {
                const currentCount = Number(qty[p.id] || 0);
                const lineTotal = currentCount * Number(p.sellingPrice || 0);
                const posSoldItem =
                  posDaySummary.byProductId[p.id] ||
                  posDaySummary.byName[p.name?.trim().toLowerCase()];

                return (
                  <div
                    key={p.id}
                    className="item-row"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto auto",
                      gap: "10px",
                      alignItems: "center",
                      padding: "12px 0",
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: "14px", color: "var(--deep)", display: "block" }}>
                        {p.name}
                      </strong>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                        <small style={{ color: "var(--mute)", fontSize: "12px" }}>
                          {formatMoney(p.sellingPrice)} each
                        </small>
                        {posSoldItem && posSoldItem.qty > 0 && (
                          <span
                            style={{
                              fontSize: "10.5px",
                              fontWeight: 700,
                              background: "rgba(15, 61, 47, 0.08)",
                              color: "var(--brand)",
                              padding: "1px 6px",
                              borderRadius: "var(--radius-xs)",
                              border: "1px solid rgba(15, 61, 47, 0.2)",
                            }}
                            title={`${posSoldItem.qty} units sold at POS counter today`}
                          >
                            🛒 POS Sold: {posSoldItem.qty}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stepper with 44px touch buttons */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <button
                        className="stepper-btn"
                        onClick={() => changeQty(p.id, -1)}
                        disabled={isFinalized || currentCount <= 0}
                        aria-label={`Decrease ${p.name} quantity`}
                      >
                        −
                      </button>
                      <input
                        className="stepper-qty-input"
                        type="number"
                        min="0"
                        placeholder="0"
                        value={
                          qty[p.id] === undefined || qty[p.id] === "" || qty[p.id] === 0
                            ? ""
                            : qty[p.id]
                        }
                        onChange={(e) => setExactQty(p.id, e.target.value)}
                        onFocus={(e) => e.target.select()}
                        disabled={isFinalized}
                        aria-label={`${p.name} quantity`}
                      />
                      <button
                        className="stepper-btn"
                        onClick={() => changeQty(p.id, 1)}
                        disabled={isFinalized}
                        aria-label={`Increase ${p.name} quantity`}
                      >
                        +
                      </button>
                      <button
                        className="quick-add-chip"
                        onClick={() => changeQty(p.id, 5)}
                        disabled={isFinalized}
                        title="Add 5"
                      >
                        +5
                      </button>
                    </div>

                    <strong style={{ minWidth: "75px", textAlign: "right", fontSize: "14px", color: "var(--deep)" }}>
                      {formatMoney(lineTotal)}
                    </strong>
                  </div>
                );
              })
            )}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: "14px",
              marginTop: "auto",
              borderTop: "2px solid var(--line)",
              fontWeight: 800,
              fontSize: "15px",
            }}
          >
            <div>
              <div>Expected Sales</div>
              {posDaySummary.saleCount > 0 && (
                <div style={{ fontWeight: 500, fontSize: "11px", color: "var(--mute)", marginTop: "2px" }}>
                  Tallied from {posDaySummary.totalItemsQty} items sold across {posDaySummary.saleCount} POS bills today
                </div>
              )}
            </div>
            <strong style={{ color: "var(--brand)", fontSize: "18px" }}>{formatMoney(expectedSales)}</strong>
          </div>
        </section>

        {/* ================= PANEL 2: Actual Collections ================= */}
        <section className="closing-panel" aria-labelledby="collections-heading">
          <h2 id="collections-heading">2. Actual Drawer Collections</h2>
          <p className="muted" style={{ fontSize: "13px" }}>
            Count physical cash and verify QR totals.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div className="input-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px", marginBottom: "4px" }}>
                <label htmlFor="closing-cash" style={{ margin: 0 }}>💵 Physical Cash in Drawer (₹)</label>
                {!isFinalized && posDaySummary.cash > 0 && (
                  <button
                    type="button"
                    onClick={() => setCash(String(posDaySummary.cash))}
                    style={{
                      background: cash === String(posDaySummary.cash) ? "var(--tint)" : "var(--surface-low)",
                      color: "var(--brand)",
                      border: "1px solid rgba(15, 61, 47, 0.2)",
                      borderRadius: "var(--radius-full)",
                      padding: "2px 8px",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                    title="Fill Cash collected from POS counter bills today"
                  >
                    {cash === String(posDaySummary.cash) ? "✓ POS Cash:" : "Fill POS Cash:"} {formatMoney(posDaySummary.cash)}
                  </button>
                )}
              </div>
              <input
                id="closing-cash"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={cash === "0" ? "" : cash}
                onChange={(e) => setCash(e.target.value)}
                onFocus={(e) => e.target.select()}
                disabled={isFinalized}
              />
            </div>

            <div className="input-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px", marginBottom: "4px" }}>
                <label htmlFor="closing-upi" style={{ margin: 0 }}>⚡ PhonePe / UPI Verified Collections (₹)</label>
                {!isFinalized && posDaySummary.upi > 0 && (
                  <button
                    type="button"
                    onClick={() => setUpi(String(posDaySummary.upi))}
                    style={{
                      background: upi === String(posDaySummary.upi) ? "var(--tint)" : "var(--surface-low)",
                      color: "var(--brand)",
                      border: "1px solid rgba(15, 61, 47, 0.2)",
                      borderRadius: "var(--radius-full)",
                      padding: "2px 8px",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                    title="Fill UPI collected from POS counter bills today"
                  >
                    {upi === String(posDaySummary.upi) ? "✓ POS UPI:" : "Fill POS UPI:"} {formatMoney(posDaySummary.upi)}
                  </button>
                )}
              </div>
              <input
                id="closing-upi"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={upi === "0" ? "" : upi}
                onChange={(e) => setUpi(e.target.value)}
                onFocus={(e) => e.target.select()}
                disabled={isFinalized}
              />
            </div>

            {enableUdhar && (
              <>
                <div className="input-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px", marginBottom: "4px" }}>
                    <label htmlFor="closing-udhar" style={{ margin: 0 }}>📒 Customer Udhar Credit Given Today (₹)</label>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {!isFinalized && posDaySummary.udhar > 0 && (
                        <button
                          type="button"
                          onClick={() => setUdhar(String(posDaySummary.udhar))}
                          style={{
                            background: udhar === String(posDaySummary.udhar) ? "var(--tint)" : "var(--surface-low)",
                            color: "var(--brand)",
                            border: "1px solid rgba(15, 61, 47, 0.2)",
                            borderRadius: "var(--radius-full)",
                            padding: "2px 8px",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                          title="Fill Udhar recorded from POS counter bills today"
                        >
                          {udhar === String(posDaySummary.udhar) ? "✓ POS Udhar:" : "Fill POS Udhar:"} {formatMoney(posDaySummary.udhar)}
                        </button>
                      )}
                      {!isFinalized && khataSummary.chargesToday > 0 && (!udhar || Number(udhar) === 0) && (
                        <button
                          type="button"
                          onClick={() => setUdhar(String(khataSummary.chargesToday))}
                          style={{
                            background: "var(--tint)",
                            color: "var(--brand)",
                            border: "1px solid rgba(15, 61, 47, 0.2)",
                            borderRadius: "var(--radius-full)",
                            padding: "2px 8px",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                          title="Click to copy credit logged in Khata today"
                        >
                          Auto-fill {formatMoney(khataSummary.chargesToday)} from Khata
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    id="closing-udhar"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={udhar === "0" ? "" : udhar}
                    onChange={(e) => setUdhar(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    disabled={isFinalized}
                  />
                </div>

                {khataSummary.paymentsToday > 0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--tint)",
                      border: "1px solid rgba(15, 61, 47, 0.15)",
                      fontSize: "13px",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: "var(--brand)", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>✅</span>
                        <span>Customer Udhar Recovered Today:</span>
                      </div>
                      <div style={{ fontSize: "11.5px", color: "var(--mute)", marginTop: "2px" }}>
                        Recorded in Customer Khata • Already in drawer cash / UPI count above
                      </div>
                    </div>
                    <strong style={{ fontSize: "14px", color: "var(--cash)" }}>
                      +{formatMoney(khataSummary.paymentsToday)}
                    </strong>
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-xs)",
                    background: "var(--surface-low)",
                    fontSize: "12px",
                    color: "var(--mute)",
                  }}
                >
                  <span>Customer repayments go directly into drawer cash or bank UPI.</span>
                  <Link
                    to="/customers"
                    style={{ fontWeight: 700, color: "var(--brand)", textDecoration: "underline", whiteSpace: "nowrap" }}
                  >
                    Khata Ledger →
                  </Link>
                </div>
              </>
            )}

            {totalExpenses > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--surface-low)",
                  border: "1px dashed var(--line)",
                  fontSize: "13px",
                }}
              >
                <span style={{ color: "var(--mute)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>🧾</span>
                  <span>+ Day Expenses Paid from Drawer:</span>
                </span>
                <strong style={{ color: "var(--cash)" }}>+{formatMoney(totalExpenses)}</strong>
              </div>
            )}
          </div>

          <div style={{ marginTop: "auto", paddingTop: "14px", borderTop: "2px solid var(--line)", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "14px" }}>
              <span>Total Collections Accounted:</span>
              <strong style={{ color: "var(--cash)" }}>{formatMoney(actualCollections)}</strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
                background: variance >= 0 ? "var(--tint)" : "var(--bad-tint)",
                color: variance >= 0 ? "var(--brand)" : "var(--bad)",
                fontWeight: 700,
                fontSize: "13.5px",
              }}
            >
              <span>Discrepancy / Variance:</span>
              <span>{variance >= 0 ? "+" : ""}{formatMoney(variance)}</span>
            </div>
          </div>
        </section>

        {/* ================= PANEL 3: Daily Expenses & Profit ================= */}
        <section className="closing-panel" aria-labelledby="expenses-heading">
          <h2 id="expenses-heading">3. Day Expenses &amp; Net Profit</h2>
          <p className="muted" style={{ fontSize: "13px" }}>
            Direct payouts from drawer (Milk, Vegetables, Fuel).
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "260px", overflowY: "auto" }}>
            {expenses.map((exp, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 90px auto", gap: "6px" }}>
                <input
                  placeholder="e.g. Milk 5L"
                  value={exp.description}
                  onChange={(e) => handleExpenseChange(i, "description", e.target.value)}
                  disabled={isFinalized}
                />
                <input
                  type="number"
                  min="0"
                  placeholder="₹"
                  value={exp.amount === "0" || exp.amount === 0 ? "" : exp.amount}
                  onChange={(e) => handleExpenseChange(i, "amount", e.target.value)}
                  onFocus={(e) => e.target.select()}
                  disabled={isFinalized}
                />
                {!isFinalized && expenses.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => removeExpenseRow(i)}
                    style={{ color: "var(--bad)", padding: "0 8px" }}
                    aria-label="Remove expense"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {!isFinalized && (
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={addExpenseRow}
              style={{ width: "100%" }}
            >
              + Add Expense Row
            </button>
          )}

          <div style={{ marginTop: "auto", paddingTop: "14px", borderTop: "2px solid var(--line)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px", color: "var(--mute)", marginBottom: "10px" }}>
              <span>Total Day Expenses:</span>
              <strong style={{ color: "var(--bad)" }}>- {formatMoney(totalExpenses)}</strong>
            </div>

            <div className="snapshot-profit-banner">
              <div>
                <span className="label">Today's Net Profit</span>
                <div style={{ fontSize: "11px", color: "#c8e6c9" }}>Collections − Expenses</div>
              </div>
              <span className="val">{formatMoney(netProfit)}</span>
            </div>
          </div>
        </section>
      </div>

      {/* ================= STICKY SUMMARY & ACTION BAR ================= */}
      {!isFinalized && (
        <div className="closing-summary-sticky">
          <div className="closing-summary-metrics">
            <div className="closing-summary-pill">
              <span>Expected Sales</span>
              <strong>{formatMoney(expectedSales)}</strong>
            </div>
            <div className="closing-summary-pill">
              <span>Actual Collections</span>
              <strong style={{ color: "var(--cash)" }}>{formatMoney(actualCollections)}</strong>
            </div>
            <div className="closing-summary-pill">
              <span>Net Profit</span>
              <strong style={{ color: "var(--brand)" }}>{formatMoney(netProfit)}</strong>
            </div>
            <div className="closing-summary-pill">
              <span>Variance</span>
              <strong style={{ color: variance >= 0 ? "var(--cash)" : "var(--bad)" }}>
                {variance >= 0 ? "+" : ""}{formatMoney(variance)}
              </strong>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              className="btn btn-outline btn-lg"
              onClick={() => handleSaveClosing(false)}
              disabled={saving}
            >
              Save Draft
            </button>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => setShowConfirmClose(true)}
              disabled={saving || !selectedItems.length}
            >
              {saving ? "Finalizing..." : "Review & Close Day"}
            </button>
          </div>
        </div>
      )}

      {/* ================= MANAGE STORE PRODUCTS ================= */}
      {isOwner && (
        <div className="card" style={{ marginTop: "28px" }}>
          <h3 style={{ fontSize: "18px", color: "var(--deep)", marginBottom: "12px" }}>
            Manage Quick Menu Products
          </h3>
          <form className="product-add" onSubmit={handleAddProduct} style={{ marginBottom: "16px" }}>
            <input
              placeholder="Product name (e.g. Masala Chai)"
              value={productForm.name}
              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              required
            />
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Selling Price (₹)"
              value={productForm.sellingPrice}
              onChange={(e) => setProductForm({ ...productForm, sellingPrice: e.target.value })}
              required
            />
            <input
              placeholder="HSN Code (optional)"
              value={productForm.hsnCode}
              onChange={(e) => setProductForm({ ...productForm, hsnCode: e.target.value })}
            />
            <select
              value={productForm.gstRate}
              onChange={(e) => setProductForm({ ...productForm, gstRate: e.target.value })}
              style={{ width: "auto" }}
            >
              <option value="0">0% GST</option>
              <option value="5">5% GST</option>
              <option value="12">12% GST</option>
              <option value="18">18% GST</option>
            </select>
            <button className="btn btn-primary" type="submit">
              + Add Product
            </button>
          </form>

          <div className="mini-products">
            {products.map((p) => (
              <div key={p.id}>
                <span>
                  <strong>{p.name}</strong> · {formatMoney(p.sellingPrice)} (GST {p.gstRate || 0}%)
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveProduct(p.id)}
                  style={{ color: "var(--bad)", fontSize: "12.5px", fontWeight: 600 }}
                >
                  Deactivate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= RECENT CLOSINGS HISTORY ================= */}
      <div className="card" style={{ marginTop: "24px" }}>
        <h3 style={{ fontSize: "18px", color: "var(--deep)", marginBottom: "14px" }}>
          Recent Daily Closings History
        </h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Expected Sales</th>
                <th>Actual Collections</th>
                <th>Variance</th>
                <th>Expenses</th>
                <th>Net Profit</th>
              </tr>
            </thead>
            <tbody>
              {closings.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "20px" }} className="muted">
                    No closings recorded yet.
                  </td>
                </tr>
              ) : (
                closings.slice(0, 10).map((c) => {
                  const expAmt = Array.isArray(c.expenses)
                    ? c.expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
                    : Number(c.expenses || 0);
                  const drawerCount =
                    (Number(c.cash) || 0) + (Number(c.upi) || 0) + (Number(c.udhar) || 0);
                  const isDrawerOnly =
                    c.actualCollection != null &&
                    Math.abs(Number(c.actualCollection) - drawerCount) < 0.01;
                  const recCollection =
                    isDrawerOnly && expAmt > 0
                      ? Number(c.actualCollection) + expAmt
                      : Number(c.actualCollection != null ? c.actualCollection : drawerCount + expAmt);
                  const recVariance = recCollection - Number(c.expectedSales || 0);
                  const recProfit = recCollection - expAmt;

                  return (
                    <tr key={c.id || c.businessDate}>
                      <td style={{ fontWeight: 700 }}>{c.businessDate}</td>
                      <td>
                        <span className={c.status === "CLOSED" ? "good-text" : "bad-text"}>
                          {c.status}
                        </span>
                      </td>
                      <td>{formatMoney(c.expectedSales)}</td>
                      <td>{formatMoney(recCollection)}</td>
                      <td className={recVariance >= 0 ? "good-text" : "bad-text"}>
                        {recVariance >= 0 ? "+" : ""}{formatMoney(recVariance)}
                      </td>
                      <td style={{ color: "var(--bad)" }}>- {formatMoney(expAmt)}</td>
                      <td style={{ fontWeight: 800, color: "var(--brand)" }}>
                        {formatMoney(recProfit)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= CONFIRMATION MODAL ================= */}
      {showConfirmClose && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setShowConfirmClose(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
        >
          <div
            className="form-card"
            style={{ maxWidth: "460px", width: "90%", margin: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="confirm-modal-title" style={{ fontSize: "20px", color: "var(--deep)" }}>
              Confirm Day Closing for {date}
            </h3>
            <p className="muted" style={{ fontSize: "14px" }}>
              Please verify your end-of-day reconciliation numbers before finalizing. Once closed, the day's record is locked.
            </p>

            <div style={{ background: "var(--surface-low)", padding: "14px", borderRadius: "10px", margin: "10px 0", display: "flex", flexDirection: "column", gap: "8px", fontSize: "13.5px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Expected Sales:</span>
                <strong>{formatMoney(expectedSales)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Drawer Count (Cash + UPI + Udhar):</span>
                <strong>{formatMoney(drawerInflow)}</strong>
              </div>
              {totalExpenses > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Day Expenses (Paid from Drawer):</span>
                  <strong style={{ color: "var(--brand)" }}>+ {formatMoney(totalExpenses)}</strong>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed var(--line)", paddingTop: "6px" }}>
                <span>Total Collections Accounted:</span>
                <strong style={{ color: "var(--cash)" }}>{formatMoney(actualCollections)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Variance:</span>
                <strong style={{ color: variance >= 0 ? "var(--cash)" : "var(--bad)" }}>
                  {variance >= 0 ? "+" : ""}{formatMoney(variance)}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Total Day Expenses:</span>
                <strong style={{ color: "var(--bad)" }}>- {formatMoney(totalExpenses)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px solid var(--line)", fontWeight: 800 }}>
                <span>Finalized Net Profit:</span>
                <strong style={{ color: "var(--brand)" }}>{formatMoney(netProfit)}</strong>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ flex: 1 }}
                onClick={() => setShowConfirmClose(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => handleSaveClosing(true)}
              >
                Confirm &amp; Lock Day
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
