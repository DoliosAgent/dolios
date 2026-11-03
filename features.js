// Feature explorer: eight interactive demos with illustrative data. Each feature's mount(el, ctx)
// builds its widget and returns a cleanup function. ctx = { react, play, say, toast, open(id, payload) }.

const R = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fmt = (n) => n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${Math.round(n / 1e3)}k`;
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

const NAMES = ['MOONCAT', 'FROGX', 'BONKER', 'WAGMI', 'PEPEX', 'GIGA', 'SNEK', 'TURBO', 'DOGGO', 'NEKO', 'CHAD', 'ZOOM', 'KITTY', 'BRRR', 'GOBLIN'];
const AVS = ['🐱', '🐸', '🐶', '🚀', '🐍', '🦊', '👾', '🐧', '🐼', '🦄', '🍄', '⚡'];
const PADS = ['pump.fun', 'letsbonk', 'fourmeme', 'clanker'];

function mkToken() {
  return { name: pick(NAMES) + (Math.random() < 0.3 ? Math.floor(R(2, 99)) : ''), av: pick(AVS), pad: pick(PADS),
    age: Math.floor(R(1, 40)), mcap: R(40e3, 2.4e6), sm: Math.floor(R(0, 6)), kol: Math.floor(R(0, 4)), dev: R(0, 14) };
}

// ---------------------------------------------------------------------------------------------
const trenches = {
  id: 'trenches', icon: '🛰️', title: 'Scan the trenches', short: 'New launches & trending, by the minute',
  desc: 'Dolios watches new launches and trending tokens across launchpads in real time and filters out the noise for you.',
  bullets: ['New tokens on pump.fun, letsbonk, fourmeme, clanker', 'Trending by 1m / 5m / 1h volume and hot searches',
    'Filter by smart-money count, KOL entries, dev holdings', 'Click any row to vet it in one step'],
  prompt: 'what launched on pump.fun in the last 10 min with smart money in?', expr: 'scan',
  mount(el, ctx) {
    const filters = { sm: false, kol: false, dev: false };
    el.append(h(`<div class="w-toolbar">
      <button class="chip" data-f="sm">Smart money ≥ 2</button><button class="chip" data-f="kol">KOL in</button>
      <button class="chip" data-f="dev">Dev &lt; 5%</button></div>`));
    const table = h(`<table class="w-table"><thead><tr><th>Token</th><th>Age</th><th>MCap</th><th>Smart $</th><th class="hide-sm">KOL</th><th class="hide-sm">Dev</th><th class="hide-sm">Pad</th></tr></thead><tbody></tbody></table>`);
    el.append(table, h(`<p class="w-hint">New launches stream in live · click a token to vet it →</p>`));
    const body = table.tBodies[0];
    let rows = Array.from({ length: 6 }, mkToken);
    const ok = (t) => (!filters.sm || t.sm >= 2) && (!filters.kol || t.kol > 0) && (!filters.dev || t.dev < 5);
    function render(fresh) {
      body.innerHTML = '';
      rows.filter(ok).slice(0, 6).forEach((t, i) => {
        const tr = h(`<tr class="clickable ${fresh && i === 0 ? 'new' : ''}"><td><span class="tok"><span class="av">${t.av}</span>$${t.name}</span></td>
          <td class="mut">${t.age}m</td><td>${fmt(t.mcap)}</td><td class="${t.sm >= 2 ? 'up' : 'mut'}">${t.sm}</td>
          <td class="hide-sm">${t.kol ? '★'.repeat(t.kol) : '<span class="mut">—</span>'}</td>
          <td class="hide-sm ${t.dev > 8 ? 'down' : ''}">${t.dev.toFixed(1)}%</td><td class="hide-sm"><span class="pill">${t.pad}</span></td></tr>`);
        tr.addEventListener('click', () => ctx.open('vet', t));
        body.append(tr);
      });
      if (!body.children.length) body.append(h(`<tr><td colspan="7" class="mut">Nothing matches right now — new launches arrive every few seconds.</td></tr>`));
    }
    el.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => {
      filters[c.dataset.f] = !filters[c.dataset.f]; c.classList.toggle('on'); render(false); ctx.react('scan', 800);
    }));
    render(false);
    const iv = setInterval(() => { const t = mkToken(); t.age = 0; rows.forEach((r) => r.age++); rows.unshift(t); rows = rows.slice(0, 30); render(ok(t)); }, 1800);
    return () => clearInterval(iv);
  },
};

// ---------------------------------------------------------------------------------------------
const SAMPLES = {
  clean: { name: 'MOONCAT', av: '🐱', liq: 186e3, honeypot: false, rug: 0.06, top10: 18, bundle: 3, insider: 2, devSold: 0, copycats: 4 },
  risky: { name: 'FROGX', av: '🐸', liq: 31e3, honeypot: false, rug: 0.38, top10: 41, bundle: 22, insider: 11, devSold: 35, copycats: 9 },
  honeypot: { name: 'RUGME', av: '🍄', liq: 12e3, honeypot: true, rug: 0.91, top10: 78, bundle: 46, insider: 30, devSold: 0, copycats: 1 },
};
function fromTrench(t) {
  const bad = t.dev > 8 || t.sm === 0;
  return { name: t.name, av: t.av, liq: t.mcap * R(0.12, 0.3), honeypot: false, rug: bad ? R(0.25, 0.5) : R(0.03, 0.15),
    top10: bad ? R(30, 50) : R(12, 26), bundle: bad ? R(12, 30) : R(1, 8), insider: bad ? R(8, 20) : R(0, 5), devSold: t.dev > 8 ? R(20, 60) : 0, copycats: Math.floor(R(1, 8)) };
}
const vet = {
  id: 'vet', icon: '🛡️', title: 'Vet every buy', short: 'Contract, liquidity, rug & insider checks',
  desc: 'Before any buy, Dolios resolves the name to the one right contract among its copycats, then runs a full safety check and tells you plainly what is risky.',
  bullets: ['Picks the real contract among same-name copycats', 'Liquidity, honeypot and rug-ratio checks',
    'Top-10 concentration, bundlers, insiders, snipers', 'Dev history: did the creator dump before?'],
  prompt: 'is the $MOONCAT on raydium the real one? any red flags?', expr: 'alert',
  mount(el, ctx, payload) {
    el.append(h(`<div class="w-toolbar"><button class="chip" data-s="clean">🐱 MOONCAT</button><button class="chip" data-s="risky">🐸 FROGX</button><button class="chip" data-s="honeypot">🍄 RUGME</button></div>`));
    const grid = h(`<div class="vet-grid"><svg class="gauge" viewBox="0 0 200 130"><path d="M20 115 A80 80 0 0 1 180 115" fill="none" stroke="#1d2129" stroke-width="16" stroke-linecap="round"/>
      <path id="g-arc" d="M20 115 A80 80 0 0 1 180 115" fill="none" stroke="url(#gg)" stroke-width="16" stroke-linecap="round" stroke-dasharray="252" stroke-dashoffset="252" style="transition:stroke-dashoffset 1s"/>
      <defs><linearGradient id="gg"><stop offset="0" stop-color="#f43f5e"/><stop offset=".5" stop-color="#facc15"/><stop offset="1" stop-color="#34d399"/></linearGradient></defs>
      <text id="g-num" x="100" y="100" text-anchor="middle" font-size="40" font-weight="600" fill="#f1f2f4">–</text><text x="100" y="124" text-anchor="middle" font-size="12" fill="#8f96a1">safety score</text></svg>
      <ul class="vet-list"></ul></div>`);
    const verdict = h(`<div class="verdict">Pick a token to run the checks.</div>`);
    el.append(grid, verdict);
    const list = grid.querySelector('.vet-list');
    let timers = [];
    function run(tk) {
      timers.forEach(clearTimeout); timers = []; list.innerHTML = ''; verdict.className = 'verdict'; verdict.textContent = 'Checking…';
      ctx.react('scan', 2600);
      const checks = [
        ['Right contract', tk.copycats > 1 ? `${tk.copycats - 1} copycats skipped` : 'unique', 0],
        ['Liquidity', fmt(tk.liq), tk.liq < 20e3 ? 2 : tk.liq < 50e3 ? 1 : 0],
        ['Honeypot', tk.honeypot ? 'cannot sell' : 'sell OK', tk.honeypot ? 2 : 0],
        ['Rug ratio', tk.rug.toFixed(2), tk.rug > 0.6 ? 2 : tk.rug > 0.25 ? 1 : 0],
        ['Top-10 holders', `${tk.top10.toFixed(0)}%`, tk.top10 > 60 ? 2 : tk.top10 > 30 ? 1 : 0],
        ['Bundlers', `${tk.bundle.toFixed(0)}% of vol`, tk.bundle > 30 ? 2 : tk.bundle > 10 ? 1 : 0],
        ['Insiders', `${tk.insider.toFixed(0)}% held`, tk.insider > 15 ? 2 : tk.insider > 6 ? 1 : 0],
        ['Dev sold', `${tk.devSold.toFixed(0)}%`, tk.devSold > 30 ? 2 : tk.devSold > 5 ? 1 : 0],
      ];
      const icons = ['<span class="up">✓</span>', '<span class="warn">!</span>', '<span class="down">✗</span>'];
      checks.forEach(([n, v, s]) => list.append(h(`<li>${icons[s]}<span>${n}</span><span class="${['mut', 'warn', 'down'][s]}">${v}</span></li>`)));
      [...list.children].forEach((li, i) => timers.push(setTimeout(() => li.classList.add('done'), 180 * (i + 1))));
      let score = 100 - checks.reduce((a, c) => a + [0, 9, 26][c[2]], 0);
      if (tk.honeypot) score = Math.min(score, 8);
      score = Math.max(0, Math.round(score));
      timers.push(setTimeout(() => {
        grid.querySelector('#g-arc').style.strokeDashoffset = String(252 * (1 - score / 100));
        grid.querySelector('#g-num').textContent = score;
        const [cls, text, face] = score >= 70 ? ['good', `$${tk.name} looks clean. Small size is reasonable — suggest a -30% stop.`, 'happy']
          : score >= 40 ? ['mid', `$${tk.name} is tradeable but risky: ${checks.filter((c) => c[2]).map((c) => c[0].toLowerCase()).slice(0, 2).join(' and ')}. Keep it tiny.`, 'curious']
            : ['bad', `Avoid $${tk.name}. ${tk.honeypot ? 'It is a honeypot — you could not sell.' : 'Too many red flags.'}`, 'alert'];
        verdict.className = `verdict ${cls}`; verdict.textContent = text; ctx.react(face, 1800);
        if (cls === 'bad') ctx.play('shake'); else if (cls === 'good') ctx.play('nod');
      }, 180 * (checks.length + 1)));
      el.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c.dataset.s === tk._key));
    }
    el.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => run({ ...SAMPLES[c.dataset.s], _key: c.dataset.s })));
    run(payload ? fromTrench(payload) : { ...SAMPLES.clean, _key: 'clean' });
    return () => timers.forEach(clearTimeout);
  },
};

// ---------------------------------------------------------------------------------------------
const smart = {
  id: 'smart', icon: '🧠', title: 'Follow smart money', short: 'Live Smart Money & KOL flows',
  desc: 'See what proven wallets are buying and selling right now — Smart Money, KOLs and the wallets you follow — before the chart moves.',
  bullets: ['Live buys/sells from Smart Money and KOL wallets', 'Your own followed wallets, in one feed', 'Net flow per token so you see where money goes', 'Alerts when several smart wallets enter together'],
  prompt: 'which smart money wallets bought in the last 30 min?', expr: 'eyes',
  mount(el, ctx) {
    let src = 'all';
    el.append(h(`<div class="w-toolbar"><button class="chip on" data-k="all">All</button><button class="chip" data-k="Smart">🧠 Smart Money</button><button class="chip" data-k="KOL">⭐ KOL</button><button class="chip" data-k="Following">👁 Following</button></div>`));
    const feed = h(`<ul class="feed"></ul>`), flow = h(`<div class="flow"></div>`);
    el.append(feed, h(`<p class="w-hint" style="margin-top:14px;padding:0">Net flow (last 5 min)</p>`), flow);
    const toks = ['MOONCAT', 'GIGA', 'SNEK', 'TURBO'], net = Object.fromEntries(toks.map((t) => [t, R(-3, 6)]));
    el.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => {
      src = c.dataset.k; el.querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x === c)); feed.innerHTML = '';
    }));
    function tick() {
      const kind = pick(['Smart', 'KOL', 'Following']);
      const tk = pick(toks), buy = Math.random() < (net[tk] > 0 ? 0.7 : 0.4), size = R(0.3, 12);
      net[tk] += buy ? size * 0.3 : -size * 0.3;
      if (src === 'all' || src === kind) {
        const icon = { Smart: '🧠', KOL: '⭐', Following: '👁' }[kind];
        feed.prepend(h(`<li><span class="mono mut">${icon} ${kind === 'Following' ? 'You follow' : kind}</span><span>${buy ? 'bought' : 'sold'} <b>$${tk}</b></span><span class="${buy ? 'up' : 'down'}">${buy ? '+' : '−'}${size.toFixed(1)} SOL</span><span class="mut hide-sm">now</span></li>`));
        while (feed.children.length > 7) feed.lastChild.remove();
      }
      const max = Math.max(...Object.values(net).map(Math.abs), 1);
      flow.innerHTML = toks.map((t) => {
        const v = net[t], w = (Math.abs(v) / max) * 50;
        return `<div class="flow-row"><span class="mono">$${t}</span><div class="bar"><i style="left:${v >= 0 ? 50 : 50 - w}%;width:${w}%;background:${v >= 0 ? '#34d399' : '#f43f5e'}"></i></div><span class="mono ${v >= 0 ? 'up' : 'down'}">${v >= 0 ? '+' : ''}${v.toFixed(1)}</span></div>`;
      }).join('');
    }
    for (let i = 0; i < 5; i++) tick();
    const iv = setInterval(tick, 1300);
    return () => clearInterval(iv);
  },
};

// ---------------------------------------------------------------------------------------------
const WALLETS = {
  sniper: { label: '4Nd1…mBZ', vals: [88, 71, 34, 95, 52], badges: ['Sniper', 'Fast in/out', 'Pump.fun native'], copy: 34, verdict: 'Great trader, hard to copy: enters within seconds. You would mostly buy after its pump.' },
  swing: { label: '9xQe…7Lp', vals: [74, 64, 82, 48, 86], badges: ['Swing trader', 'Cuts losses', 'Diamond hands'], copy: 81, verdict: 'Worth following: holds hours to days, clean exits, entries you can actually get filled at.' },
  degen: { label: 'Bz3k…Q2a', vals: [38, 41, 58, 70, 22], badges: ['Gambler', 'Never sells losers', 'Wash-trade flag'], copy: 12, verdict: 'Skip: recent P&L is luck on two coins and it never cuts losers.' },
};
const wallet = {
  id: 'wallet', icon: '🎯', title: 'Score any wallet', short: 'Is this wallet worth copying?',
  desc: 'Paste any wallet and Dolios scores its real track record and whether you could actually copy it — with latency, slippage and gas in mind.',
  bullets: ['Profitability, win rate and recent form', 'Copy-tradeability backtest: can you get filled?', 'Style tags: sniper, swing, diamond hands…', 'Wash-trade and luck detection'],
  prompt: 'score 9xQe…7Lp and tell me if it’s worth copying', expr: 'scan',
  mount(el, ctx) {
    el.append(h(`<div class="w-toolbar"><button class="chip" data-w="sniper">4Nd1…mBZ</button><button class="chip" data-w="swing">9xQe…7Lp</button><button class="chip" data-w="degen">Bz3k…Q2a</button></div>`));
    const axes = ['Profit', 'Win rate', 'Copyable', 'Speed', 'Discipline'];
    const wrap = h(`<div class="radar-wrap"><svg viewBox="0 0 260 240" width="260" height="240"></svg><div class="wallet-info"></div></div>`);
    el.append(wrap);
    const svg = wrap.querySelector('svg'), info = wrap.querySelector('.wallet-info');
    const cx = 130, cy = 122, rr = 88;
    const pt = (i, v) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; return [cx + Math.cos(a) * rr * v, cy + Math.sin(a) * rr * v]; };
    let grid = '';
    [0.25, 0.5, 0.75, 1].forEach((s) => { grid += `<polygon points="${axes.map((_, i) => pt(i, s).join(',')).join(' ')}" fill="none" stroke="#232831"/>`; });
    axes.forEach((a, i) => { const [x, y] = pt(i, 1.18); grid += `<text x="${x}" y="${y}" fill="#8f96a1" font-size="11" text-anchor="middle" dominant-baseline="middle">${a}</text>`; });
    svg.innerHTML = grid + `<polygon id="rp" points="${axes.map((_, i) => pt(i, 0).join(',')).join(' ')}" fill="rgba(52,211,153,0.25)" stroke="#34d399" stroke-width="2" style="transition:all .7s"/>`;
    function show(k) {
      const w = WALLETS[k];
      el.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c.dataset.w === k));
      svg.querySelector('#rp').setAttribute('points', w.vals.map((v, i) => pt(i, v / 100).join(',')).join(' '));
      info.innerHTML = `<div class="mono mut">${w.label}</div><div class="badges">${w.badges.map((b) => `<span class="badge">${b}</span>`).join('')}</div>
        <div style="font-size:13px" class="mut">Copy-tradeability</div><div class="meter"><i style="width:0%"></i></div><div class="mono">${w.copy}/100</div>
        <p style="margin:12px 0 0;font-size:14.5px">${w.verdict}</p>`;
      requestAnimationFrame(() => { info.querySelector('.meter i').style.width = w.copy + '%'; });
      ctx.react(w.copy > 70 ? 'star' : w.copy > 30 ? 'curious' : 'alert', 1500);
    }
    el.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => show(c.dataset.w)));
    show('swing');
    return () => {};
  },
};

// ---------------------------------------------------------------------------------------------
function candles(kind, n = 48) {
  const out = []; let p = 100;
  for (let i = 0; i < n; i++) {
    const x = i / n;
    const drift = { uptrend: 0.9, distribution: x < 0.6 ? 1.4 : -0.2, bounce: x < 0.55 ? -1.2 : 1.3, chop: Math.sin(i / 2.5) * 0.9 }[kind];
    const o = p, c = Math.max(5, o + drift + R(-2.2, 2.2) + (kind === 'distribution' && x > 0.6 ? Math.sin(i) * 2 : 0));
    out.push({ o, c, hi: Math.max(o, c) + R(0.2, 2), lo: Math.min(o, c) - R(0.2, 2) }); p = c;
  }
  return out;
}
const PATTERNS = {
  '1m': ['chop', 'Wide chop', 41, 'No trend on 1m — wait for a range break.'],
  '5m': ['bounce', 'Bounce off the lows', 63, 'Buyers defended the low twice; momentum turning up.'],
  '15m': ['uptrend', 'Uptrend channel', 78, 'Higher highs and higher lows inside a clean channel.'],
  '1h': ['distribution', 'Distribution at highs', 29, 'Volume fading at the top while big wallets sell — careful.'],
};
function drawCandles(cv, data, overlay) {
  const dpr = Math.min(devicePixelRatio || 1, 2), W = cv.clientWidth, H = cv.clientHeight;
  cv.width = W * dpr; cv.height = H * dpr; const c = cv.getContext('2d'); c.scale(dpr, dpr);
  c.clearRect(0, 0, W, H);
  const lo = Math.min(...data.map((d) => d.lo)), hi = Math.max(...data.map((d) => d.hi));
  const y = (v) => H - 16 - ((v - lo) / (hi - lo)) * (H - 32), bw = W / data.length;
  c.strokeStyle = '#161a21'; for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(0, (H * i) / 5); c.lineTo(W, (H * i) / 5); c.stroke(); }
  data.forEach((d, i) => {
    const up = d.c >= d.o; c.strokeStyle = c.fillStyle = up ? '#34d399' : '#f43f5e';
    const x = i * bw + bw / 2; c.beginPath(); c.moveTo(x, y(d.hi)); c.lineTo(x, y(d.lo)); c.stroke();
    c.fillRect(x - bw * 0.32, Math.min(y(d.o), y(d.c)), bw * 0.64, Math.max(1.5, Math.abs(y(d.o) - y(d.c))));
  });
  if (overlay) {
    c.setLineDash([6, 5]); c.lineWidth = 2; c.strokeStyle = '#a78bfa';
    const first = data[0], last = data[data.length - 1];
    c.beginPath(); c.moveTo(0, y(first.lo)); c.lineTo(W, y(last.lo)); c.stroke();
    c.beginPath(); c.moveTo(0, y(first.hi + 3)); c.lineTo(W, y(last.hi + 3)); c.stroke();
    c.setLineDash([]); c.lineWidth = 1;
  }
}
const chart = {
  id: 'chart', icon: '📈', title: 'Read the chart', short: 'K-lines classified into patterns',
  desc: 'Dolios reads candles from 1m to 1d and names what it sees — channel, breakdown, bounce, distribution — with a score you can act on.',
  bullets: ['K-lines from 1-minute to daily', 'Named patterns with a 0–100 score', 'Volume and big-wallet context', 'Plain-English “what to do now”'],
  prompt: 'what is the 15m chart of $MOONCAT doing right now?', expr: 'eyes',
  mount(el, ctx) {
    el.append(h(`<div class="w-toolbar">${Object.keys(PATTERNS).map((k) => `<button class="chip" data-tf="${k}">${k}</button>`).join('')}<button class="chip" data-a="1">✦ Analyze</button></div>`));
    const cv = h(`<canvas class="w-canvas"></canvas>`), label = h(`<div class="pattern-label mut">Pick a timeframe, then hit Analyze.</div>`);
    el.append(cv, label);
    let tf = '15m', data = candles(PATTERNS[tf][0]);
    const sel = () => el.querySelectorAll('[data-tf]').forEach((c) => c.classList.toggle('on', c.dataset.tf === tf));
    const draw = (ov) => drawCandles(cv, data, ov);
    el.querySelectorAll('[data-tf]').forEach((c) => c.addEventListener('click', () => {
      tf = c.dataset.tf; data = candles(PATTERNS[tf][0]); sel(); draw(false); label.className = 'pattern-label mut'; label.textContent = `${tf} candles loaded — hit Analyze.`;
    }));
    el.querySelector('[data-a]').addEventListener('click', () => {
      const [, name, score, note] = PATTERNS[tf]; draw(true);
      label.className = 'pattern-label';
      label.innerHTML = `<b>${name}</b> · score <span class="${score >= 60 ? 'up' : score >= 40 ? 'warn' : 'down'}">${score}/100</span><br><span class="mut">${note}</span>`;
      ctx.react(score >= 60 ? 'happy' : score >= 40 ? 'curious' : 'alert', 1600);
    });
    sel(); requestAnimationFrame(() => draw(false));
    const onR = () => draw(false); addEventListener('resize', onR);
    return () => removeEventListener('resize', onR);
  },
};

// ---------------------------------------------------------------------------------------------
const trade = {
  id: 'trade', icon: '🔐', title: 'Trade with guardrails', short: 'You approve every order',
  desc: 'Dolios sizes the trade, restates it in one line and waits. Nothing is sent to GMGN until you approve that exact order — even in yolo mode.',
  bullets: ['Buys, sells, percentage sells', 'Restated in one line before execution', 'Approval per exact command — never blanket', 'Respects your own rules (e.g. max size)'],
  prompt: 'buy 0.5 SOL of $MOONCAT with a -30% stop loss', expr: 'dollar',
  mount(el, ctx) {
    const st = { side: 'BUY', amt: 0.5, slip: 15, sl: true };
    el.append(h(`<div class="ticket">
      <div class="seg"><button class="chip on" data-side="BUY">Buy</button><button class="chip" data-side="SELL">Sell</button><span class="pill" style="margin-left:auto">🐱 $MOONCAT · sol</span></div>
      <label class="field">Amount: <b class="mono" id="t-amt">0.50 SOL</b><input type="range" min="0.05" max="3" step="0.05" value="0.5" id="t-range"></label>
      <div class="seg"><span class="mut" style="font-size:13px;align-self:center">Slippage</span>${[5, 10, 15, 25].map((s) => `<button class="chip ${s === 15 ? 'on' : ''}" data-slip="${s}">${s}%</button>`).join('')}
        <button class="chip on" data-sl="1" style="margin-left:auto">SL −30%</button></div>
      <div class="rule-warn" id="t-warn" hidden>⚠ Above your saved rule: max 1 SOL per meme.</div>
      <button class="btn-primary" id="t-go" style="border:0;cursor:pointer">Ask Dolios to place it</button>
      <div id="t-flow" style="display:grid;gap:10px"></div></div>`));
    const $ = (s) => el.querySelector(s), flow = $('#t-flow');
    const upd = () => { $('#t-amt').textContent = `${st.amt.toFixed(2)} SOL`; $('#t-warn').hidden = !(st.side === 'BUY' && st.amt > 1); flow.innerHTML = ''; };
    $('#t-range').addEventListener('input', (e) => { st.amt = +e.target.value; upd(); });
    el.querySelectorAll('[data-side]').forEach((b) => b.addEventListener('click', () => { st.side = b.dataset.side; el.querySelectorAll('[data-side]').forEach((x) => x.classList.toggle('on', x === b)); upd(); }));
    el.querySelectorAll('[data-slip]').forEach((b) => b.addEventListener('click', () => { st.slip = +b.dataset.slip; el.querySelectorAll('[data-slip]').forEach((x) => x.classList.toggle('on', x === b)); upd(); }));
    $('[data-sl]').addEventListener('click', (e) => { st.sl = !st.sl; e.currentTarget.classList.toggle('on', st.sl); upd(); });
    $('#t-go').addEventListener('click', () => {
      const line = `${st.side} ${st.amt.toFixed(2)} SOL of $MOONCAT (7xKX…pump) on sol, slippage ${st.slip}%${st.sl && st.side === 'BUY' ? ', SL -30%' : ''}`;
      flow.innerHTML = '';
      flow.append(h(`<div class="restate">${line}</div>`));
      const ap = h(`<div class="approval">⚠ GMGN trade: ${st.side === 'BUY' ? 'swap' : 'sell'} (moves funds from your wallet)<div class="mono" style="font-size:12px;margin-top:6px;opacity:.8">gmgn-cli swap --chain sol --amount ${st.amt.toFixed(2)} --slippage ${st.slip} …</div>
        <div class="row"><button class="btn-ok">Approve once</button><button class="btn-no">Deny</button></div></div>`);
      flow.append(ap); ctx.react('alert', 1500);
      ap.querySelector('.btn-ok').addEventListener('click', () => {
        ap.remove(); const toks = Math.round(st.amt / 0.000000389);
        flow.append(h(`<div class="result">✓ Filled: ${st.amt.toFixed(2)} SOL → ${toks.toLocaleString()} $MOONCAT @ $0.000389${st.sl && st.side === 'BUY' ? ' · stop-loss order created' : ''}</div>`));
        ctx.react('dollar', 2200); ctx.play('jump'); ctx.say('Order filled. I’ll watch the stop for you.');
      });
      ap.querySelector('.btn-no').addEventListener('click', () => {
        ap.remove(); flow.append(h(`<div class="result cancel">Cancelled — nothing was sent to GMGN.</div>`)); ctx.react('wink', 1200);
      });
    });
    return () => {};
  },
};

// ---------------------------------------------------------------------------------------------
const exits = {
  id: 'exits', icon: '🎚️', title: 'TP, SL & trailing', short: 'Exits that run while you sleep',
  desc: 'Attach take-profit, stop-loss or trailing exits to any position in plain English. Drag the lines below and watch them trigger.',
  bullets: ['Take-profit and stop-loss at fixed prices', 'Trailing stop that rides the peak', 'Sell by percentage (e.g. half at 2x)', 'Limit orders that wait for your price'],
  prompt: 'sell half at 2x and trail the rest with a 20% stop', expr: 'dollar',
  mount(el, ctx) {
    el.append(h(`<div class="w-toolbar"><button class="chip on" data-trail="1">Trailing 20%</button><button class="chip" data-replay="1">↻ Replay</button></div>`));
    const cv = h(`<canvas class="w-canvas"></canvas>`), label = h(`<div class="pattern-label mut">Drag the green (TP) and red (SL) lines.</div>`);
    el.append(cv, label);
    let tp = 1.9, sl = 0.72, trail = true, path = [], i = 0, done = null, peak = 1, drag = null, raf = 0;
    const gen = () => { path = [1]; let p = 1; const up = Math.random() < 0.6; for (let k = 1; k < 220; k++) { p *= 1 + R(-0.035, 0.04) + (up ? 0.004 : -0.002) * Math.sin(k / 40); path.push(Math.max(0.3, p)); } i = 0; done = null; peak = 1; };
    gen();
    const yOf = (v, H) => H - 20 - ((v - 0.4) / (2.4 - 0.4)) * (H - 40);
    const vOf = (yy, H) => 0.4 + ((H - 20 - yy) / (H - 40)) * 2.0;
    function draw() {
      const dpr = Math.min(devicePixelRatio || 1, 2), W = cv.clientWidth, H = cv.clientHeight;
      if (cv.width !== W * dpr) { cv.width = W * dpr; cv.height = H * dpr; }
      const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
      const line = (v, col, txt) => { const yy = yOf(v, H); c.strokeStyle = col; c.setLineDash([6, 5]); c.beginPath(); c.moveTo(0, yy); c.lineTo(W, yy); c.stroke(); c.setLineDash([]); c.fillStyle = col; c.font = '12px JetBrains Mono'; c.fillText(txt, 8, yy - 6); };
      line(1, '#3a404b', 'entry 1.00x');
      line(tp, '#34d399', `TP ${tp.toFixed(2)}x`); line(sl, '#f43f5e', `SL ${sl.toFixed(2)}x`);
      if (trail) line(peak * 0.8, '#a78bfa', `trail ${(peak * 0.8).toFixed(2)}x`);
      c.strokeStyle = '#f1f2f4'; c.lineWidth = 2; c.beginPath();
      for (let k = 0; k <= i; k++) { const x = (k / (path.length - 1)) * W; const yy = yOf(path[k], H); k ? c.lineTo(x, yy) : c.moveTo(x, yy); } c.stroke(); c.lineWidth = 1;
      if (done) { const x = (i / (path.length - 1)) * W; c.fillStyle = done.col; c.beginPath(); c.arc(x, yOf(path[i], H), 7, 0, 7); c.fill(); }
    }
    function loop() {
      raf = requestAnimationFrame(loop);
      if (!done && i < path.length - 1) {
        i++; const v = path[i]; peak = Math.max(peak, v);
        if (v >= tp) done = { col: '#34d399', t: `Take-profit hit at ${v.toFixed(2)}x — sold.`, f: 'dollar' };
        else if (v <= sl) done = { col: '#f43f5e', t: `Stop-loss hit at ${v.toFixed(2)}x — loss capped.`, f: 'alert' };
        else if (trail && peak > 1.15 && v <= peak * 0.8) done = { col: '#a78bfa', t: `Trailing stop at ${v.toFixed(2)}x (peak ${peak.toFixed(2)}x) — profit locked.`, f: 'happy' };
        if (done) { label.className = 'pattern-label'; label.textContent = done.t; ctx.react(done.f, 1800); }
      } else if (!done && i >= path.length - 1) { label.textContent = 'No exit triggered — position still open.'; done = { col: '#8f96a1' }; }
      draw();
    }
    cv.addEventListener('pointerdown', (e) => { const r = cv.getBoundingClientRect(), H = cv.clientHeight, yy = e.clientY - r.top;
      drag = Math.abs(yy - yOf(tp, H)) < Math.abs(yy - yOf(sl, H)) ? 'tp' : 'sl'; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', (e) => { if (!drag) return; const r = cv.getBoundingClientRect(), v = vOf(e.clientY - r.top, cv.clientHeight);
      if (drag === 'tp') tp = Math.min(2.35, Math.max(1.05, v)); else sl = Math.max(0.42, Math.min(0.97, v)); });
    cv.addEventListener('pointerup', () => { drag = null; });
    el.querySelector('[data-trail]').addEventListener('click', (e) => { trail = !trail; e.currentTarget.classList.toggle('on', trail); });
    el.querySelector('[data-replay]').addEventListener('click', () => { gen(); label.className = 'pattern-label mut'; label.textContent = 'Replaying a new price path…'; });
    loop();
    return () => cancelAnimationFrame(raf);
  },
};

// ---------------------------------------------------------------------------------------------
const memory = {
  id: 'memory', icon: '💾', title: 'Remembers you', short: 'Your rules, across sessions',
  desc: 'Tell Dolios your rules once — position limits, chains, exit habits — and it applies them every time, in the terminal, Telegram or Discord.',
  bullets: ['Persistent memory across sessions', 'Applies your risk rules automatically', 'Learns reusable skills from your workflows', 'Works from terminal, Telegram, Discord'],
  prompt: 'remember: never more than 1 SOL per meme', expr: 'happy',
  mount(el, ctx) {
    const rules = new Set(['Never more than 1 SOL per meme']);
    el.append(h(`<div class="w-toolbar"><button class="chip" data-r="Only trade on Solana">+ Only Solana</button><button class="chip" data-r="Always set a -30% stop">+ Always -30% SL</button><button class="chip" data-r="Skip tokens with bundlers above 15%">+ Bundlers &lt; 15%</button></div>`));
    const chat = h(`<div class="chat"></div>`), mem = h(`<div class="memory"><h4>Dolios memory</h4><ul></ul></div>`);
    const tryBtn = h(`<button class="btn-ghost mono" style="margin-top:12px">Try: “buy 2 SOL of $FROGX on base”</button>`);
    el.append(chat, tryBtn, mem);
    const msg = (who, t) => { chat.append(h(`<div class="msg ${who}">${t}</div>`)); chat.scrollTop = chat.scrollHeight; };
    const renderMem = () => { const ul = mem.querySelector('ul'); ul.innerHTML = ''; rules.forEach((r) => { const li = h(`<li><span>✓ ${r}</span><button aria-label="Forget">×</button></li>`); li.querySelector('button').onclick = () => { rules.delete(r); renderMem(); ctx.react('curious', 900); }; ul.append(li); }); };
    msg('u', 'remember: never more than 1 SOL per meme'); msg('d', 'Saved. I’ll cap every meme buy at 1 SOL unless you say otherwise.');
    el.querySelectorAll('[data-r]').forEach((b) => b.addEventListener('click', () => { rules.add(b.dataset.r); msg('u', `remember: ${b.dataset.r.toLowerCase()}`); msg('d', 'Got it — saved to memory.'); renderMem(); ctx.react('happy', 1000); ctx.play('nod'); }));
    tryBtn.addEventListener('click', () => {
      msg('u', 'buy 2 SOL of $FROGX on base');
      const notes = [];
      if ([...rules].some((r) => r.includes('1 SOL'))) notes.push('your limit is 1 SOL per meme');
      if (rules.has('Only trade on Solana')) notes.push('you asked me to stay on Solana');
      if (rules.has('Skip tokens with bundlers above 15%')) notes.push('$FROGX has 22% bundler volume');
      msg('d', notes.length ? `Hold on — ${notes.join(', and ')}. Want me to ${rules.has('Only trade on Solana') ? 'look for a Solana alternative' : 'buy 1 SOL instead'}?` : 'Vetting $FROGX first, then I’ll restate the order for your approval.');
      ctx.react(notes.length ? 'wink' : 'scan', 1500);
    });
    renderMem();
    return () => {};
  },
};

export const FEATURES = [trenches, vet, smart, wallet, chart, trade, exits, memory];
