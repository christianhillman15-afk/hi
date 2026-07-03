/* =============================================================
   DK3 Construction — interactions
   Vanilla JS, no hard dependencies. Progressive enhancement.
   Cinematic layer: intro reveal, smooth scroll (Lenis if present),
   kinetic split-text, parallax, horizontal pin, custom cursor.
   ============================================================= */
(function () {
  "use strict";
  var doc = document;
  var body = doc.body;
  var docEl = doc.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------- Header scrolled state ---------- */
  var header = $(".site-header");
  function onScrollHeader() {
    if (!header) return;
    header.classList.toggle("scrolled", window.scrollY > 24);
  }
  onScrollHeader();
  window.addEventListener("scroll", onScrollHeader, { passive: true });

  /* ---------- Mobile navigation ---------- */
  var navToggle = $(".nav-toggle");
  var mobileMenu = $(".mobile-menu");
  function closeNav() {
    body.classList.remove("nav-open");
    if (navToggle) navToggle.setAttribute("aria-expanded", "false");
  }
  function toggleNav() {
    var open = body.classList.toggle("nav-open");
    if (navToggle) navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  }
  if (navToggle) navToggle.addEventListener("click", toggleNav);
  if (mobileMenu) $all("a", mobileMenu).forEach(function (a) { a.addEventListener("click", closeNav); });
  doc.addEventListener("keydown", function (e) { if (e.key === "Escape") closeNav(); });

  /* ---------- Kinetic split-text ---------- */
  function splitText(el) {
    var nodes = Array.prototype.slice.call(el.childNodes);
    var frag = doc.createDocumentFragment();
    var i = 0;
    nodes.forEach(function (node) {
      if (node.nodeType === 3) {
        splitTokens(node.textContent, null);
      } else if (node.nodeType === 1) {
        splitTokens(node.textContent, node.tagName.toLowerCase(), node.className);
      }
    });
    function splitTokens(text, tag, cls) {
      text.split(/(\s+)/).forEach(function (tok) {
        if (tok === "") return;
        if (/^\s+$/.test(tok)) { frag.appendChild(doc.createTextNode(tok)); return; }
        var mask = doc.createElement("span");
        mask.className = "kw";
        var inner = doc.createElement(tag || "span");
        inner.className = "kw__i" + (cls ? " " + cls : "");
        inner.style.setProperty("--i", i++);
        inner.textContent = tok;
        mask.appendChild(inner);
        frag.appendChild(mask);
      });
    }
    el.innerHTML = "";
    el.appendChild(frag);
  }

  var heroSplit = $(".hero .split-text");
  if (!reduceMotion) {
    $all(".split-text").forEach(splitText);
    if ("IntersectionObserver" in window) {
      var sio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add("is-revealed"); sio.unobserve(e.target); }
        });
      }, { threshold: 0.2 });
      $all(".split-text").forEach(function (el) { if (el !== heroSplit) sio.observe(el); });
    } else {
      $all(".split-text").forEach(function (el) { el.classList.add("is-revealed"); });
    }
  }
  function revealHero() { if (heroSplit) heroSplit.classList.add("is-revealed"); }

  /* ---------- Intro / preloader ---------- */
  (function () {
    var intro = $(".intro");
    if (!intro) { revealHero(); return; }
    var seen = false;
    try { seen = sessionStorage.getItem("dk3_intro") === "1"; } catch (e) {}
    if (reduceMotion || seen) {
      intro.parentNode && intro.parentNode.removeChild(intro);
      body.classList.remove("intro-active");
      revealHero();
      return;
    }
    try { sessionStorage.setItem("dk3_intro", "1"); } catch (e) {}

    body.classList.add("intro-active");

    var countEl = $(".intro__count", intro);
    if (countEl) {
      var start = null, dur = 1000;
      var step = function (ts) {
        if (start === null) start = ts;
        var p = clamp((ts - start) / dur, 0, 1);
        countEl.textContent = Math.round(p * 100);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }

    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      body.classList.add("intro-done");
      body.classList.remove("intro-active");
      revealHero();
      setTimeout(function () { intro.parentNode && intro.parentNode.removeChild(intro); }, 1000);
    }
    window.addEventListener("load", function () { setTimeout(finish, 750); });
    setTimeout(finish, 2400); // hard cap so it can never get stuck
  })();

  /* ---------- Smooth scroll (Lenis if available) ---------- */
  var lenis = null;
  if (!reduceMotion && finePointer && typeof window.Lenis === "function") {
    try {
      lenis = new window.Lenis({ duration: 1.1, smoothWheel: true, lerp: 0.1 });
      var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
      // anchor links through Lenis
      $all('a[href^="#"]').forEach(function (a) {
        var id = a.getAttribute("href");
        if (id.length < 2) return;
        a.addEventListener("click", function (e) {
          var target = doc.querySelector(id);
          if (target) { e.preventDefault(); lenis.scrollTo(target, { offset: -90 }); }
        });
      });
    } catch (err) { lenis = null; }
  }

  /* ---------- Scroll reveal ---------- */
  var reveals = $all(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("is-visible"); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Animated counters ---------- */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var decimals = el.getAttribute("data-decimals") ? parseInt(el.getAttribute("data-decimals"), 10) : 0;
    if (reduceMotion) { el.textContent = target.toFixed(decimals); return; }
    var dur = 1600, start = null;
    function tick(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(decimals);
      if (p < 1) requestAnimationFrame(tick); else el.textContent = target.toFixed(decimals);
    }
    requestAnimationFrame(tick);
  }
  var counters = $all("[data-count]");
  if (counters.length) {
    if (!("IntersectionObserver" in window)) { counters.forEach(animateCount); }
    else {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { animateCount(entry.target); cio.unobserve(entry.target); }
        });
      }, { threshold: 0.6 });
      counters.forEach(function (el) { cio.observe(el); });
    }
  }

  /* ---------- Parallax + horizontal pin (single rAF loop) ---------- */
  var parallaxEls = $all("[data-parallax]");
  var hpin = $(".hpin");
  var hpinTrack = hpin ? $(".hpin__track", hpin) : null;
  var hpinBar = hpin ? $(".hpin__progress span", hpin) : null;
  var hpinActive = false;

  var xform = $(".xform");
  var xLines = xform ? $all(".xform__line", xform) : [];
  var xIndex = xform ? $all(".xform__index li", xform) : [];
  var xPct = xform ? $("[data-build-pct]", xform) : null;
  var xBar = xform ? $(".xform__progress span", xform) : null;
  var lastIdx = -1;

  function updateBuild() {
    if (!xform || reduceMotion) return;
    var total = xform.offsetHeight - vh;
    var p = total > 0 ? clamp(-xform.getBoundingClientRect().top / total, 0, 1) : 0;
    // drive the 3D build
    if (window.__dk3SetBuild) window.__dk3SetBuild(p);
    // stage index: 0 site, 1 structure, 2 delivered
    var idx = p < 0.4 ? 0 : (p < 0.78 ? 1 : 2);
    if (idx !== lastIdx) {
      lastIdx = idx;
      for (var i = 0; i < xLines.length; i++) xLines[i].classList.toggle("active", i === idx);
      for (var j = 0; j < xIndex.length; j++) xIndex[j].classList.toggle("active", j === idx);
    }
    if (xPct) xPct.textContent = Math.round(p * 100);
    if (xBar) xBar.style.width = (p * 100).toFixed(1) + "%";
  }

  function setupHpin() {
    if (!hpin || !hpinTrack) return;
    var wide = window.innerWidth >= 900;
    if (wide && finePointer && !reduceMotion && hpinTrack.scrollWidth > window.innerWidth) {
      hpinActive = true;
      hpin.classList.add("hpin--active");
      var scrollLen = hpinTrack.scrollWidth - window.innerWidth;
      hpin.style.height = (scrollLen + window.innerHeight) + "px";
    } else {
      hpinActive = false;
      hpin.classList.remove("hpin--active");
      hpin.style.height = "";
      hpinTrack.style.transform = "";
    }
  }

  var vh = window.innerHeight;
  function updateScrollFx() {
    // parallax
    if (!reduceMotion) {
      for (var i = 0; i < parallaxEls.length; i++) {
        var el = parallaxEls[i];
        var rect = el.parentNode.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > vh + 200) continue;
        var speed = parseFloat(el.getAttribute("data-parallax")) || 0.15;
        var progress = (vh - rect.top) / (vh + rect.height); // 0..1 across viewport
        var shift = (progress - 0.5) * rect.height * speed * 2;
        el.style.transform = "translate3d(0," + shift.toFixed(2) + "px,0)";
      }
    }
    // horizontal pin
    if (hpinActive && hpin && hpinTrack) {
      var total = hpin.offsetHeight - vh;
      var p = total > 0 ? clamp(-hpin.getBoundingClientRect().top / total, 0, 1) : 0;
      var x = p * (hpinTrack.scrollWidth - window.innerWidth);
      hpinTrack.style.transform = "translate3d(" + (-x).toFixed(2) + "px,0,0)";
      if (hpinBar) hpinBar.style.width = (p * 100).toFixed(1) + "%";
    }
    // transformation section
    updateBuild();
  }
  if (parallaxEls.length || hpin || xform) {
    setupHpin();
    var ticking = false;
    function onFx() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { updateScrollFx(); ticking = false; });
    }
    window.addEventListener("scroll", onFx, { passive: true });
    if (lenis && lenis.on) lenis.on("scroll", onFx);
    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () { vh = window.innerHeight; setupHpin(); updateScrollFx(); }, 160);
    });
    window.addEventListener("load", function () { setTimeout(function () { setupHpin(); updateScrollFx(); }, 200); });
    updateScrollFx();
  }

  /* ---------- Custom cursor ---------- */
  (function () {
    var cursor = $(".cursor");
    if (!cursor || !finePointer || reduceMotion) { if (cursor) cursor.remove(); return; }
    var dot = $(".cursor__dot", cursor), ring = $(".cursor__ring", cursor);
    var mx = window.innerWidth / 2, my = window.innerHeight / 2, rx = mx, ry = my, shown = false;
    doc.addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      if (dot) { dot.style.left = mx + "px"; dot.style.top = my + "px"; }
      if (!shown) { cursor.classList.add("ready"); shown = true; }
    });
    (function loop() {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      if (ring) { ring.style.left = rx + "px"; ring.style.top = ry + "px"; }
      requestAnimationFrame(loop);
    })();
    var hoverSel = "a, button, .tile, .card, .hpin__card, .filter-btn, input, textarea, select, .faq-q";
    doc.addEventListener("mouseover", function (e) { if (e.target.closest && e.target.closest(hoverSel)) cursor.classList.add("is-hover"); });
    doc.addEventListener("mouseout", function (e) { if (e.target.closest && e.target.closest(hoverSel)) cursor.classList.remove("is-hover"); });
    doc.addEventListener("mouseleave", function () { cursor.classList.remove("ready"); shown = false; });
  })();

  /* ---------- Testimonial slider ---------- */
  (function () {
    var root = $(".testi");
    if (!root) return;
    var slides = $all(".testi__slide", root);
    var dotsWrap = $(".testi__dots", root);
    var prev = $(".testi__arrow.prev", root);
    var next = $(".testi__arrow.next", root);
    var i = 0, timer = null, dots = [];
    slides.forEach(function (_, idx) {
      var d = doc.createElement("button");
      d.className = "testi__dot" + (idx === 0 ? " active" : "");
      d.setAttribute("aria-label", "Go to review " + (idx + 1));
      d.addEventListener("click", function () { go(idx); });
      if (dotsWrap) dotsWrap.appendChild(d);
      dots.push(d);
    });
    function go(n) {
      slides[i].classList.remove("active");
      if (dots[i]) dots[i].classList.remove("active");
      i = (n + slides.length) % slides.length;
      slides[i].classList.add("active");
      if (dots[i]) dots[i].classList.add("active");
      restart();
    }
    function restart() { if (timer) clearInterval(timer); if (!reduceMotion) timer = setInterval(function () { go(i + 1); }, 6500); }
    if (prev) prev.addEventListener("click", function () { go(i - 1); });
    if (next) next.addEventListener("click", function () { go(i + 1); });
    restart();
  })();

  /* ---------- Projects filter ---------- */
  (function () {
    var wrap = $(".filters");
    if (!wrap) return;
    var btns = $all(".filter-btn", wrap);
    var tiles = $all(".tile[data-cat]");
    btns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        btns.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var f = btn.getAttribute("data-filter");
        tiles.forEach(function (t) {
          var show = f === "all" || t.getAttribute("data-cat").indexOf(f) !== -1;
          t.classList.toggle("is-hidden", !show);
        });
      });
    });
  })();

  /* ---------- FAQ accordion ---------- */
  $all(".faq-item").forEach(function (item) {
    var q = $(".faq-q", item), a = $(".faq-a", item);
    if (!q || !a) return;
    q.addEventListener("click", function () {
      var open = item.classList.contains("open");
      var parent = item.parentElement;
      if (parent) $all(".faq-item.open", parent).forEach(function (o) {
        if (o !== item) { o.classList.remove("open"); var oa = $(".faq-a", o); if (oa) oa.style.maxHeight = null; }
      });
      if (open) { item.classList.remove("open"); a.style.maxHeight = null; }
      else { item.classList.add("open"); a.style.maxHeight = a.scrollHeight + "px"; }
    });
  });

  /* ---------- Contact form ---------- */
  (function () {
    var form = $("#contact-form");
    if (!form) return;
    var success = $(".form__success");
    function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true, firstBad = null;
      $all(".field", form).forEach(function (field) {
        var input = $("input, textarea, select", field);
        if (!input || !input.hasAttribute("required")) return;
        var v = (input.value || "").trim();
        var bad = !v || (input.type === "email" && !validEmail(v));
        field.classList.toggle("invalid", bad);
        if (bad) { ok = false; if (!firstBad) firstBad = input; }
      });
      if (!ok) { if (firstBad) firstBad.focus(); return; }
      var btn = $("button[type=submit]", form);
      if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
      window.setTimeout(function () {
        form.style.display = "none";
        if (success) success.classList.add("show");
      }, 700);
    });
    $all(".field input, .field textarea, .field select", form).forEach(function (input) {
      input.addEventListener("input", function () {
        var field = input.closest(".field");
        if (field) field.classList.remove("invalid");
      });
    });
  })();

  /* ---------- Back to top ---------- */
  (function () {
    var btn = $(".to-top");
    if (!btn) return;
    function onScroll() { btn.classList.toggle("show", window.scrollY > 640); }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    btn.addEventListener("click", function () {
      if (lenis) lenis.scrollTo(0);
      else window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  })();

  /* ---------- Scroll progress bar ---------- */
  (function () {
    var bar = doc.createElement("div");
    bar.className = "scroll-progress";
    var span = doc.createElement("span");
    bar.appendChild(span);
    body.appendChild(bar);
    var ticking = false;
    function update() {
      var h = docEl.scrollHeight - window.innerHeight;
      var p = h > 0 ? clamp(window.scrollY / h, 0, 1) : 0;
      span.style.width = (p * 100).toFixed(2) + "%";
      ticking = false;
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener("scroll", onScroll, { passive: true });
    if (lenis && lenis.on) lenis.on("scroll", onScroll);
    window.addEventListener("resize", onScroll, { passive: true });
    update();
  })();

  /* ---------- Magnetic CTAs ---------- */
  if (finePointer && !reduceMotion) {
    $all(".btn--lg, .site-header .btn").forEach(function (el) {
      el.classList.add("magnetic");
      el.addEventListener("mousemove", function (e) {
        var b = el.getBoundingClientRect();
        var x = (e.clientX - (b.left + b.width / 2)) * 0.28;
        var y = (e.clientY - (b.top + b.height / 2)) * 0.28;
        el.style.transform = "translate3d(" + x.toFixed(1) + "px," + (y - 3).toFixed(1) + "px,0)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
    });
  }

  /* ---------- Pointer tilt on project image tiles ---------- */
  if (finePointer && !reduceMotion) {
    $all(".tile").forEach(function (el) {
      el.addEventListener("mouseenter", function () { el.classList.add("is-tilting"); });
      el.addEventListener("mousemove", function (e) {
        var b = el.getBoundingClientRect();
        var rx = (-((e.clientY - b.top) / b.height - 0.5) * 3.4).toFixed(2);
        var ry = (((e.clientX - b.left) / b.width - 0.5) * 3.4).toFixed(2);
        el.style.transform = "perspective(760px) rotateX(" + rx + "deg) rotateY(" + ry + "deg)";
      });
      el.addEventListener("mouseleave", function () { el.classList.remove("is-tilting"); el.style.transform = ""; });
    });
  }

  /* ---------- Page-transition fallback (no cross-document View Transitions) ---------- */
  if (!reduceMotion && !("startViewTransition" in doc)) {
    doc.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      var a = e.target.closest && e.target.closest("a");
      if (!a) return;
      var href = a.getAttribute("href");
      if (!href || a.target === "_blank" || a.hasAttribute("download")) return;
      if (href.charAt(0) === "#" || /^(mailto:|tel:)/.test(href)) return;
      var url;
      try { url = new URL(href, location.href); } catch (err) { return; }
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      e.preventDefault();
      body.classList.add("is-leaving");
      setTimeout(function () { window.location.href = url.href; }, 300);
    });
    window.addEventListener("pageshow", function (e) { if (e.persisted) body.classList.remove("is-leaving"); });
  }

  /* ---------- Footer year ---------- */
  var yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
