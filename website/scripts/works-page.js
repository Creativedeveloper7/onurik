import {
  compareProjectsByDisplayOrder,
  getCategories,
  getProjectCoverImage,
  getScopeTagOptions,
  loadProjects,
} from "./projects-store.js";
import { fillFolder } from "./project-folders.js";
import { categoryLabel, formatKes } from "../shop/format.js";
import { getCatalog, loadCatalog } from "../shop/products.js";

/** Onurik Wear is the studio's own clothing label: its folder also shows live shop pieces. */
const WEAR_CATEGORY = "Onurik Wear";
let wearProducts = [];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

/** Safe CSS object-position; defaults to center center. */
function imageObjectPosition(project) {
  const raw =
    (project && (project.imagePosition || project.objectPosition || project.focalPoint)) ||
    "center center";
  const value = String(raw).trim();
  if (!value || !/^[a-zA-Z0-9%\s.-]+$/.test(value)) return "center center";
  return value;
}

let allPublished = [];
let activeScopeFilter = "";

function scopeBadges(project) {
  const tags = Array.isArray(project.scopeTags) ? project.scopeTags : [];
  if (!tags.length) return "";
  return (
    '<div class="mt-3 flex flex-wrap gap-1.5 text-cream/80">' +
    tags
      .slice(0, 3)
      .map(function (tag) {
        return (
          '<span class="ob-tag !px-2.5 !py-1 !text-[11px]">' +
          escapeHtml(tag) +
          "</span>"
        );
      })
      .join("") +
    "</div>"
  );
}

function projectCard(project) {
  const position = imageObjectPosition(project);
  return (
    '<a href="/work?id=' +
    encodeURIComponent(project.id) +
    '" class="works-card anim-project-card group relative flex flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.04] text-cream shadow-sticker backdrop-blur" data-scope-tags="' +
    escapeHtml((project.scopeTags || []).join("|")) +
    '">' +
    '<div class="flex items-center gap-3 border-b border-white/10 px-4 py-2.5" aria-hidden="true">' +
    '<span class="ob-chrome"><span></span><span></span><span></span></span>' +
    '<span class="ml-auto truncate font-mono text-[10px] uppercase tracking-[0.14em] text-cream/45">' +
    escapeHtml(project.category || "Project") +
    "</span></div>" +
    '<div class="p-3 pb-0">' +
    '<div class="relative aspect-[16/10] overflow-hidden rounded-[1.1rem] bg-cocoa">' +
    '<img src="' +
    escapeHtml(getProjectCoverImage(project) || "https://placehold.co/1200x750/141415/FF5A1F?text=Project") +
    '" alt="' +
    escapeHtml(project.title) +
    '" loading="lazy" class="anim-project-card__media h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.04]" style="object-position: ' +
    escapeAttr(position) +
    '"/>' +
    '<span class="works-card__view absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-mustard px-3 py-1.5 text-xs font-semibold text-white shadow-glow" aria-hidden="true">View <span class="material-symbols-outlined text-sm">north_east</span></span>' +
    "</div>" +
    "</div>" +
    '<div class="anim-project-card__meta flex min-h-[5.75rem] flex-col justify-center px-5 py-5">' +
    '<h3 class="anim-project-card__title text-[1.55rem] font-semibold leading-tight tracking-tight text-cream md:text-[1.75rem]">' +
    escapeHtml(project.title) +
    "</h3>" +
    scopeBadges(project) +
    "</div>" +
    "</a>"
  );
}

