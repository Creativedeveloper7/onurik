import { CATEGORIES, GENDERS, categoryLabel, escapeHtml, genderLabel } from "./format.js";
import { filterProducts, getCatalog } from "./products.js";
import { renderProductCard } from "./ProductCard.js";
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
  const parts = ['<a href="index.html" class="hover:text-white/70 transition-colors">Shop</a>'];
  if (state.gender) {
    parts.push(
      '<a href="index.html?gender=' +
        encodeURIComponent(state.gender) +
        '" class="hover:text-white/70 transition-colors">' +
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
  return parts.join('<span class="text-white/20 mx-2">/</span>');
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

export function mountShopGrid(root) {
  if (!root) return;
  let state = paramsFromLocation();

  function render() {
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
      ? '<div class="col-span-full py-24 text-center border-t border-white/[0.08]">' +
        '<p class="font-montserrat text-2xl md:text-3xl tracking-[-0.02em] text-white font-medium">The shop is empty.</p>' +
        '<p class="mt-4 text-sm text-white/40 max-w-md mx-auto">Pieces will appear here once they go live from the studio.</p>' +
        "</div>"
      : '<div class="col-span-full py-24 text-center border-t border-white/[0.08]">' +
        '<p class="font-montserrat text-2xl md:text-3xl tracking-[-0.02em] text-white font-medium">Nothing in this collection yet.</p>' +
        '<p class="mt-4 text-sm text-white/40 max-w-md mx-auto">This pairing of gender and product type is waiting on the next drop.</p>' +
        '<button type="button" data-reset class="shop-filter-btn is-active mt-8">View all merch</button>' +
        "</div>";

    const grid = products.length
      ? products
          .map(function (p) {
            return renderProductCard(p);
          })
          .join("")
      : empty;

    root.innerHTML =
      '<div class="flex flex-col gap-10">' +
      '<div>' +
      '<p class="font-montserrat text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45 mb-4">' +
      breadcrumb(state) +
      "</p>" +
      '<h1 class="font-montserrat font-medium tracking-[-0.03em] text-white text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.05]">' +
      escapeHtml(heading(state)) +
      "</h1>" +
      (state.q
        ? '<p class="mt-4 text-sm text-white/40">Results for “' + escapeHtml(state.q) + '”</p>'
        : '<p class="mt-5 max-w-xl text-[15px] leading-relaxed text-white/50">Studio merch — hoodies, tees, caps, and AfroWear. Built with the same restraint as the rest of the work.</p>') +
      "</div>" +
      '<div class="flex flex-col gap-6 border-y border-white/[0.08] py-5">' +
      '<div class="flex flex-wrap items-center gap-x-8 gap-y-3">' +
      genderBtns +
      "</div>" +
      '<div class="flex flex-wrap items-center gap-x-8 gap-y-3">' +
      catBtns +
      "</div>" +
      "</div>" +
      '<div class="flex flex-wrap items-center justify-between gap-4">' +
      '<p class="font-montserrat text-[11px] uppercase tracking-[0.18em] text-white/35">' +
      products.length +
      (products.length === 1 ? " piece" : " pieces") +
      "</p>" +
      '<div class="flex flex-wrap items-center gap-x-6 gap-y-2" aria-label="Sort">' +
      sorts +
      "</div></div>" +
      '<div class="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-8 lg:grid-cols-4">' +
      grid +
      "</div></div>";
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

  render();
  document.title = heading(state) + " · Onurik Shop";
}
