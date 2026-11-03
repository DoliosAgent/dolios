import { createMascot } from './mascot.js';
import { FEATURES } from './features.js';
import { SITE } from './config.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const narrow = () => matchMedia('(max-width: 900px)').matches;
const $ = (s) => document.querySelector(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastPointer = { x: innerWidth / 2, y: innerHeight / 2 };
addEventListener('pointermove', (e) => { lastPointer = { x: e.clientX, y: e.clientY }; }, { passive: true });

// ---- toast & speech bubble -----------------------------------------------------------------
const toastEl = $('#toast');
let toastT = 0;
function toast(text) { toastEl.textContent = text; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 1800); }
const bubble = $('#bubble');
let bubbleT = 0;
function say(text, ms = 3200) {
  bubble.textContent = text; bubble.classList.add('show'); clearTimeout(bubbleT);
  bubbleT = setTimeout(() => bubble.classList.remove('show'), ms);
}
function hearts(n = 5) {
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div');
    el.className = 'heart'; el.textContent = ['♥', '💖', '✨'][i % 3];
    el.style.left = lastPointer.x - 10 + (Math.random() * 30 - 15) + 'px';
    el.style.top = lastPointer.y - 20 + 'px';
    el.style.setProperty('--dx', `${Math.random() * 60 - 30}px`);
    el.style.color = '#ff6b9d'; el.style.animationDelay = `${i * 70}ms`;
    document.body.append(el); setTimeout(() => el.remove(), 1400);
  }
}

// ---- mascot --------------------------------------------------------------------------------
const LINES = {
  pet: ['Hehe, that tickles! ♡', 'More head pats please ♡', 'Best. Human. Ever.'],
  dizzy: ['Whoa… too many clicks… 😵‍💫', 'The candles are spinning…'],
  sleep: ['zzz… (wiggle your mouse to wake me)'],
  wake: ['Huh?! I’m up, I’m up!', 'I wasn’t sleeping, I was… scanning.'],
  spun: ['Wheee!', 'Again! Again!'],
  click: ['Hi! I’m Dolios ◆', 'Rub my head, I like that.', 'Click my chest diamond!', 'Try the antenna ✦', 'Drag me to spin me around!'],
};
const pickLine = (k) => LINES[k][Math.floor(Math.random() * LINES[k].length)];
let mascot = null;
try {
  mascot = createMascot($('#mascot'), {
    reducedMotion: reduced,
    onReact: (what) => {
      if (what === 'pet') { hearts(); say(pickLine('pet')); }
      else if (LINES[what]) say(pickLine(what));
      else if (what.includes(':')) { if (Math.random() < 0.6) say(pickLine('click'), 2400); if (what.startsWith('face') || what.startsWith('wing')) hearts(3); }
    },
  });
} catch (err) {
  console.warn('Mascot disabled (WebGL unavailable):', err);
  $('#mascot-wrap').remove();
}
const face = (n) => mascot?.setExpression(n);
const react = (n, ms) => mascot?.react(n, ms);
const play = (n) => mascot?.play(n);
const ctx = { react, play, say, toast, open: (id, payload) => openFeature(id, payload, true) };

// buddy hide/show (per-viewer preference)
const wrap = $('#mascot-wrap');
let buddyHidden = false;
try { buddyHidden = localStorage.getItem('dolios-buddy') === 'off'; } catch {}
$('#buddy-hide')?.addEventListener('click', () => { buddyHidden = true; try { localStorage.setItem('dolios-buddy', 'off'); } catch {} applyMode(currentMode); });
$('#buddy-show').addEventListener('click', () => { buddyHidden = false; try { localStorage.removeItem('dolios-buddy'); } catch {} applyMode(currentMode); say('I’m back ◆'); });
let currentMode = 'full';
function applyMode(mode) {
  if (!wrap) return;
  currentMode = mode;
  const m = narrow() && mode === 'close' ? 'buddy' : mode;
  wrap.classList.remove('m-full', 'm-close', 'm-buddy'); wrap.classList.add(`m-${m}`);
  const hide = m === 'buddy' && buddyHidden;
  wrap.classList.toggle('off', hide); $('#buddy-show').hidden = !hide;
  document.body.classList.toggle('buddy-mode', m === 'buddy');
  mascot?.setMode(m);
}

