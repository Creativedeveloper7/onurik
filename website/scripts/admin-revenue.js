import { escapeHtml, formatKes } from "../shop/format.js";
import {
  MIN_PAYOUT,
  PAYOUT_METHODS,
  deletePayout,
  financeSnapshot,
  listPayouts,
  readLastDestination,
  requestPayout,
  updatePayoutStatus,
} from "../shop/finance-store.js";

function payoutLabel(id) {
  const found = PAYOUT_METHODS.find(function (item) {
    return item.id === id;
  });
  return found ? found.label : id;
}

function destSummary(payout) {
  const dest = (payout && payout.destination) || {};
  if (payout.method === "bank") {
    return (
      (dest.bankName || "Bank") +
      " · " +
      (dest.accountName || "") +
      " · " +
      (dest.accountNumber || "")
    ).replace(/ · $/, "");
  }
  return dest.phone || "M-Pesa";
}

function statusClass(status) {
  if (status === "sent") return "text-emerald-300";
  if (status === "failed") return "text-red-300";
  return "text-amber-200";
}

function showToast(message) {
  const toast = document.getElementById("admin-toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(function () {
    toast.classList.remove("is-visible");
  }, 3200);
}

function flowNode(step, title, detail, metric, active) {
  return (
    '<li class="relative rounded border px-4 py-4 ' +
    (active
      ? "border-white/40 bg-surface-container"
      : "border-outline-variant/30 bg-surface-container-low") +
    '">' +
    '<p class="font-montserrat text-[10px] uppercase tracking-[0.22em] text-white/35">' +
    step +
    "</p>" +
    '<p class="mt-2 font-montserrat text-sm text-white">' +
    escapeHtml(title) +
    "</p>" +
    '<p class="mt-2 text-xs leading-relaxed text-white/40">' +
    escapeHtml(detail) +
    "</p>" +
    (metric
      ? '<p class="mt-3 font-montserrat text-xs uppercase tracking-[0.16em] text-white/70">' +
        escapeHtml(metric) +
        "</p>"
      : "") +
    "</li>"
  );
}

function renderFlow(snap) {
  return (
    '<ol class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">' +
    flowNode("01", "Checkout", "Customer pays on the public shop (M-Pesa or card).", snap.orderCount + (snap.orderCount === 1 ? " checkout" : " checkouts"), snap.orderCount > 0) +
    flowNode("02", "Capture", "Payment reference is stored on the order. Cancelled sales drop out here.", snap.cancelledCount + " cancelled", false) +
    flowNode("03", "Order ledger", "Shop Manager holds the live order list and status.", snap.openCount + " open", snap.openCount > 0) +
    flowNode("04", "Recognize", "Gross revenue = every non-cancelled order total.", formatKes(snap.gross), snap.gross > 0) +
    flowNode("05", "Available", "Gross minus pending and sent withdrawals.", formatKes(snap.available), snap.available > 0) +
    flowNode("06", "Withdraw", "Send available funds to M-Pesa or a bank account.", snap.payoutCount + " payouts", snap.pending > 0 || snap.withdrawn > 0) +
    "</ol>"
  );
}

function renderStats(snap) {
  const cards = [
    { label: "Gross revenue", value: formatKes(snap.gross), note: snap.recognizedCount + " recognized orders" },
    { label: "Available", value: formatKes(snap.available), note: "Ready to withdraw" },
    { label: "Pending payout", value: formatKes(snap.pending), note: "Reserved, not yet sent" },
    { label: "Withdrawn", value: formatKes(snap.withdrawn), note: "Marked as sent" },
  ];
  return (
    '<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">' +
    cards
      .map(function (card) {
        return (
          '<div class="rounded border border-outline-variant/30 bg-surface-container-low p-5">' +
          '<p class="font-montserrat text-[11px] uppercase tracking-[0.18em] text-white/40">' +
          escapeHtml(card.label) +
          "</p>" +
          '<p class="mt-3 font-montserrat text-2xl tracking-[-0.03em] text-white">' +
          escapeHtml(card.value) +
          "</p>" +
          '<p class="mt-2 text-xs text-white/40">' +
          escapeHtml(card.note) +
          "</p></div>"
        );
      })
      .join("") +
    "</div>"
  );
}

