import { confirmWalleeReturn } from "./confirm-walle-return.js";

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
    const result = await confirmWalleeReturn(readBody(req), process.env);
    res.status(result.ok ? 200 : 400).json(result);
  } catch {
    res.status(400).json({ ok: false, error: "Invalid payment return." });
  }
}
