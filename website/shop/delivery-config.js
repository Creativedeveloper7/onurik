import {
  getDashboardReadSecret,
  getSupabaseBrowser,
  supabaseConfigured,
} from "../scripts/supabase-browser.js";

export const DEFAULT_FREE_DELIVERY_THRESHOLD = 10000;

export const DEFAULT_DELIVERY_ZONES = [
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

export const DEFAULT_TURNAROUND_OPTIONS = [
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

export const DEFAULT_ZONE_NOTE =
  "Tap your zone to lock in delivery. FREE on orders over {threshold}. Production extras still apply.";
export const DEFAULT_TURNAROUND_HINT =
  "How fast we produce your order — delivery is charged separately.";
export const DEFAULT_DATE_HINT =
  "Leave blank if you don’t need a specific day. We will not promise a date before production finishes.";

function slugId(value, fallback) {
  const slug = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);
  return slug || String(fallback || "");
}

function uniqueSlug(label, used, fallback) {
  let base = slugId(label, fallback) || "item";
  let id = base;
  let n = 2;
  while (used.has(id)) {
    id = base + "-" + n;
    n += 1;
  }
  used.add(id);
  return id;
}

function asInt(value, fallback, min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.round(n));
}

function asText(value, fallback) {
  const text = String(value == null ? "" : value).trim();
  return text || fallback;
}

export function defaultDeliveryConfig() {
  return {
    freeDeliveryThreshold: DEFAULT_FREE_DELIVERY_THRESHOLD,
    defaultZoneId: "greater-nairobi",
    defaultTurnaroundId: "standard",
    allowDeliveryDate: true,
    zoneNote: DEFAULT_ZONE_NOTE,
    turnaroundHint: DEFAULT_TURNAROUND_HINT,
    dateHint: DEFAULT_DATE_HINT,
    zones: DEFAULT_DELIVERY_ZONES.map(function (zone) {
      return Object.assign({}, zone);
    }),
    turnaround: DEFAULT_TURNAROUND_OPTIONS.map(function (item) {
      return Object.assign({}, item);
    }),
  };
}

export function normalizeDeliveryConfig(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const fallback = defaultDeliveryConfig();
  const usedZone = new Set();
  const zonesSource = Array.isArray(source.zones) ? source.zones : fallback.zones;
  const zones = zonesSource
    .map(function (item, index) {
      const row = item && typeof item === "object" ? item : {};
      const label = asText(row.label, "");
      if (!label) return null;
      const preferred = slugId(row.id, "");
      const id = preferred && !usedZone.has(preferred) ? preferred : uniqueSlug(label, usedZone, "zone-" + (index + 1));
      if (preferred) usedZone.add(id);
      return {
        id: id,
        label: label,
        detail: String(row.detail || "").trim(),
        price: asInt(row.price, 0, 0),
        nairobi: Boolean(row.nairobi),
      };
    })
    .filter(Boolean)
    .slice(0, 20);
  const usedTurn = new Set();
  const turnSource = Array.isArray(source.turnaround) ? source.turnaround : fallback.turnaround;
  const turnaround = turnSource
    .map(function (item, index) {
      const row = item && typeof item === "object" ? item : {};
      const label = asText(row.label, "");
      if (!label) return null;
      const preferred = slugId(row.id, "");
      const id = preferred && !usedTurn.has(preferred) ? preferred : uniqueSlug(label, usedTurn, "turn-" + (index + 1));
      if (preferred) usedTurn.add(id);
      return {
        id: id,
        label: label,
        timeLabel: asText(row.timeLabel, row.days ? row.days + " days" : "3 days"),
        days: asInt(row.days, 3, 1),
        extra: asInt(row.extra, 0, 0),
        nairobiOnly: Boolean(row.nairobiOnly),
        regions: asText(row.regions, row.nairobiOnly ? "Nairobi only" : "All regions"),
      };
    })
    .filter(Boolean)
    .slice(0, 12);
  const safeZones = zones.length ? zones : fallback.zones;
  const safeTurn = turnaround.length ? turnaround : fallback.turnaround;
  const defaultZoneId = String(source.defaultZoneId || "").trim();
  const defaultTurnaroundId = String(source.defaultTurnaroundId || "").trim();
  const zoneMatch = safeZones.some(function (zone) {
    return zone.id === defaultZoneId;
  });
  const turnMatch = safeTurn.some(function (item) {
    return item.id === defaultTurnaroundId;
  });
  const allowDate = source.allowDeliveryDate;
  return {
    freeDeliveryThreshold: asInt(source.freeDeliveryThreshold, fallback.freeDeliveryThreshold, 0),
    defaultZoneId: zoneMatch ? defaultZoneId : safeZones[0].id,
    defaultTurnaroundId: turnMatch ? defaultTurnaroundId : safeTurn[safeTurn.length - 1].id,
    allowDeliveryDate: allowDate == null ? true : Boolean(allowDate),
    zoneNote: String(source.zoneNote != null ? source.zoneNote : fallback.zoneNote),
    turnaroundHint: String(source.turnaroundHint != null ? source.turnaroundHint : fallback.turnaroundHint),
    dateHint: String(source.dateHint != null ? source.dateHint : fallback.dateHint),
    zones: safeZones,
    turnaround: safeTurn,
  };
}

