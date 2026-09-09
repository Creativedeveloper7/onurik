import {
  getDashboardReadSecret,
  getSupabaseBrowser,
  supabaseConfigured,
} from "./supabase-browser.js";

const ONURIK_PROJECTS_KEY = "onurik.projects.v1";

const DB_NAME = "onurik-db";
const DB_VERSION = 1;
const STORE_NAME = "kv";

const ONURIK_PROJECT_CATEGORIES = [
  "Standard Projects",
  "Branding & Identity",
  "Design & Art Direction",
  "Development",
];

/** Predefined scope tags for case studies — extend this list as needed. */
export const ONURIK_SCOPE_TAG_OPTIONS = [
  "Brand Identity",
  "Web Design",
  "Web Development",
  "Campaign Strategy",
  "Ideation",
  "Product Design",
  "Art Direction",
];

function parseStringArray(value) {
  if (Array.isArray(value)) {
    return value
      .map(function (item) {
        return typeof item === "string" ? item.trim() : String(item || "").trim();
      })
      .filter(Boolean);
  }
  if (value && typeof value === "object") {
    try {
      return parseStringArray(Array.from(value));
    } catch (_e) {
      return [];
    }
  }
  return [];
}

export function getScopeTagOptions() {
  return ONURIK_SCOPE_TAG_OPTIONS.slice();
}

/** Offline/local seed only — unused when Supabase has projects. */
const ONURIK_DEFAULT_PROJECTS = [
  {
    id: "proj-quantum-dash",
    title: "Quantum Dash",
    client: "Quantum Labs",
    category: "Standard Projects",
    sortOrder: 0,
    tags: ["React", "TypeScript", "Node"],
    scopeTags: ["Web Development", "Product Design"],
    description:
      "A high-speed operations dashboard for real-time fleet visibility. It helps teams reduce response time and spot bottlenecks before they become outages.",
    challenge: "",
    approach: [],
    result: "",
    projectUrl: "https://example.com/quantum-dash",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCbo9dFM9fv9T85fEKhNCeLJh2-fD9FEwowi4BWrloPgTOa9lUtefGZODPJ9wROAKrhyk8ZXzWfDovqKIu8bKEitnc6w3V8LdK-C3zCKsygXJ5tKAOLLsgj7MgH761ovChbZnKkocqWbDcLtlWkfDYkGCicqNo93n5D6o8xLhZy6UcDVlu7nmjPfI89OXjKH9_6M02k41kJ0ilkGfsPnibBnwCbzmo1_EoLp3dLjsbLPxRmK1hnMhs-8stb57sIlJPkGCVhXc502cbU",
    images: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCbo9dFM9fv9T85fEKhNCeLJh2-fD9FEwowi4BWrloPgTOa9lUtefGZODPJ9wROAKrhyk8ZXzWfDovqKIu8bKEitnc6w3V8LdK-C3zCKsygXJ5tKAOLLsgj7MgH761ovChbZnKkocqWbDcLtlWkfDYkGCicqNo93n5D6o8xLhZy6UcDVlu7nmjPfI89OXjKH9_6M02k41kJ0ilkGfsPnibBnwCbzmo1_EoLp3dLjsbLPxRmK1hnMhs-8stb57sIlJPkGCVhXc502cbU",
    ],
    imagePosition: "center center",
    privacy: "public",
    status: "published",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "proj-aura-identity",
    title: "Aura Cosmetics",
    client: "Aura Cosmetics",
    category: "Branding & Identity",
    sortOrder: 0,
    tags: ["Figma", "Brand Strategy", "Art Direction"],
    scopeTags: ["Brand Identity", "Art Direction"],
    description:
      "A full visual identity and packaging direction for a skincare brand. The system balances premium minimalism with clear product storytelling.",
    challenge: "",
    approach: [],
    result: "",
    projectUrl: "https://example.com/aura",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAK_DF7zbgWXwiChljgOZpEhEDdFQ4qcCmhF6g7PVuvGCjcVd4gOMrNXYO2ip83J_nWq_Xu2RUyFgj4lLeqAbL5XHvYjVDCuTuOE69ky7CHtAuDl6Xw6ucI2kyYtuoCoOt8dZW6gG8txvCXpyaqfBUuOvrN5mbpSnHUl_KT1-P8Bpo3rgsdHfRhaR3-1a2z18Xjw7dNgliDi8-FvShvouGhV3cIy35Pa_qPmwmuJtj4CGG9rqiw2OxG3VqqLxXRuN-BVd1xEyRt911-",
    images: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAK_DF7zbgWXwiChljgOZpEhEDdFQ4qcCmhF6g7PVuvGCjcVd4gOMrNXYO2ip83J_nWq_Xu2RUyFgj4lLeqAbL5XHvYjVDCuTuOE69ky7CHtAuDl6Xw6ucI2kyYtuoCoOt8dZW6gG8txvCXpyaqfBUuOvrN5mbpSnHUl_KT1-P8Bpo3rgsdHfRhaR3-1a2z18Xjw7dNgliDi8-FvShvouGhV3cIy35Pa_qPmwmuJtj4CGG9rqiw2OxG3VqqLxXRuN-BVd1xEyRt911-",
    ],
    imagePosition: "center center",
    privacy: "private",
    status: "published",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

