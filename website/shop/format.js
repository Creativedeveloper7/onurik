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

export const SHIPPING_METHODS = [
  {
    id: "standard",
    label: "Standard",
    detail: "3–5 business days, Nairobi and nationwide",
    price: 350,
  },
  {
    id: "express",
    label: "Express",
    detail: "1–2 business days",
    price: 750,
  },
  {
    id: "pickup",
    label: "Studio pickup",
    detail: "Collect from Nairobi — no shipping charge",
    price: 0,
  },
];

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
