import {
  compareProjectsByDisplayOrder,
  loadProjects,
  normalizeProjectImages,
} from "./projects-store.js";
import {
  ONURIK_SITE,
  applyWorkSocialPreview,
  applyWorkSocialPreviewFallback,
  setJsonLd,
  setRobots,
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
        '" class="group relative block h-full w-full cursor-zoom-in overflow-hidden text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-mustard">' +
        '<img src="' +
        escapeHtml(src) +
        '" alt="' +
        escapeHtml(alt) +
        '" class="pointer-events-none h-full w-full object-cover transition duration-500 group-hover:opacity-95" draggable="false"/>' +
        '<span class="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/15 bg-ink/60 px-3 py-1.5 text-xs font-semibold text-cream opacity-0 backdrop-blur transition group-hover:opacity-100" aria-hidden="true">⤢ Zoom</span>' +
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
            '" class="h-2.5 w-2.5 rounded-full transition ' +
            (index === 0 ? "bg-mustard" : "bg-cream/40 hover:bg-cream") +
            '"></button>'
          );
        })
        .join("") +
      "</div>"
    : "";

  const controls = multi
    ? '<button type="button" data-slider-prev class="absolute left-3 top-1/2 z-10 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-ink/50 text-cream backdrop-blur transition hover:border-transparent hover:bg-mustard hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-mustard" aria-label="Previous image">' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.75" class="h-5 w-5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>' +
      "</button>" +
      '<button type="button" data-slider-next class="absolute right-3 top-1/2 z-10 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-ink/50 text-cream backdrop-blur transition hover:border-transparent hover:bg-mustard hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-mustard" aria-label="Next image">' +
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
      dot.classList.toggle("bg-cream/40", !active);
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
    setRobots("noindex, follow");
    document.getElementById("work-detail-root").innerHTML =
      '<div class="ob-bg-tomato ob-grain relative min-h-[70vh]"><div class="absolute inset-0 ob-lines" aria-hidden="true"></div><div class="relative mx-auto max-w-[1440px] px-5 py-28 sm:px-8 md:px-12"><p class="ob-eyebrow text-mustard">Works</p><h1 class="ob-display mt-4 text-[clamp(3rem,9vw,7rem)] text-cream" data-ob-chars="pop">Missing project link</h1><p class="ob-marker mt-4 text-2xl text-cream/60">Open a project from the Works page.</p><a href="/works" class="ob-btn ob-btn--cream mt-10"><span class="material-symbols-outlined" aria-hidden="true">arrow_back</span> Back to Works</a></div></div>';
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
    setRobots("noindex, follow");
    document.getElementById("work-detail-root").innerHTML =
      '<div class="ob-bg-tomato ob-grain relative min-h-[70vh]"><div class="absolute inset-0 ob-lines" aria-hidden="true"></div><div class="relative mx-auto max-w-[1440px] px-5 py-28 sm:px-8 md:px-12"><p class="ob-eyebrow text-mustard">Works</p><h1 class="ob-display mt-4 text-[clamp(3rem,9vw,7rem)] text-cream" data-ob-chars="pop">Project not found</h1><a href="/works" class="ob-btn ob-btn--cream mt-10"><span class="material-symbols-outlined" aria-hidden="true">arrow_back</span> Back to Works</a></div></div>';
    window.__onurikAnimRefresh?.();
    return;
  }

  // One clean URL per project, whatever query or .html variant the visitor arrived on.
  const projectUrl = ONURIK_SITE + "/work?id=" + encodeURIComponent(current.id);
  const category = (current.category || "").trim();
  const summary =
    (current.description || "").trim() ||
    (current.challenge || "").trim() ||
    (current.result || "").trim() ||
    "Case study by Onurik, a branding, web design and product studio in Nairobi, Kenya.";
  const coverImage = projectImages(current)[0];
  applyWorkSocialPreview({
    title: current.title,
    documentTitle: current.title + (category ? " — " + category + " Case Study" : " — Case Study") + " | Onurik",
    description: summary,
    imageUrl: coverImage,
    canonicalUrl: projectUrl,
    siteName: "Onurik",
  });
  setJsonLd("ld-work", {
    "@graph": [
      {
        "@type": "CreativeWork",
        "@id": projectUrl + "#work",
        url: projectUrl,
        name: current.title,
        headline: current.title,
        description: summary,
        image: coverImage ? new URL(coverImage, ONURIK_SITE).href : undefined,
        genre: category || undefined,
        keywords:
          []
            .concat(current.scopeTags || [], current.tags || [])
            .filter(Boolean)
            .join(", ") || undefined,
        sourceOrganization: current.client ? { "@type": "Organization", name: current.client } : undefined,
        creator: { "@id": ONURIK_SITE + "/#organization" },
        isPartOf: { "@id": ONURIK_SITE + "/works#page" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: ONURIK_SITE + "/" },
          { "@type": "ListItem", position: 2, name: "Works", item: ONURIK_SITE + "/works" },
          { "@type": "ListItem", position: 3, name: current.title, item: projectUrl },
        ],
      },
    ],
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

  function caseCard(step, label, inner) {
    return (
      '<article class="ob-flow__step case-step ob-sticker text-cream" data-ob-reveal>' +
      '<div class="case-step__chrome" aria-hidden="true"><span class="ob-chrome"><span></span><span></span><span></span></span><span class="case-step__bar"></span></div>' +
      '<div class="case-step__body">' +
      '<p class="ob-step-label">Step ' +
      String(step).padStart(2, "0") +
      "</p>" +
      '<h2 class="mt-3 text-[1.9rem] font-semibold leading-tight tracking-tight">' +
      label +
      "</h2>" +
      inner +
      "</div></article>"
    );
  }

  const caseCards = [];
  if (challenge) {
    caseCards.push(
      caseCard(
        caseCards.length + 1,
        "The challenge",
        '<p class="mt-4 text-base leading-relaxed text-cream/65">' + escapeHtml(challenge) + "</p>"
      )
    );
  }
  if (approach.length) {
    caseCards.push(
      caseCard(
        caseCards.length + 1,
        "What I did",
        '<ul class="mt-5 grid gap-2.5">' +
          approach
            .map(function (item, i) {
              return '<li class="ob-option' + (i === 0 ? " is-on" : "") + '">' + escapeHtml(item) + "</li>";
            })
            .join("") +
          "</ul>"
      )
    );
  }
  if (result) {
    caseCards.push(
      caseCard(
        caseCards.length + 1,
        "The result",
        '<p class="mt-4 text-base leading-relaxed text-cream/65">' + escapeHtml(result) + "</p>"
      )
    );
  }

  document.getElementById("work-detail-root").innerHTML =
    '<section class="ob-bg-tomato ob-grain relative overflow-hidden">' +
    '<div class="absolute inset-0 ob-lines" aria-hidden="true"></div>' +
    '<div class="relative mx-auto max-w-[1440px] px-5 pb-24 pt-12 sm:px-8 md:px-12">' +
    '<div class="flex flex-wrap items-center justify-between gap-4">' +
    '<a href="/works" class="ob-search-pill text-cream/80 transition hover:border-mustard hover:text-cream"><span class="material-symbols-outlined text-lg" aria-hidden="true">arrow_back</span> Back to works</a>' +
    '<div class="ob-chrome" aria-hidden="true"><span></span><span></span><span></span></div>' +
    "</div>" +
    '<p class="ob-eyebrow mt-12 text-mustard">' +
    escapeHtml(current.category) +
    (client ? '<span class="text-cream/50"> · </span>' + escapeHtml(client) : "") +
    "</p>" +
    '<h1 class="work-title ob-display mt-4 max-w-[18ch] text-cream" data-ob-chars="pop wave">' +
    escapeHtml(current.title) +
    "</h1>" +
    (scopeTags.length
      ? '<div class="mt-8 flex flex-wrap gap-3">' +
        scopeTags
          .map(function (tag) {
            return '<span class="ob-tag text-cream">' + escapeHtml(tag) + "</span>";
          })
          .join("") +
        "</div>"
      : "") +
    (!challenge && !approach.length && !result && current.description
      ? '<p class="mt-8 max-w-3xl text-lg leading-relaxed text-cream/65">' +
        escapeHtml(current.description) +
        "</p>"
      : "") +
    "</div>" +
    "</section>" +
    '<section class="ob-bg-cocoa ob-grain ob-torn-top relative">' +
    '<div class="relative mx-auto max-w-[1440px] px-5 py-20 sm:px-8 md:px-12">' +
    '<div class="overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#141415] shadow-sticker-lg">' +
    '<div class="flex items-center gap-3 border-b border-white/10 px-4 py-3">' +
    '<span class="ob-chrome" aria-hidden="true"><span></span><span></span><span></span></span>' +
    '<span class="h-2 flex-1 rounded-full bg-white/[0.06]" aria-hidden="true"></span>' +
    '<span class="ob-eyebrow text-cream/45">gallery</span>' +
    "</div>" +
    renderProjectGallery(current) +
    "</div>" +
    (caseCards.length
      ? '<p class="ob-eyebrow mt-20 text-mustard">Case study</p>' +
        '<div class="work-case ob-flow mt-8" data-ob-flow aria-label="Case study">' +
        caseCards.join("") +
        "</div>"
      : "") +
    (techTags.length
      ? '<div class="mt-12 flex flex-wrap gap-2">' +
        techTags
          .map(function (tag) {
            return (
              '<span class="ob-tag text-cream/85">' +
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
      : '<span class="ob-tag text-cream"><span aria-hidden="true">🔒</span> Access restricted</span>') +
    '<button id="share-project-btn" type="button" class="ob-btn ob-btn--ghost text-cream"><span aria-hidden="true">↗</span> Share</button>' +
    "</div>" +
    "</div>" +
    "</section>" +
    '<section class="ob-bg-ink ob-grain ob-torn-top relative">' +
    '<div class="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 md:px-12">' +
    '<p class="ob-eyebrow text-mustard">Keep exploring</p>' +
    '<h2 class="ob-display mt-4 text-[clamp(2.4rem,5vw,4rem)] text-cream" data-ob-chars="pop">Related works</h2>' +
    (related.length
      ? '<div class="mt-12 ob-carousel text-cream" data-ob-carousel aria-label="Related works" style="--ob-slide:80%; --ob-slide-md:45%; --ob-slide-lg:30%">' +
        '<div class="ob-carousel__track">'
      : '<div class="mt-12">') +
    (related.length
      ? related
          .map(function (item) {
            return (
              '<a href="/work?id=' +
              encodeURIComponent(item.id) +
              '" class="work-related-card group block overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-3 text-cream shadow-sticker">' +
              '<div class="overflow-hidden rounded-[1.1rem] bg-cocoa">' +
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
              '<div class="px-2 pb-2 pt-4"><p class="ob-eyebrow text-mustard">' +
              escapeHtml(item.category) +
              '</p><h3 class="mt-2 text-2xl font-semibold leading-tight tracking-tight text-cream">' +
              escapeHtml(item.title) +
              "</h3></div></a>"
            );
          })
          .join("")
      : '<p class="ob-marker text-2xl text-cream/55">No related works yet.</p>') +
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
      "absolute left-0 top-[calc(100%+0.75rem)] z-20 hidden min-w-[220px] rounded-2xl border border-white/15 bg-[#141415]/90 p-2 text-cream shadow-sticker-lg backdrop-blur-xl";
    menu.innerHTML =
      '<button data-share="whatsapp" class="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-cream transition hover:bg-mustard hover:text-white">WhatsApp <span aria-hidden="true">↗</span></button>' +
      '<button data-share="x" class="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-cream transition hover:bg-mustard hover:text-white">X (Twitter) <span aria-hidden="true">↗</span></button>' +
      '<button data-share="linkedin" class="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-cream transition hover:bg-mustard hover:text-white">LinkedIn <span aria-hidden="true">↗</span></button>' +
      '<button data-share="facebook" class="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-cream transition hover:bg-mustard hover:text-white">Facebook <span aria-hidden="true">↗</span></button>' +
      '<button data-share="email" class="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-cream transition hover:bg-mustard hover:text-white">Email <span aria-hidden="true">↗</span></button>' +
      '<button data-share="copy" class="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-cream transition hover:bg-mustard hover:text-white">Copy Link <span aria-hidden="true">⧉</span></button>';

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
      setRobots("noindex, follow");
      const root = document.getElementById("work-detail-root");
      if (root) {
        root.innerHTML =
          '<div class="ob-bg-tomato ob-grain relative min-h-[70vh]"><div class="absolute inset-0 ob-lines" aria-hidden="true"></div><div class="relative mx-auto max-w-[1440px] px-5 py-28 sm:px-8 md:px-12"><p class="ob-eyebrow text-mustard">Works</p><h1 class="ob-display mt-4 text-[clamp(3rem,9vw,7rem)] text-cream" data-ob-chars="pop">Could not load project</h1><p class="ob-marker mt-4 text-2xl text-cream/60">Try refreshing the page.</p></div></div>';
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
        '<div class="ob-bg-tomato ob-grain relative min-h-[70vh]"><div class="absolute inset-0 ob-lines" aria-hidden="true"></div><div class="relative mx-auto max-w-[1440px] px-5 py-28 sm:px-8 md:px-12"><p class="ob-eyebrow text-mustard">Works</p><h1 class="ob-display mt-4 text-[clamp(3rem,9vw,7rem)] text-cream" data-ob-chars="pop">Could not load project</h1><p class="ob-marker mt-4 text-2xl text-cream/60">Try refreshing the page.</p></div></div>';
    }
  });
}
