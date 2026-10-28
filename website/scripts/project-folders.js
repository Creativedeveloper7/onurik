/**
 * Glass file folders filled with real project covers.
 *
 *   <a class="ob-folder" data-ob-folder="*|Category name">
 *     … <span class="ob-folder__cards" data-ob-folder-cards></span> …
 *     <span class="ob-folder__meta" data-ob-folder-count></span>
 *   </a>
 *
 * fillFolder(el, projects) shows the first three covers fanned out of the folder and the
 * project count. initFolders() loads published projects and fills every folder on the page.
 */
import { compareProjectsByDisplayOrder, getProjectCoverImage, loadProjects } from "./projects-store.js";

function escapeAttr(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
}

export function fillFolder(el, projects) {
  const key = el.getAttribute("data-ob-folder") || "*";
  const list = projects
    .filter(function (p) {
      return key === "*" || p.category === key;
    })
    .slice()
    .sort(compareProjectsByDisplayOrder);

  const cards = el.querySelector("[data-ob-folder-cards]");
  if (cards) {
    const covers = list
      .map(function (p) {
        return { src: getProjectCoverImage(p), title: p.title };
      })
      .filter(function (c) {
        return c.src;
      })
      .slice(0, 3);
    // Middle card is the most prominent, so put the first project there.
    const ordered = covers.length === 3 ? [covers[1], covers[0], covers[2]] : covers;
    cards.innerHTML = ordered
      .map(function (c) {
        return (
          '<img class="ob-folder__card" src="' +
          escapeAttr(c.src) +
          '" alt="" loading="lazy" decoding="async" draggable="false"/>'
        );
      })
      .join("");
  }

  const count = el.querySelector("[data-ob-folder-count]");
  if (count) {
    count.textContent =
      String(list.length).padStart(2, "0") + (list.length === 1 ? " project" : " projects");
  }
  return list.length;
}

export async function initFolders() {
  const folders = document.querySelectorAll("[data-ob-folder]");
  if (!folders.length) return;
  try {
    const projects = (await loadProjects()).filter(function (p) {
      return p.status === "published";
    });
    folders.forEach(function (el) {
      fillFolder(el, projects);
    });
  } catch {
    /* Folders keep their placeholder cards if projects can't load. */
  }
}