let cache = defaultDeliveryConfig();
let loaded = false;
let loadPromise = null;
let loadError = "";

export function getDeliveryConfig() {
  return cache;
}

export function deliveryConfigError() {
  return loadError;
}

export function getDeliveryZone(id) {
  const zones = cache.zones;
  return (
    zones.find(function (zone) {
      return zone.id === id;
    }) || zones[0]
  );
}

export function getTurnaround(id) {
  const options = cache.turnaround;
  return (
    options.find(function (item) {
      return item.id === id;
    }) || options[options.length - 1]
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

function fallbackTurnaround(zone) {
  if (zone && zone.nairobi) return getTurnaround(cache.defaultTurnaroundId);
  return (
    cache.turnaround.find(function (item) {
      return !item.nairobiOnly;
    }) || cache.turnaround[cache.turnaround.length - 1]
  );
}

export function quoteDelivery(opts) {
  const options = opts && typeof opts === "object" ? opts : {};
  const zone = getDeliveryZone(options.zoneId);
  let turnaround = getTurnaround(options.turnaroundId);
  if (turnaround.nairobiOnly && !zone.nairobi) {
    turnaround = fallbackTurnaround(zone);
  }
  const subtotal = Number(options.subtotal) || 0;
  const threshold = cache.freeDeliveryThreshold;
  const zoneList = zone.price;
  const zonePrice = threshold > 0 && subtotal >= threshold ? 0 : zoneList;
  const extra = turnaround.extra;
  const earliest = earliestIsoDate(turnaround.id);
  let deliveryDate = cache.allowDeliveryDate ? String(options.deliveryDate || "").trim() : "";
  if (deliveryDate && deliveryDate < earliest) deliveryDate = earliest;
  const label = zone.label + " · " + turnaround.label;
  const detailParts = [turnaround.timeLabel + " production", zone.detail];
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
    freeDelivery: zonePrice === 0 && threshold > 0 && subtotal >= threshold,
    nairobi: zone.nairobi,
  };
}

export function formatZoneNote(config) {
  const cfg = config || cache;
  const note = String(cfg.zoneNote || "").trim();
  if (!note) return "";
  const threshold =
    cfg.freeDeliveryThreshold > 0
      ? "KSh " + Number(cfg.freeDeliveryThreshold).toLocaleString("en-KE")
      : "the free-delivery threshold";
  return note.replaceAll("{threshold}", threshold);
}

function missingRpcMessage(error) {
  const msg = (error && error.message) || "";
  if ((error && error.code === "PGRST202") || /Could not find/i.test(msg)) {
    return "Run supabase/migrations/20260921140000_onurik_shop_delivery_config.sql in Supabase, then refresh.";
  }
  return msg || "Could not load delivery settings.";
}

export async function loadDeliveryConfig(opts) {
  const force = opts && opts.force;
  if (loaded && !force) return cache;
  if (loadPromise && !force) return loadPromise;
  loadPromise = (async function () {
    loadError = "";
    if (!supabaseConfigured()) {
      loadError = "Add Supabase URL and anon key so these rules can sync to every shop visitor.";
      cache = defaultDeliveryConfig();
      loaded = true;
      return cache;
    }
    const sb = getSupabaseBrowser();
    if (!sb) {
      cache = defaultDeliveryConfig();
      loaded = true;
      return cache;
    }
    const { data, error } = await sb.rpc("onurik_public_shop_delivery_config");
    if (error) {
      loadError = missingRpcMessage(error);
      cache = defaultDeliveryConfig();
      loaded = true;
      return cache;
    }
    cache = normalizeDeliveryConfig(data);
    loaded = true;
    return cache;
  })();
  try {
    return await loadPromise;
  } finally {
    loadPromise = null;
  }
}

export async function saveDeliveryConfig(raw) {
  const next = normalizeDeliveryConfig(raw);
  if (!supabaseConfigured()) {
    throw new Error("Add Supabase URL and anon key, then reload.");
  }
  const secret = getDashboardReadSecret();
  if (!secret) {
    throw new Error("Set VITE_ADMIN_DASHBOARD_SECRET, rebuild, then reload.");
  }
  const sb = getSupabaseBrowser();
  if (!sb) throw new Error("Supabase is not configured.");
  const { error } = await sb.rpc("onurik_dashboard_shop_delivery_set", {
    p_secret: secret,
    p_config: next,
  });
  if (error) throw new Error(missingRpcMessage(error));
  cache = next;
  loaded = true;
  loadError = "";
  return cache;
}
