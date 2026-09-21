import {
  addAdFromFile,
  addAdFromUrl,
  deleteAd,
  formatAdSize,
  listAdsResolved,
  moveAd,
  setAdPublished,
} from "../shop/ads-store.js";
import { CATEGORIES, GENDERS, categoryLabel, formatKes, genderLabel } from "../shop/format.js";
import {
  defaultDeliveryConfig,
  deliveryConfigError,
  loadDeliveryConfig,
  normalizeDeliveryConfig,
  saveDeliveryConfig,
} from "../shop/delivery-config.js";
import {
  deleteOrder,
  listOrders,
  ORDER_STATUSES,
  updateOrderStatus,
} from "../shop/orders-store.js";
import {
  catalogError,
  deleteProduct,
  getCatalog,
  loadCatalog,
  resetCatalog,
  saveProduct,
  slugifyProductId,
} from "../shop/products.js";

const AUTH_KEY = "onurik.admin.auth";
const ADMIN_PASSWORD = "onurik-admin";
const MAX_IMAGES = 8;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function showToast(message) {
  const toast = document.getElementById("admin-toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(function () {
    toast.classList.remove("is-visible");
  }, 2800);
}

function ensureAuthGate() {
  const gate = document.getElementById("admin-auth-gate");
  if (!gate) return true;
  if (window.sessionStorage.getItem(AUTH_KEY) === "ok") {
    gate.classList.add("hidden");
    return true;
  }
  const form = document.getElementById("admin-auth-form");
  const input = document.getElementById("admin-password");
  const error = document.getElementById("admin-auth-error");
  if (!form || !input || !error) return false;
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (input.value === ADMIN_PASSWORD) {
      window.sessionStorage.setItem(AUTH_KEY, "ok");
      gate.classList.add("hidden");
      showToast("Admin unlocked.");
      initShopAdmin();
      return;
    }
    error.textContent = "Invalid password.";
  });
  return false;
}

