import { getPublishedAds } from "./ads-store.js";
import { escapeHtml } from "./format.js";

function playSafe(video) {
  if (!video) return;
  const attempt = video.play();
  if (attempt && typeof attempt.catch === "function") {
    attempt.catch(function () {
      /* autoplay can be blocked until a gesture; stay muted and retry */
      video.muted = true;
      video.play().catch(function () {});
    });
  }
}

export async function mountShopAds(root) {
  if (!root) return;
  const ads = await getPublishedAds();
  const main = document.getElementById("shop-main");
  if (!ads.length) {
    root.innerHTML = "";
    root.hidden = true;
    document.body.classList.remove("has-shop-ads");
    if (main) main.classList.remove("shop-main--with-ads");
    return;
  }

  document.body.classList.add("has-shop-ads");
  if (main) main.classList.add("shop-main--with-ads");
  root.hidden = false;

  let index = 0;
  let muted = true;
  const objectUrls = ads
    .filter(function (ad) {
      return ad.source === "file" && ad.playUrl;
    })
    .map(function (ad) {
      return ad.playUrl;
    });

  function current() {
    return ads[index] || ads[0];
  }

  function renderFrame() {
    const ad = current();
    const single = ads.length === 1;
    root.innerHTML =
      '<div class="shop-ads__stage">' +
      '<video class="shop-ads__video" playsinline muted autoplay preload="auto"' +
      (single ? " loop" : "") +
      ' aria-label="' +
      escapeHtml(ad.title || "Shop film") +
      '"></video>' +
      '<div class="shop-ads__shade"></div>' +
      '<div class="shop-ads__copy">' +
      '<p class="shop-ads__kicker">Shop / Film</p>' +
      '<p class="shop-ads__title">' +
      escapeHtml(ad.title || "Onurik") +
      "</p>" +
      "</div>" +
      '<div class="shop-ads__controls">' +
      (ads.length > 1
        ? '<div class="shop-ads__dots" role="tablist" aria-label="Ads">' +
          ads
            .map(function (_item, i) {
              return (
                '<button type="button" class="shop-ads__dot' +
                (i === index ? " is-active" : "") +
                '" data-ad-index="' +
                i +
                '" aria-label="Play ad ' +
                (i + 1) +
                '"></button>'
              );
            })
            .join("") +
          "</div>"
        : "") +
      '<button type="button" class="shop-ads__mute" data-ad-mute aria-pressed="' +
      (muted ? "true" : "false") +
      '" aria-label="' +
      (muted ? "Unmute" : "Mute") +
      '">' +
      '<span class="material-symbols-outlined text-[18px]" aria-hidden="true">' +
      (muted ? "volume_off" : "volume_up") +
      "</span>" +
      "</button>" +
      "</div></div>";

    const video = root.querySelector(".shop-ads__video");
    if (!video) return;
    video.muted = muted;
    video.src = ad.playUrl;
    video.load();
    playSafe(video);

    if (!single) {
      video.addEventListener("ended", function () {
        index = (index + 1) % ads.length;
        renderFrame();
      });
    }
    video.addEventListener("error", function () {
      if (ads.length < 2) return;
      index = (index + 1) % ads.length;
      renderFrame();
    });
  }

  root.addEventListener("click", function (event) {
    const mute = event.target.closest("[data-ad-mute]");
    if (mute) {
      const video = root.querySelector(".shop-ads__video");
      if (!video) return;
      muted = !muted;
      video.muted = muted;
      mute.setAttribute("aria-pressed", muted ? "true" : "false");
      mute.setAttribute("aria-label", muted ? "Unmute" : "Mute");
      mute.innerHTML =
        '<span class="material-symbols-outlined text-[18px]" aria-hidden="true">' +
        (muted ? "volume_off" : "volume_up") +
        "</span>";
      if (!muted) playSafe(video);
      return;
    }
    const dot = event.target.closest("[data-ad-index]");
    if (dot) {
      index = Number(dot.getAttribute("data-ad-index")) || 0;
      renderFrame();
    }
  });

  window.addEventListener(
    "pagehide",
    function () {
      objectUrls.forEach(function (url) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          /* ignore */
        }
      });
    },
    { once: true }
  );

  renderFrame();
}
