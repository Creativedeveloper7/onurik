import { categoryLabel, escapeAttr, escapeHtml, genderLabel } from "./format.js";
import {
  addSelectionToCart,
  applyOptionClick,
  buyButtonsHtml,
  initialSelection,
  optionsHtml,
  priceBlock,
} from "./product-options.js";
import { getProductById, loadCatalog, relatedProducts } from "./products.js";
import { renderProductCard } from "./ProductCard.js";
import { isWishlisted, toggleWishlist } from "./wishlist-store.js";

export async function mountProductDetail(root) {
  if (!root) return;
  root.innerHTML =
    '<p class="py-24 shop-label">Loading piece…</p>';
  await loadCatalog();
  const id = new URLSearchParams(location.search).get("id") || "";
  const product = getProductById(id);

  if (!product) {
    root.innerHTML =
      '<div class="py-24 max-w-xl">' +
      '<p class="shop-eyebrow mb-4"><a href="/shop" class="hover:text-tomato">Shop</a></p>' +
      '<h1 class="shop-title text-[clamp(2.75rem,6vw,4.5rem)]" data-ob-chars="pop">Piece not found.</h1>' +
      '<p class="mt-4 text-cream/70">It may have been moved. Return to the collection and choose another.</p>' +
      '<a href="/shop" class="mt-10 ob-btn ob-btn--cream ">Back to shop</a>' +
      "</div>";
    return;
  }

  let imageIndex = 0;
  const selection = initialSelection(product);

  function render() {
    const wished = isWishlisted(product.id);
    document.title = product.name + " · Onurik Shop";
    const main = product.images[imageIndex] || product.images[0];
    const thumbs = product.images
      .map(function (src, i) {
        return (
          '<button type="button" class="shop-thumb aspect-[4/5] w-16 overflow-hidden bg-white/5 focus:outline-none focus-visible:ring-1 focus-visible:ring-tomato' +
          (i === imageIndex ? " is-active" : "") +
          '" data-image="' +
          i +
          '" aria-label="View image ' +
          (i + 1) +
          '">' +
          '<img src="' +
          escapeAttr(src) +
          '" alt="" class="shop-img h-full w-full object-cover"/>' +
          "</button>"
        );
      })
      .join("");

    const related = relatedProducts(product, 4)
      .map(function (item) {
        return renderProductCard(item, { compact: true });
      })
      .join("");

    const stockNote = product.inStock
      ? ""
      : '<p class="mt-5"><span class="shop-hex shop-hex--ink">Currently unavailable</span></p>';

    root.innerHTML =
      '<div class="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">' +
      '<div class="lg:col-span-7">' +
      '<div class="shop-hero-frame aspect-[4/5] overflow-hidden bg-white/5">' +
      '<img id="shop-hero-image" src="' +
      escapeAttr(main) +
      '" alt="' +
      escapeAttr(product.name) +
      '" class="shop-img h-full w-full object-cover" width="900" height="1125"/>' +
      "</div>" +
      '<div class="mt-4 flex flex-wrap gap-3" role="list">' +
      thumbs +
      "</div></div>" +
      '<div class="lg:col-span-5 lg:pt-4">' +
      '<p class="shop-eyebrow mb-5">' +
      '<a href="/shop" class="hover:text-tomato transition-colors">Shop</a>' +
      '<span class="text-cream/45 mx-2">/</span>' +
      '<a href="/shop?gender=' +
      encodeURIComponent(product.gender) +
      '" class="hover:text-tomato transition-colors">' +
      escapeHtml(genderLabel(product.gender)) +
      "</a>" +
      '<span class="text-cream/45 mx-2">/</span>' +
      '<a href="/shop?gender=' +
      encodeURIComponent(product.gender) +
      "&category=" +
      encodeURIComponent(product.category) +
      '" class="hover:text-tomato transition-colors">' +
      escapeHtml(categoryLabel(product.category)) +
      "</a></p>" +
      '<div class="flex items-start justify-between gap-4">' +
      '<h1 class="shop-title text-[clamp(2.5rem,5vw,4.25rem)]" data-ob-chars="pop">' +
      escapeHtml(product.name) +
      "</h1>" +
      '<button type="button" class="shop-heart shrink-0 mt-2 p-1 text-cream/80 hover:opacity-70 transition-opacity focus:outline-none focus-visible:ring-1 focus-visible:ring-tomato' +
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
      stockNote +
      '<p class="mt-8 max-w-md text-[15px] leading-relaxed text-cream/80">' +
      escapeHtml(product.description) +
      "</p>" +
      optionsHtml(product, selection) +
      buyButtonsHtml(product) +
      "</div></div>" +
      (related
        ? '<section class="mt-24 border-t border-white/10 pt-14" aria-labelledby="related-heading">' +
          '<h2 id="related-heading" class="shop-title text-[clamp(2rem,4vw,3.25rem)] mb-8" data-ob-chars="pop">You may also like</h2>' +
          '<div class="ob-carousel text-cream" data-ob-carousel aria-label="You may also like" style="--ob-slide:72%; --ob-slide-md:34%; --ob-slide-lg:24%">' +
          '<div class="ob-carousel__track shop-related">' +
          related +
          "</div></div></section>"
        : "");
  }

  function addCurrent() {
    return addSelectionToCart(product, selection);
  }

  root.addEventListener("click", function (event) {
    const imgBtn = event.target.closest("[data-image]");
    if (imgBtn) {
      imageIndex = Number(imgBtn.getAttribute("data-image")) || 0;
      render();
      return;
    }
    const wish = event.target.closest("[data-wishlist]");
    if (wish) {
      toggleWishlist(wish.getAttribute("data-wishlist") || product.id);
      render();
      return;
    }
    if (applyOptionClick(event, selection)) {
      render();
      return;
    }
    if (event.target.closest("[data-add]")) {
      addCurrent();
      return;
    }
    if (event.target.closest("[data-checkout]")) {
      if (addCurrent()) location.href = "/shop/checkout";
    }
  });

  render();
}
