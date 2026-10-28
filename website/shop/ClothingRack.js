/**
 * Clothing rack display for the shop.
 *
 * Pieces hang side-on from a rail; the hovered / focused / tapped piece turns to face forward.
 * Opening a piece shows the viewer: the garment on its hanger with a front/back flip,
 * prev/next through the current collection, and the purchase panel at the side.
 *
 * Convention: product.images[0] is the front, product.images[1] (if any) the back.
 * Garment photos on white blend into the rack's paper via mix-blend-mode, so cut-outs
 * or plain white backgrounds look best.
 */
import { categoryLabel, escapeAttr, escapeHtml, formatKes, genderLabel } from "./format.js";
import {
  addSelectionToCart,
  applyOptionClick,
  buyButtonsHtml,
  initialSelection,
  optionsHtml,
  priceBlock,
} from "./product-options.js";
import { isWishlisted, toggleWishlist } from "./wishlist-store.js";

const RAIL_SIZE = 9;

const reduceMotion =
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function hangerSvg(className) {
  return (
    '<svg class="' +
    className +
    '" viewBox="0 0 200 60" aria-hidden="true" focusable="false">' +
    '<path d="M100 26 V16 a8 8 0 1 1 8 -8" fill="none" stroke="#8a8a8a" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M100 26 C 70 30, 30 42, 12 50 a5 5 0 0 0 3 9 H185 a5 5 0 0 0 3 -9 C 170 42, 130 30, 100 26 Z" fill="#3A2416"/>' +
    '<path d="M24 52 H176" stroke="#5a3a22" stroke-width="2" stroke-linecap="round" opacity="0.6"/>' +
    "</svg>"
  );
}

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function captionHtml(product) {
  if (!product) return "";
  return (
    '<p class="rack__caption-name">' +
    escapeHtml(product.name) +
    "</p>" +
    '<p class="rack__caption-meta">' +
    escapeHtml(genderLabel(product.gender)) +
    " · " +
    escapeHtml(categoryLabel(product.category)) +
    " — " +
    formatKes(product.price) +
    (product.inStock ? "" : " · Sold out") +
    "</p>" +
    '<button type="button" class="rack__see" data-rack-open="' +
    escapeAttr(product.id) +
    '">See availability <span class="material-symbols-outlined" aria-hidden="true">north_east</span></button>'
  );
}

/** Rack markup for a list of products (split across rails of RAIL_SIZE). */
export function renderRack(products) {
  return chunk(products, RAIL_SIZE)
    .map(function (rail, railIndex) {
      const active = Math.floor((rail.length - 1) / 2);
      const items = rail
        .map(function (p, i) {
          const side = i < active ? " is-left" : i > active ? " is-right" : " is-active";
          const sale = p.originalPrice && p.originalPrice > p.price;
          return (
            '<li class="rack-item' +
            side +
            '" data-rack-index="' +
            i +
            '" data-rack-id="' +
            escapeAttr(p.id) +
            '">' +
            '<button type="button" class="rack-item__btn" data-rack-pick="' +
            escapeAttr(p.id) +
            '" aria-label="' +
            escapeAttr(p.name + ", " + formatKes(p.price) + (p.inStock ? "" : ", sold out")) +
            '">' +
            '<span class="rack-item__turn">' +
            hangerSvg("rack-item__hanger") +
            '<span class="rack-item__garment">' +
            (p.images[0]
              ? '<img src="' +
                escapeAttr(p.images[0]) +
                '" alt="" loading="lazy" decoding="async" draggable="false"/>'
              : '<span class="rack-item__blank material-symbols-outlined" aria-hidden="true">checkroom</span>') +
            "</span></span>" +
            (p.inStock
              ? sale
                ? '<span class="rack-item__tag">Sale</span>'
                : ""
              : '<span class="rack-item__tag rack-item__tag--ink">Sold out</span>') +
            "</button></li>"
          );
        })
        .join("");
      return (
        '<section class="rack" data-rack="' +
        railIndex +
        '" aria-label="Rack ' +
        (railIndex + 1) +
        '">' +
        '<div class="rack__stage"><div class="rack__track">' +
        '<div class="rack__rail" aria-hidden="true"><span></span><span></span></div>' +
        '<ul class="rack__items" role="list">' +
        items +
        "</ul></div></div>" +
        '<div class="rack__caption" aria-live="polite">' +
        captionHtml(rail[active]) +
        "</div></section>"
      );
    })
    .join("");
}

