const PENDING_KEY = "onurik.shop.wallePending.v1";
const DEFAULT_API = "https://pmtlwsdythsngetkaalq.supabase.co/functions/v1/api";

export function wallePublishableKey() {
  return String(import.meta.env.VITE_WALLE_PUBLISHABLE_KEY || "").trim();
}

export function walleApiBase() {
  const configured = String(import.meta.env.VITE_WALLE_API_URL || DEFAULT_API)
    .trim()
    .replace(/\/$/, "");
  if (typeof location !== "undefined" && /^(localhost|127\.0\.0\.1)$/i.test(location.hostname)) {
    return "/walle-api";
  }
  return configured || DEFAULT_API;
}

export function pinKesAmount(value) {
  const n = Math.round(Number(value) || 0);
  return n < 0 ? 0 : n;
}

export function checkoutPageUrl(params) {
  const url = new URL("/shop/checkout", location.origin);
  url.search = "";
  Object.keys(params || {}).forEach(function (key) {
    if (params[key] != null && params[key] !== "") {
      url.searchParams.set(key, String(params[key]));
    }
  });
  return url.toString();
}

export function readWalleReturnQuery(search) {
  const params =
    search instanceof URLSearchParams
      ? search
      : new URLSearchParams(search || (typeof location !== "undefined" ? location.search : ""));
  return {
    wallee_session: String(params.get("wallee_session") || params.get("sid") || "").trim(),
    status: String(params.get("status") || "").trim(),
    reference: String(params.get("reference") || params.get("ref") || "").trim(),
    ts: String(params.get("ts") || "").trim(),
    sig: String(params.get("sig") || "").trim(),
    cancelled: params.get("walle") === "cancel",
  };
}

export function isWalleSignedSuccess(query) {
  return Boolean(query && query.wallee_session && query.status === "paid");
}

function parseWalleError(data, status) {
  const code = data && data.code ? String(data.code) : "";
  const message = data && data.error ? String(data.error) : "";
  if (code === "origin_not_allowed") {
    return "This payment key only accepts checkout from an allowed origin. Pay from https://www.onurik.space, or add this page’s origin on the key.";
  }
  if (code === "invalid_key") {
    return "Checkout is not configured. Set VITE_WALLE_PUBLISHABLE_KEY.";
  }
  return message || "Could not start payment (" + status + ").";
}

async function walleFetch(path, options) {
  const key = wallePublishableKey();
  if (!key) {
    return {
      ok: false,
      error: "Checkout is not configured. Set VITE_WALLE_PUBLISHABLE_KEY.",
      data: {},
      status: 0,
    };
  }
  const res = await fetch(walleApiBase() + path, {
    method: options && options.method ? options.method : "GET",
    headers: Object.assign(
      {
        Authorization: "Bearer " + key,
      },
      options && options.body ? { "Content-Type": "application/json" } : {}
    ),
    body: options && options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(function () {
    return {};
  });
  return { ok: res.ok, status: res.status, data: data };
}

export async function createWalleSession(payload) {
  const amount = pinKesAmount(payload.amount);
  if (amount < 1) {
    return { ok: false, error: "Bag total must be at least KSh 1." };
  }
  try {
    const result = await walleFetch("/v1/checkout/sessions", {
      method: "POST",
      body: {
        amount: amount,
        currency: "KES",
        reference: payload.reference,
        description: payload.description || undefined,
        successUrl: payload.successUrl,
        cancelUrl: payload.cancelUrl,
      },
    });
    if (!result.ok || !result.data || !result.data.url) {
      return { ok: false, error: parseWalleError(result.data, result.status), data: result.data };
    }
    return { ok: true, session: result.data };
  } catch {
    return { ok: false, error: "Could not reach the payment service." };
  }
}

export async function getWalleSession(id) {
  const sessionId = String(id || "").trim();
  if (!sessionId) {
    return { ok: false, error: "Missing payment session." };
  }
  const api = String(import.meta.env.VITE_WALLE_API_URL || DEFAULT_API)
    .trim()
    .replace(/\/$/, "");
  try {
    const res = await fetch(api + "/v1/checkout/sessions/" + encodeURIComponent(sessionId));
    const data = await res.json().catch(function () {
      return {};
    });
    if (!res.ok || !data.id) {
      return { ok: false, error: parseWalleError(data, res.status), data: data };
    }
    return { ok: true, session: data };
  } catch {
    return { ok: false, error: "Could not confirm the payment session." };
  }
}

export function isWallePaid(session) {
  return Boolean(session && String(session.status || "").toLowerCase() === "paid");
}

export function isWalleCanceled(session) {
  if (!session) return false;
  const status = String(session.status || "").toLowerCase();
  return status === "cancelled" || status === "canceled" || status === "expired";
}

function delay(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

export async function waitForWallePayment(id, options) {
  const tries = options && options.tries ? options.tries : 24;
  const delayMs = options && options.delayMs ? options.delayMs : 4000;
  let last = null;
  for (let i = 0; i < tries; i += 1) {
    const result = await getWalleSession(id);
    if (!result.ok) return result;
    last = result.session;
    if (isWallePaid(last) || isWalleCanceled(last)) {
      return { ok: true, session: last };
    }
    if (String(last.status || "") === "failed" && i >= 2) {
      return { ok: true, session: last, failed: true };
    }
    if (i < tries - 1) await delay(delayMs);
  }
  return { ok: true, session: last, pending: true };
}

export async function confirmWalleReturnFromQuery(query) {
  const sessionId = String((query && query.wallee_session) || "").trim();
  if (!sessionId) {
    return { ok: false, error: "Missing payment session." };
  }
  try {
    const res = await fetch("/api/walle-return", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallee_session: sessionId,
        status: query.status || "",
        reference: query.reference || "",
        ts: query.ts || "",
        sig: query.sig || "",
      }),
    });
    const data = await res.json().catch(function () {
      return {};
    });
    if (res.ok && data.session) {
      if (data.paid) return { ok: true, session: data.session };
      if (String(data.session.status || "") === "processing") {
        return waitForWallePayment(sessionId);
      }
      return { ok: true, session: data.session };
    }
    if (data && data.error && /signature/i.test(data.error)) {
      return { ok: false, error: data.error };
    }
  } catch {
    /* fall through to public GET */
  }
  const first = await getWalleSession(sessionId);
  if (!first.ok) return first;
  if (String(first.session.status || "") === "processing") {
    return waitForWallePayment(sessionId);
  }
  return first;
}

export function saveWallePending(payload) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function readWallePending() {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearWallePending() {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

export function sessionMatchesPending(session, pending, query) {
  if (!session || !pending) return false;
  const amount = pinKesAmount(pending.amount);
  if (pinKesAmount(session.amount) !== amount) return false;
  if (String(session.currency || "KES").toUpperCase() !== "KES") return false;
  const orderId = pending.order && pending.order.id;
  const returnedRef = query && query.reference;
  if (orderId && returnedRef && String(returnedRef) !== String(orderId)) return false;
  if (pending.sessionId && session.id && String(pending.sessionId) !== String(session.id)) return false;
  return true;
}
