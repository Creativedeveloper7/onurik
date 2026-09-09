import {
  compareProjectsByDisplayOrder,
  createProject,
  deleteProject,
  getCategories,
  getScopeTagOptions,
  loadProjects,
  reorderProject,
  updateProject,
} from "./projects-store.js";
import { getDashboardReadSecret, supabaseConfigured } from "./supabase-browser.js";

const AUTH_KEY = "onurik.admin.auth";
const ADMIN_PASSWORD = "onurik-admin";

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

function toastSupabaseProjectError(err, fallbackMessage) {
  const msg = err && (err.message || err.details) ? String(err.message || err.details) : "";
  if (msg.includes("dashboard_secret_missing") || msg.includes("invalid_dashboard_secret")) {
    showToast("Dashboard secret missing or wrong — set VITE_ADMIN_DASHBOARD_SECRET to match Supabase.");
    return;
  }
  if (msg.includes("Could not find the function") || (err && err.code === "PGRST202")) {
    showToast("Run Supabase migrations for onurik_projects (incl. images), then refresh.");
    return;
  }
  showToast(msg || fallbackMessage || "Could not complete action.");
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

function parseTags(raw) {
  return raw
    .split(",")
    .map(function (tag) {
      return tag.trim();
    })
    .filter(Boolean);
}

function renderTagPreview(tags) {
  const wrap = document.getElementById("tag-preview");
  if (!wrap) return;
  wrap.innerHTML = tags
    .map(function (tag) {
      return '<span class="rounded-full border border-white/20 px-3 py-1 text-[11px] tracking-wide">' + escapeHtml(tag) + "</span>";
    })
    .join("");
}

function setStatusUi(value) {
  const hidden = document.getElementById("project-status");
  const submit = document.getElementById("project-submit-btn");
  if (hidden) hidden.value = value;
  document.querySelectorAll(".status-pill").forEach(function (pill) {
    const active = pill.getAttribute("data-status-pill") === value;
    pill.classList.toggle("bg-white", active);
    pill.classList.toggle("text-black", active);
    pill.classList.toggle("text-white/70", !active);
  });
  if (submit) {
    submit.textContent = value === "published" ? "Publish Project" : "Save as Draft";
  }
}

function updatePrivacyLabel() {
  const checkbox = document.getElementById("project-privacy");
  const label = document.getElementById("privacy-label");
  if (!checkbox || !label) return;
  label.textContent = checkbox.checked ? "Private" : "Public";
}

const MAX_PROJECT_IMAGES = 8;
let galleryImages = [];
let approachItems = [""];
let selectedScopeTags = [];

function renderScopeTagPicker() {
  const wrap = document.getElementById("project-scope-tags");
  if (!wrap) return;
  const options = getScopeTagOptions();
  wrap.innerHTML = options
    .map(function (tag) {
      const active = selectedScopeTags.indexOf(tag) !== -1;
      return (
        '<button type="button" data-scope-tag="' +
        escapeHtml(tag) +
        '" class="rounded-full border px-3 py-1.5 text-[11px] tracking-wide transition ' +
        (active
          ? "border-white bg-white text-black"
          : "border-white/25 text-white/75 hover:border-white/50 hover:text-white") +
        '">' +
        escapeHtml(tag) +
        "</button>"
      );
    })
    .join("");
}

function setSelectedScopeTags(tags) {
  selectedScopeTags = (Array.isArray(tags) ? tags : [])
    .map(function (tag) {
      return String(tag || "").trim();
    })
    .filter(Boolean);
  renderScopeTagPicker();
}

function renderApproachList() {
  const list = document.getElementById("project-approach-list");
  if (!list) return;
  if (!approachItems.length) approachItems = [""];
  list.innerHTML = approachItems
    .map(function (item, index) {
      return (
        '<div class="flex gap-2">' +
        '<input data-approach-index="' +
        index +
        '" class="min-w-0 flex-1 rounded border border-outline-variant/40 bg-surface-container px-3 py-2 text-sm" type="text" placeholder="Approach point ' +
        (index + 1) +
        '" value="' +
        escapeHtml(item) +
        '"/>' +
        '<button type="button" data-approach-remove="' +
        index +
        '" class="inline-flex min-h-10 min-w-10 items-center justify-center rounded border border-outline-variant/40 text-red-300 hover:bg-red-500/10" aria-label="Remove approach point"><span class="material-symbols-outlined text-base">close</span></button>' +
        "</div>"
      );
    })
    .join("");
}

function setApproachItems(items) {
  const next = (Array.isArray(items) ? items : [])
    .map(function (item) {
      return String(item || "").trim();
    })
    .filter(Boolean);
  approachItems = next.length ? next : [""];
  renderApproachList();
}

function readApproachItems() {
  const list = document.getElementById("project-approach-list");
  if (!list) return approachItems.map(function (item) { return String(item || "").trim(); }).filter(Boolean);
  const inputs = Array.from(list.querySelectorAll("input[data-approach-index]"));
  approachItems = inputs.map(function (input) {
    return input.value;
  });
  return approachItems
    .map(function (item) {
      return String(item || "").trim();
    })
    .filter(Boolean);
}

function renderGalleryList() {
  const list = document.getElementById("project-images-list");
  const hint = document.getElementById("project-images-hint");
  if (!list) return;
  if (!galleryImages.length) {
    list.innerHTML =
      '<p class="col-span-full rounded border border-dashed border-outline-variant/40 px-3 py-6 text-center text-xs text-on-surface-variant">No images yet — add a URL or upload files.</p>';
    if (hint) hint.textContent = "First image is the cover on Works. Up to " + MAX_PROJECT_IMAGES + " images.";
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
        '<div class="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/70 p-1">' +
        '<button type="button" data-gallery-action="up" data-gallery-index="' +
        index +
        '" class="inline-flex min-h-8 min-w-8 items-center justify-center rounded text-white/80 hover:bg-white/15 disabled:opacity-30" aria-label="Move image earlier"' +
        (index === 0 ? " disabled" : "") +
        '><span class="material-symbols-outlined text-base">arrow_upward</span></button>' +
        '<button type="button" data-gallery-action="down" data-gallery-index="' +
        index +
        '" class="inline-flex min-h-8 min-w-8 items-center justify-center rounded text-white/80 hover:bg-white/15 disabled:opacity-30" aria-label="Move image later"' +
        (index >= galleryImages.length - 1 ? " disabled" : "") +
        '><span class="material-symbols-outlined text-base">arrow_downward</span></button>' +
        '<button type="button" data-gallery-action="remove" data-gallery-index="' +
        index +
        '" class="inline-flex min-h-8 min-w-8 items-center justify-center rounded text-red-300 hover:bg-red-500/20" aria-label="Remove image"><span class="material-symbols-outlined text-base">close</span></button>' +
        "</div></div>"
      );
    })
    .join("");
  if (hint) {
    hint.textContent =
      galleryImages.length +
      " / " +
      MAX_PROJECT_IMAGES +
      " images · first is cover";
  }
}

