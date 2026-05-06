import { createClient } from "@supabase/supabase-js";

/** Host-only values (common .env mistake) become valid HTTPS URLs */
function normalizeSupabaseUrl(raw) {
  let u = String(raw ?? "").trim();
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) {
    const clean = u.replace(/^\/+|\/+$/g, "");
    if (/^[a-z0-9]+\.supabase\.co$/i.test(clean)) {
      u = `https://${clean}`;
    }
  }
  return u;
}

function isValidHttpUrl(candidate) {
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function metaContent(name) {
  const el =
    typeof document !== "undefined" &&
    document.querySelector(`meta[name="${name}"]`);
  const v = el?.getAttribute("content");
  return typeof v === "string" ? v.trim() : "";
}

function fromWindow() {
  const c =
    typeof globalThis !== "undefined" &&
    globalThis.__ONURIK_PUBLIC_CONFIG__;
  return c && typeof c === "object" ? c : null;
}

export function getSupabaseUrl() {
  const cfg = fromWindow();
  const w =
    cfg && typeof cfg.supabaseUrl === "string"
      ? normalizeSupabaseUrl(cfg.supabaseUrl)
      : "";
  if (w) return w;
  const m = normalizeSupabaseUrl(metaContent("onurik-supabase-url"));
  if (m) return m;
  return normalizeSupabaseUrl(
    String(import.meta.env.VITE_SUPABASE_URL || ""),
  );
}

export function getSupabaseAnonKey() {
  const cfg = fromWindow();
  const w =
    cfg && typeof cfg.supabaseAnonKey === "string"
      ? cfg.supabaseAnonKey.trim()
      : "";
  if (w) return w;
  const m = metaContent("onurik-supabase-anon-key");
  if (m) return m;
  return String(import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();
}

export function getDashboardReadSecret() {
  const cfg = fromWindow();
  const w =
    cfg && typeof cfg.dashboardSecret === "string"
      ? cfg.dashboardSecret.trim()
      : "";
  if (w) return w;
  const m = metaContent("onurik-dashboard-secret");
  if (m) return m;
  return String(import.meta.env.VITE_ADMIN_DASHBOARD_SECRET || "").trim();
}

let instance;

/** @returns {import("@supabase/supabase-js").SupabaseClient | null} */
export function getSupabaseBrowser() {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey || !isValidHttpUrl(url)) return null;
  if (!instance) {
    instance = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return instance;
}

export function supabaseConfigured() {
  const url = getSupabaseUrl();
  return Boolean(url && isValidHttpUrl(url) && getSupabaseAnonKey());
}
