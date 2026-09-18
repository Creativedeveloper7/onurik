import { buildReceiptHtml, buildReceiptText, normalizeOrder, receiptFilename } from "../shop/receipt.js";

function envValue(env, key) {
  const source = env || process.env || {};
  return String(source[key] || "").trim();
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

  const from = envValue(env, "SHOP_RECEIPT_FROM") || "Onurik Shop <beth.t@example.com>";
  const bcc = envValue(env, "SHOP_RECEIPT_BCC");
  const html = buildReceiptHtml(order);
  const payload = {
    from: from,
    to: [order.customer.email],
    subject: "Receipt " + order.id + " · Onurik",
    html: html,
    text: buildReceiptText(order),
    attachments: [
      {
        filename: receiptFilename(order),
        content: Buffer.from(html).toString("base64"),
        contentType: "text/html; charset=utf-8",
      },
    ],
  };
  if (bcc) payload.bcc = [bcc];

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(function () {
    return {};
  });
  if (!res.ok) {
    const message =
      (data && (data.message || data.error)) || "Receipt email could not be delivered.";
    return { ok: false, error: String(message) };
  }
  return { ok: true, id: data && data.id ? data.id : "" };
}
