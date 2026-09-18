const DB_NAME = "onurik-shop-ads";
const DB_VERSION = 1;
const META_STORE = "meta";
const BLOB_STORE = "blobs";
const LIST_KEY = "list";

export const MAX_ADS = 8;
export const MAX_AD_BYTES = 40 * 1024 * 1024;

function openDb() {
  return new Promise(function (resolve, reject) {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = function () {
      reject(req.error);
    };
    req.onsuccess = function () {
      resolve(req.result);
    };
    req.onupgradeneeded = function () {
      const db = req.result;
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
      if (!db.objectStoreNames.contains(BLOB_STORE)) {
        db.createObjectStore(BLOB_STORE);
      }
    };
  });
}

function idbGet(storeName, key) {
  return openDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(storeName, "readonly");
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onerror = function () {
        reject(req.error);
      };
    });
  });
}

function idbPut(storeName, key, value) {
  return openDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(storeName, "readwrite");
      const req = tx.objectStore(storeName).put(value, key);
      req.onsuccess = function () {
        resolve();
      };
      req.onerror = function () {
        reject(req.error);
      };
    });
  });
}

function idbDelete(storeName, key) {
  return openDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(storeName, "readwrite");
      const req = tx.objectStore(storeName).delete(key);
      req.onsuccess = function () {
        resolve();
      };
      req.onerror = function () {
        reject(req.error);
      };
    });
  });
}

function adId() {
  return "ad-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function isDirectVideoUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return false;
  if (raw.startsWith("/") && !raw.startsWith("//")) {
    return /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(raw);
  }
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = url.hostname.replace(/^www\./, "");
    if (
      host === "youtube.com" ||
      host === "youtu.be" ||
      host === "vimeo.com" ||
      host === "player.vimeo.com"
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function listAds() {
  try {
    const raw = await idbGet(META_STORE, LIST_KEY);
    return Array.isArray(raw) ? raw.slice() : [];
  } catch {
    return [];
  }
}

async function writeAds(items) {
  await idbPut(META_STORE, LIST_KEY, items);
  return items;
}

export async function resolveAdSrc(ad) {
  if (!ad) return "";
  if (ad.source === "url") return String(ad.url || "").trim();
  try {
    const blob = await idbGet(BLOB_STORE, ad.id);
    if (!blob) return "";
    return URL.createObjectURL(blob);
  } catch {
    return "";
  }
}

export async function listAdsResolved() {
  const list = await listAds();
  const next = [];
  for (let i = 0; i < list.length; i++) {
    const src = await resolveAdSrc(list[i]);
    next.push(Object.assign({}, list[i], { playUrl: src }));
  }
  return next.sort(function (a, b) {
    return (a.sortOrder || 0) - (b.sortOrder || 0);
  });
}

export async function getPublishedAds() {
  const list = await listAdsResolved();
  return list.filter(function (ad) {
    return ad.published !== false && ad.playUrl;
  });
}

export async function addAdFromFile(file, title) {
  const media = file && file.size ? file : null;
  if (!media) return { ok: false, error: "Choose a video file." };
  if (!/^video\//.test(media.type) && !/\.(mp4|webm|ogg|mov|m4v)$/i.test(media.name || "")) {
    return { ok: false, error: "Upload an MP4 or WebM clip." };
  }
  if (media.size > MAX_AD_BYTES) {
    return { ok: false, error: "Each clip must be under 40 MB." };
  }
  const list = await listAds();
  if (list.length >= MAX_ADS) {
    return { ok: false, error: "You can keep up to " + MAX_ADS + " ads." };
  }
  const id = adId();
  try {
    await idbPut(BLOB_STORE, id, media);
  } catch {
    return { ok: false, error: "This browser could not store that clip. Try a smaller file." };
  }
  const minOrder = list.reduce(function (min, item) {
    const order = typeof item.sortOrder === "number" ? item.sortOrder : 0;
    return Math.min(min, order);
  }, 0);
  list.unshift({
    id: id,
    title: String(title || media.name || "Shop ad").trim(),
    source: "file",
    url: "",
    mime: media.type || "video/mp4",
    filename: media.name || "video.mp4",
    size: media.size,
    published: true,
    createdAt: Date.now(),
    sortOrder: minOrder - 1,
  });
  await writeAds(list);
  return { ok: true, id: id };
}

export async function addAdFromUrl(url, title) {
  const href = String(url || "").trim();
  if (!isDirectVideoUrl(href)) {
    return { ok: false, error: "Paste a direct video URL (MP4/WebM), not a YouTube or Vimeo page." };
  }
  const list = await listAds();
  if (list.length >= MAX_ADS) {
    return { ok: false, error: "You can keep up to " + MAX_ADS + " ads." };
  }
  const minOrder = list.reduce(function (min, item) {
    const order = typeof item.sortOrder === "number" ? item.sortOrder : 0;
    return Math.min(min, order);
  }, 0);
  const id = adId();
  list.unshift({
    id: id,
    title: String(title || "Shop ad").trim() || "Shop ad",
    source: "url",
    url: href,
    mime: "video/mp4",
    filename: href.split("/").pop() || "video",
    size: 0,
    published: true,
    createdAt: Date.now(),
    sortOrder: minOrder - 1,
  });
  await writeAds(list);
  return { ok: true, id: id };
}

export async function setAdPublished(id, published) {
  const list = await listAds();
  const next = list.map(function (item) {
    if (item.id !== id) return item;
    return Object.assign({}, item, { published: Boolean(published) });
  });
  await writeAds(next);
}

export async function moveAd(id, direction) {
  const list = (await listAds()).sort(function (a, b) {
    return (a.sortOrder || 0) - (b.sortOrder || 0);
  });
  const index = list.findIndex(function (item) {
    return item.id === id;
  });
  if (index < 0) return;
  const swap = direction === "down" ? index + 1 : index - 1;
  if (swap < 0 || swap >= list.length) return;
  const currentOrder = list[index].sortOrder;
  list[index] = Object.assign({}, list[index], { sortOrder: list[swap].sortOrder });
  list[swap] = Object.assign({}, list[swap], { sortOrder: currentOrder });
  await writeAds(list);
}

export async function deleteAd(id) {
  const list = await listAds();
  await writeAds(
    list.filter(function (item) {
      return item.id !== id;
    })
  );
  try {
    await idbDelete(BLOB_STORE, id);
  } catch {
    /* ignore */
  }
}

export function formatAdSize(bytes) {
  const n = Number(bytes) || 0;
  if (n <= 0) return "URL";
  if (n < 1024 * 1024) return Math.max(1, Math.round(n / 1024)) + " KB";
  return (n / (1024 * 1024)).toFixed(1) + " MB";
}
