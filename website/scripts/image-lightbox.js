/**
 * Accessible image lightbox for project detail pages.
 * Vanilla DOM — open/close without navigation; preserves scroll position.
 */

const FADE_MS = 200;
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let overlay = null;
let dialog = null;
let closeBtn = null;
let imgEl = null;
let lastFocus = null;
let closing = false;
let keyHandler = null;
let previouslyHidden = [];

function ensureLightbox() {
  if (overlay) return;

  overlay = document.createElement("div");
  overlay.id = "image-lightbox";
  overlay.className =
    "fixed inset-0 z-[10050] flex items-center justify-center bg-black/80 p-4 opacity-0 transition-opacity duration-200 ease-out";
  overlay.setAttribute("hidden", "");
  overlay.setAttribute("aria-hidden", "true");

  dialog = document.createElement("div");
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", "Enlarged project image");
  dialog.className =
    "relative flex max-h-[90vh] max-w-[90vw] items-center justify-center outline-none";
  dialog.tabIndex = -1;

  closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Close image");
  closeBtn.className =
    "fixed z-[10051] inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-white/90 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50";
  closeBtn.style.cssText =
    "top:max(0.75rem,env(safe-area-inset-top));right:max(0.75rem,env(safe-area-inset-right));";
  closeBtn.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="h-6 w-6" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>';

  imgEl = document.createElement("img");
  imgEl.className =
    "max-h-[90vh] max-w-[90vw] object-contain select-none rounded-sm shadow-2xl";
  imgEl.alt = "";
  imgEl.draggable = false;

  dialog.appendChild(imgEl);
  overlay.appendChild(dialog);
  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay);

  closeBtn.addEventListener("click", function (event) {
    event.stopPropagation();
    closeImageLightbox();
  });

  overlay.addEventListener("click", function (event) {
    if (event.target === overlay) closeImageLightbox();
  });

  dialog.addEventListener("click", function (event) {
    event.stopPropagation();
  });
}

function getFocusable() {
  if (!overlay) return [];
  return Array.from(overlay.querySelectorAll(FOCUSABLE)).filter(function (el) {
    return el.offsetParent !== null || el === closeBtn;
  });
}

function trapFocus(event) {
  if (event.key !== "Tab" || !overlay || overlay.hasAttribute("hidden")) return;
  const focusable = getFocusable();
  if (!focusable.length) {
    event.preventDefault();
    dialog.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey) {
    if (document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
  } else if (document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function hideBackgroundFromAssistiveTech(hide) {
  const root = document.getElementById("work-detail-root");
  const nav = document.querySelector("body > nav");
  const targets = [root, nav].filter(Boolean);
  if (hide) {
    previouslyHidden = [];
    targets.forEach(function (el) {
      previouslyHidden.push({ el: el, ariaHidden: el.getAttribute("aria-hidden") });
      el.setAttribute("aria-hidden", "true");
    });
  } else {
    previouslyHidden.forEach(function (entry) {
      if (entry.ariaHidden == null) entry.el.removeAttribute("aria-hidden");
      else entry.el.setAttribute("aria-hidden", entry.ariaHidden);
    });
    previouslyHidden = [];
  }
}

/**
 * @param {{ src: string; alt?: string }} opts
 */
export function openImageLightbox(opts) {
  const src = opts && opts.src;
  if (!src) return;
  ensureLightbox();
  if (closing) return;

  lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  imgEl.src = src;
  imgEl.alt = opts.alt || "";

  overlay.removeAttribute("hidden");
  overlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  hideBackgroundFromAssistiveTech(true);

  // Force reflow so opacity transition runs
  void overlay.offsetWidth;
  overlay.classList.remove("opacity-0");
  overlay.classList.add("opacity-100");

  keyHandler = function (event) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeImageLightbox();
      return;
    }
    trapFocus(event);
  };
  document.addEventListener("keydown", keyHandler);

  window.requestAnimationFrame(function () {
    closeBtn.focus();
  });
}

export function closeImageLightbox() {
  if (!overlay || overlay.hasAttribute("hidden") || closing) return;
  closing = true;

  overlay.classList.remove("opacity-100");
  overlay.classList.add("opacity-0");

  window.setTimeout(function () {
    overlay.setAttribute("hidden", "");
    overlay.setAttribute("aria-hidden", "true");
    imgEl.removeAttribute("src");
    imgEl.alt = "";
    document.body.style.overflow = "";
    hideBackgroundFromAssistiveTech(false);

    if (keyHandler) {
      document.removeEventListener("keydown", keyHandler);
      keyHandler = null;
    }

    if (lastFocus && typeof lastFocus.focus === "function") {
      lastFocus.focus();
    }
    lastFocus = null;
    closing = false;
  }, FADE_MS);
}

/**
 * Bind click-to-expand on elements marked with [data-lightbox-src] inside root.
 * @param {ParentNode} root
 */
export function bindImageLightbox(root) {
  if (!root) return;
  root.querySelectorAll("[data-lightbox-src]").forEach(function (trigger) {
    if (trigger.dataset.lightboxBound === "1") return;
    trigger.dataset.lightboxBound = "1";
    trigger.addEventListener("click", function () {
      openImageLightbox({
        src: trigger.getAttribute("data-lightbox-src") || "",
        alt: trigger.getAttribute("data-lightbox-alt") || "",
      });
    });
  });
}
