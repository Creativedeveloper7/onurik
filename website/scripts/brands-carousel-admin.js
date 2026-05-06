import {
  getSupabaseBrowser,
  getDashboardReadSecret,
  supabaseConfigured,
} from "./supabase-browser.js";

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function extFromFilename(name) {
  const m = String(name).toLowerCase().match(/(\.[a-z0-9]{2,5})$/);
  return m ? m[1] : ".png";
}

/** Normalizes PostgREST RPC scalar uuid (string or rare wrapped shapes). */
function parseRpcUuid(raw) {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const s = raw.trim();
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
    ) {
      return s;
    }
    return null;
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const v =
      raw.onurik_dashboard_brand_create_draft ?? raw.id ?? raw.uuid ?? null;
    if (v != null) return parseRpcUuid(v);
  }
  return null;
}

function setStatus(el, msg, isErr) {
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle("text-red-400", Boolean(isErr));
  el.classList.toggle("text-on-surface-variant", !isErr);
}

(async function init() {
  const root = document.getElementById("brands-admin-root");
  const statusEl = document.getElementById("brands-admin-status");
  const secret = getDashboardReadSecret();

  if (!root) return;

  const sb = getSupabaseBrowser();

  async function loadRows() {
    if (!sb || !secret) return [];
    const { data, error } = await sb.rpc("onurik_dashboard_brands_all", {
      p_secret: secret,
    });
    if (error) {
      console.error("[onurik] brands_all", error);
      setStatus(
        statusEl,
        error.message?.includes("Could not find the function") ||
          error.code === "PGRST202"
          ? "Run SQL migration 20260208120000_brands_carousel.sql in Supabase, then refresh."
          : error.message || "Could not load brands.",
        true,
      );
      return [];
    }
    return Array.isArray(data) ? data : [];
  }

  async function render() {
    setStatus(statusEl, "Loading…", false);
    if (!supabaseConfigured() || !secret) {
      setStatus(
        statusEl,
        "Set VITE_ADMIN_DASHBOARD_SECRET and Supabase keys in .env (or __ONURIK_PUBLIC_CONFIG__), rebuild, then reload.",
        true,
      );
      root.innerHTML = "";
      return;
    }
    const rows = await loadRows();
    const statusHasMigrationHint =
      statusEl?.textContent?.includes("migration") ||
      statusEl?.textContent?.includes("Could not find the function");
    if (!rows.length && !statusHasMigrationHint) {
      setStatus(statusEl, "No brands yet — add one below.", false);
    } else if (!statusHasMigrationHint) {
      setStatus(statusEl, `${rows.length} brand(s). Order: ↑ ↓.`, false);
    }

    root.innerHTML = `
<div class="max-w-5xl space-y-10">
  <div class="rounded-DEFAULT border border-outline-variant/30 bg-surface-container-low p-6 md:p-8">
    <h2 class="font-montserrat text-lg font-semibold text-on-background">Add logo</h2>
    <p class="mt-2 text-sm text-on-surface-variant">Creates a row, uploads to Storage, then shows on the homepage when visible.</p>
    <form id="brand-add-form" class="mt-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
      <div class="flex-1 min-w-[200px]">
        <label class="mb-2 block font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">Display name</label>
        <input type="text" id="brand-new-name" required placeholder="Company name"
          class="w-full rounded-DEFAULT border border-outline-variant/50 bg-stone-950/40 px-4 py-2.5 text-on-background outline-none ring-primary/30 focus-visible:ring-2"/>
      </div>
      <div class="flex-1 min-w-[200px]">
        <label class="mb-2 block font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">Logo file</label>
        <input type="file" id="brand-new-file" accept="image/png,image/jpeg,image/svg+xml" required
          class="block w-full text-sm text-on-surface-variant file:mr-4 file:rounded-DEFAULT file:border-0 file:bg-stone-800 file:px-4 file:py-2 file:text-stone-200"/>
      </div>
      <button type="submit" class="min-h-[44px] rounded-DEFAULT border border-outline-variant px-6 py-2.5 font-label-caps text-label-caps uppercase tracking-widest text-on-background hover:bg-stone-800">
        Upload
      </button>
    </form>
  </div>

  <div class="overflow-x-auto rounded-DEFAULT border border-outline-variant/30">
    <table class="w-full min-w-[640px] border-collapse text-left">
      <thead>
        <tr class="border-b border-outline-variant/40 bg-stone-900/80">
          <th class="p-4 font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">Logo</th>
          <th class="p-4 font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">Name</th>
          <th class="p-4 font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">On homepage</th>
          <th class="p-4 font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">Order</th>
          <th class="p-4 font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant"></th>
        </tr>
      </thead>
      <tbody id="brands-admin-tbody">
        ${rows
          .map((r) => rowHtml(r))
          .join("")}
      </tbody>
    </table>
  </div>
</div>`;

    bindRowHandlers();
    const form = document.getElementById("brand-add-form");
    if (form) {
      form.addEventListener("submit", onAddSubmit);
    }
  }

  function rowHtml(r) {
    const thumb = r.logo_url
      ? `<img src="${escapeHtml(r.logo_url)}" alt="" class="h-10 w-auto max-w-[100px] object-contain"/>`
      : `<span class="text-xs text-on-surface-variant">Pending upload</span>`;
    return `<tr class="border-b border-outline-variant/20" data-brand-id="${escapeHtml(r.id)}">
      <td class="p-4 align-middle">${thumb}</td>
      <td class="p-4 align-middle font-body-md text-on-background">${escapeHtml(r.name)}</td>
      <td class="p-4 align-middle">
        <input type="checkbox" class="brand-vis h-5 w-5 rounded border-outline-variant" data-id="${escapeHtml(r.id)}" ${r.visible ? "checked" : ""}/>
      </td>
      <td class="p-4 align-middle">
        <div class="flex items-center gap-2">
          <button type="button" class="brand-up min-h-[40px] rounded border border-outline-variant px-2 text-on-surface-variant hover:bg-stone-800" data-id="${escapeHtml(r.id)}" title="Move up">↑</button>
          <button type="button" class="brand-down min-h-[40px] rounded border border-outline-variant px-2 text-on-surface-variant hover:bg-stone-800" data-id="${escapeHtml(r.id)}" title="Move down">↓</button>
        </div>
      </td>
      <td class="p-4 align-middle text-right">
        <button type="button" class="brand-del text-sm text-red-400 hover:text-red-300 underline underline-offset-4" data-id="${escapeHtml(r.id)}">Remove</button>
      </td>
    </tr>`;
  }

  function bindRowHandlers() {
    document.querySelectorAll("input.brand-vis").forEach((vis) => {
      vis.addEventListener("change", async () => {
        const id = vis.getAttribute("data-id");
        const { error } = await sb.rpc("onurik_dashboard_brand_patch", {
          p_secret: secret,
          p_id: id,
          p_name: null,
          p_visible: vis.checked,
          p_sort_order: null,
        });
        if (error) alert(error.message);
        else await render();
      });
    });

    document.querySelectorAll(".brand-up").forEach((btn) => {
      btn.addEventListener("click", () => move(btn.getAttribute("data-id"), -1));
    });
    document.querySelectorAll(".brand-down").forEach((btn) => {
      btn.addEventListener("click", () => move(btn.getAttribute("data-id"), 1));
    });
    document.querySelectorAll(".brand-del").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Remove this brand and its logo file?")) return;
        const id = btn.getAttribute("data-id");
        const { error } = await sb.rpc("onurik_dashboard_brand_delete", {
          p_secret: secret,
          p_id: id,
        });
        if (error) alert(error.message);
        else await render();
      });
    });
  }

  async function move(id, dir) {
    const rows = await loadRows();
    const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order);
    const i = sorted.findIndex((r) => r.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= sorted.length) return;
    const a = sorted[i];
    const b = sorted[j];
    const { error: e1 } = await sb.rpc("onurik_dashboard_brand_patch", {
      p_secret: secret,
      p_id: a.id,
      p_name: null,
      p_visible: null,
      p_sort_order: b.sort_order,
    });
    if (e1) {
      alert(e1.message);
      return;
    }
    const { error: e2 } = await sb.rpc("onurik_dashboard_brand_patch", {
      p_secret: secret,
      p_id: b.id,
      p_name: null,
      p_visible: null,
      p_sort_order: a.sort_order,
    });
    if (e2) alert(e2.message);
    await render();
  }

  async function onAddSubmit(e) {
    e.preventDefault();
    const nameEl = document.getElementById("brand-new-name");
    const fileEl = document.getElementById("brand-new-file");
    if (!nameEl || !fileEl || !fileEl.files?.[0]) return;
    const name = String(nameEl.value).trim();
    const file = fileEl.files[0];
    if (!name) return;

    setStatus(statusEl, "Uploading…", false);
    const { data: draftRaw, error: cErr } = await sb.rpc(
      "onurik_dashboard_brand_create_draft",
      { p_secret: secret, p_name: name },
    );
    const newId = parseRpcUuid(draftRaw);
    if (cErr || !newId) {
      setStatus(
        statusEl,
        cErr?.message ||
          (!draftRaw ? "Could not create brand." : "Invalid brand id from server."),
        true,
      );
      return;
    }

    const objectPath = `${newId}/logo${extFromFilename(file.name)}`;
    const { error: uErr } = await sb.storage
      .from("onurik-brand-logos")
      .upload(objectPath, file, { upsert: true, contentType: file.type || undefined });

    if (uErr) {
      await sb.rpc("onurik_dashboard_brand_delete", {
        p_secret: secret,
        p_id: newId,
      });
      setStatus(statusEl, uErr.message || "Upload failed.", true);
      return;
    }

    const { data: pub } = sb.storage
      .from("onurik-brand-logos")
      .getPublicUrl(objectPath);

    const { error: lErr } = await sb.rpc("onurik_dashboard_brand_set_logo", {
      p_secret: secret,
      p_id: newId,
      p_logo_url: pub.publicUrl,
      p_logo_storage_path: objectPath,
    });

    if (lErr) {
      setStatus(statusEl, lErr.message || "Could not attach logo.", true);
      return;
    }

    nameEl.value = "";
    fileEl.value = "";
    await render();
  }

  await render();
})();
