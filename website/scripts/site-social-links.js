import {
  getSupabaseBrowser,
  supabaseConfigured,
} from "./supabase-browser.js";

const ORDER = [
  "instagram",
  "linkedin",
  "behance",
  "twitter",
  "github",
  "email",
];

const LABELS = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  behance: "Behance",
  twitter: "X / Twitter",
  github: "GitHub",
  email: "Email",
};

/** Always-available profiles; any links saved in Admin → Settings are merged over these. */
const DEFAULT_LINKS = {
  instagram: "https://www.instagram.com/jason_maina_",
  linkedin: "https://www.linkedin.com/in/jason-ndungu",
};

function withDefaults(links) {
  const out = Object.assign({}, DEFAULT_LINKS);
  for (const key of ORDER) {
    const v = links && typeof links[key] === "string" ? links[key].trim() : "";
    if (v) out[key] = v;
  }
  return out;
}

const FOOTER_LINK_CLASS =
  "font-mono text-[11px] tracking-[0.18em] uppercase text-cream/75 hover:text-mustard transition-colors duration-300";

const CONTACT_LINK_CLASS =
  "font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors border-b border-transparent hover:border-primary/30 pb-0.5";

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeHref(key, raw) {
  const t = String(raw ?? "").trim();
  if (!t) return "";
  if (key === "email") {
    if (/^mailto:/i.test(t)) return t;
    if (t.includes("@")) return `mailto:${t}`;
    return t;
  }
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
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
  for (const k of ORDER) {
    const v = data[k];
    out[k] = typeof v === "string" ? v : "";
  }
  return out;
}

function renderAnchors(links, linkClass, useLi) {
  const parts = [];
  for (const key of ORDER) {
    const raw = links[key];
    const href = normalizeHref(key, raw);
    if (!href) continue;
    const label = LABELS[key] ?? key;
    const external =
      key !== "email"
        ? ' target="_blank" rel="noopener noreferrer"'
        : "";
    const a = `<a class="${linkClass}" href="${escapeHtml(href)}"${external}>${escapeHtml(label)}</a>`;
    parts.push(useLi ? `<li>${a}</li>` : a);
  }
  return parts.join("");
}

function unwrapRpcPayload(data) {
  if (data == null) return null;
  if (Array.isArray(data)) {
    return data.length === 1 ? unwrapRpcPayload(data[0]) : null;
  }
  return data;
}

function hasAnyHref(links) {
  for (const key of ORDER) {
    const href = normalizeHref(key, links[key]);
    if (href) return true;
  }
  return false;
}

async function fetchLinks(sb) {
  const { data: rpcRaw, error: rpcErr } = await sb.rpc(
    "onurik_public_social_links",
  );
  if (!rpcErr && rpcRaw != null) {
    const parsed = linksObject(unwrapRpcPayload(rpcRaw));
    if (hasAnyHref(parsed)) return parsed;
  }

  const { data: row, error: rowErr } = await sb
    .from("onurik_site_settings")
    .select("value")
    .eq("key", "public_social_links")
    .maybeSingle();

  if (rowErr) {
    if (rpcErr) console.warn("[onurik] social RPC:", rpcErr.message);
    console.warn("[onurik] social REST fallback:", rowErr.message);
    throw rowErr;
  }

  const v = row?.value;
  return linksObject(v);
}

function render(links, footerEls, contactEls) {
  footerEls.forEach((el) => {
    const useLi = el.tagName === "UL";
    const html = renderAnchors(links, FOOTER_LINK_CLASS, useLi);
    el.innerHTML = html;
    if (html) el.removeAttribute("hidden");
    else el.setAttribute("hidden", "");
  });
  contactEls.forEach((el) => {
    const html = renderAnchors(links, CONTACT_LINK_CLASS, false);
    el.innerHTML = html;
    const wrap = el.closest("[data-onurik-social-contact-wrap]");
    if (html) {
      el.removeAttribute("hidden");
      wrap?.removeAttribute("hidden");
    } else {
      el.setAttribute("hidden", "");
      wrap?.setAttribute("hidden", "");
    }
  });
}

function mount() {
  const footerEls = document.querySelectorAll("[data-onurik-social-footer]");
  const contactEls = document.querySelectorAll("[data-onurik-social-contact]");
  if (!footerEls.length && !contactEls.length) return;

  // Show the default profiles straight away; saved links refine them once loaded.
  render(withDefaults({}), footerEls, contactEls);

  const sb = getSupabaseBrowser();
  if (!sb || !supabaseConfigured()) return;

  fetchLinks(sb)
    .then((links) => {
      render(withDefaults(links), footerEls, contactEls);
    })
    .catch((err) => {
      console.warn("[onurik] Could not load social links:", err?.message || err);
    });
}

mount();
