const ORDERS_KEY = "onurik.shop.orders.v2";

try {
  localStorage.removeItem("onurik.shop.orders.v1");
} catch {
  /* ignore */
}

export const ORDER_STATUSES = [
  { id: "new", label: "New" },
  { id: "processing", label: "Processing" },
  { id: "fulfilled", label: "Fulfilled" },
  { id: "cancelled", label: "Cancelled" },
];

function read() {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items) {
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(items));
  } catch {
    /* quota / private mode */
  }
  return items;
}

export function listOrders() {
  return read().slice().sort(function (a, b) {
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
}

export function getOrderById(id) {
  return read().find(function (order) {
    return order.id === id;
  }) || null;
}

export function addOrder(order) {
  const items = read();
  const next = Object.assign({}, order, {
    status: order.status || "new",
    createdAt: order.createdAt || Date.now(),
    updatedAt: Date.now(),
  });
  items.unshift(next);
  write(items);
  return next;
}

export function updateOrderStatus(id, status) {
  const allowed = ORDER_STATUSES.some(function (s) {
    return s.id === status;
  });
  const nextStatus = allowed ? status : "new";
  const items = read().map(function (order) {
    if (order.id !== id) return order;
    return Object.assign({}, order, { status: nextStatus, updatedAt: Date.now() });
  });
  write(items);
  return getOrderById(id);
}

export function deleteOrder(id) {
  write(
    read().filter(function (order) {
      return order.id !== id;
    })
  );
}

export function orderStats() {
  const items = read();
  const open = items.filter(function (order) {
    return order.status === "new" || order.status === "processing";
  });
  const revenue = items
    .filter(function (order) {
      return order.status !== "cancelled";
    })
    .reduce(function (sum, order) {
      return sum + (Number(order.total) || 0);
    }, 0);
  return {
    total: items.length,
    open: open.length,
    revenue: revenue,
  };
}