// ---- site config: links, token ---------------------------------------------------------------
document.querySelectorAll('[data-link="github"]').forEach((a) => { a.href = SITE.github; });
if (SITE.x) document.querySelectorAll('[data-link="x"]').forEach((a) => { a.href = `https://x.com/${SITE.x}`; a.hidden = false; });
document.querySelectorAll('[data-x-front]').forEach((a) => {
  if (SITE.x) { a.href = `https://x.com/${SITE.x}`; a.querySelector('[data-x-label]')?.replaceChildren(`@${SITE.x}`); }
  else { a.classList.add('soon'); a.removeAttribute('href'); a.querySelector('[data-x-label]')?.replaceChildren('X · soon'); }
});
document.querySelectorAll('[data-ca]').forEach((c) => { c.textContent = SITE.token.ca || 'coming soon'; c.title = SITE.token.ca || ''; });
document.querySelectorAll('[data-ca-copy]').forEach((b) => {
  b.disabled = !SITE.token.ca;
  b.addEventListener('click', () => copyCA());
});
async function copyCA() {
  if (!SITE.token.ca) return;
  try { await navigator.clipboard.writeText(SITE.token.ca); toast('Contract address copied ◆'); react('diamond', 1500); play('spin'); say('Copied! Double-check it on GMGN ◆', 2400); } catch {}
}
document.querySelectorAll('[data-site="ticker"]').forEach((e) => { e.textContent = SITE.token.ticker; });
$('#ca-chain').textContent = { sol: 'Solana', bsc: 'BNB Chain', base: 'Base', eth: 'Ethereum' }[SITE.token.chain] || '';
if (SITE.token.ca) {
  $('#ca-text').textContent = SITE.token.ca;
  $('#ca-copy').disabled = false;
  const chart = $('#ca-chart'); chart.href = `https://gmgn.ai/${SITE.token.chain}/token/${SITE.token.ca}`; chart.hidden = false;
}
$('#ca-copy').addEventListener('click', copyCA);
document.querySelector('.announce-x').addEventListener('click', () => $('#announce').remove());

// ---- hero typing ---------------------------------------------------------------------------
const prompts = [
  'SCAN THE TRENCHES FOR NEW SOLANA LAUNCHES WITH SMART MONEY IN.',
  'IS THIS CONTRACT A HONEYPOT? CHECK BUNDLERS AND INSIDERS TOO.',
  'BUY 0.2 SOL OF THE REAL $WIF WITH A -30% STOP LOSS.',
  'WHICH KOL WALLETS BOUGHT IN THE LAST 30 MINUTES?',
  'SCORE THIS WALLET. IS IT WORTH COPY-TRADING?',
];
const typed = $('#typed');
if (!reduced) (async () => {
  for (let pi = 0; ; pi++) {
    const text = prompts[pi % prompts.length];
    for (let i = 0; i <= text.length; i++) { typed.textContent = text.slice(0, i); await sleep(28); }
    await sleep(2200);
    for (let i = text.length; i >= 0; i -= 3) { typed.textContent = text.slice(0, i); await sleep(12); }
  }
})();

