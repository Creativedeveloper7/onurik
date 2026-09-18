const CATALOG_KEY = "onurik.shop.catalog.v2";

export function slugifyProductId(name) {
  const base = String(name || "piece")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
  return "onk-" + (base || "piece") + "-" + Date.now().toString(36).slice(-4);
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
            id: String(c.id || label).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
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
    ? item.sizes.map(function (s) { return String(s || "").trim(); }).filter(Boolean)
    : ["S", "M", "L", "XL"];
  const orig = item.originalPrice == null || item.originalPrice === "" ? null : Number(item.originalPrice);
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
    inStock: item.inStock !== false,
    published: item.published !== false,
    createdAt: Number(item.createdAt) || Date.now(),
    updatedAt: Number(item.updatedAt) || Date.now(),
  };
}

try {
  localStorage.removeItem("onurik.shop.catalog.v1");
} catch {
  /* ignore */
}

function writeCatalog(items) {
  try {
    localStorage.setItem(CATALOG_KEY, JSON.stringify(items));
  } catch {
    /* quota / private mode */
  }
  return items;
}

export function getCatalog() {
  try {
    const raw = localStorage.getItem(CATALOG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(normalizeProduct);
    }
  } catch {
    /* ignore */
  }
  return writeCatalog([]);
}

export function saveCatalog(items) {
  const next = (Array.isArray(items) ? items : []).map(normalizeProduct);
  return writeCatalog(next);
}

export function saveProduct(product) {
  const next = normalizeProduct(product);
  const list = getCatalog();
  const i = list.findIndex(function (item) {
    return item.id === next.id;
  });
  next.updatedAt = Date.now();
  if (i >= 0) {
    next.createdAt = list[i].createdAt || next.createdAt;
    list[i] = next;
  } else {
    next.createdAt = next.createdAt || Date.now();
    list.unshift(next);
  }
  writeCatalog(list);
  return next;
}

export function deleteProduct(id) {
  const list = getCatalog().filter(function (item) {
    return item.id !== id;
  });
  writeCatalog(list);
  return list;
}

export function resetCatalog() {
  return writeCatalog([]);
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