function setGalleryImages(images) {
  galleryImages = (Array.isArray(images) ? images : [])
    .map(function (src) {
      return typeof src === "string" ? src.trim() : "";
    })
    .filter(Boolean)
    .slice(0, MAX_PROJECT_IMAGES);
  renderGalleryList();
}

function addGalleryImage(src) {
  const value = typeof src === "string" ? src.trim() : "";
  if (!value) return false;
  if (galleryImages.indexOf(value) !== -1) {
    showToast("That image is already in the gallery.");
    return false;
  }
  if (galleryImages.length >= MAX_PROJECT_IMAGES) {
    showToast("Maximum of " + MAX_PROJECT_IMAGES + " images per project.");
    return false;
  }
  galleryImages.push(value);
  renderGalleryList();
  return true;
}

async function addGalleryFiles(fileList) {
  const files = Array.from(fileList || []).filter(Boolean);
  if (!files.length) return;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!/image\/(png|jpeg)/.test(file.type)) {
      showToast("Only PNG and JPG are allowed.");
      continue;
    }
    if (galleryImages.length >= MAX_PROJECT_IMAGES) {
      showToast("Maximum of " + MAX_PROJECT_IMAGES + " images per project.");
      break;
    }
    try {
      const dataUrl = await compressImageFile(file, 1600, 0.8);
      addGalleryImage(dataUrl);
    } catch (_err) {
      showToast("Could not process image—try a smaller file.");
    }
  }
}

function sortProjectsForAdminTable(projects) {
  const catOrder = getCategories();
  const rank = {};
  catOrder.forEach(function (c, i) {
    rank[c] = i;
  });
  return projects.slice().sort(function (a, b) {
    const ra = rank[a.category] != null ? rank[a.category] : 999;
    const rb = rank[b.category] != null ? rank[b.category] : 999;
    if (ra !== rb) return ra - rb;
    return compareProjectsByDisplayOrder(a, b);
  });
}