// ---- meet: capability strip (reference-style numbered tabs) ----------------------------------
const strip = document.querySelector('.cap-strip');
let cap = 0, capTimer = 0, meetVisible = false;
FEATURES.forEach((f, i) => {
  const b = document.createElement('button');
  b.className = 'cap'; b.setAttribute('role', 'tab');
  b.innerHTML = `<span class="n">${String(i + 1).padStart(2, '0')}</span><span class="l">${f.title}</span>`;
  b.addEventListener('click', () => { showCap(i); restartCap(); });
  strip.append(b);
});
function showCap(i) {
  cap = i; const f = FEATURES[i];
  [...strip.children].forEach((t, k) => { t.classList.toggle('on', k === i); t.setAttribute('aria-selected', k === i); });
  const tab = strip.children[i]; strip.scrollTo({ left: tab.offsetLeft - strip.offsetLeft - 40, behavior: reduced ? 'auto' : 'smooth' });
  $('#cap-text').innerHTML = `<b>${f.title}.</b> ${f.desc} <a href="#features" class="up" data-open="${f.id}">Try it →</a>`;
  if (meetVisible) { face(f.expr); if (i % 3 === 0) play('tilt'); }
}
$('#cap-text').addEventListener('click', (e) => { const a = e.target.closest('[data-open]'); if (a) openFeature(a.dataset.open); });
function restartCap() { clearInterval(capTimer); if (!reduced) capTimer = setInterval(() => meetVisible && showCap((cap + 1) % FEATURES.length), 4500); }
showCap(0); restartCap();

// ---- features explorer -----------------------------------------------------------------------
const list = $('#feat-list');
let cleanup = () => {}, featIdx = 0;
FEATURES.forEach((f, i) => {
  const b = document.createElement('button');
  b.className = 'feat-item'; b.setAttribute('role', 'tab');
  b.innerHTML = `<span class="ic">${f.icon}</span><span><b>${f.title}</b><small>${f.short}</small></span>`;
  b.addEventListener('click', () => openFeature(f.id));
  list.append(b);
});
function openFeature(id, payload, scroll = false) {
  const i = Math.max(0, FEATURES.findIndex((f) => f.id === id)), f = FEATURES[i];
  featIdx = i; cleanup();
  [...list.children].forEach((b, k) => { b.classList.toggle('on', k === i); b.setAttribute('aria-selected', k === i); });
  $('#fp-num').textContent = `${String(i + 1).padStart(2, '0')} / ${String(FEATURES.length).padStart(2, '0')}`;
  $('#fp-title').textContent = f.title;
  $('#fp-desc').textContent = f.desc;
  $('#fp-bullets').innerHTML = f.bullets.map((x) => `<li>${x}</li>`).join('');
  $('#fp-prompt').textContent = f.prompt;
  const vis = $('#fp-visual'); vis.innerHTML = '';
  cleanup = f.mount(vis, ctx, payload) || (() => {});
  face(f.expr);
  if (scroll) document.getElementById('features').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
}
$('#fp-prompt').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('#fp-prompt').textContent); toast('Prompt copied — paste it into Dolios'); react('happy', 1000); } catch {}
});
openFeature('trenches');

// ---- videos (tabbed) -----------------------------------------------------------------------
const video = $('#explainer'), chaptersEl = $('#chapters'), vtabs = $('#vtabs');
let chs = [];
video.addEventListener('play', () => { react('happy', 1500); say('Enjoy the tour ◆', 2000); });
video.addEventListener('timeupdate', () => {
  let on = 0; chs.forEach((c, i) => { if (video.currentTime >= c.t) on = i; });
  [...chaptersEl.querySelectorAll('button')].forEach((b, i) => b.classList.toggle('on', i === on));
});
function loadVideo(v, autoplay = false) {
  video.src = v.src; video.poster = v.poster;
  [...vtabs.children].forEach((b) => b.setAttribute('aria-selected', b.dataset.id === v.id));
  chaptersEl.innerHTML = ''; chs = [];
  fetch(v.chapters).then((r) => (r.ok ? r.json() : [])).catch(() => []).then((list) => {
    chs = list;
    list.forEach((c) => {
      const li = document.createElement('li');
      const m = Math.floor(c.t / 60), s = String(Math.floor(c.t % 60)).padStart(2, '0');
      li.innerHTML = `<button><span class="ts">${m}:${s}</span><span>${c.title}</span></button>`;
      li.querySelector('button').addEventListener('click', () => { video.currentTime = c.t; video.play(); });
      chaptersEl.append(li);
    });
  });
  if (autoplay) video.play().catch(() => {});
}
SITE.videos.forEach((v, i) => {
  const b = document.createElement('button');
  b.className = 'vtab'; b.setAttribute('role', 'tab'); b.dataset.id = v.id;
  b.innerHTML = `<b>${v.label}</b><small>${v.note}</small>`;
  b.addEventListener('click', () => loadVideo(v, true));
  vtabs.append(b);
});
loadVideo(SITE.videos[0]);

