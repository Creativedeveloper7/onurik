import { cartSubtotal, clearCart, getCart } from "./cart-store.js";
import { getSelectedShipping, writeShip } from "./CartPage.js";
import {
  SHIPPING_METHODS,
  escapeAttr,
  escapeHtml,
  formatKes,
} from "./format.js";
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
  let step = 1;
  let draft = Object.assign(
    {
      name: "",
      address: "",
      city: "",
      phone: "",
      email: "",
      shippingId: getSelectedShipping().id,
      payMethod: "mpesa",
      cardName: "",
      cardNumber: "",
      cardExpiry: "",
      cardCvc: "",
      mpesaPhone: "",
    },
    readDraft()
  );
  let busy = false;
  let error = "";
  let confirmed = Boolean(new URLSearchParams(location.search).get("confirmed"));

  function persist() {
    writeDraft(draft);
    writeShip(draft.shippingId);
  }

  function totals() {
    const items = getCart();
    const shipping =
      SHIPPING_METHODS.find(function (m) {
        return m.id === draft.shippingId;
      }) || SHIPPING_METHODS[0];
    const subtotal = cartSubtotal();
    return {
      items: items,
      shipping: shipping,
      subtotal: subtotal,
      total: subtotal + (items.length ? shipping.price : 0),
    };
  }

  function summary(t) {
    return (
      '<dl class="mt-8 space-y-3 border-t border-white/[0.08] pt-6 font-montserrat text-sm">' +
      '<div class="flex justify-between text-white/55"><dt>Subtotal</dt><dd class="text-white">' +
      formatKes(t.subtotal) +
      "</dd></div>" +
      '<div class="flex justify-between text-white/55"><dt>Shipping</dt><dd class="text-white">' +
      (t.shipping.price ? formatKes(t.shipping.price) : "Free") +
      "</dd></div>" +
      '<div class="flex justify-between border-t border-white/[0.08] pt-3 text-white"><dt class="uppercase tracking-[0.16em] text-[11px]">Bag Total</dt><dd class="text-lg">' +
      formatKes(t.total) +
      "</dd></div></dl>"
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
      body =
        '<form id="shop-step-form" class="flex flex-col">' +
        SHIPPING_METHODS.map(function (m) {
          return (
            '<label class="shop-radio' +
            (draft.shippingId === m.id ? " is-active" : "") +
            '">' +
            '<input class="sr-only" type="radio" name="shippingId" value="' +
            m.id +
            '" ' +
            (draft.shippingId === m.id ? "checked" : "") +
            "/>" +
            '<span class="shop-radio__mark" aria-hidden="true"></span>' +
            '<span class="flex-1"><span class="flex justify-between gap-4 font-montserrat text-sm text-white"><span>' +
            escapeHtml(m.label) +
            "</span><span>" +
            (m.price ? formatKes(m.price) : "Free") +
            "</span></span>" +
            '<span class="mt-1 block text-sm text-white/40">' +
            escapeHtml(m.detail) +
            "</span></span></label>"
          );
        }).join("") +
        '<div class="mt-10 flex justify-between gap-4">' +
        '<button type="button" data-back class="font-montserrat text-[11px] uppercase tracking-[0.2em] text-white/45 hover:text-white transition-colors">Back</button>' +
        '<button class="inline-flex bg-primary px-8 py-4 font-montserrat text-xs font-semibold uppercase tracking-[0.22em] text-on-primary hover:opacity-80 transition-opacity" type="submit">Continue</button>' +
        "</div></form>";
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
        '<div><dt class="font-montserrat text-[11px] uppercase tracking-[0.18em] text-white/40">Delivery</dt><dd class="mt-1 text-white">' +
        escapeHtml(t.shipping.label) +
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
    if (t && t.name === "shippingId") {
      draft.shippingId = t.value;
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
