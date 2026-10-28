/**
 * Onurik brand motion — character-level lettering animation and poster effects.
 *
 *   [data-ob-chars="pop wave|wobble"]          split into characters; pop = letters rise out of a blur on
 *                                              view, wave = an orange glint travels across, wobble = slow
 *                                              float. Every split char lifts and lights up on hover.
 *                                              ("jumble" from the poster theme is accepted and ignored.)
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

/* ---------------- Carousel ---------------- */
/*
 * <div class="ob-carousel" data-ob-carousel aria-label="…" [data-ob-carousel-auto="5000"]>
 *   <div class="ob-carousel__track"> …slides (direct children)… </div>
 * </div>
 * Native scroll-snap does the swiping; this adds arrows, a counter, a progress bar,
 * mouse drag, arrow keys and optional autoplay. Slides may be re-rendered at any time.
 */

function carouselSlides(track) {
  return Array.from(track.children).filter((el) => el.offsetParent !== null || el.getClientRects().length);
}

function initCarousel(root) {
  if (root.dataset.obCarouselReady) return;
  const track = root.querySelector(".ob-carousel__track");
  if (!track) return;
  root.dataset.obCarouselReady = "1";
  root.setAttribute("role", "region");
  root.setAttribute("aria-roledescription", "carousel");
  track.setAttribute("tabindex", "0");

  const bar = document.createElement("div");
  bar.className = "ob-carousel__bar";
  bar.innerHTML =
    '<button type="button" class="ob-carousel__arrow" data-dir="-1" aria-label="Previous">' +
    '<span class="material-symbols-outlined" aria-hidden="true">arrow_back</span></button>' +
    '<button type="button" class="ob-carousel__arrow" data-dir="1" aria-label="Next">' +
    '<span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span></button>' +
    '<span class="ob-carousel__count" aria-live="polite"></span>' +
    '<span class="ob-carousel__progress" aria-hidden="true"><span></span></span>';
  root.appendChild(bar);

  const prevBtn = bar.querySelector('[data-dir="-1"]');
  const nextBtn = bar.querySelector('[data-dir="1"]');
  const count = bar.querySelector(".ob-carousel__count");
  const fill = bar.querySelector(".ob-carousel__progress span");
  const pad = (n) => String(n).padStart(2, "0");

  function maxScroll() {
    return Math.max(0, track.scrollWidth - track.clientWidth);
  }

  function currentIndex(slides) {
    const start = track.getBoundingClientRect().left + parseFloat(getComputedStyle(track).paddingLeft || "0");
    let best = 0;
    let bestDist = Infinity;
    slides.forEach((s, i) => {
      const d = Math.abs(s.getBoundingClientRect().left - start);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  }

  function update() {
    const slides = carouselSlides(track);
    const max = maxScroll();
    const scrollable = max > 2 && slides.length > 1;
    root.classList.toggle("is-static", !scrollable);
    if (!scrollable) return;
    const atEnd = track.scrollLeft >= max - 2;
    const idx = atEnd ? slides.length - 1 : currentIndex(slides);
    count.textContent = pad(idx + 1) + " / " + pad(slides.length);
    fill.style.transform = "scaleX(" + Math.max(0.04, Math.min(1, track.scrollLeft / max)).toFixed(3) + ")";
    const loop = root.hasAttribute("data-ob-carousel-auto");
    prevBtn.disabled = !loop && track.scrollLeft <= 2;
    nextBtn.disabled = !loop && atEnd;
  }

  function go(dir) {
    const slides = carouselSlides(track);
    if (!slides.length) return;
    const max = maxScroll();
    if (dir > 0 && track.scrollLeft >= max - 2) {
      track.scrollTo({ left: 0, behavior: reduceMotion ? "auto" : "smooth" });
      return;
    }
    if (dir < 0 && track.scrollLeft <= 2) {
      track.scrollTo({ left: max, behavior: reduceMotion ? "auto" : "smooth" });
      return;
    }
    const target = slides[Math.max(0, Math.min(slides.length - 1, currentIndex(slides) + dir))];
    const offset =
      target.getBoundingClientRect().left -
      track.getBoundingClientRect().left -
      parseFloat(getComputedStyle(track).paddingLeft || "0");
    track.scrollBy({ left: offset, behavior: reduceMotion ? "auto" : "smooth" });
  }

  bar.addEventListener("click", (e) => {
    const btn = e.target.closest(".ob-carousel__arrow");
    if (btn) go(Number(btn.dataset.dir));
  });

  track.addEventListener("keydown", (e) => {
    if (e.target !== track) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    }
  });

  let raf = 0;
  track.addEventListener(
    "scroll",
    () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        update();
      });
    },
    { passive: true },
  );

  // Mouse drag (touch already swipes natively).
  let drag = null;
  track.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || maxScroll() <= 2) return;
    drag = { x: e.clientX, left: track.scrollLeft, moved: false };
  });
  window.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 6) {
      drag.moved = true;
      root.classList.add("is-dragging");
    }
    if (drag.moved) track.scrollLeft = drag.left - dx;
  });
  window.addEventListener("pointerup", () => {
    if (!drag) return;
    const moved = drag.moved;
    drag = null;
    root.classList.remove("is-dragging");
    if (moved) {
      // Swallow the click that ends a drag so cards don't open by accident.
      const swallow = (ev) => ev.preventDefault();
      track.addEventListener("click", swallow, { capture: true, once: true });
      setTimeout(() => {
        track.removeEventListener("click", swallow, { capture: true });
        go(0);
      }, 0);
    }
  });
  track.addEventListener("dragstart", (e) => e.preventDefault());

  // Optional autoplay, paused while the visitor is engaging with it.
  const autoMs = parseInt(root.getAttribute("data-ob-carousel-auto") || "0", 10);
  if (autoMs > 0 && !reduceMotion) {
    let paused = false;
    const pause = () => {
      paused = true;
    };
    const resume = () => {
      paused = false;
    };
    root.addEventListener("pointerenter", pause);
    root.addEventListener("pointerleave", resume);
    root.addEventListener("focusin", pause);
    root.addEventListener("focusout", resume);
    track.addEventListener("touchstart", pause, { passive: true });
    setInterval(() => {
      if (!paused && !document.hidden && maxScroll() > 2) go(1);
    }, autoMs);
  }

  if ("ResizeObserver" in window) new ResizeObserver(update).observe(track);
  new MutationObserver(() => {
    requestAnimationFrame(update);
  }).observe(track, { childList: true });
  window.addEventListener("load", update, { once: true });
  update();
}

