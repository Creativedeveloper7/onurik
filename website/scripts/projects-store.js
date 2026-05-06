const ONURIK_PROJECTS_KEY = "onurik.projects.v1";

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

function cloneProjects(items) {
  return items.map(function (item) {
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
      createdAt: item.createdAt || Date.now(),
      updatedAt: item.updatedAt || Date.now(),
    };
  });
}

function normalizeProjects(raw) {
  if (!Array.isArray(raw)) return cloneProjects(ONURIK_DEFAULT_PROJECTS);
  const valid = raw.filter(function (item) {
    return item && item.id && item.title && item.category;
  });
  if (!valid.length) return cloneProjects(ONURIK_DEFAULT_PROJECTS);
  return cloneProjects(valid);
}

export function getCategories() {
  return ONURIK_PROJECT_CATEGORIES.slice();
}

export function loadProjects() {
  try {
    const raw = window.localStorage.getItem(ONURIK_PROJECTS_KEY);
    if (!raw) {
      const seeded = cloneProjects(ONURIK_DEFAULT_PROJECTS);
      saveProjects(seeded);
      return seeded;
    }
    return normalizeProjects(JSON.parse(raw));
  } catch (_err) {
    return cloneProjects(ONURIK_DEFAULT_PROJECTS);
  }
}

export function saveProjects(projects) {
  const normalized = normalizeProjects(projects);
  window.localStorage.setItem(ONURIK_PROJECTS_KEY, JSON.stringify(normalized));
  return normalized;
}

export function createProject(project) {
  const current = loadProjects();
  const now = Date.now();
  current.unshift({
    ...project,
    id: "proj-" + Math.random().toString(36).slice(2, 10),
    createdAt: now,
    updatedAt: now,
  });
  return saveProjects(current);
}

export function updateProject(id, patch) {
  const current = loadProjects();
  const next = current.map(function (item) {
    if (item.id !== id) return item;
    return {
      ...item,
      ...patch,
      updatedAt: Date.now(),
    };
  });
  return saveProjects(next);
}

export function deleteProject(id) {
  const current = loadProjects();
  return saveProjects(
    current.filter(function (item) {
      return item.id !== id;
    })
  );
}

export function findProject(id) {
  return loadProjects().find(function (item) {
    return item.id === id;
  });
}