// ---- terminal demo -------------------------------------------------------------------------
const script = [
  ['u', 'find me something new on solana with smart money in, then vet it', 600],
  ['tool', '┊ gmgn-market  trenches --chain sol --launchpad pump.fun --kol-entry', 500],
  ['tool', '┊ gmgn-track   smartmoney --chain sol --window 30m', 700],
  ['', '3 launches in the last 20 min have ≥2 smart-money buyers. Best: $MOONCAT (9xQe…pump), mcap $412k.', 900],
  ['tool', '┊ gmgn-token-buy  vet 9xQe…pump', 600],
  ['ok', '✓ liquidity $86k   ✓ not honeypot   ✓ rug ratio 0.08   ✓ dev sold 0%', 400],
  ['warn', '! top-10 hold 31%   ! bundlers 9% of volume', 900],
  ['', 'Tradeable with small size. Suggest 0.2 SOL, slippage 15%, stop-loss -30%.', 800],
  ['u', 'do it', 700],
  ['', 'BUY 0.2 SOL of $MOONCAT (9xQe…pump) on sol, slippage 15%, SL -30%', 500],
  ['appr', '⚠ GMGN trade: swap (moves funds from your wallet)\n  gmgn-cli swap --chain sol --amount 0.2 --slippage 15 …\n  [o]nce  [d]eny  ❯ o', 1500],
  ['ok', '✓ filled 0.2 SOL → 513,770 $MOONCAT @ $0.000389 · SL order created', 400],
];
const term = $('#term');
let demoRun = 0;
async function playDemo() {
  const run = ++demoRun; term.textContent = '';
  for (const [kind, text, wait] of script) {
    if (run !== demoRun) return;
    const line = document.createElement(kind === 'appr' ? 'span' : 'div');
    if (kind) line.className = kind;
    term.append(line);
    if (kind === 'appr') { react('alert', 1600); say('See? I always ask first.', 2400); }
    if (kind === 'ok' && text.startsWith('✓ filled')) { react('dollar', 2200); play('jump'); }
    if (kind === 'u' && !reduced) {
      for (let i = 0; i <= text.length; i++) { if (run !== demoRun) return; line.textContent = text.slice(0, i); await sleep(22); }
    } else line.textContent = text;
    await sleep(reduced ? 0 : wait);
  }
}
$('#replay').addEventListener('click', playDemo);

// ---- install -------------------------------------------------------------------------------
const cmds = { win: SITE.installWin, unix: SITE.installUnix };
const osButtons = document.querySelectorAll('.os-tabs button');
function setOS(os) { osButtons.forEach((b) => b.setAttribute('aria-selected', b.dataset.os === os)); $('#cmd-text').textContent = cmds[os]; }
osButtons.forEach((b) => b.addEventListener('click', () => setOS(b.dataset.os)));
setOS(/Win/i.test(navigator.userAgent) ? 'win' : 'unix');
$('#copy').addEventListener('click', async (e) => {
  try { await navigator.clipboard.writeText($('#cmd-text').textContent); } catch { return; }
  const b = e.currentTarget; b.textContent = 'Copied'; b.classList.add('done'); react('happy', 1500); play('jump'); say('See you in the terminal ◆');
  setTimeout(() => { b.textContent = 'Copy'; b.classList.remove('done'); }, 1800);
});

