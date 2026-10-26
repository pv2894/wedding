/* =========================================================
   Wedding Invitation – animations + 3D (Three.js)
   ========================================================= */
(function () {
  "use strict";

  /* ---------- 3D scene: floating hearts, rings & gold dust ---------- */
  const canvas = document.getElementById("bg3d");
  let scene, camera, renderer, group, dust, rings = [], hearts = [];
  const mouse = { x: 0, y: 0 };

  function heartShape() {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(0, 0.6, -1, 0.9, -1, 0.2);
    s.bezierCurveTo(-1, -0.5, 0, -0.7, 0, -1.3);
    s.bezierCurveTo(0, -0.7, 1, -0.5, 1, 0.2);
    s.bezierCurveTo(1, 0.9, 0, 0.6, 0, 0);
    return s;
  }

  function initScene() {
    if (!window.THREE) return;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
    camera.position.z = 14;

    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const p1 = new THREE.PointLight(0xffd27a, 2.2, 60); p1.position.set(8, 8, 10); scene.add(p1);
    const p2 = new THREE.PointLight(0xff6a8d, 1.8, 60); p2.position.set(-9, -5, 8); scene.add(p2);

    group = new THREE.Group();
    scene.add(group);

    // Hearts
    const geo = new THREE.ExtrudeGeometry(heartShape(), {
      depth: 0.4, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.15, bevelSegments: 6, curveSegments: 24,
    });
    geo.center();
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xe8637a, metalness: 0.3, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1,
    });
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(geo, mat);
      const sc = 0.3 + Math.random() * 0.5;
      m.scale.set(sc, sc, sc);
      m.position.set((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 22, (Math.random() - 0.5) * 12 - 2);
      m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      m.userData = { vy: 0.003 + Math.random() * 0.007, rx: (Math.random() - 0.5) * 0.012, ry: (Math.random() - 0.5) * 0.02, ph: Math.random() * 6 };
      hearts.push(m); group.add(m);
    }

    // Golden rings (interlocked pair in the centre-right)
    const gold = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 1, roughness: 0.18 });
    const r1 = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.18, 32, 120), gold);
    const r2 = r1.clone();
    r1.position.set(6, 1, -3); r2.position.set(7.4, 1, -3);
    r1.rotation.set(0.6, 0.4, 0); r2.rotation.set(-0.6, 1.2, 0);
    rings.push(r1, r2); group.add(r1, r2);

    // Gold dust particles
    const N = 600, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    dust = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffe08a, size: 0.07, transparent: true, opacity: 0.8 }));
    scene.add(dust);

    addEventListener("resize", () => {
      camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });
    addEventListener("mousemove", (e) => {
      mouse.x = (e.clientX / innerWidth - 0.5) * 2;
      mouse.y = (e.clientY / innerHeight - 0.5) * 2;
    });

    let t = 0;
    (function loop() {
      requestAnimationFrame(loop);
      t += 0.01;
      hearts.forEach((h) => {
        h.position.y += h.userData.vy;
        h.position.x += Math.sin(t + h.userData.ph) * 0.003;
        h.rotation.x += h.userData.rx; h.rotation.y += h.userData.ry;
        if (h.position.y > 12) h.position.y = -12;
      });
      rings.forEach((r, i) => { r.rotation.y += 0.008 * (i ? -1 : 1); r.rotation.x += 0.004; });
      dust.rotation.y += 0.0007;
      const scrollY = window.scrollY || 0;
      group.rotation.y += (mouse.x * 0.25 - group.rotation.y) * 0.04;
      group.rotation.x += (mouse.y * 0.15 - group.rotation.x) * 0.04;
      camera.position.y += (-scrollY * 0.002 - camera.position.y) * 0.05;
      renderer.render(scene, camera);
    })();
  }

  /* ---------- Envelope intro ---------- */
  const env = document.getElementById("envelope");
  const intro = document.getElementById("intro");
  const site = document.getElementById("site");
  const musicBtn = document.getElementById("music-btn");
  let opened = false;

  function openInvite() {
    if (opened) return; opened = true;
    env.classList.add("open");
    setTimeout(() => {
      intro.classList.add("gone");
      site.classList.remove("hidden");
      musicBtn.classList.remove("hidden");
      observeReveals();
      petalRain(true);
      setTimeout(() => (intro.style.display = "none"), 1100);
    }, 2000);
  }
  env.addEventListener("click", openInvite);
  intro.addEventListener("click", openInvite);

  /* ---------- Scroll reveal ---------- */
  function observeReveals() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    document.querySelectorAll(".reveal").forEach((el, i) => {
      el.style.transitionDelay = (i % 4) * 0.08 + "s";
      io.observe(el);
    });
  }

  /* ---------- Falling petals ---------- */
  let petalsOn = true, petalTimer;
  function petalRain(start) {
    clearInterval(petalTimer);
    if (!start) return;
    const icons = ["🌸", "🌺", "💮", "✨", "🌹"];
    petalTimer = setInterval(() => {
      const p = document.createElement("span");
      p.className = "petal";
      p.textContent = icons[Math.floor(Math.random() * icons.length)];
      p.style.left = Math.random() * 100 + "vw";
      p.style.fontSize = 12 + Math.random() * 16 + "px";
      p.style.animationDuration = 7 + Math.random() * 7 + "s";
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 15000);
    }, 600);
  }
  musicBtn.addEventListener("click", () => {
    petalsOn = !petalsOn; petalRain(petalsOn);
    musicBtn.style.opacity = petalsOn ? 1 : 0.5;
  });

  /* ---------- Countdown ---------- */
  const target = new Date(window.WEDDING.date).getTime();
  const pad = (n) => String(n).padStart(2, "0");
  function tick() {
    let d = Math.max(0, target - Date.now());
    const days = Math.floor(d / 864e5); d -= days * 864e5;
    const h = Math.floor(d / 36e5); d -= h * 36e5;
    const m = Math.floor(d / 6e4); d -= m * 6e4;
    const s = Math.floor(d / 1e3);
    document.getElementById("cd-d").textContent = pad(days);
    document.getElementById("cd-h").textContent = pad(h);
    document.getElementById("cd-m").textContent = pad(m);
    document.getElementById("cd-s").textContent = pad(s);
  }
  tick(); setInterval(tick, 1000);

  /* ---------- 3D tilt on cards ---------- */
  document.addEventListener("mousemove", (e) => {
    document.querySelectorAll(".tilt").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (e.clientY < r.top - 80 || e.clientY > r.bottom + 80) return;
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      const inside = Math.abs(x) < 0.7 && Math.abs(y) < 0.7;
      el.style.transform = inside
        ? `perspective(800px) rotateY(${x * 16}deg) rotateX(${-y * 16}deg) scale(1.03)` : "";
    });
  });

  // tap-to-flip for touch devices
  document.querySelectorAll(".flip").forEach((f) => f.addEventListener("click", () => f.classList.toggle("flipped")));

  /* ---------- Forms ---------- */
  async function postJSON(url, body) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  }

  const rsvpForm = document.getElementById("rsvp-form");
  const rsvpStatus = document.getElementById("rsvp-status");
  rsvpForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(rsvpForm));
    rsvpStatus.className = "status"; rsvpStatus.textContent = "Sending...";
    try {
      const { ok, data } = await postJSON("/api/rsvp", body);
      if (ok && data.ok) {
        rsvpStatus.className = "status ok"; rsvpStatus.textContent = data.message;
        rsvpForm.reset(); burst();
      } else {
        rsvpStatus.className = "status err"; rsvpStatus.textContent = data.error || "Something went wrong.";
      }
    } catch {
      rsvpStatus.className = "status err"; rsvpStatus.textContent = "Network error. Please try again.";
    }
  });

  const wishForm = document.getElementById("wish-form");
  const wishList = document.getElementById("wish-list");
  function esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
  function renderWishes(list) {
    wishList.innerHTML = list.map((w) => `<div class="wish"><b>${esc(w.name)}</b><p>${esc(w.message)}</p></div>`).join("");
  }
  async function loadWishes() {
    try { const r = await fetch("/api/wishes"); renderWishes((await r.json()).wishes || []); } catch {}
  }
  wishForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const { ok, data } = await postJSON("/api/wishes", Object.fromEntries(new FormData(wishForm)));
    if (ok && data.ok) { renderWishes(data.wishes); wishForm.reset(); burst(); }
  });
  loadWishes();

  /* ---------- Celebration burst ---------- */
  function burst() {
    const icons = ["💖", "✨", "🌸", "🎉", "💍"];
    for (let i = 0; i < 26; i++) {
      const el = document.createElement("span");
      el.textContent = icons[i % icons.length];
      Object.assign(el.style, {
        position: "fixed", left: "50%", top: "60%", fontSize: 16 + Math.random() * 18 + "px",
        pointerEvents: "none", zIndex: 99, transition: "transform 1.4s cubic-bezier(.2,.8,.2,1), opacity 1.4s",
      });
      document.body.appendChild(el);
      requestAnimationFrame(() => {
        const a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 260;
        el.style.transform = `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d - 120}px) rotate(${Math.random() * 360}deg)`;
        el.style.opacity = 0;
      });
      setTimeout(() => el.remove(), 1500);
    }
  }

  initScene();
})();
