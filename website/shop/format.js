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

export const FREE_DELIVERY_THRESHOLD = 10000;

export const DELIVERY_ZONES = [
  {
    id: "nairobi-cbd",
    label: "Nairobi CBD",
    detail: "CBD, UON, Globe, Koja, River Road",
    price: 200,
    nairobi: true,
  },
  {
    id: "greater-nairobi",
    label: "Greater Nairobi",
    detail: "Westlands, Kilimani, Langata, South B/C, Eastlands, Ruaka, Spring Valley, Kileleshwa, Lavington, Ngong Road, Fedha",
    price: 400,
    nairobi: true,
  },
  {
    id: "satellite",
    label: "Satellite Towns",
    detail: "Kitengela, Karen, Rongai, Utawala, Kamulu, Kikuyu, Kiambu, Ngong, Thika",
    price: 800,
    nairobi: false,
  },
  {
    id: "major-towns",
    label: "Major Towns",
    detail: "Mombasa, Kisumu, Nakuru, Eldoret, Nyeri, Watamu, Diani, Malindi, Lamu, Nanyuki",
    price: 1150,
    nairobi: false,
  },
  {
    id: "other",
    label: "Other Areas",
    detail: "Rest of Kenya",
    price: 1200,
    nairobi: false,
  },
];

export const TURNAROUND_OPTIONS = [
  {
    id: "rush",
    label: "Rush",
    timeLabel: "24 hrs",
    days: 1,
    extra: 1500,
    nairobiOnly: true,
    regions: "Nairobi only",
  },
  {
    id: "express",
    label: "Express",
    timeLabel: "2 days",
    days: 2,
    extra: 500,
    nairobiOnly: false,
    regions: "All regions",
  },
  {
    id: "standard",
    label: "Standard",
    timeLabel: "3 days",
    days: 3,
    extra: 0,
    nairobiOnly: false,
    regions: "All regions",
  },
];

/** @deprecated Kept so older drafts still resolve a fallback quote. */
export const SHIPPING_METHODS = TURNAROUND_OPTIONS.map(function (item) {
  return {
    id: item.id,
    label: item.label,
    detail: item.timeLabel + " · " + item.regions,
    price: item.extra,
  };
});

export function getDeliveryZone(id) {
  return (
    DELIVERY_ZONES.find(function (zone) {
      return zone.id === id;
    }) || DELIVERY_ZONES[1]
  );
}

export function getTurnaround(id) {
  return (
    TURNAROUND_OPTIONS.find(function (item) {
      return item.id === id;
    }) || TURNAROUND_OPTIONS[2]
  );
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

export function toIsoDate(date) {
  return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate());
}

export function addCalendarDays(days) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + Math.max(1, Number(days) || 1));
  return date;
}

export function earliestIsoDate(turnaroundId) {
  const turnaround = getTurnaround(turnaroundId);
  return toIsoDate(addCalendarDays(turnaround.days));
}

export function formatDisplayDate(iso) {
  if (!iso) return "";
  const parts = String(iso).split("-");
  if (parts.length !== 3) return String(iso);
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(date.getTime())) return String(iso);
  return date.toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function quoteDelivery(opts) {
  const options = opts && typeof opts === "object" ? opts : {};
  const zone = getDeliveryZone(options.zoneId);
  let turnaround = getTurnaround(options.turnaroundId);
  if (turnaround.nairobiOnly && !zone.nairobi) {
    turnaround = getTurnaround("standard");
  }
  const subtotal = Number(options.subtotal) || 0;
  const zoneList = zone.price;
  const zonePrice = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : zoneList;
  const extra = turnaround.extra;
  const earliest = earliestIsoDate(turnaround.id);
  let deliveryDate = String(options.deliveryDate || "").trim();
  if (deliveryDate && deliveryDate < earliest) deliveryDate = earliest;
  const label = zone.label + " · " + turnaround.label;
  const detailParts = [
    turnaround.timeLabel + " production",
    zone.detail,
  ];
  if (deliveryDate) detailParts.push("Arrive " + formatDisplayDate(deliveryDate));
  return {
    id: zone.id + ":" + turnaround.id,
    zoneId: zone.id,
    turnaroundId: turnaround.id,
    label: label,
    detail: detailParts.join(" — "),
    price: zonePrice + extra,
    zonePrice: zonePrice,
    zoneList: zoneList,
    turnaroundExtra: extra,
    turnaroundLabel: turnaround.label + " · " + turnaround.timeLabel,
    deliveryDate: deliveryDate,
    earliestDate: earliest,
    freeDelivery: zonePrice === 0 && subtotal >= FREE_DELIVERY_THRESHOLD,
    nairobi: zone.nairobi,
  };
}

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
