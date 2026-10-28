/**
 * Purchase options shared by the product page and the rack viewer:
 * price block, size / colour / quantity controls, and adding the current selection to the bag.
 */
import { addToCart } from "./cart-store.js";
import { escapeAttr, escapeHtml, formatKes } from "./format.js";
import { showShopToast } from "./shop-shell.js";

export function priceBlock(product) {
  const sale = product.originalPrice && product.originalPrice > product.price;
  return (
    '<div class="flex flex-wrap items-center gap-3">' +
    '<span class="shop-price shop-price--lg">' +
    formatKes(product.price) +
    "</span>" +
    (sale
      ? '<span class="ob-mono text-cream/60 line-through text-base">' + formatKes(product.originalPrice) + "</span>" +
        '<span class="shop-hex">Sale</span>'
      : "") +
    "</div>"
  );
}

/** Default selection for a product: first size, first colour, one piece. */
export function initialSelection(product) {
  return {
    size: product.sizes[0] || "",
    color: product.colors[0] ? product.colors[0].id : "",
    qty: 1,
  };
}

export function selectedColor(product, selection) {
  return product.colors.find(function (c) {
    return c.id === selection.color;
  });
}

export function optionsHtml(product, selection) {
  const sizes = product.sizes
    .map(function (s) {
      return (
        '<button type="button" class="shop-option' +
        (selection.size === s ? " is-active" : "") +
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
        (selection.color === c.id ? " is-active" : "") +
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

  const current = selectedColor(product, selection);

  return (
    '<div class="mt-10 border-t border-white/10 pt-8">' +
    '<p class="shop-label mb-3">Size</p>' +
    '<div class="flex flex-wrap gap-2">' +
    sizes +
    "</div></div>" +
    '<div class="mt-8">' +
    '<p class="shop-label mb-3">Colour — ' +
    escapeHtml((current && current.label) || "") +
    "</p>" +
    '<div class="flex flex-wrap gap-3">' +
    colors +
    "</div></div>" +
    '<div class="mt-8">' +
    '<p class="shop-label mb-3">Quantity</p>' +
    '<div class="shop-stepper">' +
    '<button type="button" data-qty="-1" aria-label="Decrease quantity">−</button>' +
    "<span>" +
    selection.qty +
    "</span>" +
    '<button type="button" data-qty="1" aria-label="Increase quantity">+</button>' +
    "</div></div>"
  );
}

export function buyButtonsHtml(product) {
  const disabled = product.inStock ? "" : "disabled";
  return (
    '<div class="mt-10 flex flex-col gap-3 sm:flex-row">' +
    '<button type="button" data-add class="ob-btn flex-1 disabled:opacity-35 disabled:pointer-events-none" ' +
    disabled +
    '><span class="material-symbols-outlined" aria-hidden="true">shopping_bag</span>Add to Cart</button>' +
    '<button type="button" data-checkout class="ob-btn ob-btn--red flex-1 disabled:opacity-35 disabled:pointer-events-none" ' +
    disabled +
    ">Checkout</button>" +
    "</div>"
  );
}

/**
 * Apply a click on a size / colour / quantity control to the selection.
 * Returns true when the click was one of those controls (caller re-renders).
 */
export function applyOptionClick(event, selection) {
  const sizeBtn = event.target.closest("[data-size]");
  if (sizeBtn) {
    selection.size = sizeBtn.getAttribute("data-size") || selection.size;
    return true;
  }
  const colorBtn = event.target.closest("[data-color]");
  if (colorBtn) {
    selection.color = colorBtn.getAttribute("data-color") || selection.color;
    return true;
  }
  const qtyBtn = event.target.closest("[data-qty]");
  if (qtyBtn) {
    selection.qty = Math.max(1, Math.min(12, selection.qty + Number(qtyBtn.getAttribute("data-qty"))));
    return true;
  }
  return false;
}

export function addSelectionToCart(product, selection) {
  if (!product.inStock) return false;
  const c = selectedColor(product, selection);
  addToCart({
    productId: product.id,
    name: product.name,
    price: product.price,
    originalPrice: product.originalPrice,
    image: product.images[0],
    size: selection.size,
    color: selection.color,
    colorLabel: c ? c.label : "",
    qty: selection.qty,
  });
  showShopToast("Added to cart");
  return true;
}
