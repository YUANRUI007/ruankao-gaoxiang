/* ============================================================
   hero3d.js · Three.js 3D Hero（粒子星域 + 线框几何体 + 视差）
   渐进增强：WebGL 不可用 / 减少动画偏好 → 静默退出，静态光斑兜底
   ============================================================ */
(function () {
  "use strict";
  if (typeof THREE === "undefined") return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var hero = document.querySelector(".hero");
  var canvas = document.getElementById("hero3d");
  if (!hero || !canvas) return;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 16);

  /* 圆形粒子贴图 */
  function dotTexture() {
    var c = document.createElement("canvas");
    c.width = c.height = 64;
    var ctx = c.getContext("2d");
    var g = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.4, "rgba(255,255,255,.55)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  /* 粒子星域 */
  var N = 700;
  var pos = new Float32Array(N * 3);
  var col = new Float32Array(N * 3);
  var palette = [[0.55, 0.5, 1], [0.45, 0.85, 1], [1, 0.85, 0.45], [0.95, 0.45, 0.75]];
  for (var i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 46;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 26;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 24;
    var pc = palette[(Math.random() * palette.length) | 0];
    col[i * 3] = pc[0]; col[i * 3 + 1] = pc[1]; col[i * 3 + 2] = pc[2];
  }
  var pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  pGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  var pMat = new THREE.PointsMaterial({
    size: 0.22, map: dotTexture(), transparent: true, opacity: 0.8,
    vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false
  });
  scene.add(new THREE.Points(pGeo, pMat));

  /* 线框几何体 */
  var solids = [];
  function addSolid(kind, x, y, z, color, rs) {
    var geo;
    if (kind === "ico") geo = new THREE.IcosahedronGeometry(2.4, 0);
    else if (kind === "knot") geo = new THREE.TorusKnotGeometry(1.6, 0.45, 80, 12);
    else geo = new THREE.OctahedronGeometry(2.2, 0);
    var mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: color, wireframe: true, transparent: true, opacity: 0.22
    }));
    mesh.position.set(x, y, z);
    mesh.userData.rs = rs;
    scene.add(mesh);
    solids.push(mesh);
  }
  addSolid("ico", -9, 3.2, -4, 0x8b5cf6, 0.0035);
  addSolid("knot", 10, -3, -6, 0x22d3ee, 0.0028);
  addSolid("oct", 6, 4.5, -9, 0xfbbf24, 0.004);
  addSolid("oct", -12, -4, -8, 0xf472b6, 0.0032);

  /* 鼠标视差 */
  var tx = 0, ty = 0, cx = 0, cy = 0;
  window.addEventListener("pointermove", function (e) {
    tx = (e.clientX / window.innerWidth - 0.5) * 2;
    ty = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  function resize() {
    var w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  /* 可见性省电 */
  var visible = true;
  var t0 = performance.now();
  document.addEventListener("visibilitychange", function () {
    visible = !document.hidden;
  });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) {
      visible = en[0].isIntersecting && !document.hidden;
    }, { threshold: 0 }).observe(hero);
  }

  function loop(now) {
    requestAnimationFrame(loop);
    if (!visible) return;
    var t = (now - t0) / 1000;
    cx += (tx - cx) * 0.04;
    cy += (ty - cy) * 0.04;
    camera.position.x = cx * 2.2;
    camera.position.y = -cy * 1.6;
    camera.lookAt(0, 0, 0);
    solids.forEach(function (m) {
      m.rotation.x += m.userData.rs;
      m.rotation.y += m.userData.rs * 1.3;
      m.position.y += Math.sin(t * 0.6 + m.position.x) * 0.002;
    });
    renderer.render(scene, camera);
  }
  requestAnimationFrame(loop);
})();
