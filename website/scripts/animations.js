/**
 * Onurik global animations — IntersectionObserver, parallax, split text.
 * Safe to load on every page; no-op sections if selectors missing.
 */

const EASE_SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

function prefersReducedMotion() {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function initScrollProgress() {
  if (prefersReducedMotion()) return;
  const bar = document.createElement("div");
  bar.id = "anim-scroll-progress";
  document.body.appendChild(bar);

  function tick() {
    const doc = document.documentElement;
    const scrollTop = window.scrollY || doc.scrollTop;
    const height = doc.scrollHeight - window.innerHeight;
    const p = height > 0 ? scrollTop / height : 0;
    bar.style.transform = `scaleX(${Math.min(1, Math.max(0, p))})`;
  }

  window.addEventListener("scroll", tick, { passive: true });
  tick();
}

/** Split headline words — safe to call again after dynamic HTML injects new headings. */
function finishHeading(heading) {
  if (heading.classList.contains("anim-split-done")) return;
  const text = heading.textContent.trim();
  if (!text) return;
  const words = text.split(/\s+/);
  heading.textContent = "";
  words.forEach((word, wi) => {
    const span = document.createElement("span");
    span.className = "anim-word";
    span.textContent = word + (wi < words.length - 1 ? "\u00A0" : "");
    heading.appendChild(span);
  });
  heading.classList.add("anim-split-done");
  window.requestAnimationFrame(() => {
    heading.querySelectorAll(".anim-word").forEach((w, i) => {
      w.style.transitionDelay = `${0.08 + i * 0.05}s`;
    });
  });
}

let revealObserver = null;

function getRevealObserver() {
  if (prefersReducedMotion()) return null;
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("is-inview");
            revealObserver.unobserve(en.target);
          }
        });
      },
      { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
  }
  return revealObserver;
}

function observeRevealTargets() {
  if (prefersReducedMotion()) {
    document
      .querySelectorAll(".anim-section-reveal, [data-anim-stagger]")
      .forEach((el) => el.classList.add("is-inview"));
    return;
  }

  const io = getRevealObserver();
  if (!io) return;

  document
    .querySelectorAll(
      "main section.anim-section-reveal:not([data-anim-observed]), [data-anim-stagger]:not([data-anim-observed])",
    )
    .forEach((el) => {
      el.setAttribute("data-anim-observed", "");
      io.observe(el);
    });
}

function initSectionReveal() {
  observeRevealTargets();
}

function initMarkSections() {
  const main = document.querySelector("main");
  if (!main) return;

  const sections = main.querySelectorAll(":scope > section");
  sections.forEach((sec, i) => {
    if (sec.id === "conversion-bridge") return;
    if (i === 0) return;
    if (!sec.classList.contains("anim-no-reveal")) {
      sec.classList.add("anim-section-reveal");
    }
  });
}

function initSplitHeadlines() {
  if (prefersReducedMotion()) return;

  function runSplits() {
    document.querySelectorAll('[data-anim-split="words"]').forEach((heading) => {
      finishHeading(heading);
    });
  }

  if (document.documentElement.classList.contains("anim-ready")) {
    runSplits();
    return;
  }

  const obs = new MutationObserver(() => {
    if (document.documentElement.classList.contains("anim-ready")) {
      obs.disconnect();
      requestAnimationFrame(runSplits);
    }
  });
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  window.setTimeout(runSplits, 1100);
}

function initParallax() {
  if (prefersReducedMotion()) return;
  if (!document.querySelector("[data-anim-parallax]")) return;

  let ticking = false;
  function update() {
    ticking = false;
    const vh = window.innerHeight;
    const layers = document.querySelectorAll("[data-anim-parallax]");
    layers.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const strength = Number.parseFloat(
        el.getAttribute("data-anim-parallax") || "0.12",
      );
      const center = rect.top + rect.height / 2;
      const offset = (center - vh / 2) / vh;
      const ty = offset * strength * -80;
      el.style.transform = `translate3d(0, ${ty}px, 0)`;
    });
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  update();
}

function initNavLinkUnderlines() {
  document.querySelectorAll("body > nav.fixed a[href]").forEach((a) => {
    const href = a.getAttribute("href") || "";
    if (href.startsWith("#")) return;
    if (a.closest("#site-nav-drawer")) return;
    a.classList.add("anim-drawline");
  });
}

function initPrimaryButtonsPress() {
  document.querySelectorAll('main a[href].inline-flex, main button[type="submit"]').forEach((el) => {
    el.classList.add("anim-press");
  });
  document
    .querySelectorAll(
      'main a[href*="contact"], main a.border.border-outline, main a[class*="border border"]',
    )
    .forEach((el) => {
      if (el.textContent?.trim().match(/enquire|contact|submit|book/i)) {
        el.classList.add("anim-cta-glow");
      }
    });
}

function initFormGlow() {
  document
    .querySelectorAll(
      'main input:not([type="hidden"]), main textarea, main select',
    )
    .forEach((el) => el.classList.add("anim-glow"));
}

function initSameOriginViewTransitions() {
  if (prefersReducedMotion()) return;
  if (typeof document.startViewTransition !== "function") return;

  document.addEventListener(
    "click",
    (e) => {
      const a = e.target.closest?.("a[href]");
      if (!a) return;
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target === "_blank") return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (/^(mailto:|tel:|javascript:)/i.test(href)) return;

      let url;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      )
        return;

      e.preventDefault();
      document.startViewTransition(() => {
        window.location.assign(url.href);
      });
    },
    true,
  );
}

/** Call after injecting markup (e.g. work detail) so sections, stagger, split text, and parallax pick up new nodes. */
function onurikAnimRefresh() {
  initMarkSections();
  observeRevealTargets();
  if (!prefersReducedMotion()) {
    document
      .querySelectorAll('[data-anim-split="words"]:not(.anim-split-done)')
      .forEach((h) => finishHeading(h));
  }
}

function boot() {
  document.documentElement.classList.add("anim-ready");
  initScrollProgress();
  initMarkSections();
  initSplitHeadlines();
  initSectionReveal();
  initParallax();
  initNavLinkUnderlines();
  initPrimaryButtonsPress();
  initFormGlow();
  initSameOriginViewTransitions();
  window.__onurikAnimRefresh = onurikAnimRefresh;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
