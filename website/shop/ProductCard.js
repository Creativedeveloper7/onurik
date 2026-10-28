import { escapeAttr, escapeHtml, formatKes } from "./format.js";
import { isWishlisted } from "./wishlist-store.js";

export function renderProductCard(product, options) {
  const opts = options || {};
  const compact = Boolean(opts.compact);
  const on = isWishlisted(product.id);
  const sale = product.originalPrice && product.originalPrice > product.price;
  const href = "/shop/product?id=" + encodeURIComponent(product.id);

  return (
    '<article class="shop-card group relative flex flex-col">' +
    '<a href="' +
    href +
    '" class="block">' +
    '<div class="shop-card__media relative aspect-[4/5] overflow-hidden">' +
    '<img src="' +
    escapeAttr(product.images[0] || "") +
    '" alt="' +
    escapeAttr(product.name) +
    '" class="shop-img h-full w-full object-cover" width="600" height="750" loading="lazy"/>' +
    (product.inStock
      ? sale
        ? '<span class="shop-hex absolute left-2 top-3">Sale</span>'
        : ""
      : '<span class="shop-hex shop-hex--ink absolute left-2 top-3">Sold out</span>') +
    "</div></a>" +
    '<button type="button" class="shop-heart absolute right-3 top-3 z-[1]' +
    (on ? " is-on" : "") +
    '" data-wishlist="' +
    escapeAttr(product.id) +
    '" aria-pressed="' +
    (on ? "true" : "false") +
    '" aria-label="' +
    (on ? "Remove from wishlist" : "Add to wishlist") +
    '">' +
    '<span class="material-symbols-outlined text-[20px]" aria-hidden="true">favorite</span>' +
    "</button>" +
    '<div class="shop-card__body">' +
    '<a href="' +
    href +
    '" class="min-w-0">' +
    '<h3 class="shop-card__title">' +
    escapeHtml(product.name) +
    "</h3>" +
    (compact
      ? ""
      : '<p class="shop-card__meta">' + escapeHtml(product.gender) + "</p>") +
    "</a>" +
    '<div class="mt-3 flex flex-wrap items-center gap-2">' +
    '<span class="shop-price">' +
    formatKes(product.price) +
    "</span>" +
    (sale
      ? '<span class="ob-mono text-xs text-cocoa/60 line-through">' +
        formatKes(product.originalPrice) +
        "</span>"
      : "") +
    "</div></div></article>"
  );
}
