/**
 * Site-wide CTA close/back navigation.
 * - On CTA clicks to contact / works / about / work: store return URL (incl. hash)
 * - On those destination pages: show a fixed close control that returns to the prior page/section
 */

const RETURN_KEY = "onurik:nav-return";
const DEST_RE = /^(contact|works|about|work)(\.html)?$/i;

function pageFile(pathname) {
  const raw = String(pathname || "/").replace(/\/+$/, "");
  const part = raw.split("/").pop() || "";
  if (!part || part === "index.html") return "index";
  return part.replace(/\.html$/i, "") || "index";
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
  return "/";
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
      top: calc(4.5rem + 0.85rem);
      right: 1.25rem;
      z-index: 60;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 9999px;
      border: 2.5px solid #160e07;
      background: #f2a516;
      color: #2a1b0e;
      box-shadow: 3px 3px 0 #160e07;
      cursor: pointer;
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.2s ease;
    }
    .onurik-nav-close:hover {
      transform: translate(-1px, -2px) rotate(90deg);
      background: #ffcb05;
      box-shadow: 5px 5px 0 #160e07;
    }
    .onurik-nav-close:focus {
      outline: none;
    }
    .onurik-nav-close:focus-visible {
      outline: 3px solid #ffcb05;
      outline-offset: 3px;
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
