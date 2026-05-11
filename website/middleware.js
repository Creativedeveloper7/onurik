/**
 * Vercel Edge Middleware: serve HTML with Open Graph / Twitter meta tags to link-preview
 * crawlers (they usually do not execute JavaScript). Human visitors continue to the static
 * `work.html` + Vite bundle unchanged.
 *
 * Env (set in Vercel → Project → Settings → Environment Variables):
 *   VITE_SUPABASE_URL or SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY
 */

import { next } from "@vercel/edge";

export const config = {
  matcher: ["/work.html"],
};

const BOT_UA =
  /facebookexternalhit|Facebot|fbav|Twitterbot|LinkedInBot|WhatsApp|Slackbot|TelegramBot|Discordbot|Pinterest|vkShare|Google-InspectionTool|Slurp|bingbot|Applebot|Embedly|Quora Link Preview/i;

const DEFAULT_SITE = "Onurik";
const DEFAULT_DESC =
  "Explore engineering and design work by Onurik — human-centered systems and product experiences.";
const DEFAULT_OG_IMAGE =
  "https://placehold.co/1200x630/131313/e5e2e1/png?text=Onurik";

function escapeAttr(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function truncateMeta(s, max) {
  const m = max ?? 200;
  const t = String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length <= m) return t;
  return t.slice(0, m - 1).trimEnd() + "…";
}

function absoluteImage(raw, origin) {
  const v = String(raw ?? "").trim();
  if (!v || /^data:/i.test(v)) return DEFAULT_OG_IMAGE;
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("//")) return "https:" + v;
  try {
    return new URL(v, origin).href;
  } catch (_e) {
    return DEFAULT_OG_IMAGE;
  }
}

function buildOgHtml({ title, description, image, canonicalUrl, siteName }) {
  const t = escapeAttr(title);
  const d = escapeAttr(description);
  const img = escapeAttr(image);
  const url = escapeAttr(canonicalUrl);
  const site = escapeAttr(siteName);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${t} · ${site}</title>
<meta name="description" content="${d}"/>
<link rel="canonical" href="${url}"/>
<meta property="og:type" content="article"/>
<meta property="og:site_name" content="${site}"/>
<meta property="og:title" content="${t}"/>
<meta property="og:description" content="${d}"/>
<meta property="og:url" content="${url}"/>
<meta property="og:image" content="${img}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:image:alt" content="${t}"/>
<meta property="og:locale" content="en_US"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${t}"/>
<meta name="twitter:description" content="${d}"/>
<meta name="twitter:image" content="${img}"/>
<meta name="twitter:image:alt" content="${t}"/>
</head>
<body style="margin:0;background:#131313;color:#e5e2e1;font-family:system-ui,sans-serif;padding:2rem;">
<p style="max-width:40rem;line-height:1.5">${d}</p>
<p><a href="${url}" style="color:#fff">Open this project</a></p>
</body>
</html>`;
}

export default async function middleware(request) {
  const ua = request.headers.get("user-agent") || "";
  if (!BOT_UA.test(ua)) {
    return next({ request });
  }

  const reqUrl = new URL(request.url);
  const id = reqUrl.searchParams.get("id");
  if (!id || !id.trim()) {
    return next({ request });
  }

  const origin = reqUrl.origin;
  const canonicalUrl = reqUrl.href.split("#")[0];

  const supabaseUrl = (
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ""
  ).trim();
  const anonKey = (
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ""
  ).trim();

  let title = "Work";
  let description = DEFAULT_DESC;
  let image = DEFAULT_OG_IMAGE;

  if (supabaseUrl && anonKey) {
    const base = supabaseUrl.replace(/\/+$/, "");
    const filter = encodeURIComponent("id") + "=eq." + encodeURIComponent(id.trim()) + "&" + encodeURIComponent("status") + "=eq.published";
    const rest = base + "/rest/v1/onurik_projects?select=title,description,image&" + filter;
    try {
      const res = await fetch(rest, {
        headers: {
          apikey: anonKey,
          Authorization: "Bearer " + anonKey,
          Accept: "application/json",
        },
      });
      if (res.ok) {
        /** @type {unknown} */
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const row = data[0];
          if (row && typeof row === "object") {
            const r = /** @type {{ title?: string; description?: string; image?: string }} */ (row);
            if (r.title && String(r.title).trim()) title = String(r.title).trim();
            if (r.description && String(r.description).trim()) {
              description = truncateMeta(r.description, 200);
            }
            image = absoluteImage(r.image, origin);
          }
        }
      }
    } catch (_e) {
      /* keep defaults */
    }
  }

  const html = buildOgHtml({
    title,
    description,
    image,
    canonicalUrl,
    siteName: DEFAULT_SITE,
  });

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400",
    },
  });
}