function useSupabaseProjects() {
  return supabaseConfigured();
}

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
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

function idbGet(key) {
  return openDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(key);
      getReq.onsuccess = function () {
        resolve(getReq.result);
      };
      getReq.onerror = function () {
        reject(getReq.error);
      };
    });
  });
}

function idbPut(key, value) {
  return openDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const putReq = store.put(value, key);
      putReq.onsuccess = function () {
        resolve();
      };
      putReq.onerror = function () {
        reject(putReq.error);
      };
    });
  });
}

async function migrateFromLocalStorageOnce() {
  try {
    const rawLs = window.localStorage.getItem(ONURIK_PROJECTS_KEY);
    if (!rawLs) return;
    const existing = await idbGet(ONURIK_PROJECTS_KEY);
    if (existing != null) {
      window.localStorage.removeItem(ONURIK_PROJECTS_KEY);
      return;
    }
    const parsed = JSON.parse(rawLs);
    if (Array.isArray(parsed)) {
      await idbPut(ONURIK_PROJECTS_KEY, parsed);
    }
    window.localStorage.removeItem(ONURIK_PROJECTS_KEY);
  } catch (_err) {
    /* leave localStorage intact if migration fails */
  }
}

/** Normalize gallery URLs; `image` is always the cover (first). */
export function normalizeProjectImages(project) {
  const fromArray = Array.isArray(project && project.images) ? project.images : [];
  const list = [];
  fromArray.forEach(function (src) {
    const value = typeof src === "string" ? src.trim() : "";
    if (value && list.indexOf(value) === -1) list.push(value);
  });
  if (list.length) return list;
  const cover =
    project && typeof project.image === "string" ? project.image.trim() : "";
  return cover ? [cover] : [];
}

export function getProjectCoverImage(project) {
  const images = normalizeProjectImages(project);
  return images[0] || "";
}

function cloneProjects(items) {
  return items.map(function (item) {
    const sortOrder =
      typeof item.sortOrder === "number" && !Number.isNaN(item.sortOrder) ? item.sortOrder : undefined;
    const images = normalizeProjectImages(item);
    return {
      id: item.id,
      title: item.title,
      client: typeof item.client === "string" ? item.client : "",
      category: item.category,
      tags: parseStringArray(item.tags),
      scopeTags: parseStringArray(item.scopeTags),
      description: item.description || "",
      challenge: typeof item.challenge === "string" ? item.challenge : "",
      approach: parseStringArray(item.approach),
      result: typeof item.result === "string" ? item.result : "",
      projectUrl: item.projectUrl,
      image: images[0] || item.image || "",
      images: images,
      imagePosition:
        typeof item.imagePosition === "string" && item.imagePosition.trim()
          ? item.imagePosition.trim()
          : "center center",
      privacy: item.privacy === "private" ? "private" : "public",
      status: item.status === "draft" ? "draft" : "published",
      sortOrder,
      createdAt: item.createdAt || Date.now(),
      updatedAt: item.updatedAt || Date.now(),
    };
  });
}

