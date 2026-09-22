import crypto from "node:crypto";

const DEFAULT_API = "https://pmtlwsdythsngetkaalq.supabase.co/functions/v1/api";

function envValue(env, key) {
  const source = env || process.env || {};
  return String(source[key] || (process.env && process.env[key]) || "").trim();
}

export function verifyWalleeReturnSignature(query, env) {
  const secret = envValue(env, "CHECKOUT_SIGNING_SECRET") || envValue(env, "WALLEE_CHECKOUT_SIGNING_SECRET");
  if (!secret) {
    return { checked: false, ok: true };
  }
  const sessionId = String((query && query.wallee_session) || "").trim();
  const status = String((query && query.status) || "").trim();
  const reference = String((query && query.reference) || "");
  const ts = String((query && query.ts) || "").trim();
  const sig = String((query && query.sig) || "").trim();
  if (!sessionId || !status || !ts || !sig) {
    return { checked: true, ok: false };
  }
  const base = sessionId + "." + status + "." + reference + "." + ts;
  const expected = crypto.createHmac("sha256", secret).update(base).digest("hex");
  let ok = false;
  try {
    ok =
      expected.length === sig.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    ok = false;
  }
  return { checked: true, ok: ok };
}

export async function confirmWalleeReturn(query, env) {
  const sessionId = String((query && query.wallee_session) || "").trim();
  if (!sessionId) {
    return { ok: false, error: "Missing Wallee session." };
  }
  const signature = verifyWalleeReturnSignature(query, env);
  if (signature.checked && !signature.ok) {
    return { ok: false, error: "Payment return signature is invalid." };
  }
  const api = envValue(env, "VITE_WALLE_API_URL") || DEFAULT_API;
  try {
    const res = await fetch(api.replace(/\/$/, "") + "/v1/checkout/sessions/" + encodeURIComponent(sessionId));
    const session = await res.json().catch(function () {
      return {};
    });
    if (!res.ok || !session.id) {
      return { ok: false, error: session.error || "Could not confirm the payment session." };
    }
    return {
      ok: true,
      paid: session.status === "paid",
      session: session,
      signatureChecked: signature.checked,
    };
  } catch {
    return { ok: false, error: "Could not confirm the payment session." };
  }
}