function renderRows(projects) {
  const body = document.getElementById("projects-body");
  if (!body) return;
  if (!projects.length) {
    body.innerHTML =
      '<tr><td colspan="8" class="p-10 text-center text-on-surface-variant"><span class="material-symbols-outlined mb-3 block text-4xl text-white/25">deployed_code</span><p>No projects yet. Add your first one.</p></td></tr>';
    return;
  }
  const sorted = sortProjectsForAdminTable(projects);
  body.innerHTML = sorted
    .map(function (project) {
      const peers = sorted.filter(function (p) {
        return p.category === project.category;
      });
      const idx = peers.findIndex(function (p) {
        return p.id === project.id;
      });
      const disableUp = idx <= 0;
      const disableDown = idx >= peers.length - 1;
      return (
        '<tr class="border-b border-outline-variant/20">' +
        '<td class="p-3"><img src="' +
        escapeHtml(project.image || "https://placehold.co/160x100/131313/e5e2e1?text=No+Image") +
        '" alt="" class="h-14 w-14 rounded-md object-cover opacity-90"/></td>' +
        '<td class="p-3 font-medium">' +
        escapeHtml(project.title) +
        "</td>" +
        '<td class="p-3 text-on-surface-variant">' +
        escapeHtml(project.category) +
        "</td>" +
        '<td class="p-3 whitespace-nowrap">' +
        '<button type="button" aria-label="Move up in category" title="Earlier on works page" data-action="order-up" data-id="' +
        project.id +
        '"' +
        (disableUp ? " disabled" : "") +
        ' class="mr-1 inline-flex rounded border border-white/20 p-1 text-xs hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none"><span class="material-symbols-outlined text-base leading-none">arrow_upward</span></button>' +
        '<button type="button" aria-label="Move down in category" title="Later on works page" data-action="order-down" data-id="' +
        project.id +
        '"' +
        (disableDown ? " disabled" : "") +
        ' class="inline-flex rounded border border-white/20 p-1 text-xs hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none"><span class="material-symbols-outlined text-base leading-none">arrow_downward</span></button>' +
        "</td>" +
        '<td class="p-3"><span class="rounded-full border border-white/20 px-2 py-1 text-[10px] uppercase">' +
        escapeHtml(project.status) +
        "</span></td>" +
        '<td class="p-3"><button data-action="privacy" data-id="' +
        project.id +
        '" class="rounded-full border border-white/20 px-2 py-1 text-[10px] uppercase hover:bg-white/10">' +
        escapeHtml(project.privacy) +
        "</button></td>" +
        '<td class="p-3 text-on-surface-variant text-xs">' +
        project.tags.map(escapeHtml).join(", ") +
        "</td>" +
        '<td class="p-3 text-right"><button aria-label="Edit project" data-action="edit" data-id="' +
        project.id +
        '" class="mr-2 rounded border border-white/20 p-1.5 text-xs hover:bg-white/10"><span class="material-symbols-outlined text-base">edit</span></button><button aria-label="Delete project" data-action="delete" data-id="' +
        project.id +
        '" class="rounded border border-red-400/40 p-1.5 text-xs text-red-300 hover:bg-red-500/10"><span class="material-symbols-outlined text-base">delete</span></button></td>' +
        "</tr>"
      );
    })
    .join("");
}

