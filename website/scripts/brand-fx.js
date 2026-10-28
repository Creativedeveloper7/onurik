/**
 * Onurik brand motion — character-level lettering animation and poster effects.
 *
 *   [data-ob-chars="jumble pop wave|wobble"]  split into characters; jumble = hand-lettered
 *                                              baseline, pop = spring in on view, wave/wobble = idle loop.
 *                                              Every split char rubber-bands on hover.
 *   [data-ob-scramble]                         mono text decodes through random glyphs on view.
 *   [data-ob-float]                            bobbing tags; with [data-ob-depth] they also drift with the cursor.
 *   [data-ob-reveal] / [data-ob-draw]          scroll reveals and SVG stroke drawing.
 *   [data-ob-magnet]                           element leans toward the cursor.
 *   .ob-marquee                                track is cloned for a seamless loop.
 *
 * Safe to import on every page; call window.obBrandFx.refresh(root) after injecting markup.
 */

const reduceMotion =
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const finePointer =
  typeof window.matchMedia === "function" && window.matchMedia("(pointer: fine)").matches;

// Deterministic pseudo-random so the lettering looks identical on every load.
function seeded(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h) + 1;
}

const inViewObserver =
  "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            if (el.hasAttribute("data-ob-chars")) el.classList.add("ob-chars-in");
            if (el.hasAttribute("data-ob-scramble")) scramble(el);
            el.classList.add("is-in");
            inViewObserver.unobserve(el);
          });
        },
        { rootMargin: "0px 0px -6% 0px", threshold: 0.12 },
      )
    : null;

function watch(el) {
  if (reduceMotion || !inViewObserver) {
    el.classList.add("ob-chars-in", "is-in");
    return;
  }
  inViewObserver.observe(el);
}

/* ---------------- Character splitting ---------------- */

function splitChars(el) {
  if (el.dataset.obSplit === "1") return;
  const text = el.textContent.replace(/\s+/g, " ").trim();
  if (!text) return;
  const modes = (el.getAttribute("data-ob-chars") || "").split(/\s+/);
  const jumble = modes.includes("jumble");
  const amp = parseFloat(el.getAttribute("data-ob-amp") || "1");
  const rand = seeded(hashString(text));

  el.setAttribute("aria-label", text);
  el.textContent = "";
  let index = 0;
  text.split(" ").forEach((word, wi, words) => {
    const w = document.createElement("span");
    w.className = "ob-word";
    w.setAttribute("aria-hidden", "true");
    Array.from(word).forEach((ch) => {
      const c = document.createElement("span");
      c.className = "ob-char";
      c.textContent = ch;
      c.style.setProperty("--i", String(index++));
      if (jumble) {
        c.style.setProperty("--r", ((rand() - 0.5) * 12 * amp).toFixed(2) + "deg");
        c.style.setProperty("--y", ((rand() - 0.5) * 0.12 * amp).toFixed(3) + "em");
      }
      w.appendChild(c);
    });
    el.appendChild(w);
    if (wi < words.length - 1) el.appendChild(document.createTextNode(" "));
  });
  el.dataset.obSplit = "1";
  watch(el);
}

function boing(target) {
  if (!target || !target.classList || !target.classList.contains("ob-char")) return;
  if (target.classList.contains("is-boing")) return;
  target.classList.add("is-boing");
  target.addEventListener(
    "animationend",
    () => {
      target.classList.remove("is-boing");
    },
    { once: true },
  );
}

function initBoing() {
  if (reduceMotion) return;
  document.addEventListener(
    "pointerover",
    (e) => {
      boing(e.target);
    },
    { passive: true },
  );
}

/* ---------------- Scramble ---------------- */

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=?!";

