/* =========================================================
   Invitation behaviour: gates -> curtains -> site, scratch card,
   countdown, 3D tilt, reveals, flip card, map tabs.
   ========================================================= */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- split names into letters for the 3D entrance ---------- */
  $$(".word").forEach(function (el) {
    var txt = el.getAttribute("data-word"), k = 0;
    el.setAttribute("aria-hidden", "true");
    txt.split("").forEach(function (c) {
      var s = document.createElement("span");
      s.className = "ch"; s.textContent = c; s.style.setProperty("--k", k++);
      el.appendChild(s);
    });
  });

  /* ---------- marigold toran ---------- */
  var toran = $("#toran");
  if (toran) {
    var n = Math.round(innerWidth / 26);
    for (var i = 0; i < n; i++) {
      var s = document.createElement("div");
      s.className = "tstr";
      s.style.left = ((i + 0.5) / n * 100) + "%";
      s.style.animationDelay = (-Math.random() * 3) + "s";
      var len = 2 + Math.round(Math.abs(Math.sin(i * 0.55)) * 3) + (i % 2);
      for (var k = 0; k < len; k++) {
        var b = document.createElement("i");
        if (k === len - 1) b.className = "l"; else if (i % 5 === 2 && k % 3 === 2) b.className = "r";
        s.appendChild(b);
      }
      toran.appendChild(s);
    }
  }

  /* ---------- intro sequence ---------- */
  var stage = $("#stage"), started = false;
  function enterSite() {
    document.body.classList.remove("locked");
    document.body.classList.add("entered");
    startScratch();
    setTimeout(function () { stage.classList.add("done"); }, 700);
    setTimeout(function () { stage.style.display = "none"; }, 1900);
  }
  function openInvite() {
    if (started) return; started = true;
    stage.classList.add("gates-open");
    setTimeout(function () { stage.classList.add("curtains-open"); }, reduce ? 50 : 2100);
    setTimeout(enterSite, reduce ? 150 : 3300);
  }
  if (stage) {
    stage.addEventListener("click", openInvite);
    var ob = $("#open-btn"); if (ob) ob.focus({ preventScroll: true });
  }

  /* ---------- helpers: sparkles + confetti ---------- */
  function sparkle(x, y) {
    var s = document.createElement("span");
    s.className = "spark";
    s.style.left = x + "px"; s.style.top = y + "px";
    document.body.appendChild(s);
    var dx = (Math.random() - 0.5) * 70, dy = 20 + Math.random() * 50;
    s.animate([{ transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
               { transform: "translate(" + dx + "px," + dy + "px) scale(0)", opacity: 0 }],
              { duration: 700 + Math.random() * 400, easing: "ease-out" }).onfinish = function () { s.remove(); };
  }
  function confetti(cx, cy, count) {
    var colors = ["#f6e3a1", "#d9b24c", "#e23a65", "#ff9d1c", "#ffffff", "#8f1730"];
    for (var i = 0; i < count; i++) {
      var p = document.createElement("span");
      p.className = "conf";
      var w = 6 + Math.random() * 8;
      p.style.cssText = "width:" + w + "px;height:" + w * 1.5 + "px;background:" + colors[i % colors.length] +
        ";border-radius:" + (i % 3 ? "2px" : "50%") + ";left:" + cx + "px;top:" + cy + "px";
      document.body.appendChild(p);
      var a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 320;
      var dx = Math.cos(a) * d, dy = Math.sin(a) * d - 140;
      p.animate([
        { transform: "translate(-50%,-50%) rotate(0)", opacity: 1 },
        { transform: "translate(" + dx + "px," + dy + "px) rotate(" + (Math.random() * 720) + "deg)", opacity: 1, offset: 0.45 },
        { transform: "translate(" + dx * 1.2 + "px," + (dy + 420) + "px) rotate(" + (Math.random() * 1080) + "deg)", opacity: 0 }
      ], { duration: 1800 + Math.random() * 1200, easing: "cubic-bezier(.2,.7,.3,1)" }).onfinish = (function (el) { return function () { el.remove(); }; })(p);
    }
  }

  /* ---------- scratch card ---------- */
  var scratchWrap = $("#scratch"), canvas = $("#scratch-canvas"), revealed = false, ctx, W, H, ready = false;
  function drawFoil() {
    var r = scratchWrap.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    var g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#f3d97a"); g.addColorStop(0.25, "#b98a1c"); g.addColorStop(0.5, "#fbe9a6");
    g.addColorStop(0.75, "#b98a1c"); g.addColorStop(1, "#f0cf62");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (var i = 0; i < 700; i++) {                       // foil grain
      ctx.fillStyle = "rgba(" + (Math.random() > 0.5 ? "255,255,255" : "110,70,10") + "," + (Math.random() * 0.22) + ")";
      ctx.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    ctx.strokeStyle = "rgba(90,50,5,.35)"; ctx.lineWidth = 1.5;          // engraved diamond border
    ctx.strokeRect(10, 10, W - 20, H - 20); ctx.strokeRect(14, 14, W - 28, H - 28);
    ctx.fillStyle = "rgba(90,50,5,.28)";
    for (var x = 30; x < W - 20; x += 26) { ctx.fillRect(x, 20, 3, 3); ctx.fillRect(x, H - 23, 3, 3); }
    ctx.textAlign = "center"; ctx.fillStyle = "#6b3f06"; ctx.shadowColor = "rgba(255,255,255,.7)"; ctx.shadowOffsetY = 1;
    ctx.font = "italic 600 " + Math.round(H * 0.15) + "px 'Cormorant Garamond', serif";
    ctx.fillText("Scratch to reveal", W / 2, H * 0.46);
    ctx.font = "400 " + Math.round(H * 0.3) + "px 'Great Vibes', cursive";
    ctx.fillText("the Date", W / 2, H * 0.78);
    ctx.shadowColor = "transparent";
    ready = true;
  }
  function startScratch() {
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawFoil); else drawFoil();
    setTimeout(function () { if (!revealed && !drawing) drawFoil(); }, 3400);   // re-measure after the entrance animation
  }

  var drawing = false, lastX = 0, lastY = 0, moves = 0;
  function pos(e) { var r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function scratchTo(x, y) {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "#000"; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(34, W * 0.11);
    ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(x, y); ctx.stroke();
    lastX = x; lastY = y;
  }
  function percentCleared() {
    var d = ctx.getImageData(0, 0, canvas.width, canvas.height).data, c = 0, tot = 0, step = 4 * 24;
    for (var i = 3; i < d.length; i += step) { tot++; if (d[i] < 40) c++; }
    return c / tot;
  }
  function reveal(auto) {
    if (revealed) return; revealed = true;
    canvas.classList.add("gone");
    scratchWrap.classList.add("revealed");
    $("#reveal-btn").classList.add("hide");
    $("#countdown").classList.remove("locked");
    var r = scratchWrap.getBoundingClientRect();
    confetti(r.left + r.width / 2, r.top + r.height / 2, 90);
    if (window.Scene3D) window.Scene3D.burst();
  }
  if (canvas) {
    canvas.addEventListener("pointerdown", function (e) {
      if (!ready || revealed) return; drawing = true; canvas.setPointerCapture(e.pointerId);
      var p = pos(e); lastX = p.x; lastY = p.y; scratchTo(p.x + 0.01, p.y); e.preventDefault();
    });
    canvas.addEventListener("pointermove", function (e) {
      if (!drawing || revealed) return;
      var p = pos(e); scratchTo(p.x, p.y);
      if (++moves % 3 === 0) sparkle(e.clientX, e.clientY);
      if (moves % 8 === 0 && percentCleared() > 0.45) reveal(true);
    });
    function stop() { drawing = false; if (!revealed && ready && percentCleared() > 0.45) reveal(true); }
    canvas.addEventListener("pointerup", stop);
    canvas.addEventListener("pointercancel", stop);
    $("#reveal-btn").addEventListener("click", function () { reveal(false); });
    addEventListener("resize", function () { if (!revealed && ready) drawFoil(); });
  }

  /* ---------- countdown ---------- */
  var cd = $("#countdown"), target = new Date(cd.getAttribute("data-date")).getTime();
  function pad(n) { return String(n).padStart(2, "0"); }
  function tick() {
    var d = Math.max(0, target - Date.now());
    var days = Math.floor(d / 864e5); d -= days * 864e5;
    var h = Math.floor(d / 36e5); d -= h * 36e5;
    var m = Math.floor(d / 6e4); d -= m * 6e4;
    $("#cd-d").textContent = pad(days); $("#cd-h").textContent = pad(h);
    $("#cd-m").textContent = pad(m); $("#cd-s").textContent = pad(Math.floor(d / 1e3));
  }
  tick(); setInterval(tick, 1000);

  /* ---------- scroll reveal ---------- */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    $$(".reveal").forEach(function (el) { io.observe(el); });
  } else { $$(".reveal").forEach(function (el) { el.classList.add("in"); }); }

  /* ---------- 3D tilt (mouse) ---------- */
  if (matchMedia("(hover:hover)").matches && !reduce) {
    $$(".tilt").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.classList.add("hovering");
        el.style.setProperty("--ry", ((x - 0.5) * 16) + "deg");
        el.style.setProperty("--rx", ((0.5 - y) * 14) + "deg");
        el.style.setProperty("--mx", (x * 100) + "%"); el.style.setProperty("--my", (y * 100) + "%");
      });
      el.addEventListener("pointerleave", function () {
        el.classList.remove("hovering"); el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg");
      });
    });
  }

  /* ---------- flip card ---------- */
  var fc = $("#flipcard");
  if (fc) {
    var flip = function () { fc.classList.toggle("flipped"); };
    fc.addEventListener("click", flip);
    fc.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
  }

  /* ---------- map tabs ---------- */
  $$(".tab").forEach(function (t) {
    t.addEventListener("click", function () {
      $$(".tab").forEach(function (o) { o.classList.remove("active"); });
      t.classList.add("active");
      $("#map").src = "https://www.google.com/maps?q=" + t.getAttribute("data-q") + "&output=embed";
    });
  });
})();
