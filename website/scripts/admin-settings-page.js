import {
  getSupabaseBrowser,
  getDashboardReadSecret,
  supabaseConfigured,
} from "./supabase-browser.js";

const KEYS = [
  "instagram",
  "linkedin",
  "behance",
  "twitter",
  "github",
  "email",
];

function setStatus(el, msg, isErr) {
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle("text-red-400", Boolean(isErr));
  el.classList.toggle("text-on-surface-variant", !isErr);
}

function linksObject(data) {
  if (data == null) return {};
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return {};
    }
  }
  if (typeof data !== "object" || Array.isArray(data)) return {};
  const out = {};
  for (const k of KEYS) {
    const v = data[k];
    out[k] = typeof v === "string" ? v : "";
  }
  return out;
}

(async function init() {
  const statusEl = document.getElementById("social-settings-status");
  const saveBtn = document.getElementById("social-save-btn");
  const sb = getSupabaseBrowser();
  const secret = getDashboardReadSecret();

  if (!saveBtn) return;

  async function load() {
    if (!sb || !supabaseConfigured()) {
      setStatus(
        statusEl,
        "Add Supabase URL and anon key (build .env or __ONURIK_PUBLIC_CONFIG__), then reload.",
        true,
      );
      return;
    }
    setStatus(statusEl, "Loading…", false);
    const { data, error } = await sb.rpc("onurik_public_social_links");
    if (error) {
      setStatus(
        statusEl,
        error.message?.includes("Could not find") || error.code === "PGRST202"
          ? "Run migration 20260208150000_public_social_links.sql in Supabase, then refresh."
          : error.message || "Could not load links.",
        true,
      );
      return;
    }
    const links = linksObject(data);
    KEYS.forEach((k) => {
      const input = document.getElementById(`social-${k}`);
      if (input) input.value = links[k] ?? "";
    });
    setStatus(statusEl, "Paste full URLs (https://…). Email accepts an address or mailto: link.", false);
  }

  saveBtn.addEventListener("click", async () => {
    if (!sb || !supabaseConfigured() || !secret) {
      setStatus(
        statusEl,
        "Set VITE_ADMIN_DASHBOARD_SECRET (and Supabase keys), rebuild or use __ONURIK_PUBLIC_CONFIG__, then reload.",
        true,
      );
      return;
    }
    const payload = {};
    KEYS.forEach((k) => {
      const el = document.getElementById(`social-${k}`);
      payload[k] = el ? String(el.value).trim() : "";
    });
    setStatus(statusEl, "Saving…", false);
    const { error } = await sb.rpc("onurik_dashboard_social_links_set", {
      p_secret: secret,
      p_links: payload,
    });
    if (error) {
      setStatus(statusEl, error.message || "Save failed.", true);
      return;
    }
    setStatus(statusEl, "Saved. Refresh the public site to see footer and Contact updates.", false);
  });

  await load();
})();
