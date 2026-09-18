import { dispatchShopReceipt } from "./send-shop-receipt.js";

function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body || "{}");
    } catch {
      return {};
    }
  }
  return {};
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  try {
    const payload = readBody(req);
    const result = await dispatchShopReceipt(payload.order, process.env);
    res.status(result.ok ? 200 : 502).json(result);
  } catch {
    res.status(400).json({ ok: false, error: "Invalid receipt request." });
  }
}
