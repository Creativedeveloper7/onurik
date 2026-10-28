import { CATEGORIES, GENDERS, categoryLabel, escapeHtml, genderLabel } from "./format.js";
import {
  catalogError,
  catalogReady,
  filterProducts,
  getCatalog,
  loadCatalog,
  subscribeCatalog,
} from "./products.js";
import { bindRack, renderRack } from "./ClothingRack.js";
import { toggleWishlist } from "./wishlist-store.js";

function paramsFromLocation() {
  const q = new URLSearchParams(location.search);
  return {
    gender: q.get("gender") || "",
    category: q.get("category") || "",
    sort: q.get("sort") || "newest",
    q: q.get("q") || "",
  };
}

function writeParams(next) {
  const q = new URLSearchParams();
  if (next.gender) q.set("gender", next.gender);
  if (next.category) q.set("category", next.category);
  if (next.sort && next.sort !== "newest") q.set("sort", next.sort);
  if (next.q) q.set("q", next.q);
  const qs = q.toString();
  history.replaceState(null, "", qs ? location.pathname + "?" + qs : location.pathname);
}

function breadcrumb(state) {
  const parts = ['<a href="/shop" class="hover:text-tomato transition-colors">Shop</a>'];
  if (state.gender) {
    parts.push(
      '<a href="/shop?gender=' +
        encodeURIComponent(state.gender) +
        '" class="hover:text-tomato transition-colors">' +
        escapeHtml(genderLabel(state.gender)) +
        "</a>"
    );
  }
  if (state.category) {
    parts.push("<span>" + escapeHtml(categoryLabel(state.category)) + "</span>");
  }
  if (state.q) {
    parts.push("<span>Search</span>");
  }
  return parts.join('<span class="text-cocoa/40 mx-2">/</span>');
}

function heading(state) {
  if (state.q) return "Search";
  if (state.gender && state.category) {
    return genderLabel(state.gender) + " · " + categoryLabel(state.category);
  }
  if (state.gender) return genderLabel(state.gender);
  if (state.category) return categoryLabel(state.category);
  return "Merch";
}

