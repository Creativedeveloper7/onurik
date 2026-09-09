/**
 * Homepage “What We Do” — radial service orbit (md+) / card stack (mobile).
 * Edit SERVICES_PILLARS to change copy without touching layout.
 */

export const SERVICES_PILLARS = [
  {
    title: "Branding",
    description:
      "Identity that's unmistakably you — visual and verbal systems built to scale, stand out, and stick.",
    subServices: ["Identity Design", "Brand Systems", "Visual Identity", "Motion Identity"],
  },
  {
    title: "Strategy & Campaigns",
    description:
      "Sharpen the narrative, then move markets — strategy and campaigns that turn audiences into believers.",
    subServices: [
      "Brand Strategy",
      "Campaign Ideation",
      "Content Strategy",
      "Communications Planning",
    ],
  },
  {
    title: "Systems Development",
    description:
      "Beyond a website — dashboards, product systems, and digital experiences engineered to perform.",
    subServices: [
      "Web Design",
      "Front-End Development",
      "Dashboard & Product Systems",
      "Digital Experience",
    ],
  },
  {
    title: "Product & Experience",
    description:
      "Where usability meets intent — products and experiences designed around how people actually behave.",
    subServices: ["UX Research & Flows", "Product Design", "Interaction Design", "Prototyping"],
  },
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Evenly spaced angles around the ring, starting at top (−90°). */
function nodeAngles(count) {
  const n = Math.max(count, 1);
  const step = 360 / n;
  const angles = [];
  for (let i = 0; i < n; i++) angles.push(-90 + i * step);
  return angles;
}

function orbitSideFromAngle(angleDeg) {
  const cos = Math.cos((angleDeg * Math.PI) / 180);
  if (cos > 0.35) return "right";
  if (cos < -0.35) return "left";
  return "center";
}

function renderMobileCards(root) {
  root.innerHTML = SERVICES_PILLARS.map(function (pillar) {
    return (
      '<article class="rounded-xl border border-white/15 bg-surface-container-low p-6 md:p-7">' +
      '<h3 class="font-montserrat text-lg font-semibold text-white">' +
      escapeHtml(pillar.title) +
      "</h3>" +
      '<p class="mt-3 text-sm leading-relaxed text-[#c8c7be] md:text-[15px]">' +
      escapeHtml(pillar.description) +
      "</p>" +
      '<ul class="mt-5 space-y-2 border-t border-white/15 pt-4">' +
      pillar.subServices
        .map(function (item) {
          return (
            '<li class="flex gap-2.5 text-sm text-white/80">' +
            '<span class="mt-2 h-1 w-1 shrink-0 rounded-full bg-white/60" aria-hidden="true"></span>' +
            "<span>" +
            escapeHtml(item) +
            "</span></li>"
          );
        })
        .join("") +
      "</ul></article>"
    );
  }).join("");
}

function renderOrbit(root) {
  const radiusPct = 38;
  const angles = nodeAngles(SERVICES_PILLARS.length);
  const nodesHtml = SERVICES_PILLARS.map(function (pillar, index) {
    const angle = angles[index];
    const rad = (angle * Math.PI) / 180;
    const x = 50 + radiusPct * Math.cos(rad);
    const y = 50 + radiusPct * Math.sin(rad);
    const side = orbitSideFromAngle(angle);
    return (
      '<div class="services-orbit__node" style="left:' +
      x.toFixed(2) +
      "%;top:" +
      y.toFixed(2) +
      '%;" data-orbit-index="' +
      index +
      '" data-orbit-side="' +
      side +
      '">' +
      '<div class="services-orbit__counter">' +
      '<button type="button" class="services-orbit__hit" aria-expanded="false" aria-controls="services-orbit-panel-' +
      index +
      '" data-orbit-toggle="' +
      index +
      '">' +
      '<span class="services-orbit__dot" aria-hidden="true"></span>' +
      '<span class="services-orbit__label font-montserrat">' +
      escapeHtml(pillar.title) +
      "</span>" +
      "</button>" +
      '<div id="services-orbit-panel-' +
      index +
      '" class="services-orbit__panel" data-orbit-panel="' +
      index +
      '" role="region" aria-label="' +
      escapeHtml(pillar.title) +
      ' details" aria-hidden="true">' +
      '<p class="services-orbit__panel-desc">' +
      escapeHtml(pillar.description) +
      "</p>" +
      "<ul>" +
      pillar.subServices
        .map(function (item) {
          return "<li>" + escapeHtml(item) + "</li>";
        })
        .join("") +
      "</ul></div></div></div>"
    );
  }).join("");

  const lines = angles
    .map(function (angle) {
      const rad = (angle * Math.PI) / 180;
      const x2 = 50 + radiusPct * Math.cos(rad);
      const y2 = 50 + radiusPct * Math.sin(rad);
      return (
        '<line x1="50" y1="50" x2="' +
        x2.toFixed(2) +
        '" y2="' +
        y2.toFixed(2) +
        '" class="services-orbit__spoke" stroke="url(#services-orbit-spoke-grad)"/>'
      );
    })
    .join("");

  /* Soft traveling dots along spokes — visual only; CSS offset-path */
  const pulses = angles
    .map(function (angle, index) {
      const rad = (angle * Math.PI) / 180;
      const x2 = 50 + radiusPct * Math.cos(rad);
      const y2 = 50 + radiusPct * Math.sin(rad);
      const path =
        "path('M 50 50 L " + x2.toFixed(2) + " " + y2.toFixed(2) + "')";
      return (
        '<circle class="services-orbit__pulse" r="0.85" cx="50" cy="50" style="offset-path:' +
        path +
        ";animation-delay:" +
        (index * 1.3).toFixed(1) +
        's" aria-hidden="true"/>'
      );
    })
    .join("");

  root.innerHTML =
    '<div class="services-orbit" data-services-orbit>' +
    '<div class="services-orbit__stage">' +
    '<div class="services-orbit__spin" data-orbit-spin aria-hidden="true">' +
    '<svg class="services-orbit__svg" viewBox="0 0 100 100" focusable="false">' +
    "<defs>" +
    '<linearGradient id="services-orbit-ring-grad" x1="50%" y1="0%" x2="50%" y2="100%">' +
    '<stop offset="0%" stop-color="rgba(232,226,214,0.5)"/>' +
    '<stop offset="55%" stop-color="rgba(71,71,65,0.4)"/>' +
    '<stop offset="100%" stop-color="rgba(71,71,65,0.14)"/>' +
    "</linearGradient>" +
    '<linearGradient id="services-orbit-ring-grad-inner" x1="50%" y1="0%" x2="50%" y2="100%">' +
    '<stop offset="0%" stop-color="rgba(232,226,214,0.34)"/>' +
    '<stop offset="100%" stop-color="rgba(71,71,65,0.12)"/>' +
    "</linearGradient>" +
    '<linearGradient id="services-orbit-spoke-grad" x1="0%" y1="0%" x2="100%" y2="100%">' +
    '<stop offset="0%" stop-color="rgba(232,226,214,0.48)"/>' +
    '<stop offset="100%" stop-color="rgba(232,226,214,0.12)"/>' +
    "</linearGradient>" +
    "</defs>" +
    '<circle cx="50" cy="50" r="46" class="services-orbit__ring" stroke="url(#services-orbit-ring-grad)"/>' +
    '<circle cx="50" cy="50" r="32" class="services-orbit__ring services-orbit__ring--inner" stroke="url(#services-orbit-ring-grad-inner)"/>' +
    lines +
    pulses +
    "</svg>" +
    nodesHtml +
    "</div>" +
    '<div class="services-orbit__center">' +
    '<span class="services-orbit__center-glow" aria-hidden="true"></span>' +
    '<span class="font-montserrat font-semibold tracking-tight text-white">Onurik</span>' +
    "</div>" +
    "</div></div>";
}

function bindOrbitInteractions(root) {
  const orbit = root.querySelector("[data-services-orbit]");
  if (!orbit) return;

  let openIndex = -1;
  const prefersHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function setOpen(index) {
    openIndex = index;
    orbit.classList.toggle("is-open", openIndex >= 0);
    orbit.querySelectorAll("[data-orbit-index]").forEach(function (node) {
      const i = Number(node.getAttribute("data-orbit-index"));
      const active = i === openIndex;
      node.classList.toggle("is-open", active);
      const btn = node.querySelector("[data-orbit-toggle]");
      const panel = node.querySelector("[data-orbit-panel]");
      if (btn) btn.setAttribute("aria-expanded", active ? "true" : "false");
      if (panel) panel.setAttribute("aria-hidden", active ? "false" : "true");
    });
  }

  function closeAll() {
    setOpen(-1);
  }

  orbit.querySelectorAll("[data-orbit-toggle]").forEach(function (btn) {
    const index = Number(btn.getAttribute("data-orbit-toggle"));

    btn.addEventListener("click", function (event) {
      event.preventDefault();
      if (openIndex === index) closeAll();
      else setOpen(index);
    });

    if (prefersHover) {
      btn.addEventListener("mouseenter", function () {
        setOpen(index);
      });
    }
  });

  if (prefersHover) {
    orbit.addEventListener("mouseleave", function () {
      closeAll();
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeAll();
  });
}

export function initServicesOrbit() {
  const mobileRoot = document.getElementById("services-orbit-mobile");
  const desktopRoot = document.getElementById("services-orbit-desktop");
  if (mobileRoot) renderMobileCards(mobileRoot);
  if (desktopRoot) {
    renderOrbit(desktopRoot);
    bindOrbitInteractions(desktopRoot);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initServicesOrbit);
} else {
  initServicesOrbit();
}
