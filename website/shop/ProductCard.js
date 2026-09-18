import { escapeAttr, escapeHtml, formatKes } from "./format.js";
import { isWishlisted } from "./wishlist-store.js";

export function renderProductCard(product, options) {
  const opts = options || {};
  const compact = Boolean(opts.compact);
  const on = isWishlisted(product.id);
  const sale = product.originalPrice && product.originalPrice > product.price;
  const href = "product.html?id=" + encodeURIComponent(product.id);

  return (
    '<article class="group relative flex flex-col border-b border-white/[0.08] pb-6">' +
    '<a href="' +
    href +
    '" class="block focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40">' +
    '<div class="relative aspect-[4/5] overflow-hidden bg-[#1c1b1b]">' +
    '<img src="' +
    escapeAttr(product.images[0] || "") +
    '" alt="' +
    escapeAttr(product.name) +
    '" class="shop-img h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-85" width="600" height="750" loading="lazy"/>' +
    (product.inStock
      ? ""
      : '<span class="absolute left-3 top-3 font-montserrat text-[10px] uppercase tracking-[0.18em] text-white/70">Sold out</span>') +
    "</div></a>" +
    '<button type="button" class="shop-heart absolute right-2 top-2 z-[1] p-2 text-white/80 transition-opacity hover:opacity-70 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40' +
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
    '<div class="mt-4 flex items-start justify-between gap-3">' +
    '<a href="' +
    href +
    '" class="min-w-0 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40">' +
    '<h3 class="font-montserrat text-sm font-medium tracking-[-0.01em] text-[#f5f5f5] md:text-[15px]">' +
    escapeHtml(product.name) +
    "</h3>" +
    (compact
      ? ""
      : '<p class="mt-1 font-montserrat text-[10px] uppercase tracking-[0.16em] text-white/35">' +
        escapeHtml(product.gender) +
        "</p>") +
    "</a>" +
    '<div class="shrink-0 text-right font-montserrat text-sm text-[#f5f5f5]">' +
    (sale
      ? '<span class="mr-2 text-white/35 line-through">' +
        formatKes(product.originalPrice) +
        "</span>"
      : "") +
    "<span>" +
    formatKes(product.price) +
    "</span></div></div></article>"
  );
}
