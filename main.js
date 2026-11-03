import { createMascot } from './mascot.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let mascot = null;
try {
  mascot = createMascot(document.getElementById('mascot'), { reducedMotion: reduced });
} catch (err) {
  console.warn('Mascot disabled (WebGL unavailable):', err);
  document.getElementById('mascot').remove();
}
const face = (name) => mascot && mascot.setExpression(name);
const react = (name, ms) => mascot && mascot.react(name, ms);

// ---- announcement --------------------------------------------------------------------------
document.querySelector('.announce-x').addEventListener('click', (e) => e.currentTarget.parentElement.remove());

// ---- hero typing ---------------------------------------------------------------------------
const prompts = [
  'SCAN THE TRENCHES FOR NEW SOLANA LAUNCHES WITH SMART MONEY IN.',
  'IS THIS CONTRACT A HONEYPOT? CHECK BUNDLERS AND INSIDERS TOO.',
  'BUY 0.2 SOL OF THE REAL $WIF WITH A -30% STOP LOSS.',
  'WHICH KOL WALLETS BOUGHT IN THE LAST 30 MINUTES?',
  'SCORE THIS WALLET. IS IT WORTH COPY-TRADING?',
];
const typed = document.getElementById('typed');
if (reduced) {
  typed.textContent = prompts[0];
} else {
  let pi = 0;
  (async function loop() {
    for (;;) {
      const text = prompts[pi % prompts.length];
      for (let i = 0; i <= text.length; i++) { typed.textContent = text.slice(0, i); await sleep(28); }
      await sleep(2200);
      for (let i = text.length; i >= 0; i -= 3) { typed.textContent = text.slice(0, i); await sleep(12); }
      pi++;
    }
  })();
}

// ---- features ------------------------------------------------------------------------------
const features = [
  ['Scan the trenches', 'Trending tokens down to the minute and fresh launches on pump.fun, letsbonk, fourmeme and clanker — filtered by dev holdings, KOL entries and rat-trader share.', 'what launched on pump.fun in the last 10 min with KOLs in?', 'scan'],
  ['Vet every buy', 'Resolves a name to the one right contract among its copycats, then checks liquidity, honeypot, rug ratio, top-10 concentration, bundlers, snipers and insiders.', 'is the $WIF on raydium the real one? any red flags?', 'alert'],
  ['Follow smart money', 'Live buys and sells from Smart Money, KOL and your followed wallets — so you see the flow before the chart does.', 'which smart money wallets bought in the last 30 min?', 'eyes'],
  ['Score any wallet', 'Profitability, win rate, copy-tradeability with a latency and slippage backtest, plus a trading-style portrait.', 'score 4Nd1…mBZ and tell me if it’s worth copying', 'scan'],
  ['Read the chart', 'K-lines from 1m to 1d, classified into named patterns — uptrend channel, distribution at highs, basing, breakdown — with a score.', 'what is the 15m chart of $BONK doing right now?', 'eyes'],
  ['Trade with guardrails', 'Market buys and sells through GMGN’s own routing, restated in one line and approved by you before anything is sent.', 'buy 0.2 SOL of the real $WIF', 'dollar'],
  ['TP, SL & trailing', 'Take-profit, stop-loss and trailing exits attached to a swap, or limit orders that wait for your price.', 'sell half at 2x, trail the rest with a 20% stop', 'dollar'],
  ['Remembers you', 'Your risk limits, favourite chains and past trades carry across sessions. Talk to it from the terminal, Telegram or Discord.', 'remember: never more than 1 SOL per meme', 'happy'],
];
const tabs = document.querySelector('.tabs');
features.forEach(([title], i) => {
  const b = document.createElement('button');
  b.className = 'tab'; b.setAttribute('role', 'tab');
  b.innerHTML = `<span class="n">${String(i + 1).padStart(2, '0')}</span><span class="l">${title}</span>`;
  b.addEventListener('click', () => { showFeature(i); restartAuto(); });
  tabs.appendChild(b);
});
let feat = 0, featTimer = 0, featuresVisible = false;
function showFeature(i) {
  feat = i;
  const [title, body, cmd, expr] = features[i];
  document.getElementById('feat-num').textContent = `${String(i + 1).padStart(2, '0')} / 0${features.length}`;
  document.getElementById('feat-title').textContent = title;
  document.getElementById('feat-body').textContent = body;
  document.getElementById('feat-cmd').textContent = `❯ ${cmd}`;
  [...tabs.children].forEach((t, k) => { t.classList.toggle('on', k === i); t.setAttribute('aria-selected', k === i); });
  const active = tabs.children[i];
  tabs.scrollTo({ left: active.offsetLeft - tabs.offsetLeft - 40, behavior: reduced ? 'auto' : 'smooth' });
  if (featuresVisible) face(expr);
}
function restartAuto() {
  clearInterval(featTimer);
  if (!reduced) featTimer = setInterval(() => featuresVisible && showFeature((feat + 1) % features.length), 4200);
}
showFeature(0); restartAuto();

