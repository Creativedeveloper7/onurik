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
          '<span class="rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white/55">' +
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
    '<a href="work.html?id=' +
    encodeURIComponent(project.id) +
    '" class="anim-project-card group flex flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-surface-container-low transition duration-200 ease-out hover:-translate-y-0.5 hover:border-white/10 hover:shadow-[0_18px_40px_rgba(0,0,0,0.35)]" data-scope-tags="' +
    escapeHtml((project.scopeTags || []).join("|")) +
    '">' +
    '<div class="p-3 pb-0 md:p-4 md:pb-0">' +
    '<div class="relative aspect-[16/10] overflow-hidden rounded-lg bg-[#111111]">' +
    '<img src="' +
    escapeHtml(getProjectCoverImage(project) || "https://placehold.co/1200x750/111111/e5e2e1?text=Project") +
    '" alt="' +
    escapeHtml(project.title) +
    '" class="anim-project-card__media h-full w-full object-cover transition duration-200 ease-out group-hover:scale-[1.025]" style="object-position: ' +
    escapeAttr(position) +
    '"/>' +
    '<div class="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/35 to-transparent" aria-hidden="true"></div>' +
    "</div>" +
    "</div>" +
    '<div class="anim-project-card__meta flex min-h-[5.25rem] flex-col justify-center px-4 py-4 md:min-h-[5.75rem] md:px-5 md:py-5">' +
    '<h3 class="anim-project-card__title font-montserrat text-lg font-medium leading-snug tracking-[-0.01em] text-white md:text-xl">' +
    escapeHtml(project.title) +
    "</h3>" +
    scopeBadges(project) +
    "</div>" +
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
    '<p class="mb-3 font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">Filter by scope</p>' +
    '<div class="flex flex-wrap gap-2" role="toolbar" aria-label="Filter projects by scope tag">' +
    '<button type="button" data-scope-filter="" class="works-scope-chip rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] transition ' +
    (!activeScopeFilter
      ? "border-white bg-white text-black"
      : "border-white/25 text-white/70 hover:border-white/50 hover:text-white") +
    '">All</button>' +
    options
      .map(function (tag) {
        const active = activeScopeFilter === tag;
        return (
          '<button type="button" data-scope-filter="' +
          escapeHtml(tag) +
          '" class="works-scope-chip rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] transition ' +
          (active
            ? "border-white bg-white text-black"
            : "border-white/25 text-white/70 hover:border-white/50 hover:text-white") +
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
        '<p class="col-span-full text-on-surface-variant">' +
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
      '<p class="col-span-full text-on-surface-variant">Could not load projects. Try refreshing the page.</p>';
  });
});
