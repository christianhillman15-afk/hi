/* =============================================================
   DK3 — scroll-scrubbed pre-rendered build sequence (drop-in)

   This plays a PHOTOREAL rendered frame sequence (or a video) tied to
   scroll — the same technique premium property sites use. Until you add
   a real render, this module stays dormant and the live 3D model in
   build3d.js is used automatically, so nothing ever breaks.

   ── TO GO LIVE ──────────────────────────────────────────────
   1. Render your build animation (see assets/build-sequence/RENDER-SPEC.md).
   2. Drop the frames into  assets/build-sequence/  named
      frame_0001.jpg … frame_0120.jpg  (zero-padded, sequential).
   3. In the SEQ config below set  enabled: true  and  count: <your frame count>.
      (Or set  video: "assets/build-sequence/build.mp4"  to use a video instead.)
   That's it — the photoreal scrub replaces the live model on next load.
   ============================================================= */
(function () {
  "use strict";

  /* ---------------- CONFIG — edit this block ---------------- */
  var SEQ = {
    enabled: false,                    // ← flip to true once frames/video are in place
    // -- image-sequence mode (preferred: smoothest scrub) --
    path:   "assets/build-sequence/",
    prefix: "frame_",
    pad:    4,                         // frame_0001.jpg
    ext:    "jpg",
    first:  1,
    count:  120,                       // total number of rendered frames
    // -- OR video mode (leave "" to use the image sequence above) --
    video:  ""                         // e.g. "assets/build-sequence/build.mp4"
  };
  /* --------------------------------------------------------- */

  var canvas = document.getElementById("build-canvas");
  if (!canvas) return;
  if (!SEQ.enabled) return;            // dormant → build3d.js (live model) runs
  window.__dk3SeqActive = true;        // signal build3d.js to stand down

  var section = document.querySelector(".xform");
  if (section) section.setAttribute("data-3d", "on"); // hides the static fallback img

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var ctx = canvas.getContext("2d");
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var lastP = 0;

  function sizeCanvas() {
    var w = canvas.clientWidth || canvas.offsetWidth, h = canvas.clientHeight || canvas.offsetHeight;
    if (!w || !h) return;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  }
  function drawCover(src) {
    if (!src) return;
    var iw = src.naturalWidth || src.videoWidth, ih = src.naturalHeight || src.videoHeight;
    if (!iw || !ih) return;
    var cw = canvas.width, ch = canvas.height;
    var s = Math.max(cw / iw, ch / ih), w = iw * s, h = ih * s;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(src, (cw - w) / 2, (ch - h) / 2, w, h);
  }

  /* ---- optional loading indicator in the xform UI ---- */
  var loader = null;
  function showLoader() {
    var host = document.querySelector(".xform__sticky");
    if (!host) return;
    loader = document.createElement("div");
    loader.className = "seq-loader";
    loader.innerHTML = '<span class="seq-loader__bar"><span></span></span><span class="seq-loader__txt">Preparing build…</span>';
    host.appendChild(loader);
  }
  function setLoader(frac) {
    if (!loader) return;
    var bar = loader.querySelector(".seq-loader__bar > span");
    if (bar) bar.style.width = (frac * 100).toFixed(0) + "%";
  }
  function hideLoader() {
    if (!loader) return;
    loader.classList.add("done");
    setTimeout(function () { loader && loader.parentNode && loader.parentNode.removeChild(loader); loader = null; }, 500);
  }

  /* ================= VIDEO MODE ================= */
  if (SEQ.video) {
    var video = document.createElement("video");
    video.src = SEQ.video; video.muted = true; video.playsInline = true;
    video.preload = "auto"; video.crossOrigin = "anonymous";
    var ready = false, dur = 0, seeking = false, pending = null;
    sizeCanvas();
    video.addEventListener("loadedmetadata", function () { dur = video.duration || 0; });
    video.addEventListener("loadeddata", function () { ready = true; hideLoader(); drawCover(video); render(lastP); });
    video.addEventListener("seeked", function () { drawCover(video); if (pending !== null) { var q = pending; pending = null; render(q); } else { seeking = false; } });
    function render(p) {
      lastP = p = clamp(p, 0, 1);
      if (!ready || !dur) return;
      var t = p * Math.max(0, dur - 0.05);
      if (seeking) { pending = p; return; }
      seeking = true; try { video.currentTime = t; } catch (e) { seeking = false; }
    }
    window.__dk3SetBuild = function (p) { render(p); };
    window.addEventListener("resize", function () { sizeCanvas(); drawCover(video); });
    showLoader();
    render(reduce ? 1 : 0);
    return;
  }

  /* ================= IMAGE-SEQUENCE MODE ================= */
  var frames = new Array(SEQ.count), loaded = 0, ready = false;
  function frameURL(i) {
    var n = String(SEQ.first + i);
    while (n.length < SEQ.pad) n = "0" + n;
    return SEQ.path + SEQ.prefix + n + "." + SEQ.ext;
  }
  function nearestLoaded(idx) {
    if (frames[idx] && frames[idx].complete && frames[idx].naturalWidth) return frames[idx];
    for (var d = 1; d < SEQ.count; d++) {
      var a = idx - d, b = idx + d;
      if (a >= 0 && frames[a] && frames[a].complete && frames[a].naturalWidth) return frames[a];
      if (b < SEQ.count && frames[b] && frames[b].complete && frames[b].naturalWidth) return frames[b];
    }
    return null;
  }
  function render(p) {
    lastP = p = clamp(p, 0, 1);
    var idx = Math.round(p * (SEQ.count - 1));
    var img = nearestLoaded(idx);
    if (img) drawCover(img);
  }

  sizeCanvas();
  showLoader();
  // Prioritise the first frame so we can paint immediately, then stream the rest.
  function load(i) {
    var img = new Image();
    img.decoding = "async";
    img.onload = img.onerror = function () {
      loaded++; setLoader(loaded / SEQ.count);
      if (img.naturalWidth && !ready) { ready = true; render(lastP); }
      if (loaded >= SEQ.count) hideLoader();
    };
    img.src = frameURL(i);
    frames[i] = img;
  }
  load(0);
  var q = 1;
  (function pump() { // stagger requests so we don't saturate the connection
    var batch = 6;
    while (batch-- > 0 && q < SEQ.count) load(q++);
    if (q < SEQ.count) setTimeout(pump, 60);
  })();

  window.__dk3SetBuild = function (p) { render(p); };
  window.addEventListener("resize", function () { sizeCanvas(); render(lastP); });
  window.addEventListener("load", function () { setTimeout(function () { sizeCanvas(); render(lastP); }, 200); });
  render(reduce ? 1 : 0);
})();
