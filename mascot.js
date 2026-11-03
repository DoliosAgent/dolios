// Dolios mascot v2 — procedural three.js robot: spectrum-bezel screen face, Hermes-style wings,
// bobbing antenna. Follows the cursor, can be petted (rub the head), clicked (part-specific
// reactions), dragged to spin, falls asleep when ignored. Camera framings: full / close / buddy.
// `manual: true` disables the RAF loop so a recorder can step time deterministically.
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
    float hue = fract(a * 0.92 + uTime * (0.04 + uBoost * 0.25) + 0.47);
    vec3 col = hsv2rgb(vec3(hue, 0.72, 1.0));
    float light = 0.55 + 0.45 * max(dot(vNormal, normalize(vec3(0.4, 0.7, 0.8))), 0.0);
    float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.0);
    gl_FragColor = vec4(col * light * (1.0 + uBoost * 0.7) + fres * 0.35, 1.0);
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
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const ease = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const clamp01 = (x) => Math.min(1, Math.max(0, x));

export const EXPRESSIONS = ['eyes', 'happy', 'wink', 'love', 'star', 'sleepy', 'dizzy', 'surprised',
  'dollar', 'diamond', 'quote', 'scan', 'alert', 'curious'];

const FRAMINGS = {
  full: { pos: [0, 0.35, 12.4], look: [0, 0.35, 0] },
  close: { pos: [0, 1.5, 12], look: [0, 1.8, 0] },
  buddy: { pos: [0, 0.55, 10.2], look: [0, 0.45, 0] },
};

