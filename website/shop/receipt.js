function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatKes(amount) {
  const n = Number(amount) || 0;
  return "KSh " + n.toLocaleString("en-KE");
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function lineMeta(item) {
  const bits = [];
  if (item.size) bits.push("Size " + item.size);
  if (item.colorLabel || item.color) bits.push(item.colorLabel || item.color);
  return bits.join(" · ");
}

export function normalizeOrder(raw) {
  const order = raw && typeof raw === "object" ? raw : null;
  if (!order) return null;
  const customer = order.customer && typeof order.customer === "object" ? order.customer : {};
  const email = String(customer.email || "").trim();
  const items = Array.isArray(order.items) ? order.items : [];
  if (!String(order.id || "").trim() || !isValidEmail(email) || !items.length) return null;
  const shipping = order.shipping && typeof order.shipping === "object" ? order.shipping : {};
  return {
    id: String(order.id).trim(),
    items: items.map(function (item) {
      const row = item && typeof item === "object" ? item : {};
      return {
        name: String(row.name || "Piece").trim(),
        qty: Math.max(1, Number(row.qty) || 1),
        price: Number(row.price) || 0,
        size: String(row.size || "").trim(),
        color: String(row.color || "").trim(),
        colorLabel: String(row.colorLabel || "").trim(),
      };
    }),
    total: Number(order.total) || 0,
    shipping: {
      id: String(shipping.id || ""),
      label: String(shipping.label || "Shipping"),
      price: Number(shipping.price) || 0,
    },
    paymentLabel: String(order.paymentLabel || "Payment"),
    paymentRef: String(order.paymentRef || ""),
    customer: {
      name: String(customer.name || "").trim(),
      email: email,
      phone: String(customer.phone || "").trim(),
      address: String(customer.address || "").trim(),
      city: String(customer.city || "").trim(),
    },
    createdAt: Number(order.createdAt) || Date.now(),
    receiptSent: Boolean(order.receiptSent),
    receiptError: String(order.receiptError || ""),
  };
}

export function buildReceiptText(raw) {
  const order = normalizeOrder(raw);
  if (!order) return "";
  const when = new Date(order.createdAt).toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const lines = order.items.map(function (item) {
    const meta = lineMeta(item);
    return (
      item.name +
      " × " +
      item.qty +
      (meta ? " (" + meta + ")" : "") +
      " — " +
      formatKes(item.price * item.qty)
    );
  });
  return [
    "ONURIK — E-RECEIPT",
    "Order " + order.id,
    when,
    "",
    "Billed to",
    order.customer.name,
    order.customer.email,
    order.customer.phone,
    [order.customer.address, order.customer.city].filter(Boolean).join(", "),
    "",
    "Items",
    lines.join("\n"),
    "",
    "Delivery: " + order.shipping.label + " (" + (order.shipping.price ? formatKes(order.shipping.price) : "Free") + ")",
    "Payment: " + order.paymentLabel + (order.paymentRef ? " · " + order.paymentRef : ""),
    "Total paid: " + formatKes(order.total),
    "",
    "This is your official receipt for this purchase. Keep it for your records.",
    "Onurik · onurik.space",
  ].join("\n");
}

export function buildReceiptHtml(raw) {
  const order = normalizeOrder(raw);
  if (!order) return "";
  const when = new Date(order.createdAt).toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const rows = order.items
    .map(function (item) {
      const meta = lineMeta(item);
      return (
        "<tr>" +
        '<td style="padding:12px 0;border-bottom:1px solid #2a2a2a;color:#e5e2e1;font-size:14px;">' +
        escapeHtml(item.name) +
        " × " +
        item.qty +
        (meta
          ? '<div style="margin-top:4px;color:#8d8c86;font-size:12px;">' + escapeHtml(meta) + "</div>"
          : "") +
        "</td>" +
        '<td style="padding:12px 0;border-bottom:1px solid #2a2a2a;color:#e5e2e1;font-size:14px;text-align:right;white-space:nowrap;">' +
        escapeHtml(formatKes(item.price * item.qty)) +
        "</td></tr>"
      );
    })
    .join("");

  return (
    '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>' +
    "<title>Receipt " +
    escapeHtml(order.id) +
    " · Onurik</title></head>" +
    '<body style="margin:0;background:#0e0e0e;color:#e5e2e1;font-family:Montserrat,Manrope,Arial,sans-serif;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0e0e0e;padding:32px 16px;">' +
    '<tr><td align="center">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#131313;border:1px solid #2a2a2a;padding:36px 32px;">' +
    "<tr><td>" +
    '<p style="margin:0;letter-spacing:0.28em;text-transform:uppercase;font-size:11px;color:#8d8c86;">Onurik Shop</p>' +
    '<h1 style="margin:16px 0 8px;font-size:28px;line-height:1.15;font-weight:500;letter-spacing:-0.03em;color:#f5f5f5;">E-receipt</h1>' +
    '<p style="margin:0;color:#8d8c86;font-size:13px;">Order ' +
    escapeHtml(order.id) +
    " · " +
    escapeHtml(when) +
    "</p>" +
    '<p style="margin:28px 0 8px;letter-spacing:0.18em;text-transform:uppercase;font-size:11px;color:#8d8c86;">Billed to</p>' +
    '<p style="margin:0;font-size:14px;line-height:1.6;color:#e5e2e1;">' +
    escapeHtml(order.customer.name) +
    "<br/>" +
    escapeHtml(order.customer.email) +
    (order.customer.phone ? "<br/>" + escapeHtml(order.customer.phone) : "") +
    (order.customer.address || order.customer.city
      ? "<br/>" +
        escapeHtml([order.customer.address, order.customer.city].filter(Boolean).join(", "))
      : "") +
    "</p>" +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;border-top:1px solid #2a2a2a;">' +
    rows +
    '<tr><td style="padding:12px 0;color:#8d8c86;font-size:13px;">' +
    escapeHtml(order.shipping.label) +
    '</td><td style="padding:12px 0;color:#e5e2e1;font-size:13px;text-align:right;">' +
    (order.shipping.price ? escapeHtml(formatKes(order.shipping.price)) : "Free") +
    "</td></tr>" +
    '<tr><td style="padding:16px 0 0;letter-spacing:0.16em;text-transform:uppercase;font-size:11px;color:#8d8c86;">Total paid</td>' +
    '<td style="padding:16px 0 0;font-size:18px;text-align:right;color:#f5f5f5;">' +
    escapeHtml(formatKes(order.total)) +
    "</td></tr></table>" +
    '<p style="margin:28px 0 0;font-size:13px;color:#8d8c86;">Paid by ' +
    escapeHtml(order.paymentLabel) +
    (order.paymentRef ? " · " + escapeHtml(order.paymentRef) : "") +
    ".</p>" +
    '<p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#8d8c86;">This is your official receipt for this purchase. Keep it for your records. Questions — reply to this email or write jason@onurik.space.</p>' +
    "</td></tr></table></td></tr></table></body></html>"
  );
}

export function receiptFilename(raw) {
  const order = normalizeOrder(raw);
  const id = order ? order.id.replace(/[^a-zA-Z0-9-]/g, "") : "order";
  return "Onurik-receipt-" + id + ".html";
}
