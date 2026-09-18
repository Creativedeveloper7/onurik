import {
  cartSubtotal,
  getCart,
  removeLine,
  setLineQty,
} from "./cart-store.js";
import { SHIPPING_METHODS, escapeAttr, escapeHtml, formatKes } from "./format.js";

const SHIP_KEY = "onurik.shop.shipping.v1";

function readShip() {
  try {
    return localStorage.getItem(SHIP_KEY) || "standard";
  } catch {
    return "standard";
  }
}

function writeShip(id) {
  try {
    localStorage.setItem(SHIP_KEY, id);
  } catch {
    /* ignore */
  }
}

export function getSelectedShipping() {
  const id = readShip();
  return (
    SHIPPING_METHODS.find(function (m) {
      return m.id === id;
    }) || SHIPPING_METHODS[0]
  );
}

export function mountCartPage(root) {
  if (!root) return;

  function render() {
    const items = getCart();
    const shipping = getSelectedShipping();
    const subtotal = cartSubtotal();
    const total = subtotal + (items.length ? shipping.price : 0);

    if (!items.length) {
      root.innerHTML =
        '<div class="max-w-xl py-8">' +
        '<p class="font-montserrat text-[11px] uppercase tracking-[0.28em] text-white/45 mb-4">Shop / Cart</p>' +
        '<h1 class="font-montserrat text-[clamp(2.5rem,6vw,4.5rem)] font-medium tracking-[-0.03em] text-white leading-[1.05]">Your cart is empty.</h1>' +
        '<p class="mt-5 text-white/45">When you add a piece, it will live here until you check out.</p>' +
        '<a href="index.html" class="mt-10 inline-flex border border-outline px-8 py-4 font-montserrat text-xs font-semibold uppercase tracking-[0.22em] text-on-surface transition-colors hover:bg-primary hover:text-on-primary">Continue shopping</a>' +
        "</div>";
      return;
    }

    const rows = items
      .map(function (item) {
        const sale = item.originalPrice && item.originalPrice > item.price;
        return (
          '<article class="grid grid-cols-[5.5rem_1fr] gap-4 border-b border-white/[0.08] py-6 md:grid-cols-[6.5rem_1fr_auto] md:gap-6">' +
          '<a href="product.html?id=' +
          encodeURIComponent(item.productId) +
          '" class="aspect-[4/5] overflow-hidden bg-[#1c1b1b]">' +
          '<img src="' +
          escapeAttr(item.image) +
          '" alt="' +
          escapeAttr(item.name) +
          '" class="shop-img h-full w-full object-cover" width="120" height="150"/>' +
          "</a>" +
          '<div class="min-w-0">' +
          '<div class="flex items-start justify-between gap-3">' +
          '<a href="product.html?id=' +
          encodeURIComponent(item.productId) +
          '" class="font-montserrat text-base text-white tracking-[-0.01em] hover:opacity-75 transition-opacity">' +
          escapeHtml(item.name) +
          "</a>" +
          '<button type="button" class="shrink-0 text-white/40 hover:text-white transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40" data-remove="' +
          escapeAttr(item.productId) +
          '" data-size="' +
          escapeAttr(item.size) +
          '" data-color="' +
          escapeAttr(item.color) +
          '" aria-label="Remove ' +
          escapeAttr(item.name) +
          '"><span class="material-symbols-outlined text-[20px]">close</span></button>' +
          "</div>" +
          '<p class="mt-1 font-montserrat text-[11px] uppercase tracking-[0.16em] text-white/35">' +
          escapeHtml(item.size) +
          (item.colorLabel ? " · " + escapeHtml(item.colorLabel) : "") +
          "</p>" +
          '<div class="mt-3 font-montserrat text-sm text-white">' +
          (sale
            ? '<span class="mr-2 text-white/35 line-through">' + formatKes(item.originalPrice) + "</span>"
            : "") +
          formatKes(item.price) +
          "</div>" +
          '<div class="mt-4 shop-stepper">' +
          '<button type="button" data-line-qty="-1" data-id="' +
          escapeAttr(item.productId) +
          '" data-size="' +
          escapeAttr(item.size) +
          '" data-color="' +
          escapeAttr(item.color) +
          '" aria-label="Decrease quantity">−</button>' +
          "<span>" +
          item.qty +
          "</span>" +
          '<button type="button" data-line-qty="1" data-id="' +
          escapeAttr(item.productId) +
          '" data-size="' +
          escapeAttr(item.size) +
          '" data-color="' +
          escapeAttr(item.color) +
          '" aria-label="Increase quantity">+</button>' +
          "</div></div></article>"
        );
      })
      .join("");

    root.innerHTML =
      '<div class="grid grid-cols-1 gap-16 lg:grid-cols-12">' +
      '<div class="lg:col-span-7">' +
      '<p class="font-montserrat text-[11px] uppercase tracking-[0.28em] text-white/45 mb-4">Shop / Cart</p>' +
      '<h1 class="font-montserrat text-[clamp(2.5rem,5vw,4rem)] font-medium tracking-[-0.03em] text-white leading-[1.05] mb-10">My Cart</h1>' +
      rows +
      "</div>" +
      '<aside class="lg:col-span-5 lg:pt-16">' +
      '<div class="border-t border-white/[0.08] pt-6 space-y-4 font-montserrat text-sm">' +
      '<div class="flex justify-between text-white/55"><span>Subtotal</span><span class="text-white">' +
      formatKes(subtotal) +
      "</span></div>" +
      '<div class="flex justify-between text-white/55"><span>Shipping</span><span class="text-white">' +
      (shipping.price ? formatKes(shipping.price) : "Free") +
      "</span></div>" +
      '<p class="text-[11px] uppercase tracking-[0.16em] text-white/30">' +
      escapeHtml(shipping.label) +
      " — update at checkout</p>" +
      '<div class="flex justify-between border-t border-white/[0.08] pt-4 text-white"><span class="uppercase tracking-[0.16em] text-[11px]">Bag Total</span><span class="text-lg">' +
      formatKes(total) +
      "</span></div>" +
      "</div>" +
      '<div class="shop-cart-sticky mt-10 pb-6 pt-6">' +
      '<a href="checkout.html" class="flex w-full items-center justify-center bg-primary px-8 py-4 font-montserrat text-xs font-semibold uppercase tracking-[0.22em] text-on-primary transition-opacity hover:opacity-80">Proceed to Checkout</a>' +
      '<a href="index.html" class="mt-4 flex w-full items-center justify-center border border-outline px-8 py-4 font-montserrat text-xs font-semibold uppercase tracking-[0.22em] text-on-surface transition-colors hover:bg-primary hover:text-on-primary">Continue shopping</a>' +
      "</div></aside></div>";
  }

  root.addEventListener("click", function (event) {
    const remove = event.target.closest("[data-remove]");
    if (remove) {
      removeLine(
        remove.getAttribute("data-remove"),
        remove.getAttribute("data-size"),
        remove.getAttribute("data-color")
      );
      render();
      return;
    }
    const qtyBtn = event.target.closest("[data-line-qty]");
    if (qtyBtn) {
      const items = getCart();
      const id = qtyBtn.getAttribute("data-id");
      const size = qtyBtn.getAttribute("data-size");
      const color = qtyBtn.getAttribute("data-color");
      const line = items.find(function (item) {
        return item.productId === id && item.size === size && item.color === color;
      });
      if (!line) return;
      setLineQty(id, size, color, line.qty + Number(qtyBtn.getAttribute("data-line-qty")));
      render();
    }
  });

  render();
}

export { writeShip };
