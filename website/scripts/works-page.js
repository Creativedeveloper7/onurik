import {
  compareProjectsByDisplayOrder,
  getCategories,
  getProjectCoverImage,
  getScopeTagOptions,
  loadProjects,
} from "./projects-store.js";

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
    '<div class="mt-3 flex flex-wrap gap-1.5">' +
    tags
      .slice(0, 3)
      .map(function (tag) {
        return (
          '<span class="rounded-md border-2 border-ink bg-mustard px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-cocoa">' +
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
    '" class="works-card anim-project-card group relative flex flex-col rounded-2xl border-[2.5px] border-ink bg-cream text-cocoa shadow-[6px_6px_0_#160E07]" data-scope-tags="' +
    escapeHtml((project.scopeTags || []).join("|")) +
    '">' +
    '<div class="flex items-center justify-between border-b-[2.5px] border-ink px-3 py-1.5" aria-hidden="true">' +
    '<span class="ob-chrome scale-75 origin-left"><span>×</span><span>−</span><span>↻</span></span>' +
    '<span class="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-cocoa/70">' +
    escapeHtml(project.category || "Project") +
    "</span></div>" +
    '<div class="p-3 pb-0">' +
    '<div class="relative aspect-[16/10] overflow-hidden rounded-lg border-2 border-ink bg-cocoa">' +
    '<img src="' +
    escapeHtml(getProjectCoverImage(project) || "https://placehold.co/1200x750/2A1B0E/F2A516?text=Project") +
    '" alt="' +
    escapeHtml(project.title) +
    '" loading="lazy" class="anim-project-card__media h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.04]" style="object-position: ' +
    escapeAttr(position) +
    '"/>' +
    "</div>" +
    "</div>" +
    '<div class="anim-project-card__meta flex min-h-[5.75rem] flex-col justify-center px-4 py-4 md:px-5 md:py-5">' +
    '<h3 class="anim-project-card__title font-display text-[1.9rem] uppercase leading-[0.95] text-cocoa md:text-[2.3rem]">' +
    escapeHtml(project.title) +
    "</h3>" +
    scopeBadges(project) +
    "</div>" +
    '<span class="works-card__stamp ob-stamp ob-stamp--red pointer-events-none absolute -bottom-5 right-4 !gap-2 !py-1.5 !pl-1.5 !pr-3" aria-hidden="true">' +
    '<span class="ob-stamp__disc !h-8 !w-8"><span class="material-symbols-outlined text-lg">play_arrow</span></span>' +
    '<span class="ob-stamp__shout !border-0 !pr-0 !text-xl">View</span>' +
    "</span>" +
    "</a>"
  );
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
    '<button type="button" data-scope-filter="" class="works-scope-chip rounded-lg border-2 px-3.5 py-1.5 text-[12px] font-bold transition duration-300 hover:-rotate-2 ' +
    (!activeScopeFilter
      ? "border-ink bg-mustard text-cocoa shadow-[3px_3px_0_#160E07] -rotate-2"
      : "border-mustard/50 text-cream/80 hover:border-mustard hover:text-mustard") +
    '">All</button>' +
    options
      .map(function (tag) {
        const active = activeScopeFilter === tag;
        return (
          '<button type="button" data-scope-filter="' +
          escapeHtml(tag) +
          '" class="works-scope-chip rounded-lg border-2 px-3.5 py-1.5 text-[12px] font-bold transition duration-300 hover:-rotate-2 ' +
          (active
            ? "border-ink bg-mustard text-cocoa shadow-[3px_3px_0_#160E07] -rotate-2"
            : "border-mustard/50 text-cream/80 hover:border-mustard hover:text-mustard") +
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

  document.querySelectorAll("[data-project-category]").forEach(function (container) {
    const category = container.getAttribute("data-project-category");
    const items = byCategory.get(category) || [];
    if (!items.length) {
      container.innerHTML =
        '<p class="col-span-full font-mono text-sm text-cream/60"><span class="ob-marker mr-2 text-lg text-mustard">psst —</span>' +
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

async function renderWorks() {
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
      '<p class="col-span-full font-mono text-sm text-cream/60"><span class="ob-marker mr-2 text-lg text-tomato">oops —</span>Could not load projects. Try refreshing the page.</p>';
  });
});
