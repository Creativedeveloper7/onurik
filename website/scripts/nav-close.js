/**
 * Site-wide CTA close/back navigation.
 * - On CTA clicks to contact / works / about / work: store return URL (incl. hash)
 * - On those destination pages: show a fixed close control that returns to the prior page/section
 */

const RETURN_KEY = "onurik:nav-return";
const DEST_RE = /^(contact|works|about|work)\.html$/i;

function pageFile(pathname) {
  const part = String(pathname || "").split("/").pop() || "index.html";
  return part || "index.html";
}

function currentReturnUrl() {
  return location.pathname + location.search + location.hash;
}

function saveReturnUrl() {
  try {
    sessionStorage.setItem(RETURN_KEY, currentReturnUrl());
  } catch {
    /* private mode / blocked storage */
  }
}

function readReturnUrl() {
  try {
    return sessionStorage.getItem(RETURN_KEY);
  } catch {
    return null;
  }
}

function clearReturnUrl() {
  try {
    sessionStorage.removeItem(RETURN_KEY);
  } catch {
    /* ignore */
  }
}

function sameOriginReferrer() {
  if (!document.referrer) return null;
  try {
    const ref = new URL(document.referrer);
    if (ref.origin !== location.origin) return null;
    return ref.pathname + ref.search + ref.hash;
  } catch {
    return null;
  }
}

function resolveHref(anchor) {
  try {
    return new URL(anchor.getAttribute("href"), location.href);
  } catch {
    return null;
  }
}

/** Capture leave-to-destination so Close can restore page + section. */
function bindCtaCapture() {
  document.addEventListener(
    "click",
    function (event) {
      const anchor = event.target.closest("a[href]");
      if (!anchor || event.defaultPrevented) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const url = resolveHref(anchor);
      if (!url || url.origin !== location.origin) return;

      const dest = pageFile(url.pathname);
      const current = pageFile(location.pathname);
      if (!DEST_RE.test(dest)) return;
      if (dest === current && url.hash === location.hash) return;

      saveReturnUrl();
    },
    true
  );
}

function fallbackHome() {
  const base = location.pathname.includes("/")
    ? location.pathname.replace(/[^/]+$/, "index.html")
    : "index.html";
  return base.endsWith("index.html") ? base : "index.html";
}

function goBack() {
  const stored = readReturnUrl();
  const referrer = sameOriginReferrer();

  /* Prefer browser history when we know we came from this site */
  if (referrer && window.history.length > 1) {
    clearReturnUrl();
    history.back();
    return;
  }

  if (stored && stored !== currentReturnUrl()) {
    clearReturnUrl();
    location.assign(stored);
    return;
  }

  if (referrer && referrer !== currentReturnUrl()) {
    location.assign(referrer);
    return;
  }

  location.assign(fallbackHome());
}

function injectStyles() {
  if (document.getElementById("onurik-nav-close-styles")) return;
  const style = document.createElement("style");
  style.id = "onurik-nav-close-styles";
  style.textContent = `
    .onurik-nav-close {
      position: fixed;
      top: calc(4.25rem + 0.85rem);
      right: 1.25rem;
      z-index: 60;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 9999px;
      border: 1px solid rgba(201, 198, 193, 0.35);
      background: rgba(32, 31, 31, 0.92);
      color: #e8e2d6;
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      cursor: pointer;
      transition: transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .onurik-nav-close:hover {
      transform: translateY(-1px);
      background: rgba(42, 42, 42, 0.98);
      border-color: rgba(229, 226, 221, 0.55);
      box-shadow: 0 12px 32px rgba(229, 226, 221, 0.08);
    }
    .onurik-nav-close:focus {
      outline: none;
    }
    .onurik-nav-close:focus-visible {
      box-shadow: 0 0 0 2px #131313, 0 0 0 4px rgba(229, 226, 221, 0.45);
    }
    .onurik-nav-close .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    @media (min-width: 768px) {
      .onurik-nav-close {
        right: 2rem;
      }
    }
  `;
  document.head.appendChild(style);
}

function mountCloseButton() {
  const current = pageFile(location.pathname);
  if (!DEST_RE.test(current)) return;
  if (document.querySelector(".onurik-nav-close")) return;

  injectStyles();

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "onurik-nav-close";
  btn.setAttribute("aria-label", "Close and go back");
  btn.title = "Close";
  btn.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>' +
    "</svg>" +
    '<span class="sr-only">Close and go back</span>';

  btn.addEventListener("click", function (event) {
    event.preventDefault();
    goBack();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    if (event.target && event.target.closest("input, textarea, select, [contenteditable='true']")) {
      return;
    }
    goBack();
  });

  document.body.appendChild(btn);
}

bindCtaCapture();
mountCloseButton();
