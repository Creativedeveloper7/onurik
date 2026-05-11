import {
  compareProjectsByDisplayOrder,
  createProject,
  deleteProject,
  getCategories,
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
    showToast("Run Supabase migration 20260209120000_onurik_projects.sql, then refresh.");
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

function updateImagePreview(src) {
  const preview = document.getElementById("project-image-preview");
  if (!preview) return;
  if (!src) {
    preview.src = "";
    preview.classList.add("hidden");
    return;
  }
  preview.src = src;
  preview.classList.remove("hidden");
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
  const table = document.getElementById("projects-body");
  if (!categorySelect || !form || !tagsInput || !saveMode || !table) return;

  getCategories().forEach(function (category) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });

  let editingId = null;
  let uploadedDataUrl = "";
  let projects = await loadProjects({ admin: true });
  if (supabaseConfigured() && !getDashboardReadSecret()) {
    showToast("Set VITE_ADMIN_DASHBOARD_SECRET and rebuild so projects sync to Supabase.");
  }
  renderRows(projects);
  setStatusUi(saveMode.value || "published");
  updatePrivacyLabel();

  tagsInput.addEventListener("input", function () {
    renderTagPreview(parseTags(tagsInput.value));
  });

  document.querySelectorAll(".status-pill").forEach(function (pill) {
    pill.addEventListener("click", function () {
      setStatusUi(pill.getAttribute("data-status-pill"));
    });
  });

  const privacy = document.getElementById("project-privacy");
  if (privacy) {
    privacy.addEventListener("change", updatePrivacyLabel);
  }

  if (fileInput) {
    fileInput.addEventListener("change", function () {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      const valid = /image\/(png|jpeg)/.test(file.type);
      if (!valid) {
        showToast("Only PNG and JPG are allowed.");
        return;
      }
      compressImageFile(file, 1920, 0.82)
        .then(function (dataUrl) {
          uploadedDataUrl = dataUrl;
          updateImagePreview(uploadedDataUrl);
        })
        .catch(function () {
          showToast("Could not process image—try a smaller file.");
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
      const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      if (!file) return;
      fileInput.files = event.dataTransfer.files;
      fileInput.dispatchEvent(new Event("change"));
    });
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    const image = uploadedDataUrl || document.getElementById("project-image").value.trim();
    const title = document.getElementById("project-title").value.trim();
    const category = categorySelect.value;
    const tags = parseTags(tagsInput.value);
    const description = document.getElementById("project-description").value.trim();
    const projectUrl = document.getElementById("project-url").value.trim();
    const privacy = document.getElementById("project-privacy").checked ? "private" : "public";
    const status = saveMode.value;

    if (!title || !description) {
      showToast("Title and description are required.");
      return;
    }

    const payload = { image, title, category, tags, description, projectUrl, privacy, status };
    try {
      if (editingId) {
        projects = await updateProject(editingId, payload);
        showToast("Project updated.");
      } else {
        projects = await createProject(payload);
        showToast(status === "published" ? "Project published." : "Draft saved.");
      }
    } catch (err) {
      toastSupabaseProjectError(err, "Could not save — check Supabase or try a smaller image.");
      return;
    }
    editingId = null;
    form.reset();
    uploadedDataUrl = "";
    updateImagePreview("");
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
      document.getElementById("project-image").value = project.image || "";
      uploadedDataUrl = "";
      updateImagePreview(project.image || "");
      document.getElementById("project-title").value = project.title || "";
      categorySelect.value = project.category || getCategories()[0];
      tagsInput.value = (project.tags || []).join(", ");
      document.getElementById("project-description").value = project.description || "";
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