function renderForm(snap) {
  const dest = readLastDestination();
  const method = dest.method === "bank" ? "bank" : "mpesa";
  return (
    '<form id="revenue-payout-form" class="rounded border border-outline-variant/30 bg-surface-container-low p-5 md:p-6">' +
    '<p class="font-montserrat text-[11px] uppercase tracking-[0.2em] text-on-surface-variant">Withdraw available balance</p>' +
    '<p class="mt-2 text-sm text-white/45">Available ' +
    escapeHtml(formatKes(snap.available)) +
    ". Minimum " +
    escapeHtml(formatKes(MIN_PAYOUT)) +
    ". Pending payouts reserve funds until you mark them sent or failed.</p>" +
    '<div class="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">' +
    '<label class="block text-xs uppercase tracking-[0.16em] text-white/40">Amount (KSh)' +
    '<input id="payout-amount" name="amount" type="number" min="' +
    MIN_PAYOUT +
    '" step="1" max="' +
    snap.available +
    '" class="mt-2 w-full rounded border border-outline-variant/40 bg-surface-container px-3 py-2 text-sm text-white" placeholder="' +
    snap.available +
    '" required/>' +
    "</label>" +
    '<label class="block text-xs uppercase tracking-[0.16em] text-white/40">Rail' +
    '<select id="payout-method" name="method" class="mt-2 w-full rounded border border-outline-variant/40 bg-surface-container px-3 py-2 text-sm text-white">' +
    PAYOUT_METHODS.map(function (item) {
      return (
        '<option value="' +
        item.id +
        '"' +
        (item.id === method ? " selected" : "") +
        ">" +
        escapeHtml(item.label) +
        "</option>"
      );
    }).join("") +
    "</select></label></div>" +
    '<div id="payout-mpesa-fields" class="mt-4' +
    (method === "mpesa" ? "" : " hidden") +
    '">' +
    '<label class="block text-xs uppercase tracking-[0.16em] text-white/40">M-Pesa number' +
    '<input id="payout-phone" name="phone" type="tel" class="mt-2 w-full rounded border border-outline-variant/40 bg-surface-container px-3 py-2 text-sm text-white" placeholder="07XXXXXXXX" value="' +
    escapeHtml(dest.phone || "") +
    '"/>' +
    "</label></div>" +
    '<div id="payout-bank-fields" class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3' +
    (method === "bank" ? "" : " hidden") +
    '">' +
    '<label class="block text-xs uppercase tracking-[0.16em] text-white/40">Bank' +
    '<input id="payout-bank" name="bankName" type="text" class="mt-2 w-full rounded border border-outline-variant/40 bg-surface-container px-3 py-2 text-sm text-white" placeholder="Equity, KCB…" value="' +
    escapeHtml(dest.bankName || "") +
    '"/>' +
    "</label>" +
    '<label class="block text-xs uppercase tracking-[0.16em] text-white/40">Account name' +
    '<input id="payout-account-name" name="accountName" type="text" class="mt-2 w-full rounded border border-outline-variant/40 bg-surface-container px-3 py-2 text-sm text-white" value="' +
    escapeHtml(dest.accountName || "") +
    '"/>' +
    "</label>" +
    '<label class="block text-xs uppercase tracking-[0.16em] text-white/40">Account number' +
    '<input id="payout-account-number" name="accountNumber" type="text" class="mt-2 w-full rounded border border-outline-variant/40 bg-surface-container px-3 py-2 text-sm text-white" value="' +
    escapeHtml(dest.accountNumber || "") +
    '"/>' +
    "</label></div>" +
    '<label class="mt-4 block text-xs uppercase tracking-[0.16em] text-white/40">Note (optional)' +
    '<input id="payout-note" name="note" type="text" class="mt-2 w-full rounded border border-outline-variant/40 bg-surface-container px-3 py-2 text-sm text-white" placeholder="Studio rent, fabric order…"/>' +
    "</label>" +
    '<p id="payout-error" class="mt-3 min-h-5 text-sm text-red-300"></p>' +
    '<button type="submit" class="mt-2 min-h-[44px] w-full rounded border border-outline-variant px-4 py-2 text-xs uppercase tracking-[0.2em] hover:bg-surface-variant md:w-auto"' +
    (snap.available < MIN_PAYOUT ? " disabled" : "") +
    ">Request withdrawal</button>" +
    "</form>"
  );
}

