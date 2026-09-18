import {
  getDashboardReadSecret,
  getSupabaseBrowser,
  supabaseConfigured,
} from "../scripts/supabase-browser.js";

const BUCKET = "onurik-shop-products";
const STALE_KEYS = ["onurik.shop.catalog.v1", "onurik.shop.catalog.v2"];

let cache = [];
let cacheLoaded = false;
let cacheError = "";
let loadPromise = null;
let loadMode = "";
let realtimeChannel = null;

try {
  STALE_KEYS.forEach(function (key) {
    localStorage.removeItem(key);
  });
} catch {
  /* ignore */
}

export function slugifyProductId(name) {
  const base = String(name || "piece")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
  return "onk-" + (base || "piece") + "-" + Date.now().toString(36).slice(-4);
}

function ts(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (!value) return Date.now();
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

export function normalizeProduct(raw) {
  const item = raw && typeof raw === "object" ? raw : {};
  const colors = Array.isArray(item.colors)
    ? item.colors
        .map(function (c) {
          if (!c) return null;
          if (typeof c === "string") {
            const label = c.trim();
            if (!label) return null;
            return { id: slugifyProductId(label).replace(/^onk-/, ""), label: label, hex: "#1a1a1a" };
          }
          const label = String(c.label || c.id || "").trim();
          if (!label) return null;
          return {
            id: String(c.id || label)
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-"),
            label: label,
            hex: String(c.hex || "#1a1a1a"),
          };
        })
        .filter(Boolean)
    : [];
  const images = Array.isArray(item.images)
    ? item.images.filter(function (src) {
        return typeof src === "string" && src.trim();
      })
    : [];
  const sizes = Array.isArray(item.sizes)
    ? item.sizes
        .map(function (s) {
          return String(s || "").trim();
        })
        .filter(Boolean)
    : ["S", "M", "L", "XL"];
  const origRaw = item.originalPrice != null ? item.originalPrice : item.original_price;
  const orig = origRaw == null || origRaw === "" ? null : Number(origRaw);
  const inStock = item.inStock != null ? item.inStock : item.in_stock;
  return {
    id: String(item.id || slugifyProductId(item.name)),
    name: String(item.name || "Untitled piece").trim(),
    gender: item.gender === "women" ? "women" : "men",
    category: String(item.category || "t-shirts"),
    price: Number(item.price) || 0,
    originalPrice: orig && orig > 0 ? orig : null,
    images: images,
    sizes: sizes.length ? sizes : ["S", "M", "L", "XL"],
    colors: colors.length ? colors : [{ id: "ink", label: "Ink", hex: "#1a1a1a" }],
    description: String(item.description || "").trim(),
    inStock: inStock !== false,
    published: item.published !== false,
    createdAt: ts(item.createdAt || item.created_at),
    updatedAt: ts(item.updatedAt || item.updated_at),
  };
}

function fromRow(row) {
  return normalizeProduct(row);
}

function toPayload(product) {
  const next = normalizeProduct(product);
  return {
    id: next.id,
    name: next.name,
    gender: next.gender,
    category: next.category,
    price: next.price,
    original_price: next.originalPrice,
    images: next.images,
    sizes: next.sizes,
    colors: next.colors,
    description: next.description,
    in_stock: next.inStock,
    published: next.published,
  };
}

function migrationHint(error) {
  const msg = error && error.message ? String(error.message) : "";
  if (
    msg.includes("Could not find the function") ||
    msg.includes("Could not find the table") ||
    (error && error.code === "PGRST202") ||
    (error && error.code === "PGRST205")
  ) {
    return "Run SQL migrations 20260918170000_onurik_shop.sql and 20260918220000_onurik_shop_product_storage.sql in Supabase, then refresh.";
  }
  return msg || "Could not reach the shop catalog.";
}

function dataUrlToBlob(dataUrl) {
  const parts = String(dataUrl).split(",");
  const header = parts[0] || "";
  const body = parts[1] || "";
  const mimeMatch = header.match(/data:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function requireClient() {
  const sb = getSupabaseBrowser();
  if (!sb || !supabaseConfigured()) {
    throw new Error("Configure Supabase URL and anon key to manage the shop catalog.");
  }
  return sb;
}

function requireSecret() {
  const secret = getDashboardReadSecret();
  if (!secret) {
    throw new Error("Set VITE_ADMIN_DASHBOARD_SECRET so admin can write the shared catalog.");
  }
  return secret;
}

async function upsertRow(sb, secret, payload) {
  const { error } = await sb.rpc("onurik_dashboard_shop_product_upsert", {
    p_secret: secret,
    p_payload: payload,
  });
  if (error) throw new Error(migrationHint(error));
}

async function persistImages(sb, productId, images) {
  const urls = [];
  for (let i = 0; i < images.length; i++) {
    const src = String(images[i] || "").trim();
    if (!src) continue;
    if (/^https?:\/\//i.test(src)) {
      urls.push(src);
      continue;
    }
    if (src.indexOf("data:") !== 0) continue;
    const blob = dataUrlToBlob(src);
    const path = productId + "/" + String(i).padStart(2, "0") + "-" + Date.now().toString(36) + ".jpg";
    const { error } = await sb.storage.from(BUCKET).upload(path, blob, {
      upsert: true,
      contentType: blob.type || "image/jpeg",
      cacheControl: "3600",
    });
    if (error) throw new Error(error.message || "Could not upload product image.");
    const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}

async function fetchCatalog(includeHidden) {
  cacheError = "";
  try {
    if (!supabaseConfigured()) {
      cache = [];
      cacheLoaded = true;
      cacheError = "Configure Supabase URL and anon key to show merch.";
      return cache;
    }
    const sb = getSupabaseBrowser();
    if (!sb) {
      cache = [];
      cacheLoaded = true;
      cacheError = "Configure Supabase URL and anon key to show merch.";
      return cache;
    }

    let data = null;
    let error = null;
    if (includeHidden) {
      const secret = getDashboardReadSecret();
      if (!secret) {
        cache = [];
        cacheLoaded = true;
        cacheError = "Set VITE_ADMIN_DASHBOARD_SECRET to load the full catalog.";
        return cache;
      }
      const result = await sb.rpc("onurik_dashboard_shop_products_all", { p_secret: secret });
      data = result.data;
      error = result.error;
    } else {
      const result = await sb
        .from("onurik_shop_products")
        .select("id,name,gender,category,price,original_price,images,sizes,colors,description,in_stock,published,created_at,updated_at")
        .eq("published", true)
        .order("created_at", { ascending: false });
      data = result.data;
      error = result.error;
    }

    if (error) {
      cache = [];
      cacheLoaded = true;
      cacheError = migrationHint(error);
      console.error("[onurik] shop catalog", error);
      return cache;
    }

    cache = (Array.isArray(data) ? data : []).map(fromRow);
    cacheLoaded = true;
    return cache;
  } catch (err) {
    cache = [];
    cacheLoaded = true;
    cacheError = (err && err.message) || "Could not reach the shop catalog.";
    return cache;
  }
}

export function getCatalog() {
  return cache.slice();
}

export function catalogReady() {
  return cacheLoaded;
}

export function catalogError() {
  return cacheError;
}

export function loadCatalog(opts) {
  const includeHidden = Boolean(opts && opts.includeHidden);
  const force = Boolean(opts && opts.force);
  const mode = includeHidden ? "admin" : "public";
  if (!force && loadPromise && loadMode === mode) return loadPromise;
  loadMode = mode;
  loadPromise = fetchCatalog(includeHidden);
  return loadPromise;
}

export async function saveProduct(product) {
  const sb = requireClient();
  const secret = requireSecret();
  const next = normalizeProduct(product);
  const pendingUploads = next.images.some(function (src) {
    return String(src || "").indexOf("data:") === 0;
  });
  const seedImages = next.images.filter(function (src) {
    return /^https?:\/\//i.test(String(src || ""));
  });

  await upsertRow(sb, secret, toPayload(Object.assign({}, next, { images: seedImages })));
  if (pendingUploads) {
    next.images = await persistImages(sb, next.id, next.images);
    await upsertRow(sb, secret, toPayload(next));
  }

  await loadCatalog({ includeHidden: true, force: true });
  return getCatalog().find(function (item) {
    return item.id === next.id;
  }) || next;
}

export async function deleteProduct(id) {
  const sb = requireClient();
  const secret = requireSecret();
  const { error } = await sb.rpc("onurik_dashboard_shop_product_delete", {
    p_secret: secret,
    p_id: String(id || ""),
  });
  if (error) throw new Error(migrationHint(error));
  await loadCatalog({ includeHidden: true, force: true });
  return getCatalog();
}

export async function resetCatalog() {
  const sb = requireClient();
  const secret = requireSecret();
  const { error } = await sb.rpc("onurik_dashboard_shop_products_clear", {
    p_secret: secret,
  });
  if (error) throw new Error(migrationHint(error));
  cache = [];
  cacheLoaded = true;
  cacheError = "";
  loadPromise = Promise.resolve(cache);
  loadMode = "admin";
  return cache;
}

export function getProductById(id, opts) {
  const product = getCatalog().find(function (item) {
    return item.id === id;
  });
  if (!product) return null;
  if (!(opts && opts.includeHidden) && product.published === false) return null;
  return product;
}

export function filterProducts(filters) {
  const gender = filters && filters.gender ? String(filters.gender) : "";
  const category = filters && filters.category ? String(filters.category) : "";
  const query = filters && filters.q ? String(filters.q).trim().toLowerCase() : "";
  const sort = filters && filters.sort ? String(filters.sort) : "newest";
  const includeHidden = Boolean(filters && filters.includeHidden);

  let list = getCatalog().filter(function (product) {
    if (!includeHidden && product.published === false) return false;
    if (gender && product.gender !== gender) return false;
    if (category && product.category !== category) return false;
    if (query) {
      const hay = (
        product.name +
        " " +
        product.description +
        " " +
        product.category +
        " " +
        product.gender
      ).toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });

  list = list.slice().sort(function (a, b) {
    if (sort === "price-asc") return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  return list;
}

export function relatedProducts(product, limit) {
  const cap = typeof limit === "number" ? limit : 4;
  if (!product) return [];
  return getCatalog()
    .filter(function (item) {
      if (item.id === product.id) return false;
      if (item.published === false) return false;
      if (item.gender !== product.gender) return false;
      return true;
    })
    .sort(function (a, b) {
      const sameCat = Number(b.category === product.category) - Number(a.category === product.category);
      if (sameCat) return sameCat;
      return (b.createdAt || 0) - (a.createdAt || 0);
    })
    .slice(0, cap);
}

export function subscribeCatalog(onChange, opts) {
  const includeHidden = Boolean(opts && opts.includeHidden);
  if (realtimeChannel) {
    try {
      realtimeChannel.unsubscribe();
    } catch {
      /* ignore */
    }
    realtimeChannel = null;
  }
  const sb = getSupabaseBrowser();
  if (!sb) return function () {};
  realtimeChannel = sb
    .channel("onurik-shop-products")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "onurik_shop_products" },
      function () {
        loadCatalog({ includeHidden: includeHidden, force: true }).then(function (items) {
          if (typeof onChange === "function") onChange(items);
        });
      }
    )
    .subscribe();
  return function () {
    if (!realtimeChannel) return;
    try {
      realtimeChannel.unsubscribe();
    } catch {
      /* ignore */
    }
    realtimeChannel = null;
  };
}
