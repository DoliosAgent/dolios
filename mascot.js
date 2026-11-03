// Dolios mascot: a procedural three.js robot with a spectrum-bezel screen face and Hermes-style
// winged ear pods. Head, eyes and body follow the cursor; the face swaps expressions on demand.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const SPECTRUM_VERT = /* glsl */`
  varying vec2 vPos; varying vec3 vNormal; varying vec3 vView;
  void main() {
    vPos = position.xy;
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;
const SPECTRUM_FRAG = /* glsl */`
  uniform float uTime; uniform float uBoost;
  varying vec2 vPos; varying vec3 vNormal; varying vec3 vView;
  vec3 hsv2rgb(vec3 c){ vec3 p = abs(fract(c.xxx + vec3(0.,2./3.,1./3.))*6.-3.); return c.z*mix(vec3(1.), clamp(p-1.,0.,1.), c.y); }
  void main() {
    float a = atan(vPos.y, vPos.x) / 6.28318 + 0.5;
    float hue = fract(a * 0.92 + uTime * 0.04 + 0.47);
    vec3 col = hsv2rgb(vec3(hue, 0.72, 1.0));
    float light = 0.55 + 0.45 * max(dot(vNormal, normalize(vec3(0.4, 0.7, 0.8))), 0.0);
    float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.0);
    gl_FragColor = vec4(col * light * (1.0 + uBoost) + fres * 0.35, 1.0);
  }`;

function roundedRectShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function planarUV(geo) {
  geo.computeBoundingBox();
  const b = geo.boundingBox, pos = geo.attributes.position, uv = [];
  for (let i = 0; i < pos.count; i++) {
    uv.push((pos.getX(i) - b.min.x) / (b.max.x - b.min.x), (pos.getY(i) - b.min.y) / (b.max.y - b.min.y));
  }
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return geo;
}

function wingShape() {
  // Three swept feathers, root at origin, pointing toward +x / +y.
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.25, 0.32, 0.62, 0.62, 1.05, 0.78);
  s.bezierCurveTo(0.92, 0.6, 0.86, 0.52, 0.8, 0.46);
  s.bezierCurveTo(0.98, 0.5, 1.1, 0.5, 1.2, 0.46);
  s.bezierCurveTo(1.0, 0.33, 0.9, 0.27, 0.8, 0.22);
  s.bezierCurveTo(0.95, 0.2, 1.05, 0.16, 1.12, 0.08);
  s.bezierCurveTo(0.8, 0.02, 0.45, -0.08, 0.2, -0.18);
  s.quadraticCurveTo(0.02, -0.18, 0, 0);
  return s;
}

const EXPRESSIONS = new Set(['eyes', 'happy', 'diamond', 'dollar', 'quote', 'scan', 'wink', 'alert']);

