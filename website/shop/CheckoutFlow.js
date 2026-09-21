import { cartSubtotal, clearCart, getCart } from "./cart-store.js";
import { persistDelivery, readDeliveryPrefs } from "./CartPage.js";
import {
  earliestIsoDate,
  escapeAttr,
  escapeHtml,
  formatDisplayDate,
  formatKes,
  getDeliveryConfig,
  getDeliveryZone,
  getTurnaround,
  loadDeliveryConfig,
  quoteDelivery,
} from "./format.js";
import { formatZoneNote } from "./delivery-config.js";
import { addOrder } from "./orders-store.js";
import { downloadReceiptFile, sendOrderReceipt } from "./send-receipt.js";
import { isValidEmail } from "./receipt.js";

const DRAFT_KEY = "onurik.shop.checkout.v1";
const ORDER_KEY = "onurik.shop.lastOrder.v1";

function readDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeDraft(draft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

function saveOrder(order) {
  try {
    sessionStorage.setItem(ORDER_KEY, JSON.stringify(order));
  } catch {
    /* ignore */
  }
}

function readOrder() {
  try {
    const raw = sessionStorage.getItem(ORDER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function delay(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

/** Placeholder — replace with a card processor (Stripe, Pesapal, etc.). */
async function mockCardPayment() {
  await delay(900);
  return { ok: true, provider: "card", ref: "CARD-" + Date.now().toString(36).toUpperCase() };
}

/**
 * Placeholder — replace with Safaricom Daraja STK Push.
 * Expected live hook: POST /api/mpesa/stk-push { phone, amount, accountRef }
 */
async function mockMpesaPayment(phone) {
  await delay(1200);
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 9) {
    return { ok: false, error: "Enter a valid M-Pesa number." };
  }
  return { ok: true, provider: "mpesa", ref: "MPESA-" + Date.now().toString(36).toUpperCase() };
}

function progress(step) {
  const labels = ["Shipping", "Delivery", "Payment", "Review"];
  const parts = labels
    .map(function (label, i) {
      const n = i + 1;
      const cls = n < step ? " is-done" : n === step ? " is-current" : "";
      const line =
        i < labels.length - 1
          ? '<span class="shop-progress__line' + (n < step ? " is-done" : "") + '"></span>'
          : "";
      return (
        '<span class="flex items-center min-w-0 flex-1 last:flex-none">' +
        '<span class="flex flex-col items-center gap-2">' +
        '<span class="shop-progress__dot' +
        cls +
        '"></span>' +
        '<span class="hidden sm:block font-montserrat text-[10px] uppercase tracking-[0.16em] ' +
        (n === step ? "text-white" : "text-white/35") +
        '">' +
        label +
        "</span></span>" +
        line +
        "</span>"
      );
    })
    .join("");
  return '<div class="shop-progress mb-12" aria-label="Checkout progress">' + parts + "</div>";
}

function field(name, label, type, value, attrs) {
  return (
    '<label class="flex flex-col gap-1">' +
    '<span class="font-montserrat text-[11px] uppercase tracking-[0.18em] text-white/40">' +
    label +
    "</span>" +
    '<input class="shop-field" id="' +
    name +
    '" name="' +
    name +
    '" type="' +
    type +
    '" value="' +
    escapeAttr(value || "") +
    '" ' +
    (attrs || "") +
    "/>" +
    "</label>"
  );
}

export function mountCheckoutFlow(root) {
  if (!root) return;
  loadDeliveryConfig().then(function () {
    startCheckout(root);
  });
}

function startCheckout(root) {
  const cfg = getDeliveryConfig();
  const savedDelivery = readDeliveryPrefs();
  let step = 1;
  let draft = Object.assign(
    {
      name: "",
      address: "",
      city: "",
      phone: "",
      email: "",
      zoneId: savedDelivery.zoneId || cfg.defaultZoneId,
      turnaroundId: savedDelivery.turnaroundId || cfg.defaultTurnaroundId,
      deliveryDate: savedDelivery.deliveryDate,
      payMethod: "mpesa",
      cardName: "",
      cardNumber: "",
      cardExpiry: "",
      cardCvc: "",
      mpesaPhone: "",
    },
    readDraft()
  );
  if (!draft.zoneId) draft.zoneId = savedDelivery.zoneId;
  if (!draft.turnaroundId) {
    draft.turnaroundId =
      draft.shippingId === "express" || draft.shippingId === "rush"
        ? draft.shippingId
        : savedDelivery.turnaroundId;
  }
  let busy = false;
  let error = "";
  let confirmed = Boolean(new URLSearchParams(location.search).get("confirmed"));

  function persist() {
    const quote = quoteDelivery({
      zoneId: draft.zoneId,
      turnaroundId: draft.turnaroundId,
      deliveryDate: draft.deliveryDate,
      subtotal: cartSubtotal(),
    });
    draft.zoneId = quote.zoneId;
    draft.turnaroundId = quote.turnaroundId;
    draft.deliveryDate = quote.deliveryDate || draft.deliveryDate || "";
    writeDraft(draft);
    persistDelivery({
      zoneId: draft.zoneId,
      turnaroundId: draft.turnaroundId,
      deliveryDate: draft.deliveryDate,
    });
  }

  persist();

  function totals() {
    const items = getCart();
    const subtotal = cartSubtotal();
    const shipping = quoteDelivery({
      zoneId: draft.zoneId,
      turnaroundId: draft.turnaroundId,
      deliveryDate: draft.deliveryDate,
      subtotal: subtotal,
    });
    return {
      items: items,
      shipping: shipping,
      subtotal: subtotal,
      total: subtotal + (items.length ? shipping.price : 0),
    };
  }

  function summary(t) {
    const ship = t.shipping;
    const deliveryLine =
      ship.zonePrice > 0
        ? formatKes(ship.zonePrice)
        : ship.freeDelivery
          ? "Free"
          : formatKes(0);
    return (
      '<dl class="mt-8 space-y-3 border-t border-white/[0.08] pt-6 font-montserrat text-sm">' +
      '<div class="flex justify-between text-white/55"><dt>Subtotal</dt><dd class="text-white">' +
      formatKes(t.subtotal) +
      "</dd></div>" +
      '<div class="flex justify-between gap-6 text-white/55"><dt>Delivery · ' +
      escapeHtml(getDeliveryZone(ship.zoneId).label) +
      "</dt><dd class=\"text-white\">" +
      deliveryLine +
      "</dd></div>" +
      (ship.turnaroundExtra
        ? '<div class="flex justify-between gap-6 text-white/55"><dt>' +
          escapeHtml(ship.turnaroundLabel) +
          '</dt><dd class="text-white">+' +
          formatKes(ship.turnaroundExtra) +
          "</dd></div>"
        : '<div class="flex justify-between gap-6 text-white/55"><dt>' +
          escapeHtml(ship.turnaroundLabel) +
          '</dt><dd class="text-white">No extra</dd></div>') +
      (ship.deliveryDate
        ? '<p class="text-[11px] uppercase tracking-[0.16em] text-white/30">Requested ' +
          escapeHtml(formatDisplayDate(ship.deliveryDate)) +
          "</p>"
        : '<p class="text-[11px] uppercase tracking-[0.16em] text-white/30">Earliest after production · ' +
          escapeHtml(formatDisplayDate(ship.earliestDate)) +
          "</p>") +
      '<div class="flex justify-between border-t border-white/[0.08] pt-3 text-white"><dt class="uppercase tracking-[0.16em] text-[11px]">Bag Total</dt><dd class="text-lg">' +
      formatKes(t.total) +
      "</dd></div></dl>"
    );
  }

  function deliveryStep(t) {
    const cfg = getDeliveryConfig();
    const zone = getDeliveryZone(draft.zoneId);
    const minDate = earliestIsoDate(draft.turnaroundId);
    const dateValue = draft.deliveryDate && draft.deliveryDate >= minDate ? draft.deliveryDate : "";
    const zoneNote = formatZoneNote(cfg);
    const zoneRows = cfg.zones
      .map(function (item) {
        const active = draft.zoneId === item.id;
        const priceLabel =
          cfg.freeDeliveryThreshold > 0 && t.subtotal >= cfg.freeDeliveryThreshold
            ? "Free"
            : formatKes(item.price);
        return (
          '<label class="shop-zone' +
          (active ? " is-active" : "") +
          '">' +
          '<input class="sr-only" type="radio" name="zoneId" value="' +
          item.id +
          '" ' +
          (active ? "checked" : "") +
          "/>" +
          '<span class="shop-zone__mark" aria-hidden="true"></span>' +
          '<span class="shop-zone__copy"><span class="shop-zone__title">' +
          escapeHtml(item.label) +
          '</span><span class="shop-zone__detail">' +
          escapeHtml(item.detail) +
          "</span></span>" +
          '<span class="shop-zone__price">' +
          priceLabel +
          "</span></label>"
        );
      })
      .join("");
    const turnCards = cfg.turnaround
      .map(function (item) {
        const blocked = item.nairobiOnly && !zone.nairobi;
        const active = !blocked && draft.turnaroundId === item.id;
        const extraLabel = item.extra ? "+" + formatKes(item.extra) : "No extra";
        const badgeKind = /rush|express|standard/.test(item.id) ? item.id : "standard";
        return (
          '<label class="shop-turn' +
          (active ? " is-active" : "") +
          (blocked ? " is-disabled" : "") +
          '">' +
          '<input class="sr-only" type="radio" name="turnaroundId" value="' +
          item.id +
          '" ' +
          (active ? "checked" : "") +
          (blocked ? "disabled" : "") +
          "/>" +
          '<span class="shop-turn__top"><span class="shop-turn__badge shop-turn__badge--' +
          badgeKind +
          '">' +
          escapeHtml(item.label) +
          '</span><span class="shop-turn__check" aria-hidden="true"></span></span>' +
          '<span class="shop-turn__time">' +
          escapeHtml(item.timeLabel) +
          '</span><span class="shop-turn__extra' +
          (item.extra ? "" : " is-free") +
          '">' +
          extraLabel +
          '</span><span class="shop-turn__regions">' +
          escapeHtml(item.regions) +
          "</span></label>"
        );
      })
      .join("");
    const dateBlock = cfg.allowDeliveryDate
      ? '<div class="mt-10">' +
        '<div class="flex items-baseline justify-between gap-4 mb-3">' +
        '<label class="font-montserrat text-[11px] uppercase tracking-[0.18em] text-white/40" for="deliveryDate">Delivery date</label>' +
        '<span class="font-montserrat text-[11px] uppercase tracking-[0.16em] text-white/30">Optional</span>' +
        "</div>" +
        '<input class="shop-field shop-field--date" id="deliveryDate" name="deliveryDate" type="date" min="' +
        minDate +
        '" value="' +
        escapeAttr(dateValue) +
        '"/>' +
        '<p class="mt-3 text-sm text-white/40">Earliest we can promise is ' +
        escapeHtml(formatDisplayDate(minDate)) +
        ", after production. " +
        escapeHtml(cfg.dateHint || "") +
        "</p></div>"
      : "";
    return (
      '<form id="shop-step-form" class="flex flex-col">' +
      '<section class="shop-zone-panel" aria-label="Delivery zones and prices">' +
      '<header class="shop-zone-panel__head">' +
      '<span class="material-symbols-outlined shop-zone-panel__icon" aria-hidden="true">local_shipping</span>' +
      "<h2>Delivery Zones &amp; Prices</h2></header>" +
      zoneRows +
      (zoneNote ? '<p class="shop-zone-panel__note">' + escapeHtml(zoneNote) + "</p>" : "") +
      "</section>" +
      '<div class="mt-10">' +
      '<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-4">' +
      '<h2 class="font-montserrat text-sm font-medium tracking-[-0.02em] text-white">Select turnaround time</h2>' +
      (cfg.turnaroundHint
        ? '<p class="text-sm text-white/40">' + escapeHtml(cfg.turnaroundHint) + "</p>"
        : "") +
      "</div>" +
      '<div class="shop-turn-grid">' +
      turnCards +
      "</div></div>" +
      dateBlock +
      '<div class="mt-10 flex justify-between gap-4">' +
      '<button type="button" data-back class="font-montserrat text-[11px] uppercase tracking-[0.2em] text-white/45 hover:text-white transition-colors">Back</button>' +
      '<button class="inline-flex bg-primary px-8 py-4 font-montserrat text-xs font-semibold uppercase tracking-[0.22em] text-on-primary hover:opacity-80 transition-opacity" type="submit">Continue</button>' +
      "</div></form>"
    );
  }

  function render() {
    const t = totals();
    if (confirmed) {
      const order = readOrder();
      const email = order && order.customer ? order.customer.email : "";
      const receiptNote = order && order.receiptSent
        ? "A receipt has been sent to " + email + "."
        : email
          ? "We couldn’t reach " + email + " just now. Download a copy of your receipt below."
          : "Download a copy of your receipt below.";
      root.innerHTML =
        '<div class="max-w-2xl">' +
        '<p class="font-montserrat text-[11px] uppercase tracking-[0.28em] text-white/45 mb-4">Shop / Order</p>' +
        '<h1 class="font-montserrat text-[clamp(2.5rem,5vw,4rem)] font-medium tracking-[-0.03em] text-white leading-[1.05]">Order confirmed.</h1>' +
        '<p class="mt-5 text-white/50 max-w-lg">' +
        escapeHtml(receiptNote) +
        "</p>" +
        (order
          ? '<p class="mt-8 font-montserrat text-[11px] uppercase tracking-[0.2em] text-white/40">Order ' +
            escapeHtml(order.id) +
            "</p>" +
            '<ul class="mt-6 divide-y divide-white/[0.08] border-y border-white/[0.08]">' +
            (order.items || [])
              .map(function (item) {
                return (
                  '<li class="flex justify-between gap-4 py-4 text-sm"><span>' +
                  escapeHtml(item.name) +
                  " × " +
                  item.qty +
                  "</span><span>" +
                  formatKes(item.price * item.qty) +
                  "</span></li>"
                );
              })
              .join("") +
            "</ul>" +
            '<p class="mt-4 text-sm text-white/45">' +
            escapeHtml(order.paymentLabel || "") +
            (order.paymentRef ? " · " + escapeHtml(order.paymentRef) : "") +
            "</p>" +
            (order.shipping
              ? '<p class="mt-3 text-sm text-white/45">' +
                escapeHtml(order.shipping.label || "Delivery") +
                (order.shipping.deliveryDate
                  ? " · " + escapeHtml(formatDisplayDate(order.shipping.deliveryDate))
                  : "") +
                "</p>"
              : "") +
            '<p class="mt-6 font-montserrat text-lg text-white">Total ' +
            formatKes(order.total) +
            "</p>"
          : "") +
        '<div class="mt-10 flex flex-wrap gap-4">' +
        (order
          ? '<button type="button" data-download-receipt class="inline-flex border border-outline px-8 py-4 font-montserrat text-xs font-semibold uppercase tracking-[0.22em] text-on-surface transition-colors hover:bg-primary hover:text-on-primary">Download receipt</button>'
          : "") +
        '<a href="index.html" class="inline-flex border border-outline px-8 py-4 font-montserrat text-xs font-semibold uppercase tracking-[0.22em] text-on-surface transition-colors hover:bg-primary hover:text-on-primary">Back to shop</a>' +
        "</div></div>";
      return;
    }

    if (!t.items.length) {
      root.innerHTML =
        '<div class="max-w-xl">' +
        '<h1 class="font-montserrat text-4xl tracking-[-0.03em] text-white font-medium">Your cart is empty.</h1>' +
        '<a href="index.html" class="mt-8 inline-flex border border-outline px-8 py-4 font-montserrat text-xs uppercase tracking-[0.22em]">Return to shop</a>' +
        "</div>";
      return;
    }

    let body = "";
    if (step === 1) {
      body =
        '<form id="shop-step-form" class="grid grid-cols-1 gap-8 md:grid-cols-2">' +
        field("name", "Full name", "text", draft.name, "required autocomplete='name'") +
        field("email", "Email", "email", draft.email, "required autocomplete='email'") +
        field("phone", "Phone", "tel", draft.phone, "required autocomplete='tel'") +
        field("city", "City", "text", draft.city, "required autocomplete='address-level2'") +
        '<div class="md:col-span-2">' +
        field("address", "Address", "text", draft.address, "required autocomplete='street-address'") +
        "</div>" +
        '<div class="md:col-span-2 flex justify-end pt-2">' +
        '<button class="inline-flex bg-primary px-8 py-4 font-montserrat text-xs font-semibold uppercase tracking-[0.22em] text-on-primary hover:opacity-80 transition-opacity" type="submit">Continue</button>' +
        "</div></form>";
    } else if (step === 2) {
      body = deliveryStep(t);
    } else if (step === 3) {
      const cardOpen = draft.payMethod === "card";
      body =
        '<form id="shop-step-form" class="flex flex-col gap-2">' +
        '<label class="shop-radio' +
        (draft.payMethod === "mpesa" ? " is-active" : "") +
        '"><input class="sr-only" type="radio" name="payMethod" value="mpesa" ' +
        (draft.payMethod === "mpesa" ? "checked" : "") +
        '/><span class="shop-radio__mark"></span><span><span class="font-montserrat text-sm text-white">M-Pesa</span><span class="mt-1 block text-sm text-white/40">Safaricom Daraja — placeholder STK Push</span></span></label>' +
        '<label class="shop-radio' +
        (cardOpen ? " is-active" : "") +
        '"><input class="sr-only" type="radio" name="payMethod" value="card" ' +
        (cardOpen ? "checked" : "") +
        '/><span class="shop-radio__mark"></span><span><span class="font-montserrat text-sm text-white">Card</span><span class="mt-1 block text-sm text-white/40">Visa / Mastercard — placeholder processor</span></span></label>' +
        (draft.payMethod === "mpesa"
          ? '<div class="pt-6">' +
            field("mpesaPhone", "M-Pesa number", "tel", draft.mpesaPhone || draft.phone, "required") +
            "</div>"
          : '<div class="grid grid-cols-1 gap-8 pt-6 md:grid-cols-2">' +
            '<div class="md:col-span-2">' +
            field("cardName", "Name on card", "text", draft.cardName, "required") +
            "</div>" +
            '<div class="md:col-span-2">' +
            field("cardNumber", "Card number", "text", draft.cardNumber, "required inputmode='numeric' autocomplete='cc-number'") +
            "</div>" +
            field("cardExpiry", "Expiry", "text", draft.cardExpiry, "required placeholder='MM/YY' autocomplete='cc-exp'") +
            field("cardCvc", "CVC", "text", draft.cardCvc, "required inputmode='numeric' autocomplete='cc-csc'") +
            "</div>") +
        '<div class="mt-10 flex justify-between gap-4">' +
        '<button type="button" data-back class="font-montserrat text-[11px] uppercase tracking-[0.2em] text-white/45 hover:text-white transition-colors">Back</button>' +
        '<button class="inline-flex bg-primary px-8 py-4 font-montserrat text-xs font-semibold uppercase tracking-[0.22em] text-on-primary hover:opacity-80 transition-opacity" type="submit">Continue</button>' +
        "</div></form>";
    } else {
      body =
        '<div>' +
        '<dl class="space-y-4 text-sm">' +
        '<div><dt class="font-montserrat text-[11px] uppercase tracking-[0.18em] text-white/40">Ship to</dt><dd class="mt-1 text-white">' +
        escapeHtml(draft.name) +
        "<br/>" +
        escapeHtml(draft.address) +
        ", " +
        escapeHtml(draft.city) +
        "<br/>" +
        escapeHtml(draft.phone) +
        " · " +
        escapeHtml(draft.email) +
        "</dd></div>" +
        '<div><dt class="font-montserrat text-[11px] uppercase tracking-[0.18em] text-white/40">Delivery zone</dt><dd class="mt-1 text-white">' +
        escapeHtml(getDeliveryZone(t.shipping.zoneId).label) +
        '<span class="block text-white/45">' +
        escapeHtml(getDeliveryZone(t.shipping.zoneId).detail) +
        "</span></dd></div>" +
        '<div><dt class="font-montserrat text-[11px] uppercase tracking-[0.18em] text-white/40">Turnaround</dt><dd class="mt-1 text-white">' +
        escapeHtml(t.shipping.turnaroundLabel) +
        (t.shipping.turnaroundExtra
          ? " · +" + formatKes(t.shipping.turnaroundExtra)
          : " · no extra") +
        "</dd></div>" +
        '<div><dt class="font-montserrat text-[11px] uppercase tracking-[0.18em] text-white/40">Delivery date</dt><dd class="mt-1 text-white">' +
        escapeHtml(
          t.shipping.deliveryDate
            ? formatDisplayDate(t.shipping.deliveryDate)
            : "After production · " + formatDisplayDate(t.shipping.earliestDate)
        ) +
        "</dd></div>" +
        '<div><dt class="font-montserrat text-[11px] uppercase tracking-[0.18em] text-white/40">Payment</dt><dd class="mt-1 text-white">' +
        (draft.payMethod === "mpesa" ? "M-Pesa · " + escapeHtml(draft.mpesaPhone || draft.phone) : "Card") +
        "</dd></div></dl>" +
        '<ul class="mt-8 divide-y divide-white/[0.08] border-y border-white/[0.08]">' +
        t.items
          .map(function (item) {
            return (
              '<li class="flex justify-between gap-4 py-4 text-sm"><span>' +
              escapeHtml(item.name) +
              " × " +
              item.qty +
              "</span><span>" +
              formatKes(item.price * item.qty) +
              "</span></li>"
            );
          })
          .join("") +
        "</ul>" +
        '<div class="mt-10 flex justify-between gap-4">' +
        '<button type="button" data-back class="font-montserrat text-[11px] uppercase tracking-[0.2em] text-white/45 hover:text-white transition-colors">Back</button>' +
        '<button type="button" data-confirm class="inline-flex bg-primary px-8 py-4 font-montserrat text-xs font-semibold uppercase tracking-[0.22em] text-on-primary hover:opacity-80 transition-opacity disabled:opacity-40" ' +
        (busy ? "disabled" : "") +
        ">" +
        (busy ? "Processing…" : "Confirm order") +
        "</button></div></div>";
    }

    root.innerHTML =
      '<div class="grid grid-cols-1 gap-16 lg:grid-cols-12">' +
      '<div class="lg:col-span-7">' +
      '<p class="font-montserrat text-[11px] uppercase tracking-[0.28em] text-white/45 mb-4">Shop / Checkout</p>' +
      '<h1 class="font-montserrat text-[clamp(2.25rem,4vw,3.5rem)] font-medium tracking-[-0.03em] text-white leading-[1.05] mb-10">Checkout</h1>' +
      progress(step) +
      (error ? '<p class="mb-6 text-sm text-white/55" role="alert">' + escapeHtml(error) + "</p>" : "") +
      body +
      "</div>" +
      '<aside class="lg:col-span-5 lg:pt-24">' +
      '<p class="font-montserrat text-[11px] uppercase tracking-[0.2em] text-white/40">Bag</p>' +
      '<ul class="mt-4 space-y-3 text-sm text-white/70">' +
      t.items
        .map(function (item) {
          return (
            "<li>" + escapeHtml(item.name) + " × " + item.qty + "</li>"
          );
        })
        .join("") +
      "</ul>" +
      summary(t) +
      "</aside></div>";
  }

  function collectForm(form) {
    const data = new FormData(form);
    data.forEach(function (value, key) {
      draft[key] = String(value);
    });
    persist();
  }

  root.addEventListener("click", function (event) {
    if (event.target.closest("[data-back]")) {
      error = "";
      step = Math.max(1, step - 1);
      render();
      return;
    }
    if (event.target.closest("[data-download-receipt]")) {
      const order = readOrder();
      if (order) downloadReceiptFile(order);
      return;
    }
    if (event.target.closest("[data-confirm]")) {
      void confirmOrder();
    }
  });

  root.addEventListener("change", function (event) {
    const form = root.querySelector("#shop-step-form");
    if (form) collectForm(form);
    const t = event.target;
    if (t && t.name === "payMethod") {
      draft.payMethod = t.value;
      persist();
      render();
    }
    if (t && (t.name === "zoneId" || t.name === "turnaroundId" || t.name === "deliveryDate")) {
      persist();
      render();
    }
  });

  root.addEventListener("submit", function (event) {
    const form = event.target.closest("#shop-step-form");
    if (!form) return;
    event.preventDefault();
    error = "";
    collectForm(form);
    if (step === 1 && (!draft.name || !draft.email || !draft.phone || !draft.address || !draft.city)) {
      error = "Please complete shipping details.";
      render();
      return;
    }
    if (step === 1 && !isValidEmail(draft.email)) {
      error = "Enter a valid email so we can send your receipt.";
      render();
      return;
    }
    if (step === 2) {
      persist();
      const zone = getDeliveryZone(draft.zoneId);
      const turnaround = getTurnaround(draft.turnaroundId);
      const minDate = earliestIsoDate(draft.turnaroundId);
      if (!draft.zoneId) {
        error = "Tap your delivery zone to lock in the rate.";
        render();
        return;
      }
      if (turnaround.nairobiOnly && !zone.nairobi) {
        error = "Rush is only available for Nairobi zones. Choose Express or Standard.";
        render();
        return;
      }
      if (draft.deliveryDate && draft.deliveryDate < minDate) {
        error =
          "That date is earlier than we can produce this order. Pick " +
          formatDisplayDate(minDate) +
          " or later.";
        render();
        return;
      }
    }
    step += 1;
    render();
  });

  async function confirmOrder() {
    if (busy) return;
    busy = true;
    error = "";
    render();
    const t = totals();
    let pay;
    if (draft.payMethod === "mpesa") {
      pay = await mockMpesaPayment(draft.mpesaPhone || draft.phone);
    } else {
      pay = await mockCardPayment();
    }
    if (!pay.ok) {
      busy = false;
      error = pay.error || "Payment could not be completed.";
      render();
      return;
    }
    const order = {
      id: "ONK-" + String(Date.now()).slice(-8),
      items: t.items,
      total: t.total,
      shipping: t.shipping,
      paymentLabel: pay.provider === "mpesa" ? "M-Pesa" : "Card",
      paymentRef: pay.ref,
      customer: {
        name: draft.name,
        email: draft.email,
        phone: draft.phone,
        address: draft.address,
        city: draft.city,
      },
      createdAt: Date.now(),
    };
    const receipt = await sendOrderReceipt(order);
    order.receiptSent = Boolean(receipt.ok);
    order.receiptError = receipt.ok ? "" : receipt.error || "";
    saveOrder(order);
    addOrder(order);
    clearCart();
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    confirmed = true;
    busy = false;
    history.replaceState(null, "", "checkout.html?confirmed=1");
    render();
  }

  render();
}