function compressImageFile(file, maxWidth, quality) {
  return new Promise(function (resolve, reject) {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = function () {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > maxWidth) {
        h = Math.round((h * maxWidth) / w);
        w = maxWidth;
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("no canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        function (blob) {
          if (!blob) {
            reject(new Error("blob"));
            return;
          }
          const reader = new FileReader();
          reader.onload = function () {
            resolve(String(reader.result || ""));
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      reject(new Error("image"));
    };
    img.src = url;
  });
}

let editingId = "";
let galleryImages = [];
let colorRows = [{ label: "Ink", hex: "#1a1a1a" }];

function setTab(name) {
  const products = document.getElementById("shop-panel-products");
  const orders = document.getElementById("shop-panel-orders");
  const ads = document.getElementById("shop-panel-ads");
  const delivery = document.getElementById("shop-panel-delivery");
  document.querySelectorAll("[data-shop-tab]").forEach(function (btn) {
    btn.classList.toggle("is-active", btn.getAttribute("data-shop-tab") === name);
  });
  if (products) products.hidden = name !== "products";
  if (orders) orders.hidden = name !== "orders";
  if (ads) ads.hidden = name !== "ads";
  if (delivery) delivery.hidden = name !== "delivery";
  if (name === "orders") renderOrders();
  if (name === "ads") renderAds();
  if (name === "delivery") renderDelivery();
}

function renderGallery() {
  const list = document.getElementById("product-images-list");
  const hint = document.getElementById("product-images-hint");
  if (!list) return;
  if (!galleryImages.length) {
    list.innerHTML =
      '<p class="col-span-full rounded border border-dashed border-outline-variant/40 px-3 py-6 text-center text-xs text-on-surface-variant">No images yet — add a URL or upload files.</p>';
    if (hint) hint.textContent = "First image is the shop cover. Up to " + MAX_IMAGES + " images.";
    return;
  }
  list.innerHTML = galleryImages
    .map(function (src, index) {
      return (
        '<div class="relative overflow-hidden rounded border border-outline-variant/40 bg-surface-container">' +
        '<img src="' +
        escapeHtml(src) +
        '" alt="" class="h-28 w-full object-cover"/>' +
        (index === 0
          ? '<span class="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white">Cover</span>'
          : "") +
        '<div class="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-black/70 p-1">' +
        '<button type="button" data-gallery-action="remove" data-gallery-index="' +
        index +
        '" class="inline-flex min-h-8 min-w-8 items-center justify-center rounded text-white/80 hover:bg-white/15" aria-label="Remove image"><span class="material-symbols-outlined text-base">close</span></button>' +
        "</div></div>"
      );
    })
    .join("");
  if (hint) hint.textContent = galleryImages.length + " / " + MAX_IMAGES + " images · first is cover";
}

function addGalleryImage(src) {
  const value = typeof src === "string" ? src.trim() : "";
  if (!value) return false;
  if (galleryImages.indexOf(value) !== -1) {
    showToast("That image is already in the gallery.");
    return false;
  }
  if (galleryImages.length >= MAX_IMAGES) {
    showToast("Maximum of " + MAX_IMAGES + " images.");
    return false;
  }
  galleryImages.push(value);
  renderGallery();
  return true;
}

function renderColors() {
  const list = document.getElementById("product-colors-list");
  if (!list) return;
  if (!colorRows.length) colorRows = [{ label: "Ink", hex: "#1a1a1a" }];
  list.innerHTML = colorRows
    .map(function (row, index) {
      return (
        '<div class="grid grid-cols-[1fr_5.5rem_2.5rem] gap-2">' +
        '<input data-color-label="' +
        index +
        '" class="rounded border border-outline-variant/40 bg-surface-container px-3 py-2 text-sm" type="text" placeholder="Colour name" value="' +
        escapeHtml(row.label || "") +
        '"/>' +
        '<input data-color-hex="' +
        index +
        '" class="rounded border border-outline-variant/40 bg-surface-container px-2 py-2 text-sm" type="text" value="' +
        escapeHtml(row.hex || "#1a1a1a") +
        '"/>' +
        '<button type="button" data-color-remove="' +
        index +
        '" class="inline-flex items-center justify-center rounded border border-outline-variant/40 text-white/50 hover:text-white" aria-label="Remove colour"><span class="material-symbols-outlined text-base">close</span></button>' +
        "</div>"
      );
    })
    .join("");
}

function readColors() {
  const list = document.getElementById("product-colors-list");
  if (!list) return colorRows;
  const labels = Array.from(list.querySelectorAll("[data-color-label]"));
  colorRows = labels.map(function (input, index) {
    const hexInput = list.querySelector('[data-color-hex="' + index + '"]');
    return {
      label: input.value.trim(),
      hex: hexInput ? hexInput.value.trim() || "#1a1a1a" : "#1a1a1a",
    };
  });
  return colorRows
    .filter(function (row) {
      return row.label;
    })
    .map(function (row) {
      return {
        id: row.label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        label: row.label,
        hex: row.hex,
      };
    });
}

function resetForm() {
  editingId = "";
  galleryImages = [];
  colorRows = [{ label: "Ink", hex: "#1a1a1a" }];
  const form = document.getElementById("product-form");
  if (form) form.reset();
  const idInput = document.getElementById("product-id");
  if (idInput) idInput.value = "";
  document.getElementById("product-in-stock").checked = true;
  document.getElementById("product-published").checked = true;
  document.getElementById("product-sizes").value = "S, M, L, XL";
  const submit = document.getElementById("product-submit-btn");
  if (submit) submit.textContent = "Save product";
  const cancel = document.getElementById("product-cancel-btn");
  if (cancel) cancel.hidden = true;
  renderGallery();
  renderColors();
}

function fillForm(product) {
  editingId = product.id;
  galleryImages = (product.images || []).slice();
  colorRows = (product.colors || []).map(function (c) {
    return { label: c.label, hex: c.hex };
  });
  document.getElementById("product-id").value = product.id;
  document.getElementById("product-name").value = product.name || "";
  document.getElementById("product-gender").value = product.gender || "men";
  document.getElementById("product-category").value = product.category || "t-shirts";
  document.getElementById("product-price").value = product.price || "";
  document.getElementById("product-original-price").value = product.originalPrice || "";
  document.getElementById("product-sizes").value = (product.sizes || []).join(", ");
  document.getElementById("product-description").value = product.description || "";
  document.getElementById("product-in-stock").checked = product.inStock !== false;
  document.getElementById("product-published").checked = product.published !== false;
  document.getElementById("product-submit-btn").textContent = "Update product";
  document.getElementById("product-cancel-btn").hidden = false;
  renderGallery();
  renderColors();
}

function renderProducts() {
  const body = document.getElementById("products-body");
  if (!body) return;
  const catalog = getCatalog();
  const count = document.getElementById("products-count");
  if (count) count.textContent = catalog.length + (catalog.length === 1 ? " piece" : " pieces");
  const err = catalogError();
  if (err && !catalog.length) {
    body.innerHTML =
      '<tr><td colspan="7" class="p-10 text-center text-on-surface-variant">' +
      escapeHtml(err) +
      "</td></tr>";
    return;
  }
  if (!catalog.length) {
    body.innerHTML =
      '<tr><td colspan="7" class="p-10 text-center text-on-surface-variant">No products yet. Add the first piece on the left.</td></tr>';
    return;
  }
  body.innerHTML = catalog
    .map(function (product) {
      const cover = product.images && product.images[0] ? product.images[0] : "";
      const sale = product.originalPrice && product.originalPrice > product.price;
      return (
        "<tr class=\"border-b border-outline-variant/20\">" +
        '<td class="p-3"><div class="h-14 w-11 overflow-hidden bg-[#1c1b1b]">' +
        (cover
          ? '<img src="' + escapeHtml(cover) + '" alt="" class="h-full w-full object-cover"/>'
          : "") +
        "</div></td>" +
        '<td class="p-3"><p class="text-sm text-white">' +
        escapeHtml(product.name) +
        '</p><p class="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/35">' +
        escapeHtml(product.id) +
        "</p></td>" +
        '<td class="p-3 text-sm text-white/70">' +
        escapeHtml(genderLabel(product.gender)) +
        " · " +
        escapeHtml(categoryLabel(product.category)) +
        "</td>" +
        '<td class="p-3 text-sm">' +
        (sale
          ? '<span class="mr-2 text-white/35 line-through">' + formatKes(product.originalPrice) + "</span>"
          : "") +
        formatKes(product.price) +
        "</td>" +
        '<td class="p-3 text-[11px] uppercase tracking-[0.14em] text-white/50">' +
        (product.inStock ? "In stock" : "Sold out") +
        "</td>" +
        '<td class="p-3 text-[11px] uppercase tracking-[0.14em] text-white/50">' +
        (product.published === false ? "Hidden" : "Live") +
        "</td>" +
        '<td class="p-3 text-right whitespace-nowrap">' +
        '<button type="button" data-product-edit="' +
        escapeHtml(product.id) +
        '" class="mr-2 text-[11px] uppercase tracking-[0.14em] text-white/70 hover:text-white">Edit</button>' +
        '<button type="button" data-product-delete="' +
        escapeHtml(product.id) +
        '" class="text-[11px] uppercase tracking-[0.14em] text-white/40 hover:text-white">Delete</button>' +
        "</td></tr>"
      );
    })
    .join("");
}

function renderOrders() {
  const body = document.getElementById("orders-body");
  if (!body) return;
  const orders = listOrders();
  const count = document.getElementById("orders-count");
  if (count) count.textContent = orders.length + (orders.length === 1 ? " order" : " orders");
  if (!orders.length) {
    body.innerHTML =
      '<tr><td colspan="7" class="p-10 text-center text-on-surface-variant">No orders yet. Confirmed checkouts from the public shop appear here.</td></tr>';
    return;
  }
  body.innerHTML = orders
    .map(function (order) {
      const customer = order.customer || {};
      const statusOpts = ORDER_STATUSES.map(function (s) {
        return (
          '<option value="' +
          s.id +
          '"' +
          (order.status === s.id ? " selected" : "") +
          ">" +
          s.label +
          "</option>"
        );
      }).join("");
      const lines = (order.items || [])
        .map(function (item) {
          return (
            escapeHtml(item.name) +
            " × " +
            item.qty +
            (item.size ? " · " + escapeHtml(item.size) : "")
          );
        })
        .join("<br/>");
      const when = order.createdAt
        ? new Date(order.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
        : "—";
      return (
        "<tr class=\"border-b border-outline-variant/20 align-top\">" +
        '<td class="p-3"><p class="text-sm text-white">' +
        escapeHtml(order.id) +
        '</p><p class="mt-1 text-[11px] text-white/40">' +
        escapeHtml(when) +
        "</p></td>" +
        '<td class="p-3 text-sm">' +
        escapeHtml(customer.name || "—") +
        '<p class="mt-1 text-xs text-white/40">' +
        escapeHtml(customer.email || "") +
        "<br/>" +
        escapeHtml(customer.phone || "") +
        "</p></td>" +
        '<td class="p-3 text-xs text-white/70 leading-relaxed">' +
        lines +
        "</td>" +
        '<td class="p-3 text-sm">' +
        formatKes(order.total) +
        '<p class="mt-1 text-[11px] uppercase tracking-[0.12em] text-white/35">' +
        escapeHtml(order.paymentLabel || "") +
        "</p></td>" +
        '<td class="p-3 text-xs text-white/55">' +
        escapeHtml((order.shipping && order.shipping.label) || "—") +
        (order.shipping && order.shipping.deliveryDate
          ? '<br/><span class="text-white/35">' +
            escapeHtml(order.shipping.deliveryDate) +
            "</span>"
          : "") +
        "<br/>" +
        escapeHtml(customer.city || "") +
        "</td>" +
        '<td class="p-3"><select data-order-status="' +
        escapeHtml(order.id) +
        '" class="rounded border border-outline-variant/40 bg-surface-container px-2 py-1.5 text-xs uppercase tracking-[0.12em]">' +
        statusOpts +
        "</select></td>" +
        '<td class="p-3 text-right"><button type="button" data-order-delete="' +
        escapeHtml(order.id) +
        '" class="text-[11px] uppercase tracking-[0.14em] text-white/40 hover:text-white">Delete</button></td>' +
        "</tr>"
      );
    })
    .join("");
}

async function renderAds() {
  const list = document.getElementById("ads-list");
  const count = document.getElementById("ads-count");
  if (!list) return;
  (renderAds.previewUrls || []).forEach(function (url) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  });
  renderAds.previewUrls = [];
  const ads = await listAdsResolved();
  renderAds.previewUrls = ads
    .filter(function (ad) {
      return ad.source === "file" && ad.playUrl;
    })
    .map(function (ad) {
      return ad.playUrl;
    });
  if (count) count.textContent = ads.length + (ads.length === 1 ? " ad" : " ads");
  if (!ads.length) {
    list.innerHTML =
      '<div class="rounded border border-outline-variant/30 bg-surface-container-low p-10 text-center text-sm text-on-surface-variant">No video ads yet. Upload a clip and it will loop at the top of the public shop.</div>';
    return;
  }
  list.innerHTML = ads
    .map(function (ad, index) {
      return (
        '<article class="overflow-hidden rounded border border-outline-variant/30 bg-surface-container-low">' +
        '<div class="grid grid-cols-1 sm:grid-cols-[220px_1fr]">' +
        '<div class="relative aspect-video bg-black sm:aspect-auto sm:min-h-[140px]">' +
        (ad.playUrl
          ? '<video class="h-full w-full object-cover" src="' +
            escapeHtml(ad.playUrl) +
            '" muted playsinline preload="metadata"></video>'
          : "") +
        "</div>" +
        '<div class="flex flex-col justify-between gap-4 p-4">' +
        '<div>' +
        '<p class="font-montserrat text-sm text-white">' +
        escapeHtml(ad.title || "Untitled clip") +
        "</p>" +
        '<p class="mt-1 text-xs text-white/40">' +
        escapeHtml(ad.source === "url" ? "Direct URL" : ad.filename || "Upload") +
        (ad.size ? " · " + formatAdSize(ad.size) : "") +
        (ad.published === false ? " · Hidden" : " · Live") +
        "</p></div>" +
        '<div class="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.14em]">' +
        '<label class="inline-flex cursor-pointer items-center gap-2 text-white/70">' +
        '<input type="checkbox" data-ad-live="' +
        escapeHtml(ad.id) +
        '"' +
        (ad.published === false ? "" : " checked") +
        ' class="rounded border-outline-variant/40 bg-surface-container"/> Live</label>' +
        '<button type="button" data-ad-up="' +
        escapeHtml(ad.id) +
        '" class="text-white/45 hover:text-white"' +
        (index === 0 ? " disabled" : "") +
        ">Up</button>" +
        '<button type="button" data-ad-down="' +
        escapeHtml(ad.id) +
        '" class="text-white/45 hover:text-white"' +
        (index === ads.length - 1 ? " disabled" : "") +
        ">Down</button>" +
        '<button type="button" data-ad-delete="' +
        escapeHtml(ad.id) +
        '" class="ml-auto text-white/35 hover:text-white">Delete</button>' +
        "</div></div></div></article>"
      );
    })
    .join("");
}

function collectProduct() {
  const name = document.getElementById("product-name").value.trim();
  const sizes = document
    .getElementById("product-sizes")
    .value.split(",")
    .map(function (s) {
      return s.trim();
    })
    .filter(Boolean);
  const origRaw = document.getElementById("product-original-price").value.trim();
  return {
    id: editingId || document.getElementById("product-id").value.trim() || slugifyProductId(name),
    name: name,
    gender: document.getElementById("product-gender").value,
    category: document.getElementById("product-category").value,
    price: document.getElementById("product-price").value,
    originalPrice: origRaw,
    images: galleryImages.slice(),
    sizes: sizes,
    colors: readColors(),
    description: document.getElementById("product-description").value,
    inStock: document.getElementById("product-in-stock").checked,
    published: document.getElementById("product-published").checked,
  };
}

let deliveryDraft = defaultDeliveryConfig();

function setDeliveryStatus(msg, isErr) {
  const el = document.getElementById("delivery-status");
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle("text-red-400", Boolean(isErr));
  el.classList.toggle("text-on-surface-variant", !isErr);
}

function fillDeliveryDefaults(cfg) {
  const zoneSel = document.getElementById("delivery-default-zone");
  const turnSel = document.getElementById("delivery-default-turn");
  if (zoneSel) {
    zoneSel.innerHTML = cfg.zones
      .map(function (zone) {
        return (
          '<option value="' +
          escapeHtml(zone.id) +
          '"' +
          (zone.id === cfg.defaultZoneId ? " selected" : "") +
          ">" +
          escapeHtml(zone.label) +
          "</option>"
        );
      })
      .join("");
  }
  if (turnSel) {
    turnSel.innerHTML = cfg.turnaround
      .map(function (item) {
        return (
          '<option value="' +
          escapeHtml(item.id) +
          '"' +
          (item.id === cfg.defaultTurnaroundId ? " selected" : "") +
          ">" +
          escapeHtml(item.label) +
          "</option>"
        );
      })
      .join("");
  }
}

function renderDeliveryZones() {
  const list = document.getElementById("delivery-zones-list");
  if (!list) return;
  if (!deliveryDraft.zones.length) {
    list.innerHTML =
      '<p class="rounded border border-dashed border-outline-variant/40 px-3 py-6 text-center text-xs text-on-surface-variant">Add at least one zone.</p>';
    return;
  }
  list.innerHTML = deliveryDraft.zones
    .map(function (zone, index) {
      return (
        '<div class="grid grid-cols-1 gap-2 rounded border border-outline-variant/30 bg-surface-container p-3 md:grid-cols-12" data-delivery-zone>' +
        '<input type="hidden" data-zone-id value="' +
        escapeHtml(zone.id) +
        '"/>' +
        '<label class="md:col-span-3"><span class="mb-1 block text-[10px] uppercase tracking-[0.14em] text-white/35">Name</span>' +
        '<input data-zone-label class="w-full rounded border border-outline-variant/40 bg-surface-container-low px-3 py-2" type="text" value="' +
        escapeHtml(zone.label) +
        '" required/></label>' +
        '<label class="md:col-span-5"><span class="mb-1 block text-[10px] uppercase tracking-[0.14em] text-white/35">Areas</span>' +
        '<input data-zone-detail class="w-full rounded border border-outline-variant/40 bg-surface-container-low px-3 py-2" type="text" value="' +
        escapeHtml(zone.detail) +
        '"/></label>' +
        '<label class="md:col-span-2"><span class="mb-1 block text-[10px] uppercase tracking-[0.14em] text-white/35">Price (KSh)</span>' +
        '<input data-zone-price class="w-full rounded border border-outline-variant/40 bg-surface-container-low px-3 py-2" type="number" min="0" step="1" value="' +
        zone.price +
        '"/></label>' +
        '<div class="flex flex-wrap items-end justify-between gap-2 md:col-span-2">' +
        '<label class="inline-flex items-center gap-2 pb-2 text-xs text-white/70">' +
        '<input data-zone-nairobi type="checkbox"' +
        (zone.nairobi ? " checked" : "") +
        ' class="rounded border-outline-variant/40 bg-surface-container-low"/>Nairobi</label>' +
        '<div class="flex gap-1 pb-1">' +
        '<button type="button" data-zone-move="up" data-zone-index="' +
        index +
        '" class="px-2 text-white/35 hover:text-white" aria-label="Move up">↑</button>' +
        '<button type="button" data-zone-move="down" data-zone-index="' +
        index +
        '" class="px-2 text-white/35 hover:text-white" aria-label="Move down">↓</button>' +
        '<button type="button" data-zone-remove="' +
        index +
        '" class="px-2 text-white/35 hover:text-white" aria-label="Remove">✕</button>' +
        "</div></div></div>"
      );
    })
    .join("");
}

function renderDeliveryTurns() {
  const list = document.getElementById("delivery-turns-list");
  if (!list) return;
  if (!deliveryDraft.turnaround.length) {
    list.innerHTML =
      '<p class="rounded border border-dashed border-outline-variant/40 px-3 py-6 text-center text-xs text-on-surface-variant">Add at least one turnaround.</p>';
    return;
  }
  list.innerHTML = deliveryDraft.turnaround
    .map(function (item, index) {
      return (
        '<div class="grid grid-cols-1 gap-2 rounded border border-outline-variant/30 bg-surface-container p-3 md:grid-cols-12" data-delivery-turn>' +
        '<input type="hidden" data-turn-id value="' +
        escapeHtml(item.id) +
        '"/>' +
        '<label class="md:col-span-2"><span class="mb-1 block text-[10px] uppercase tracking-[0.14em] text-white/35">Name</span>' +
        '<input data-turn-label class="w-full rounded border border-outline-variant/40 bg-surface-container-low px-3 py-2" type="text" value="' +
        escapeHtml(item.label) +
        '" required/></label>' +
        '<label class="md:col-span-2"><span class="mb-1 block text-[10px] uppercase tracking-[0.14em] text-white/35">Time label</span>' +
        '<input data-turn-time class="w-full rounded border border-outline-variant/40 bg-surface-container-low px-3 py-2" type="text" value="' +
        escapeHtml(item.timeLabel) +
        '"/></label>' +
        '<label class="md:col-span-1"><span class="mb-1 block text-[10px] uppercase tracking-[0.14em] text-white/35">Days</span>' +
        '<input data-turn-days class="w-full rounded border border-outline-variant/40 bg-surface-container-low px-3 py-2" type="number" min="1" step="1" value="' +
        item.days +
        '"/></label>' +
        '<label class="md:col-span-2"><span class="mb-1 block text-[10px] uppercase tracking-[0.14em] text-white/35">Extra (KSh)</span>' +
        '<input data-turn-extra class="w-full rounded border border-outline-variant/40 bg-surface-container-low px-3 py-2" type="number" min="0" step="1" value="' +
        item.extra +
        '"/></label>' +
        '<label class="md:col-span-2"><span class="mb-1 block text-[10px] uppercase tracking-[0.14em] text-white/35">Regions</span>' +
        '<input data-turn-regions class="w-full rounded border border-outline-variant/40 bg-surface-container-low px-3 py-2" type="text" value="' +
        escapeHtml(item.regions) +
        '"/></label>' +
        '<div class="flex flex-wrap items-end justify-between gap-2 md:col-span-3">' +
        '<label class="inline-flex items-center gap-2 pb-2 text-xs text-white/70">' +
        '<input data-turn-nairobi type="checkbox"' +
        (item.nairobiOnly ? " checked" : "") +
        ' class="rounded border-outline-variant/40 bg-surface-container-low"/>Nairobi only</label>' +
        '<div class="flex gap-1 pb-1">' +
        '<button type="button" data-turn-move="up" data-turn-index="' +
        index +
        '" class="px-2 text-white/35 hover:text-white" aria-label="Move up">↑</button>' +
        '<button type="button" data-turn-move="down" data-turn-index="' +
        index +
        '" class="px-2 text-white/35 hover:text-white" aria-label="Move down">↓</button>' +
        '<button type="button" data-turn-remove="' +
        index +
        '" class="px-2 text-white/35 hover:text-white" aria-label="Remove">✕</button>' +
        "</div></div></div>"
      );
    })
    .join("");
}

function renderDelivery() {
  const cfg = deliveryDraft;
  const threshold = document.getElementById("delivery-threshold");
  const allowDate = document.getElementById("delivery-allow-date");
  const zoneNote = document.getElementById("delivery-zone-note");
  const turnHint = document.getElementById("delivery-turn-hint");
  const dateHint = document.getElementById("delivery-date-hint");
  if (threshold) threshold.value = cfg.freeDeliveryThreshold;
  if (allowDate) allowDate.checked = Boolean(cfg.allowDeliveryDate);
  if (zoneNote) zoneNote.value = cfg.zoneNote;
  if (turnHint) turnHint.value = cfg.turnaroundHint;
  if (dateHint) dateHint.value = cfg.dateHint;
  renderDeliveryZones();
  renderDeliveryTurns();
  fillDeliveryDefaults(cfg);
}

function collectDelivery() {
  const zones = Array.prototype.map.call(document.querySelectorAll("[data-delivery-zone]"), function (row) {
    return {
      id: (row.querySelector("[data-zone-id]") || {}).value,
      label: (row.querySelector("[data-zone-label]") || {}).value,
      detail: (row.querySelector("[data-zone-detail]") || {}).value,
      price: (row.querySelector("[data-zone-price]") || {}).value,
      nairobi: Boolean((row.querySelector("[data-zone-nairobi]") || {}).checked),
    };
  });
  const turnaround = Array.prototype.map.call(document.querySelectorAll("[data-delivery-turn]"), function (row) {
    return {
      id: (row.querySelector("[data-turn-id]") || {}).value,
      label: (row.querySelector("[data-turn-label]") || {}).value,
      timeLabel: (row.querySelector("[data-turn-time]") || {}).value,
      days: (row.querySelector("[data-turn-days]") || {}).value,
      extra: (row.querySelector("[data-turn-extra]") || {}).value,
      regions: (row.querySelector("[data-turn-regions]") || {}).value,
      nairobiOnly: Boolean((row.querySelector("[data-turn-nairobi]") || {}).checked),
    };
  });
  deliveryDraft = normalizeDeliveryConfig({
    freeDeliveryThreshold: (document.getElementById("delivery-threshold") || {}).value,
    defaultZoneId: (document.getElementById("delivery-default-zone") || {}).value,
    defaultTurnaroundId: (document.getElementById("delivery-default-turn") || {}).value,
    allowDeliveryDate: Boolean((document.getElementById("delivery-allow-date") || {}).checked),
    zoneNote: (document.getElementById("delivery-zone-note") || {}).value,
    turnaroundHint: (document.getElementById("delivery-turn-hint") || {}).value,
    dateHint: (document.getElementById("delivery-date-hint") || {}).value,
    zones: zones,
    turnaround: turnaround,
  });
  return deliveryDraft;
}

function moveItem(list, index, dir) {
  const next = index + (dir === "up" ? -1 : 1);
  if (next < 0 || next >= list.length) return list;
  const copy = list.slice();
  const item = copy.splice(index, 1)[0];
  copy.splice(next, 0, item);
  return copy;
}

function initShopAdmin() {
  const genderSelect = document.getElementById("product-gender");
  const categorySelect = document.getElementById("product-category");
  if (genderSelect) {
    genderSelect.innerHTML = GENDERS.map(function (g) {
      return '<option value="' + g.id + '">' + g.label + "</option>";
    }).join("");
  }
  if (categorySelect) {
    categorySelect.innerHTML = CATEGORIES.map(function (c) {
      return '<option value="' + c.id + '">' + c.label + "</option>";
    }).join("");
  }

  resetForm();
  renderProducts();
  renderOrders();
  renderAds();
  renderDelivery();
  loadCatalog({ includeHidden: true, force: true }).then(function () {
    renderProducts();
    const err = catalogError();
    if (err) showToast(err);
  });
  loadDeliveryConfig({ force: true }).then(function (cfg) {
    deliveryDraft = cfg;
    renderDelivery();
    const err = deliveryConfigError();
    if (err) setDeliveryStatus(err, true);
    else setDeliveryStatus("Live on checkout after you save. Use {threshold} in the zone note for the free-delivery amount.", false);
  });

  document.querySelectorAll("[data-shop-tab]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setTab(btn.getAttribute("data-shop-tab"));
    });
  });

  const form = document.getElementById("product-form");
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    const product = collectProduct();
    if (!product.name) {
      showToast("Name is required.");
      return;
    }
    const submit = document.getElementById("product-submit-btn");
    const previous = submit ? submit.textContent : "";
    if (submit) {
      submit.disabled = true;
      submit.textContent = "Saving…";
    }
    try {
      await saveProduct(product);
      showToast(editingId ? "Product updated." : "Product saved.");
      resetForm();
      renderProducts();
    } catch (err) {
      showToast((err && err.message) || "Could not save product.");
    } finally {
      if (submit) {
        submit.disabled = false;
        if (editingId) submit.textContent = previous || "Update product";
      }
    }
  });

  document.getElementById("product-cancel-btn").addEventListener("click", function () {
    resetForm();
  });

  document.getElementById("product-image-add-url").addEventListener("click", function () {
    const input = document.getElementById("product-image-url");
    if (addGalleryImage(input.value)) input.value = "";
  });

  const fileInput = document.getElementById("product-image-file");
  const dropzone = document.getElementById("product-dropzone");
  fileInput.addEventListener("change", async function () {
    const files = Array.from(fileInput.files || []);
    for (let i = 0; i < files.length; i++) {
      try {
        addGalleryImage(await compressImageFile(files[i], 1400, 0.82));
      } catch (_err) {
        showToast("Could not process image.");
      }
    }
    fileInput.value = "";
  });
  ["dragenter", "dragover"].forEach(function (type) {
    dropzone.addEventListener(type, function (event) {
      event.preventDefault();
      dropzone.classList.add("border-white/40");
    });
  });
  ["dragleave", "drop"].forEach(function (type) {
    dropzone.addEventListener(type, function (event) {
      event.preventDefault();
      dropzone.classList.remove("border-white/40");
    });
  });
  dropzone.addEventListener("drop", async function (event) {
    const files = Array.from(event.dataTransfer.files || []);
    for (let i = 0; i < files.length; i++) {
      try {
        addGalleryImage(await compressImageFile(files[i], 1400, 0.82));
      } catch (_err) {
        showToast("Could not process image.");
      }
    }
  });

  document.getElementById("product-images-list").addEventListener("click", function (event) {
    const btn = event.target.closest("[data-gallery-action]");
    if (!btn) return;
    const index = Number(btn.getAttribute("data-gallery-index"));
    galleryImages.splice(index, 1);
    renderGallery();
  });

  document.getElementById("product-color-add").addEventListener("click", function () {
    readColors();
    colorRows.push({ label: "", hex: "#1a1a1a" });
    renderColors();
  });

  document.getElementById("product-colors-list").addEventListener("click", function (event) {
    const btn = event.target.closest("[data-color-remove]");
    if (!btn) return;
    readColors();
    colorRows.splice(Number(btn.getAttribute("data-color-remove")), 1);
    renderColors();
  });

  document.getElementById("products-body").addEventListener("click", function (event) {
    const edit = event.target.closest("[data-product-edit]");
    if (edit) {
      const product = getCatalog().find(function (item) {
        return item.id === edit.getAttribute("data-product-edit");
      });
      if (product) {
        fillForm(product);
        setTab("products");
        document.getElementById("product-form").scrollIntoView({ behavior: "smooth", block: "start" });
        showToast("Loaded into the form.");
      }
      return;
    }
    const del = event.target.closest("[data-product-delete]");
    if (del) {
      const id = del.getAttribute("data-product-delete");
      if (!window.confirm("Delete this product from the shop?")) return;
      deleteProduct(id)
        .then(function () {
          if (editingId === id) resetForm();
          renderProducts();
          showToast("Product deleted.");
        })
        .catch(function (err) {
          showToast((err && err.message) || "Could not delete product.");
        });
    }
  });

  document.getElementById("orders-body").addEventListener("change", function (event) {
    const select = event.target.closest("[data-order-status]");
    if (!select) return;
    updateOrderStatus(select.getAttribute("data-order-status"), select.value);
    showToast("Order status updated.");
  });

  document.getElementById("orders-body").addEventListener("click", function (event) {
    const del = event.target.closest("[data-order-delete]");
    if (!del) return;
    if (!window.confirm("Delete this order?")) return;
    deleteOrder(del.getAttribute("data-order-delete"));
    renderOrders();
    showToast("Order deleted.");
  });

  document.getElementById("catalog-reset-btn").addEventListener("click", function () {
    if (!window.confirm("Remove every product from this catalog? This cannot be undone.")) return;
    resetCatalog()
      .then(function () {
        resetForm();
        renderProducts();
        showToast("Catalog cleared.");
      })
      .catch(function (err) {
        showToast((err && err.message) || "Could not clear catalog.");
      });
  });

  const adForm = document.getElementById("ad-form");
  const adFile = document.getElementById("ad-file");
  const adFileName = document.getElementById("ad-file-name");
  if (adFile && adFileName) {
    adFile.addEventListener("change", function () {
      const file = adFile.files && adFile.files[0];
      adFileName.textContent = file ? file.name : "No file selected.";
    });
  }
  const adDrop = document.getElementById("ad-dropzone");
  if (adDrop && adFile) {
    ["dragenter", "dragover"].forEach(function (type) {
      adDrop.addEventListener(type, function (event) {
        event.preventDefault();
        adDrop.classList.add("border-white/40");
      });
    });
    ["dragleave", "drop"].forEach(function (type) {
      adDrop.addEventListener(type, function (event) {
        event.preventDefault();
        adDrop.classList.remove("border-white/40");
      });
    });
    adDrop.addEventListener("drop", function (event) {
      const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      if (!file) return;
      const transfer = new DataTransfer();
      transfer.items.add(file);
      adFile.files = transfer.files;
      if (adFileName) adFileName.textContent = file.name;
    });
  }
  if (adForm) {
    adForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      const error = document.getElementById("ad-form-error");
      const title = document.getElementById("ad-title").value.trim();
      const url = document.getElementById("ad-url").value.trim();
      const file = adFile && adFile.files && adFile.files[0];
      if (error) error.textContent = "";
      let result;
      if (file) result = await addAdFromFile(file, title);
      else if (url) result = await addAdFromUrl(url, title);
      else result = { ok: false, error: "Upload a video or paste a direct URL." };
      if (!result.ok) {
        if (error) error.textContent = result.error || "Could not add that ad.";
        return;
      }
      adForm.reset();
      if (adFileName) adFileName.textContent = "No file selected.";
      showToast("Video ad added to the shop header.");
      await renderAds();
    });
  }

  const adsList = document.getElementById("ads-list");
  if (adsList) {
    adsList.addEventListener("change", async function (event) {
      const live = event.target.closest("[data-ad-live]");
      if (!live) return;
      await setAdPublished(live.getAttribute("data-ad-live"), live.checked);
      showToast(live.checked ? "Ad is live on the shop." : "Ad hidden from the shop.");
      await renderAds();
    });
    adsList.addEventListener("click", async function (event) {
      const up = event.target.closest("[data-ad-up]");
      if (up) {
        await moveAd(up.getAttribute("data-ad-up"), "up");
        await renderAds();
        return;
      }
      const down = event.target.closest("[data-ad-down]");
      if (down) {
        await moveAd(down.getAttribute("data-ad-down"), "down");
        await renderAds();
        return;
      }
      const del = event.target.closest("[data-ad-delete]");
      if (!del) return;
      if (!window.confirm("Remove this video ad from the shop header?")) return;
      await deleteAd(del.getAttribute("data-ad-delete"));
      showToast("Ad removed.");
      await renderAds();
    });
  }

  if (location.hash === "#orders") setTab("orders");
  if (location.hash === "#ads") setTab("ads");
  if (location.hash === "#delivery") setTab("delivery");

  const deliveryForm = document.getElementById("delivery-form");
  if (deliveryForm) {
    deliveryForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      const payload = collectDelivery();
      if (!payload.zones.length || !payload.turnaround.length) {
        setDeliveryStatus("Add at least one zone and one turnaround.", true);
        return;
      }
      const saveBtn = document.getElementById("delivery-save-btn");
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving…";
      }
      setDeliveryStatus("Saving…", false);
      try {
        deliveryDraft = await saveDeliveryConfig(payload);
        renderDelivery();
        setDeliveryStatus("Saved. Checkout now uses these zones, turnaround times, and date rules.", false);
        showToast("Delivery rules saved.");
      } catch (err) {
        setDeliveryStatus((err && err.message) || "Could not save delivery rules.", true);
        showToast((err && err.message) || "Could not save delivery rules.");
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = "Save delivery rules";
        }
      }
    });
  }

  const addZone = document.getElementById("delivery-zone-add");
  if (addZone) {
    addZone.addEventListener("click", function () {
      collectDelivery();
      deliveryDraft.zones.push({
        id: "zone-" + Date.now().toString(36),
        label: "New zone",
        detail: "",
        price: 0,
        nairobi: false,
      });
      renderDelivery();
    });
  }
  const addTurn = document.getElementById("delivery-turn-add");
  if (addTurn) {
    addTurn.addEventListener("click", function () {
      collectDelivery();
      deliveryDraft.turnaround.push({
        id: "turn-" + Date.now().toString(36),
        label: "New turnaround",
        timeLabel: "3 days",
        days: 3,
        extra: 0,
        nairobiOnly: false,
        regions: "All regions",
      });
      renderDelivery();
    });
  }
  const resetDelivery = document.getElementById("delivery-reset-btn");
  if (resetDelivery) {
    resetDelivery.addEventListener("click", function () {
      if (!window.confirm("Replace the current form with the original Onurik delivery defaults? Save to publish them.")) return;
      deliveryDraft = defaultDeliveryConfig();
      renderDelivery();
      setDeliveryStatus("Defaults loaded in the form. Save to publish them to checkout.", false);
    });
  }
  const zonesList = document.getElementById("delivery-zones-list");
  if (zonesList) {
    zonesList.addEventListener("click", function (event) {
      const remove = event.target.closest("[data-zone-remove]");
      const move = event.target.closest("[data-zone-move]");
      if (!remove && !move) return;
      collectDelivery();
      if (remove) {
        deliveryDraft.zones.splice(Number(remove.getAttribute("data-zone-remove")), 1);
      } else {
        deliveryDraft.zones = moveItem(
          deliveryDraft.zones,
          Number(move.getAttribute("data-zone-index")),
          move.getAttribute("data-zone-move")
        );
      }
      deliveryDraft = normalizeDeliveryConfig(deliveryDraft);
      renderDelivery();
    });
  }
  const turnsList = document.getElementById("delivery-turns-list");
  if (turnsList) {
    turnsList.addEventListener("click", function (event) {
      const remove = event.target.closest("[data-turn-remove]");
      const move = event.target.closest("[data-turn-move]");
      if (!remove && !move) return;
      collectDelivery();
      if (remove) {
        deliveryDraft.turnaround.splice(Number(remove.getAttribute("data-turn-remove")), 1);
      } else {
        deliveryDraft.turnaround = moveItem(
          deliveryDraft.turnaround,
          Number(move.getAttribute("data-turn-index")),
          move.getAttribute("data-turn-move")
        );
      }
      deliveryDraft = normalizeDeliveryConfig(deliveryDraft);
      renderDelivery();
    });
  }
}

if (ensureAuthGate()) initShopAdmin();