// ---- demo terminal -------------------------------------------------------------------------
const script = [
  ['u', 'find me something new on solana with smart money in, then vet it', 600],
  ['tool', '┊ gmgn-market  trenches --chain sol --launchpad pump.fun --kol-entry', 500],
  ['tool', '┊ gmgn-track   smartmoney --chain sol --window 30m', 700],
  ['', '3 launches in the last 20 min have ≥2 smart-money buyers. Best: $EXAMPLE (9xQe…pump), mcap $412k.', 900],
  ['tool', '┊ gmgn-token-buy  vet 9xQe…pump', 600],
  ['ok', '✓ liquidity $86k   ✓ not honeypot   ✓ rug ratio 0.08   ✓ dev sold 0%', 400],
  ['warn', '! top-10 hold 31%   ! bundlers 9% of volume', 900],
  ['', 'Tradeable with small size. Suggest 0.2 SOL, slippage 15%, stop-loss -30%.', 800],
  ['u', 'do it', 700],
  ['', 'BUY 0.2 SOL of $EXAMPLE (9xQe…pump) on sol, slippage 15%, SL -30%', 500],
  ['appr', '⚠ GMGN trade: swap (moves funds from your wallet)\n  gmgn-cli swap --chain sol --amount 0.2 --slippage 15 …\n  [o]nce  [d]eny  ❯ o', 1500],
  ['ok', '✓ filled 0.2 SOL → 1,284,551 $EXAMPLE @ $0.000412 · SL order created', 400],
];
const term = document.getElementById('term');
let demoRun = 0;
async function playDemo() {
  const run = ++demoRun;
  term.textContent = '';
  for (const [kind, text, wait] of script) {
    if (run !== demoRun) return;
    const line = document.createElement(kind === 'appr' ? 'span' : 'div');
    if (kind) line.className = kind;
    term.appendChild(line);
    if (kind === 'appr') react('alert', 1600);
    if (kind === 'ok' && text.startsWith('✓ filled')) react('dollar', 2200);
    if (kind === 'u' && !reduced) {
      for (let i = 0; i <= text.length; i++) { if (run !== demoRun) return; line.textContent = text.slice(0, i); await sleep(22); }
    } else {
      line.textContent = text;
    }
    await sleep(reduced ? 0 : wait);
  }
}
document.getElementById('replay').addEventListener('click', playDemo);

// ---- install -------------------------------------------------------------------------------
const cmds = {
  win: 'irm https://raw.githubusercontent.com/DoliosAgent/dolios/main/install-dolios.ps1 | iex',
  unix: 'curl -fsSL https://raw.githubusercontent.com/DoliosAgent/dolios/main/install-dolios.sh | bash',
};
const osButtons = document.querySelectorAll('.os-tabs button');
function setOS(os) {
  osButtons.forEach((b) => b.setAttribute('aria-selected', b.dataset.os === os));
  document.getElementById('cmd-text').textContent = cmds[os];
}
osButtons.forEach((b) => b.addEventListener('click', () => setOS(b.dataset.os)));
setOS(/Win/i.test(navigator.userAgent) ? 'win' : 'unix');
const copyBtn = document.getElementById('copy');
copyBtn.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(document.getElementById('cmd-text').textContent); } catch { return; }
  copyBtn.textContent = 'Copied'; copyBtn.classList.add('done'); react('happy', 1500);
  setTimeout(() => { copyBtn.textContent = 'Copy'; copyBtn.classList.remove('done'); }, 1800);
});

// ---- section tracking: rail, mascot expression, demo autoplay ------------------------------
const rail = document.querySelectorAll('.rail a');
let demoPlayed = false;
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    const id = e.target.id;
    rail.forEach((a) => a.classList.toggle('on', a.dataset.rail === id));
    document.body.className = `on-${id}`;
    featuresVisible = id === 'features';
    if (featuresVisible) showFeature(feat); else face(e.target.dataset.expr || 'eyes');
    if (id === 'demo' && !demoPlayed) { demoPlayed = true; playDemo(); }
  }
}, { rootMargin: '-45% 0px -45% 0px' });
document.querySelectorAll('main .section').forEach((s) => io.observe(s));

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