async function initForm() {
  const categorySelect = document.getElementById("project-category");
  const form = document.getElementById("project-form");
  const tagsInput = document.getElementById("project-tags");
  const saveMode = document.getElementById("project-status");
  const fileInput = document.getElementById("project-image-file");
  const dropzone = document.getElementById("dropzone");
  const imageUrlInput = document.getElementById("project-image");
  const addUrlBtn = document.getElementById("project-image-add-url");
  const imagesList = document.getElementById("project-images-list");
  const table = document.getElementById("projects-body");
  if (!categorySelect || !form || !tagsInput || !saveMode || !table) return;

  getCategories().forEach(function (category) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });

  let editingId = null;
  let projects = await loadProjects({ admin: true });
  if (supabaseConfigured() && !getDashboardReadSecret()) {
    showToast("Set VITE_ADMIN_DASHBOARD_SECRET and rebuild so projects sync to Supabase.");
  }
  renderRows(projects);
  setStatusUi(saveMode.value || "published");
  updatePrivacyLabel();
  setGalleryImages([]);
  setSelectedScopeTags([]);
  setApproachItems([""]);

  tagsInput.addEventListener("input", function () {
    renderTagPreview(parseTags(tagsInput.value));
  });

  const scopeWrap = document.getElementById("project-scope-tags");
  if (scopeWrap) {
    scopeWrap.addEventListener("click", function (event) {
      const button = event.target.closest("button[data-scope-tag]");
      if (!button) return;
      const tag = button.getAttribute("data-scope-tag");
      if (!tag) return;
      const idx = selectedScopeTags.indexOf(tag);
      if (idx === -1) selectedScopeTags.push(tag);
      else selectedScopeTags.splice(idx, 1);
      renderScopeTagPicker();
    });
  }

  const approachList = document.getElementById("project-approach-list");
  const approachAdd = document.getElementById("project-approach-add");
  if (approachAdd) {
    approachAdd.addEventListener("click", function () {
      readApproachItems();
      approachItems.push("");
      renderApproachList();
    });
  }
  if (approachList) {
    approachList.addEventListener("click", function (event) {
      const button = event.target.closest("button[data-approach-remove]");
      if (!button) return;
      readApproachItems();
      const index = Number(button.getAttribute("data-approach-remove"));
      if (Number.isNaN(index)) return;
      approachItems.splice(index, 1);
      if (!approachItems.length) approachItems = [""];
      renderApproachList();
    });
    approachList.addEventListener("input", function (event) {
      const input = event.target.closest("input[data-approach-index]");
      if (!input) return;
      const index = Number(input.getAttribute("data-approach-index"));
      if (Number.isNaN(index)) return;
      approachItems[index] = input.value;
    });
  }

  document.querySelectorAll(".status-pill").forEach(function (pill) {
    pill.addEventListener("click", function () {
      setStatusUi(pill.getAttribute("data-status-pill"));
    });
  });

  const privacy = document.getElementById("project-privacy");
  if (privacy) {
    privacy.addEventListener("change", updatePrivacyLabel);
  }

  function commitImageUrl() {
    if (!imageUrlInput) return;
    const value = imageUrlInput.value.trim();
    if (!value) return;
    if (addGalleryImage(value)) imageUrlInput.value = "";
  }

  if (addUrlBtn) {
    addUrlBtn.addEventListener("click", commitImageUrl);
  }
  if (imageUrlInput) {
    imageUrlInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        commitImageUrl();
      }
    });
  }

  if (imagesList) {
    imagesList.addEventListener("click", function (event) {
      const button = event.target.closest("button[data-gallery-action]");
      if (!button) return;
      const index = Number(button.getAttribute("data-gallery-index"));
      const action = button.getAttribute("data-gallery-action");
      if (Number.isNaN(index) || index < 0 || index >= galleryImages.length) return;
      if (action === "remove") {
        galleryImages.splice(index, 1);
        renderGalleryList();
        return;
      }
      if (action === "up" && index > 0) {
        const tmp = galleryImages[index - 1];
        galleryImages[index - 1] = galleryImages[index];
        galleryImages[index] = tmp;
        renderGalleryList();
        return;
      }
      if (action === "down" && index < galleryImages.length - 1) {
        const tmp = galleryImages[index + 1];
        galleryImages[index + 1] = galleryImages[index];
        galleryImages[index] = tmp;
        renderGalleryList();
      }
    });
  }

  if (fileInput) {
    fileInput.addEventListener("change", function () {
      addGalleryFiles(fileInput.files).finally(function () {
        fileInput.value = "";
      });
    });
  }

  if (dropzone && fileInput) {
    dropzone.addEventListener("dragover", function (event) {
      event.preventDefault();
      dropzone.classList.add("border-white/60");
    });
    dropzone.addEventListener("dragleave", function () {
      dropzone.classList.remove("border-white/60");
    });
    dropzone.addEventListener("drop", function (event) {
      event.preventDefault();
      dropzone.classList.remove("border-white/60");
      const files = event.dataTransfer && event.dataTransfer.files;
      if (!files || !files.length) return;
      addGalleryFiles(files);
    });
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (imageUrlInput && imageUrlInput.value.trim()) commitImageUrl();
    const images = galleryImages.slice();
    const image = images[0] || "";
    const imagePositionEl = document.getElementById("project-image-position");
    const imagePosition =
      imagePositionEl && imagePositionEl.value ? imagePositionEl.value.trim() : "center center";
    const title = document.getElementById("project-title").value.trim();
    const client = (document.getElementById("project-client") || {}).value
      ? document.getElementById("project-client").value.trim()
      : "";
    const category = categorySelect.value;
    const tags = parseTags(tagsInput.value);
    const scopeTags = selectedScopeTags.slice();
    const description = document.getElementById("project-description").value.trim();
    const challenge = (document.getElementById("project-challenge") || {}).value
      ? document.getElementById("project-challenge").value.trim()
      : "";
    const approach = readApproachItems();
    const result = (document.getElementById("project-result") || {}).value
      ? document.getElementById("project-result").value.trim()
      : "";
    const projectUrl = document.getElementById("project-url").value.trim();
    const privacyValue = document.getElementById("project-privacy").checked ? "private" : "public";
    const status = saveMode.value;

    if (!title || !description) {
      showToast("Title and description are required.");
      return;
    }
    if (!images.length) {
      showToast("Add at least one project image.");
      return;
    }
    if (status === "published" && !scopeTags.length) {
      showToast("Select at least one scope tag before publishing.");
      return;
    }

    const payload = {
      image,
      images,
      imagePosition: imagePosition || "center center",
      title,
      client,
      category,
      tags,
      scopeTags,
      description,
      challenge,
      approach,
      result,
      projectUrl,
      privacy: privacyValue,
      status,
    };
    try {
      if (editingId) {
        projects = await updateProject(editingId, payload);
        showToast("Project updated.");
      } else {
        projects = await createProject(payload);
        showToast(status === "published" ? "Project published." : "Draft saved.");
      }
    } catch (err) {
      toastSupabaseProjectError(err, "Could not save — check Supabase or try fewer/smaller images.");
      return;
    }
    editingId = null;
    form.reset();
    setGalleryImages([]);
    setSelectedScopeTags([]);
    setApproachItems([""]);
    const positionSelect = document.getElementById("project-image-position");
    if (positionSelect) positionSelect.value = "center center";
    setStatusUi("published");
    updatePrivacyLabel();
    renderTagPreview([]);
    renderRows(projects);
  });

  table.addEventListener("click", async function (event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const id = button.getAttribute("data-id");
    const action = button.getAttribute("data-action");
    const project = (await loadProjects({ admin: true })).find(function (item) {
      return item.id === id;
    });
    if (!project) return;

    if (action === "privacy") {
      try {
        projects = await updateProject(id, { privacy: project.privacy === "public" ? "private" : "public" });
        renderRows(projects);
      } catch (err) {
        toastSupabaseProjectError(err, "Could not update project.");
      }
      return;
    }

    if (action === "delete") {
      try {
        projects = await deleteProject(id);
        renderRows(projects);
        showToast("Project deleted.");
      } catch (err) {
        toastSupabaseProjectError(err, "Could not delete project.");
      }
      return;
    }

    if (action === "order-up") {
      try {
        const before = project.sortOrder;
        projects = await reorderProject(id, -1);
        const after = projects.find(function (item) {
          return item.id === id;
        });
        renderRows(projects);
        if (after && before !== after.sortOrder) {
          showToast("Order updated.");
        }
      } catch (err) {
        toastSupabaseProjectError(err, "Could not reorder.");
      }
      return;
    }

    if (action === "order-down") {
      try {
        const before = project.sortOrder;
        projects = await reorderProject(id, 1);
        const after = projects.find(function (item) {
          return item.id === id;
        });
        renderRows(projects);
        if (after && before !== after.sortOrder) {
          showToast("Order updated.");
        }
      } catch (err) {
        toastSupabaseProjectError(err, "Could not reorder.");
      }
      return;
    }

    if (action === "edit") {
      editingId = id;
      const images =
        Array.isArray(project.images) && project.images.length
          ? project.images
          : project.image
            ? [project.image]
            : [];
      setGalleryImages(images);
      setSelectedScopeTags(project.scopeTags || []);
      setApproachItems(project.approach || []);
      if (imageUrlInput) imageUrlInput.value = "";
      const positionSelect = document.getElementById("project-image-position");
      if (positionSelect) {
        const pos = project.imagePosition || "center center";
        const hasOption = Array.from(positionSelect.options).some(function (opt) {
          return opt.value === pos;
        });
        if (!hasOption) {
          const custom = document.createElement("option");
          custom.value = pos;
          custom.textContent = "Custom: " + pos;
          positionSelect.appendChild(custom);
        }
        positionSelect.value = pos;
      }
      document.getElementById("project-title").value = project.title || "";
      const clientInput = document.getElementById("project-client");
      if (clientInput) clientInput.value = project.client || "";
      categorySelect.value = project.category || getCategories()[0];
      tagsInput.value = (project.tags || []).join(", ");
      document.getElementById("project-description").value = project.description || "";
      const challengeInput = document.getElementById("project-challenge");
      if (challengeInput) challengeInput.value = project.challenge || "";
      const resultInput = document.getElementById("project-result");
      if (resultInput) resultInput.value = project.result || "";
      document.getElementById("project-url").value = project.projectUrl || "";
      document.getElementById("project-privacy").checked = project.privacy === "private";
      setStatusUi(project.status || "draft");
      updatePrivacyLabel();
      renderTagPreview(project.tags || []);
      showToast("Loaded project into form.");
    }
  });
}

if (ensureAuthGate()) {
  initForm().catch(function () {
    showToast("Could not load projects.");
  });
}

