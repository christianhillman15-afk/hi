/* =========================================================
   Mike's Maintenance — Interactions
   ========================================================= */
(function () {
  'use strict';

  /* ---------- Sticky header shadow ---------- */
  const header = document.getElementById('siteHeader');
  const backToTop = document.getElementById('backToTop');
  const onScroll = () => {
    const y = window.scrollY;
    if (header) header.classList.toggle('scrolled', y > 8);
    if (backToTop) backToTop.classList.toggle('show', y > 520);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile nav ---------- */
  const toggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  const closeNav = () => {
    if (!navLinks || !toggle) return;
    navLinks.classList.remove('open');
    toggle.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  };
  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
    navLinks.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeNav));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNav(); });
  }

  /* ---------- Reveal on scroll ---------- */
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach((el, i) => {
      el.style.transitionDelay = (i % 3) * 80 + 'ms';
      io.observe(el);
    });
  } else {
    reveals.forEach((el) => el.classList.add('in'));
  }

  /* ---------- Animated stat counters ---------- */
  const stats = document.querySelectorAll('.stat-num[data-count]');
  const runCounter = (el) => {
    const target = parseInt(el.getAttribute('data-count'), 10) || 0;
    const suffix = el.getAttribute('data-suffix') || '';
    const dur = 1400;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString() + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if ('IntersectionObserver' in window && stats.length) {
    const so = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { runCounter(entry.target); so.unobserve(entry.target); }
      });
    }, { threshold: 0.5 });
    stats.forEach((el) => so.observe(el));
  } else {
    stats.forEach((el) => { el.textContent = (el.getAttribute('data-count') || '') + (el.getAttribute('data-suffix') || ''); });
  }

  /* ---------- Current year ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Contact form validation ---------- */
  const form = document.getElementById('contactForm');
  const note = document.getElementById('formNote');

  const validators = {
    name: (v) => v.trim().length >= 2 || 'Please enter your name.',
    phone: (v) => /[\d][\d\s().+-]{6,}/.test(v.trim()) || 'Enter a valid phone number.',
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || 'Enter a valid email address.',
    service: (v) => v.trim() !== '' || 'Please choose a service.',
    message: (v) => v.trim().length >= 10 || 'Tell us a little more (10+ characters).'
  };

  const setError = (field, msg) => {
    const input = form.elements[field];
    const errEl = form.querySelector(`.error[data-for="${field}"]`);
    if (input) input.classList.toggle('invalid', Boolean(msg));
    if (errEl) errEl.textContent = msg || '';
  };

  const validateField = (field) => {
    const input = form.elements[field];
    if (!input) return true;
    const result = validators[field](input.value);
    setError(field, result === true ? '' : result);
    return result === true;
  };

  if (form) {
    Object.keys(validators).forEach((field) => {
      const input = form.elements[field];
      if (!input) return;
      input.addEventListener('blur', () => validateField(field));
      input.addEventListener('input', () => {
        if (input.classList.contains('invalid')) validateField(field);
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let ok = true;
      Object.keys(validators).forEach((field) => { if (!validateField(field)) ok = false; });

      if (!ok) {
        if (note) { note.textContent = 'Please fix the highlighted fields and try again.'; note.className = 'form-note fail'; }
        const firstInvalid = form.querySelector('.invalid');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // No backend is wired up in this static site — simulate a successful send.
      const btn = form.querySelector('button[type="submit"]');
      const original = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

      window.setTimeout(() => {
        const name = (form.elements['name'].value || '').trim().split(' ')[0];
        if (note) {
          note.textContent = `Thanks${name ? ', ' + name : ''}! Your request was received — we'll reach out shortly to schedule your visit.`;
          note.className = 'form-note success';
        }
        form.reset();
        if (btn) { btn.disabled = false; btn.textContent = original; }
      }, 900);
    });
  }
})();
