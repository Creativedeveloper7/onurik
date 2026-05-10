import { loadProjects } from "./projects-store.js";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const params = new URLSearchParams(window.location.search);
const id = params.get("id");

async function runWorkDetail() {
  const projects = (await loadProjects()).filter(function (project) {
    return project.status === "published";
  });
  const current = projects.find(function (project) {
    return project.id === id;
  });

  if (!current) {
    document.getElementById("work-detail-root").innerHTML =
      '<div class="mx-auto max-w-[1440px] px-8 py-24 md:px-16"><h1 class="font-montserrat text-3xl text-white">Project not found</h1><a href="works.html" class="mt-6 inline-flex border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/80 hover:text-white">Back to Works</a></div>';
    window.__onurikAnimRefresh?.();
    return;
  }

  const related = projects
    .filter(function (item) {
      return item.id !== current.id && item.category === current.category;
    })
    .slice(0, 3);

  document.getElementById("work-detail-root").innerHTML =
    '<section class="mx-auto max-w-[1440px] px-8 pb-20 pt-32 md:px-16">' +
    '<a href="works.html" class="mb-8 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/60 hover:text-white"><span aria-hidden="true">←</span> Back to works</a>' +
    '<img src="' +
    escapeHtml(current.image || "https://placehold.co/1400x800/131313/e5e2e1?text=Project") +
    '" alt="' +
    escapeHtml(current.title) +
    '" class="mb-10 h-[52vh] w-full rounded-xl object-cover"/>' +
    '<p class="mb-3 font-montserrat text-[11px] uppercase tracking-[0.22em] text-white/60">' +
    escapeHtml(current.category) +
    "</p>" +
    '<h1 class="font-noto-serif mb-6 text-4xl text-white md:text-6xl" data-anim-split="words">' +
    escapeHtml(current.title) +
    "</h1>" +
    '<div class="mb-6 flex flex-wrap gap-2">' +
    current.tags
      .map(function (tag) {
        return '<span class="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80">' + escapeHtml(tag) + "</span>";
      })
      .join("") +
    "</div>" +
    '<p class="max-w-3xl text-base leading-relaxed text-white/75 md:text-lg">' +
    escapeHtml(current.description) +
    "</p>" +
    '<div class="mt-8 flex flex-wrap items-center gap-3">' +
    (current.privacy === "public" && current.projectUrl
      ? '<a href="' +
        escapeHtml(current.projectUrl) +
        '" target="_blank" rel="noreferrer" class="inline-flex rounded-full border border-white/30 px-6 py-3 text-xs uppercase tracking-[0.2em] text-white transition hover:-translate-y-0.5 hover:bg-white hover:text-black">Open project</a>'
      : '<span class="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-xs uppercase tracking-[0.2em] text-white/60"><span aria-hidden="true">🔒</span> Access Restricted</span>') +
    '<button id="share-project-btn" type="button" class="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-3 text-xs uppercase tracking-[0.2em] text-white transition hover:-translate-y-0.5 hover:bg-white hover:text-black"><span aria-hidden="true">↗</span> Share</button>' +
    "</div>" +
    "</section>" +
    '<section class="mx-auto max-w-[1440px] border-t border-white/10 px-8 py-16 md:px-16">' +
    '<h2 class="mb-8 font-montserrat text-2xl text-white">Related Works</h2>' +
    '<div class="grid grid-cols-1 gap-8 md:grid-cols-3">' +
    (related.length
      ? related
          .map(function (item) {
            return (
              '<a href="work.html?id=' +
              encodeURIComponent(item.id) +
              '" class="group block overflow-hidden rounded-xl bg-[#1c1b1b]">' +
              '<img src="' +
              escapeHtml(item.image || "https://placehold.co/900x600/131313/e5e2e1?text=Project") +
              '" alt="' +
              escapeHtml(item.title) +
              '" class="h-52 w-full object-cover opacity-80 transition duration-700 group-hover:scale-105 group-hover:opacity-100"/>' +
              '<div class="p-5"><p class="mb-2 text-[10px] uppercase tracking-[0.2em] text-white/50">' +
              escapeHtml(item.category) +
              '</p><h3 class="font-montserrat text-lg text-white">' +
              escapeHtml(item.title) +
              "</h3></div></a>"
            );
          })
          .join("")
      : '<p class="text-white/60">No related works yet.</p>') +
    "</div></section>";

  const shareButton = document.getElementById("share-project-btn");
  if (shareButton) {
    const shareUrl = encodeURIComponent(window.location.href);
    const shareText = encodeURIComponent(current.title + " · " + current.description);
    const rawUrl = window.location.href;
    const menu = document.createElement("div");
    menu.className =
      "absolute right-0 top-[calc(100%+0.5rem)] z-20 hidden min-w-[220px] rounded-lg border border-white/20 bg-[#1c1b1b] p-2 shadow-xl";
    menu.innerHTML =
      '<button data-share="whatsapp" class="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm text-white/85 hover:bg-white/10">WhatsApp <span aria-hidden="true">↗</span></button>' +
      '<button data-share="x" class="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm text-white/85 hover:bg-white/10">X (Twitter) <span aria-hidden="true">↗</span></button>' +
      '<button data-share="linkedin" class="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm text-white/85 hover:bg-white/10">LinkedIn <span aria-hidden="true">↗</span></button>' +
      '<button data-share="facebook" class="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm text-white/85 hover:bg-white/10">Facebook <span aria-hidden="true">↗</span></button>' +
      '<button data-share="email" class="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm text-white/85 hover:bg-white/10">Email <span aria-hidden="true">↗</span></button>' +
      '<button data-share="copy" class="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm text-white/85 hover:bg-white/10">Copy Link <span aria-hidden="true">⧉</span></button>';

    const wrapper = shareButton.parentElement;
    if (wrapper) {
      wrapper.classList.add("relative");
      wrapper.appendChild(menu);
    }

    function closeMenu() {
      menu.classList.add("hidden");
    }

    shareButton.addEventListener("click", function () {
      menu.classList.toggle("hidden");
    });

    menu.addEventListener("click", async function (event) {
      const item = event.target.closest("button[data-share]");
      if (!item) return;
      const action = item.getAttribute("data-share");
      let target = "";
      if (action === "whatsapp") target = "https://wa.me/?text=" + encodeURIComponent(current.title + " " + rawUrl);
      if (action === "x") target = "https://twitter.com/intent/tweet?text=" + shareText + "&url=" + shareUrl;
      if (action === "linkedin") target = "https://www.linkedin.com/sharing/share-offsite/?url=" + shareUrl;
      if (action === "facebook") target = "https://www.facebook.com/sharer/sharer.php?u=" + shareUrl;
      if (action === "email") target = "mailto:?subject=" + encodeURIComponent(current.title + " · Onurik") + "&body=" + encodeURIComponent(current.description + "\n\n" + rawUrl);
      if (action === "copy") {
        try {
          await navigator.clipboard.writeText(rawUrl);
          shareButton.textContent = "Link Copied";
          window.setTimeout(function () {
            shareButton.innerHTML = '<span aria-hidden="true">↗</span> Share';
          }, 1400);
        } catch (_err) {
          shareButton.textContent = "Copy Failed";
          window.setTimeout(function () {
            shareButton.innerHTML = '<span aria-hidden="true">↗</span> Share';
          }, 1400);
        }
        closeMenu();
        return;
      }
      if (target) window.open(target, "_blank", "noopener,noreferrer");
      closeMenu();
    });

    document.addEventListener("click", function (event) {
      if (!menu.contains(event.target) && event.target !== shareButton && !shareButton.contains(event.target)) {
        closeMenu();
      }
    });
  }

  window.__onurikAnimRefresh?.();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () {
    runWorkDetail().catch(function () {
      const root = document.getElementById("work-detail-root");
      if (root) {
        root.innerHTML =
          '<div class="mx-auto max-w-[1440px] px-8 py-24 md:px-16"><h1 class="font-montserrat text-3xl text-white">Could not load project</h1><p class="mt-4 text-white/60">Try refreshing the page.</p></div>';
      }
    });
  });
} else {
  runWorkDetail().catch(function () {
    const root = document.getElementById("work-detail-root");
    if (root) {
      root.innerHTML =
        '<div class="mx-auto max-w-[1440px] px-8 py-24 md:px-16"><h1 class="font-montserrat text-3xl text-white">Could not load project</h1><p class="mt-4 text-white/60">Try refreshing the page.</p></div>';
    }
  });
}