export function createMascot(canvas, { reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, 0.35, 10.5);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x14161c, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.8); key.position.set(3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0x67e8f9, 1.6); rim.position.set(-4, 2.5, -3); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0xf472b6, 1.0); rim2.position.set(4, 1, -3); scene.add(rim2);

  const shell = new THREE.MeshStandardMaterial({ color: 0xd9d4cb, roughness: 0.5, metalness: 0.05, envMapIntensity: 0.7 });
  const shellLight = new THREE.MeshStandardMaterial({ color: 0xf1eee8, roughness: 0.45, metalness: 0.0, envMapIntensity: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1c21, roughness: 0.35, metalness: 0.3, envMapIntensity: 1.0 });
  const spectrum = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uBoost: { value: 0 } },
    vertexShader: SPECTRUM_VERT, fragmentShader: SPECTRUM_FRAG,
  });

  // ---- face canvas -------------------------------------------------------------------------
  const faceCanvas = document.createElement('canvas');
  faceCanvas.width = faceCanvas.height = 512;
  const fx = faceCanvas.getContext('2d');
  const faceTex = new THREE.CanvasTexture(faceCanvas);
  faceTex.colorSpace = THREE.SRGBColorSpace;
  faceTex.anisotropy = 4;

  const root = new THREE.Group();
  scene.add(root);

  // ---- head ----------------------------------------------------------------------------------
  const head = new THREE.Group();
  head.position.y = 0.32;
  root.add(head);
  const skull = new THREE.Mesh(new RoundedBoxGeometry(2.3, 2.05, 1.9, 6, 0.42), shell);
  skull.position.y = 1.05;
  head.add(skull);
  // back cap gives the head a two-tone silhouette
  const cap = new THREE.Mesh(new RoundedBoxGeometry(2.12, 1.86, 0.7, 5, 0.3), dark);
  cap.position.set(0, 1.07, -0.72);
  head.add(cap);

  const bezelGeo = new THREE.ExtrudeGeometry(
    (() => { const o = roundedRectShape(1.86, 1.64, 0.38); o.holes.push(roundedRectShape(1.44, 1.24, 0.22)); return o; })(),
    { depth: 0.16, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 4, curveSegments: 24 });
  const bezel = new THREE.Mesh(bezelGeo, spectrum);
  bezel.position.set(0, 1.05, 0.86);
  head.add(bezel);

  const screen = new THREE.Mesh(planarUV(new THREE.ShapeGeometry(roundedRectShape(1.46, 1.26, 0.22), 24)),
    new THREE.MeshBasicMaterial({ map: faceTex, toneMapped: false }));
  screen.position.set(0, 1.05, 0.985);
  head.add(screen);
  const glass = new THREE.Mesh(new THREE.ShapeGeometry(roundedRectShape(1.46, 1.26, 0.22), 24),
    new THREE.MeshPhysicalMaterial({ color: 0x0b0d12, transparent: true, opacity: 0.08, roughness: 0.08,
      metalness: 0, clearcoat: 1, envMapIntensity: 0.5, depthWrite: false }));
  glass.position.set(0, 1.05, 1.0);
  head.add(glass);

  // ear pods + winged petasos fins
  const wings = [];
  for (const side of [-1, 1]) {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.26, 32), dark);
    pod.rotation.z = Math.PI / 2;
    pod.position.set(side * 1.2, 1.0, -0.05);
    head.add(pod);
    const podCap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 32), shell);
    podCap.rotation.z = Math.PI / 2;
    podCap.position.set(side * 1.35, 1.0, -0.05);
    head.add(podCap);

    const pivot = new THREE.Group();
    pivot.position.set(side * 1.3, 1.18, -0.12);
    pivot.rotation.set(0, side * -0.55, side * 0.42);
    const wing = new THREE.Mesh(new THREE.ExtrudeGeometry(wingShape(),
      { depth: 0.05, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 3, curveSegments: 18 }),
      shellLight);
    wing.scale.set(side * 0.95, 0.95, 1);
    wing.position.z = -0.03;
    pivot.add(wing);
    head.add(pivot);
    wings.push({ pivot, side, base: pivot.rotation.z });
  }

  // ---- body ----------------------------------------------------------------------------------
  const body = new THREE.Group();
  root.add(body);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.42, 32), dark);
  neck.position.y = 0.18;
  body.add(neck);
  const torso = new THREE.Mesh(new RoundedBoxGeometry(1.7, 1.45, 1.2, 6, 0.36), shell);
  torso.position.y = -0.75;
  body.add(torso);
  const emblem = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), spectrum);
  emblem.scale.set(1, 1.25, 0.35);
  emblem.position.set(0, -0.62, 0.62);
  body.add(emblem);
  const ledColors = [0x22d3ee, 0x34d399, 0xf43f5e];
  ledColors.forEach((c, i) => {
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 16),
      new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));
    led.position.set(0.42 + i * 0.13, -0.2, 0.6);
    body.add(led);
  });
  const belt = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.22, 1.08, 4, 0.1), dark);
  belt.position.y = -1.43;
  body.add(belt);

  const arms = [];
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.98, -0.32, 0);
    const joint = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 24), dark);
    shoulder.add(joint);
    const upper = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.9, 0.38, 4, 0.16), shell);
    upper.position.y = -0.55;
    shoulder.add(upper);
    const hand = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.3, 0.32, 4, 0.12), dark);
    hand.position.y = -1.08;
    shoulder.add(hand);
    shoulder.rotation.z = side * 0.12;
    body.add(shoulder);
    arms.push({ shoulder, side });
  }

  // ---- glow disc under the robot ---------------------------------------------------------------
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = glowCanvas.height = 256;
  const g = glowCanvas.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(120,220,255,0.55)'); grad.addColorStop(0.4, 'rgba(140,120,255,0.18)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(glowCanvas), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = -2.1;
  root.add(glow);

  root.position.y = -0.15;

  // ---- face drawing ------------------------------------------------------------------------------
  const state = {
    expr: 'eyes', exprUntil: 0, base: 'eyes', blink: 0, nextBlink: 1.5,
    look: new THREE.Vector2(), target: new THREE.Vector2(), excite: 0, t: 0,
  };

  function rr(x, y, w, h, r) {
    fx.beginPath(); fx.moveTo(x + r, y); fx.arcTo(x + w, y, x + w, y + h, r); fx.arcTo(x + w, y + h, x, y + h, r);
    fx.arcTo(x, y + h, x, y, r); fx.arcTo(x, y, x + w, y, r); fx.closePath();
  }

  function drawFace() {
    const W = 512, t = state.t;
    fx.globalCompositeOperation = 'source-over';
    const bg = fx.createRadialGradient(W / 2, W / 2, 40, W / 2, W / 2, 360);
    bg.addColorStop(0, '#11151b'); bg.addColorStop(1, '#05070a');
    fx.fillStyle = bg; fx.fillRect(0, 0, W, W);
    fx.strokeStyle = 'rgba(160,190,220,0.07)'; fx.lineWidth = 2;
    for (let i = 32; i < W; i += 48) {
      fx.beginPath(); fx.moveTo(i, 0); fx.lineTo(i, W); fx.stroke();
      fx.beginPath(); fx.moveTo(0, i); fx.lineTo(W, i); fx.stroke();
    }
    const lx = state.look.x * 34, ly = -state.look.y * 26;
    const cx = W / 2 + lx, cy = W / 2 + ly;
    fx.save();
    fx.shadowColor = 'rgba(255,255,255,0.85)'; fx.shadowBlur = 28;
    fx.fillStyle = '#ffffff'; fx.strokeStyle = '#ffffff';
    const e = state.expr;
    if (e === 'eyes' || e === 'wink' || e === 'scan' || e === 'alert') {
      const open = Math.max(0.08, 1 - state.blink);
      for (const s of [-1, 1]) {
        const h = (e === 'alert' ? 112 : 96) * (e === 'wink' && s === 1 ? 0.12 : open);
        const w = e === 'alert' ? 62 : 70;
        rr(cx + s * 88 - w / 2, cy - h / 2, w, h, Math.min(30, h / 2)); fx.fill();
      }
      if (e === 'scan') {
        const y = W * 0.18 + ((t * 220) % (W * 0.64));
        fx.shadowColor = 'rgba(52,211,153,0.9)'; fx.fillStyle = 'rgba(52,211,153,0.85)';
        fx.fillRect(40, y, W - 80, 5);
      }
    } else if (e === 'happy') {
      fx.lineWidth = 22; fx.lineCap = 'round';
      for (const s of [-1, 1]) { fx.beginPath(); fx.arc(cx + s * 88, cy + 18, 40, Math.PI * 1.1, Math.PI * 1.9); fx.stroke(); }
    } else if (e === 'diamond') {
      const r = 92 + Math.sin(t * 3) * 6;
      const dg = fx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      ['#22d3ee', '#34d399', '#facc15', '#fb923c', '#f43f5e', '#a78bfa'].forEach((c, i) => dg.addColorStop(i / 5, c));
      fx.fillStyle = dg; fx.shadowColor = 'rgba(167,139,250,0.8)';
      fx.beginPath(); fx.moveTo(cx, cy - r * 1.15); fx.lineTo(cx + r * 0.8, cy); fx.lineTo(cx, cy + r * 1.15);
      fx.lineTo(cx - r * 0.8, cy); fx.closePath(); fx.fill();
    } else if (e === 'dollar') {
      fx.font = '800 150px "Space Grotesk", system-ui, sans-serif'; fx.textAlign = 'center'; fx.textBaseline = 'middle';
      fx.fillStyle = '#34d399'; fx.shadowColor = 'rgba(52,211,153,0.95)';
      for (const s of [-1, 1]) fx.fillText('$', cx + s * 88, cy + 6);
    } else if (e === 'quote') {
      fx.font = '800 300px Georgia, serif'; fx.textAlign = 'center'; fx.textBaseline = 'middle';
      fx.fillText('“', cx, cy + 70);
    }
    fx.restore();
    // scanlines
    fx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let y = 0; y < W; y += 4) fx.fillRect(0, y, W, 1);
    faceTex.needsUpdate = true;
  }

  // ---- input -----------------------------------------------------------------------------------
  function onPointer(e) {
    const r = canvas.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height * 0.42;
    state.target.set(
      THREE.MathUtils.clamp((e.clientX - cx) / (window.innerWidth * 0.5), -1, 1),
      THREE.MathUtils.clamp(-(e.clientY - cy) / (window.innerHeight * 0.5), -1, 1));
    state.idleSince = state.t;
  }
  window.addEventListener('pointermove', onPointer, { passive: true });
  canvas.addEventListener('pointerdown', () => { react('happy', 1400); state.excite = 1; });

  function setExpression(name) {
    if (!EXPRESSIONS.has(name)) return;
    state.base = name;
    if (state.t > state.exprUntil) state.expr = name;
  }
  function react(name, ms = 1200) {
    if (!EXPRESSIONS.has(name)) return;
    state.expr = name; state.exprUntil = state.t + ms / 1000;
  }

  // ---- loop ------------------------------------------------------------------------------------
  const clock = new THREE.Clock();
  let running = true, raf = 0;
  const amp = reducedMotion ? 0.35 : 1;

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the whole robot in frame on narrow screens
    camera.position.z = w / h < 0.8 ? 14.5 : 12.4;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  function frame() {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    state.t += dt;
    const t = state.t;

    // idle look-around when the pointer has been still (or on touch devices)
    if (state.idleSince === undefined || t - state.idleSince > 4) {
      state.target.set(Math.sin(t * 0.5) * 0.45, Math.sin(t * 0.33) * 0.2);
    }
    state.look.lerp(state.target, 1 - Math.pow(0.0015, dt));

    head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, state.look.x * 0.6 * amp, 1 - Math.pow(0.002, dt));
    head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, -state.look.y * 0.32 * amp, 1 - Math.pow(0.002, dt));
    head.rotation.z = THREE.MathUtils.lerp(head.rotation.z, -state.look.x * 0.06 * amp, 1 - Math.pow(0.01, dt));
    body.rotation.y = THREE.MathUtils.lerp(body.rotation.y, state.look.x * 0.22 * amp, 1 - Math.pow(0.01, dt));
    root.position.y = -0.15 + Math.sin(t * 1.3) * 0.07 * amp;

    state.excite = Math.max(0, state.excite - dt * 0.8);
    const flap = Math.sin(t * (3 + state.excite * 14)) * (0.05 + state.excite * 0.35) * amp;
    for (const w of wings) w.pivot.rotation.z = w.base + w.side * flap;
    for (const a of arms) a.shoulder.rotation.x = Math.sin(t * 1.3 + a.side) * 0.08 * amp;

    state.nextBlink -= dt;
    if (state.nextBlink <= 0) { state.blink = 1; state.nextBlink = 2.5 + Math.random() * 3.5; }
    state.blink = Math.max(0, state.blink - dt * 7);
    if (t > state.exprUntil && state.expr !== state.base) state.expr = state.base;

    spectrum.uniforms.uTime.value = t;
    spectrum.uniforms.uBoost.value = state.excite * 0.6;
    drawFace();
    renderer.render(scene, camera);
  }

  new IntersectionObserver(([entry]) => {
    const vis = entry.isIntersecting;
    if (vis && !running) { running = true; clock.getDelta(); frame(); }
    if (!vis) { running = false; cancelAnimationFrame(raf); }
  }).observe(canvas);
  frame();

  return { setExpression, react, excite: () => { state.excite = 1; } };
}
