import { compareProjectsByDisplayOrder, getCategories, loadProjects } from "./projects-store.js";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function projectCard(project) {
  return (
    '<a href="work.html?id=' +
    encodeURIComponent(project.id) +
    '" class="anim-project-card group relative block aspect-[4/3] overflow-hidden rounded-xl bg-surface-container-highest">' +
    '<img src="' +
    escapeHtml(project.image || "https://placehold.co/1200x900/131313/e5e2e1?text=Project") +
    '" alt="' +
    escapeHtml(project.title) +
    '" class="anim-project-card__media h-full w-full object-cover opacity-80"/>' +
    '<div class="anim-project-card__scrim absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent" aria-hidden="true"></div>' +
    '<div class="absolute inset-0 flex flex-col justify-end p-6">' +
    '<span class="mb-2 font-label-caps text-label-caps uppercase tracking-widest text-secondary">' +
    escapeHtml(project.category) +
    "</span>" +
    '<h3 class="anim-project-card__title font-headline-md text-[24px] text-primary">' +
    escapeHtml(project.title) +
    "</h3>" +
    "</div>" +
    "</a>"
  );
}

async function renderWorks() {
  const projects = (await loadProjects()).filter(function (project) {
    return project.status === "published";
  });
  const byCategory = new Map();
  getCategories().forEach(function (category) {
    byCategory.set(category, []);
  });
  projects.forEach(function (project) {
    if (!byCategory.has(project.category)) byCategory.set(project.category, []);
    byCategory.get(project.category).push(project);
  });

  document.querySelectorAll("[data-project-category]").forEach(function (container) {
    const category = container.getAttribute("data-project-category");
    const items = byCategory.get(category) || [];
    if (!items.length) {
      container.innerHTML = '<p class="col-span-full text-on-surface-variant">No published projects yet in this category.</p>';
      return;
    }
    items.sort(compareProjectsByDisplayOrder);
    container.innerHTML = items.map(projectCard).join("");
  });
}

renderWorks().catch(function () {
  document.querySelectorAll("[data-project-category]").forEach(function (container) {
    container.innerHTML =
      '<p class="col-span-full text-on-surface-variant">Could not load projects. Try refreshing the page.</p>';
  });
});