export function createMascot(canvas, { reducedMotion = false, manual = false, fullscreen = false, onReact = () => {} } = {}) {
  const rand = manual ? mulberry32(7) : Math.random;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance',
    preserveDrawingBuffer: manual });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, manual ? 1 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  const camPos = new THREE.Vector3(...FRAMINGS.full.pos), camLook = new THREE.Vector3(...FRAMINGS.full.look);
  const camPosT = camPos.clone(), camLookT = camLook.clone();

  scene.add(new THREE.HemisphereLight(0xffffff, 0x14161c, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.8); key.position.set(3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0x67e8f9, 1.6); rim.position.set(-4, 2.5, -3); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0xf472b6, 1.0); rim2.position.set(4, 1, -3); scene.add(rim2);

  const shell = new THREE.MeshStandardMaterial({ color: 0xd9d4cb, roughness: 0.5, metalness: 0.05, envMapIntensity: 0.7 });
  const shellLight = new THREE.MeshStandardMaterial({ color: 0xf1eee8, roughness: 0.45, envMapIntensity: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1c21, roughness: 0.35, metalness: 0.3 });
  const spectrum = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uBoost: { value: 0 } },
    vertexShader: SPECTRUM_VERT, fragmentShader: SPECTRUM_FRAG });

  const faceCanvas = document.createElement('canvas');
  faceCanvas.width = faceCanvas.height = 512;
  const fx = faceCanvas.getContext('2d');
  const faceTex = new THREE.CanvasTexture(faceCanvas);
  faceTex.colorSpace = THREE.SRGBColorSpace;
  faceTex.anisotropy = 4;

  const hittables = [];
  const tag = (mesh, part) => { mesh.userData.part = part; hittables.push(mesh); return mesh; };

  // ---- rig -------------------------------------------------------------------------------------
  const root = new THREE.Group(); scene.add(root);          // position/jump
  const spinner = new THREE.Group(); root.add(spinner);     // spin + drag yaw
  const squash = new THREE.Group(); spinner.add(squash);    // squash & stretch

  const head = new THREE.Group(); head.position.y = 0.32; squash.add(head);
  const skull = tag(new THREE.Mesh(new RoundedBoxGeometry(2.3, 2.05, 1.9, 6, 0.42), shell), 'head');
  skull.position.y = 1.05; head.add(skull);
  const cap = tag(new THREE.Mesh(new RoundedBoxGeometry(2.12, 1.86, 0.7, 5, 0.3), dark), 'head');
  cap.position.set(0, 1.07, -0.72); head.add(cap);
  const bezel = tag(new THREE.Mesh(new THREE.ExtrudeGeometry(
    (() => { const o = roundedRectShape(1.86, 1.64, 0.38); o.holes.push(roundedRectShape(1.44, 1.24, 0.22)); return o; })(),
    { depth: 0.16, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 4, curveSegments: 24 }),
  spectrum), 'face');
  bezel.position.set(0, 1.05, 0.86); head.add(bezel);
  const screen = tag(new THREE.Mesh(planarUV(new THREE.ShapeGeometry(roundedRectShape(1.46, 1.26, 0.22), 24)),
    new THREE.MeshBasicMaterial({ map: faceTex, toneMapped: false })), 'face');
  screen.position.set(0, 1.05, 0.985); head.add(screen);
  const glass = new THREE.Mesh(new THREE.ShapeGeometry(roundedRectShape(1.46, 1.26, 0.22), 24),
    new THREE.MeshPhysicalMaterial({ color: 0x0b0d12, transparent: true, opacity: 0.08, roughness: 0.08,
      clearcoat: 1, envMapIntensity: 0.5, depthWrite: false }));
  glass.position.set(0, 1.05, 1.0); head.add(glass);

  // antenna on a spring
  const antenna = new THREE.Group(); antenna.position.set(0.55, 2.05, -0.1); head.add(antenna);
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.5, 12), dark); stalk.position.y = 0.25; antenna.add(stalk);
  const bulb = tag(new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 24), spectrum), 'antenna'); bulb.position.y = 0.55; antenna.add(bulb);

  const wings = [];
  for (const side of [-1, 1]) {
    const pod = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.26, 32), dark), 'head');
    pod.rotation.z = Math.PI / 2; pod.position.set(side * 1.2, 1.0, -0.05); head.add(pod);
    const podCap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 32), shell);
    podCap.rotation.z = Math.PI / 2; podCap.position.set(side * 1.35, 1.0, -0.05); head.add(podCap);
    const pivot = new THREE.Group();
    pivot.position.set(side * 1.3, 1.18, -0.12);
    pivot.rotation.set(0, side * -0.55, side * 0.42);
    const wing = tag(new THREE.Mesh(new THREE.ExtrudeGeometry(wingShape(),
      { depth: 0.05, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 3, curveSegments: 18 }),
    shellLight), 'wing');
    wing.scale.set(side * 0.95, 0.95, 1); wing.position.z = -0.03;
    pivot.add(wing); head.add(pivot);
    wings.push({ pivot, side, base: pivot.rotation.z });
  }

  const body = new THREE.Group(); squash.add(body);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.42, 32), dark); neck.position.y = 0.18; body.add(neck);
  const torso = tag(new THREE.Mesh(new RoundedBoxGeometry(1.7, 1.45, 1.2, 6, 0.36), shell), 'body');
  torso.position.y = -0.75; body.add(torso);
  const emblem = tag(new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), spectrum), 'emblem');
  emblem.scale.set(1, 1.25, 0.35); emblem.position.set(0, -0.62, 0.62); body.add(emblem);
  const leds = [0x22d3ee, 0x34d399, 0xf43f5e].map((c, i) => {
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 16), new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));
    led.position.set(0.42 + i * 0.13, -0.2, 0.6); body.add(led); return led;
  });
  const belt = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.22, 1.08, 4, 0.1), dark); belt.position.y = -1.43; body.add(belt);
  const arms = [];
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group(); shoulder.position.set(side * 0.98, -0.32, 0);
    shoulder.add(new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 24), dark));
    const upper = tag(new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.9, 0.38, 4, 0.16), shell), 'body'); upper.position.y = -0.55; shoulder.add(upper);
    const hand = tag(new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.3, 0.32, 4, 0.12), dark), 'body'); hand.position.y = -1.08; shoulder.add(hand);
    body.add(shoulder);
    arms.push({ shoulder, side });
  }

  const glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 256;
  const g = glowCanvas.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(120,220,255,0.55)'); grad.addColorStop(0.4, 'rgba(140,120,255,0.18)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(glowCanvas), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = -2.25; scene.add(glow);

  // ---- state -----------------------------------------------------------------------------------
  const S = {
    t: 0, mode: 'full', base: 'eyes', expr: 'eyes', exprUntil: 0, blush: 0, talk: 0,
    blink: 0, nextBlink: 1.5, look: new THREE.Vector2(), target: new THREE.Vector2(),
    lastInput: 0, asleep: false, excite: 0, pet: 0, clicks: [], anims: [], blend: null,
    rect: null, rectT: null, lean: 0, leanT: 0, saccade: new THREE.Vector2(), nextSaccade: 1,
    drag: null, yaw: 0, yawVel: 0, antenna: new THREE.Vector2(), antennaVel: new THREE.Vector2(),
    prevHead: new THREE.Vector2(), nextIdle: 3, zs: [],
  };
  const amp = reducedMotion ? 0.35 : 1;

  function setExpression(name) { if (EXPRESSIONS.includes(name)) { S.base = name; if (S.t > S.exprUntil) S.expr = name; } }
  function react(name, ms = 1200) { if (EXPRESSIONS.includes(name)) { S.expr = name; S.exprUntil = S.t + ms / 1000; } }
  function play(name, opts = {}) {
    const dur = { jump: 0.75, hop: 0.45, spin: 1.0, wave: 1.8, nod: 0.9, shake: 0.8, tilt: 1.6, flap: 1.2, wiggle: 0.9 }[name];
    if (!dur) return;
    S.anims = S.anims.filter((a) => a.name !== name);
    S.anims.push({ name, t0: S.t, dur: opts.dur || dur });
    if (name === 'flap' || name === 'jump' || name === 'spin') S.excite = 1;
  }
  function animP(name) {
    const a = S.anims.find((x) => x.name === name);
    return a ? clamp01((S.t - a.t0) / a.dur) : -1;
  }
  function wake(fromInput = true) {
    if (S.asleep) { S.asleep = false; react('surprised', 900); play('hop'); onReact('wake'); }
    if (fromInput) S.lastInput = S.t;
  }

  // ---- face ------------------------------------------------------------------------------------
  function rr(x, y, w, h, r) {
    fx.beginPath(); fx.moveTo(x + r, y); fx.arcTo(x + w, y, x + w, y + h, r); fx.arcTo(x + w, y + h, x, y + h, r);
    fx.arcTo(x, y + h, x, y, r); fx.arcTo(x, y, x + w, y, r); fx.closePath();
  }
  function heart(cx, cy, s) {
    fx.beginPath(); fx.moveTo(cx, cy + s * 0.9);
    fx.bezierCurveTo(cx - s * 1.4, cy - s * 0.1, cx - s * 0.7, cy - s * 1.2, cx, cy - s * 0.45);
    fx.bezierCurveTo(cx + s * 0.7, cy - s * 1.2, cx + s * 1.4, cy - s * 0.1, cx, cy + s * 0.9); fx.fill();
  }
  function star(cx, cy, r, rot) {
    fx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = rot + (i * Math.PI) / 5 - Math.PI / 2, rr2 = i % 2 ? r * 0.45 : r;
      fx.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2);
    }
    fx.closePath(); fx.fill();
  }
  function drawFace() {
    const W = 512, t = S.t;
    const bg = fx.createRadialGradient(W / 2, W / 2, 40, W / 2, W / 2, 360);
    bg.addColorStop(0, '#11151b'); bg.addColorStop(1, '#05070a');
    fx.fillStyle = bg; fx.fillRect(0, 0, W, W);
    fx.strokeStyle = 'rgba(160,190,220,0.07)'; fx.lineWidth = 2;
    for (let i = 32; i < W; i += 48) {
      fx.beginPath(); fx.moveTo(i, 0); fx.lineTo(i, W); fx.stroke();
      fx.beginPath(); fx.moveTo(0, i); fx.lineTo(W, i); fx.stroke();
    }
    const cx = W / 2 + (S.look.x + S.saccade.x) * 34, cy = W / 2 - 14 - (S.look.y + S.saccade.y) * 26;
    const e = S.expr;
    fx.save();
    fx.shadowColor = 'rgba(255,255,255,0.85)'; fx.shadowBlur = 28;
    fx.fillStyle = '#ffffff'; fx.strokeStyle = '#ffffff'; fx.lineCap = 'round'; fx.lineJoin = 'round';
    const open = Math.max(0.08, 1 - S.blink);
    if (e === 'eyes' || e === 'wink' || e === 'scan' || e === 'alert' || e === 'curious') {
      for (const s of [-1, 1]) {
        let h = (e === 'alert' ? 112 : 96) * open, w = e === 'alert' ? 62 : 70;
        if (e === 'wink' && s === 1) { fx.lineWidth = 18; fx.beginPath(); fx.arc(cx + s * 88, cy + 10, 34, Math.PI * 1.15, Math.PI * 1.85); fx.stroke(); continue; }
        if (e === 'curious') h *= s === -1 ? 0.7 : 1.15;
        rr(cx + s * 88 - w / 2, cy - h / 2, w, h, Math.min(30, h / 2)); fx.fill();
      }
      if (e === 'scan') {
        const y = W * 0.18 + ((t * 220) % (W * 0.64));
        fx.shadowColor = 'rgba(52,211,153,0.9)'; fx.fillStyle = 'rgba(52,211,153,0.85)'; fx.fillRect(40, y, W - 80, 5);
      }
      if (e === 'curious') { fx.font = '800 90px system-ui'; fx.textAlign = 'center'; fx.fillText('?', cx + 190, cy - 90 + Math.sin(t * 4) * 6); }
    } else if (e === 'happy') {
      fx.lineWidth = 22;
      for (const s of [-1, 1]) { fx.beginPath(); fx.arc(cx + s * 88, cy + 18, 40, Math.PI * 1.1, Math.PI * 1.9); fx.stroke(); }
    } else if (e === 'love') {
      fx.fillStyle = '#ff6b9d'; fx.shadowColor = 'rgba(255,107,157,0.9)';
      const p = 1 + Math.sin(t * 9) * 0.08;
      for (const s of [-1, 1]) heart(cx + s * 88, cy, 46 * p);
    } else if (e === 'star') {
      fx.fillStyle = '#facc15'; fx.shadowColor = 'rgba(250,204,21,0.9)';
      for (const s of [-1, 1]) star(cx + s * 88, cy, 56, t * 2 * s);
    } else if (e === 'sleepy') {
      fx.lineWidth = 16;
      for (const s of [-1, 1]) { fx.beginPath(); fx.moveTo(cx + s * 88 - 34, cy + 6); fx.lineTo(cx + s * 88 + 34, cy + 6); fx.stroke(); }
      fx.font = '700 64px system-ui'; fx.textAlign = 'center'; fx.shadowBlur = 12;
      for (let i = 0; i < 3; i++) {
        const k = ((t * 0.5 + i / 3) % 1);
        fx.globalAlpha = Math.sin(k * Math.PI);
        fx.font = `700 ${40 + k * 40}px system-ui`;
        fx.fillText('z', cx + 150 + k * 60, cy - 40 - k * 150);
      }
      fx.globalAlpha = 1;
    } else if (e === 'dizzy') {
      fx.lineWidth = 12;
      for (const s of [-1, 1]) {
        fx.beginPath();
        for (let a = 0; a < Math.PI * 5; a += 0.15) {
          const r = 4 + a * 7, ang = a + t * 8 * s;
          fx.lineTo(cx + s * 88 + Math.cos(ang) * r, cy + Math.sin(ang) * r);
        }
        fx.stroke();
      }
    } else if (e === 'surprised') {
      fx.lineWidth = 16;
      for (const s of [-1, 1]) { fx.beginPath(); fx.arc(cx + s * 88, cy, 46, 0, Math.PI * 2); fx.stroke(); fx.beginPath(); fx.arc(cx + s * 88, cy, 16, 0, Math.PI * 2); fx.fill(); }
    } else if (e === 'diamond') {
      const r = 92 + Math.sin(t * 3) * 6;
      const dg = fx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      ['#22d3ee', '#34d399', '#facc15', '#fb923c', '#f43f5e', '#a78bfa'].forEach((c, i) => dg.addColorStop(i / 5, c));
      fx.fillStyle = dg; fx.shadowColor = 'rgba(167,139,250,0.8)';
      fx.beginPath(); fx.moveTo(cx, cy - r * 1.15); fx.lineTo(cx + r * 0.8, cy); fx.lineTo(cx, cy + r * 1.15); fx.lineTo(cx - r * 0.8, cy); fx.closePath(); fx.fill();
    } else if (e === 'dollar') {
      fx.font = '800 150px system-ui, sans-serif'; fx.textAlign = 'center'; fx.textBaseline = 'middle';
      fx.fillStyle = '#34d399'; fx.shadowColor = 'rgba(52,211,153,0.95)';
      for (const s of [-1, 1]) fx.fillText('$', cx + s * 88, cy + 6 + Math.sin(t * 8 + s) * 5);
    } else if (e === 'quote') {
      fx.font = '800 300px Georgia, serif'; fx.textAlign = 'center'; fx.textBaseline = 'middle';
      fx.fillText('“', cx, cy + 70);
    }
    // mouth: shown while talking, or a tiny smile on happy faces
    if (S.talk > 0.02 && !['quote', 'diamond'].includes(e)) {
      const h = 10 + S.talk * 46;
      fx.fillStyle = '#ffffff'; rr(cx - 36, cy + 92 - h / 2, 72, h, Math.min(20, h / 2)); fx.fill();
    } else if (['happy', 'love', 'star', 'wink'].includes(e)) {
      fx.lineWidth = 12; fx.beginPath(); fx.arc(cx, cy + 70, 30, Math.PI * 0.15, Math.PI * 0.85); fx.stroke();
    }
    fx.restore();
    if (S.blush > 0.02) {
      fx.save(); fx.globalAlpha = S.blush * 0.75; fx.fillStyle = '#ff6b9d'; fx.shadowColor = '#ff6b9d'; fx.shadowBlur = 30;
      for (const s of [-1, 1]) { fx.beginPath(); fx.ellipse(cx + s * 150, cy + 66, 34, 18, 0, 0, Math.PI * 2); fx.fill(); }
      fx.restore();
    }
    fx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let y = 0; y < W; y += 4) fx.fillRect(0, y, W, 1);
    faceTex.needsUpdate = true;
  }

  // ---- input -----------------------------------------------------------------------------------
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let lastMove = null;
  function hitAt(clientX, clientY) {
    const r = viewRect();
    if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) return null;
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(hittables, false)[0];
    return hit ? hit.object.userData.part : null;
  }
  function onMove(e) {
    const r = viewRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height * (S.mode === 'close' ? 0.55 : 0.42);
    const span = S.mode === 'buddy' ? 0.35 : 0.5;
    S.target.set(
      Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth * span))),
      Math.max(-1, Math.min(1, -(e.clientY - cy) / (window.innerHeight * span))));
    wake();
    if (S.drag) {
      const dx = e.clientX - S.drag.x;
      S.drag.moved = Math.max(S.drag.moved, Math.abs(dx) + Math.abs(e.clientY - S.drag.y));
      S.yawVel = (dx - S.drag.lastDx) * 0.012; S.drag.lastDx = dx;
      S.yaw = S.drag.yaw0 + dx * 0.012;
      return;
    }
    const part = hitAt(e.clientX, e.clientY);
    canvas.style.cursor = part ? (part === 'head' || part === 'face' ? 'grab' : 'pointer') : 'default';
    // full-screen canvas only catches the pointer while it is over the robot
    if (fullscreen) canvas.style.pointerEvents = part ? 'auto' : 'none';
    if ((part === 'head' || part === 'face') && lastMove) {
      const speed = Math.hypot(e.clientX - lastMove.x, e.clientY - lastMove.y);
      S.pet = Math.min(1.6, S.pet + speed * 0.004);
      if (S.pet > 1 && S.expr !== 'love') { react('love', 1800); play('flap'); onReact('pet'); S.pet = 0.6; }
      else if (S.pet > 0.35 && S.t > S.exprUntil) react('happy', 700);
    }
    lastMove = { x: e.clientX, y: e.clientY };
  }
  function onDown(e) {
    const part = hitAt(e.clientX, e.clientY);
    if (!part) return;
    wake();
    S.drag = { x: e.clientX, y: e.clientY, yaw0: S.yaw, moved: 0, part, lastDx: 0 };
    canvas.setPointerCapture?.(e.pointerId);
  }
  function onUp() {
    const d = S.drag; S.drag = null;
    if (!d) return;
    if (d.moved > 8) { onReact('spun'); return; }
    S.clicks = S.clicks.filter((c) => S.t - c < 2).concat(S.t);
    if (S.clicks.length >= 5) { S.clicks = []; react('dizzy', 2200); play('shake', { dur: 1.2 }); onReact('dizzy'); return; }
    const byPart = {
      face: [['happy', 'flap'], ['wink', 'tilt'], ['love', 'flap']],
      head: [['happy', 'nod'], ['curious', 'tilt'], ['star', 'flap']],
      antenna: [['surprised', 'hop'], ['star', 'wiggle']],
      wing: [['happy', 'flap'], ['love', 'flap']],
      emblem: [['diamond', 'spin'], ['star', 'spin']],
      body: [['happy', 'jump'], ['wink', 'wave'], ['star', 'jump']],
    }[d.part] || [['happy', 'jump']];
    const [expr, anim] = byPart[Math.floor(rand() * byPart.length)];
    react(expr, 1500); play(anim); onReact(d.part + ':' + anim);
  }
  if (!manual) {
    window.addEventListener('pointermove', onMove, { passive: true });
    (fullscreen ? window : canvas).addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
  }

  // ---- sizing & framing ------------------------------------------------------------------------
  function viewRect() {
    if (!fullscreen || !S.rect) return canvas.getBoundingClientRect();
    const r = S.rect; return { left: r.x, top: r.y, right: r.x + r.w, bottom: r.y + r.h, width: r.w, height: r.h };
  }
  function resize() {
    const w = fullscreen ? innerWidth : canvas.clientWidth, h = fullscreen ? innerHeight : canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    if (!fullscreen) { camera.aspect = w / h; camera.updateProjectionMatrix(); }
    applyFraming(true);
  }
  function setRect(r, snap = false) {
    S.rectT = { ...r };
    if (snap || !S.rect) S.rect = { ...r };
  }
  function applyFraming(soft) {
    const f = FRAMINGS[S.mode];
    const narrow = camera.aspect < 0.8 && S.mode === 'full' ? 1.2 : 1;
    camPosT.set(f.pos[0], f.pos[1], f.pos[2] * narrow); camLookT.set(...f.look);
    if (!soft) { camPos.copy(camPosT); camLook.copy(camLookT); }
  }
  function setMode(mode) { if (FRAMINGS[mode] && mode !== S.mode) { S.mode = mode; applyFraming(true); } }
  if (!manual) { if (fullscreen) addEventListener('resize', resize); else new ResizeObserver(resize).observe(canvas); }
  resize(); applyFraming(false);

  // ---- per-frame update ------------------------------------------------------------------------
  function step(dt) {
    S.t += dt;
    const t = S.t;
    // sleep after 25 s without input (not in manual/recording mode)
    if (!manual && !S.asleep && t - S.lastInput > 25) { S.asleep = true; onReact('sleep'); }
    if (S.asleep) { S.expr = 'sleepy'; S.target.set(0, -0.35); }
    else if (t - S.lastInput > 4 || manual && S.autoLook) S.target.set(Math.sin(t * 0.5) * 0.45, Math.sin(t * 0.33) * 0.2);

    // idle personality: small random gestures
    if (!manual && !S.asleep && t > S.nextIdle) {
      const idle = [['tilt', 'curious'], ['flap', 'happy'], ['hop', 'eyes'], ['nod', 'eyes'], ['wiggle', 'wink']];
      const [anim, expr] = idle[Math.floor(rand() * idle.length)];
      play(anim); if (expr !== 'eyes') react(expr, 1200);
      S.nextIdle = t + 5 + rand() * 6;
    }

    const k = (base) => 1 - Math.pow(base, dt);
    if (fullscreen && S.rect && S.rectT) {  // glide the robot's viewport toward its target box
      const f = k(0.0009);
      for (const key of ['x', 'y', 'w', 'h']) S.rect[key] += (S.rectT[key] - S.rect[key]) * f;
      const asp = Math.max(0.2, S.rect.w / Math.max(1, S.rect.h));
      if (Math.abs(asp - camera.aspect) > 1e-4) { camera.aspect = asp; camera.updateProjectionMatrix(); }
    }
    if (S.blend !== null && S.mode !== 'buddy') {  // scroll-driven full -> close-up
      const a = FRAMINGS.full, b = FRAMINGS.close, q = S.blend * S.blend * (3 - 2 * S.blend);
      const narrowZ = camera.aspect < 0.8 ? 1.2 : 1;
      camPosT.set(0, a.pos[1] + (b.pos[1] - a.pos[1]) * q, (a.pos[2] * narrowZ) + (b.pos[2] - a.pos[2] * narrowZ) * q);
      camLookT.set(0, a.look[1] + (b.look[1] - a.look[1]) * q, 0);
    }
    S.look.lerp(S.target, k(0.0015));
    // keep wings + antenna inside the view: back the camera off when the box is narrow
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const fitZ = Math.max(2.8 / tanHalf, 2.7 / (tanHalf * camera.aspect)) * 1.06;
    const closeW = S.mode === 'buddy' ? 0 : (S.blend ?? (S.mode === 'close' ? 1 : 0));
    if (closeW < 0.5) camPosT.z = Math.max(camPosT.z, fitZ * (1 - closeW * 2) + camPosT.z * closeW * 2);
    camPos.lerp(camPosT, k(0.02)); camLook.lerp(camLookT, k(0.02));
    camera.position.copy(camPos); camera.lookAt(camLook);

    const fm = 1 - 0.45 * (S.mode === 'buddy' ? 0 : (S.blend ?? (S.mode === 'close' ? 1 : 0)));  // calmer head-follow in the close-up
    let headY = S.look.x * 0.6 * amp * fm, headX = -S.look.y * 0.32 * amp * fm, headZ = -S.look.x * 0.06 * amp;
    let rootY = Math.sin(t * (S.asleep ? 0.8 : 1.3)) * 0.07 * amp, sx = 1, sy = 1, spin = 0;
    let armL = 0.12, armR = -0.12, armSwing = Math.sin(t * 1.3) * 0.08 * amp, flapBoost = 0, wiggle = 0;

    let p;
    if ((p = animP('jump')) >= 0) {
      const air = Math.sin(Math.PI * clamp01((p - 0.15) / 0.7));
      rootY += air * 1.0;
      if (p < 0.15) { sy = 1 - 0.18 * Math.sin((p / 0.15) * Math.PI); }
      else if (p > 0.85) { sy = 1 - 0.15 * Math.sin(((p - 0.85) / 0.15) * Math.PI); }
      else sy = 1.06;
      sx = 1 / Math.sqrt(sy); armL = 1.2 * air; armR = -1.2 * air;
    }
    if ((p = animP('hop')) >= 0) rootY += Math.sin(Math.PI * p) * 0.35;
    if ((p = animP('spin')) >= 0) spin = ease(p) * Math.PI * 2;
    if ((p = animP('wave')) >= 0) { const w = Math.sin(Math.PI * p); armR = -2.5 * w + Math.sin(t * 14) * 0.35 * w; }
    if ((p = animP('nod')) >= 0) headX += Math.sin(p * Math.PI * 4) * 0.18 * (1 - p);
    if ((p = animP('shake')) >= 0) headY += Math.sin(p * Math.PI * 8) * 0.28 * (1 - p);
    if ((p = animP('tilt')) >= 0) headZ += Math.sin(Math.PI * p) * 0.3;
    if ((p = animP('flap')) >= 0) flapBoost = Math.sin(Math.PI * p);
    if ((p = animP('wiggle')) >= 0) wiggle = Math.sin(p * Math.PI * 6) * 0.12 * (1 - p);
    S.anims = S.anims.filter((a) => t - a.t0 < a.dur);
    if (S.asleep) { headX += 0.25; flapBoost = 0; }

    head.rotation.y += (headY - head.rotation.y) * k(0.002);
    head.rotation.x += (headX - head.rotation.x) * k(0.002);
    head.rotation.z += (headZ + wiggle - head.rotation.z) * k(0.004);
    body.rotation.y += (S.look.x * 0.22 * amp - body.rotation.y) * k(0.01);
    root.position.y = -0.15 + rootY;
    const breath = 1 + Math.sin(t * 2.1) * 0.012 * amp;
    squash.scale.set(sx, sy * breath, sx);
    S.leanT *= Math.pow(0.15, dt); S.lean += (S.leanT - S.lean) * k(0.01);
    root.rotation.x = S.lean; root.rotation.z = -S.lean * 0.25;
    // drag yaw with spring back
    if (!S.drag) { S.yaw += S.yawVel; S.yawVel *= Math.pow(0.02, dt); S.yaw += (0 - S.yaw) * k(0.08); }
    spinner.rotation.y = S.yaw + spin;

    S.excite = Math.max(0, S.excite - dt * 0.8);
    const flapSpeed = 3 + (S.excite + flapBoost) * 14;
    const flap = Math.sin(t * flapSpeed) * (0.05 + (S.excite + flapBoost) * 0.32) * amp - (S.asleep ? 0.35 : 0);
    for (const w of wings) w.pivot.rotation.z = w.base + w.side * flap;
    arms[0].shoulder.rotation.z += (-armL - arms[0].shoulder.rotation.z) * k(0.001);
    arms[1].shoulder.rotation.z += (-armR - arms[1].shoulder.rotation.z) * k(0.001);
    for (const a of arms) a.shoulder.rotation.x = armSwing * a.side;

    // antenna spring driven by head motion
    const hv = new THREE.Vector2(head.rotation.y - S.prevHead.x, head.rotation.x - S.prevHead.y);
    S.prevHead.set(head.rotation.y, head.rotation.x);
    S.antennaVel.addScaledVector(hv, -18).addScaledVector(S.antenna, -60 * dt).multiplyScalar(Math.pow(0.08, dt));
    S.antenna.addScaledVector(S.antennaVel, dt);
    antenna.rotation.z = -0.15 + S.antenna.x * 0.9 + Math.sin(t * 2.2) * 0.04;
    antenna.rotation.x = S.antenna.y * 0.9;
    leds.forEach((l, i) => { l.scale.setScalar(0.8 + 0.4 * (0.5 + 0.5 * Math.sin(t * 3 + i * 1.3))); });

    S.nextSaccade -= dt;  // tiny eye darts make it feel alive
    if (S.nextSaccade <= 0) { S.saccade.set((rand() - 0.5) * 0.35, (rand() - 0.5) * 0.25); S.nextSaccade = 0.6 + rand() * 1.8; }
    S.saccade.multiplyScalar(Math.pow(0.4, dt));
    S.nextBlink -= dt;
    if (S.nextBlink <= 0) { S.blink = 1; S.nextBlink = rand() < 0.2 ? 0.18 : 2.5 + rand() * 3.5; }
    S.blink = Math.max(0, S.blink - dt * 7);
    if (!S.asleep && t > S.exprUntil && S.expr !== S.base) S.expr = S.base;
    S.pet = Math.max(0, S.pet - dt * 0.5);
    const wantBlush = ['love', 'happy', 'wink'].includes(S.expr) ? 1 : 0;
    S.blush += (wantBlush - S.blush) * k(0.05);

    glow.position.y = -2.25 + (root.position.y + 0.15) * 0.1;
    glow.material.opacity = 1 - Math.min(0.6, rootY * 0.6);
    spectrum.uniforms.uTime.value = t;
    spectrum.uniforms.uBoost.value = S.excite + (S.expr === 'love' ? 0.4 : 0);
    drawFace();
    if (fullscreen && S.rect) {
      const H = innerHeight, r = S.rect;
      renderer.setViewport(r.x, H - r.y - r.h, r.w, r.h);
    }
    renderer.render(scene, camera);
  }

  // ---- loop ------------------------------------------------------------------------------------
  const clock = new THREE.Clock();
  let running = !manual, raf = 0;
  function frame() { if (!running) return; raf = requestAnimationFrame(frame); step(Math.min(clock.getDelta(), 0.05)); }
  if (!manual) {
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !running) { running = true; clock.getDelta(); frame(); }
      if (!en.isIntersecting) { running = false; cancelAnimationFrame(raf); }
    }).observe(canvas);
    frame();
  }

  return {
    setExpression, react, play, setMode, wake,
    setBlend: (v) => { S.blend = v === null ? null : Math.max(0, Math.min(1, v)); },
    setRect,
    nudge: (v) => { S.leanT = Math.max(-0.22, Math.min(0.22, v * 0.004)); S.excite = Math.min(1, S.excite + Math.abs(v) * 0.0006); },
    anchor: () => {  // screen position just above the head, for speech bubbles
      const p = new THREE.Vector3(0, 2.25, 0.2); head.localToWorld(p); p.project(camera);
      const r = viewRect();
      return { x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height, visible: p.z < 1 };
    },
    get mode() { return S.mode; },
    setTalk: (v) => { S.talk = Math.max(0, Math.min(1, v)); },
    lookAt: (x, y) => { S.target.set(x, y); S.lastInput = S.t; },
    autoLook: (on) => { S.autoLook = on; },
    snapFraming: () => applyFraming(false),
    resize, step,
  };
}