function renderHistory() {
  const payouts = listPayouts();
  if (!payouts.length) {
    return (
      '<div class="rounded border border-outline-variant/30 bg-surface-container-low p-8 text-center text-sm text-white/40">No withdrawals yet. Request one when available balance is at least ' +
      escapeHtml(formatKes(MIN_PAYOUT)) +
      ".</div>"
    );
  }
  return (
    '<div class="overflow-x-auto rounded border border-outline-variant/30 bg-surface-container-low">' +
    '<table class="w-full min-w-[720px] border-collapse text-left">' +
    '<thead class="border-b border-outline-variant/40 bg-surface-container/50"><tr>' +
    '<th class="p-3 text-xs uppercase tracking-[0.2em] text-on-surface-variant">When</th>' +
    '<th class="p-3 text-xs uppercase tracking-[0.2em] text-on-surface-variant">Amount</th>' +
    '<th class="p-3 text-xs uppercase tracking-[0.2em] text-on-surface-variant">Rail</th>' +
    '<th class="p-3 text-xs uppercase tracking-[0.2em] text-on-surface-variant">Destination</th>' +
    '<th class="p-3 text-xs uppercase tracking-[0.2em] text-on-surface-variant">Status</th>' +
    '<th class="p-3 text-right text-xs uppercase tracking-[0.2em] text-on-surface-variant">Actions</th>' +
    "</tr></thead><tbody>" +
    payouts
      .map(function (payout) {
        const date = payout.createdAt
          ? new Date(payout.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
          : "—";
        const pending = payout.status === "pending";
        return (
          "<tr class=\"border-b border-outline-variant/20\">" +
          '<td class="p-3 text-sm text-white/70">' +
          escapeHtml(date) +
          '<p class="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/30">' +
          escapeHtml(payout.id) +
          "</p></td>" +
          '<td class="p-3 text-sm text-white">' +
          escapeHtml(formatKes(payout.amount)) +
          "</td>" +
          '<td class="p-3 text-sm text-white/70">' +
          escapeHtml(payoutLabel(payout.method)) +
          "</td>" +
          '<td class="p-3 text-sm text-white/70">' +
          escapeHtml(destSummary(payout)) +
          (payout.destination && payout.destination.note
            ? '<p class="mt-1 text-xs text-white/35">' + escapeHtml(payout.destination.note) + "</p>"
            : "") +
          "</td>" +
          '<td class="p-3 text-sm uppercase tracking-[0.14em] ' +
          statusClass(payout.status) +
          '">' +
          escapeHtml(payout.status) +
          "</td>" +
          '<td class="p-3 text-right text-[11px] uppercase tracking-[0.14em]">' +
          (pending
            ? '<button type="button" data-payout-sent="' +
              escapeHtml(payout.id) +
              '" class="mr-3 text-white/80 hover:text-white">Mark sent</button>' +
              '<button type="button" data-payout-fail="' +
              escapeHtml(payout.id) +
              '" class="mr-3 text-white/50 hover:text-white">Fail</button>'
            : "") +
          '<button type="button" data-payout-delete="' +
          escapeHtml(payout.id) +
          '" class="text-white/35 hover:text-white">Delete</button>' +
          "</td></tr>"
        );
      })
      .join("") +
    "</tbody></table></div>"
  );
}

function formula(snap) {
  return (
    '<p class="text-sm leading-relaxed text-white/45">Available = recognized shop totals − pending payouts − sent payouts. Cancelled orders never enter the wallet. This ledger lives in this browser until the shop tables are wired to Supabase.</p>' +
    '<p class="mt-3 font-montserrat text-[11px] uppercase tracking-[0.16em] text-white/55">' +
    escapeHtml(formatKes(snap.gross)) +
    " − " +
    escapeHtml(formatKes(snap.pending)) +
    " − " +
    escapeHtml(formatKes(snap.withdrawn)) +
    " = " +
    escapeHtml(formatKes(snap.available)) +
    "</p>"
  );
}

function bindMethodToggle(root) {
  const select = root.querySelector("#payout-method");
  const mpesa = root.querySelector("#payout-mpesa-fields");
  const bank = root.querySelector("#payout-bank-fields");
  if (!select || !mpesa || !bank) return;
  function sync() {
    const isBank = select.value === "bank";
    mpesa.classList.toggle("hidden", isBank);
    bank.classList.toggle("hidden", !isBank);
  }
  select.addEventListener("change", sync);
  sync();
}

export function mountRevenueSection(root) {
  if (!root) return;

  function render() {
    const snap = financeSnapshot();
    root.innerHTML =
      '<div class="flex flex-col gap-8">' +
      '<div>' +
      '<p class="mb-3 font-montserrat text-[11px] uppercase tracking-[0.2em] text-white/40">Architecture</p>' +
      renderFlow(snap) +
      '<div class="mt-5 rounded border border-outline-variant/20 bg-surface-container-lowest/40 px-4 py-4">' +
      formula(snap) +
      "</div></div>" +
      renderStats(snap) +
      '<div class="grid grid-cols-1 gap-6 xl:grid-cols-5">' +
      '<div class="xl:col-span-2">' +
      renderForm(snap) +
      "</div>" +
      '<div class="xl:col-span-3">' +
      '<p class="mb-3 font-montserrat text-[11px] uppercase tracking-[0.2em] text-white/40">Payout history</p>' +
      renderHistory() +
      "</div></div></div>";
    bindMethodToggle(root);
  }

  if (!root.dataset.bound) {
    root.dataset.bound = "1";
    root.addEventListener("submit", function (event) {
      const form = event.target.closest("#revenue-payout-form");
      if (!form) return;
      event.preventDefault();
      const error = root.querySelector("#payout-error");
      const result = requestPayout({
        amount: form.amount.value,
        method: form.method.value,
        phone: form.phone.value,
        bankName: form.bankName.value,
        accountName: form.accountName.value,
        accountNumber: form.accountNumber.value,
        note: form.note.value,
      });
      if (!result.ok) {
        if (error) error.textContent = result.error;
        return;
      }
      showToast("Withdrawal requested.");
      render();
    });
    root.addEventListener("click", function (event) {
      const sent = event.target.closest("[data-payout-sent]");
      if (sent) {
        updatePayoutStatus(sent.getAttribute("data-payout-sent"), "sent");
        showToast("Marked as sent.");
        render();
        return;
      }
      const fail = event.target.closest("[data-payout-fail]");
      if (fail) {
        updatePayoutStatus(fail.getAttribute("data-payout-fail"), "failed");
        showToast("Marked as failed. Funds returned to available.");
        render();
        return;
      }
      const del = event.target.closest("[data-payout-delete]");
      if (del) {
        if (!window.confirm("Delete this payout record?")) return;
        deletePayout(del.getAttribute("data-payout-delete"));
        showToast("Payout deleted.");
        render();
      }
    });
  }

  render();
}