// ---- section tracking: framing, expression, rail, buddy lines --------------------------------
const SECTION_LINES = {
  video: 'Grab a coffee — the tour is just one minute.',
  features: 'Click around! It’s all demo data, nothing real moves.',
  how: 'I always ask before I trade. Always.',
  safety: 'Rule #1: I will never ask for your seed phrase.',
  token: 'Always check the CA here before you buy!',
  install: 'One command and I’m on your machine ◆',
};
const seen = new Set();
const rail = document.querySelectorAll('.rail a');
let demoPlayed = false;
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    const id = e.target.id;
    rail.forEach((a) => a.classList.toggle('on', a.dataset.rail === id));
    applyMode(e.target.dataset.mode || 'buddy');
    meetVisible = id === 'meet';
    if (meetVisible) showCap(cap);
    else if (id === 'features') face(FEATURES[featIdx].expr);
    else face(e.target.dataset.expr || 'eyes');
    if (SECTION_LINES[id] && !seen.has(id)) { seen.add(id); setTimeout(() => say(SECTION_LINES[id]), 900); }
    if (id === 'install' || id === 'token') play('wave');
    if (id === 'how' && !demoPlayed) { demoPlayed = true; playDemo(); }
  }
}, { rootMargin: '-45% 0px -45% 0px' });
document.querySelectorAll('main .section').forEach((s) => io.observe(s));
addEventListener('resize', () => applyMode(currentMode));
// ---- loader handoff, smooth scroll, scroll-linked motion -------------------------------------
if (mascot) {
  window.__loader?.stage(0.85);
  requestAnimationFrame(() => requestAnimationFrame(() => window.__loader?.done()));
} else window.__loader?.done();
addEventListener('dolios:ready', () => {
  react('happy', 2200); play('jump'); lenis?.start();
  setTimeout(() => { play('wave'); say('Hi! I’m Dolios ◆ — rub my head or click me.', 3800); }, 700);
});
if (!window.__loader) addEventListener('load', () => dispatchEvent(new Event('dolios:ready')));

let lenis = null;
if (window.Lenis && !reduced) {
  lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9 });
  lenis.stop();
  const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
  document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2 || !document.querySelector(id)) return;
    e.preventDefault(); lenis.scrollTo(id, { offset: id === '#intro' ? -200 : 0, duration: 1.4 });
  }));
}

const intro = $('#intro'), meet = $('#meet');
const heroEls = ['.hero-title', '.hero-sub', '.prompt-card', '.hero-list', '.scroll'].map((q) => document.querySelector(q));
const meetEls = ['.cap-strip', '.meet-title', '.meet-side'].map((q) => document.querySelector(q));
const clamp01 = (x) => Math.max(0, Math.min(1, x));
let ticking = false;
function onScroll() {
  if (ticking) return; ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const y = window.scrollY, span = Math.max(1, meet.offsetTop - intro.offsetTop);
    const p = clamp01((y - intro.offsetTop) / span);
    if (narrow() || reduced) { mascot?.setBlend(null); return; }
    mascot?.setBlend(currentMode === 'buddy' ? null : p);
    heroEls.forEach((el, i) => { if (!el) return;
      el.style.transform = `translate3d(0, ${-y * (0.12 + i * 0.05)}px, 0)`; el.style.opacity = String(clamp01(1 - p * 1.6)); });
    const q = clamp01((p - 0.35) / 0.65);
    meetEls.forEach((el, i) => { if (!el) return;
      el.style.transform = `translate3d(0, ${(1 - q) * (50 + i * 25)}px, 0)`; el.style.opacity = String(q); });
  });
}
addEventListener('scroll', onScroll, { passive: true });
onScroll();

// staggered reveal for everything below the fold
const revealSel = ['.sec-head', '.player', '.feat-list', '.feat-panel', '.steps-big li', '.term', '#replay', '.card', '.token-grid .sec-head',
  '.ca-card', '.install-box > *', '.stats div'];
const revealIO = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); }
}), { rootMargin: '0px 0px -10% 0px' });
revealSel.forEach((sel) => document.querySelectorAll(sel).forEach((el, i) => {
  el.classList.add('reveal'); el.style.setProperty('--d', `${Math.min(i, 6) * 0.08}s`); revealIO.observe(el);
}));
