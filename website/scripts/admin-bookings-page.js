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

function fmtRange(startIso, endIso, tz) {
  try {
    const s = new Date(startIso);
    const e = new Date(endIso);
    const opt = { dateStyle: "medium", timeStyle: "short", timeZone: tz || undefined };
    return `${s.toLocaleString(undefined, opt)} – ${e.toLocaleTimeString(undefined, { timeStyle: "short", timeZone: tz || undefined })}`;
  } catch {
    return `${startIso} → ${endIso}`;
  }
}

(async function () {
  const root = document.getElementById("bookings-list-root");
  const subtitle = document.getElementById("admin-bookings-subtitle");
  const statusBar = document.getElementById("admin-data-status");
  const secret = getDashboardReadSecret();

  if (!root) return;

  function setStatus(msg, isErr) {
    if (!statusBar) return;
    statusBar.textContent = msg;
    statusBar.classList.toggle("text-red-400", Boolean(isErr));
    statusBar.classList.toggle("text-on-surface-variant", !isErr);
  }

  async function renderList(supabase) {
    setStatus("Loading bookings…");

    const { data, error } = await supabase.rpc("onurik_dashboard_bookings", {
      p_secret: secret,
    });

    if (error) {
      let hint =
        error.message?.includes("invalid_dashboard_secret")
          ? "Secret mismatch: sync dashboard_read_secret in Postgres with .env VITE_ADMIN_DASHBOARD_SECRET or __ONURIK_PUBLIC_CONFIG__."
          : error.message?.includes("not set") ||
              error.message?.includes("dashboard_read_secret")
            ? error.hint || error.message || "Set dashboard_read_secret in Supabase."
            : error.message?.includes(
                  "Could not find the function",
                ) ||
                error.code === "PGRST202"
              ? "Run supabase/migrations/20260207180000_dashboard_inbox_rpc.sql in Supabase SQL Editor, then refresh (same file creates both inbox RPCs)."
              : error.message ||
                "Could not load bookings.";
      setStatus(hint, true);
      console.error("[onurik] bookings rpc", error);
      return;
    }

    const rows = Array.isArray(data) ? data : [];

    if (subtitle) {
      subtitle.textContent =
        rows.length === 0
          ? "No sessions requested yet. “Book a Session” on the contact page creates rows here."
          : `${rows.length} booking${rows.length === 1 ? "" : "s"} (by start time).`;
    }

    if (!rows.length) {
      root.innerHTML = `<div class="mx-auto max-w-lg text-center py-8">
        <span class="material-symbols-outlined mb-6 inline-block text-5xl text-on-surface-variant/40" aria-hidden="true">event_available</span>
        <p class="font-montserrat text-2xl font-medium text-on-background">No bookings</p>
        <p class="mt-4 font-body-md text-body-md text-on-surface-variant">Submit from the contact form to see sessions here.</p>
        <p class="mt-8"><a class="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-DEFAULT border border-outline-variant px-6 py-3 font-label-caps text-label-caps uppercase tracking-widest text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" href="../contact.html">Contact page</a></p>
      </div>`;
      setStatus("");
      return;
    }

    root.innerHTML = `<div class="w-full overflow-x-auto rounded-DEFAULT border border-outline-variant/20 bg-surface-container-low">
      <table class="w-full min-w-[min(100%,720px)] border-collapse text-left">
        <thead>
          <tr class="border-b border-outline-variant/30 bg-surface-container/50">
            <th class="p-4 font-label-caps text-label-caps font-semibold uppercase tracking-wider text-on-surface-variant sm:p-6">Attendee</th>
            <th class="p-4 font-label-caps text-label-caps font-semibold uppercase tracking-wider text-on-surface-variant sm:p-6">Slot</th>
            <th class="hidden p-4 font-label-caps text-label-caps font-semibold uppercase tracking-wider text-on-surface-variant lg:table-cell lg:p-6">Notes</th>
            <th class="p-4 font-label-caps text-label-caps font-semibold uppercase tracking-wider text-on-surface-variant sm:p-6">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map((row) => {
              const who =
                (row.attendee_name ? escapeHtml(row.attendee_name) + "<br/>" : "") +
                `<a class="text-primary hover:underline" href="mailto:${escapeHtml(row.attendee_email)}">${escapeHtml(row.attendee_email)}</a>`;
              return `<tr class="border-b border-outline-variant/20 align-top">
                <td class="p-4 font-body-md text-body-md text-on-background sm:p-6">${who}</td>
                <td class="p-4 font-body-md text-sm text-on-surface-variant sm:p-6">${escapeHtml(fmtRange(row.starts_at, row.ends_at, row.timezone))}<br/><span class="text-xs opacity-80">${escapeHtml(row.timezone || "UTC")}</span></td>
                <td class="hidden max-w-md p-4 font-body-md text-body-md text-on-surface-variant lg:table-cell lg:p-6">${escapeHtml(String(row.notes || "").slice(0, 200))}${row.notes && row.notes.length > 200 ? "…" : ""}</td>
                <td class="p-4 font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant sm:p-6">${escapeHtml(row.status || "—")}</td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </div>`;
    setStatus("");
  }

  if (!supabaseConfigured()) {
    setStatus(
      "Missing Supabase URL/anon key (.env rebuild or window.__ONURIK_PUBLIC_CONFIG__).",
      true,
    );
    root.innerHTML = `<p class="p-8 text-center text-red-300 md:p-12">Supabase not configured.</p>`;
    return;
  }

  if (!String(secret).trim()) {
    setStatus(
      "Missing dashboard secret (VITE_ADMIN_DASHBOARD_SECRET or __ONURIK_PUBLIC_CONFIG__.dashboardSecret).",
      true,
    );
    root.innerHTML = `<p class="p-8 text-center text-on-surface-variant md:p-12">Dashboard secret missing.</p>`;
    return;
  }

  const supabase = getSupabaseBrowser();
  if (!supabase) return;

  await renderList(supabase);
})();
