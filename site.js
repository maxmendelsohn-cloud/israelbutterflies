/* Israel's Butterflies — behaviour layer, built on assets/motion.js */
(function () {
  "use strict";
  var M = window.Motion;
  var reduce = M ? M.prefersReducedMotion : matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SVGNS = "http://www.w3.org/2000/svg";
  var rand = function (a, b) { return a + Math.random() * (b - a); };
  var pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };

  /* ---------- Meadow: grass blades + wildflowers ---------- */
  function svg(tag, attrs) {
    var el = document.createElementNS(SVGNS, tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }
  function buildMeadow() {
    var root = document.getElementById("meadow");
    if (!root) return;
    var BASE = 260, W = 1440;
    var layers = [
      { n: 46, col: ["#33562f", "#2c4a29"], hMin: 70, hMax: 120, wMax: 11, amp: [1, 2] },
      { n: 40, col: ["#3f6a36", "#356030"], hMin: 95, hMax: 165, wMax: 13, amp: [1.5, 3] },
      { n: 30, col: ["#244020", "#1c3219"], hMin: 130, hMax: 215, wMax: 16, amp: [2, 3.5] }
    ];
    layers.forEach(function (L) {
      var g = svg("g", {});
      for (var i = 0; i < L.n; i++) {
        var x = rand(-30, W + 30), h = rand(L.hMin, L.hMax),
            lean = rand(-34, 34), w = rand(6, L.wMax);
        var d = "M" + x + " " + BASE +
                " C" + (x + lean * .3) + " " + (BASE - h * .5) +
                "," + (x + lean * .7) + " " + (BASE - h * .86) +
                "," + (x + lean) + " " + (BASE - h) +
                " C" + (x + lean + w * .5) + " " + (BASE - h * .8) +
                "," + (x + w * .7) + " " + (BASE - h * .4) +
                "," + (x + w) + " " + BASE + " Z";
        var blade = svg("path", { d: d, fill: pick(L.col), class: "blade" });
        blade.style.setProperty("--sway-amp", rand(L.amp[0], L.amp[1]).toFixed(2) + "deg");
        blade.style.setProperty("--sway-dur", rand(3.6, 6.2).toFixed(2) + "s");
        blade.style.setProperty("--sway-delay", (-rand(0, 5)).toFixed(2) + "s");
        g.appendChild(blade);
      }
      root.appendChild(g);
    });
    // wildflowers (Israel's anemone red, plus white daisies and violets)
    var flowers = [
      { petal: "#cf3b2f", core: "#3a241a" }, { petal: "#cf3b2f", core: "#3a241a" },
      { petal: "#f4f0e4", core: "#e8b54d" }, { petal: "#f4f0e4", core: "#e8b54d" },
      { petal: "#8f6fc0", core: "#face6a" }, { petal: "#e8b54d", core: "#7a4f12" }
    ];
    for (var f = 0; f < 11; f++) {
      var fx = rand(40, W - 40), stem = rand(70, 150), kind = pick(flowers);
      var g2 = svg("g", { class: "flower" });
      g2.style.setProperty("--sway-amp", rand(2, 4).toFixed(2) + "deg");
      g2.style.setProperty("--sway-dur", rand(3.4, 5.6).toFixed(2) + "s");
      g2.style.setProperty("--sway-delay", (-rand(0, 4)).toFixed(2) + "s");
      g2.appendChild(svg("path", {
        d: "M" + fx + " " + BASE + " Q" + (fx + rand(-12, 12)) + " " + (BASE - stem * .5) + " " + fx + " " + (BASE - stem),
        stroke: "#2f5226", "stroke-width": rand(2.5, 4), fill: "none", "stroke-linecap": "round"
      }));
      var cy = BASE - stem;
      var petals = 6, R = rand(8, 12);
      for (var p = 0; p < petals; p++) {
        var ang = (p / petals) * Math.PI * 2;
        g2.appendChild(svg("ellipse", {
          cx: (fx + Math.cos(ang) * R).toFixed(1), cy: (cy + Math.sin(ang) * R).toFixed(1),
          rx: (R * .82).toFixed(1), ry: (R * .5).toFixed(1),
          transform: "rotate(" + (ang * 180 / Math.PI) + " " + (fx + Math.cos(ang) * R).toFixed(1) + " " + (cy + Math.sin(ang) * R).toFixed(1) + ")",
          fill: kind.petal, opacity: .96
        }));
      }
      g2.appendChild(svg("circle", { cx: fx.toFixed(1), cy: cy.toFixed(1), r: (R * .55).toFixed(1), fill: kind.core }));
      root.appendChild(g2);
    }
  }

  /* ---------- Pollen motes ---------- */
  function buildMotes() {
    if (reduce) return;
    var root = document.getElementById("motes");
    if (!root) return;
    for (var i = 0; i < 18; i++) {
      var m = document.createElement("div");
      m.className = "mote";
      var s = rand(3, 7);
      m.style.left = rand(0, 100).toFixed(1) + "%";
      m.style.width = m.style.height = s.toFixed(1) + "px";
      m.style.setProperty("--mote-dur", rand(13, 24).toFixed(1) + "s");
      m.style.setProperty("--mote-delay", (-rand(0, 22)).toFixed(1) + "s");
      m.style.setProperty("--mote-x", rand(-60, 80).toFixed(0) + "px");
      m.style.setProperty("--mote-op", rand(.3, .8).toFixed(2));
      root.appendChild(m);
    }
  }

  /* ---------- Flying butterflies ---------- */
  function buildButterflies() {
    var sky = document.getElementById("sky");
    if (!sky || !M || !M.flyAlongArc) return;
    var imgs = ["painted-lady", "plain-tiger", "bath-white", "long-tailed-blue"];
    var vw = function () { return window.innerWidth; }, vh = function () { return window.innerHeight; };
    var count = Math.max(4, Math.min(7, Math.round(vw() / 250)));
    for (var i = 0; i < count; i++) {
      var el = document.createElement("div");
      el.className = "flit";
      var size = rand(46, 94);
      el.style.width = size.toFixed(0) + "px";
      var img = document.createElement("img");
      img.className = "flit-wing";
      img.src = imgs[i % imgs.length] + ".png";
      img.alt = "";
      img.style.animationDelay = (-rand(0, .4)).toFixed(2) + "s";
      img.style.animationDuration = rand(.34, .5).toFixed(2) + "s";
      el.appendChild(img);
      sky.appendChild(el);

      var start = { x: rand(0, vw()), y: rand(40, vh() * .7) };
      el.style.transform = "translate3d(" + start.x + "px," + start.y + "px,0)";
      if (reduce) continue;
      (function flight(node, pos) {
        var margin = 150;
        var to = { x: rand(-margin, vw() + margin), y: rand(30, vh() - 150) };
        M.flyAlongArc(node, pos, to, {
          minMs: 2600, maxMs: 5800, baseMs: 1800, msPerPx: 2.6,
          arcPx: rand(50, 150), lift: 0.05, maxTiltDeg: 34, settleMs: 800, verticalDampenPow: 1.4
        }).then(function () {
          setTimeout(function () { flight(node, to); }, rand(150, 1100));
        });
      })(el, start);
    }
  }

  /* ---------- Scroll reveals, count-ups, marquee ---------- */
  function wireMotion() {
    if (!M) return;
    M.revealOnScroll("[data-reveal]", { threshold: 0.16 });
    document.querySelectorAll(".stat-num[data-count]").forEach(function (el) {
      var to = parseInt(el.getAttribute("data-count"), 10) || 0;
      M.countUp(el, to, { duration: 1400, threshold: 0.6, format: function (n) { return Math.round(n).toString(); } });
    });
    var names = document.querySelector(".names");
    if (names) M.marquee(names, { speed: 55 });
  }

  function init() {
    buildMeadow();
    buildMotes();
    buildButterflies();
    wireMotion();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
