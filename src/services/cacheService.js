/**
 * DukanKhata™ Enterprise High-Performance Caching & Data Service
 * 
 * Multi-tiered Caching Architecture:
 * - L1: In-Memory RAM Map (< 0.1ms access time, instant sub-millisecond response)
 * - L2: Persistent Web Storage with TTL & Stale-While-Revalidate capability
 * - Fast Barcode & Name Indexing for High-Speed POS Billing
 */

const memoryCache = new Map();

export const CACHE_KEYS = {
  PRODUCTS: "dk_cache_products",
  CUSTOMERS: "dk_cache_customers",
  STAFF: "dk_cache_staff",
  DASHBOARD: "dk_cache_dashboard",
  SUBSCRIPTION_PLANS: "dk_cache_plans",
  CLOSINGS: "dk_cache_closings",
};

// Default TTLs in milliseconds
export const TTL = {
  PRODUCTS: 10 * 60 * 1000,    // 10 minutes (refreshes silently in background)
  CUSTOMERS: 5 * 60 * 1000,    // 5 minutes
  STAFF: 30 * 60 * 1000,       // 30 minutes
  DASHBOARD: 2 * 60 * 1000,    // 2 minutes
  PLANS: 60 * 60 * 1000,       // 1 hour
};

/**
 * Retrieve data from L1 (Memory) or L2 (Storage).
 * Returns { data, isStale } or null if absent.
 */
export function getCached(key) {
  // 1. Check L1 Memory (fastest: < 0.1ms)
  if (memoryCache.has(key)) {
    const entry = memoryCache.get(key);
    const isStale = Date.now() > entry.expiry;
    return { data: entry.data, isStale };
  }

  // 2. Check L2 Session/Local Storage
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      const isStale = Date.now() > parsed.expiry;
      // Populate L1 for subsequent sub-millisecond lookups
      memoryCache.set(key, parsed);
      return { data: parsed.data, isStale };
    }
  } catch {
    // Ignore storage parse issues
  }

  return null;
}

/**
 * Save data into L1 Memory and L2 Storage with custom TTL.
 */
export function setCached(key, data, ttlMs = 5 * 60 * 1000) {
  const entry = {
    data,
    savedAt: Date.now(),
    expiry: Date.now() + ttlMs,
  };

  // Set L1 RAM
  memoryCache.set(key, entry);

  // Set L2 Storage
  try {
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // SessionStorage full or unavailable
  }
}

/**
 * Invalidate cache entry or group of entries by prefix.
 */
export function invalidateCache(keyOrPrefix) {
  for (const k of memoryCache.keys()) {
    if (k.startsWith(keyOrPrefix)) {
      memoryCache.delete(k);
    }
  }

  try {
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(keyOrPrefix)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // Ignore storage issues
  }
}

/**
 * Stale-While-Revalidate (SWR) Runner
 * 1. Calls onData immediately if cached data exists (0ms UI render!)
 * 2. Fetches fresh data over network in background if stale or missing
 * 3. Updates cache and invokes onData with fresh data seamlessly
 */
export async function swrFetch(key, fetcher, ttlMs, onData, onError) {
  const cached = getCached(key);

  if (cached && cached.data) {
    onData(cached.data, false); // false = served from instant cache
  }

  // If no cache OR cache is stale, revalidate over network
  if (!cached || cached.isStale) {
    try {
      const freshData = await fetcher();
      if (freshData !== undefined && freshData !== null) {
        setCached(key, freshData, ttlMs);
        onData(freshData, true); // true = freshly validated
      }
    } catch (err) {
      if (onError && !cached) {
        onError(err);
      }
    }
  }
}

/**
 * Fast POS Index Map
 * Creates an ultra-fast O(1) hash map of products keyed by Barcode & ID
 */
export function buildProductBarcodeIndex(products = []) {
  const barcodeMap = new Map();
  const idMap = new Map();

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    if (p.id) idMap.set(String(p.id), p);
    if (p.barcode) barcodeMap.set(String(p.barcode).trim(), p);
    if (p.sku) barcodeMap.set(String(p.sku).trim(), p);
  }

  return {
    findByBarcode: (code) => barcodeMap.get(String(code).trim()) || null,
    findById: (id) => idMap.get(String(id)) || null,
  };
}

/**
 * Hover Route Preloader
 * Dynamically imports code chunks on mouse hover (200ms before click)
 */
const preloadedModules = new Set();

export function prefetchRoute(importFn) {
  if (typeof importFn !== "function") return;
  const key = importFn.toString();
  if (preloadedModules.has(key)) return;

  preloadedModules.add(key);
  try {
    // Low priority idle chunk prefetch
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => importFn());
    } else {
      setTimeout(() => importFn(), 50);
    }
  } catch {
    // Ignore prefetch errors
  }
}
