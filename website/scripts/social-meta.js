/**
 * Open Graph + Twitter Card helpers for static pages (browser-side).
 * Crawlers that do not run JS are handled by Vercel Edge Middleware (see ../middleware.js).
 */

const DEFAULT_SITE_NAME = "Onurik";
const DEFAULT_OG_TITLE = "Work | Onurik";
const DEFAULT_DESCRIPTION =
  "Explore engineering and design work by Onurik — human-centered systems and product experiences.";
/** Absolute, HTTPS, ~1200×630; safe default when no project image is usable for previews. */
export const ONURIK_DEFAULT_OG_IMAGE =
  "https://placehold.co/1200x630/131313/e5e2e1/png?text=Onurik";

const OG_IMAGE_WIDTH = "1200";
const OG_IMAGE_HEIGHT = "630";

/**
 * @param {string} raw
 * @param {string} origin  e.g. https://example.com
 */
export function absoluteUrlForOg(raw, origin) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (/^data:/i.test(s)) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("//")) return "https:" + s;
  try {
    return new URL(s, origin).href;
  } catch (_e) {
    return "";
  }
}

/**
 * @param {string} description
 * @param {number} [max]
 */
export function truncateForMeta(description, max) {
  const m = typeof max === "number" ? max : 200;
  const t = String(description ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length <= m) return t;
  return t.slice(0, m - 1).trimEnd() + "…";
}

/**
 * @param {"property" | "name"} keyAttr
 * @param {string} key
 * @param {string} content
 */
function upsertMeta(keyAttr, key, content) {
  const head = document.head;
  if (!head) return;
  const safe = String(content ?? "");
  let el = null;
  const nodes = head.querySelectorAll("meta[" + keyAttr + "]");
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].getAttribute(keyAttr) === key) {
      el = nodes[i];
      break;
    }
  }
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(keyAttr, key);
    head.appendChild(el);
  }
  el.setAttribute("content", safe);
}

/**
 * @param {string} href
 */
function upsertCanonical(href) {
  const head = document.head;
  if (!head) return;
  let el = head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * @param {{
 *   title: string;
 *   description: string;
 *   imageUrl: string;
 *   canonicalUrl: string;
 *   siteName?: string;
 * }} opts
 */
export function applyWorkSocialPreview(opts) {
  const siteName = opts.siteName || DEFAULT_SITE_NAME;
  const title = String(opts.title || "").trim() || DEFAULT_OG_TITLE;
  const desc = truncateForMeta(opts.description || DEFAULT_DESCRIPTION);
  const origin = (function () {
    try {
      return new URL(opts.canonicalUrl).origin;
    } catch (_e) {
      return "";
    }
  })();
  let image = absoluteUrlForOg(opts.imageUrl, origin);
  if (!image) image = ONURIK_DEFAULT_OG_IMAGE;

  document.title = title + " · " + siteName;

  upsertMeta("name", "description", desc);

  upsertMeta("property", "og:type", "article");
  upsertMeta("property", "og:site_name", siteName);
  upsertMeta("property", "og:title", title);
  upsertMeta("property", "og:description", desc);
  if (opts.canonicalUrl) {
    upsertMeta("property", "og:url", opts.canonicalUrl);
    upsertCanonical(opts.canonicalUrl);
  }
  upsertMeta("property", "og:image", image);
  upsertMeta("property", "og:image:width", OG_IMAGE_WIDTH);
  upsertMeta("property", "og:image:height", OG_IMAGE_HEIGHT);
  upsertMeta("property", "og:image:alt", title);
  upsertMeta("property", "og:locale", "en_US");

  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", title);
  upsertMeta("name", "twitter:description", desc);
  upsertMeta("name", "twitter:image", image);
  upsertMeta("name", "twitter:image:alt", title);
}

/**
 * @param {{ canonicalUrl: string; title?: string; description?: string; siteName?: string }} [opts]
 */
export function applyWorkSocialPreviewFallback(opts) {
  const siteName = (opts && opts.siteName) || DEFAULT_SITE_NAME;
  const title = (opts && opts.title) || DEFAULT_OG_TITLE;
  const desc = truncateForMeta((opts && opts.description) || DEFAULT_DESCRIPTION);
  const canonicalUrl = (opts && opts.canonicalUrl) || "";
  applyWorkSocialPreview({
    title,
    description: desc,
    imageUrl: ONURIK_DEFAULT_OG_IMAGE,
    canonicalUrl: canonicalUrl || (typeof location !== "undefined" ? location.href : ""),
    siteName,
  });
}
