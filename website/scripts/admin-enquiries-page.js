import {
  getSupabaseBrowser,
  getDashboardReadSecret,
  supabaseConfigured,
} from "./supabase-browser.js";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function excerpt(text, max) {
  const s = String(text || "").trim();
  if (s.length <= max) return s;
  return s.slice(0, max) + "…";
}

(async function () {
  const tbody = document.getElementById("enquiries-body");
  const subtitle = document.getElementById("admin-enquiries-subtitle");
  const statusBar = document.getElementById("admin-data-status");
  const secret = getDashboardReadSecret();

  if (!tbody) return;

  function setStatus(msg, isErr) {
    if (!statusBar) return;
    statusBar.textContent = msg;
    statusBar.classList.toggle("text-red-400", Boolean(isErr));
    statusBar.classList.toggle("text-on-surface-variant", !isErr);
  }

  async function renderList(supabase) {
    setStatus("Loading enquiries…");

    const { data, error } = await supabase.rpc("onurik_dashboard_enquiries", {
      p_secret: secret,
    });

    if (error) {
      let hint =
        error.message?.includes("invalid_dashboard_secret")
          ? "Secret mismatch or missing: set Postgres onurik_site_settings.dashboard_read_secret to match VITE_ADMIN_DASHBOARD_SECRET or window.__ONURIK_PUBLIC_CONFIG__.dashboardSecret, then rebuild or reload."
          : error.message?.includes("not set") ||
              error.message?.includes("dashboard_read_secret")
            ? error.hint || error.message || "Configure dashboard_read_secret in Supabase SQL."
            : error.message?.includes(
                  "Could not find the function",
                ) ||
                error.code === "PGRST202"
              ? "Open Supabase → SQL Editor, paste/run the whole file repo: supabase/migrations/20260207180000_dashboard_inbox_rpc.sql (creates onurik_dashboard_* RPCs). If SQL errors on missing tables, apply your full Onurik schema first. Then wait a few seconds and refresh."
              : error.message ||
                "Could not load enquiries.";
      setStatus(hint, true);
      console.error("[onurik] enquiries rpc", error);
      return;
    }

    const rows = Array.isArray(data) ? data : [];

    if (subtitle) {
      subtitle.textContent =
        rows.length === 0
          ? "No messages yet. Submissions from the contact page appear here."
          : `${rows.length} message${rows.length === 1 ? "" : "s"} (newest first).`;
    }

    if (!rows.length) {
      tbody.innerHTML = `<tr>
        <td class="p-8 text-center font-body-md text-body-md text-on-surface-variant sm:p-12" colspan="5">
          <p class="mx-auto max-w-md">No enquiries yet.</p>
          <p class="mt-4"><a class="font-label-caps text-label-caps uppercase tracking-widest text-primary underline-offset-4 transition-colors hover:text-on-background hover:underline" href="../contact.html">View contact page</a></p>
        </td>
      </tr>`;
      setStatus("");
      return;
    }

    tbody.innerHTML = rows
      .map((row) => {
        const contact =
          (row.visitor_name ? escapeHtml(row.visitor_name) + "<br/>" : "") +
          `<a class="text-primary hover:underline" href="mailto:${escapeHtml(row.visitor_email)}">${escapeHtml(row.visitor_email)}</a>`;
        return `<tr class="border-b border-outline-variant/20 align-top">
          <td class="p-4 font-body-md text-body-md text-on-background sm:p-6">${contact}</td>
          <td class="p-4 font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant sm:p-6">${escapeHtml(row.enquiry_type || "—")}</td>
          <td class="hidden max-w-md p-4 font-body-md text-body-md text-on-surface-variant md:table-cell md:p-6">${escapeHtml(excerpt(row.body, 160))}</td>
          <td class="whitespace-nowrap p-4 font-body-md text-sm text-on-surface-variant sm:p-6">${escapeHtml(fmtDate(row.created_at))}</td>
          <td class="hidden p-4 font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant lg:table-cell lg:p-6">${escapeHtml(row.status || "—")}</td>
        </tr>`;
      })
      .join("");
    setStatus("");
  }

  if (!supabaseConfigured()) {
    setStatus(
      "Missing Supabase URL/anon key. Set .env and rebuild, or window.__ONURIK_PUBLIC_CONFIG__ on admin pages.",
      true,
    );
    tbody.innerHTML = `<tr><td class="p-8 text-center text-red-300 sm:p-10" colspan="5">Supabase not configured.</td></tr>`;
    return;
  }

  if (!String(secret).trim()) {
    setStatus(
      "Missing dashboard secret. Set VITE_ADMIN_DASHBOARD_SECRET or __ONURIK_PUBLIC_CONFIG__.dashboardSecret to match Postgres dashboard_read_secret.",
      true,
    );
    tbody.innerHTML = `<tr><td class="p-8 text-center text-on-surface-variant sm:p-10" colspan="5">Dashboard secret missing.</td></tr>`;
    return;
  }

  const supabase = getSupabaseBrowser();
  if (!supabase) return;

  await renderList(supabase);
})();
