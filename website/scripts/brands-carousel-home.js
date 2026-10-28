import { getSupabaseBrowser, supabaseConfigured } from "./supabase-browser.js";

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderGrid(brands) {
  const root = document.getElementById("trusted-brands-grid-root");
  if (!root) return;

  const items = (Array.isArray(brands) ? brands : [])
    .filter(function (b) {
      return b && b.logo_url;
    })
    .map(function (b) {
      const alt = escapeHtml(b.name || "Partner");
      const src = escapeHtml(b.logo_url);
      return (
        "<li>" +
        '<figure class="brand-tile">' +
        '<img src="' +
        src +
        '" alt="' +
        alt +
        '" loading="lazy" decoding="async"/>' +
        "</figure></li>"
      );
    })
    .join("");

  if (!items) {
    root.innerHTML =
      '<p class="brands-trust__empty">Collaborator logos appear here once you add them in Admin → Brands.</p>';
    return;
  }

  root.innerHTML =
    '<div class="ob-carousel text-cream" data-ob-carousel data-ob-carousel-auto="3200" aria-label="Client logos"' +
    ' style="--ob-slide:42%; --ob-slide-md:23%; --ob-slide-lg:15.5%; --ob-gap:1.25rem">' +
    '<ul class="ob-carousel__track brand-tile-track">' +
    items +
    "</ul></div>";
}

(async function init() {
  const root = document.getElementById("trusted-brands-grid-root");
  if (!root) return;

  if (!supabaseConfigured()) {
    root.innerHTML =
      '<p class="brands-trust__empty">Configure Supabase URL and anon key to show collaborator logos.</p>';
    return;
  }

  const sb = getSupabaseBrowser();
  if (!sb) return;

  const { data, error } = await sb
    .from("onurik_brands")
    .select("id,name,logo_url,sort_order")
    .eq("visible", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[onurik] brands grid", error);
    root.innerHTML =
      '<p class="brands-trust__empty">Could not load brands (' +
      escapeHtml(error.message) +
      ").</p>";
    return;
  }

  renderGrid(data);
})();
