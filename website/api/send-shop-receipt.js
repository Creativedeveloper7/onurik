import { buildReceiptHtml, buildReceiptText, isValidEmail, normalizeOrder, receiptFilename } from "../shop/receipt.js";

function envValue(env, key) {
  const source = env || process.env || {};
  const fromEnv = source[key];
  const fromProcess = process.env ? process.env[key] : "";
  return String(fromEnv || fromProcess || "").trim();
}

function resendMessage(data, fallback) {
  if (!data || typeof data !== "object") return fallback;
  if (typeof data.message === "string" && data.message.trim()) return data.message.trim();
  if (typeof data.error === "string" && data.error.trim()) return data.error.trim();
  if (data.error && typeof data.error === "object" && typeof data.error.message === "string") {
    return data.error.message.trim();
  }
  return fallback;
}

function parseFromAddress(from) {
  const raw = String(from || "").trim();
  const angled = raw.match(/<([^>]+)>/);
  const email = (angled ? angled[1] : raw).trim().toLowerCase();
  return isValidEmail(email) ? email : "";
}

export async function dispatchShopReceipt(rawOrder, env) {
  const order = normalizeOrder(rawOrder);
  if (!order) {
    return { ok: false, error: "A valid order and customer email are required." };
  }

  const apiKey = envValue(env, "RESEND_API_KEY");
  if (!apiKey) {
    return { ok: false, error: "Receipt email is not configured." };
  }

  const from = envValue(env, "SHOP_RECEIPT_FROM") || "Onurik Shop <jason@onurik.space>";
  const fromEmail = parseFromAddress(from);
  if (!fromEmail) {
    return { ok: false, error: "SHOP_RECEIPT_FROM must be a valid email on your verified Resend domain." };
  }

  const bcc = envValue(env, "SHOP_RECEIPT_BCC");
  const html = buildReceiptHtml(order);
  const to = order.customer.email;
  const payload = {
    from: from,
    to: [to],
    reply_to: fromEmail,
    subject: "Receipt " + order.id + " · Onurik",
    html: html,
    text: buildReceiptText(order),
    attachments: [
      {
        filename: receiptFilename(order),
        content: Buffer.from(html).toString("base64"),
      },
    ],
  };
  if (bcc && isValidEmail(bcc) && bcc.toLowerCase() !== to.toLowerCase()) {
    payload.bcc = [bcc];
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
      "User-Agent": "OnurikShop/1.0 (+https://onurik.space)",
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(function () {
    return {};
  });
  if (!res.ok) {
    return {
      ok: false,
      error: resendMessage(data, "Receipt email could not be delivered."),
    };
  }
  return { ok: true, id: data && data.id ? data.id : "" };
}
