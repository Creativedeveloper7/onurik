import { getSupabaseBrowser, supabaseConfigured } from "./supabase-browser.js";

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Scroll distance per second; duration is derived from strip width so speed stays consistent. */
const MARQUEE_PX_PER_SEC = 48;

function prefersReducedMotion() {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function applyMarqueeLoopTiming(track) {
  if (!track || prefersReducedMotion()) return;
  const firstStrip = track.firstElementChild;
  if (!(firstStrip instanceof HTMLElement)) return;

  const halfWidth = firstStrip.scrollWidth;
  if (halfWidth <= 0) return;

  let sec = halfWidth / MARQUEE_PX_PER_SEC;
  sec = Math.max(22, Math.min(95, sec));

  track.style.animation = `trusted-marquee-scroll ${sec}s linear infinite`;
}

function bindMarqueeTiming(track) {
  const run = () => applyMarqueeLoopTiming(track);

  run();
  requestAnimationFrame(() => requestAnimationFrame(run));

  const ro = new ResizeObserver(run);
  ro.observe(track);
  const first = track.firstElementChild;
  if (first instanceof HTMLElement) ro.observe(first);

  window.addEventListener("resize", run, { passive: true });
}

function renderMarquee(brands) {
  const root = document.getElementById("trusted-brands-marquee-root");
  if (!root) return;

  if (!brands.length) {
    root.innerHTML =
      '<p class="px-8 text-center text-sm text-neutral-500 md:px-16">Collaborator logos appear here once you add them in Admin → Brands.</p>';
    return;
  }

  const items = brands
    .filter((b) => b.logo_url)
    .map((b) => {
      const alt = escapeHtml(b.name || "Partner");
      const src = escapeHtml(b.logo_url);
      return `<div class="flex shrink-0 items-center justify-center px-3 py-1.5 md:px-5">
        <img src="${src}" alt="${alt}" class="max-h-[120px] w-auto max-w-[min(420px,84vw)] object-contain md:max-h-36" loading="lazy" decoding="async"/>
      </div>`;
    })
    .join("");

  if (!items.trim()) {
    root.innerHTML =
      '<p class="px-8 text-center text-sm text-neutral-500 md:px-16">Upload logo images in Admin → Brands.</p>';
    return;
  }

  if (prefersReducedMotion()) {
    root.innerHTML = `
<div class="overflow-hidden">
  <div class="flex flex-wrap items-center justify-center gap-x-[2.25rem] gap-y-6 px-4 md:px-8">${items}</div>
</div>`;
    return;
  }

  root.innerHTML = `
<div class="overflow-hidden">
  <div class="trusted-marquee-track flex w-max will-change-transform">
    <div class="flex items-center gap-[2.25rem] md:gap-[3.75rem] lg:gap-[4.5rem]">${items}</div>
    <div class="flex items-center gap-[2.25rem] md:gap-[3.75rem] lg:gap-[4.5rem]" aria-hidden="true">${items}</div>
  </div>
</div>`;

  const track = root.querySelector(".trusted-marquee-track");
  if (track instanceof HTMLElement) bindMarqueeTiming(track);
}

(async function init() {
  const root = document.getElementById("trusted-brands-marquee-root");
  if (!root) return;

  if (!supabaseConfigured()) {
    root.innerHTML =
      '<p class="px-8 text-center text-sm text-neutral-500 md:px-16">Configure Supabase URL and anon key to show collaborator logos.</p>';
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
    console.error("[onurik] brands marquee", error);
    root.innerHTML = `<p class="px-8 text-center text-sm text-neutral-600 md:px-16">Could not load brands (${escapeHtml(error.message)}).</p>`;
    return;
  }

  renderMarquee(Array.isArray(data) ? data : []);
})();
