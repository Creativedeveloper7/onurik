/** Home page: fill the portfolio folder with project covers and run the services card deck. */
import { initFolders } from "./project-folders.js";

initFolders();

/*
 * Services deck: cards stack in one spot; the front card faces you and its neighbours
 * fan out tilted behind it. Click the front card (or swipe, the arrows, ←/→) to deal the
 * next one forward; click a card peeking out behind to bring it to the front.
 */
function initDeck(deck) {
  const cards = Array.from(deck.querySelectorAll(".home-step"));
  const count = deck.querySelector("[data-deck-count]");
  const progress = deck.querySelector("[data-deck-progress]");
  const n = cards.length;
  if (n < 2) return;
  let current = 0;

  function layout() {
    cards.forEach(function (card, i) {
      let pos = (i - current + n) % n; // 0 front, 1 next, n-1 previous
      if (pos === n - 1) pos = -1;
      else if (pos > 1) pos = 2;
      card.setAttribute("data-pos", String(pos));
      card.setAttribute("aria-hidden", pos === 0 ? "false" : "true");
      card.setAttribute("aria-label", i + 1 + " of " + n);
    });
    if (count) count.textContent = String(current + 1).padStart(2, "0") + " / " + String(n).padStart(2, "0");
    if (progress) progress.style.transform = "scaleX(" + ((current + 1) / n).toFixed(3) + ")";
  }

  function go(delta) {
    current = (current + delta + n) % n;
    layout();
  }

  deck.addEventListener("click", function (event) {
    const step = event.target.closest("[data-deck-step]");
    if (step) {
      go(Number(step.getAttribute("data-deck-step")));
      return;
    }
    const card = event.target.closest(".home-step");
    if (!card || deck.dataset.dragged === "1") return;
    const pos = Number(card.getAttribute("data-pos"));
    if (pos === 0) go(1);
    else if (pos === 1 || pos === -1) go(pos);
  });

  deck.addEventListener("keydown", function (event) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(-1);
    }
  });

  // Swipe / drag: the front card follows the pointer, then deals on release.
  const stage = deck.querySelector(".home-deck__stage");
  let drag = null;
  stage.addEventListener("pointerdown", function (event) {
    const front = cards[current];
    if (!front.contains(event.target)) return;
    drag = { x: event.clientX, dx: 0, front: front };
    deck.dataset.dragged = "0";
  });
  window.addEventListener("pointermove", function (event) {
    if (!drag) return;
    drag.dx = event.clientX - drag.x;
    if (Math.abs(drag.dx) > 6) {
      deck.classList.add("is-dragging");
      deck.dataset.dragged = "1";
      drag.front.style.setProperty("--deck-x", drag.dx + "px");
      drag.front.style.setProperty("--deck-r", (drag.dx * 0.03).toFixed(2) + "deg");
    }
  });
  window.addEventListener("pointerup", function () {
    if (!drag) return;
    const dx = drag.dx;
    const front = drag.front;
    drag = null;
    deck.classList.remove("is-dragging");
    front.style.removeProperty("--deck-x");
    front.style.removeProperty("--deck-r");
    if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
    // Let the click that ends a drag pass without also dealing a card.
    setTimeout(function () {
      deck.dataset.dragged = "0";
    }, 0);
  });

  layout();
}

document.querySelectorAll("[data-home-deck]").forEach(initDeck);