export async function mountShopGrid(root) {
  if (!root) return;
  let state = paramsFromLocation();
  let current = [];
  const rack = bindRack(root, function () {
    return current;
  });

  function render() {
    if (!catalogReady()) {
      root.innerHTML =
        '<div class="shop-state"><span class="shop-state__spinner" aria-hidden="true"></span><p class="shop-label">Loading merch…</p></div>';
      return;
    }
    const loadError = catalogError();
    if (loadError && !getCatalog().length) {
      root.innerHTML =
        '<div class="shop-state shop-state--error">' +
        '<p class="shop-title text-[clamp(2.25rem,5vw,3.5rem)]" data-ob-chars="jumble">Catalog unavailable.</p>' +
        '<p class="ob-mono mt-4 text-sm text-cocoa/75 max-w-md mx-auto">' +
        escapeHtml(loadError) +
        "</p></div>";
      return;
    }
    const products = filterProducts(state);
    const genderBtns = GENDERS.map(function (g) {
      return (
        '<button type="button" class="shop-filter-btn' +
        (state.gender === g.id ? " is-active" : "") +
        '" data-gender="' +
        g.id +
        '">' +
        g.label +
        "</button>"
      );
    }).join("");

    const catBtns = CATEGORIES.map(function (c) {
      return (
        '<button type="button" class="shop-filter-btn' +
        (state.category === c.id ? " is-active" : "") +
        '" data-category="' +
        c.id +
        '">' +
        c.label +
        "</button>"
      );
    }).join("");

    const sorts = [
      { id: "newest", label: "Newest" },
      { id: "price-asc", label: "Price ↑" },
      { id: "price-desc", label: "Price ↓" },
    ]
      .map(function (s) {
        return (
          '<button type="button" class="shop-filter-btn' +
          (state.sort === s.id ? " is-active" : "") +
          '" data-sort="' +
          s.id +
          '">' +
          s.label +
          "</button>"
        );
      })
      .join("");

    const catalogEmpty = !getCatalog().length;
    const empty = catalogEmpty
      ? '<div class="shop-state col-span-full">' +
        '<p class="shop-title text-[clamp(2.25rem,5vw,3.5rem)]" data-ob-chars="jumble">The shop is empty.</p>' +
        '<p class="ob-mono mt-4 text-sm text-cocoa/75 max-w-md mx-auto">Pieces will appear here once they go live from the studio.</p>' +
        "</div>"
      : '<div class="shop-state col-span-full">' +
        '<p class="shop-title text-[clamp(2.25rem,5vw,3.5rem)]" data-ob-chars="jumble">Nothing in this collection yet.</p>' +
        '<p class="ob-mono mt-4 text-sm text-cocoa/75 max-w-md mx-auto">This pairing of gender and product type is waiting on the next drop.</p>' +
        '<button type="button" data-reset class="ob-btn ob-btn--red mt-8">View all merch</button>' +
        "</div>";

    current = products;
    const rack = products.length ? renderRack(products) : empty;

    root.innerHTML =
      '<div class="flex flex-col gap-10">' +
      '<div class="shop-masthead">' +
      (state.q
        ? ""
        : '<div class="shop-masthead__tags hidden md:block" aria-hidden="true">' +
          '<span class="ob-tag" data-ob-float data-ob-depth="16" style="left:12%;top:12%;--ob-float-rot:-8deg">hoodies</span>' +
          '<span class="ob-coin" data-ob-float data-ob-depth="24" style="left:40%;top:4%"><span class="material-symbols-outlined">checkroom</span></span>' +
          '<span class="ob-tag" data-ob-float data-ob-depth="12" style="right:8%;top:20%;--ob-float-rot:6deg">tees</span>' +
          '<span class="ob-hex" data-ob-float data-ob-depth="20" style="left:28%;top:52%">AfroWear</span>' +
          '<span class="ob-tag" data-ob-float data-ob-depth="18" style="right:18%;top:62%;--ob-float-rot:-4deg">caps</span>' +
          '<span class="ob-coin" data-ob-float data-ob-depth="28" style="right:2%;top:-4%"><span class="material-symbols-outlined">shopping_bag</span></span>' +
          "</div>") +
      '<p class="shop-eyebrow mb-4">' +
      breadcrumb(state) +
      "</p>" +
      '<h1 class="shop-title text-[clamp(3.25rem,10vw,8rem)]" data-ob-chars="jumble">' +
      escapeHtml(heading(state)) +
      "</h1>" +
      (state.q
        ? '<p class="ob-mono mt-4 text-sm text-cocoa/75">Results for “' + escapeHtml(state.q) + '”</p>'
        : '<p class="ob-marker mt-3 -rotate-1 text-[clamp(1.25rem,2.4vw,1.75rem)] text-tomato">wear the work.</p>' +
          '<p class="mt-4 max-w-xl text-[15px] leading-relaxed text-cocoa/80">Studio merch — hoodies, tees, caps, and AfroWear. Built with the same restraint as the rest of the work.</p>') +
      "</div>" +
      '<div class="shop-filters">' +
      '<div class="flex flex-wrap items-center gap-2.5">' +
      genderBtns +
      "</div>" +
      '<div class="flex flex-wrap items-center gap-2.5">' +
      catBtns +
      "</div>" +
      "</div>" +
      '<div class="flex flex-wrap items-center justify-between gap-4">' +
      '<p class="shop-count">' +
      products.length +
      (products.length === 1 ? " piece" : " pieces") +
      "</p>" +
      '<div class="flex flex-wrap items-center gap-2" aria-label="Sort">' +
      sorts +
      "</div></div>" +
      '<div class="rack-wall">' +
      rack +
      "</div>" +
      (products.length
        ? '<p class="rack-hint">' +
          '<span class="rack-hint--mouse">Hover a piece to turn it — click to try it on.</span>' +
          '<span class="rack-hint--touch">Tap a piece to turn it — tap again to try it on.</span>' +
          "</p>"
        : "") +
      "</div>";
  }

  function apply(patch) {
    state = Object.assign({}, state, patch);
    writeParams(state);
    const title = heading(state);
    document.title = title + " · Onurik Shop";
    render();
  }

  root.addEventListener("click", function (event) {
    const reset = event.target.closest("[data-reset]");
    if (reset) {
      apply({ gender: "", category: "", q: "", sort: "newest" });
      return;
    }
    const wish = event.target.closest("[data-wishlist]");
    if (wish) {
      event.preventDefault();
      toggleWishlist(wish.getAttribute("data-wishlist"));
      render();
      return;
    }
    const gender = event.target.closest("[data-gender]");
    if (gender) {
      const id = gender.getAttribute("data-gender");
      apply({ gender: state.gender === id ? "" : id });
      return;
    }
    const category = event.target.closest("[data-category]");
    if (category) {
      const id = category.getAttribute("data-category");
      apply({ category: state.category === id ? "" : id });
      return;
    }
    const sort = event.target.closest("[data-sort]");
    if (sort) {
      apply({ sort: sort.getAttribute("data-sort") });
    }
  });

  document.title = heading(state) + " · Onurik Shop";
  render();
  await loadCatalog();
  render();
  const piece = new URLSearchParams(location.search).get("piece");
  if (piece) rack.open(piece);
  subscribeCatalog(function () {
    render();
  });
}
