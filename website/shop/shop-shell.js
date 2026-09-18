import { cartCount, subscribeCart } from "./cart-store.js";
import { filterProducts } from "./products.js";
import { escapeHtml, formatKes } from "./format.js";

function updateBadge() {
  const el = document.getElementById("shop-cart-count");
  if (!el) return;
  const n = cartCount();
  el.textContent = String(n);
  el.style.display = n <= 0 ? "none" : "flex";
  el.hidden = n <= 0;
  el.setAttribute("aria-label", n + (n === 1 ? " item in cart" : " items in cart"));
}

function bindMobileNav() {
  const btn = document.getElementById("site-mobile-menu-btn");
  const drawer = document.getElementById("site-nav-drawer");
  const overlay = document.querySelector(".site-nav-overlay");
  if (!btn || !drawer || !overlay) return;
  function setOpen(open) {
    drawer.classList.toggle("open", open);
    drawer.setAttribute("aria-hidden", open ? "false" : "true");
    overlay.classList.toggle("open", open);
    overlay.setAttribute("aria-hidden", open ? "false" : "true");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    document.documentElement.style.overflow = open ? "hidden" : "";
  }
  btn.addEventListener("click", function () {
    setOpen(!drawer.classList.contains("open"));
  });
  overlay.addEventListener("click", function () {
    setOpen(false);
  });
  drawer.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      setOpen(false);
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && drawer.classList.contains("open")) setOpen(false);
  });
}

function resultRow(product) {
  return (
    '<a href="product.html?id=' +
    encodeURIComponent(product.id) +
    '" class="flex items-center gap-4 py-3 border-b border-white/[0.08] hover:opacity-80 transition-opacity">' +
    '<img src="' +
    escapeHtml(product.images[0] || "") +
    '" alt="' +
    escapeHtml(product.name) +
    '" class="shop-img h-14 w-11 object-cover" width="44" height="56"/>' +
    '<span class="flex min-w-0 flex-col">' +
    '<span class="font-montserrat text-sm text-white truncate">' +
    escapeHtml(product.name) +
    "</span>" +
    '<span class="text-xs text-white/40 mt-0.5">' +
    formatKes(product.price) +
    "</span></span></a>"
  );
}

function bindSearch() {
  if (document.getElementById("shop-search-overlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "shop-search-overlay";
  overlay.className = "shop-search-overlay";
  overlay.setAttribute("hidden", "");
  overlay.innerHTML =
    '<div class="mx-auto flex min-h-full max-w-container-max flex-col px-8 pt-28 md:px-16">' +
    '<div class="flex items-center justify-between gap-4 border-b border-white/15">' +
    '<label class="sr-only" for="shop-search-input">Search merch</label>' +
    '<input id="shop-search-input" class="shop-field border-0 py-4 text-lg font-montserrat tracking-tight placeholder:text-white/30" type="search" placeholder="Search merch" autocomplete="off"/>' +
    '<button type="button" id="shop-search-close" class="shrink-0 p-2 text-white/70 hover:text-white transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40">' +
    '<span class="material-symbols-outlined">close</span><span class="sr-only">Close search</span></button>' +
    "</div>" +
    '<div id="shop-search-results" class="mt-6" role="listbox" aria-label="Search results"></div>' +
    "</div>";
  document.body.appendChild(overlay);

  const input = overlay.querySelector("#shop-search-input");
  const results = overlay.querySelector("#shop-search-results");
  const openBtn = document.getElementById("shop-search-btn");
  const closeBtn = overlay.querySelector("#shop-search-close");

  function render(q) {
    const list = filterProducts({ q: q, sort: "newest" }).slice(0, 8);
    if (!q.trim()) {
      results.innerHTML =
        '<p class="font-montserrat text-[11px] uppercase tracking-[0.2em] text-white/35">Type to search the collection</p>';
      return;
    }
    if (!list.length) {
      results.innerHTML =
        '<p class="font-montserrat text-[11px] uppercase tracking-[0.2em] text-white/35">No matches</p>';
      return;
    }
    results.innerHTML = list.map(resultRow).join("");
  }

  function open() {
    overlay.removeAttribute("hidden");
    overlay.classList.add("is-open");
    document.documentElement.style.overflow = "hidden";
    render("");
    requestAnimationFrame(function () {
      input.focus();
    });
  }

  function close() {
    overlay.classList.remove("is-open");
    overlay.setAttribute("hidden", "");
    document.documentElement.style.overflow = "";
    input.value = "";
  }

  if (openBtn) {
    openBtn.addEventListener("click", function () {
      open();
    });
  }
  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", function (event) {
    if (event.target === overlay) close();
  });
  input.addEventListener("input", function () {
    render(input.value);
  });
  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      const q = input.value.trim();
      if (q) location.href = "index.html?q=" + encodeURIComponent(q);
    }
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && overlay.classList.contains("is-open")) {
      close();
    }
  });
}

let toastTimer = 0;
export function showShopToast(message) {
  let el = document.getElementById("shop-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "shop-toast";
    el.className = "shop-toast";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(function () {
    el.classList.remove("is-visible");
  }, 2200);
}

export function initShopShell() {
  bindMobileNav();
  bindSearch();
  updateBadge();
  subscribeCart(updateBadge);
}
