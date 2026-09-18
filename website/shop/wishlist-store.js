const KEY = "onurik.shop.wishlist.v2";
const listeners = new Set();

try {
  localStorage.removeItem("onurik.shop.wishlist.v1");
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

function write(ids) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* private mode */
  }
  listeners.forEach(function (fn) {
    fn(ids);
  });
}

export function getWishlist() {
  return read();
}

export function isWishlisted(id) {
  return read().includes(id);
}

export function toggleWishlist(id) {
  const ids = read();
  const i = ids.indexOf(id);
  if (i >= 0) ids.splice(i, 1);
  else ids.push(id);
  write(ids);
  return ids.includes(id);
}

export function subscribeWishlist(fn) {
  listeners.add(fn);
  return function () {
    listeners.delete(fn);
  };
}
