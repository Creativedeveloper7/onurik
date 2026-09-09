import {
  compareProjectsByDisplayOrder,
  loadProjects,
  normalizeProjectImages,
} from "./projects-store.js";
import {
  applyWorkSocialPreview,
  applyWorkSocialPreviewFallback,
} from "./social-meta.js";
import { bindImageLightbox } from "./image-lightbox.js";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function projectImages(project) {
  const fallback = "https://placehold.co/1400x800/131313/e5e2e1?text=Project";
  const images = normalizeProjectImages(project);
  return images.length ? images : [fallback];
}

function renderProjectGallery(project) {
  const images = projectImages(project);
  const altBase = project.title || "Project image";
  const multi = images.length > 1;

  const slides = images
    .map(function (src, index) {
      const alt = multi ? altBase + " — image " + (index + 1) : altBase;
      return (
        '<div class="project-slider__slide absolute inset-0 transition-opacity duration-300 ease-out' +
        (index === 0 ? " opacity-100" : " opacity-0 pointer-events-none") +
        '" data-slide-index="' +
        index +
        '" aria-hidden="' +
        (index === 0 ? "false" : "true") +
        '">' +
        '<button type="button" data-lightbox-src="' +
        escapeHtml(src) +
        '" data-lightbox-alt="' +
        escapeHtml(alt) +
        '" aria-label="Enlarge image: ' +
        escapeHtml(alt) +
        '" class="group relative block h-full w-full cursor-zoom-in overflow-hidden text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50">' +
        '<img src="' +
        escapeHtml(src) +
        '" alt="' +
        escapeHtml(alt) +
        '" class="pointer-events-none h-full w-full object-cover transition duration-500 group-hover:opacity-95" draggable="false"/>' +
        '<span class="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/10" aria-hidden="true"></span>' +
        "</button></div>"
      );
    })
    .join("");

  const dots = multi
    ? '<div class="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2" role="tablist" aria-label="Project images">' +
      images
        .map(function (_src, index) {
          return (
            '<button type="button" data-slider-dot="' +
            index +
            '" role="tab" aria-selected="' +
            (index === 0 ? "true" : "false") +
            '" aria-label="Show image ' +
            (index + 1) +
            '" class="h-2.5 w-2.5 rounded-full border border-white/50 transition ' +
            (index === 0 ? "bg-white" : "bg-white/25 hover:bg-white/50") +
            '"></button>'
          );
        })
        .join("") +
      "</div>"
    : "";

  const controls = multi
    ? '<button type="button" data-slider-prev class="absolute left-3 top-1/2 z-10 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50" aria-label="Previous image">' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="h-5 w-5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>' +
      "</button>" +
      '<button type="button" data-slider-next class="absolute right-3 top-1/2 z-10 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50" aria-label="Next image">' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="h-5 w-5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>' +
      "</button>"
    : "";

  return (
    '<div class="project-slider mb-10 relative h-[52vh] w-full overflow-hidden rounded-xl bg-[#1c1b1b]" data-project-slider' +
    (multi ? ' data-loop="true"' : "") +
    ' aria-roledescription="carousel" aria-label="' +
    escapeHtml(altBase) +
    ' gallery">' +
    '<div class="project-slider__track relative h-full w-full">' +
    slides +
    "</div>" +
    controls +
    dots +
    (multi
      ? '<p class="sr-only" aria-live="polite" data-slider-status>Image 1 of ' +
        images.length +
        "</p>"
      : "") +
    "</div>"
  );
}

