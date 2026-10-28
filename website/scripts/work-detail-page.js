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
  const fallback = "https://placehold.co/1400x800/2A1B0E/F2A516?text=Project";
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
        '" class="group relative block h-full w-full cursor-zoom-in overflow-hidden text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-sun">' +
        '<img src="' +
        escapeHtml(src) +
        '" alt="' +
        escapeHtml(alt) +
        '" class="pointer-events-none h-full w-full object-cover transition duration-500 group-hover:opacity-95" draggable="false"/>' +
        '<span class="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1 rounded-md border-2 border-ink bg-mustard px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-cocoa opacity-0 transition group-hover:opacity-100" aria-hidden="true">⤢ Zoom</span>' +
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
            '" class="h-3 w-3 rounded-full border-2 border-ink transition ' +
            (index === 0 ? "bg-mustard" : "bg-cream/70 hover:bg-cream") +
            '"></button>'
          );
        })
        .join("") +
      "</div>"
    : "";

  const controls = multi
    ? '<button type="button" data-slider-prev class="absolute left-3 top-1/2 z-10 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full border-[2.5px] border-ink bg-mustard text-cocoa shadow-[3px_3px_0_#160E07] transition hover:-rotate-12 hover:bg-sun focus:outline-none focus-visible:ring-4 focus-visible:ring-sun" aria-label="Previous image">' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.75" class="h-5 w-5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>' +
      "</button>" +
      '<button type="button" data-slider-next class="absolute right-3 top-1/2 z-10 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full border-[2.5px] border-ink bg-mustard text-cocoa shadow-[3px_3px_0_#160E07] transition hover:-rotate-12 hover:bg-sun focus:outline-none focus-visible:ring-4 focus-visible:ring-sun" aria-label="Next image">' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.75" class="h-5 w-5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>' +
      "</button>"
    : "";

  return (
    '<div class="project-slider relative h-[56vh] min-h-[18rem] w-full overflow-hidden bg-cocoa" data-project-slider' +
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
      dot.classList.toggle("bg-mustard", active);
      dot.classList.toggle("bg-cream/70", !active);
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
      '<div class="ob-bg-tomato ob-grain relative min-h-[70vh]"><div class="absolute inset-0 ob-lines" aria-hidden="true"></div><div class="relative mx-auto max-w-[1440px] px-5 py-28 sm:px-8 md:px-12"><p class="ob-eyebrow text-mustard">○○○ Works</p><h1 class="ob-display mt-4 text-[clamp(3rem,9vw,7rem)] text-cream" data-ob-chars="jumble pop">Missing project link</h1><p class="ob-marker mt-4 text-2xl text-butter -rotate-1">Open a project from the Works page.</p><a href="/works" class="ob-btn ob-btn--cream mt-10"><span class="material-symbols-outlined" aria-hidden="true">arrow_back</span> Back to Works</a></div></div>';
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
      '<div class="ob-bg-tomato ob-grain relative min-h-[70vh]"><div class="absolute inset-0 ob-lines" aria-hidden="true"></div><div class="relative mx-auto max-w-[1440px] px-5 py-28 sm:px-8 md:px-12"><p class="ob-eyebrow text-mustard">○○○ Works</p><h1 class="ob-display mt-4 text-[clamp(3rem,9vw,7rem)] text-cream" data-ob-chars="jumble pop">Project not found</h1><a href="/works" class="ob-btn ob-btn--cream mt-10"><span class="material-symbols-outlined" aria-hidden="true">arrow_back</span> Back to Works</a></div></div>';
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
    .slice(0, 8);

  const scopeTags = Array.isArray(current.scopeTags) ? current.scopeTags.filter(Boolean) : [];
  const approach = Array.isArray(current.approach) ? current.approach.filter(Boolean) : [];
  const challenge = (current.challenge || "").trim();
  const result = (current.result || "").trim();
  const client = (current.client || "").trim();
  const techTags = Array.isArray(current.tags) ? current.tags.filter(Boolean) : [];

  function caseCard(label, inner, tone, tilt) {
    return (
      '<div class="ob-sticker ' +
      tone +
      ' p-6 md:p-7" style="transform: rotate(' +
      tilt +
      ')" data-ob-reveal>' +
      '<h2 class="font-display text-3xl uppercase leading-none">' +
      label +
      "</h2>" +
      inner +
      "</div>"
    );
  }

  const caseCards = [];
  if (challenge) {
    caseCards.push(
      caseCard(
        "The Challenge",
        '<p class="mt-4 text-base leading-relaxed opacity-90">' + escapeHtml(challenge) + "</p>",
        "ob-bg-cream",
        "-1deg"
      )
    );
  }
  if (approach.length) {
    caseCards.push(
      caseCard(
        "What I Did",
        '<ul class="mt-4 space-y-2.5 text-base leading-relaxed">' +
          approach
            .map(function (item) {
              return (
                '<li class="flex gap-3"><span class="shrink-0 text-tomato" aria-hidden="true">✶</span><span>' +
                escapeHtml(item) +
                "</span></li>"
              );
            })
            .join("") +
          "</ul>",
        "ob-bg-mustard",
        "1deg"
      )
    );
  }
  if (result) {
    caseCards.push(
      caseCard(
        "The Result",
        '<p class="mt-4 text-base leading-relaxed opacity-90">' + escapeHtml(result) + "</p>",
        "ob-bg-tomato",
        "-0.6deg"
      )
    );
  }

  document.getElementById("work-detail-root").innerHTML =
    '<section class="ob-bg-tomato ob-grain relative overflow-hidden">' +
    '<div class="absolute inset-0 ob-lines" aria-hidden="true"></div>' +
    '<div class="relative mx-auto max-w-[1440px] px-5 pb-24 pt-12 sm:px-8 md:px-12">' +
    '<div class="flex flex-wrap items-center justify-between gap-4">' +
    '<a href="/works" class="ob-search-pill text-mustard transition hover:-rotate-2 hover:text-sun"><span class="material-symbols-outlined text-lg" aria-hidden="true">arrow_back</span> Back to works</a>' +
    '<div class="ob-chrome text-mustard" aria-hidden="true"><span>×</span><span>−</span><span>↻</span></div>' +
    "</div>" +
    '<p class="ob-eyebrow mt-12 text-mustard">○○○ ' +
    escapeHtml(current.category) +
    (client ? '<span class="text-cream/50"> · </span>' + escapeHtml(client) : "") +
    "</p>" +
    '<h1 class="work-title font-display mt-4 max-w-[16ch] uppercase leading-[0.9] text-cream ob-shadow-text" style="--ob-shadow-color:#A8121A" data-ob-chars="jumble pop" data-ob-amp="0.8">' +
    escapeHtml(current.title) +
    "</h1>" +
    (scopeTags.length
      ? '<div class="mt-8 flex flex-wrap gap-3">' +
        scopeTags
          .map(function (tag) {
            return '<span class="ob-tag" data-ob-float>' + escapeHtml(tag) + "</span>";
          })
          .join("") +
        "</div>"
      : "") +
    (!challenge && !approach.length && !result && current.description
      ? '<p class="font-mono mt-8 max-w-3xl text-sm leading-relaxed text-cream/90 md:text-base">' +
        escapeHtml(current.description) +
        "</p>"
      : "") +
    "</div>" +
    "</section>" +
    '<section class="ob-bg-cocoa ob-grain ob-torn-top relative">' +
    '<div class="relative mx-auto max-w-[1440px] px-5 py-20 sm:px-8 md:px-12">' +
    '<div class="ob-sticker overflow-hidden bg-cocoa" style="--ob-hover-tilt:0deg">' +
    '<div class="flex items-center justify-between border-b-[2.5px] border-ink bg-mustard px-4 py-2 text-cocoa">' +
    '<span class="ob-chrome" aria-hidden="true"><span>×</span><span>−</span><span>↻</span></span>' +
    '<span class="ob-eyebrow">gallery</span>' +
    "</div>" +
    renderProjectGallery(current) +
    "</div>" +
    (caseCards.length
      ? '<div class="mt-16 ob-carousel text-cream" data-ob-carousel aria-label="Case study" style="--ob-slide:88%; --ob-slide-md:58%; --ob-slide-lg:40%">' +
        '<div class="ob-carousel__track">' +
        caseCards.join("") +
        "</div></div>"
      : "") +
    (techTags.length
      ? '<div class="mt-12 flex flex-wrap gap-2">' +
        techTags
          .map(function (tag) {
            return (
              '<span class="rounded-md border-2 border-mustard/60 px-3 py-1 font-mono text-xs font-bold uppercase tracking-[0.08em] text-mustard">' +
              escapeHtml(tag) +
              "</span>"
            );
          })
          .join("") +
        "</div>"
      : "") +
    '<div class="mt-12 flex flex-wrap items-center gap-4">' +
    (current.privacy === "public" && current.projectUrl
      ? '<a href="' +
        escapeHtml(current.projectUrl) +
        '" target="_blank" rel="noreferrer" class="ob-stamp ob-stamp--mustard"><span class="ob-stamp__disc"><span class="material-symbols-outlined" aria-hidden="true">play_arrow</span></span><span class="ob-stamp__shout">Click<br/>here!</span><span class="ob-stamp__caption">Open the project</span></a>'
      : '<span class="ob-tag !bg-cream"><span aria-hidden="true">🔒</span> Access Restricted</span>') +
    '<button id="share-project-btn" type="button" class="ob-btn ob-btn--cream"><span aria-hidden="true">↗</span> Share</button>' +
    "</div>" +
    "</div>" +
    "</section>" +
    '<section class="ob-bg-mustard ob-grain ob-torn-top relative">' +
    '<div class="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 md:px-12">' +
    '<h2 class="font-display text-[clamp(2.6rem,6vw,4.5rem)] uppercase leading-none text-cocoa" data-ob-chars="jumble pop">Related Works</h2>' +
    (related.length
      ? '<div class="mt-12 ob-carousel text-cocoa" data-ob-carousel aria-label="Related works" style="--ob-car-accent:#D8202A; --ob-slide:80%; --ob-slide-md:45%; --ob-slide-lg:30%">' +
        '<div class="ob-carousel__track">'
      : '<div class="mt-12">') +
    (related.length
      ? related
          .map(function (item) {
            return (
              '<a href="/work?id=' +
              encodeURIComponent(item.id) +
              '" class="work-related-card ob-polaroid group block" style="--ob-tilt:0deg">' +
              '<div class="overflow-hidden bg-cocoa">' +
              '<img src="' +
              escapeHtml(
                normalizeProjectImages(item)[0] ||
                  item.image ||
                  "https://placehold.co/900x600/2A1B0E/F2A516?text=Project"
              ) +
              '" alt="' +
              escapeHtml(item.title) +
              '" loading="lazy" class="h-52 w-full object-cover transition duration-700 group-hover:scale-105"/>' +
              "</div>" +
              '<p class="mt-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-tomato">' +
              escapeHtml(item.category) +
              '</p><h3 class="font-display text-2xl uppercase leading-none text-cocoa">' +
              escapeHtml(item.title) +
              "</h3></a>"
            );
          })
          .join("")
      : '<p class="ob-marker text-2xl text-cocoa/75 -rotate-1">No related works yet.</p>') +
    (related.length ? "</div></div>" : "</div>") +
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
      "absolute left-0 top-[calc(100%+0.75rem)] z-20 hidden min-w-[220px] rounded-xl border-[2.5px] border-ink bg-paper p-2 text-cocoa shadow-[6px_6px_0_#160E07]";
    menu.innerHTML =
      '<button data-share="whatsapp" class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-bold text-cocoa hover:bg-mustard">WhatsApp <span aria-hidden="true">↗</span></button>' +
      '<button data-share="x" class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-bold text-cocoa hover:bg-mustard">X (Twitter) <span aria-hidden="true">↗</span></button>' +
      '<button data-share="linkedin" class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-bold text-cocoa hover:bg-mustard">LinkedIn <span aria-hidden="true">↗</span></button>' +
      '<button data-share="facebook" class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-bold text-cocoa hover:bg-mustard">Facebook <span aria-hidden="true">↗</span></button>' +
      '<button data-share="email" class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-bold text-cocoa hover:bg-mustard">Email <span aria-hidden="true">↗</span></button>' +
      '<button data-share="copy" class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-bold text-cocoa hover:bg-mustard">Copy Link <span aria-hidden="true">⧉</span></button>';

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
          '<div class="ob-bg-tomato ob-grain relative min-h-[70vh]"><div class="absolute inset-0 ob-lines" aria-hidden="true"></div><div class="relative mx-auto max-w-[1440px] px-5 py-28 sm:px-8 md:px-12"><p class="ob-eyebrow text-mustard">○○○ Works</p><h1 class="ob-display mt-4 text-[clamp(3rem,9vw,7rem)] text-cream" data-ob-chars="jumble pop">Could not load project</h1><p class="ob-marker mt-4 text-2xl text-butter -rotate-1">Try refreshing the page.</p></div></div>';
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
        '<div class="ob-bg-tomato ob-grain relative min-h-[70vh]"><div class="absolute inset-0 ob-lines" aria-hidden="true"></div><div class="relative mx-auto max-w-[1440px] px-5 py-28 sm:px-8 md:px-12"><p class="ob-eyebrow text-mustard">○○○ Works</p><h1 class="ob-display mt-4 text-[clamp(3rem,9vw,7rem)] text-cream" data-ob-chars="jumble pop">Could not load project</h1><p class="ob-marker mt-4 text-2xl text-butter -rotate-1">Try refreshing the page.</p></div></div>';
    }
  });
}
