/* ============================================================
   motion.js — animation DNA extracted from
   britainsfavouritebutterfly.co.uk (everglow theme)

   Vanilla JS, zero dependencies. Exposes `window.Motion` and also
   works as an ES module (`import { flyAlongArc } from './motion.js'`).

   Constants below are the actual values pulled from the source.
   ============================================================ */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.Motion = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Math core — everything inherits from these ----------------- */
  const lerp  = (a, b, t) => a + (b - a) * t;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  // Frame-rate-independent smoothing. `tau` (ms) is the time-constant:
  // smaller = snappier, larger = floatier. The site clusters at 220–250.
  const smoothAlpha = (dtMs, tau) => 1 - Math.exp(-dtMs / Math.max(1, tau));
  const approach = (cur, tgt, dtMs, tau) => lerp(cur, tgt, smoothAlpha(dtMs, tau));

  /* ---- Easings (JS twins of the CSS cubic-beziers) ---------------- */
  const ease = {
    out:        (t) => 1 - Math.pow(1 - t, 2),                          // ~ease-out
    outCubic:   (t) => 1 - Math.pow(1 - t, 3),                          // wing settle
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2), // scroll
    swing:      (t) => 0.5 - Math.cos(t * Math.PI) / 2,                 // jQuery count-up
  };

  /* ---- Shared RAF ticker ------------------------------------------ */
  const subs = new Set();
  let last = 0, running = false;
  function frame(now) {
    const dt = last ? now - last : 16.7;
    last = now;
    subs.forEach((fn) => fn(dt, now));
    if (subs.size) requestAnimationFrame(frame);
    else { running = false; last = 0; }
  }
  function onTick(fn) {
    subs.add(fn);
    if (!running) { running = true; requestAnimationFrame(frame); }
    return () => subs.delete(fn);
  }

  /* ---- Smoothed value (wraps approach for a single channel) ------- */
  class Smoothed {
    constructor(value = 0, tau = 240) { this.value = value; this.target = value; this.tau = tau; }
    set(target) { this.target = target; return this; }
    snap(v) { this.value = this.target = v; return this; }
    step(dtMs) { this.value = approach(this.value, this.target, dtMs, this.tau); return this.value; }
  }

  /* ---- Programmatic smooth scroll (easeInOutCubic, 1200ms) -------- */
  function smoothScrollTo(targetY, durationMs = 1200) {
    return new Promise((resolve) => {
      if (reduce) { window.scrollTo(0, targetY); return resolve(); }
      const startY = window.scrollY, delta = targetY - startY, start = performance.now();
      (function tick(now) {
        const t = clamp((now - start) / Math.max(1, durationMs), 0, 1);
        window.scrollTo(0, startY + delta * ease.inOutCubic(t));
        t < 1 ? requestAnimationFrame(tick) : resolve();
      })(start);
    });
  }

  /* ---- Reveal-on-scroll (pairs with [data-reveal] in motion.css) -- */
  function revealOnScroll(selector = '[data-reveal]', { threshold = 0.2, root = null } = {}) {
    const els = [...document.querySelectorAll(selector)];
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-visible'));
      return () => {};
    }
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const delay = el.dataset.revealDelay;
        if (delay) el.style.setProperty('--reveal-delay', delay + 'ms');
        el.classList.add('is-visible');
        obs.unobserve(el); // one-shot
      });
    }, { threshold, root });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }

  /* ---- Count-up (fires once when 70% in view) --------------------- */
  function countUp(el, to, { duration = 1500, threshold = 0.7, format = (n) => Math.floor(n).toLocaleString() } = {}) {
    const run = () => {
      if (reduce) { el.textContent = format(to); return; }
      const start = performance.now();
      (function tick(now) {
        const t = clamp((now - start) / duration, 0, 1);
        el.textContent = format(to * ease.swing(t));
        if (t < 1) requestAnimationFrame(tick); else el.textContent = format(to);
      })(start);
    };
    if (!('IntersectionObserver' in window)) return run();
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => { if (e.isIntersecting) { run(); obs.unobserve(e.target); } });
    }, { threshold });
    io.observe(el);
  }

  /* ---- Marquee (continuous, ~speed px/s, pauses off-screen) ------- */
  function marquee(container, { speed = 50, direction = 'left', pauseOnHover = false } = {}) {
    const track = container.querySelector('.marquee-track') || container.firstElementChild;
    if (!track || reduce) return () => {};
    const original = track.firstElementChild;
    let contentWidth = original.offsetWidth;
    // clone until the track is at least 2x the container so the loop is seamless
    while (track.scrollWidth < container.offsetWidth * 2 + contentWidth) {
      track.appendChild(original.cloneNode(true));
    }
    let pos = 0, visible = true, hovered = false;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.1 });
    io.observe(container);
    if (pauseOnHover) {
      container.addEventListener('mouseenter', () => (hovered = true));
      container.addEventListener('mouseleave', () => (hovered = false));
    }
    const stop = onTick((dt) => {
      if (!visible || hovered) return;
      const px = (speed / 1000) * dt; // px this frame
      if (direction === 'left') { pos -= px; if (pos <= -contentWidth) pos += contentWidth; }
      else { pos += px; if (pos >= 0) pos -= contentWidth; }
      track.style.transform = `translateX(${pos.toFixed(2)}px)`;
    });
    return () => { stop(); io.disconnect(); };
  }

  /* ---- Magnetic / float lift (cursor-follow with shadow + scale) -- */
  function magnetic(el, { strength = 0.35, tau = 240, lift = 0.05 } = {}) {
    if (reduce) return () => {};
    const x = new Smoothed(0, tau), y = new Smoothed(0, tau), l = new Smoothed(0, tau);
    let inside = false;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      x.set((e.clientX - (r.left + r.width / 2)) * strength);
      y.set((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const enter = () => { inside = true; l.set(1); };
    const leave = () => { inside = false; x.set(0); y.set(0); l.set(0); };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseenter', enter);
    el.addEventListener('mouseleave', leave);
    const stop = onTick((dt) => {
      const dx = x.step(dt), dy = y.step(dt), lv = l.step(dt);
      el.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) scale(${(1 + lv * lift).toFixed(3)})`;
      el.style.boxShadow = `0 ${(24 * lv).toFixed(1)}px ${(40 * lv).toFixed(1)}px rgba(0,0,0,${lerp(0.05, 0.32, lv).toFixed(3)})`;
    });
    return () => { stop(); el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseenter', enter); el.removeEventListener('mouseleave', leave); };
  }

  /* ---- Bezier flight — the signature butterfly motion ------------- *
   * Flies `el` from {x,y} to {x,y} along a bowed cubic-bezier arc.
   * Duration scales with distance; element tilts toward its heading,
   * lifts/scales while airborne, then settles (easeOutCubic).
   * Constants are the originals.                                      */
  const FLIGHT = { baseMs: 170, msPerPx: 0.9, minMs: 300, maxMs: 850, arcPx: 160, sCurve: 0.55, maxTiltDeg: 70, lift: 0.07, settleMs: 280, verticalDampenPow: 1.7 };

  function flyAlongArc(el, from, to, opts = {}) {
    const c = { ...FLIGHT, ...opts };
    return new Promise((resolve) => {
      const dx = to.x - from.x, dy = to.y - from.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (reduce) { el.style.transform = `translate3d(${to.x}px,${to.y}px,0)`; return resolve(); }
      const dur = clamp(c.baseMs + dist * c.msPerPx, c.minMs, c.maxMs);
      // perpendicular unit vector → bow the path sideways by arcPx
      const px = -dy / dist, py = dx / dist;
      const c1 = { x: from.x + dx * 0.33 + px * c.arcPx,            y: from.y + dy * 0.33 + py * c.arcPx - c.arcPx * 0.25 };
      const c2 = { x: from.x + dx * 0.67 - px * c.arcPx * c.sCurve, y: from.y + dy * 0.67 - py * c.arcPx * c.sCurve - c.arcPx * 0.15 };
      const bez = (p, a, b1, b2, q) => { const i = 1 - p; return i*i*i*a + 3*i*i*p*b1 + 3*i*p*p*b2 + p*p*p*q; };
      const start = performance.now();
      let prevX = from.x, prevY = from.y;
      el.style.willChange = 'transform';
      (function tick(now) {
        const t = clamp((now - start) / dur, 0, 1);
        const u = ease.inOutCubic(t);
        const xx = bez(u, from.x, c1.x, c2.x, to.x);
        const yy = bez(u, from.y, c1.y, c2.y, to.y);
        // heading tilt, damped on the vertical axis so it favours horizontal flight
        const vx = xx - prevX, vy = yy - prevY;
        const horiz = Math.abs(vx) / (Math.abs(vx) + Math.abs(vy) + 1e-6);
        const tilt = clamp(Math.atan2(vy, vx) * 180 / Math.PI, -c.maxTiltDeg, c.maxTiltDeg) * Math.pow(horiz, c.verticalDampenPow);
        const settle = t < 1 ? 1 : 0; // lift is on while flying, eased out at arrival
        const scale = 1 + c.lift * settle;
        el.style.transform = `translate3d(${xx.toFixed(2)}px, ${yy.toFixed(2)}px, 0) rotate(${tilt.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
        prevX = xx; prevY = yy;
        if (t < 1) requestAnimationFrame(tick);
        else {
          // settle: ease tilt/lift back to neutral
          const s0 = performance.now();
          (function settleTick(n) {
            const st = clamp((n - s0) / c.settleMs, 0, 1), e = ease.outCubic(st);
            el.style.transform = `translate3d(${to.x}px, ${to.y}px, 0) rotate(${(tilt * (1 - e)).toFixed(2)}deg) scale(${(1 + c.lift * (1 - e)).toFixed(3)})`;
            st < 1 ? requestAnimationFrame(settleTick) : (el.style.willChange = '', resolve());
          })(s0);
        }
      })(start);
    });
  }

  return { lerp, clamp, smoothAlpha, approach, ease, onTick, Smoothed, smoothScrollTo, revealOnScroll, countUp, marquee, magnetic, flyAlongArc, FLIGHT, prefersReducedMotion: reduce };
}));