function bindProjectSlider(root) {
  const slider = root && root.querySelector("[data-project-slider]");
  if (!slider) return;
  const slides = Array.from(slider.querySelectorAll("[data-slide-index]"));
  if (slides.length < 2) return;

  let index = 0;
  const status = slider.querySelector("[data-slider-status]");
  const dots = Array.from(slider.querySelectorAll("[data-slider-dot]"));
  let touchStartX = null;

  function goTo(next) {
    const total = slides.length;
    index = ((next % total) + total) % total;
    slides.forEach(function (slide, i) {
      const active = i === index;
      slide.classList.toggle("opacity-100", active);
      slide.classList.toggle("opacity-0", !active);
      slide.classList.toggle("pointer-events-none", !active);
      slide.setAttribute("aria-hidden", active ? "false" : "true");
    });
    dots.forEach(function (dot, i) {
      const active = i === index;
      dot.setAttribute("aria-selected", active ? "true" : "false");
      dot.classList.toggle("bg-white", active);
      dot.classList.toggle("bg-white/25", !active);
    });
    if (status) status.textContent = "Image " + (index + 1) + " of " + total;
  }

  const prev = slider.querySelector("[data-slider-prev]");
  const next = slider.querySelector("[data-slider-next]");
  if (prev) {
    prev.addEventListener("click", function (event) {
      event.preventDefault();
      goTo(index - 1);
    });
  }
  if (next) {
    next.addEventListener("click", function (event) {
      event.preventDefault();
      goTo(index + 1);
    });
  }
  dots.forEach(function (dot) {
    dot.addEventListener("click", function () {
      const i = Number(dot.getAttribute("data-slider-dot"));
      if (!Number.isNaN(i)) goTo(i);
    });
  });

  slider.addEventListener(
    "touchstart",
    function (event) {
      const touch = event.changedTouches && event.changedTouches[0];
      touchStartX = touch ? touch.clientX : null;
    },
    { passive: true }
  );
  slider.addEventListener(
    "touchend",
    function (event) {
      if (touchStartX == null) return;
      const touch = event.changedTouches && event.changedTouches[0];
      if (!touch) return;
      const delta = touch.clientX - touchStartX;
      touchStartX = null;
      if (Math.abs(delta) < 40) return;
      if (delta < 0) goTo(index + 1);
      else goTo(index - 1);
    },
    { passive: true }
  );

  slider.addEventListener("keydown", function (event) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(index + 1);
    }
  });
  if (!slider.hasAttribute("tabindex")) slider.tabIndex = 0;
}

const params = new URLSearchParams(window.location.search);
const id = params.get("id");

