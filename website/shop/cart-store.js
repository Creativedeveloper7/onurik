import { lineKey } from "./format.js";

const KEY = "onurik.shop.cart.v2";
const listeners = new Set();

try {
  localStorage.removeItem("onurik.shop.cart.v1");
} catch {
  /* ignore */
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* private mode */
  }
  listeners.forEach(function (fn) {
    fn(items);
  });
}

export function getCart() {
  return read();
}

export function subscribeCart(fn) {
  listeners.add(fn);
  return function () {
    listeners.delete(fn);
  };
}

export function cartCount() {
  return read().reduce(function (sum, item) {
    return sum + (Number(item.qty) || 0);
  }, 0);
}

export function addToCart(entry) {
  const items = read();
  const key = lineKey(entry.productId, entry.size, entry.color);
  const existing = items.find(function (item) {
    return lineKey(item.productId, item.size, item.color) === key;
  });
  if (existing) {
    existing.qty = Math.min(12, (Number(existing.qty) || 0) + (Number(entry.qty) || 1));
  } else {
    items.push({
      productId: entry.productId,
      name: entry.name,
      price: Number(entry.price) || 0,
      originalPrice: entry.originalPrice || null,
      image: entry.image || "",
      size: entry.size || "",
      color: entry.color || "",
      colorLabel: entry.colorLabel || "",
      qty: Math.max(1, Math.min(12, Number(entry.qty) || 1)),
    });
  }
  write(items);
  return items;
}

export function setLineQty(productId, size, color, qty) {
  const nextQty = Math.max(0, Math.min(12, Number(qty) || 0));
  let items = read();
  const key = lineKey(productId, size, color);
  if (nextQty <= 0) {
    items = items.filter(function (item) {
      return lineKey(item.productId, item.size, item.color) !== key;
    });
  } else {
    items.forEach(function (item) {
      if (lineKey(item.productId, item.size, item.color) === key) {
        item.qty = nextQty;
      }
    });
  }
  write(items);
  return items;
}

export function removeLine(productId, size, color) {
  return setLineQty(productId, size, color, 0);
}

export function clearCart() {
  write([]);
}

export function cartSubtotal() {
  return read().reduce(function (sum, item) {
    return sum + (Number(item.price) || 0) * (Number(item.qty) || 0);
  }, 0);
}
