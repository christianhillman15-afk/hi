/* =============================================================
   DK3 — 3D scroll-built house (Three.js), detailed edition
   A real 3D model that constructs itself as you scroll:
   survey grid → excavation → slab → framing (crane, scaffold,
   materials) → walls (stucco + wood + stone) → roof → glass,
   entry, balcony → South-Florida landscaping (palms, pool, car)
   → golden-hour dusk with warm window + path lights.
   Exposes window.__dk3SetBuild(progress 0..1); driven by main.js.
   ============================================================= */
(function () {
  "use strict";
  if (!window.THREE) return;
  var canvas = document.getElementById("build-canvas");
  if (!canvas) return;

  var THREE = window.THREE;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var easeOut = function (x) { return 1 - Math.pow(1 - x, 3); };
  var easeInOut = function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  var rand = Math.random;

  var renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true }); }
  catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 260);

  /* ---- lights ---- */
  var hemi = new THREE.HemisphereLight(0xbcd6ef, 0x51603c, 0.6); scene.add(hemi);
  var sun = new THREE.DirectionalLight(0xfff0d0, 1.75);
  sun.position.set(12, 11, 8); sun.castShadow = true;   // lower / more raking key for form-revealing shadows
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 80;
  sun.shadow.camera.left = -14; sun.shadow.camera.right = 14;
  sun.shadow.camera.top = 14; sun.shadow.camera.bottom = -14;   // tight to the building = crisp contact shadow
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  scene.add(sun);
  var fill = new THREE.DirectionalLight(0xa0c6e2, 0.14); fill.position.set(-9, 6, -7); scene.add(fill);

  /* ---- textures (procedural, self-contained) ---- */
  function cvtex(draw, rep) {
    var cv = document.createElement("canvas"); cv.width = cv.height = 128;
    draw(cv.getContext("2d"), 128);
    var t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (rep) t.repeat.set(rep, rep);
    if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  var grassTex = cvtex(function (g, s) {
    g.fillStyle = "#54713c"; g.fillRect(0, 0, s, s);
    for (var i = 0; i < 3000; i++) { g.fillStyle = "rgba(30,54,20," + (rand() * 0.14 + 0.03).toFixed(3) + ")"; g.fillRect(rand() * s, rand() * s, rand() * 2 + 0.5, rand() * 2 + 0.5); }
    for (var j = 0; j < 900; j++) { g.fillStyle = "rgba(150,175,90," + (rand() * 0.10).toFixed(3) + ")"; g.fillRect(rand() * s, rand() * s, 1, 1); }
  }, 26);
  var paverTex = cvtex(function (g, s) {
    g.fillStyle = "#8f8a80"; g.fillRect(0, 0, s, s);
    g.strokeStyle = "rgba(20,20,20,0.22)"; g.lineWidth = 1.5;
    for (var i = 0; i <= s; i += 21) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, s); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(s, i); g.stroke(); }
  }, 4);
  var stuccoRough = cvtex(function (g, s) {
    g.fillStyle = "#808080"; g.fillRect(0, 0, s, s);
    for (var i = 0; i < 5000; i++) { var v = 90 + rand() * 90 | 0; g.fillStyle = "rgb(" + v + "," + v + "," + v + ")"; g.fillRect(rand() * s, rand() * s, 1, 1); }
  }, 3);

  /* ---- normal maps: real surface relief under raking light (Sobel from a height canvas) ---- */
  function normalTex(drawHeight, rep) {
    var s = 128;
    var hc = document.createElement("canvas"); hc.width = hc.height = s;
    var hg = hc.getContext("2d"); drawHeight(hg, s);
    var src = hg.getImageData(0, 0, s, s).data;
    var out = hg.createImageData(s, s), od = out.data;
    function H(x, y) { x = (x + s) % s; y = (y + s) % s; return src[(y * s + x) * 4] / 255; }
    for (var y = 0; y < s; y++) for (var x = 0; x < s; x++) {
      var dx = (H(x - 1, y) - H(x + 1, y)) * 2.2, dy = (H(x, y - 1) - H(x, y + 1)) * 2.2;
      var len = Math.sqrt(dx * dx + dy * dy + 1), i = (y * s + x) * 4;
      od[i] = (dx / len * 0.5 + 0.5) * 255; od[i + 1] = (dy / len * 0.5 + 0.5) * 255;
      od[i + 2] = (1 / len * 0.5 + 0.5) * 255; od[i + 3] = 255;
    }
    hg.putImageData(out, 0, 0);
    var t = new THREE.CanvasTexture(hc); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (rep) t.repeat.set(rep, rep);
    return t; // left in linear space — do NOT tag sRGB
  }
  var stuccoN = normalTex(function (g, s) {
    g.fillStyle = "#808080"; g.fillRect(0, 0, s, s);
    for (var i = 0; i < 9000; i++) { var v = 96 + rand() * 96 | 0; g.fillStyle = "rgba(" + v + "," + v + "," + v + ",0.5)"; g.fillRect(rand() * s, rand() * s, 1.6, 1.6); }
  }, 3);
  var paverN = normalTex(function (g, s) {
    g.fillStyle = "#b6b6b6"; g.fillRect(0, 0, s, s);
    g.strokeStyle = "#2c2c2c"; g.lineWidth = 4;
    for (var i = 0; i <= s; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, s); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(s, i); g.stroke(); }
  }, 4);
  var woodN = normalTex(function (g, s) {
    g.fillStyle = "#909090"; g.fillRect(0, 0, s, s);
    for (var i = 0; i < 46; i++) { var x = rand() * s; g.strokeStyle = "rgba(35,35,35," + (0.25 + rand() * 0.4).toFixed(2) + ")"; g.lineWidth = 1 + rand() * 2; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 7, s / 3, x - 7, 2 * s / 3, x, s); g.stroke(); }
  }, 1);
  var stoneN = normalTex(function (g, s) {
    g.fillStyle = "#a4a4a4"; g.fillRect(0, 0, s, s);
    g.strokeStyle = "#242424"; g.lineWidth = 3; var row = 0;
    for (var y = 0; y <= s; y += 26) { g.beginPath(); g.moveTo(0, y); g.lineTo(s, y); g.stroke(); var off = (row % 2) * 20; for (var x = off; x <= s; x += 40) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 26); g.stroke(); } row++; }
  }, 2);
  var rippleN = normalTex(function (g, s) { // pool water ripples
    g.fillStyle = "#808080"; g.fillRect(0, 0, s, s);
    for (var i = 0; i < 26; i++) { var y = rand() * s; g.strokeStyle = "rgba(150,150,150," + (0.3 + rand() * 0.4).toFixed(2) + ")"; g.lineWidth = 1 + rand() * 2; g.beginPath(); for (var x = 0; x <= s; x += 6) g.lineTo(x, y + Math.sin(x * 0.16 + i) * 4); g.stroke(); }
  }, 3);
  // soft radial ground-shadow texture (realistic contact shadow)
  var shadowTex = (function () { var cv = document.createElement("canvas"); cv.width = cv.height = 128; var g = cv.getContext("2d"); var rg = g.createRadialGradient(64, 64, 8, 64, 64, 62); rg.addColorStop(0, "rgba(0,0,0,0.6)"); rg.addColorStop(0.6, "rgba(0,0,0,0.28)"); rg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = rg; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(cv); })();

  /* ---- sky + fog + stars ---- */
  function skyTex(a, b, c, sun, sx, sy, clouds) {
    var w = 512, h = 256, cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    var g = cv.getContext("2d"), gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, a); gr.addColorStop(0.55, b); gr.addColorStop(1, c);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    if (clouds) { // soft horizontal cloud banks
      g.globalCompositeOperation = "lighter";
      for (var ci = 0; ci < 22; ci++) {
        var cx = rand() * w, cy = h * (0.12 + rand() * 0.32), cw = 30 + rand() * 90, ch = 6 + rand() * 12;
        var cg = g.createRadialGradient(cx, cy, 0, cx, cy, cw);
        cg.addColorStop(0, "rgba(255,255,255," + (0.10 + rand() * 0.14).toFixed(2) + ")"); cg.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = cg; g.save(); g.translate(cx, cy); g.scale(1, ch / cw); g.beginPath(); g.arc(0, 0, cw, 0, 6.283); g.fill(); g.restore();
      }
      g.globalCompositeOperation = "source-over";
    }
    if (sun) { // sun disk + halo
      var rg = g.createRadialGradient(sx * w, sy * h, 0, sx * w, sy * h, h * 0.55);
      rg.addColorStop(0, sun); rg.addColorStop(0.06, sun); rg.addColorStop(0.22, "rgba(255,240,210,0.35)"); rg.addColorStop(1, "rgba(0,0,0,0)");
      g.globalCompositeOperation = "lighter"; g.fillStyle = rg; g.fillRect(0, 0, w, h); g.globalCompositeOperation = "source-over";
    }
    var t = new THREE.CanvasTexture(cv); t.mapping = THREE.EquirectangularReflectionMapping;
    if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  var skyDay = skyTex("#8fbce6", "#cfe3f0", "#eef1ea", "rgba(255,251,236,0.95)", 0.62, 0.26, true);
  var skyDusk = skyTex("#111a38", "#4a3a63", "#f0894b", "rgba(255,150,80,0.98)", 0.70, 0.44, false);
  scene.background = skyDay; scene.environment = skyDay;
  scene.fog = new THREE.Fog(0xcfdae0, 50, 135);
  var starPos = [];
  for (var st = 0; st < 150; st++) starPos.push((rand() - 0.5) * 200, 34 + rand() * 60, -60 - rand() * 60);
  var starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
  var stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xfff3d0, size: 0.5, transparent: true, opacity: 0, depthWrite: false }));
  scene.add(stars);

  /* ---- materials ---- */
  var M = {
    slab:   new THREE.MeshStandardMaterial({ color: 0x9c968b, roughness: 0.96 }),
    dirt:   new THREE.MeshStandardMaterial({ color: 0x8a6f4e, roughness: 1 }),
    grass:  new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }),
    frame:  new THREE.MeshStandardMaterial({ color: 0xba7f38, roughness: 0.72, metalness: 0.08 }),
    steel:  new THREE.MeshStandardMaterial({ color: 0x8b939b, roughness: 0.5, metalness: 0.6 }),
    wall:   new THREE.MeshStandardMaterial({ color: 0xefe9df, roughness: 0.92, roughnessMap: stuccoRough }),
    wall2:  new THREE.MeshStandardMaterial({ color: 0xdcd5c8, roughness: 0.92, roughnessMap: stuccoRough }),
    wood:   new THREE.MeshStandardMaterial({ color: 0x9c6b34, roughness: 0.6, metalness: 0.05 }),
    stone:  new THREE.MeshStandardMaterial({ color: 0xcdbfa3, roughness: 0.85 }),
    roof:   new THREE.MeshStandardMaterial({ color: 0x2b323a, roughness: 0.6, metalness: 0.25 }),
    fascia: new THREE.MeshStandardMaterial({ color: 0x20262d, roughness: 0.5 }),
    band:   new THREE.MeshStandardMaterial({ color: 0xb4ab9c, roughness: 0.82 }),
    glass:  new THREE.MeshPhysicalMaterial({ color: 0x9fc0d8, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.42, emissive: 0x000000, envMapIntensity: 2.6, clearcoat: 1, clearcoatRoughness: 0.08, ior: 1.45, reflectivity: 0.62 }),
    mullion:new THREE.MeshStandardMaterial({ color: 0x272b31, roughness: 0.5, metalness: 0.4 }),
    door:   new THREE.MeshStandardMaterial({ color: 0x5c3f24, roughness: 0.5 }),
    garage: new THREE.MeshStandardMaterial({ color: 0xd0cabe, roughness: 0.8 }),
    drive:  new THREE.MeshStandardMaterial({ map: paverTex, roughness: 1 }),
    pool:   new THREE.MeshStandardMaterial({ color: 0x2f9fc4, roughness: 0.08, metalness: 0.35, transparent: true, opacity: 0.86, emissive: 0x06344a, emissiveIntensity: 0.15 }),
    coping: new THREE.MeshStandardMaterial({ color: 0xe6ded0, roughness: 0.8 }),
    trunk:  new THREE.MeshStandardMaterial({ color: 0x7a5a34, roughness: 1 }),
    palm:   new THREE.MeshStandardMaterial({ color: 0x9a7b45, roughness: 1 }),
    frond:  new THREE.MeshStandardMaterial({ color: 0x3f7a3a, roughness: 1 }),
    leaf:   new THREE.MeshStandardMaterial({ color: 0x3c6a33, roughness: 1 }),
    hedge:  new THREE.MeshStandardMaterial({ color: 0x35592c, roughness: 1 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xe0a021, roughness: 0.55, metalness: 0.2 }),
    dark:   new THREE.MeshStandardMaterial({ color: 0x2a2e33, roughness: 0.6, metalness: 0.3 }),
    cone:   new THREE.MeshStandardMaterial({ color: 0xe4611f, roughness: 0.8 }),
    car:    new THREE.MeshStandardMaterial({ color: 0x30363d, roughness: 0.35, metalness: 0.5 }),
    lightGlow: new THREE.MeshStandardMaterial({ color: 0xffca7a, emissive: 0xffb457, emissiveIntensity: 0, roughness: 0.4 })
  };

  M.mulch = new THREE.MeshStandardMaterial({ color: 0x3a2716, roughness: 1 });
  M.tile  = new THREE.MeshStandardMaterial({ color: 0x2b7f96, roughness: 0.35, metalness: 0.1 });
  M.pot   = new THREE.MeshStandardMaterial({ color: 0x8d8577, roughness: 0.9 });
  M.teak  = new THREE.MeshStandardMaterial({ color: 0xb08a52, roughness: 0.62 });
  M.grass2 = new THREE.MeshStandardMaterial({ color: 0x8fa34a, roughness: 1 }); // ornamental grass
  M.ground = new THREE.MeshStandardMaterial({ color: 0x4a6b2f, roughness: 1 }); // ground cover
  M.concrete = new THREE.MeshStandardMaterial({ color: 0xbcb6ab, roughness: 0.95 });
  M.pool.normalMap = rippleN; M.pool.normalScale = new THREE.Vector2(0.3, 0.3);

  /* ---- surface relief: give the finish materials real normal-mapped texture ---- */
  M.wall.normalMap = stuccoN;  M.wall.normalScale = new THREE.Vector2(0.5, 0.5);
  M.wall2.normalMap = stuccoN; M.wall2.normalScale = new THREE.Vector2(0.5, 0.5);
  M.garage.normalMap = stuccoN; M.garage.normalScale = new THREE.Vector2(0.42, 0.42);
  M.stone.normalMap = stoneN;  M.stone.normalScale = new THREE.Vector2(0.75, 0.75);
  M.wood.normalMap = woodN;    M.wood.normalScale = new THREE.Vector2(0.45, 0.45);
  M.drive.normalMap = paverN;  M.drive.normalScale = new THREE.Vector2(0.8, 0.8);

  var parts = [], glassMeshes = [], frameParts = [], temps = [], lights = [];
  function reg(mesh, t0, t1, mode, opt) {
    opt = opt || {};
    mesh.userData = { t0: t0, t1: t1, mode: mode, opt: opt };
    mesh.castShadow = (mode !== "fade" && opt.noshadow !== true);
    mesh.receiveShadow = opt.noshadow !== true;
    if (mode === "growY") mesh.scale.y = 0.0001;
    if (mode === "scale") { mesh.userData.fs = mesh.scale.clone(); mesh.scale.setScalar(0.0001); }
    if (mode === "drop") { mesh.userData.fy = mesh.position.y; }
    if (mode === "fade") { mesh.material.transparent = true; mesh.userData.op = (opt.opacity != null ? opt.opacity : mesh.material.opacity); mesh.material.opacity = 0; }
    parts.push(mesh); scene.add(mesh); return mesh;
  }
  function boxB(w, h, d, mat, x, y, z) { var g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); var m = new THREE.Mesh(g, mat.clone()); m.position.set(x, y, z); return m; }
  function box(w, h, d, mat, x, y, z) { var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat.clone()); m.position.set(x, y, z); return m; }
  function cyl(rt, rb, h, mat, x, y, z, seg) { var m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 10), mat.clone()); m.position.set(x, y, z); return m; }
  // temporary construction equipment: fade in [i0,i1], fade out [o0,o1]
  function temp(group, i0, i1, o0, o1) {
    group.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0; } });
    group.userData = { i0: i0, i1: i1, o0: o0, o1: o1 };
    temps.push(group); scene.add(group); return group;
  }

  /* ---- ground + survey grid ---- */
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), M.grass);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  var pad = reg(new THREE.Mesh(new THREE.PlaneGeometry(15, 12), M.dirt), 0.0, 0.05, "fade", { opacity: 1, noshadow: true });
  pad.rotation.x = -Math.PI / 2; pad.position.y = 0.02;
  // soft radial contact shadow under the house (grounds the model realistically)
  var contact = new THREE.Mesh(new THREE.PlaneGeometry(22, 17), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.0, depthWrite: false }));
  contact.rotation.x = -Math.PI / 2; contact.position.set(0.4, 0.03, 0.3); scene.add(contact);
  var grid = new THREE.GridHelper(15, 15, 0x74d4e2, 0x2f7f8c);
  grid.position.y = 0.05; grid.material.transparent = true; grid.material.opacity = 0.9; scene.add(grid);

  var SLAB_TOP = 0.5, GF_H = 3.1, UF_H = 2.9;

  /* ---- excavation: dirt mounds (temp) ---- */
  var digG = new THREE.Group();
  for (var d0 = 0; d0 < 5; d0++) { var mound = cyl(0, 0.9 + rand() * 0.5, 0.7, M.dirt, -6 + d0 * 3, 0.35, 6 + (d0 % 2) * 1.2, 7); digG.add(mound); }
  temp(digG, 0.02, 0.06, 0.14, 0.2);

  /* ---- 01 foundation slab + footings ---- */
  reg(boxB(10, SLAB_TOP, 8, M.slab, 0, 0, 0), 0.06, 0.16, "growY");
  reg(box(9.4, 0.12, 7.4, M.dark, 0, SLAB_TOP + 0.02, 0), 0.12, 0.18, "fade", { opacity: 1, noshadow: true }); // rebar/grade line hint

  /* ---- 02 framing ---- */
  function regFrame(m, t0, t1, mode) { reg(m, t0, t1, mode); m.material.transparent = true; frameParts.push(m); return m; }
  var colXs = [-4.6, -1.5, 1.5, 4.6], colZs = [-3.6, 0, 3.6], FH = 6.2;
  for (var ix = 0; ix < colXs.length; ix++) for (var iz = 0; iz < colZs.length; iz++)
    regFrame(boxB(0.18, FH, 0.18, M.frame, colXs[ix], SLAB_TOP, colZs[iz]), 0.16 + 0.015 * ix, 0.30 + 0.015 * ix, "growY");
  function ring(y, t0) {
    regFrame(box(9.4, 0.16, 0.16, M.frame, 0, y, 3.6), t0, t0 + 0.05, "fade");
    regFrame(box(9.4, 0.16, 0.16, M.frame, 0, y, -3.6), t0, t0 + 0.05, "fade");
    regFrame(box(0.16, 0.16, 7.4, M.frame, 4.6, y, 0), t0, t0 + 0.05, "fade");
    regFrame(box(0.16, 0.16, 7.4, M.frame, -4.6, y, 0), t0, t0 + 0.05, "fade");
  }
  ring(SLAB_TOP + 3.1, 0.24); ring(SLAB_TOP + FH, 0.32);
  // joists across mid level
  for (var jz = -3.2; jz <= 3.2; jz += 0.9) regFrame(box(9, 0.1, 0.1, M.frame, 0, SLAB_TOP + 3.05, jz), 0.30, 0.36, "fade");
  reg(box(9, 0.16, 7, M.slab, 0, SLAB_TOP + 3.1, 0), 0.32, 0.4, "fade", { opacity: 1 });

  /* ---- scaffolding + material stacks + cones + fence (temp) ---- */
  var scaffG = new THREE.Group();
  for (var sx = -4.5; sx <= 4.5; sx += 3) { // uprights front
    scaffG.add(box(0.08, 6.2, 0.08, M.steel, sx, SLAB_TOP + 3.1, 4.4));
    scaffG.add(box(0.08, 6.2, 0.08, M.steel, sx, SLAB_TOP + 3.1, -4.4));
  }
  for (var sy2 = 1.8; sy2 <= 6; sy2 += 2) { // horizontal rails + planks front
    scaffG.add(box(9.3, 0.07, 0.07, M.steel, 0, sy2, 4.4));
    scaffG.add(box(9.3, 0.12, 0.5, M.frame, 0, sy2 + 0.1, 4.4));
    scaffG.add(box(9.3, 0.07, 0.07, M.steel, 0, sy2, -4.4));
  }
  temp(scaffG, 0.2, 0.28, 0.6, 0.68);

  var matG = new THREE.Group();
  for (var lp = 0; lp < 4; lp++) matG.add(box(2.4, 0.18, 1.1, M.frame, 7.4, 0.1 + lp * 0.2, 5.5)); // lumber stack
  matG.add(box(1.6, 1.0, 1.2, M.dark, 7.6, 0.5, 3.4)); // materials crate
  temp(matG, 0.16, 0.24, 0.62, 0.7);

  var siteG = new THREE.Group();
  function cone(x, z) { var c = cyl(0.02, 0.28, 0.55, M.cone, x, 0.28, z, 8); siteG.add(c); var b = box(0.5, 0.06, 0.5, M.dark, x, 0.03, z); siteG.add(b); }
  cone(-6.5, 7.5); cone(6.5, 8); cone(-8, 3); cone(8.2, -1);
  // perimeter site fence (posts + mesh panels)
  for (var fx = -9; fx <= 9; fx += 3) { siteG.add(box(0.08, 1.6, 0.08, M.steel, fx, 0.8, 9)); }
  siteG.add(box(18, 1.4, 0.04, new THREE.MeshStandardMaterial({ color: 0xc9cdd2, transparent: true, opacity: 0.22 }), 0, 0.85, 9));
  temp(siteG, 0.02, 0.08, 0.74, 0.82);

  /* ---- crane (improved) ---- */
  var crane = new THREE.Group();
  crane.add(box(0.9, 0.35, 0.9, M.yellow, 0, 0.2, 0)); // base
  crane.add(box(0.32, 13, 0.32, M.yellow, 0, 6.7, 0)); // mast
  crane.add(box(11, 0.32, 0.34, M.yellow, 2.4, 12.7, 0)); // jib
  crane.add(box(2.4, 0.3, 0.34, M.dark, -2.6, 12.7, 0)); // counter-jib
  crane.add(box(1.1, 0.7, 0.7, M.dark, -3.2, 12.7, 0)); // counterweight
  crane.add(box(0.7, 0.7, 0.8, M.dark, 0, 12.0, 0)); // operator cab
  crane.add(box(0.06, 2.4, 0.06, M.steel, 6.6, 11.5, 0)); // hook cable
  crane.add(box(0.5, 0.4, 0.5, M.dark, 6.6, 10.2, 0)); // hook block
  crane.position.set(8.8, 0, -4.8);
  temp(crane, 0.16, 0.26, 0.62, 0.72);

  /* ---- excavator (temp, during sitework) ---- */
  var exG = new THREE.Group();
  exG.add(box(2.6, 0.5, 1.5, M.dark, 0, 0.55, 0)); // tracks base
  exG.add(box(2.4, 0.4, 0.5, M.dark, 0, 0.35, 0.62)); exG.add(box(2.4, 0.4, 0.5, M.dark, 0, 0.35, -0.62)); // tracks
  exG.add(box(1.7, 0.9, 1.3, M.yellow, -0.2, 1.25, 0)); // cab body
  exG.add(box(0.9, 0.8, 1.0, M.glass, 0.5, 1.35, 0)); // cab glass
  var boom = box(2.2, 0.28, 0.28, M.yellow, 1.6, 1.5, 0); boom.rotation.z = -0.5; exG.add(boom);
  var arm = box(1.8, 0.24, 0.24, M.yellow, 3.0, 0.8, 0); arm.rotation.z = 0.5; exG.add(arm);
  exG.add(box(0.5, 0.5, 0.7, M.steel, 3.7, 0.15, 0)); // bucket
  exG.position.set(-5.5, 0, 5.5); exG.rotation.y = -0.7; exG.scale.setScalar(0.9);
  temp(exG, 0.03, 0.08, 0.13, 0.19);

  /* ---- 03 walls (+ wood accent + stone base) ---- */
  reg(boxB(9, GF_H, 7, M.wall, 0, SLAB_TOP, 0), 0.40, 0.52, "growY");
  reg(boxB(8, UF_H, 6, M.wall2, 0.4, SLAB_TOP + GF_H, -0.3), 0.50, 0.62, "growY");
  // stone base course
  reg(boxB(9.08, 0.9, 7.08, M.stone, 0, SLAB_TOP, 0), 0.42, 0.5, "growY");
  // vertical wood-slat accent beside the entry (front)
  reg(boxB(1.5, GF_H + UF_H, 0.2, M.wood, -1.15, SLAB_TOP, 3.56), 0.52, 0.62, "growY");
  // garage wing
  reg(boxB(3.6, 2.7, 4.6, M.garage, -3.4, SLAB_TOP, 4.0), 0.44, 0.56, "growY");
  reg(boxB(3.68, 0.7, 4.68, M.stone, -3.4, SLAB_TOP, 4.0), 0.44, 0.52, "growY");

  /* ---- 04 roof + parapet + fascia ---- */
  var roofY = SLAB_TOP + GF_H + UF_H;
  reg(box(8.6, 0.5, 6.6, M.roof, 0.4, roofY + 0.25, -0.3), 0.60, 0.70, "drop", {});
  reg(box(8.9, 0.35, 0.18, M.fascia, 0.4, roofY + 0.55, -0.3 + 3.3), 0.62, 0.7, "drop", {}); // front parapet
  reg(box(8.9, 0.35, 0.18, M.fascia, 0.4, roofY + 0.55, -0.3 - 3.3), 0.62, 0.7, "drop", {});
  reg(box(0.18, 0.35, 6.7, M.fascia, 0.4 + 4.35, roofY + 0.55, -0.3), 0.62, 0.7, "drop", {});
  reg(box(0.18, 0.35, 6.7, M.fascia, 0.4 - 4.35, roofY + 0.55, -0.3), 0.62, 0.7, "drop", {});
  // pale coping cap that overhangs the parapet (crisp roofline shadow line)
  var capY = roofY + 0.75;
  reg(box(9.06, 0.1, 0.3, M.coping, 0.4, capY, -0.3 + 3.3), 0.63, 0.71, "drop", {});
  reg(box(9.06, 0.1, 0.3, M.coping, 0.4, capY, -0.3 - 3.3), 0.63, 0.71, "drop", {});
  reg(box(0.3, 0.1, 6.86, M.coping, 0.4 + 4.35, capY, -0.3), 0.63, 0.71, "drop", {});
  reg(box(0.3, 0.1, 6.86, M.coping, 0.4 - 4.35, capY, -0.3), 0.63, 0.71, "drop", {});
  // slim floor-line reveal between storeys (warm grey, not a heavy dark ledge)
  reg(box(9.14, 0.18, 7.14, M.band, 0, SLAB_TOP + GF_H + 0.02, 0), 0.56, 0.66, "drop", {});
  reg(box(1.75, 0.35, 4.7, M.roof, -3.4, SLAB_TOP + 2.7 + 0.18, 4.0), 0.58, 0.68, "drop", {}); // garage roof

  /* ---- rooftop terrace + mechanical scape (prominent in the top-down delivered view) ---- */
  var deckY = roofY + 0.55; // rooftop walking surface
  // teak terrace deck across the front half of the roof
  reg(box(8.2, 0.1, 3.1, M.teak, 0.4, deckY, 1.25), 0.72, 0.82, "fade", { opacity: 1 });
  // pergola: posts, beams, shade slats
  var pgP = [[-2.4, 0.1], [1.6, 0.1], [-2.4, 2.4], [1.6, 2.4]];
  for (var pg = 0; pg < pgP.length; pg++) reg(boxB(0.14, 1.5, 0.14, M.wood, pgP[pg][0], deckY, pgP[pg][1]), 0.74, 0.83, "growY");
  reg(box(4.3, 0.13, 0.14, M.wood, -0.4, deckY + 1.5, 0.1), 0.79, 0.87, "fade", { opacity: 1 });
  reg(box(4.3, 0.13, 0.14, M.wood, -0.4, deckY + 1.5, 2.4), 0.79, 0.87, "fade", { opacity: 1 });
  for (var pgs = 0.1; pgs <= 2.45; pgs += 0.34) reg(box(4.5, 0.07, 0.06, M.wood, -0.4, deckY + 1.56, pgs), 0.80, 0.88, "fade", { opacity: 1 });
  // flush skylights (glow at dusk)
  reg(box(1.5, 0.09, 1.1, M.glass, 2.8, deckY + 0.01, 1.7), 0.76, 0.86, "fade", { opacity: 0.5 });
  reg(box(1.1, 0.09, 1.1, M.glass, 3.4, deckY + 0.01, -0.4), 0.77, 0.86, "fade", { opacity: 0.5 });
  // rooftop planters with clipped greenery
  function roofPlanter(x, z) { var g = new THREE.Group(); g.add(box(0.66, 0.5, 0.66, M.pot, 0, deckY + 0.25, 0)); var b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.44, 0), M.hedge.clone()); b.position.y = deckY + 0.68; g.add(b); g.position.set(x, 0, z); return reg(g, 0.83, 0.91, "scale"); }
  roofPlanter(-3.0, 1.0); roofPlanter(-3.0, 2.5);
  // mechanical cluster toward the back of the roof
  reg(box(1.3, 0.7, 1.1, M.dark, -1.9, roofY + 0.85, -2.2), 0.69, 0.78, "drop", {}); // condenser 1
  reg(box(1.1, 0.6, 1.0, M.dark, 0.2, roofY + 0.80, -2.5), 0.70, 0.79, "drop", {});  // condenser 2
  reg(box(1.2, 0.65, 1.0, M.steel, 2.0, roofY + 0.83, -2.1), 0.70, 0.79, "drop", {}); // air handler
  reg(cyl(0.34, 0.34, 0.07, M.mullion, -1.9, roofY + 1.22, -2.2, 16), 0.71, 0.80, "drop", { noshadow: true }); // fan grille
  reg(cyl(0.3, 0.3, 0.07, M.mullion, 0.2, roofY + 1.12, -2.5, 16), 0.71, 0.80, "drop", { noshadow: true });
  reg(box(0.4, 0.4, 2.4, M.steel, 1.1, roofY + 0.72, -3.0), 0.71, 0.80, "drop", {}); // duct run
  // roof-access bulkhead (stair penthouse) with a coping cap
  reg(boxB(1.8, 1.3, 1.6, M.wall2, -3.0, deckY - 0.05, -2.3), 0.68, 0.80, "growY");
  reg(box(1.94, 0.14, 1.74, M.coping, -3.0, deckY - 0.05 + 1.3, -2.3), 0.72, 0.81, "drop", {}); // bulkhead cap
  reg(box(0.7, 0.9, 0.06, M.door, -3.0, deckY + 0.4, -2.3 + 0.83), 0.74, 0.82, "fade", { opacity: 1 }); // access door

  /* ---- 05 framed glass + doors ---- */
  var frontZ = 3.56, sideX = 4.55;
  // Large single-pane windows: slim frame, glass recessed behind the wall face,
  // one thin vertical mullion only (no colonial grid).
  function addWin(w, h, x, y, z, face, t0, t1) {
    if (face === "front") {
      reg(box(w + 0.14, h + 0.14, 0.06, M.mullion, x, y, z - 0.02), t0, t1, "fade", { opacity: 1 });      // slim frame
      reg(box(w, h, 0.05, M.glass, x, y, z - 0.16), t0 + 0.01, t1 + 0.01, "fade", { opacity: 0.5 });        // recessed pane
      reg(box(0.045, h, 0.09, M.mullion, x, y, z - 0.06), t0 + 0.02, t1 + 0.02, "fade", { opacity: 1 });    // single vertical mullion
      reg(box(w + 0.28, 0.09, 0.22, M.stone, x, y - h / 2 - 0.09, z + 0.02), t0 + 0.02, t1 + 0.02, "fade", { opacity: 1 }); // projecting sill
      reg(box(w + 0.22, 0.07, 0.14, M.band, x, y + h / 2 + 0.09, z + 0.01), t0 + 0.02, t1 + 0.02, "fade", { opacity: 1 });  // header lintel
    } else {
      reg(box(0.06, h + 0.14, w + 0.14, M.mullion, x + 0.02, y, z), t0, t1, "fade", { opacity: 1 });
      reg(box(0.05, h, w, M.glass, x - 0.16, y, z), t0 + 0.01, t1 + 0.01, "fade", { opacity: 0.5 });
      reg(box(0.09, h, 0.045, M.mullion, x - 0.06, y, z), t0 + 0.02, t1 + 0.02, "fade", { opacity: 1 });
      reg(box(0.22, 0.09, w + 0.28, M.stone, x + 0.02, y - h / 2 - 0.09, z), t0 + 0.02, t1 + 0.02, "fade", { opacity: 1 }); // projecting sill
      reg(box(0.14, 0.07, w + 0.22, M.band, x + 0.01, y + h / 2 + 0.09, z), t0 + 0.02, t1 + 0.02, "fade", { opacity: 1 });  // header lintel
    }
  }
  // ground floor: picture window + entry-side window (aligned to columns)
  addWin(3.2, 2.3, 1.5, SLAB_TOP + 1.45, frontZ, "front", 0.70, 0.80);
  addWin(1.3, 2.3, -2.0, SLAB_TOP + 1.45, frontZ, "front", 0.71, 0.81);
  // upper floor: three windows stacked directly above the openings below
  addWin(1.3, 1.7, -2.0, SLAB_TOP + GF_H + 1.55, frontZ - 0.3, "front", 0.74, 0.84);
  addWin(1.4, 1.7, 0.6, SLAB_TOP + GF_H + 1.55, frontZ - 0.3, "front", 0.75, 0.85);
  addWin(1.4, 1.7, 2.6, SLAB_TOP + GF_H + 1.55, frontZ - 0.3, "front", 0.76, 0.86);
  addWin(3.2, 2.1, sideX, SLAB_TOP + 1.45, -0.6, "side", 0.74, 0.84);
  addWin(3.0, 1.6, sideX - 0.05, SLAB_TOP + GF_H + 1.5, -0.6, "side", 0.78, 0.88);

  /* ---- entry: tall pivot door in a recessed portal, canopy, steps, sidelight ---- */
  reg(box(1.9, 3.0, 0.1, M.mullion, -0.3, SLAB_TOP + 1.5, frontZ - 0.1), 0.71, 0.79, "fade", { opacity: 1 }); // portal reveal
  reg(box(1.35, 2.75, 0.16, M.door, -0.3, SLAB_TOP + 1.35, frontZ - 0.02), 0.72, 0.8, "fade", { opacity: 1 }); // door slab
  reg(box(0.07, 1.5, 0.13, M.steel, -0.78, SLAB_TOP + 1.35, frontZ + 0.03), 0.73, 0.81, "fade", { opacity: 1 }); // vertical pull handle
  reg(box(0.34, 2.5, 0.08, M.glass, 0.5, SLAB_TOP + 1.45, frontZ - 0.06), 0.73, 0.82, "fade", { opacity: 0.5 }); // sidelight
  reg(box(2.8, 0.16, 1.2, M.fascia, -0.3, SLAB_TOP + 3.0, frontZ + 0.5), 0.73, 0.82, "drop", {}); // canopy
  reg(box(2.2, 0.16, 0.7, M.stone, -0.3, 0.16, frontZ + 0.9), 0.78, 0.86, "fade", { opacity: 1 }); // step 1
  reg(box(1.7, 0.16, 0.5, M.stone, -0.3, 0.32, frontZ + 0.6), 0.79, 0.87, "fade", { opacity: 1 }); // step 2
  // wall sconces flanking the entry (glow at dusk)
  function sconce(x) { var m = box(0.07, 0.5, 0.09, M.lightGlow, x, SLAB_TOP + 1.95, frontZ + 0.06); reg(m, 0.79, 0.86, "fade", { opacity: 1, noshadow: true }); lights.push(m); }
  sconce(-1.62); sconce(0.98);
  // brushed-steel house numbers on the wood-slat panel
  for (var hn = 0; hn < 3; hn++) reg(box(0.14, 0.24, 0.05, M.steel, -1.5 + hn * 0.22, SLAB_TOP + 2.35, frontZ + 0.12), 0.8, 0.87, "fade", { opacity: 1, noshadow: true });
  // downspout on the front-right corner
  reg(box(0.11, GF_H + UF_H - 0.2, 0.11, M.dark, 4.42, SLAB_TOP + (GF_H + UF_H) / 2 - 0.1, 3.4), 0.62, 0.7, "fade", { opacity: 1 });
  // entry planters with clipped shrubs
  function planter(x, z) { var g = new THREE.Group(); g.add(box(0.6, 0.55, 0.6, M.pot, 0, 0.28, 0)); var b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), M.hedge.clone()); b.position.y = 0.75; g.add(b); g.position.set(x, 0, z); return reg(g, 0.82, 0.9, "scale"); }
  planter(-1.55, frontZ + 1.05); planter(0.95, frontZ + 1.05);
  // garage door with slats
  reg(box(2.8, 2.1, 0.1, M.mullion, -3.4, SLAB_TOP + 1.05, 4.0 + 2.3 + 0.02), 0.72, 0.82, "fade", { opacity: 1 });
  for (var gs = 0; gs < 5; gs++) reg(box(2.7, 0.05, 0.12, M.dark, -3.4, SLAB_TOP + 0.35 + gs * 0.42, 4.0 + 2.3 + 0.04), 0.73, 0.83, "fade", { opacity: 1 });

  /* ---- balcony railing (glass + posts) ---- */
  var ry = SLAB_TOP + GF_H + 0.15;
  reg(box(8.4, 0.85, 0.03, M.glass, 0.2, ry + 0.45, 3.42), 0.66, 0.75, "fade", { opacity: 0.4 });
  reg(box(8.6, 0.08, 0.08, M.steel, 0.2, ry + 0.9, 3.42), 0.65, 0.73, "fade", { opacity: 1 });
  for (var rp = -3.6; rp <= 4; rp += 1.2) reg(box(0.06, 0.9, 0.06, M.steel, rp, ry, 3.42), 0.65, 0.73, "fade", { opacity: 1 });

  /* ---- 06 landscaping ---- */
  reg(box(3.2, 0.06, 8, M.drive, -3.4, 0.045, 8.6), 0.80, 0.9, "fade", { opacity: 1, noshadow: true }); // driveway
  reg(box(1.5, 0.06, 4.6, M.drive, -0.3, 0.05, 7.2, 0), 0.82, 0.9, "fade", { opacity: 1, noshadow: true }); // walkway
  // pool + coping + deck + spa
  reg(box(7.6, 0.14, 4.6, M.coping, 3.2, 0.07, 7.4), 0.82, 0.9, "fade", { opacity: 1, noshadow: true }); // deck
  reg(box(6.7, 0.42, 3.8, M.tile, 3.2, 0.24, 7.4), 0.83, 0.9, "fade", { opacity: 1, noshadow: true }); // waterline tile shell
  reg(box(6.4, 0.5, 3.5, M.pool, 3.2, 0.28, 7.4), 0.84, 0.94, "scale"); // water
  reg(box(1.4, 0.55, 1.4, M.pool, 6.2, 0.3, 5.6), 0.85, 0.94, "scale"); // spa
  // submerged pool light (glows at dusk)
  var poolLight = box(0.5, 0.06, 0.5, M.lightGlow, 1.6, 0.14, 7.4); reg(poolLight, 0.86, 0.94, "fade", { opacity: 1, noshadow: true }); lights.push(poolLight);
  // mulch beds under the facade plantings
  reg(box(11.2, 0.05, 1.3, M.mulch, 0, 0.05, frontZ + 0.95), 0.82, 0.9, "fade", { opacity: 1, noshadow: true });
  reg(box(13, 0.05, 0.9, M.mulch, 0, 0.05, 9.2), 0.84, 0.92, "fade", { opacity: 1, noshadow: true });
  function lounger(x, z) { var g = new THREE.Group(); g.add(box(1.7, 0.12, 0.7, M.coping, 0, 0.35, 0)); var bk = box(0.7, 0.12, 0.7, M.coping, 0.6, 0.55, 0); bk.rotation.z = -0.6; g.add(bk); g.position.set(x, 0, z); return reg(g, 0.86, 0.94, "scale"); }
  lounger(0.6, 8.4); lounger(1.7, 8.4);
  // hedges along the facade
  for (var hb = -4; hb <= 4; hb += 1.15) reg(box(1.0, 0.7, 0.7, M.hedge, hb, 0.35, frontZ + 0.95), 0.84 + Math.abs(hb) * 0.004, 0.93, "scale");
  // front low hedge (property edge)
  reg(box(13, 0.7, 0.6, M.hedge, 0, 0.35, 9.2), 0.86, 0.95, "scale");

  // palm tree (South Florida signature)
  function palm(x, z, h, s) {
    var g = new THREE.Group();
    for (var k = 0; k < 6; k++) { var seg = cyl(0.16 * s, 0.2 * s, h / 6, M.palm, Math.sin(k * 0.5) * 0.25 * s, (k + 0.5) * (h / 6), Math.cos(k * 0.4) * 0.15 * s, 8); g.add(seg); }
    var top = new THREE.Vector3(Math.sin(3) * 0.25 * s, h, Math.cos(2.4) * 0.15 * s);
    for (var f = 0; f < 8; f++) {
      var fr = box(2.6 * s, 0.08, 0.5 * s, M.frond, 0, 0, 0);
      fr.position.copy(top); fr.rotation.y = f * (Math.PI / 4); fr.rotation.z = -0.5 + (f % 2) * 0.15;
      fr.geometry.translate(1.3 * s, 0, 0); g.add(fr);
    }
    g.add(cyl(0.3 * s, 0.4 * s, 0.3, M.hedge, top.x, top.y - 0.1, top.z, 8)); // crown
    g.position.set(x, 0, z);
    return reg(g, 0.83, 0.93, "scale");
  }
  palm(-8, 6.5, 6.5, 1.0); palm(9, 3.5, 5.6, 0.9); palm(-9, -2, 6, 1.05);
  // leafy tree
  function tree(x, z, s) {
    var g = new THREE.Group();
    g.add(box(0.4 * s, 2.2 * s, 0.4 * s, M.trunk, 0, 1.1 * s, 0));
    var f1 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5 * s, 0), M.leaf.clone()); f1.position.y = 2.9 * s; g.add(f1);
    var f2 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1 * s, 0), M.leaf.clone()); f2.position.set(0.7 * s, 3.6 * s, 0.3 * s); g.add(f2);
    g.position.set(x, 0, z); return reg(g, 0.85, 0.95, "scale");
  }
  tree(7.5, 7.8, 1.0);
  palm(10.5, 7.5, 5.0, 0.85); palm(-6.5, -3.5, 5.4, 0.95); // denser palm grouping

  /* ---- layered planting: beds, ground cover, ornamental grasses, blooms ---- */
  function shrub(x, z, s) { var m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4 * s, 0), M.hedge.clone()); m.position.set(x, 0.3 * s, z); return reg(m, 0.84, 0.93, "scale"); }
  function grasses(x, z) { var g = new THREE.Group(); for (var i = 0; i < 8; i++) { var bl = boxB(0.05, 0.75 + rand() * 0.5, 0.05, M.grass2, (rand() - 0.5) * 0.4, 0, (rand() - 0.5) * 0.4); bl.rotation.z = (rand() - 0.5) * 0.6; bl.rotation.x = (rand() - 0.5) * 0.6; g.add(bl); } g.position.set(x, 0, z); return reg(g, 0.85, 0.94, "scale"); }
  function bloom(x, z, col) { var m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), new THREE.MeshStandardMaterial({ color: col, roughness: 0.7, emissive: col, emissiveIntensity: 0.12 })); m.position.set(x, 0.26, z); return reg(m, 0.86, 0.95, "scale"); }
  // ground-cover bed along the walkway edge + around the pool
  reg(box(2.6, 0.05, 5.2, M.ground, 1.5, 0.05, 7.2), 0.83, 0.9, "fade", { opacity: 1, noshadow: true });
  // ornamental grasses + shrubs bordering the walk and deck
  grasses(-1.4, 6.0); grasses(0.9, 6.0); grasses(-1.5, 8.6); grasses(0.9, 8.6); grasses(6.7, 8.6); grasses(6.9, 6.0);
  shrub(-4.6, frontZ + 0.95, 1.0); shrub(4.6, frontZ + 0.95, 1.0); shrub(6.9, 7.4, 1.1); shrub(-2.0, 9.2, 0.9); shrub(2.0, 9.2, 0.9);
  // colorful blooms in the front beds (South Florida planting)
  var blc = [0xe0562f, 0xe8a33a, 0xd23b6a, 0xe8c341];
  for (var bi = -3.6; bi <= 3.6; bi += 1.0) bloom(bi, frontZ + 0.7, blc[(bi + 4) & 3]);
  bloom(-1.5, 6.3, 0xe0562f); bloom(1.0, 6.3, 0xd23b6a); bloom(6.6, 8.4, 0xe8a33a);

  /* ---- street frontage: sidewalk, curb, driveway apron, mailbox, address monument ---- */
  reg(box(17, 0.06, 1.2, M.concrete, 0, 0.04, 11.4), 0.82, 0.92, "fade", { opacity: 1, noshadow: true }); // sidewalk
  reg(box(17, 0.18, 0.18, M.concrete, 0, 0.09, 10.7), 0.82, 0.92, "fade", { opacity: 1, noshadow: true }); // curb
  reg(box(3.2, 0.05, 1.9, M.drive, -3.4, 0.045, 10.7), 0.82, 0.92, "fade", { opacity: 1, noshadow: true }); // driveway apron
  var mail = new THREE.Group(); mail.add(boxB(0.09, 1.0, 0.09, M.dark, 0, 0, 0)); mail.add(box(0.34, 0.26, 0.5, M.steel, 0, 1.05, 0.06)); mail.position.set(-1.5, 0, 10.9); reg(mail, 0.87, 0.95, "scale");
  var mon = new THREE.Group(); mon.add(boxB(1.5, 1.05, 0.4, M.wall2, 0, 0, 0)); mon.add(boxB(0.32, 1.1, 0.44, M.wood, -0.55, 0, 0)); for (var an = 0; an < 3; an++) mon.add(box(0.13, 0.22, 0.05, M.steel, -0.15 + an * 0.24, 0.72, 0.23)); mon.position.set(-5.6, 0, 9.7); reg(mon, 0.85, 0.93, "growY");

  /* ---- dusk landscape lighting: palm uplights + step lights ---- */
  function uplight(x, z, r) { var m = new THREE.Mesh(new THREE.CircleGeometry(r || 0.55, 18), M.lightGlow.clone()); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.055, z); reg(m, 0.86, 0.94, "fade", { opacity: 1, noshadow: true }); lights.push(m); return m; }
  uplight(-8, 6.5); uplight(9, 3.5); uplight(-9, -2); uplight(10.5, 7.5); uplight(-6.5, -3.5); // palm bases
  uplight(-0.3, frontZ + 1.1, 0.7); // entry wash
  uplight(-5.6, 9.7, 0.5); // address monument wash

  // parked car in the driveway
  var carG = new THREE.Group();
  carG.add(box(3.6, 0.7, 1.7, M.car, 0, 0.75, 0));
  carG.add(box(2.2, 0.6, 1.5, M.car, -0.1, 1.25, 0));
  carG.add(box(2.0, 0.5, 1.42, M.glass, -0.1, 1.28, 0));
  [[1.2, 0.9], [1.2, -0.9], [-1.2, 0.9], [-1.2, -0.9]].forEach(function (w) { var wh = cyl(0.36, 0.36, 0.3, M.dark, w[0], 0.4, w[1], 14); wh.rotation.x = Math.PI / 2; carG.add(wh); });
  carG.position.set(-3.4, 0, 9.2); carG.rotation.y = Math.PI / 2;
  reg(carG, 0.88, 0.96, "scale");

  /* ---- path + facade lights (glow at dusk) ---- */
  function plight(x, z) { var m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), M.lightGlow.clone()); m.position.set(x, 0.5, z); reg(m, 0.86, 0.94, "fade", { opacity: 1, noshadow: true }); lights.push(m); return m; }
  plight(-1.3, 6.2); plight(0.7, 6.2); plight(-1.3, 8.2); plight(0.7, 8.2); plight(-5.2, 8.6); plight(5.2, 6.4);

  // collect glass + pool water for night lighting / caustics
  var poolMeshes = [];
  parts.forEach(function (m) {
    if (!m.material || !m.material.color) return;
    if (m.material.color.getHex() === 0x9fc0d8) glassMeshes.push(m);
    if (m.material.emissive && m.material.emissive.getHex() === 0x06344a) poolMeshes.push(m);
  });

  /* ---- per-part update ---- */
  function applyPart(m, p) {
    var u = m.userData, e = easeOut(clamp((p - u.t0) / (u.t1 - u.t0), 0, 1));
    if (u.mode === "growY") { m.scale.y = Math.max(0.0001, e); m.visible = e > 0.002; }
    else if (u.mode === "scale") { var s = Math.max(0.0001, e); m.scale.set(u.fs.x * s, u.fs.y * s, u.fs.z * s); m.visible = e > 0.002; }
    else if (u.mode === "drop") { m.position.y = u.fy + (1 - e) * 7; m.visible = e > 0.002; if (m.material) { m.material.transparent = true; m.material.opacity = clamp(e * 1.6, 0, 1); } }
    else if (u.mode === "fade") { m.material.opacity = e * u.op; m.visible = e > 0.002; }
  }
  function applyTemp(grp, p) {
    var u = grp.userData;
    var o = clamp((p - u.i0) / (u.i1 - u.i0), 0, 1) * clamp(1 - (p - u.o0) / (u.o1 - u.o0), 0, 1);
    grp.visible = o > 0.01;
    grp.traverse(function (m) { if (m.isMesh) m.material.opacity = o; });
  }

  var target = new THREE.Vector3(0, 3.2, 0);
  function setCamera(p) {
    var az = lerp(-0.66, 0.4, easeInOut(p));
    var rad = lerp(31, 22, p), hgt = lerp(7, 12.5, easeInOut(p));
    camera.position.set(Math.sin(az) * rad, hgt, Math.cos(az) * rad);
    camera.lookAt(target);
  }

  var duskOn = false;
  function setProgress(p) {
    p = clamp(p, 0, 1);
    for (var i = 0; i < parts.length; i++) applyPart(parts[i], p);
    for (var ti = 0; ti < temps.length; ti++) applyTemp(temps[ti], p);
    // framing enclosed by walls
    var fo = clamp(1 - (p - 0.52) / 0.12, 0, 1);
    for (var k = 0; k < frameParts.length; k++) { var fm = frameParts[k]; fm.material.opacity = (fm.userData.mode === "fade" ? fm.material.opacity : 1) * fo; if (fm.material.opacity < 0.02) fm.visible = false; }
    // grid + contact shadow
    grid.material.opacity = clamp(1 - (p - 0.04) / 0.16, 0, 1) * 0.9; grid.visible = grid.material.opacity > 0.01;
    contact.material.opacity = clamp((p - 0.4) / 0.2, 0, 1) * 0.85;
    // golden hour + lights
    var e2 = clamp((p - 0.84) / 0.16, 0, 1);
    sun.position.set(lerp(12, 3.2, e2), lerp(11, 4.5, e2), lerp(8, 9, e2));
    sun.color.setHSL(lerp(0.11, 0.055, e2), 0.6, lerp(0.9, 0.68, e2));
    sun.intensity = lerp(1.75, 1.0, e2);
    hemi.intensity = lerp(0.45, 0.32, e2);
    // glass: reflective cool sky-tint by day → solid, warmly-lit interior at dusk
    var geHex = e2 < 0.5 ? 0x2c4159 : 0xffb457;
    for (var g = 0; g < glassMeshes.length; g++) {
      var gmat = glassMeshes[g].material;
      gmat.emissive.setHex(geHex); gmat.emissiveIntensity = lerp(0.42, 2.4, e2);
      gmat.opacity = gmat.opacity + (0.9 - gmat.opacity) * (e2 * e2); // lit windows read solid at night
    }
    for (var li = 0; li < lights.length; li++) lights[li].material.emissiveIntensity = e2 * 2.2;
    for (var pmi = 0; pmi < poolMeshes.length; pmi++) poolMeshes[pmi].material.emissiveIntensity = 0.15 + e2 * 0.75; // caustic glow at dusk
    stars.material.opacity = e2 * 0.9; stars.visible = e2 > 0.02;
    var wantDusk = e2 > 0.45;
    if (wantDusk !== duskOn) { duskOn = wantDusk; scene.background = duskOn ? skyDusk : skyDay; scene.environment = duskOn ? skyDusk : skyDay; }
    scene.fog.color.setHex(duskOn ? 0x3a3350 : 0xcfdae0);
    renderer.toneMappingExposure = lerp(1.06, 1.15, e2);
    setCamera(p);
    renderer.render(scene, camera);
  }

  function resize() {
    var w = canvas.clientWidth || canvas.offsetWidth, h = canvas.clientHeight || canvas.offsetHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    setProgress(lastP);
  }
  var lastP = 0;
  window.__dk3SetBuild = function (p) { lastP = p; setProgress(p); };

  var section = document.querySelector(".xform");
  if (section) section.setAttribute("data-3d", "on");
  window.addEventListener("resize", resize);
  resize(); setTimeout(resize, 300);
  window.addEventListener("load", function () { setTimeout(resize, 200); });
  setProgress(reduce ? 1 : 0);
})();