function wearCard(product) {
  const sale = product.originalPrice && product.originalPrice > product.price;
  return (
    '<a href="/shop/product?id=' +
    encodeURIComponent(product.id) +
    '" class="works-card group relative flex flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.04] text-cream shadow-sticker backdrop-blur">' +
    '<div class="flex items-center gap-3 border-b border-white/10 px-4 py-2.5" aria-hidden="true">' +
    '<span class="ob-chrome"><span></span><span></span><span></span></span>' +
    '<span class="ml-auto truncate font-mono text-[10px] uppercase tracking-[0.14em] text-cream/45">Onurik Wear · ' +
    escapeHtml(categoryLabel(product.category)) +
    "</span></div>" +
    '<div class="p-3 pb-0">' +
    '<div class="works-card__plate relative aspect-[16/10] overflow-hidden rounded-[1.1rem]">' +
    (product.images[0]
      ? '<img src="' +
        escapeAttr(product.images[0]) +
        '" alt="' +
        escapeAttr(product.name + " — Onurik Wear " + categoryLabel(product.category).toLowerCase()) +
        '" loading="lazy" class="h-full w-full object-contain p-3 transition duration-700 ease-out group-hover:scale-[1.05]"/>'
      : "") +
    '<span class="works-card__view absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-mustard px-3 py-1.5 text-xs font-semibold text-white shadow-glow" aria-hidden="true">Shop <span class="material-symbols-outlined text-sm">north_east</span></span>' +
    (product.inStock ? "" : '<span class="absolute left-3 top-3 rounded-full bg-cocoa/85 px-3 py-1.5 text-xs font-semibold text-cream">Sold out</span>') +
    "</div>" +
    "</div>" +
    '<div class="flex min-h-[5.75rem] flex-col justify-center px-5 py-5">' +
    '<h3 class="text-[1.55rem] font-semibold leading-tight tracking-tight text-cream md:text-[1.75rem]">' +
    escapeHtml(product.name) +
    "</h3>" +
    '<p class="mt-3 flex items-center gap-2 text-sm"><span class="rounded-full bg-mustard/15 px-3 py-1 font-semibold text-mustard">' +
    formatKes(product.price) +
    "</span>" +
    (sale ? '<span class="text-cream/45 line-through">' + formatKes(product.originalPrice) + "</span>" : "") +
    "</p></div></a>"
  );
}

/** Wear folder: project covers first, topped up with shop photos; count shows projects + pieces. */
function fillWearFolder(folder, wearProjects, products) {
  const cards = folder.querySelector("[data-ob-folder-cards]");
  const covers = wearProjects
    .map(getProjectCoverImage)
    .concat(
      products.map(function (p) {
        return p.images[0];
      }),
    )
    .filter(Boolean)
    .slice(0, 3);
  if (cards && covers.length) {
    const ordered = covers.length === 3 ? [covers[1], covers[0], covers[2]] : covers;
    cards.innerHTML = ordered
      .map(function (src) {
        return (
          '<img class="ob-folder__card" src="' +
          escapeAttr(src) +
          '" alt="" loading="lazy" decoding="async" draggable="false" style="background:#ECEAE7"/>'
        );
      })
      .join("");
  }
  const count = folder.querySelector("[data-ob-folder-count]");
  if (count) {
    const parts = [];
    if (wearProjects.length) parts.push(wearProjects.length + (wearProjects.length === 1 ? " project" : " projects"));
    if (products.length) parts.push(String(products.length).padStart(2, "0") + (products.length === 1 ? " piece" : " pieces"));
    count.textContent = parts.join(" · ") || "Streetwear";
  }
}

function matchesScopeFilter(project) {
  if (!activeScopeFilter) return true;
  const tags = Array.isArray(project.scopeTags) ? project.scopeTags : [];
  return tags.indexOf(activeScopeFilter) !== -1;
}

function renderScopeFilterBar(projects) {
  const root = document.getElementById("works-scope-filter");
  if (!root) return;
  const present = new Set();
  projects.forEach(function (project) {
    (project.scopeTags || []).forEach(function (tag) {
      present.add(tag);
    });
  });
  const options = getScopeTagOptions().filter(function (tag) {
    return present.has(tag);
  });
  Array.from(present).forEach(function (tag) {
    if (options.indexOf(tag) === -1) options.push(tag);
  });

  if (!options.length) {
    root.innerHTML = "";
    root.classList.add("hidden");
    return;
  }
  root.classList.remove("hidden");
  root.innerHTML =
    '<p class="ob-eyebrow mb-4 text-mustard">Filter by scope</p>' +
    '<div class="flex flex-wrap gap-2.5" role="toolbar" aria-label="Filter projects by scope tag">' +
    '<button type="button" data-scope-filter="" class="works-scope-chip rounded-full border px-4 py-2 text-[13px] font-semibold transition duration-300 ' +
    (!activeScopeFilter
      ? "border-transparent bg-mustard text-white shadow-glow"
      : "border-white/15 bg-white/[0.04] text-cream/75 hover:border-mustard/70 hover:text-cream") +
    '">All</button>' +
    options
      .map(function (tag) {
        const active = activeScopeFilter === tag;
        return (
          '<button type="button" data-scope-filter="' +
          escapeHtml(tag) +
          '" class="works-scope-chip rounded-full border px-4 py-2 text-[13px] font-semibold transition duration-300 ' +
          (active
            ? "border-transparent bg-mustard text-white shadow-glow"
            : "border-white/15 bg-white/[0.04] text-cream/75 hover:border-mustard/70 hover:text-cream") +
          '">' +
          escapeHtml(tag) +
          "</button>"
        );
      })
      .join("") +
    "</div>";
}

