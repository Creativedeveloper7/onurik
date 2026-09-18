import { listOrders } from "./orders-store.js";

const PAYOUTS_KEY = "onurik.shop.payouts.v2";
const DEST_KEY = "onurik.shop.payouts.dest.v1";

try {
  localStorage.removeItem("onurik.shop.payouts.v1");
} catch {
  /* ignore */
}

export const MIN_PAYOUT = 100;

export const PAYOUT_METHODS = [
  { id: "mpesa", label: "M-Pesa" },
  { id: "bank", label: "Bank transfer" },
];

export const PAYOUT_STATUSES = [
  { id: "pending", label: "Pending" },
  { id: "sent", label: "Sent" },
  { id: "failed", label: "Failed" },
];

function readPayouts() {
  try {
    const raw = localStorage.getItem(PAYOUTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePayouts(items) {
  try {
    localStorage.setItem(PAYOUTS_KEY, JSON.stringify(items));
  } catch {
    /* quota / private mode */
  }
  return items;
}

export function listPayouts() {
  return readPayouts().slice().sort(function (a, b) {
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
}

export function readLastDestination() {
  try {
    const raw = localStorage.getItem(DEST_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeLastDestination(dest) {
  try {
    localStorage.setItem(DEST_KEY, JSON.stringify(dest || {}));
  } catch {
    /* ignore */
  }
}

function sumByStatus(payouts, status) {
  return payouts
    .filter(function (item) {
      return item.status === status;
    })
    .reduce(function (sum, item) {
      return sum + (Number(item.amount) || 0);
    }, 0);
}

export function financeSnapshot() {
  const orders = listOrders();
  const payouts = listPayouts();
  const recognized = orders.filter(function (order) {
    return order.status !== "cancelled";
  });
  const cancelled = orders.filter(function (order) {
    return order.status === "cancelled";
  });
  const open = orders.filter(function (order) {
    return order.status === "new" || order.status === "processing";
  });
  const fulfilled = orders.filter(function (order) {
    return order.status === "fulfilled";
  });
  const gross = recognized.reduce(function (sum, order) {
    return sum + (Number(order.total) || 0);
  }, 0);
  const pending = sumByStatus(payouts, "pending");
  const withdrawn = sumByStatus(payouts, "sent");
  const available = Math.max(0, gross - pending - withdrawn);
  return {
    orderCount: orders.length,
    recognizedCount: recognized.length,
    cancelledCount: cancelled.length,
    openCount: open.length,
    fulfilledCount: fulfilled.length,
    gross: gross,
    pending: pending,
    withdrawn: withdrawn,
    available: available,
    payoutCount: payouts.length,
  };
}

function payoutId() {
  return "ONK-OUT-" + Date.now().toString(36).toUpperCase();
}

export function requestPayout(payload) {
  const input = payload && typeof payload === "object" ? payload : {};
  const amount = Math.round(Number(input.amount) || 0);
  const method = input.method === "bank" ? "bank" : "mpesa";
  const snap = financeSnapshot();

  if (amount < MIN_PAYOUT) {
    return { ok: false, error: "Minimum withdrawal is KSh " + MIN_PAYOUT + "." };
  }
  if (amount > snap.available) {
    return { ok: false, error: "Amount exceeds available balance." };
  }

  const dest = {
    method: method,
    phone: String(input.phone || "").trim(),
    bankName: String(input.bankName || "").trim(),
    accountName: String(input.accountName || "").trim(),
    accountNumber: String(input.accountNumber || "").trim(),
    note: String(input.note || "").trim(),
  };

  if (method === "mpesa") {
    const digits = dest.phone.replace(/\D/g, "");
    if (digits.length < 9) {
      return { ok: false, error: "Enter a valid M-Pesa number." };
    }
  } else if (!dest.bankName || !dest.accountName || !dest.accountNumber) {
    return { ok: false, error: "Bank name, account name, and account number are required." };
  }

  const next = {
    id: payoutId(),
    amount: amount,
    status: "pending",
    method: method,
    destination: dest,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const items = readPayouts();
  items.unshift(next);
  writePayouts(items);
  writeLastDestination(dest);
  return { ok: true, payout: next };
}

export function updatePayoutStatus(id, status) {
  const allowed = PAYOUT_STATUSES.some(function (item) {
    return item.id === status;
  });
  if (!allowed) return null;
  const items = readPayouts().map(function (item) {
    if (item.id !== id) return item;
    return Object.assign({}, item, { status: status, updatedAt: Date.now() });
  });
  writePayouts(items);
  return items.find(function (item) {
    return item.id === id;
  }) || null;
}

export function deletePayout(id) {
  writePayouts(
    readPayouts().filter(function (item) {
      return item.id !== id;
    })
  );
}