/* ------------------------------------------------------------------ */
/* Viewer                                                              */
/* ------------------------------------------------------------------ */

function createViewer() {
  const el = document.createElement("div");
  el.className = "rack-viewer";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-label", "Product viewer");
  el.hidden = true;
  document.body.appendChild(el);
  return el;
}

function viewerHtml(product, list, index, state) {
  const prev = list[(index - 1 + list.length) % list.length];
  const next = list[(index + 1) % list.length];
  const front = product.images[0] || "";
  const back = product.images[1] || "";
  const many = list.length > 1;
  const wished = isWishlisted(product.id);

  const face = function (src, cls) {
    return (
      '<span class="rack-flip__face ' +
      cls +
      '">' +
      (src
        ? '<img src="' + escapeAttr(src) + '" alt="" draggable="false"/>'
        : '<span class="rack-item__blank material-symbols-outlined" aria-hidden="true">checkroom</span>') +
      "</span>"
    );
  };

  return (
    '<div class="rack-viewer__stage">' +
    (many && prev.images[0]
      ? '<img class="rack-viewer__ghost rack-viewer__ghost--prev" src="' + escapeAttr(prev.images[0]) + '" alt="" aria-hidden="true"/>'
      : "") +
    (many && next.images[0]
      ? '<img class="rack-viewer__ghost rack-viewer__ghost--next" src="' + escapeAttr(next.images[0]) + '" alt="" aria-hidden="true"/>'
      : "") +
    (many
      ? '<button type="button" class="rack-viewer__arrow rack-viewer__arrow--prev" data-viewer-step="-1" aria-label="Previous piece: ' +
        escapeAttr(prev.name) +
        '"><span class="material-symbols-outlined" aria-hidden="true">arrow_back</span></button>' +
        '<button type="button" class="rack-viewer__arrow rack-viewer__arrow--next" data-viewer-step="1" aria-label="Next piece: ' +
        escapeAttr(next.name) +
        '"><span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span></button>'
      : "") +
    '<figure class="rack-viewer__piece' +
    (state.enter ? " is-enter-" + state.enter : "") +
    '">' +
    hangerSvg("rack-viewer__hanger") +
    '<span class="rack-flip' +
    (state.showBack && back ? " is-back" : "") +
    '">' +
    face(front, "rack-flip__face--front") +
    (back ? face(back, "rack-flip__face--back") : "") +
    "</span>" +
    '<figcaption class="sr-only">' +
    escapeHtml(product.name) +
    (state.showBack && back ? ", back view" : ", front view") +
    "</figcaption></figure>" +
    '<h2 class="rack-viewer__title" id="rack-viewer-title" data-ob-chars="jumble">' +
    escapeHtml(product.name) +
    "</h2>" +
    (back
      ? '<div class="rack-viewer__toggle" role="group" aria-label="Garment side">' +
        '<button type="button" data-viewer-side="front" aria-pressed="' +
        (state.showBack ? "false" : "true") +
        '">Front</button>' +
        '<button type="button" data-viewer-side="back" aria-pressed="' +
        (state.showBack ? "true" : "false") +
        '">Back</button></div>'
      : "") +
    '<button type="button" class="rack-viewer__jump" data-viewer-jump>See availability <span class="material-symbols-outlined" aria-hidden="true">south</span></button>' +
    "</div>" +
    '<aside class="rack-viewer__panel" aria-labelledby="rack-viewer-title">' +
    '<p class="shop-eyebrow mb-4">' +
    escapeHtml(genderLabel(product.gender)) +
    '<span class="text-cocoa/45 mx-2">/</span>' +
    escapeHtml(categoryLabel(product.category)) +
    "</p>" +
    '<div class="flex items-start justify-between gap-4">' +
    '<p class="shop-title text-[clamp(2rem,3.4vw,3rem)]">' +
    escapeHtml(product.name) +
    "</p>" +
    '<button type="button" class="shop-heart shrink-0 mt-1' +
    (wished ? " is-on" : "") +
    '" data-wishlist="' +
    escapeAttr(product.id) +
    '" aria-pressed="' +
    (wished ? "true" : "false") +
    '" aria-label="' +
    (wished ? "Remove from wishlist" : "Add to wishlist") +
    '"><span class="material-symbols-outlined text-[22px]" aria-hidden="true">favorite</span></button>' +
    "</div>" +
    '<div class="mt-5">' +
    priceBlock(product) +
    "</div>" +
    (product.inStock ? "" : '<p class="mt-5"><span class="shop-hex shop-hex--ink">Currently unavailable</span></p>') +
    (product.description
      ? '<p class="mt-7 text-[15px] leading-relaxed text-cocoa/80">' + escapeHtml(product.description) + "</p>"
      : "") +
    optionsHtml(product, state.selection) +
    buyButtonsHtml(product) +
    '<a class="rack-viewer__full" href="/shop/product?id=' +
    encodeURIComponent(product.id) +
    '">Open full product page <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span></a>' +
    "</aside>" +
    '<button type="button" class="rack-viewer__close" data-viewer-close>Close <span class="material-symbols-outlined" aria-hidden="true">close</span></button>'
  );
}