function normalizeSortOrdersWithinCategories(items) {
  const groups = new Map();
  items.forEach(function (p) {
    if (!groups.has(p.category)) groups.set(p.category, []);
    groups.get(p.category).push(p);
  });
  groups.forEach(function (list) {
    const allHaveOrder = list.every(function (p) {
      return typeof p.sortOrder === "number" && !Number.isNaN(p.sortOrder);
    });
    if (allHaveOrder) {
      list.sort(function (a, b) {
        const d = a.sortOrder - b.sortOrder;
        return d !== 0 ? d : String(a.id).localeCompare(String(b.id));
      });
      return;
    }
    list.sort(function (a, b) {
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
    list.forEach(function (p, i) {
      p.sortOrder = i;
    });
  });
}

/**
 * @param {unknown} raw
 * @param {{ allowDefaultSeed?: boolean }} [options] If false (remote loads), empty data stays empty instead of demo placeholders.
 */
function normalizeProjects(raw, options) {
  const allowDefaultSeed = !options || options.allowDefaultSeed !== false;
  if (!Array.isArray(raw)) {
    return allowDefaultSeed ? cloneProjects(ONURIK_DEFAULT_PROJECTS) : [];
  }
  const valid = raw.filter(function (item) {
    return item && item.id && item.title && item.category;
  });
  if (!valid.length) {
    return allowDefaultSeed ? cloneProjects(ONURIK_DEFAULT_PROJECTS) : [];
  }
  const cloned = cloneProjects(valid);
  normalizeSortOrdersWithinCategories(cloned);
  return cloned;
}

/** Lower sortOrder appears first within the same category on the public works page. */
export function compareProjectsByDisplayOrder(a, b) {
  const ao =
    typeof a.sortOrder === "number" && !Number.isNaN(a.sortOrder)
      ? a.sortOrder
      : Number.MAX_SAFE_INTEGER;
  const bo =
    typeof b.sortOrder === "number" && !Number.isNaN(b.sortOrder)
      ? b.sortOrder
      : Number.MAX_SAFE_INTEGER;
  if (ao !== bo) return ao - bo;
  return String(a.id).localeCompare(String(b.id));
}

export function getCategories() {
  return ONURIK_PROJECT_CATEGORIES.slice();
}

function dbRowToProject(row) {
  const imagesRaw = row.images;
  let images = [];
  if (Array.isArray(imagesRaw)) {
    images = imagesRaw;
  } else if (imagesRaw && typeof imagesRaw === "object") {
    try {
      images = Array.from(imagesRaw);
    } catch (_e) {
      images = [];
    }
  }
  const project = {
    id: row.id,
    title: row.title,
    client: row.client || "",
    category: row.category || row.category_of || "Standard Projects",
    tags: parseStringArray(row.tags),
    scopeTags: parseStringArray(row.scope_tags != null ? row.scope_tags : row.scopeTags),
    description: row.description || "",
    challenge: row.challenge || "",
    approach: parseStringArray(row.approach),
    result: row.result || "",
    projectUrl: row.project_url || "",
    image: row.image || "",
    images,
    imagePosition: row.image_position || row.imagePosition || "center center",
    privacy: row.privacy === "private" ? "private" : "public",
    status: row.status === "draft" ? "draft" : "published",
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : 0,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
  };
  const normalizedImages = normalizeProjectImages(project);
  project.images = normalizedImages;
  project.image = normalizedImages[0] || project.image || "";
  return project;
}

function projectToPayload(project) {
  const category = project.category || "Standard Projects";
  const images = normalizeProjectImages(project);
  return {
    id: project.id,
    title: project.title,
    client: project.client || "",
    category,
    category_of: category,
    tags: parseStringArray(project.tags),
    scopeTags: parseStringArray(project.scopeTags),
    description: project.description || "",
    challenge: project.challenge || "",
    approach: parseStringArray(project.approach),
    result: project.result || "",
    projectUrl: project.projectUrl || "",
    image: images[0] || project.image || "",
    images,
    imagePosition: project.imagePosition || "center center",
    privacy: project.privacy === "private" ? "private" : "public",
    status: project.status === "draft" ? "draft" : "published",
    sortOrder:
      typeof project.sortOrder === "number" && !Number.isNaN(project.sortOrder) ? project.sortOrder : 0,
    createdAt: project.createdAt || Date.now(),
    updatedAt: Date.now(),
  };
}

async function fetchProjectsPublic(sb) {
  const { data, error } = await sb.from("onurik_projects").select("*");
  if (error) throw error;
  return (data || []).map(dbRowToProject);
}

async function fetchProjectsAdmin(sb, secret) {
  const { data, error } = await sb.rpc("onurik_dashboard_projects_all", {
    p_secret: secret,
  });
  if (error) throw error;
  return (data || []).map(dbRowToProject);
}

async function upsertProjectRemote(project) {
  const sb = getSupabaseBrowser();
  const secret = getDashboardReadSecret();
  if (!sb || !secret) {
    throw new Error("dashboard_secret_missing");
  }
  const { error } = await sb.rpc("onurik_dashboard_project_upsert", {
    p_secret: secret,
    p_payload: projectToPayload(project),
  });
  if (error) throw error;
}

async function deleteProjectRemote(id) {
  const sb = getSupabaseBrowser();
  const secret = getDashboardReadSecret();
  if (!sb || !secret) {
    throw new Error("dashboard_secret_missing");
  }
  const { error } = await sb.rpc("onurik_dashboard_project_delete", {
    p_secret: secret,
    p_id: id,
  });
  if (error) throw error;
}

async function tryBulkImportFromIdb(sb, secret) {
  await migrateFromLocalStorageOnce();
  const raw = await idbGet(ONURIK_PROJECTS_KEY);
  if (!raw || !Array.isArray(raw) || raw.length === 0) return 0;
  const valid = raw.filter(function (item) {
    return item && item.id && item.title && item.category;
  });
  if (!valid.length) return 0;
  const cloned = cloneProjects(valid);
  normalizeSortOrdersWithinCategories(cloned);
  const payloads = cloned.map(projectToPayload);
  const { data, error } = await sb.rpc("onurik_dashboard_projects_import_bulk", {
    p_secret: secret,
    p_items: payloads,
  });
  if (error) {
    console.error("[onurik] projects import_bulk", error);
    return 0;
  }
  return typeof data === "number" ? data : 0;
}

async function loadProjectsFromIdb() {
  try {
    await migrateFromLocalStorageOnce();
    let raw = await idbGet(ONURIK_PROJECTS_KEY);
    if (raw == null) {
      const seeded = cloneProjects(ONURIK_DEFAULT_PROJECTS);
      await idbPut(ONURIK_PROJECTS_KEY, seeded);
      return seeded;
    }
    return normalizeProjects(raw);
  } catch (_err) {
    return cloneProjects(ONURIK_DEFAULT_PROJECTS);
  }
}

/**
 * @param {{ admin?: boolean }} [opts]
 * Pass `{ admin: true }` on Works Manager to load drafts and sync mutations (requires dashboard secret).
 */
export async function loadProjects(opts) {
  const admin = opts && opts.admin === true;

  if (!useSupabaseProjects()) {
    return loadProjectsFromIdb();
  }

  const sb = getSupabaseBrowser();
  if (!sb) {
    return loadProjectsFromIdb();
  }

  try {
    if (admin) {
      const secret = getDashboardReadSecret();
      if (!secret) {
        return [];
      }
      let list = await fetchProjectsAdmin(sb, secret);
      list = normalizeProjects(list, { allowDefaultSeed: false });
      if (list.length === 0) {
        const n = await tryBulkImportFromIdb(sb, secret);
        if (n > 0) {
          list = normalizeProjects(await fetchProjectsAdmin(sb, secret), {
            allowDefaultSeed: false,
          });
        }
      }
      return list;
    }
    const list = await fetchProjectsPublic(sb);
    return normalizeProjects(list, { allowDefaultSeed: false });
  } catch (err) {
    console.error("[onurik] loadProjects (Supabase)", err);
    return [];
  }
}

export async function saveProjects(projects) {
  if (useSupabaseProjects()) {
    const secret = getDashboardReadSecret();
    if (!secret) {
      throw new Error("dashboard_secret_missing");
    }
    const normalized = normalizeProjects(projects, { allowDefaultSeed: false });
    for (let i = 0; i < normalized.length; i++) {
      await upsertProjectRemote(normalized[i]);
    }
    return normalized;
  }
  const normalized = normalizeProjects(projects);
  await idbPut(ONURIK_PROJECTS_KEY, normalized);
  return normalized;
}

export async function createProject(project) {
  const now = Date.now();
  if (useSupabaseProjects()) {
    const current = await loadProjects({ admin: true });
    const peers = current.filter(function (p) {
      return p.category === project.category;
    });
    let sortOrder = 0;
    if (peers.length) {
      const orders = peers.map(function (p) {
        return typeof p.sortOrder === "number" ? p.sortOrder : 0;
      });
      sortOrder = Math.min.apply(null, orders) - 1;
    }
    const created = {
      ...project,
      sortOrder,
      id: "proj-" + Math.random().toString(36).slice(2, 10),
      createdAt: now,
      updatedAt: now,
    };
    await upsertProjectRemote(created);
    return loadProjects({ admin: true });
  }

  const current = await loadProjectsFromIdb();
  const peers = current.filter(function (p) {
    return p.category === project.category;
  });
  let sortOrder = 0;
  if (peers.length) {
    const orders = peers.map(function (p) {
      return typeof p.sortOrder === "number" ? p.sortOrder : 0;
    });
    sortOrder = Math.min.apply(null, orders) - 1;
  }
  current.unshift({
    ...project,
    sortOrder,
    id: "proj-" + Math.random().toString(36).slice(2, 10),
    createdAt: now,
    updatedAt: now,
  });
  return saveProjects(current);
}

export async function updateProject(id, patch) {
  if (useSupabaseProjects()) {
    const current = await loadProjects({ admin: true });
    const next = current.map(function (item) {
      if (item.id !== id) return item;
      const merged = {
        ...item,
        ...patch,
        updatedAt: Date.now(),
      };
      if (patch.category != null && patch.category !== item.category) {
        const newPeers = current.filter(function (p) {
          return p.category === patch.category && p.id !== id;
        });
        const maxO = newPeers.reduce(function (m, p) {
          const o = typeof p.sortOrder === "number" ? p.sortOrder : 0;
          return Math.max(m, o);
        }, -1);
        merged.sortOrder = maxO + 1;
      }
      return merged;
    });
    const updated = next.find(function (p) {
      return p.id === id;
    });
    if (updated) await upsertProjectRemote(updated);
    return loadProjects({ admin: true });
  }

  const current = await loadProjectsFromIdb();
  const next = current.map(function (item) {
    if (item.id !== id) return item;
    const merged = {
      ...item,
      ...patch,
      updatedAt: Date.now(),
    };
    if (patch.category != null && patch.category !== item.category) {
      const newPeers = current.filter(function (p) {
        return p.category === patch.category && p.id !== id;
      });
      const maxO = newPeers.reduce(function (m, p) {
        const o = typeof p.sortOrder === "number" ? p.sortOrder : 0;
        return Math.max(m, o);
      }, -1);
      merged.sortOrder = maxO + 1;
    }
    return merged;
  });
  return saveProjects(next);
}

export async function reorderProject(projectId, delta) {
  if (useSupabaseProjects()) {
    const current = await loadProjects({ admin: true });
    const subject = current.find(function (p) {
      return p.id === projectId;
    });
    if (!subject) return current;
    const cat = subject.category;
    const inCat = current
      .filter(function (p) {
        return p.category === cat;
      })
      .sort(function (a, b) {
        return compareProjectsByDisplayOrder(a, b);
      });
    const idx = inCat.findIndex(function (p) {
      return p.id === projectId;
    });
    const swapIdx = idx + delta;
    if (idx < 0 || swapIdx < 0 || swapIdx >= inCat.length) return current;
    const a = inCat[idx];
    const b = inCat[swapIdx];
    const orderA = typeof a.sortOrder === "number" ? a.sortOrder : idx;
    const orderB = typeof b.sortOrder === "number" ? b.sortOrder : swapIdx;
    const now = Date.now();
    await upsertProjectRemote({ ...a, sortOrder: orderB, updatedAt: now });
    await upsertProjectRemote({ ...b, sortOrder: orderA, updatedAt: now });
    return loadProjects({ admin: true });
  }

  const current = await loadProjectsFromIdb();
  const subject = current.find(function (p) {
    return p.id === projectId;
  });
  if (!subject) return current;
  const cat = subject.category;
  const inCat = current
    .filter(function (p) {
      return p.category === cat;
    })
    .sort(function (a, b) {
      return compareProjectsByDisplayOrder(a, b);
    });
  const idx = inCat.findIndex(function (p) {
    return p.id === projectId;
  });
  const swapIdx = idx + delta;
  if (idx < 0 || swapIdx < 0 || swapIdx >= inCat.length) return current;
  const a = inCat[idx];
  const b = inCat[swapIdx];
  const orderA = typeof a.sortOrder === "number" ? a.sortOrder : idx;
  const orderB = typeof b.sortOrder === "number" ? b.sortOrder : swapIdx;
  const next = current.map(function (p) {
    if (p.id === a.id) return { ...p, sortOrder: orderB, updatedAt: Date.now() };
    if (p.id === b.id) return { ...p, sortOrder: orderA, updatedAt: Date.now() };
    return p;
  });
  return saveProjects(next);
}

export async function deleteProject(id) {
  if (useSupabaseProjects()) {
    await deleteProjectRemote(id);
    return loadProjects({ admin: true });
  }
  const current = await loadProjectsFromIdb();
  return saveProjects(
    current.filter(function (item) {
      return item.id !== id;
    }),
  );
}

export async function findProject(id) {
  return (await loadProjects()).find(function (item) {
    return item.id === id;
  });
}
