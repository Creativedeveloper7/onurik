/**
 * Site-wide floating WhatsApp CTA (public pages).
 * Hides while image lightbox or mobile nav drawer is open.
 */

const WA_URL =
  "https://wa.me/254725292544?text=Hi%20Jason%2C%20I%27d%20like%20to%20get%20in%20touch%20about%20a%20project.";

const WHATSAPP_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false">' +
  '<path fill="#ffffff" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>' +
  "</svg>";

function isAdminPath() {
  return /\/admin(\/|$)/i.test(location.pathname);
}

function injectStyles() {
  if (document.getElementById("onurik-whatsapp-float-styles")) return;
  const style = document.createElement("style");
  style.id = "onurik-whatsapp-float-styles";
  style.textContent = `
    .onurik-wa-float {
      position: fixed;
      right: 24px;
      bottom: 24px;
      z-index: 55;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 3.5rem;
      height: 3.5rem;
      border-radius: 9999px;
      border: 0;
      background: #25d366;
      color: #ffffff;
      box-shadow:
        0 10px 28px rgba(0, 0, 0, 0.35),
        0 0 0 1px rgba(255, 255, 255, 0.08) inset;
      cursor: pointer;
      text-decoration: none;
      transition:
        transform 0.22s ease,
        box-shadow 0.22s ease,
        opacity 0.2s ease,
        visibility 0.2s ease;
      animation: onurik-wa-pulse 4.5s ease-in-out infinite;
      will-change: transform;
    }
    .onurik-wa-float.is-hidden {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transform: scale(0.92);
    }
    .onurik-wa-float:hover {
      transform: scale(1.06);
      box-shadow:
        0 14px 36px rgba(0, 0, 0, 0.42),
        0 0 28px rgba(37, 211, 102, 0.35);
      animation-play-state: paused;
    }
    .onurik-wa-float:focus {
      outline: none;
    }
    .onurik-wa-float:focus-visible {
      box-shadow:
        0 0 0 2px #131313,
        0 0 0 4px rgba(229, 226, 221, 0.45),
        0 10px 28px rgba(0, 0, 0, 0.35);
    }
    .onurik-wa-float__tooltip {
      position: absolute;
      right: calc(100% + 0.75rem);
      top: 50%;
      transform: translateY(-50%) translateX(4px);
      padding: 0.4rem 0.7rem;
      border-radius: 0.5rem;
      border: 1px solid rgba(201, 198, 193, 0.28);
      background: rgba(32, 31, 31, 0.96);
      color: #e8e2d6;
      font-family: Montserrat, sans-serif;
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      white-space: nowrap;
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease, transform 0.2s ease;
    }
    .onurik-wa-float:hover .onurik-wa-float__tooltip,
    .onurik-wa-float:focus-visible .onurik-wa-float__tooltip {
      opacity: 1;
      transform: translateY(-50%) translateX(0);
    }
    @keyframes onurik-wa-pulse {
      0%,
      100% {
        box-shadow:
          0 10px 28px rgba(0, 0, 0, 0.35),
          0 0 0 0 rgba(37, 211, 102, 0);
      }
      50% {
        box-shadow:
          0 12px 32px rgba(0, 0, 0, 0.38),
          0 0 0 10px rgba(37, 211, 102, 0),
          0 0 22px rgba(37, 211, 102, 0.35);
      }
    }
    @media (hover: none), (pointer: coarse) {
      .onurik-wa-float__tooltip {
        display: none;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .onurik-wa-float {
        animation: none !important;
        transition: none !important;
      }
      .onurik-wa-float:hover {
        transform: none;
      }
      .onurik-wa-float__tooltip {
        transition: none !important;
      }
    }
    @supports (padding: max(0px)) {
      .onurik-wa-float {
        right: max(24px, env(safe-area-inset-right));
        bottom: max(24px, env(safe-area-inset-bottom));
      }
    }
  `;
  document.head.appendChild(style);
}

function shouldHideFloat() {
  const lightbox = document.getElementById("image-lightbox");
  if (lightbox && !lightbox.hasAttribute("hidden") && lightbox.getAttribute("aria-hidden") !== "true") {
    return true;
  }

  const drawer = document.getElementById("site-nav-drawer");
  if (drawer && drawer.classList.contains("open")) return true;

  const overlay = document.querySelector(".site-nav-overlay.open");
  if (overlay) return true;

  return false;
}

function syncVisibility(link) {
  link.classList.toggle("is-hidden", shouldHideFloat());
}

function observeHideTriggers(link) {
  const sync = function () {
    syncVisibility(link);
  };

  const observer = new MutationObserver(sync);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "hidden", "aria-hidden"],
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") requestAnimationFrame(sync);
  });

  sync();
}

function mountWhatsAppFloat() {
  if (isAdminPath()) return;
  if (document.querySelector(".onurik-wa-float")) return;

  injectStyles();

  const link = document.createElement("a");
  link.className = "onurik-wa-float";
  link.href = WA_URL;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.setAttribute("aria-label", "Chat on WhatsApp");
  link.innerHTML =
    '<span class="onurik-wa-float__tooltip" aria-hidden="true">Chat on WhatsApp</span>' +
    WHATSAPP_ICON;

  document.body.appendChild(link);
  observeHideTriggers(link);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountWhatsAppFloat);
} else {
  mountWhatsAppFloat();
}
