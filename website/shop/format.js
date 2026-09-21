import { DEFAULT_TURNAROUND_OPTIONS } from "./delivery-config.js";

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

export function formatKes(amount) {
  const n = Number(amount) || 0;
  return "KSh " + n.toLocaleString("en-KE");
}

export function lineKey(productId, size, color) {
  return [productId, size || "", color || ""].join("::");
}

export const GENDERS = [
  { id: "men", label: "Men" },
  { id: "women", label: "Women" },
];

export const CATEGORIES = [
  { id: "hoodies", label: "Hoodies" },
  { id: "t-shirts", label: "T-Shirts" },
  { id: "caps", label: "Caps/Bucket Hats" },
  { id: "afrowear", label: "AfroWear" },
];

export const SIZES = ["S", "M", "L", "XL"];

export {
  DEFAULT_DELIVERY_ZONES as DELIVERY_ZONES,
  DEFAULT_FREE_DELIVERY_THRESHOLD as FREE_DELIVERY_THRESHOLD,
  DEFAULT_TURNAROUND_OPTIONS as TURNAROUND_OPTIONS,
  addCalendarDays,
  earliestIsoDate,
  formatDisplayDate,
  getDeliveryConfig,
  getDeliveryZone,
  getTurnaround,
  loadDeliveryConfig,
  quoteDelivery,
  toIsoDate,
} from "./delivery-config.js";

/** @deprecated Kept so older drafts still resolve a fallback quote. */
export const SHIPPING_METHODS = DEFAULT_TURNAROUND_OPTIONS.map(function (item) {
  return {
    id: item.id,
    label: item.label,
    detail: item.timeLabel + " · " + item.regions,
    price: item.extra,
  };
});

export function categoryLabel(id) {
  const found = CATEGORIES.find(function (item) {
    return item.id === id;
  });
  return found ? found.label : id;
}

export function genderLabel(id) {
  const found = GENDERS.find(function (item) {
    return item.id === id;
  });
  return found ? found.label : id;
}

export function imgUrl(id, extra) {
  const params = extra ? "&" + extra : "";
  return (
    "https://images.unsplash.com/" +
    id +
    "?auto=format&fit=crop&w=1200&q=80" +
    params
  );
}
