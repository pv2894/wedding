/* =========================================================
   3D background: glowing lotus, interlocked wedding rings,
   falling marigold & rose petals, golden dust.
   Reacts to mouse (parallax) and scroll (camera + object path).
   ========================================================= */
(function () {
  "use strict";
  var canvas = document.getElementById("bg3d");
  if (!canvas || !window.THREE) return;
  var T = THREE;
  var isMobile = Math.min(innerWidth, innerHeight) < 640;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  var renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas: canvas, alpha: true, antialias: !isMobile, powerPreference: "high-performance" });
  } catch (e) { canvas.style.display = "none"; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isMobile ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  var scene = new T.Scene();
  var camera = new T.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 120);
  camera.position.set(0, 0, 20);

  /* ---- reflections: tiny studio of warm light panels -> env map ---- */
  (function makeEnv() {
    var env = new T.Scene();
    env.background = new T.Color(0x240510);
    function panel(color, k, w, h, x, y, z) {
      var m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(color).multiplyScalar(k), side: T.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
    }
    panel(0xfff0c0, 6, 14, 8, 8, 9, 8);
    panel(0xff9a55, 4, 10, 10, -10, 2, 6);
    panel(0xffffff, 3, 20, 3, 0, -9, 4);
    panel(0xe23a65, 2.5, 8, 12, 0, 3, -10);
    panel(0xffe08a, 3, 6, 6, -6, 8, -4);
    var pm = new T.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env, 0.03).texture;
    pm.dispose();
  })();

  /* ---- lights ---- */
  scene.add(new T.AmbientLight(0xffe2c0, 0.45));
  var key = new T.DirectionalLight(0xfff0cf, 2.2); key.position.set(6, 10, 12); scene.add(key);
  var rim = new T.PointLight(0xff4d7d, 60, 60, 1.6); rim.position.set(-12, -4, 6); scene.add(rim);
  var warm = new T.PointLight(0xffb347, 70, 60, 1.6); warm.position.set(10, 6, 8); scene.add(warm);

  var world = new T.Group(); scene.add(world);

  /* ---- gold dust (additive sprites) ---- */
  function spriteTex() {
    var c = document.createElement("canvas"); c.width = c.height = 64;
    var g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(255,244,200,1)"); r.addColorStop(0.25, "rgba(255,210,110,.8)"); r.addColorStop(1, "rgba(255,180,60,0)");
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    return new T.CanvasTexture(c);
  }
  var DUST = isMobile ? 260 : 650;
  var dpos = new Float32Array(DUST * 3), dseed = new Float32Array(DUST);
  for (var i = 0; i < DUST; i++) {
    dpos[i * 3] = (Math.random() - 0.5) * 60;
    dpos[i * 3 + 1] = (Math.random() - 0.5) * 44;
    dpos[i * 3 + 2] = (Math.random() - 0.5) * 36 - 4;
    dseed[i] = Math.random() * 10;
  }
  var dgeo = new T.BufferGeometry();
  dgeo.setAttribute("position", new T.BufferAttribute(dpos, 3));
  var dust = new T.Points(dgeo, new T.PointsMaterial({
    map: spriteTex(), size: 0.55, transparent: true, opacity: 0.85, depthWrite: false, blending: T.AdditiveBlending, sizeAttenuation: true
  }));
  scene.add(dust);

  /* ---- lotus (two layers of curved petals + golden stamens) ---- */
  var lotus = new T.Group();
  function petalGeo() {
    var g = new T.SphereGeometry(1, 28, 20);
    var p = g.attributes.position;
    for (var i = 0; i < p.count; i++) {      // pointed tip + slight cup
      var x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      var tip = y > 0 ? 1 - Math.pow(Math.abs(x), 1.2) * 0.35 : 1;
      p.setXYZ(i, x * 0.46 * tip, y * 1.35 + 1.35, z * 0.13 + (y * y) * 0.12);
    }
    g.computeVertexNormals();
    return g;
  }
  var pg = petalGeo();
  function petalMat(c1) {
    return new T.MeshPhysicalMaterial({ color: c1, roughness: 0.38, metalness: 0.05, clearcoat: 0.8, clearcoatRoughness: 0.25,
      sheen: 1, sheenColor: new T.Color(0xffd6e2), transparent: true, opacity: 0.8, emissive: 0x5a0a2a, emissiveIntensity: 0.35 });
  }
  var layers = [
    { n: 16, tilt: 1.15, col: 0xf27aa6, s: 1.0, y: 0 },
    { n: 12, tilt: 0.85, col: 0xf79ab9, s: 0.9, y: 0.1 },
    { n: 8,  tilt: 0.5,  col: 0xffc0d3, s: 0.78, y: 0.2 },
    { n: 5,  tilt: 0.18, col: 0xffe0ea, s: 0.55, y: 0.3 }
  ];
  layers.forEach(function (L, li) {
    var holder = new T.Group(); holder.rotation.y = li * 0.31;
    for (var k = 0; k < L.n; k++) {
      var piv = new T.Group(); piv.rotation.y = (k / L.n) * Math.PI * 2;
      var m = new T.Mesh(pg, petalMat(L.col));
      m.scale.setScalar(L.s); m.rotation.x = L.tilt; m.position.set(0, L.y, 0.25);
      piv.add(m); holder.add(piv);
    }
    lotus.add(holder);
  });
  var core = new T.Mesh(new T.SphereGeometry(0.55, 32, 24), new T.MeshStandardMaterial({ color: 0xffc83a, emissive: 0xff9a1a, emissiveIntensity: 0.9, metalness: 0.6, roughness: 0.3 }));
  core.position.y = 0.35; lotus.add(core);
  for (var s = 0; s < 26; s++) {            // stamens
    var a = Math.random() * Math.PI * 2, r = 0.25 + Math.random() * 0.5;
    var st = new T.Mesh(new T.CylinderGeometry(0.015, 0.015, 0.8, 5), new T.MeshBasicMaterial({ color: 0xffe08a }));
    st.position.set(Math.cos(a) * r, 0.7, Math.sin(a) * r); st.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); lotus.add(st);
  }
  var lotusTilt = new T.Group();            // tilt toward camera; `lotus` spins about its own stem
  lotusTilt.add(lotus);
  lotusTilt.rotation.x = 1.0;
  lotusTilt.scale.setScalar(isMobile ? 1.8 : 2.6);
  lotusTilt.position.set(0, -3.0, -11);
  world.add(lotusTilt);

  /* ---- mandala halo behind the lotus ---- */
  var halo = new T.Group(), goldM = new T.MeshStandardMaterial({ color: 0xd9b24c, metalness: 1, roughness: 0.22 });
  [6.2, 7.4, 9].forEach(function (R, i) {
    var t = new T.Mesh(new T.TorusGeometry(R, 0.035 + i * 0.01, 10, 200), goldM); halo.add(t);
  });
  for (var d = 0; d < 36; d++) {
    var dm = new T.Mesh(new T.OctahedronGeometry(0.16, 0), goldM), ang = d / 36 * Math.PI * 2;
    dm.position.set(Math.cos(ang) * 7.4, Math.sin(ang) * 7.4, 0); dm.scale.set(1, 1.8, 1); dm.rotation.z = ang; halo.add(dm);
  }
  halo.position.set(0, 0.5, -15);
  world.add(halo);

  /* ---- interlocked wedding rings ---- */
  var rings = new T.Group();
  var gold = new T.MeshPhysicalMaterial({ color: 0xe8b83c, metalness: 1, roughness: 0.14, clearcoat: 0.6, envMapIntensity: 1.6 });
  var rose = new T.MeshPhysicalMaterial({ color: 0xf0a08a, metalness: 1, roughness: 0.16, clearcoat: 0.6, envMapIntensity: 1.6 });
  var ringA = new T.Mesh(new T.TorusGeometry(1.5, 0.23, 48, 160), gold); ringA.position.x = -0.75;
  var ringB = new T.Mesh(new T.TorusGeometry(1.5, 0.23, 48, 160), rose); ringB.position.x = 0.75; ringB.rotation.x = Math.PI / 2;
  var gem = new T.Mesh(new T.OctahedronGeometry(0.34, 1), new T.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0, transmission: 0, clearcoat: 1, emissive: 0xaad4ff, emissiveIntensity: 0.6 }));
  gem.position.set(-0.75, 1.72, 0);
  rings.add(ringA, ringB, gem);
  rings.scale.setScalar(isMobile ? 0.8 : 1.15);
  world.add(rings);

  /* ---- falling petals (instanced) ---- */
  var PET = isMobile ? 55 : 120;
  var pgeo = new T.PlaneGeometry(0.34, 0.5, 4, 6);
  var pp = pgeo.attributes.position;
  for (var q = 0; q < pp.count; q++) {
    var px = pp.getX(q), py = pp.getY(q), u = (py + 0.25) / 0.5;           // 0 tip..1 base
    var wd = Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, u * 0.92 + 0.04))), 0.6);
    px *= wd; pp.setX(q, px); pp.setZ(q, px * px * 3.2 + py * 0.12);
  }
  pgeo.computeVertexNormals();
  var petals = new T.InstancedMesh(pgeo, new T.MeshStandardMaterial({ side: T.DoubleSide, roughness: 0.55, metalness: 0.0 }), PET);
  var cols = [0xff9d1c, 0xffb52e, 0xd6193f, 0xff6f9a, 0xffd25e, 0xf7e3a1], pc = new T.Color(), pdata = [];
  for (var j = 0; j < PET; j++) {
    petals.setColorAt(j, pc.set(cols[j % cols.length]));
    pdata.push({
      x: (Math.random() - 0.5) * 36, y: Math.random() * 32 - 16, z: Math.random() * 15 - 11,
      vy: 0.012 + Math.random() * 0.02, sw: 0.4 + Math.random() * 1.2, ph: Math.random() * 6.28,
      rx: Math.random() * 6, ry: Math.random() * 6, rz: Math.random() * 6,
      sx: (Math.random() - 0.5) * 0.04, sy: (Math.random() - 0.5) * 0.04, sz: 0.01 + Math.random() * 0.03,
      sc: 0.55 + Math.random() * 0.8
    });
  }
  petals.instanceColor.needsUpdate = true;
  scene.add(petals);
  var dummy = new T.Object3D();

  /* ---- interaction ---- */
  var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener("pointermove", function (e) { mouse.tx = (e.clientX / innerWidth - 0.5) * 2; mouse.ty = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });
  addEventListener("deviceorientation", function (e) {
    if (e.gamma == null) return; mouse.tx = Math.max(-1, Math.min(1, e.gamma / 30)); mouse.ty = Math.max(-1, Math.min(1, (e.beta - 45) / 40));
  }, { passive: true });
  addEventListener("resize", function () {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight);
  });
  var boost = 0;                                    // energy burst on scratch reveal
  window.Scene3D = { burst: function () { boost = 1; } };

  /* ---- loop ---- */
  var clock = new T.Clock(), prog = 0;
  function frame() {
    requestAnimationFrame(frame);
    var t = clock.getElapsedTime() * (reduce ? 0.15 : 1), dt = Math.min(clock.getDelta(), 0.05);
    mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;
    var maxS = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    var target = Math.min(1, (window.scrollY || 0) / maxS);
    prog += (target - prog) * 0.06;
    boost *= 0.96;

    // camera drifts through the scene as you scroll + mouse parallax
    camera.position.x = mouse.x * 1.6 + Math.sin(prog * 6.28) * 2.2;
    camera.position.y = -mouse.y * 1.0 - prog * 7;
    camera.position.z = 20 - prog * 4 - boost * 2;
    camera.lookAt(Math.sin(prog * 6.28) * 1.2, -prog * 7, 0);

    // lotus blooms: slow spin, gentle breathing, follows camera down the page
    lotus.rotation.y = t * 0.12;
    lotusTilt.rotation.x = 1.0 - prog * 0.45 + Math.sin(t * 0.6) * 0.04;
    lotusTilt.scale.setScalar((isMobile ? 1.8 : 2.6) * (1 + Math.sin(t * 0.8) * 0.025 + boost * 0.12));
    lotusTilt.position.y = -3.0 - prog * 7;
    halo.rotation.z = -t * 0.06; halo.position.y = 0.5 - prog * 7;
    halo.rotation.x = Math.sin(t * 0.3) * 0.12; halo.rotation.y = Math.sin(t * 0.25) * 0.15;

    // rings orbit from side to side as the story scrolls
    var rx = Math.sin(prog * 9.4 + 1.25) * (isMobile ? 4.6 : 9.8);
    rings.position.set(rx, -prog * 7 + 2.5 + Math.sin(t) * 0.5, 2);
    rings.rotation.set(t * 0.35, t * 0.5, Math.sin(t * 0.4) * 0.3);
    gem.rotation.y = t * 2;

    // dust twinkles / drifts upward
    var arr = dgeo.attributes.position.array;
    for (var i = 0; i < DUST; i++) {
      arr[i * 3 + 1] += 0.004 + Math.sin(t + dseed[i]) * 0.002;
      arr[i * 3] += Math.sin(t * 0.5 + dseed[i]) * 0.002;
      if (arr[i * 3 + 1] > 24) arr[i * 3 + 1] = -24;
    }
    dgeo.attributes.position.needsUpdate = true;
    dust.position.y = -prog * 7; dust.material.size = 0.5 + Math.sin(t * 2) * 0.06 + boost * 0.3;

    // petals
    var yMin = -prog * 7 - 16, yMax = -prog * 7 + 16;
    for (var j = 0; j < PET; j++) {
      var p = pdata[j];
      p.y -= p.vy * (1 + boost * 3);
      p.x += Math.sin(t * p.sw + p.ph) * 0.012;
      if (p.y < yMin) { p.y = yMax; p.x = (Math.random() - 0.5) * 36; }
      if (p.y > yMax + 4) p.y = yMax;
      p.rx += p.sx; p.ry += p.sy; p.rz += p.sz;
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.rx, p.ry, p.rz);
      dummy.scale.setScalar(p.sc);
      dummy.updateMatrix(); petals.setMatrixAt(j, dummy.matrix);
    }
    petals.instanceMatrix.needsUpdate = true;

    world.rotation.y = mouse.x * 0.12; world.rotation.x = mouse.y * 0.06;
    rim.position.x = -12 + Math.sin(t * 0.7) * 5; warm.position.y = 6 + Math.cos(t * 0.5) * 4 - prog * 7;
    renderer.render(scene, camera);
  }
  frame();
})();
