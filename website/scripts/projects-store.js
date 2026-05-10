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

const ONURIK_DEFAULT_PROJECTS = [
  {
    id: "proj-quantum-dash",
    title: "Quantum Dash",
    category: "Standard Projects",
    sortOrder: 0,
    tags: ["React", "TypeScript", "Node"],
    description:
      "A high-speed operations dashboard for real-time fleet visibility. It helps teams reduce response time and spot bottlenecks before they become outages.",
    projectUrl: "https://example.com/quantum-dash",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCbo9dFM9fv9T85fEKhNCeLJh2-fD9FEwowi4BWrloPgTOa9lUtefGZODPJ9wROAKrhyk8ZXzWfDovqKIu8bKEitnc6w3V8LdK-C3zCKsygXJ5tKAOLLsgj7MgH761ovChbZnKkocqWbDcLtlWkfDYkGCicqNo93n5D6o8xLhZy6UcDVlu7nmjPfI89OXjKH9_6M02k41kJ0ilkGfsPnibBnwCbzmo1_EoLp3dLjsbLPxRmK1hnMhs-8stb57sIlJPkGCVhXc502cbU",
    privacy: "public",
    status: "published",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "proj-aura-identity",
    title: "Aura Cosmetics",
    category: "Branding & Identity",
    sortOrder: 0,
    tags: ["Figma", "Brand Strategy", "Art Direction"],
    description:
      "A full visual identity and packaging direction for a skincare brand. The system balances premium minimalism with clear product storytelling.",
    projectUrl: "https://example.com/aura",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAK_DF7zbgWXwiChljgOZpEhEDdFQ4qcCmhF6g7PVuvGCjcVd4gOMrNXYO2ip83J_nWq_Xu2RUyFgj4lLeqAbL5XHvYjVDCuTuOE69ky7CHtAuDl6Xw6ucI2kyYtuoCoOt8dZW6gG8txvCXpyaqfBUuOvrN5mbpSnHUl_KT1-P8Bpo3rgsdHfRhaR3-1a2z18Xjw7dNgliDi8-FvShvouGhV3cIy35Pa_qPmwmuJtj4CGG9rqiw2OxG3VqqLxXRuN-BVd1xEyRt911-",
    privacy: "private",
    status: "published",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

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

function cloneProjects(items) {
  return items.map(function (item) {
    const sortOrder =
      typeof item.sortOrder === "number" && !Number.isNaN(item.sortOrder) ? item.sortOrder : undefined;
    return {
      id: item.id,
      title: item.title,
      category: item.category,
      tags: Array.isArray(item.tags) ? item.tags.slice() : [],
      description: item.description,
      projectUrl: item.projectUrl,
      image: item.image,
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

function normalizeProjects(raw) {
  if (!Array.isArray(raw)) return cloneProjects(ONURIK_DEFAULT_PROJECTS);
  const valid = raw.filter(function (item) {
    return item && item.id && item.title && item.category;
  });
  if (!valid.length) return cloneProjects(ONURIK_DEFAULT_PROJECTS);
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

export async function loadProjects() {
  try {
    await migrateFromLocalStorageOnce();
    let raw = await idbGet(ONURIK_PROJECTS_KEY);
    if (raw == null) {
      const seeded = cloneProjects(ONURIK_DEFAULT_PROJECTS);
      await saveProjects(seeded);
      return seeded;
    }
    return normalizeProjects(raw);
  } catch (_err) {
    return cloneProjects(ONURIK_DEFAULT_PROJECTS);
  }
}

export async function saveProjects(projects) {
  const normalized = normalizeProjects(projects);
  await idbPut(ONURIK_PROJECTS_KEY, normalized);
  return normalized;
}

export async function createProject(project) {
  const current = await loadProjects();
  const now = Date.now();
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
  const current = await loadProjects();
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

/** Move a project up (−1) or down (+1) within its category; swaps sortOrder with the adjacent row. */
export async function reorderProject(projectId, delta) {
  const current = await loadProjects();
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
  const current = await loadProjects();
  return saveProjects(
    current.filter(function (item) {
      return item.id !== id;
    })
  );
}

export async function findProject(id) {
  return (await loadProjects()).find(function (item) {
    return item.id === id;
  });
}
