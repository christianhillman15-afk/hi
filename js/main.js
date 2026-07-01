/* =============================================================
   DK3 Construction — interactions
   Vanilla JS, no dependencies. Progressive enhancement.
   ============================================================= */
(function () {
  "use strict";
  var doc = document;
  var body = doc.body;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  /* ---------- Header scrolled state ---------- */
  var header = $(".site-header");
  function onScrollHeader() {
    if (!header) return;
    if (window.scrollY > 24) header.classList.add("scrolled");
    else header.classList.remove("scrolled");
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
  if (mobileMenu) {
    $all("a", mobileMenu).forEach(function (a) { a.addEventListener("click", closeNav); });
  }
  doc.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeNav();
  });

  /* ---------- Scroll reveal ---------- */
  var reveals = $all(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Animated counters ---------- */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var decimals = (el.getAttribute("data-decimals")) ? parseInt(el.getAttribute("data-decimals"), 10) : 0;
    var dur = 1600;
    var start = null;
    if (reduceMotion) { el.textContent = target.toFixed(decimals); return; }
    function tick(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(decimals);
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = target.toFixed(decimals);
    }
    requestAnimationFrame(tick);
  }
  var counters = $all("[data-count]");
  if (counters.length) {
    if (!("IntersectionObserver" in window)) {
      counters.forEach(animateCount);
    } else {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            cio.unobserve(entry.target);
          }
        });
      }, { threshold: 0.6 });
      counters.forEach(function (el) { cio.observe(el); });
    }
  }

  /* ---------- Testimonial slider ---------- */
  (function () {
    var root = $(".testi");
    if (!root) return;
    var slides = $all(".testi__slide", root);
    var dotsWrap = $(".testi__dots", root);
    var prev = $(".testi__arrow.prev", root);
    var next = $(".testi__arrow.next", root);
    var i = 0, timer = null;
    var dots = [];

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
    function restart() {
      if (timer) clearInterval(timer);
      if (!reduceMotion) timer = setInterval(function () { go(i + 1); }, 6500);
    }
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
    var q = $(".faq-q", item);
    var a = $(".faq-a", item);
    if (!q || !a) return;
    q.addEventListener("click", function () {
      var open = item.classList.contains("open");
      // close siblings for a clean single-open accordion
      var parent = item.parentElement;
      if (parent) {
        $all(".faq-item.open", parent).forEach(function (o) {
          if (o !== item) { o.classList.remove("open"); var oa = $(".faq-a", o); if (oa) oa.style.maxHeight = null; }
        });
      }
      if (open) { item.classList.remove("open"); a.style.maxHeight = null; }
      else { item.classList.add("open"); a.style.maxHeight = a.scrollHeight + "px"; }
    });
  });

  /* ---------- Contact form ---------- */
  (function () {
    var form = $("#contact-form");
    if (!form) return;
    var success = $(".form__success");

    function setError(field, on) {
      field.classList.toggle("invalid", on);
    }
    function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      $all(".field", form).forEach(function (field) {
        var input = $("input, textarea, select", field);
        if (!input || !input.hasAttribute("required")) return;
        var v = (input.value || "").trim();
        var bad = !v || (input.type === "email" && !validEmail(v));
        setError(field, bad);
        if (bad && ok) { input.focus(); ok = false; }
        else if (bad) ok = false;
      });
      if (!ok) return;

      // No backend in this static build — show success and offer a mailto fallback.
      // To wire real delivery, point form action to Formspree/Netlify/your API (see README).
      var btn = $("button[type=submit]", form);
      if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
      window.setTimeout(function () {
        form.style.display = "none";
        if (success) success.classList.add("show");
      }, 700);
    });

    // Clear error state as the user types
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
    function onScroll() {
      if (window.scrollY > 640) btn.classList.add("show");
      else btn.classList.remove("show");
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  })();

  /* ---------- Footer year ---------- */
  var yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
