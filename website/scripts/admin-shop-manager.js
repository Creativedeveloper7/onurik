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
  document.querySelectorAll("[data-shop-tab]").forEach(function (btn) {
    btn.classList.toggle("is-active", btn.getAttribute("data-shop-tab") === name);
  });
  if (products) products.hidden = name !== "products";
  if (orders) orders.hidden = name !== "orders";
  if (ads) ads.hidden = name !== "ads";
  if (name === "orders") renderOrders();
  if (name === "ads") renderAds();
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
  loadCatalog({ includeHidden: true, force: true }).then(function () {
    renderProducts();
    const err = catalogError();
    if (err) showToast(err);
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
}

if (ensureAuthGate()) initShopAdmin();
