import { buildReceiptHtml, receiptFilename } from "./receipt.js";

export async function sendOrderReceipt(order) {
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller
    ? setTimeout(function () {
        controller.abort();
      }, 15000)
    : null;
  try {
    const res = await fetch("/api/shop-receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: order }),
      signal: controller ? controller.signal : undefined,
    });
    const data = await res.json().catch(function () {
      return {};
    });
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || "Receipt could not be sent." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Receipt could not be sent." };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function downloadReceiptFile(order) {
  const html = buildReceiptHtml(order);
  if (!html) return;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = receiptFilename(order);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
