import { addToCart } from "./cart-store.js";
import { categoryLabel, escapeAttr, escapeHtml, formatKes, genderLabel } from "./format.js";
import { getProductById, loadCatalog, relatedProducts } from "./products.js";
import { renderProductCard } from "./ProductCard.js";
import { showShopToast } from "./shop-shell.js";
import { isWishlisted, toggleWishlist } from "./wishlist-store.js";

function priceBlock(product) {
  const sale = product.originalPrice && product.originalPrice > product.price;
  return (
    '<div class="flex flex-wrap items-center gap-3">' +
    '<span class="shop-price shop-price--lg">' +
    formatKes(product.price) +
    "</span>" +
    (sale
      ? '<span class="ob-mono text-cocoa/60 line-through text-base">' + formatKes(product.originalPrice) + "</span>" +
        '<span class="shop-hex">Sale</span>'
      : "") +
    "</div>"
  );
}

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
      '<h1 class="shop-title text-[clamp(2.75rem,6vw,4.5rem)]" data-ob-chars="jumble">Piece not found.</h1>' +
      '<p class="mt-4 text-cocoa/70">It may have been moved. Return to the collection and choose another.</p>' +
      '<a href="/shop" class="mt-10 ob-btn ob-btn--cream ">Back to shop</a>' +
      "</div>";
    return;
  }

  let imageIndex = 0;
  let size = product.sizes[0] || "";
  let color = product.colors[0] ? product.colors[0].id : "";
  let qty = 1;

  function selectedColor() {
    return product.colors.find(function (c) {
      return c.id === color;
    });
  }

  function render() {
    const wished = isWishlisted(product.id);
    document.title = product.name + " · Onurik Shop";
    const main = product.images[imageIndex] || product.images[0];
    const thumbs = product.images
      .map(function (src, i) {
        return (
          '<button type="button" class="shop-thumb aspect-[4/5] w-16 overflow-hidden bg-[#EBD6B5] focus:outline-none focus-visible:ring-1 focus-visible:ring-tomato' +
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

    const sizes = product.sizes
      .map(function (s) {
        return (
          '<button type="button" class="shop-option' +
          (size === s ? " is-active" : "") +
          '" data-size="' +
          escapeAttr(s) +
          '">' +
          escapeHtml(s) +
          "</button>"
        );
      })
      .join("");

    const colors = product.colors
      .map(function (c) {
        return (
          '<button type="button" class="shop-swatch' +
          (color === c.id ? " is-active" : "") +
          '" data-color="' +
          escapeAttr(c.id) +
          '" style="background:' +
          escapeAttr(c.hex) +
          '" aria-label="' +
          escapeAttr(c.label) +
          '" title="' +
          escapeAttr(c.label) +
          '"></button>'
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
      '<div class="shop-hero-frame aspect-[4/5] overflow-hidden bg-[#EBD6B5]">' +
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
      '<span class="text-cocoa/45 mx-2">/</span>' +
      '<a href="/shop?gender=' +
      encodeURIComponent(product.gender) +
      '" class="hover:text-tomato transition-colors">' +
      escapeHtml(genderLabel(product.gender)) +
      "</a>" +
      '<span class="text-cocoa/45 mx-2">/</span>' +
      '<a href="/shop?gender=' +
      encodeURIComponent(product.gender) +
      "&category=" +
      encodeURIComponent(product.category) +
      '" class="hover:text-tomato transition-colors">' +
      escapeHtml(categoryLabel(product.category)) +
      "</a></p>" +
      '<div class="flex items-start justify-between gap-4">' +
      '<h1 class="shop-title text-[clamp(2.5rem,5vw,4.25rem)]" data-ob-chars="jumble">' +
      escapeHtml(product.name) +
      "</h1>" +
      '<button type="button" class="shop-heart shrink-0 mt-2 p-1 text-cocoa/80 hover:opacity-70 transition-opacity focus:outline-none focus-visible:ring-1 focus-visible:ring-tomato' +
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
      '<p class="mt-8 max-w-md text-[15px] leading-relaxed text-cocoa/80">' +
      escapeHtml(product.description) +
      "</p>" +
      '<div class="mt-10 border-t border-cocoa/15 pt-8">' +
      '<p class="shop-label mb-3">Size</p>' +
      '<div class="flex flex-wrap gap-2">' +
      sizes +
      "</div></div>" +
      '<div class="mt-8">' +
      '<p class="shop-label mb-3">Colour — ' +
      escapeHtml((selectedColor() && selectedColor().label) || "") +
      "</p>" +
      '<div class="flex flex-wrap gap-3">' +
      colors +
      "</div></div>" +
      '<div class="mt-8">' +
      '<p class="shop-label mb-3">Quantity</p>' +
      '<div class="shop-stepper">' +
      '<button type="button" data-qty="-1" aria-label="Decrease quantity">−</button>' +
      "<span>" +
      qty +
      "</span>" +
      '<button type="button" data-qty="1" aria-label="Increase quantity">+</button>' +
      "</div></div>" +
      '<div class="mt-10 flex flex-col gap-3 sm:flex-row">' +
      '<button type="button" data-add class="ob-btn flex-1 disabled:opacity-35 disabled:pointer-events-none" ' +
      (product.inStock ? "" : "disabled") +
      '><span class="material-symbols-outlined" aria-hidden="true">shopping_bag</span>Add to Cart</button>' +
      '<button type="button" data-checkout class="ob-btn ob-btn--red flex-1 disabled:opacity-35 disabled:pointer-events-none" ' +
      (product.inStock ? "" : "disabled") +
      ">Checkout</button>" +
      "</div></div></div>" +
      (related
        ? '<section class="mt-24 border-t border-cocoa/15 pt-14" aria-labelledby="related-heading">' +
          '<h2 id="related-heading" class="shop-title text-[clamp(2rem,4vw,3.25rem)] mb-8" data-ob-chars="jumble">You may also like</h2>' +
          '<div class="shop-related">' +
          related +
          "</div></section>"
        : "");
  }

  function addCurrent() {
    if (!product.inStock) return false;
    const c = selectedColor();
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.images[0],
      size: size,
      color: color,
      colorLabel: c ? c.label : "",
      qty: qty,
    });
    showShopToast("Added to cart");
    return true;
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
    const sizeBtn = event.target.closest("[data-size]");
    if (sizeBtn) {
      size = sizeBtn.getAttribute("data-size") || size;
      render();
      return;
    }
    const colorBtn = event.target.closest("[data-color]");
    if (colorBtn) {
      color = colorBtn.getAttribute("data-color") || color;
      render();
      return;
    }
    const qtyBtn = event.target.closest("[data-qty]");
    if (qtyBtn) {
      qty = Math.max(1, Math.min(12, qty + Number(qtyBtn.getAttribute("data-qty"))));
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