function initCarousels(root) {
  root.querySelectorAll("[data-ob-carousel]").forEach(initCarousel);
}

/* ---------------- Step flow connectors ---------------- */
/*
 * <div class="ob-flow" data-ob-flow> <div class="ob-flow__step">…</div> ×n </div>
 * Draws glowing elbow lines from each step's bottom edge to the next step's top edge,
 * with a dot at both ends. Redrawn when the layout changes size.
 */

function drawFlow(flow) {
  const steps = Array.from(flow.querySelectorAll(":scope > .ob-flow__step"));
  let svg = flow.querySelector(":scope > .ob-flow__svg");
  if (!svg) {
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "ob-flow__svg");
    svg.setAttribute("aria-hidden", "true");
    flow.prepend(svg);
  }
  const box = flow.getBoundingClientRect();
  svg.setAttribute("viewBox", `0 0 ${box.width.toFixed(1)} ${box.height.toFixed(1)}`);
  const r = 18;
  let out = "";
  for (let i = 0; i < steps.length - 1; i++) {
    const a = steps[i].getBoundingClientRect();
    const b = steps[i + 1].getBoundingClientRect();
    const x1 = a.left - box.left + Math.min(a.width * 0.32, 160);
    const y1 = a.bottom - box.top;
    const x2 = b.left - box.left + Math.min(b.width * 0.32, 160);
    const y2 = b.top - box.top;
    const midY = (y1 + y2) / 2;
    let d;
    if (Math.abs(x2 - x1) < 4) {
      d = `M${x1} ${y1} V${y2}`;
    } else {
      const dir = x2 > x1 ? 1 : -1;
      const rr = Math.min(r, Math.abs(x2 - x1) / 2, Math.abs(midY - y1));
      d =
        `M${x1} ${y1} V${midY - rr} Q${x1} ${midY} ${x1 + dir * rr} ${midY}` +
        ` H${x2 - dir * rr} Q${x2} ${midY} ${x2} ${midY + rr} V${y2}`;
    }
    out +=
      `<path d="${d}"/>` +
      `<circle cx="${x1}" cy="${y1}" r="4.5"/><circle cx="${x2}" cy="${y2}" r="4.5"/>`;
  }
  svg.innerHTML = out;
  // Re-arm stroke drawing for the new paths.
  if (!reduceMotion) {
    svg.querySelectorAll("path").forEach((p) => {
      const len = Math.ceil(p.getTotalLength()) + 2;
      p.style.strokeDasharray = String(len);
      p.style.strokeDashoffset = flow.classList.contains("is-in") ? "0" : String(len);
      p.style.transition = "stroke-dashoffset 1.6s cubic-bezier(0.22, 1, 0.36, 1)";
    });
  }
}

function initFlows(root) {
  root.querySelectorAll("[data-ob-flow]").forEach((flow) => {
    if (flow.dataset.obFlowReady) return;
    flow.dataset.obFlowReady = "1";
    let raf = 0;
    const redraw = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        drawFlow(flow);
      });
    };
    if ("ResizeObserver" in window) new ResizeObserver(redraw).observe(flow);
    window.addEventListener("load", redraw, { once: true });
    drawFlow(flow);
    const reveal = () => {
      flow.classList.add("is-in");
      flow.querySelectorAll(".ob-flow__svg path").forEach((p) => {
        p.style.strokeDashoffset = "0";
      });
    };
    if (reduceMotion || !("IntersectionObserver" in window)) {
      reveal();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          reveal();
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(flow);
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
  initCarousels(root);
  initFlows(root);
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
