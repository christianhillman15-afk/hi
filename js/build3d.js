/* =============================================================
   DK3 — 3D scroll-built house (Three.js)
   A real 3D model that constructs itself as you scroll:
   slab → framing → walls → roof → glass → landscaping → lights.
   Exposes window.__dk3SetBuild(progress 0..1); driven by main.js.
   ============================================================= */
(function () {
  "use strict";
  if (!window.THREE) return;
  var canvas = document.getElementById("build-canvas");
  if (!canvas) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var THREE = window.THREE;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var easeOut = function (x) { return 1 - Math.pow(1 - x, 3); };
  var easeInOut = function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);

  /* ---- lights ---- */
  var hemi = new THREE.HemisphereLight(0xbcd6ef, 0x4a5236, 0.62);
  scene.add(hemi);
  var sun = new THREE.DirectionalLight(0xfff1d6, 1.15);
  sun.position.set(9, 15, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 80;
  sun.shadow.camera.left = -22; sun.shadow.camera.right = 22;
  sun.shadow.camera.top = 22; sun.shadow.camera.bottom = -22;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  var fill = new THREE.DirectionalLight(0xa9c4e0, 0.25);
  fill.position.set(-8, 6, -6);
  scene.add(fill);

  /* ---- sky gradient (background + reflections) & fog ---- */
  function skyTex(a, b, c) {
    var cv = document.createElement("canvas"); cv.width = 16; cv.height = 256;
    var g = cv.getContext("2d"); var gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, a); gr.addColorStop(0.55, b); gr.addColorStop(1, c);
    g.fillStyle = gr; g.fillRect(0, 0, 16, 256);
    var t = new THREE.CanvasTexture(cv); t.mapping = THREE.EquirectangularReflectionMapping;
    if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  var skyDay = skyTex("#a9c9e8", "#d6e6f1", "#eee6d6");
  var skyDusk = skyTex("#1b2947", "#5b4a66", "#eaa25c");
  scene.background = skyDay; scene.environment = skyDay;
  scene.fog = new THREE.Fog(0xcfdae0, 48, 125);

  // faint stars for the dusk finish
  var starPos = [];
  for (var st = 0; st < 140; st++) starPos.push((Math.random() - 0.5) * 180, 34 + Math.random() * 55, -55 - Math.random() * 55);
  var starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
  var stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xfff3d0, size: 0.5, transparent: true, opacity: 0, depthWrite: false }));
  scene.add(stars);

  /* ---- materials ---- */
  var M = {
    slab:   new THREE.MeshStandardMaterial({ color: 0x9c968b, roughness: 0.95 }),
    dirt:   new THREE.MeshStandardMaterial({ color: 0x8a6f4e, roughness: 1 }),
    grass:  new THREE.MeshStandardMaterial({ color: 0x54713c, roughness: 1 }),
    frame:  new THREE.MeshStandardMaterial({ color: 0xba7f38, roughness: 0.7, metalness: 0.1 }),
    wall:   new THREE.MeshStandardMaterial({ color: 0xefe9df, roughness: 0.85 }),
    wall2:  new THREE.MeshStandardMaterial({ color: 0xd8d0c2, roughness: 0.85 }),
    roof:   new THREE.MeshStandardMaterial({ color: 0x2c333c, roughness: 0.6, metalness: 0.2 }),
    trim:   new THREE.MeshStandardMaterial({ color: 0x3b424b, roughness: 0.6 }),
    glass:  new THREE.MeshStandardMaterial({ color: 0x9fc0d8, roughness: 0.05, metalness: 0.5, transparent: true, opacity: 0.5, emissive: 0x000000, envMapIntensity: 1.5 }),
    mullion:new THREE.MeshStandardMaterial({ color: 0x2a2e35, roughness: 0.5, metalness: 0.4 }),
    door:   new THREE.MeshStandardMaterial({ color: 0x6a4a2c, roughness: 0.6 }),
    garage: new THREE.MeshStandardMaterial({ color: 0xcfc9bd, roughness: 0.8 }),
    drive:  new THREE.MeshStandardMaterial({ color: 0x8f8b82, roughness: 1 }),
    pool:   new THREE.MeshStandardMaterial({ color: 0x2f9fc4, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.85, emissive: 0x06344a, emissiveIntensity: 0.15 }),
    trunk:  new THREE.MeshStandardMaterial({ color: 0x6d4a2b, roughness: 1 }),
    leaf:   new THREE.MeshStandardMaterial({ color: 0x3c6a33, roughness: 1 })
  };

  var parts = [];
  function reg(mesh, t0, t1, mode, opt) {
    opt = opt || {};
    mesh.userData = { t0: t0, t1: t1, mode: mode, opt: opt };
    mesh.castShadow = (mode !== "fade");
    mesh.receiveShadow = true;
    if (mode === "growY") mesh.scale.y = 0.0001;
    if (mode === "scale") { mesh.userData.fs = mesh.scale.clone(); mesh.scale.setScalar(0.0001); }
    if (mode === "drop") { mesh.userData.fy = mesh.position.y; }
    if (mode === "fade") { mesh.material.transparent = true; mesh.userData.op = (opt.opacity != null ? opt.opacity : mesh.material.opacity); mesh.material.opacity = 0; }
    parts.push(mesh); scene.add(mesh); return mesh;
  }
  var glassMeshes = [], frameParts = [];
  // box whose origin is at its bottom (so growY scales upward from the ground)
  function boxB(w, h, d, mat, x, y, z) {
    var g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0);
    var m = new THREE.Mesh(g, mat.clone()); m.position.set(x, y, z); return m;
  }
  function box(w, h, d, mat, x, y, z) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat.clone()); m.position.set(x, y, z); return m;
  }

  /* ---- ground (always visible) ---- */
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), M.grass);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  // dirt building pad
  reg(new THREE.Mesh(new THREE.PlaneGeometry(15, 12), M.dirt), 0.0, 0.06, "fade", { opacity: 1 })
    .rotation.x = -Math.PI / 2;
  parts[parts.length - 1].position.y = 0.02;

  // blueprint site grid — drawn first, fades out as the slab is poured
  var grid = new THREE.GridHelper(15, 15, 0x74d4e2, 0x2f7f8c);
  grid.position.y = 0.05; grid.material.transparent = true; grid.material.opacity = 0.9;
  scene.add(grid);

  var SLAB_TOP = 0.5;
  /* ---- 01 foundation slab ---- */
  reg(boxB(10, SLAB_TOP, 8, M.slab, 0, 0, 0), 0.06, 0.16, "growY");

  /* ---- 02 framing: columns + beams (later enclosed by the walls) ---- */
  function regFrame(m, t0, t1, mode) { reg(m, t0, t1, mode); m.material.transparent = true; frameParts.push(m); return m; }
  var colXs = [-4.6, -1.5, 1.5, 4.6], colZs = [-3.6, 0, 3.6], FH = 6.2;
  for (var ix = 0; ix < colXs.length; ix++) for (var iz = 0; iz < colZs.length; iz++) {
    regFrame(boxB(0.18, FH, 0.18, M.frame, colXs[ix], SLAB_TOP, colZs[iz]), 0.16 + 0.02 * ix, 0.30 + 0.02 * ix, "growY");
  }
  function ring(y, t0) {
    regFrame(box(9.4, 0.16, 0.16, M.frame, 0, y, 3.6), t0, t0 + 0.06, "fade");
    regFrame(box(9.4, 0.16, 0.16, M.frame, 0, y, -3.6), t0, t0 + 0.06, "fade");
    regFrame(box(0.16, 0.16, 7.4, M.frame, 4.6, y, 0), t0, t0 + 0.06, "fade");
    regFrame(box(0.16, 0.16, 7.4, M.frame, -4.6, y, 0), t0, t0 + 0.06, "fade");
  }
  ring(SLAB_TOP + 3.1, 0.26);
  ring(SLAB_TOP + FH, 0.34);
  // mid floor deck (stays, hidden inside walls)
  reg(box(9, 0.18, 7, M.slab, 0, SLAB_TOP + 3.1, 0), 0.30, 0.38, "fade", { opacity: 1 });

  /* ---- 03 walls (grow up, enclosing the frame) ---- */
  var GF_H = 3.1, UF_H = 2.9;
  reg(boxB(9, GF_H, 7, M.wall, 0, SLAB_TOP, 0), 0.40, 0.52, "growY");            // ground floor
  reg(boxB(8, UF_H, 6, M.wall2, 0.4, SLAB_TOP + GF_H, -0.3), 0.50, 0.62, "growY"); // upper floor (inset)

  /* ---- garage wing ---- */
  reg(boxB(3.6, 2.7, 4.6, M.garage, -3.4, SLAB_TOP, 4.0), 0.44, 0.56, "growY");

  /* ---- 04 roof ---- */
  reg(box(8.6, 0.5, 6.6, M.roof, 0.4, SLAB_TOP + GF_H + UF_H + 0.25, -0.3), 0.60, 0.70, "drop", { });
  reg(box(4.0, 0.35, 5.0, M.roof, -3.4, SLAB_TOP + 2.7 + 0.18, 4.0), 0.58, 0.68, "drop", {});
  // ground-floor roof ledge over the setback
  reg(box(9.2, 0.35, 7.2, M.trim, 0, SLAB_TOP + GF_H + 0.05, 0), 0.56, 0.66, "drop", {});

  /* ---- 05 framed glass + doors ---- */
  var frontZ = 3.55, sideX = 4.55;
  // framed window: dark surround + glass + mullion bars
  function addWin(w, h, x, y, z, face, t0, t1) {
    if (face === "front") {
      reg(box(w + 0.18, h + 0.18, 0.05, M.mullion, x, y, z - 0.03), t0, t1, "fade", { opacity: 1 });
      reg(box(w, h, 0.08, M.glass, x, y, z), t0 + 0.01, t1 + 0.01, "fade", { opacity: 0.5 });
      reg(box(0.05, h, 0.11, M.mullion, x, y, z + 0.01), t0 + 0.02, t1 + 0.02, "fade", { opacity: 1 });
      reg(box(w, 0.05, 0.11, M.mullion, x, y, z + 0.01), t0 + 0.02, t1 + 0.02, "fade", { opacity: 1 });
    } else {
      reg(box(0.05, h + 0.18, w + 0.18, M.mullion, x + 0.03, y, z), t0, t1, "fade", { opacity: 1 });
      reg(box(0.08, h, w, M.glass, x, y, z), t0 + 0.01, t1 + 0.01, "fade", { opacity: 0.5 });
      reg(box(0.11, h, 0.05, M.mullion, x - 0.01, y, z), t0 + 0.02, t1 + 0.02, "fade", { opacity: 1 });
      reg(box(0.11, 0.05, w, M.mullion, x - 0.01, y, z), t0 + 0.02, t1 + 0.02, "fade", { opacity: 1 });
    }
  }
  addWin(3.4, 2.2, 1.4, SLAB_TOP + 1.4, frontZ, "front", 0.70, 0.80);
  addWin(1.6, 2.2, -1.7, SLAB_TOP + 1.4, frontZ, "front", 0.71, 0.81);
  addWin(1.4, 1.6, -1.9, SLAB_TOP + GF_H + 1.5, frontZ - 0.3, "front", 0.74, 0.84);
  addWin(1.4, 1.6, 0.5, SLAB_TOP + GF_H + 1.5, frontZ - 0.3, "front", 0.75, 0.85);
  addWin(1.4, 1.6, 2.7, SLAB_TOP + GF_H + 1.5, frontZ - 0.3, "front", 0.76, 0.86);
  addWin(3.2, 2.0, sideX, SLAB_TOP + 1.4, -0.6, "side", 0.74, 0.84);
  addWin(3.0, 1.5, sideX - 0.05, SLAB_TOP + GF_H + 1.4, -0.9, "side", 0.78, 0.88);
  // entry door
  reg(box(1.0, 2.3, 0.14, M.door, -0.3, SLAB_TOP + 1.15, frontZ + 0.02), 0.72, 0.8, "fade", { opacity: 1 });
  // garage door
  reg(box(2.8, 2.1, 0.1, M.trim, -3.4, SLAB_TOP + 1.05, 4.0 + 2.3 + 0.02), 0.72, 0.82, "fade", { opacity: 1 });

  /* ---- balcony railing + rooftop unit (detail) ---- */
  var ry = SLAB_TOP + GF_H + 0.15;
  reg(box(8.4, 0.85, 0.03, M.glass, 0.2, ry + 0.45, 3.42), 0.67, 0.76, "fade", { opacity: 0.4 });
  reg(box(8.6, 0.08, 0.08, M.mullion, 0.2, ry + 0.9, 3.42), 0.66, 0.74, "fade", { opacity: 1 });
  for (var rp = -3.6; rp <= 4; rp += 1.2) reg(box(0.06, 0.9, 0.06, M.mullion, rp, ry, 3.42), 0.66, 0.74, "fade", { opacity: 1 });
  reg(box(1.7, 0.7, 1.3, M.trim, 1.6, SLAB_TOP + GF_H + UF_H + 0.55, -1.6), 0.68, 0.77, "drop", {});

  /* ---- 06 landscaping ---- */
  // driveway
  reg(box(3.2, 0.06, 7.5, M.drive, -3.4, 0.04, 8.2), 0.80, 0.9, "fade", { opacity: 1 });
  // walkway
  reg(box(1.4, 0.06, 4.5, M.drive, -0.3, 0.05, 7.0), 0.82, 0.9, "fade", { opacity: 1 });
  // pool
  reg(box(6.2, 0.4, 3.4, M.pool, 3.0, 0.2, 7.2), 0.84, 0.94, "scale");
  reg(box(7.2, 0.12, 4.4, M.slab, 3.0, 0.06, 7.2), 0.82, 0.9, "fade", { opacity: 1 });
  // trees
  function tree(x, z, s) {
    var g = new THREE.Group();
    var tr = box(0.4 * s, 2.2 * s, 0.4 * s, M.trunk, 0, 1.1 * s, 0); g.add(tr);
    var f1 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5 * s, 0), M.leaf); f1.position.y = 2.8 * s; g.add(f1);
    var f2 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1 * s, 0), M.leaf); f2.position.set(0.6 * s, 3.6 * s, 0.3 * s); g.add(f2);
    g.position.set(x, 0, z);
    g.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  }
  reg(tree(-7.5, 6.5, 1.1), 0.84, 0.94, "scale");
  reg(tree(8.0, 4.0, 0.9), 0.86, 0.96, "scale");
  reg(tree(-8.5, -2.0, 1.0), 0.85, 0.95, "scale");
  // shrubs along the front
  for (var s = 0; s < 6; s++) {
    var sh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), M.leaf);
    sh.position.set(-4.2 + s * 1.5, 0.4, frontZ + 0.9); sh.castShadow = true;
    reg(sh, 0.86 + s * 0.008, 0.95 + s * 0.008, "scale");
  }

  /* ---- crane (present during framing, then leaves) ---- */
  var crane = new THREE.Group();
  crane.add(box(0.3, 13, 0.3, M.frame, 0, 6.5, 0));
  crane.add(box(11, 0.3, 0.3, M.frame, 2.5, 12.6, 0));
  crane.add(box(0.1, 2.2, 0.1, M.frame, 6.5, 11.4, 0));
  crane.add(box(0.5, 0.4, 0.5, M.frame, 6.5, 10.2, 0));
  crane.position.set(8.5, 0, -4.5);
  crane.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.material = o.material.clone(); o.material.transparent = true; } });
  scene.add(crane);

  // collect glass panels (for warm night lighting)
  parts.forEach(function (m) { if (m.material && m.material.color && m.material.color.getHex() === 0x9fc0d8) glassMeshes.push(m); });

  /* ---- per-part update ---- */
  function applyPart(m, p) {
    var u = m.userData, e = easeOut(clamp((p - u.t0) / (u.t1 - u.t0), 0, 1));
    if (u.mode === "growY") { m.scale.y = Math.max(0.0001, e); m.visible = e > 0.002; }
    else if (u.mode === "scale") { var s = Math.max(0.0001, e); m.scale.set(u.fs.x * s, u.fs.y * s, u.fs.z * s); m.visible = e > 0.002; }
    else if (u.mode === "drop") { m.position.y = u.fy + (1 - e) * 7; m.visible = e > 0.002; m.material.transparent = true; m.material.opacity = clamp(e * 1.5, 0, 1); }
    else if (u.mode === "fade") { m.material.opacity = e * u.op; m.visible = e > 0.002; }
  }

  var target = new THREE.Vector3(0, 3.2, 0);
  function setCamera(p) {
    var az = lerp(-0.62, 0.34, easeInOut(p));
    var rad = lerp(30, 23, p), hgt = lerp(7.5, 12, easeInOut(p));
    camera.position.set(Math.sin(az) * rad, hgt, Math.cos(az) * rad);
    camera.lookAt(target);
  }

  function setProgress(p) {
    p = clamp(p, 0, 1);
    for (var i = 0; i < parts.length; i++) applyPart(parts[i], p);
    // framing gets clad/enclosed by the walls (fade out 0.52 -> 0.64)
    var fo = clamp(1 - (p - 0.52) / 0.12, 0, 1);
    for (var k = 0; k < frameParts.length; k++) {
      var fm = frameParts[k];
      fm.material.opacity = (fm.userData.mode === "fade" ? fm.material.opacity : 1) * fo;
      if (fm.material.opacity < 0.02) fm.visible = false;
    }
    // crane fades in (0.16-0.26) then leaves (0.62-0.72)
    var cop = clamp((p - 0.16) / 0.1, 0, 1) * clamp(1 - (p - 0.62) / 0.1, 0, 1);
    crane.visible = cop > 0.01;
    crane.traverse(function (o) { if (o.isMesh) o.material.opacity = cop; });
    // blueprint grid fades as the slab is poured
    var go = clamp(1 - (p - 0.04) / 0.16, 0, 1) * 0.9;
    grid.material.opacity = go; grid.visible = go > 0.01;
    // golden hour + warm window lights toward the end
    var e2 = clamp((p - 0.84) / 0.16, 0, 1);
    sun.position.set(lerp(9, 3.5, e2), lerp(15, 5.5, e2), lerp(7, 9, e2));
    sun.color.setHSL(lerp(0.12, 0.07, e2), 0.55, lerp(0.92, 0.72, e2));
    sun.intensity = lerp(1.15, 0.9, e2);
    hemi.intensity = lerp(0.62, 0.4, e2);
    for (var g = 0; g < glassMeshes.length; g++) {
      glassMeshes[g].material.emissive.setHex(0xffb457);
      glassMeshes[g].material.emissiveIntensity = e2 * 1.2;
    }
    // dusk backdrop + stars
    stars.material.opacity = e2 * 0.9; stars.visible = e2 > 0.02;
    var wantDusk = e2 > 0.45;
    if (wantDusk !== duskOn) { duskOn = wantDusk; scene.background = duskOn ? skyDusk : skyDay; scene.environment = duskOn ? skyDusk : skyDay; }
    scene.fog.color.setHex(duskOn ? 0x3a3350 : 0xcfdae0);
    renderer.toneMappingExposure = lerp(1.06, 1.16, e2);
    setCamera(p);
    renderer.render(scene, camera);
  }
  var duskOn = false;

  function resize() {
    var w = canvas.clientWidth || canvas.offsetWidth, h = canvas.clientHeight || canvas.offsetHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    setProgress(lastP);
  }
  var lastP = 0;
  window.__dk3SetBuild = function (p) { lastP = p; setProgress(p); };

  // mark section as 3D-enabled (hides the fallback image)
  var section = document.querySelector(".xform");
  if (section) section.setAttribute("data-3d", "on");

  window.addEventListener("resize", resize);
  // a couple of delayed resizes to catch late layout/font shifts
  resize();
  setTimeout(resize, 300);
  window.addEventListener("load", function () { setTimeout(resize, 200); });
  setProgress(reduce ? 1 : 0);
})();