function setPieceParam(id) {
  const q = new URLSearchParams(location.search);
  if (id) q.set("piece", id);
  else q.delete("piece");
  const qs = q.toString();
  history.replaceState(null, "", qs ? location.pathname + "?" + qs : location.pathname);
}

/**
 * Wire rack interactions inside `root` (delegated, so re-rendering the rack is fine)
 * and own the viewer overlay. `getProducts` returns the list currently on the rack.
 */
export function bindRack(root, getProducts) {
  const viewer = createViewer();
  let list = [];
  let index = -1;
  let returnFocus = null;
  const state = { showBack: false, selection: null, enter: "" };

  function setActive(item, scroll) {
    if (!item || item.classList.contains("is-active")) return;
    const rack = item.closest(".rack");
    const items = Array.from(rack.querySelectorAll(".rack-item"));
    const at = items.indexOf(item);
    items.forEach(function (el, i) {
      el.classList.toggle("is-active", i === at);
      el.classList.toggle("is-left", i < at);
      el.classList.toggle("is-right", i > at);
    });
    const product = getProducts().find(function (p) {
      return p.id === item.getAttribute("data-rack-id");
    });
    rack.querySelector(".rack__caption").innerHTML = captionHtml(product);
    if (scroll) {
      item.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", inline: "center", block: "nearest" });
    }
  }

  function render() {
    const product = list[index];
    if (!product) return;
    viewer.innerHTML = viewerHtml(product, list, index, state);
    state.enter = "";
  }

  function open(id) {
    list = getProducts();
    const at = list.findIndex(function (p) {
      return p.id === id;
    });
    if (at < 0) return;
    returnFocus = document.activeElement;
    index = at;
    state.showBack = false;
    state.selection = initialSelection(list[index]);
    state.enter = "drop";
    render();
    viewer.hidden = false;
    document.documentElement.classList.add("rack-viewer-open");
    requestAnimationFrame(function () {
      viewer.classList.add("is-open");
      const close = viewer.querySelector("[data-viewer-close]");
      if (close) close.focus({ preventScroll: true });
    });
    setPieceParam(id);
  }

  function close() {
    if (viewer.hidden) return;
    viewer.classList.remove("is-open");
    document.documentElement.classList.remove("rack-viewer-open");
    setPieceParam("");
    const finish = function () {
      viewer.hidden = true;
      viewer.innerHTML = "";
    };
    if (reduceMotion) finish();
    else setTimeout(finish, 320);
    if (returnFocus && typeof returnFocus.focus === "function") returnFocus.focus({ preventScroll: true });
  }

  function step(delta) {
    if (list.length < 2) return;
    index = (index + delta + list.length) % list.length;
    state.showBack = false;
    state.selection = initialSelection(list[index]);
    state.enter = delta > 0 ? "next" : "prev";
    render();
    viewer.scrollTop = 0;
    setPieceParam(list[index].id);
    const focusBtn = viewer.querySelector('[data-viewer-step="' + delta + '"]');
    if (focusBtn) focusBtn.focus({ preventScroll: true });
  }

  /* Rack: hover turns a piece forward; click opens it (tap first turns it on touch). */
  root.addEventListener("pointerover", function (event) {
    if (event.pointerType !== "mouse") return;
    const item = event.target.closest(".rack-item");
    if (item && root.contains(item)) setActive(item, false);
  });

  // Keyboard focus turns a piece; pointer focus is left to the click handler so a tap
  // only turns the piece and a second tap opens it.
  let lastPointerDown = 0;
  root.addEventListener("pointerdown", function () {
    lastPointerDown = Date.now();
  });

  root.addEventListener("focusin", function (event) {
    if (Date.now() - lastPointerDown < 600) return;
    const item = event.target.closest(".rack-item");
    if (item) setActive(item, true);
  });

  root.addEventListener("click", function (event) {
    const see = event.target.closest("[data-rack-open]");
    if (see) {
      open(see.getAttribute("data-rack-open"));
      return;
    }
    const pick = event.target.closest("[data-rack-pick]");
    if (!pick) return;
    const item = pick.closest(".rack-item");
    if (!item.classList.contains("is-active")) {
      setActive(item, true);
      return;
    }
    open(pick.getAttribute("data-rack-pick"));
  });

  /* Viewer */
  viewer.addEventListener("click", function (event) {
    if (event.target.closest("[data-viewer-close]")) {
      close();
      return;
    }
    const stepBtn = event.target.closest("[data-viewer-step]");
    if (stepBtn) {
      step(Number(stepBtn.getAttribute("data-viewer-step")));
      return;
    }
    const side = event.target.closest("[data-viewer-side]");
    if (side) {
      const wantBack = side.getAttribute("data-viewer-side") === "back";
      if (wantBack === state.showBack) return;
      state.showBack = wantBack;
      // Flip in place so the turn animates instead of re-rendering.
      const flip = viewer.querySelector(".rack-flip");
      if (flip) flip.classList.toggle("is-back", wantBack);
      viewer.querySelectorAll("[data-viewer-side]").forEach(function (btn) {
        btn.setAttribute("aria-pressed", btn === side ? "true" : "false");
      });
      return;
    }
    if (event.target.closest("[data-viewer-jump]")) {
      const panel = viewer.querySelector(".rack-viewer__panel");
      if (panel) panel.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      return;
    }
    const product = list[index];
    if (!product) return;
    const wish = event.target.closest("[data-wishlist]");
    if (wish) {
      toggleWishlist(product.id);
      render();
      return;
    }
    if (applyOptionClick(event, state.selection)) {
      const keep = viewer.scrollTop;
      render();
      viewer.scrollTop = keep;
      return;
    }
    if (event.target.closest("[data-add]")) {
      addSelectionToCart(product, state.selection);
      return;
    }
    if (event.target.closest("[data-checkout]")) {
      if (addSelectionToCart(product, state.selection)) location.href = "/shop/checkout";
    }
  });

  document.addEventListener("keydown", function (event) {
    if (viewer.hidden) return;
    if (event.key === "Escape") {
      close();
      return;
    }
    const typing = event.target.closest && event.target.closest("input, textarea, select");
    if (typing) return;
    if (event.key === "ArrowLeft") step(-1);
    if (event.key === "ArrowRight") step(1);
    if (event.key === "Tab") {
      // Keep focus inside the dialog.
      const focusables = Array.from(
        viewer.querySelectorAll("button:not([disabled]), a[href]")
      ).filter(function (el) {
        return el.offsetParent !== null;
      });
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  return {
    open: open,
    close: close,
    isOpen: function () {
      return !viewer.hidden;
    },
  };
}