function scramble(el) {
  const final = el.dataset.obScrambleText || el.textContent;
  el.dataset.obScrambleText = final;
  if (reduceMotion) {
    el.textContent = final;
    return;
  }
  el.classList.add("is-scrambling");
  const total = 22;
  let frame = 0;
  function tick() {
    frame++;
    const reveal = Math.floor((frame / total) * final.length);
    let out = "";
    for (let i = 0; i < final.length; i++) {
      const ch = final[i];
      if (i < reveal || ch === " ") out += ch;
      else out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    el.textContent = out;
    if (frame < total) requestAnimationFrame(tick);
    else {
      el.textContent = final;
      el.classList.remove("is-scrambling");
    }
  }
  requestAnimationFrame(tick);
}

/* ---------------- Float + cursor depth ---------------- */

function initFloat(root) {
  root.querySelectorAll("[data-ob-float]").forEach((el, i) => {
    if (el.dataset.obFloatReady) return;
    el.dataset.obFloatReady = "1";
    const rand = seeded(hashString(el.textContent + i));
    if (!el.style.getPropertyValue("--ob-float-delay")) {
      el.style.setProperty("--ob-float-delay", (-rand() * 5).toFixed(2) + "s");
    }
    if (!el.style.getPropertyValue("--ob-float-rot")) {
      el.style.setProperty("--ob-float-rot", ((rand() - 0.5) * 14).toFixed(1) + "deg");
    }
  });
}

let depthBound = false;
function initDepth() {
  if (depthBound || reduceMotion || !finePointer) return;
  depthBound = true;
  let raf = 0;
  let mx = 0;
  let my = 0;
  window.addEventListener(
    "pointermove",
    (e) => {
      mx = e.clientX / window.innerWidth - 0.5;
      my = e.clientY / window.innerHeight - 0.5;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        document.querySelectorAll("[data-ob-depth]").forEach((el) => {
          const d = parseFloat(el.getAttribute("data-ob-depth")) || 10;
          el.style.setProperty("--ob-px", (mx * d).toFixed(1) + "px");
          el.style.setProperty("--ob-py", (my * d).toFixed(1) + "px");
          if (!el.hasAttribute("data-ob-float")) {
            el.style.transform = `translate3d(${(mx * d).toFixed(1)}px, ${(my * d).toFixed(1)}px, 0)`;
          }
        });
      });
    },
    { passive: true },
  );
}

/* ---------------- Magnet ---------------- */

function initMagnet(root) {
  if (reduceMotion || !finePointer) return;
  root.querySelectorAll("[data-ob-magnet]").forEach((el) => {
    if (el.dataset.obMagnetReady) return;
    el.dataset.obMagnetReady = "1";
    const strength = parseFloat(el.getAttribute("data-ob-magnet")) || 0.25;
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) * strength;
      const y = (e.clientY - (r.top + r.height / 2)) * strength;
      el.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
    });
    el.addEventListener("pointerleave", () => {
      el.style.translate = "";
    });
  });
}

/* ---------------- Marquee ---------------- */

function initMarquee(root) {
  root.querySelectorAll(".ob-marquee").forEach((m) => {
    if (m.dataset.obMarqueeReady) return;
    const track = m.querySelector(".ob-marquee__track");
    if (!track) return;
    m.dataset.obMarqueeReady = "1";
    const clone = track.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    m.appendChild(clone);
  });
}

/* ---------------- Draw ---------------- */

function initDraw(root) {
  root.querySelectorAll("[data-ob-draw]").forEach((svg) => {
    if (svg.dataset.obDrawReady) return;
    svg.dataset.obDrawReady = "1";
    svg.querySelectorAll("path, line, polyline, circle").forEach((p, i) => {
      let len = 1000;
      try {
        len = Math.ceil(p.getTotalLength()) + 2;
      } catch {
        /* non-rendered element */
      }
      p.style.setProperty("--ob-len", String(len));
      p.style.setProperty("--ob-draw-delay", (i * 0.12).toFixed(2) + "s");
    });
    watch(svg);
  });
}

/* ---------------- Public ---------------- */

function refresh(root = document) {
  root.querySelectorAll("[data-ob-chars]").forEach(splitChars);
  root.querySelectorAll("[data-ob-scramble]").forEach((el) => {
    if (el.dataset.obScrambleReady) return;
    el.dataset.obScrambleReady = "1";
    watch(el);
  });
  root.querySelectorAll("[data-ob-reveal]").forEach((el) => {
    if (el.dataset.obRevealReady) return;
    el.dataset.obRevealReady = "1";
    watch(el);
  });
  initFloat(root);
  initMagnet(root);
  initMarquee(root);
  initDraw(root);
}

function boot() {
  refresh(document);
  initBoing();
  initDepth();
  // Re-scan markup injected later by page scripts (works grid, shop, orbit).
  if ("MutationObserver" in window) {
    let pending = false;
    new MutationObserver(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        refresh(document);
      });
    }).observe(document.body, { childList: true, subtree: true });
  }
}

window.obBrandFx = { refresh };

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
