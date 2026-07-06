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
    enabled: true,                    // ← flip to true once frames/video are in place
    // -- image-sequence / stills mode --
    path:   "assets/build-sequence/",
    prefix: "frame_",
    pad:    4,                         // frame_0001.jpg
    ext:    "jpg",
    first:  1,
    count:  141,                       // 141-frame photoreal sequence exploded from the master (4 fps)
    rev:    "9",                       // bump when frame CONTENT changes (same filenames) to bust the 30-day cache
    crossfade: true,                   // blend neighboring frames while scrubbing
    kenBurns: false,                   // the frames carry their own motion
    // -- OR video mode (leave "" to use the image sequence above) --
    video:  "",                        // frame scrubbing beats <video> seeking: zero seek latency, both directions
    videoWebm: "assets/build-sequence/build.webm" // fallback for browsers without H.264
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
  var dpr = Math.min(window.devicePixelRatio || 1, 1.5); // capped: full-bleed film content — indistinguishable, much cheaper to paint
  var lastP = 0;

  function sizeCanvas() {
    var w = canvas.clientWidth || canvas.offsetWidth, h = canvas.clientHeight || canvas.offsetHeight;
    if (!w || !h) return;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.imageSmoothingEnabled = true;                       // resizing the canvas resets context state,
    if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = "medium"; // medium = visually identical in motion, faster per-frame
  }
  function drawCover(src, alpha, kb) {
    if (!src) return;
    var iw = src.naturalWidth || src.videoWidth || src.width, ih = src.naturalHeight || src.videoHeight || src.height;
    if (!iw || !ih) return;
    var cw = canvas.width, ch = canvas.height;
    var s = Math.max(cw / iw, ch / ih);
    if (kb) s *= kb.z;                    // extra zoom for the drift
    var w = iw * s, h = ih * s;
    var ox = (cw - w) / 2, oy = (ch - h) / 2;
    if (kb) {                             // pan, clamped to the available overscan so edges never show
      ox = clamp(ox + kb.x * cw, cw - w, 0);
      oy = clamp(oy + kb.y * ch, ch - h, 0);
    }
    ctx.globalAlpha = (alpha == null ? 1 : alpha);
    ctx.drawImage(src, ox, oy, w, h);
    ctx.globalAlpha = 1;
  }

  /* ---- Ken Burns: a slow, gentle zoom/pan so even a still image breathes ---- */
  var KB = SEQ.kenBurns && !reduce;
  function kbState() {
    if (!KB) return null;
    var t = (typeof performance !== "undefined" ? performance.now() : 0) / 1000;
    return {
      z: 1.045 + 0.035 * Math.sin(t * 0.11),   // breathe between ~1.01 and ~1.08
      x: 0.018 * Math.sin(t * 0.07),
      y: 0.012 * Math.cos(t * 0.05)
    };
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
    // pick a format this browser can actually decode (H.264 mp4 works in all real browsers; webm is the fallback)
    var canH264 = video.canPlayType('video/mp4; codecs="avc1.42E01E"');
    var vsrc = (!canH264 && SEQ.videoWebm && video.canPlayType('video/webm; codecs="vp9"')) ? SEQ.videoWebm : SEQ.video;
    video.muted = true; video.playsInline = true; video.preload = "auto";
    video.setAttribute("muted", ""); video.setAttribute("playsinline", "");
    video.style.cssText = "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none";
    document.body.appendChild(video);            // in-DOM = reliable decode + seek across browsers
    var ready = false, dur = 0, seeking = false, pending = null, seekT0 = 0;
    sizeCanvas();
    video.addEventListener("loadedmetadata", function () { dur = video.duration || 0; });
    video.addEventListener("loadeddata", function () { ready = true; hideLoader(); drawCover(video); render(lastP); });
    video.addEventListener("seeked", function () {
      seeking = false;               // clear FIRST so a queued scroll position can actually re-seek (both directions)
      drawCover(video);
      if (pending !== null) { var q = pending; pending = null; render(q); }
    });
    video.addEventListener("error", function () {  // primary failed to decode → swap to the webm fallback
      if (SEQ.videoWebm && video.src.indexOf(SEQ.videoWebm) === -1) { ready = false; video.src = SEQ.videoWebm; }
    });
    function render(p) {
      lastP = p = clamp(p, 0, 1);
      if (!ready || !dur) return;
      // watchdog: if the browser ever drops a seeked event, don't stay frozen — reissue after 600ms
      if (seeking && Date.now() - seekT0 < 600) { pending = p; return; }
      seeking = true; seekT0 = Date.now(); pending = null;
      try { video.currentTime = p * Math.max(0, dur - 0.05); } catch (e) { seeking = false; }
    }
    window.__dk3SetBuild = function (p) { render(p); };
    window.addEventListener("resize", function () { sizeCanvas(); drawCover(video); });
    showLoader();
    video.src = vsrc;
    render(reduce ? 1 : 0);
    return;
  }

  /* ================= IMAGE-SEQUENCE MODE ================= */
  var frames = new Array(SEQ.count), loaded = 0, ready = false;
  function frameURL(i) {
    var n = String(SEQ.first + i);
    while (n.length < SEQ.pad) n = "0" + n;
    return SEQ.path + SEQ.prefix + n + "." + SEQ.ext + (SEQ.rev ? "?r=" + SEQ.rev : "");
  }
  /* ---- GPU bitmap window: the anti-jank core -------------------------
     Drawing an <img> re-decodes the JPEG on the main thread whenever the
     browser's decode cache evicted it (10–40ms hitches while scrubbing).
     Keep a sliding window of pre-decoded ImageBitmaps around the current
     frame, decoded ahead in the scroll direction, and draw those instead. */
  var HAS_BM = typeof createImageBitmap === "function";
  var bitmaps = new Array(SEQ.count), bmPending = {};
  var BM_BACK = 12, BM_FWD = 22, BM_MAX = 44;
  function reqBitmap(i) {
    if (!HAS_BM || bitmaps[i] || bmPending[i]) return;
    var img = frames[i];
    if (!img || !img.complete || !img.naturalWidth) return;
    bmPending[i] = true;
    createImageBitmap(img).then(function (bm) { bitmaps[i] = bm; delete bmPending[i]; })
                          .catch(function () { delete bmPending[i]; });
  }
  var evictTick = 0;
  function manageWindow(center, dir) {
    if (!HAS_BM) return;
    var back = dir < 0 ? BM_FWD : BM_BACK, fwd = dir < 0 ? BM_BACK : BM_FWD;
    var from = Math.max(0, center - back), to = Math.min(SEQ.count - 1, center + fwd);
    for (var i = center; i <= to; i++) reqBitmap(i);
    for (var j = center - 1; j >= from; j--) reqBitmap(j);
    if (++evictTick % 30 === 0) {                     // occasionally drop bitmaps far outside the window
      var live = 0, k;
      for (k = 0; k < SEQ.count; k++) if (bitmaps[k]) live++;
      if (live > BM_MAX) for (k = 0; k < SEQ.count; k++) {
        if (bitmaps[k] && (k < from - 6 || k > to + 6)) {
          try { bitmaps[k].close(); } catch (e) {}
          bitmaps[k] = null;
        }
      }
    }
  }
  function drawableAt(idx) {
    if (bitmaps[idx]) return bitmaps[idx];
    if (frames[idx] && frames[idx].complete && frames[idx].naturalWidth) return frames[idx];
    return null;
  }
  function nearestDrawable(idx) {
    var d0 = drawableAt(idx);
    if (d0) return d0;
    for (var d = 1; d < SEQ.count; d++) {
      var a = idx - d, b = idx + d;
      if (a >= 0 && (d0 = drawableAt(a))) return d0;
      if (b < SEQ.count && (d0 = drawableAt(b))) return d0;
    }
    return null;
  }
  function paint(p) {
    lastP = p;
    var cw = canvas.width, ch = canvas.height, kb = kbState();
    ctx.clearRect(0, 0, cw, ch);
    if (SEQ.crossfade && SEQ.count > 1) {
      // blend the two nearest frames for a continuous, liquid scrub
      var fpos = p * (SEQ.count - 1), i = Math.floor(fpos), f = fpos - i;
      var a = nearestDrawable(i), bb = nearestDrawable(Math.min(i + 1, SEQ.count - 1));
      if (a) drawCover(a, 1, kb);
      if (bb && bb !== a && f > 0.001) drawCover(bb, f < 1 ? f : 1, kb);
    } else {
      var img = nearestDrawable(Math.round(p * (SEQ.count - 1)));
      if (img) drawCover(img, 1, kb);
    }
  }

  /* Motion smoothing: scroll sets a target; a rAF loop eases the shown
     position toward it. Kills the stepping of raw scroll input (esp. mobile). */
  var target = reduce ? 1 : 0, cur = target, EASE = reduce ? 1 : 0.13;
  function render(p) { target = clamp(p, 0, 1); }
  (function motion() {
    var d = target - cur;
    manageWindow(Math.round(cur * (SEQ.count - 1)), d < 0 ? -1 : 1);  // decode ahead of the scroll
    if (d !== 0 || KB) {
      cur = Math.abs(d) < 0.0004 ? target : cur + d * EASE;
      paint(cur);
    }
    requestAnimationFrame(motion);
  })();

  sizeCanvas();
  showLoader();
  function load(i) {
    if (frames[i]) return;
    var img = new Image();
    img.decoding = "async";
    img.onload = img.onerror = function () {
      loaded++; setLoader(loaded / SEQ.count);
      if (img.naturalWidth && !ready) { ready = true; paint(cur); }
      if (loaded >= SEQ.count) hideLoader();
    };
    img.src = frameURL(i);
    frames[i] = img;
  }
  // Coarse-first streaming: every 10th frame loads first so the whole build is
  // scrubbable within seconds; the in-between frames then sharpen the motion.
  var order = [0];
  for (var c = 10; c < SEQ.count; c += 10) order.push(c);
  for (var r = 0; r < SEQ.count; r++) if (r % 10 !== 0) order.push(r);
  load(order[0]);
  var q = 1;
  (function pump() {
    var batch = 6;
    while (batch-- > 0 && q < order.length) load(order[q++]);
    if (q < order.length) setTimeout(pump, 60);
  })();

  window.__dk3SetBuild = function (p) { render(p); };
  window.addEventListener("resize", function () { sizeCanvas(); paint(cur); });
  window.addEventListener("load", function () { setTimeout(function () { sizeCanvas(); paint(cur); }, 200); });
  paint(cur);
})();