async function runWorkDetail() {
  const canonicalUrl = window.location.href.split("#")[0];

  if (!id || !String(id).trim()) {
    applyWorkSocialPreviewFallback({
      canonicalUrl,
      title: "Work | Onurik",
      description: "Browse published engineering and design projects on Onurik.",
    });
    document.getElementById("work-detail-root").innerHTML =
      '<div class="mx-auto max-w-[1440px] px-8 py-24 md:px-16"><h1 class="font-montserrat text-3xl text-white">Missing project link</h1><p class="mt-4 text-white/60">Open a project from the Works page.</p><a href="works.html" class="mt-6 inline-flex border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/80 hover:text-white">Back to Works</a></div>';
    window.__onurikAnimRefresh?.();
    return;
  }

  const projects = (await loadProjects()).filter(function (project) {
    return project.status === "published";
  });
  const current = projects.find(function (project) {
    return project.id === id;
  });

  if (!current) {
    applyWorkSocialPreviewFallback({
      canonicalUrl,
      title: "Project not found",
      description:
        "This project is unavailable or not published. Browse more work on Onurik.",
    });
    document.getElementById("work-detail-root").innerHTML =
      '<div class="mx-auto max-w-[1440px] px-8 py-24 md:px-16"><h1 class="font-montserrat text-3xl text-white">Project not found</h1><a href="works.html" class="mt-6 inline-flex border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/80 hover:text-white">Back to Works</a></div>';
    window.__onurikAnimRefresh?.();
    return;
  }

  applyWorkSocialPreview({
    title: current.title,
    description: current.description,
    imageUrl: projectImages(current)[0],
    canonicalUrl,
    siteName: "Onurik",
  });

  const related = projects
    .filter(function (item) {
      return item.id !== current.id && item.category === current.category;
    })
    .sort(compareProjectsByDisplayOrder)
    .slice(0, 3);

  const scopeTags = Array.isArray(current.scopeTags) ? current.scopeTags.filter(Boolean) : [];
  const approach = Array.isArray(current.approach) ? current.approach.filter(Boolean) : [];
  const challenge = (current.challenge || "").trim();
  const result = (current.result || "").trim();
  const client = (current.client || "").trim();
  const techTags = Array.isArray(current.tags) ? current.tags.filter(Boolean) : [];

  document.getElementById("work-detail-root").innerHTML =
    '<section class="mx-auto max-w-[1440px] px-8 pb-20 pt-32 md:px-16">' +
    '<a href="works.html" class="mb-8 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/60 hover:text-white"><span aria-hidden="true">←</span> Back to works</a>' +
    '<p class="mb-3 font-montserrat text-[11px] uppercase tracking-[0.22em] text-white/60">' +
    escapeHtml(current.category) +
    (client ? '<span class="text-white/30"> · </span>' + escapeHtml(client) : "") +
    "</p>" +
    '<h1 class="mb-6 font-montserrat text-4xl font-medium text-white md:text-6xl" data-anim-split="words">' +
    escapeHtml(current.title) +
    "</h1>" +
    (scopeTags.length
      ? '<div class="mb-8 flex flex-wrap gap-2">' +
        scopeTags
          .map(function (tag) {
            return (
              '<span class="rounded-full border border-white/25 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-white/85">' +
              escapeHtml(tag) +
              "</span>"
            );
          })
          .join("") +
        "</div>"
      : "") +
    (challenge
      ? '<div class="mb-10 max-w-3xl">' +
        '<h2 class="mb-3 font-montserrat text-sm uppercase tracking-[0.2em] text-white/55">The Challenge</h2>' +
        '<p class="text-base leading-relaxed text-white/80 md:text-lg">' +
        escapeHtml(challenge) +
        "</p></div>"
      : "") +
    (approach.length
      ? '<div class="mb-10 max-w-3xl">' +
        '<h2 class="mb-4 font-montserrat text-sm uppercase tracking-[0.2em] text-white/55">What I Did</h2>' +
        '<ul class="space-y-3 text-base leading-relaxed text-white/80 md:text-lg">' +
        approach
          .map(function (item) {
            return (
              '<li class="flex gap-3"><span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/55" aria-hidden="true"></span><span>' +
              escapeHtml(item) +
              "</span></li>"
            );
          })
          .join("") +
        "</ul></div>"
      : "") +
    (result
      ? '<div class="mb-10 max-w-3xl">' +
        '<h2 class="mb-3 font-montserrat text-sm uppercase tracking-[0.2em] text-white/55">The Result</h2>' +
        '<p class="text-base leading-relaxed text-white/80 md:text-lg">' +
        escapeHtml(result) +
        "</p></div>"
      : "") +
    (!challenge && !approach.length && !result && current.description
      ? '<p class="mb-10 max-w-3xl text-base leading-relaxed text-white/75 md:text-lg">' +
        escapeHtml(current.description) +
        "</p>"
      : "") +
    renderProjectGallery(current) +
    (techTags.length
      ? '<div class="mb-8 flex flex-wrap gap-2">' +
        techTags
          .map(function (tag) {
            return (
              '<span class="rounded-full border border-white/15 px-3 py-1 text-xs text-white/65">' +
              escapeHtml(tag) +
              "</span>"
            );
          })
          .join("") +
        "</div>"
      : "") +
    '<div class="mt-2 flex flex-wrap items-center gap-3">' +
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
              escapeHtml(
                normalizeProjectImages(item)[0] ||
                  item.image ||
                  "https://placehold.co/900x600/131313/e5e2e1?text=Project"
              ) +
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

  bindImageLightbox(document.getElementById("work-detail-root"));
  bindProjectSlider(document.getElementById("work-detail-root"));

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
      applyWorkSocialPreviewFallback({
        canonicalUrl: window.location.href.split("#")[0],
        title: "Could not load project",
        description: "The project list could not be loaded. Try again shortly.",
      });
      const root = document.getElementById("work-detail-root");
      if (root) {
        root.innerHTML =
          '<div class="mx-auto max-w-[1440px] px-8 py-24 md:px-16"><h1 class="font-montserrat text-3xl text-white">Could not load project</h1><p class="mt-4 text-white/60">Try refreshing the page.</p></div>';
      }
    });
  });
} else {
  runWorkDetail().catch(function () {
    applyWorkSocialPreviewFallback({
      canonicalUrl: window.location.href.split("#")[0],
      title: "Could not load project",
      description: "The project list could not be loaded. Try again shortly.",
    });
    const root = document.getElementById("work-detail-root");
    if (root) {
      root.innerHTML =
        '<div class="mx-auto max-w-[1440px] px-8 py-24 md:px-16"><h1 class="font-montserrat text-3xl text-white">Could not load project</h1><p class="mt-4 text-white/60">Try refreshing the page.</p></div>';
    }
  });
}