function renderCategoryGrids() {
  const byCategory = new Map();
  getCategories().forEach(function (category) {
    byCategory.set(category, []);
  });
  allPublished.filter(matchesScopeFilter).forEach(function (project) {
    if (!byCategory.has(project.category)) byCategory.set(project.category, []);
    byCategory.get(project.category).push(project);
  });

  const visible = allPublished.filter(matchesScopeFilter);
  // Shop pieces carry no scope tags, so they show only when no scope filter is active.
  const visibleWear = activeScopeFilter ? [] : wearProducts;
  document.querySelectorAll("[data-ob-folder]").forEach(function (folder) {
    if (folder.hasAttribute("data-wear-folder")) {
      fillWearFolder(folder, byCategory.get(WEAR_CATEGORY) || [], visibleWear);
    } else {
      fillFolder(folder, visible);
    }
  });

  document.querySelectorAll("[data-project-category]").forEach(function (container) {
    const category = container.getAttribute("data-project-category");
    const items = byCategory.get(category) || [];
    if (category === WEAR_CATEGORY) {
      items.sort(compareProjectsByDisplayOrder);
      const html = items.map(projectCard).join("") + visibleWear.map(wearCard).join("");
      container.innerHTML =
        html ||
        '<p class="!flex-[0_0_100%] font-mono text-sm text-cream/60"><span class="mr-2 text-mustard">—</span>' +
          (activeScopeFilter
            ? "No Onurik Wear projects match this scope tag."
            : 'New pieces are on the way — <a class="text-mustard underline underline-offset-4" href="/shop">visit the shop</a>.') +
          "</p>";
      return;
    }
    if (!items.length) {
      container.innerHTML =
        '<p class="!flex-[0_0_100%] font-mono text-sm text-cream/60"><span class="mr-2 text-mustard">—</span>' +
        (activeScopeFilter
          ? "No projects match this scope tag in this category."
          : "No published projects yet in this category.") +
        "</p>";
      return;
    }
    items.sort(compareProjectsByDisplayOrder);
    container.innerHTML = items.map(projectCard).join("");
  });
}

async function loadWear() {
  try {
    await loadCatalog();
    wearProducts = getCatalog().filter(function (product) {
      return product.published !== false && product.images.length;
    });
  } catch {
    wearProducts = [];
  }
}

async function renderWorks() {
  // Shop pieces load alongside projects; whichever arrives later re-renders the folders.
  loadWear().then(function () {
    if (allPublished.length || wearProducts.length) renderCategoryGrids();
  });
  allPublished = (await loadProjects()).filter(function (project) {
    return project.status === "published";
  });
  renderScopeFilterBar(allPublished);
  renderCategoryGrids();
}

document.addEventListener("click", function (event) {
  const button = event.target.closest("[data-scope-filter]");
  if (!button || !button.closest("#works-scope-filter")) return;
  activeScopeFilter = button.getAttribute("data-scope-filter") || "";
  renderScopeFilterBar(allPublished);
  renderCategoryGrids();
});

renderWorks().catch(function () {
  document.querySelectorAll("[data-project-category]").forEach(function (container) {
    container.innerHTML =
      '<p class="!flex-[0_0_100%] font-mono text-sm text-cream/60"><span class="mr-2 text-mustard">—</span>Could not load projects. Try refreshing the page.</p>';
  });
});
