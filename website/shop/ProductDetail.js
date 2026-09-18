import { addToCart } from "./cart-store.js";
import { categoryLabel, escapeAttr, escapeHtml, formatKes, genderLabel } from "./format.js";
import { getProductById, loadCatalog, relatedProducts } from "./products.js";
import { renderProductCard } from "./ProductCard.js";
import { showShopToast } from "./shop-shell.js";
import { isWishlisted, toggleWishlist } from "./wishlist-store.js";

function priceBlock(product) {
  const sale = product.originalPrice && product.originalPrice > product.price;
  return (
    '<div class="flex items-baseline gap-3 font-montserrat">' +
    (sale
      ? '<span class="text-white/35 line-through text-lg">' + formatKes(product.originalPrice) + "</span>"
      : "") +
    '<span class="text-xl text-white md:text-2xl">' +
    formatKes(product.price) +
    "</span></div>"
  );
}

export async function mountProductDetail(root) {
  if (!root) return;
  root.innerHTML =
    '<p class="py-24 font-montserrat text-[11px] uppercase tracking-[0.22em] text-white/40">Loading piece…</p>';
  await loadCatalog();
  const id = new URLSearchParams(location.search).get("id") || "";
  const product = getProductById(id);

  if (!product) {
    root.innerHTML =
      '<div class="py-24 max-w-xl">' +
      '<p class="font-montserrat text-[11px] uppercase tracking-[0.28em] text-white/45 mb-4"><a href="index.html" class="hover:text-white/70">Shop</a></p>' +
      '<h1 class="font-montserrat text-4xl tracking-[-0.03em] text-white font-medium">Piece not found.</h1>' +
      '<p class="mt-4 text-white/45">It may have been moved. Return to the collection and choose another.</p>' +
      '<a href="index.html" class="mt-10 inline-flex border border-outline px-8 py-4 font-montserrat text-xs font-semibold uppercase tracking-[0.22em] text-on-surface transition-colors hover:bg-primary hover:text-on-primary">Back to shop</a>' +
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
          '<button type="button" class="shop-thumb aspect-[4/5] w-16 overflow-hidden bg-[#1c1b1b] focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40' +
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
      : '<p class="mt-4 font-montserrat text-[11px] uppercase tracking-[0.18em] text-white/45">Currently unavailable</p>';

    root.innerHTML =
      '<div class="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">' +
      '<div class="lg:col-span-7">' +
      '<div class="aspect-[4/5] overflow-hidden bg-[#1c1b1b]">' +
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
      '<p class="font-montserrat text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45 mb-5">' +
      '<a href="index.html" class="hover:text-white/70 transition-colors">Shop</a>' +
      '<span class="text-white/20 mx-2">/</span>' +
      '<a href="index.html?gender=' +
      encodeURIComponent(product.gender) +
      '" class="hover:text-white/70 transition-colors">' +
      escapeHtml(genderLabel(product.gender)) +
      "</a>" +
      '<span class="text-white/20 mx-2">/</span>' +
      '<a href="index.html?gender=' +
      encodeURIComponent(product.gender) +
      "&category=" +
      encodeURIComponent(product.category) +
      '" class="hover:text-white/70 transition-colors">' +
      escapeHtml(categoryLabel(product.category)) +
      "</a></p>" +
      '<div class="flex items-start justify-between gap-4">' +
      '<h1 class="font-montserrat text-[clamp(2rem,4vw,3rem)] font-medium leading-[1.1] tracking-[-0.03em] text-white">' +
      escapeHtml(product.name) +
      "</h1>" +
      '<button type="button" class="shop-heart shrink-0 mt-2 p-1 text-white/80 hover:opacity-70 transition-opacity focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40' +
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
      '<p class="mt-8 max-w-md text-[15px] leading-relaxed text-white/55">' +
      escapeHtml(product.description) +
      "</p>" +
      '<div class="mt-10 border-t border-white/[0.08] pt-8">' +
      '<p class="font-montserrat text-[11px] uppercase tracking-[0.2em] text-white/40 mb-3">Size</p>' +
      '<div class="flex flex-wrap gap-2">' +
      sizes +
      "</div></div>" +
      '<div class="mt-8">' +
      '<p class="font-montserrat text-[11px] uppercase tracking-[0.2em] text-white/40 mb-3">Colour — ' +
      escapeHtml((selectedColor() && selectedColor().label) || "") +
      "</p>" +
      '<div class="flex flex-wrap gap-3">' +
      colors +
      "</div></div>" +
      '<div class="mt-8">' +
      '<p class="font-montserrat text-[11px] uppercase tracking-[0.2em] text-white/40 mb-3">Quantity</p>' +
      '<div class="shop-stepper">' +
      '<button type="button" data-qty="-1" aria-label="Decrease quantity">−</button>' +
      "<span>" +
      qty +
      "</span>" +
      '<button type="button" data-qty="1" aria-label="Increase quantity">+</button>' +
      "</div></div>" +
      '<div class="mt-10 flex flex-col gap-3 sm:flex-row">' +
      '<button type="button" data-add class="inline-flex flex-1 items-center justify-center border border-outline px-8 py-4 font-montserrat text-xs font-semibold uppercase tracking-[0.22em] text-on-surface transition-colors duration-300 hover:bg-primary hover:text-on-primary disabled:opacity-35 disabled:pointer-events-none" ' +
      (product.inStock ? "" : "disabled") +
      '>Add to Cart</button>' +
      '<button type="button" data-checkout class="inline-flex flex-1 items-center justify-center bg-primary px-8 py-4 font-montserrat text-xs font-semibold uppercase tracking-[0.22em] text-on-primary transition-opacity duration-300 hover:opacity-80 disabled:opacity-35 disabled:pointer-events-none" ' +
      (product.inStock ? "" : "disabled") +
      ">Checkout</button>" +
      "</div></div></div>" +
      (related
        ? '<section class="mt-24 border-t border-white/[0.08] pt-14" aria-labelledby="related-heading">' +
          '<h2 id="related-heading" class="font-montserrat text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45 mb-8">You may also like</h2>' +
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
      if (addCurrent()) location.href = "checkout.html";
    }
  });

  render();
}
