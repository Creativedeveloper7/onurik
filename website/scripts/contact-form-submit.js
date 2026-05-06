import { getSupabaseBrowser, supabaseConfigured } from "./supabase-browser.js";

const PROJECT_TYPE_LABELS = {
  design_system: "Develop System",
  product_design: "Product Design",
  brand_identity: "Brand Identity",
  consulting: "Consulting",
};

function sessionWindowUtcIso(dateYmd) {
  const start = `${dateYmd}T07:00:00.000Z`;
  const end = `${dateYmd}T08:00:00.000Z`;
  return { starts_at: start, ends_at: end };
}

function readForm(form) {
  const nameEl = form.querySelector("#name");
  const emailEl = form.querySelector("#email");
  const projectEl = form.querySelector("#project_type");
  const dateEl = form.querySelector("#start_date");
  const messageEl = form.querySelector("#message");
  return {
    name: nameEl ? String(nameEl.value).trim() : "",
    email: emailEl ? String(emailEl.value).trim() : "",
    project_type: projectEl ? String(projectEl.value).trim() : "",
    start_date: dateEl ? String(dateEl.value).trim() : "",
    message: messageEl ? String(messageEl.value).trim() : "",
  };
}

function userFacingSupabaseErr(err) {
  if (!err) return "Request failed.";
  const msg = [
    err.message,
    err.hint && `Hint: ${err.hint}`,
    err.details && `Details: ${err.details}`,
  ]
    .filter(Boolean)
    .join(" ");
  return msg || "Request failed.";
}

(function init() {
  const form = document.getElementById("contact-form");
  const bookBtn = document.getElementById("contact-book-session");
  const box = document.getElementById("contact-form-feedback");
  const iconEl = document.getElementById("contact-form-feedback-icon");
  const textEl = document.getElementById("contact-form-feedback-text");
  const submitBtn = form?.querySelector('button[type="submit"]');

  if (!form || !bookBtn || !box || !iconEl || !textEl) return;

  const msgs = {
    enquiryOk: "Enquiry sent successfully — I'll get back to you soon.",
    bookingOk: "Booking sent successfully — I'll confirm your session shortly.",
    err: "Something went wrong. Please check your inputs and try again.",
    cfg:
      "Supabase is not configured. Add URL + anon key to your `.env`, rebuild, OR set window.__ONURIK_PUBLIC_CONFIG__ in this page (see comments).",
  };

  let hideTimer;

  function isValidEmail(s) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());
  }

  function clearTimer() {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = null;
  }

  function resetFeedbackChrome() {
    iconEl.textContent = "check_circle";
    iconEl.className =
      "material-symbols-outlined shrink-0 text-xl text-secondary-fixed mt-0.5";
    textEl.className =
      "font-body-md text-[15px] md:text-[16px] leading-snug text-primary-fixed pt-px";
  }

  function hideFeedback() {
    clearTimer();
    box.classList.remove("is-visible", "is-error");
    box.setAttribute("hidden", "");
    textEl.textContent = "";
    resetFeedbackChrome();
    if (submitBtn) submitBtn.disabled = false;
    bookBtn.disabled = false;
  }

  /** @param {string} msg */
  function showFeedback(kind, message) {
    clearTimer();
    box.classList.remove("is-visible");
    box.removeAttribute("hidden");
    resetFeedbackChrome();
    if (kind === "error") {
      box.classList.add("is-error");
      iconEl.textContent = "error_outline";
      iconEl.classList.remove("text-secondary-fixed");
      iconEl.classList.add("text-outline");
      textEl.classList.remove("text-primary-fixed");
      textEl.classList.add("text-on-surface-variant");
    } else {
      box.classList.remove("is-error");
    }
    textEl.textContent = message;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        box.classList.add("is-visible");
      });
    });
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    hideTimer = window.setTimeout(hideFeedback, reduceMotion ? 8000 : 9000);
  }

  function validateEnquiry() {
    const { email, message } = readForm(form);
    return isValidEmail(email) && Boolean(message);
  }

  function validateBooking() {
    const { email, start_date, message } = readForm(form);
    return isValidEmail(email) && Boolean(start_date) && Boolean(message);
  }

  function setBusy(busy) {
    if (submitBtn) {
      submitBtn.disabled = busy;
      submitBtn.classList.toggle("anim-loading-dots", busy);
    }
    bookBtn.disabled = busy;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validateEnquiry()) {
      showFeedback("error", msgs.err);
      return;
    }
    if (!supabaseConfigured()) {
      showFeedback("error", msgs.cfg);
      return;
    }
    const sb = getSupabaseBrowser();
    if (!sb) {
      showFeedback("error", msgs.cfg);
      return;
    }

    const v = readForm(form);
    const typeLabel =
      PROJECT_TYPE_LABELS[v.project_type] ||
      (v.project_type ? v.project_type : "General enquiry");

    setBusy(true);
    const { error } = await sb.from("onurik_enquiries").insert({
      source: "contact_form",
      enquiry_type: v.project_type || "general",
      visitor_name: v.name || null,
      visitor_email: v.email,
      visitor_phone: null,
      subject: v.project_type ? `Project interest: ${typeLabel}` : "Contact form enquiry",
      body: v.message,
      meta: {
        project_type: v.project_type || null,
        start_date_preference: v.start_date || null,
      },
    });

    setBusy(false);
    if (error) {
      showFeedback(
        "error",
        `${msgs.err} (${userFacingSupabaseErr(error)})`,
      );
      console.error("[onurik] enquiry insert", error);
      return;
    }
    showFeedback("ok", msgs.enquiryOk);
    form.reset();
  });

  bookBtn.addEventListener("click", async () => {
    if (!validateBooking()) {
      showFeedback("error", msgs.err);
      return;
    }
    if (!supabaseConfigured()) {
      showFeedback("error", msgs.cfg);
      return;
    }
    const sb = getSupabaseBrowser();
    if (!sb) {
      showFeedback("error", msgs.cfg);
      return;
    }

    const v = readForm(form);
    const { starts_at, ends_at } = sessionWindowUtcIso(v.start_date);
    const typeLabel = PROJECT_TYPE_LABELS[v.project_type] || v.project_type || "";

    setBusy(true);
    const { error } = await sb.from("onurik_bookings").insert({
      related_enquiry_id: null,
      attendee_name: v.name || "",
      attendee_email: v.email,
      attendee_phone: null,
      starts_at,
      ends_at,
      timezone: "Africa/Nairobi",
      status: "requested",
      calendar_provider: null,
      external_booking_id: null,
      notes: v.message,
      meta: {
        project_type: v.project_type || null,
        label: typeLabel ? `Session request — ${typeLabel}` : "Session request",
      },
    });

    setBusy(false);
    if (error) {
      showFeedback(
        "error",
        `${msgs.err} (${userFacingSupabaseErr(error)})`,
      );
      console.error("[onurik] booking insert", error);
      return;
    }
    showFeedback("ok", msgs.bookingOk);
    form.reset();
  });

  window.addEventListener("pagehide", clearTimer);
})();
