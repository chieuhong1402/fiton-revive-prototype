/* FitOn Revive — HTML prototype renderer. Renders Figma-extracted layout trees as real HTML/CSS. */
(() => {
  const PHONE_W = 375, PHONE_H = 812;
  const $ = (s, el = document) => el.querySelector(s);
  let IDX = null; // index.json
  const cache = new Map();
  const state = { cur: null, hist: [], hot: false };

  const FONT = f => {
    if (/poppins/i.test(f)) return "'Poppins', sans-serif";
    if (/aktiv/i.test(f)) return "'Inter', 'Helvetica Neue', Arial, sans-serif";
    if (/^SF/i.test(f)) return "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
    if (/urbanist/i.test(f)) return "'Urbanist', 'Inter', sans-serif";
    return `'${f}', 'Inter', sans-serif`;
  };
  const DATA = {}; const packLoads = {};
  const asset = id => !id ? null : IDX.packs ? (DATA[id] || null) : (IDX.assets[id] ? `a/${id}.${IDX.assets[id]}` : null);
  async function loadPack(k) { if (!packLoads[k]) packLoads[k] = fetch(IDX.packs[k]).then(r => r.json()).then(j => { Object.assign(DATA, j.assets); for (const id in j.screens) cache.set(id, { id, root: j.screens[id] }); }); return packLoads[k]; }
  const JA = { MIN: 'flex-start', CENTER: 'center', MAX: 'flex-end', SPACE_BETWEEN: 'space-between', BASELINE: 'baseline' };
  const BACK_RE = /^(Icon_left|Back|Close|Close Button|Icon\/x-close|arrow-narrow-left|Icons\/Close back|chevron-left|x-close)$/i;
  const TOP_RE = /^(TopBar|Header|Top bar|Topbar|Status|UI Bars|Nav|Navigation)/i;
  const BOT_RE = /(Tabbar|Tab Bar|Footer|CTA|Home Indicator|Home indicator|Safari - Bottom|Bottom bar|Bottom)/i;
  const EXCL_RE = /radio|tab|segment/i;
  const SOFT_RE = /^(Checkbox button|Date chip|Chip|_Tab Bar Button - iPad - Text)$/;
  const isOn = el => el.classList.contains('sel') || (!el.classList.contains('unsel') && /(^|[ ,=])(Selected|Active|True)(,|$)|State=Selected|Selected=True|Selected=Yes/.test(el.dataset.cn || '') && !/Not selected/i.test(el.dataset.cn || ''));
  function softToggle(el) {
    const multi = /all that apply|select all/i.test($('#screen').textContent);
    const turnOn = !isOn(el);
    if (turnOn && !multi) { let g = el.parentElement; for (let i = 0; i < 4 && g; i++, g = g.parentElement) { const peers = [...g.querySelectorAll('[data-cs]')].filter(p => p !== el && p.dataset.cs === el.dataset.cs); if (peers.length) { peers.forEach(p => { if (isOn(p)) { p.classList.remove('sel'); p.classList.add('unsel'); } }); break; } } }
    el.classList.toggle('sel', turnOn); el.classList.toggle('unsel', !turnOn);
  }

  function boxShadow(n) {
    const sh = [];
    if (n.sc && n.sw) {
      const [t, r, b, l] = n.sw; const inset = n.sa !== 'OUTSIDE';
      if (t === r && r === b && b === l) sh.push(`${inset ? 'inset ' : ''}0 0 0 ${t}px ${n.sc}`);
      else { const s = inset ? 'inset ' : '';
        if (t) sh.push(`${s}0 ${inset ? t : -t}px 0 0 ${n.sc}`); if (b) sh.push(`${s}0 ${inset ? -b : b}px 0 0 ${n.sc}`);
        if (l) sh.push(`${s}${inset ? l : -l}px 0 0 0 ${n.sc}`); if (r) sh.push(`${s}${inset ? -r : r}px 0 0 0 ${n.sc}`); }
    }
    if (n.fx) sh.push(...n.fx);
    return sh.join(',');
  }
  function bgCss(list) {
    const layers = [];
    for (const p of list.slice().reverse()) {
      if (p.c) layers.push(`linear-gradient(${p.c},${p.c})`);
      else if (p.g) layers.push(p.g);
      else if (p.img) { const u = asset(p.img); if (u) layers.push(`url("${u}") center / 100% 100% no-repeat`); }
    }
    return layers.join(',');
  }

  // ctx: {al:'H'|'V'|null, pw, ph}
  function render(n, ctx) {
    let el;
    if (n.k === 't') el = renderText(n);
    else if (n.k === 's' || n.k === 'p') { el = document.createElement('img'); const u = asset(n.a); if (u) el.src = u; el.alt = ''; el.draggable = false; el.className = 'ic'; }
    else el = document.createElement('div');
    const st = el.style;
    if (n.k === 'l') { st.background = n.lc; if (n.h < 1) n.h = n.lw || 1; if (n.w < 1) n.w = n.lw || 1; if (n.dash) { st.background = 'none'; st.borderTop = `${n.lw || 1}px dashed ${n.lc}`; } }
    // positioning + sizing
    const inAL = ctx.al && !n.abs;
    if (!inAL) {
      st.position = 'absolute'; st.left = n.x + 'px'; st.top = n.y + 'px';
      if (!(n.k === 't' && n.ar === 'WIDTH_AND_HEIGHT')) st.width = n.w + 'px';
      if (!(n.k === 't' && n.ar !== 'NONE' && n.ar !== 'TRUNCATE')) st.height = n.h + 'px';
      if (n.k === 't' && n.ar === 'WIDTH_AND_HEIGHT') { st.minWidth = n.w + 'px'; if (n.ah === 'CENTER') { st.width = n.w + 'px'; } if (n.ah === 'RIGHT') { st.width = n.w + 'px'; } }
    } else {
      st.position = 'relative';
      const H = ctx.al === 'H';
      const pS = H ? n.sh : n.sv, cS = H ? n.sv : n.sh;
      const pDim = H ? 'width' : 'height', cDim = H ? 'height' : 'width';
      const pv = H ? n.w : n.h, cv = H ? n.h : n.w;
      if (ctx.scroll && H) { st.flex = '0 0 auto'; st.width = pv + 'px'; }
      else if ((pS === 'FILL' || n.gr) && ctx.hug) { st.flexShrink = '0'; if (n.k !== 't') st[pDim] = pv + 'px'; }
      else if (pS === 'FILL' || n.gr) { st.flex = '1 1 0'; st[H ? 'minWidth' : 'minHeight'] = '0'; }
      else if (pS === 'HUG' && n.k !== 's' && n.k !== 'p') { st.flexShrink = '0'; }
      else { st[pDim] = pv + 'px'; st.flexShrink = '0'; }
      if (cS === 'FILL' || n.st) st.alignSelf = 'stretch';
      else if (cS === 'HUG' && n.k !== 's' && n.k !== 'p') { }
      else st[cDim] = cv + 'px';
      if (n.k === 't' && n.sh === 'HUG') st.whiteSpace = 'pre';
    }
    if (n.op !== undefined) st.opacity = n.op;
    if (n.k === 'f') {
      if (n.bg) { if (n.bg.length === 1 && n.bg[0].c) st.backgroundColor = n.bg[0].c; else st.background = bgCss(n.bg); }
      if (n.rad !== undefined) st.borderRadius = Array.isArray(n.rad) ? n.rad.map(v => v + 'px').join(' ') : n.rad + 'px';
      if (n.el) st.borderRadius = '50%';
      if (n.dash && n.sc) { st.outline = `${n.sw[0] || 1}px dashed ${n.sc}`; st.outlineOffset = `-${n.sw[0] || 1}px`; }
      const bs = boxShadow(n.dash ? Object.assign({}, n, { sc: null }) : n); if (bs) st.boxShadow = bs;
      if (n.clip) st.overflow = 'hidden';
      if (n.bbl) st.backdropFilter = st.webkitBackdropFilter = `blur(${n.bbl / 2}px)`;
      if (n.lm === 'G') {
        // Figma grid layout: place children at their measured positions inside a relative box
        if (n.p) st.padding = '0';
        const cctx0 = { al: null, pw: n.w, ph: n.h };
        if (inAL) { const H = ctx.al === 'H'; if ((H ? n.sv : n.sh) !== 'FIXED' || true) st[H ? 'height' : 'height'] = n.h + 'px'; }
        for (const c of n.ch || []) { const ce = render(Object.assign({}, c, { abs: 1 }), cctx0); if (ce) el.appendChild(ce); }
        el.style.position = el.style.position || 'relative';
      } else if (n.lm) {
        st.display = 'flex'; st.flexDirection = n.lm === 'H' ? 'row' : 'column';
        if (n.pa === 'SPACE_BETWEEN') st.justifyContent = 'space-between'; else { st.justifyContent = JA[n.pa] || 'flex-start'; st.gap = (n.g || 0) + 'px'; }
        if (n.lm === 'H' && n.pa !== 'SPACE_BETWEEN') st.columnGap = (n.g || 0) + 'px';
        st.alignItems = JA[n.ca] || 'flex-start';
        if (n.p) {
          const p = n.p.slice(); const flow = (n.ch || []).filter(c => !c.abs); const gaps = (n.g || 0) * Math.max(0, flow.length - 1);
          const H = n.lm === 'H';
          const mainSum = flow.reduce((s, c) => s + (H ? c.w : c.h), 0) + gaps, crossMax = flow.reduce((m, c) => Math.max(m, H ? c.h : c.w), 0);
          const fitAxis = (a, b, size, content) => { if (p[a] + p[b] > size + 0.5) { const av = Math.max(0, size - content); const tot = p[a] + p[b] || 1; const ka = p[a] / tot; p[a] = av * ka; p[b] = av * (1 - ka); } };
          fitAxis(3, 1, n.w, H ? mainSum : crossMax); fitAxis(0, 2, n.h, H ? crossMax : mainSum);
          st.padding = p.map(v => Math.round(v * 2) / 2 + 'px').join(' ');
        }
        if (n.wr) { st.flexWrap = 'wrap'; st.rowGap = (n.cg || 0) + 'px'; st.alignContent = 'flex-start'; }
        // horizontal overflow => scroller
        const childExtent = (n.ch || []).filter(c => !c.abs).reduce((s, c) => s + c.w, 0) + (n.g || 0) * Math.max(0, (n.ch || []).length - 1) + (n.p ? n.p[1] + n.p[3] : 0);
        if (n.lm === 'H' && !n.wr && (n.ov === 'H' || n.ov === 'B' || n.w > ctx.pw + 1 || (n.clip && childExtent > n.w + 2))) {
          el.classList.add('hscroll');
          if (n.w > ctx.pw + 1 || n.w > ctx.pw - (ctx.pl || 0) - (ctx.pr || 0) + 1) { if (!inAL) st.width = Math.max(40, ctx.pw - Math.max(0, n.x)) + 'px'; else { bleed(st, ctx, n); } }
          st.overflowX = 'auto'; st.overflowY = 'hidden';
        }
        if (n.lm === 'V' && (n.ov === 'V' || n.ov === 'B')) st.overflowY = 'auto';
      }
      if (n.lm !== 'G') { const cctx = { al: n.lm || null, pw: n.w, ph: n.h, pl: n.p ? n.p[3] : 0, pr: n.p ? n.p[1] : 0, hug: (n.lm === 'V' ? n.sv : n.sh) === 'HUG', scroll: el.classList.contains('hscroll') };
      for (const c of n.ch || []) { const ce = render(c, cctx); if (ce) el.appendChild(ce); } }
    }
    if (n.k === 'f' && !n.lm && inAL && ctx.al === 'V' && n.w > ctx.pw - (ctx.pl || 0) - (ctx.pr || 0) + 1 && (n.ch || []).length) { el.classList.add('hscroll'); bleed(st, ctx, n); st.overflowX = 'auto'; st.overflowY = 'hidden'; st.flexShrink = '0'; st.height = n.h + 'px'; }
    if (n.lbl) st.filter = `blur(${n.lbl / 2}px)`;
    el.dataset.id = n.id;
    if (n.nm) el.dataset.nm = n.nm;
    if (n.cs) { el.dataset.cs = n.cs; el.dataset.cn = n.cn || ''; }
    if (n.rx) el._rx = n.rx;
    if (n.inp) decorateInput(el, n);
    if (n.alt) setupToggle(el, n, ctx);
    if (n.gate) { el._gate = n.gate; el._gctx = ctx; el._gnode = n; el.classList.add('gated'); }
    if (n.act) el.dataset.act = n.act;
    return el;
  }
  // carousels keep their left inset and scroll out to the right screen edge (bleed past the parent's right padding)
  function bleed(st, ctx, n) {
    const pr = ctx.al === 'V' ? (ctx.pr || 0) : 0;
    st.width = 'auto'; st.flex = '0 0 auto'; st.minWidth = '0'; st.maxWidth = 'none'; st.alignSelf = 'stretch';
    if (pr) { st.marginRight = -pr + 'px'; const own = n.p ? n.p[1] : 0; st.paddingRight = (own + pr) + 'px'; }
  }
  function renderText(n) {
    const el = document.createElement('div'); el.className = 'tx';
    const st = el.style;
    st.textAlign = { LEFT: 'left', CENTER: 'center', RIGHT: 'right', JUSTIFIED: 'justify' }[n.ah] || 'left';
    if (n.ar === 'WIDTH_AND_HEIGHT') st.whiteSpace = 'pre';
    if ((n.ar === 'NONE' || n.ar === 'TRUNCATE') && n.av && n.av !== 'TOP') { st.display = 'flex'; st.flexDirection = 'column'; st.justifyContent = n.av === 'CENTER' ? 'center' : 'flex-end'; }
    const inner = (n.ar === 'NONE' || n.ar === 'TRUNCATE') && n.av && n.av !== 'TOP' ? document.createElement('div') : el;
    if (inner !== el) el.appendChild(inner);
    const first = n.r[0] || {};
    inner.style.fontFamily = FONT(first.f || 'Inter'); inner.style.fontSize = (first.z || 14) + 'px'; inner.style.fontWeight = first.wt || 400; inner.style.lineHeight = first.lh ? first.lh + 'px' : 'normal'; if (first.c) inner.style.color = first.c;
    if (n.ml) { inner.style.display = '-webkit-box'; inner.style.webkitLineClamp = n.ml; inner.style.webkitBoxOrient = 'vertical'; inner.style.overflow = 'hidden'; }
    for (const r of n.r) {
      const sp = document.createElement('span'); sp.textContent = r.s.replace(/\u2028/g, '\n');
      const s = sp.style; s.fontFamily = FONT(r.f); s.fontSize = r.z + 'px'; s.fontWeight = r.wt; if (r.it) s.fontStyle = 'italic';
      if (r.lh) s.lineHeight = r.lh + 'px'; if (r.ls) s.letterSpacing = r.ls + 'px'; if (r.c) s.color = r.c;
      if (r.tc) s.textTransform = { UPPER: 'uppercase', LOWER: 'lowercase', TITLE: 'capitalize', SMALL_CAPS: 'none', SMALL_CAPS_FORCED: 'none' }[r.tc] || 'none';
      if (r.tc === 'SMALL_CAPS' || r.tc === 'SMALL_CAPS_FORCED') s.fontVariant = 'small-caps';
      if (r.td === 'UNDERLINE') s.textDecoration = 'underline'; if (r.td === 'STRIKETHROUGH') s.textDecoration = 'line-through';
      inner.appendChild(sp);
    }
    el._text = n.r.map(r => r.s).join('');
    return el;
  }
  // --- inputs: replace the value text inside a field box with a real <input>
  function decorateInput(el, n) {
    const texts = [...el.querySelectorAll('.tx')]; if (!texts.length) return;
    // pick the text inside the deepest stroked/filled box, else the last text
    let t = texts.find(x => { let p = x.parentElement; while (p && p !== el) { if (p.style.boxShadow || p.style.backgroundColor) return true; p = p.parentElement; } return false; }) || texts[texts.length - 1];
    if (texts.length > 1 && t === texts[0] && texts[0].getBoundingClientRect && /label/i.test(t.parentElement.dataset.nm || '')) t = texts[1];
    const span = t.querySelector('span'); if (!span) return;
    const inp = document.createElement('input'); inp.type = 'text'; inp.className = 'proto-input';
    const cs = getComputedStyleLite(span);
    Object.assign(inp.style, cs);
    const txt = t._text || span.textContent; const col = span.style.color || t.style.color || '';
    const grey = isGrey(col);
    if (grey) inp.placeholder = txt.trim(); else inp.value = txt.trim();
    inp.style.color = grey ? '#1e2020' : (col || 'inherit');
    inp.style.setProperty('--ph', col || '#888');
    t.textContent = ''; t.appendChild(inp); t.style.whiteSpace = 'normal';
    inp.addEventListener('click', e => e.stopPropagation());
  }
  function getComputedStyleLite(sp) { const s = sp.style; return { fontFamily: s.fontFamily, fontSize: s.fontSize, fontWeight: s.fontWeight, letterSpacing: s.letterSpacing, lineHeight: s.lineHeight || 'normal' }; }
  function isGrey(c) { const m = /#([0-9a-f]{6})/i.exec(c || '') ; let r, g, b; if (m) { const v = parseInt(m[1], 16); r = v >> 16; g = (v >> 8) & 255; b = v & 255; } else { const k = /rgba?\((\d+),(\d+),(\d+)/.exec(c || ''); if (!k) return false; [r, g, b] = [+k[1], +k[2], +k[3]]; } const l = (0.299 * r + 0.587 * g + 0.114 * b); return l > 110; }
  // --- toggles (chips, checkboxes, radios, tabs, favorites)
  function setupToggle(el, n, ctx) {
    const alt = render(Object.assign({}, n.alt, { x: n.x, y: n.y, abs: n.abs, sh: n.sh, sv: n.sv, st: n.st, gr: n.gr, alt: undefined }), ctx);
    el._alt = alt; el.dataset.tg = n.tg ? '1' : '0'; el.classList.add('tg');
  }
  function flipToggle(el) {
    const alt = el._alt; if (!alt) return;
    alt._alt = el; alt.dataset.tg = el.dataset.tg === '1' ? '0' : '1'; alt.classList.add('tg'); alt.dataset.cs = el.dataset.cs; alt.dataset.id = el.dataset.id;
    el.replaceWith(alt); return alt;
  }
  function activate(el) {
    const cs = el.dataset.cs || '';
    if (EXCL_RE.test(cs)) {
      if (el.dataset.tg === '1') return; // already on
      // turn off siblings in nearest group (ancestor containing >1 toggles of same set)
      let g = el.parentElement;
      for (let i = 0; i < 5 && g; i++, g = g.parentElement) { const peers = [...g.querySelectorAll('.tg')].filter(x => x !== el && x.dataset.cs === cs); if (peers.length) { peers.filter(p => p.dataset.tg === '1').forEach(flipToggle); break; } }
    }
    flipToggle(el);
    updateGates();
  }
  function updateGates() {
    const any = document.querySelector('#screen .tg[data-tg="1"], #fixed .tg[data-tg="1"]');
    if (!any) return;
    document.querySelectorAll('#screen .gated, #fixed .gated').forEach(g => { const n = g._gnode; const on = render(Object.assign({}, g._gate, { x: n.x, y: n.y, abs: n.abs, sh: n.sh, sv: n.sv, st: n.st, gr: n.gr }), g._gctx); ['position', 'left', 'top', 'bottom'].forEach(k => { if (g.style[k]) on.style[k] = g.style[k]; }); on.classList.add('ungated'); g.replaceWith(on); });
  }
  function exitFlow() {
    const m = screenMeta(state.cur); const flow = m ? IDX.flows[m.flow] : [];
    while (state.hist.length) { const p = state.hist.pop(); if (p === 'more' || !flow.includes(p)) { state.skipPush = true; if (p === 'more') showMore(); else location.hash = '#s' + p.replace(':', '-'); return; } }
    state.skipPush = true; location.hash = '#s' + IDX.home.replace(':', '-');
  }

  // --- navigation
  function screenMeta(id) { return IDX.byId[id]; }
  function go(id, push = true) {
    if (id === 'more') { if (push && state.cur) state.hist.push(state.cur); showMore(); return; }
    if (!screenMeta(id)) return;
    if (push && state.cur && state.cur !== id) state.hist.push(state.cur);
    location.hash = '#s' + id.replace(':', '-');
  }
  function back() {
    const prev = state.hist.pop();
    if (prev) { state.skipPush = true; if (prev === 'more') showMore(); else location.hash = '#s' + prev.replace(':', '-'); return; }
    const m = screenMeta(state.cur); if (m) { const flow = IDX.flows[m.flow]; if (flow && flow[0] !== state.cur) { state.skipPush = true; location.hash = '#s' + flow[0].replace(':', '-'); } }
  }
  function nextInFlow() {
    const m = screenMeta(state.cur); if (!m) return null; const flow = IDX.flows[m.flow]; const i = flow.indexOf(state.cur);
    return i >= 0 && i < flow.length - 1 ? flow[i + 1] : null;
  }
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 1600); }

  function handleClick(e) {
    const scr = $('#screen'); let el = e.target;
    const path = []; while (el && el !== scr) { path.push(el); el = el.parentElement; }
    // 0. explicit actions and disabled (gated) buttons
    for (const x of path) { if (x.dataset && x.dataset.act === 'back') { back(); return; } if (x.dataset && x.dataset.act === 'close') { exitFlow(); return; } if (x.dataset && x.dataset.act === 'home') { go(IDX.home); return; } if (x.dataset && x.dataset.act === 'finish') { toast('Assessment complete'); exitFlow(); return; } if (x.classList && x.classList.contains('gated')) { const b = x; b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); toast('Select an answer to continue'); return; } }
    // 1. Figma prototype links
    for (const x of path) if (x._rx) {
      for (const a of x._rx) {
        if (a.b || a.cl) { back(); return; }
        if (a.d && screenMeta(a.d)) { if (a.t) (state.titles = state.titles || {})[a.d] = a.t; go(a.d); return; }
        if (a.u) { window.open(a.u, '_blank'); return; }
      }
    }
    // 2. tab bar
    for (const x of path) {
      if (/^Tabbar/.test(x.dataset.cs || '') || /^Tab Bar$/i.test(x.dataset.nm || '')) {
        const label = (e.target.closest('[data-cs="Tabbar / Ask button"]') ? 'Ask' : findLabel(e.target, x));
        const dest = IDX.tabs[label]; if (dest) { if (dest === state.cur) return; go(dest); return; }
        toast(label ? `"${label}" isn't linked` : 'Tab not linked'); return;
      }
    }
    // 3. toggles
    for (const x of path) if (x.classList.contains('tg')) { activate(x); return; }
    for (const x of path) if (SOFT_RE.test(x.dataset.cs || '')) { softToggle(x); return; }
    // 4. back / close
    for (const x of path) if (BACK_RE.test(x.dataset.nm || '') || BACK_RE.test((x.dataset.cs || ''))) { back(); return; }
    // 5. primary CTA => next screen in flow
    for (const x of path) {
      const cn = x.dataset.cn || '';
      if (x.dataset.cs === 'Button' && /Type=Primary/.test(cn) && !/Disabled/.test(cn)) { const nx = nextInFlow(); if (nx) { go(nx); return; } toast('End of this flow'); return; }
    }
    // 6. row containing a single toggle (tap anywhere on the row)
    for (let i = 0; i < Math.min(3, path.length); i++) { const tgs = path[i].querySelectorAll ? [...path[i].querySelectorAll('.tg')] : []; if (tgs.length === 1) { activate(tgs[0]); return; } if (tgs.length > 1) break; }
    // 7. known entry points by visible text (tiles, cards, CTAs)
    for (const x of path.slice(0, 8)) {
      const ts = x.classList && x.classList.contains('tx') ? [x] : (x.querySelectorAll ? [...x.querySelectorAll('.tx')].slice(0, 6) : []);
      for (const t of ts) { const k = (t._text || '').trim(); const sl = (IDX.slinks || {})[state.cur] || {}; const dest = sl[k] || IDX.links[k] || IDX.links[k.split('\n')[0]]; if (dest && dest !== state.cur) { go(dest); return; } }
      if (/^Card \/ Workout/.test(x.dataset.cs || '') && IDX.byId['9210:4988']) { go('9210:4988'); return; }
    }
    flashHotspots();
  }
  function findLabel(target, bar) {
    let el = target; while (el && el !== bar) { const t = [...el.querySelectorAll ? el.querySelectorAll('.tx') : []].map(x => x._text.trim()).filter(Boolean); if (t.length === 1) return t[0]; if (el.classList && el.classList.contains('tx')) return el._text.trim(); el = el.parentElement; }
    // nearest label by x
    const r = target.getBoundingClientRect(); let best = null, bd = 1e9;
    for (const t of bar.querySelectorAll('.tx')) { const q = t.getBoundingClientRect(); const d = Math.abs((q.left + q.right) / 2 - (r.left + r.right) / 2); if (d < bd) { bd = d; best = t._text.trim(); } }
    return best;
  }
  function hotspots() {
    const scr = $('#screen'); const out = [];
    scr.querySelectorAll('*').forEach(x => {
      if (x._rx || x.classList.contains('tg') || BACK_RE.test(x.dataset.nm || '') || /^Tabbar/.test(x.dataset.cs || '') || (x.dataset.cs === 'Button' && /Type=Primary/.test(x.dataset.cn || '') && !/Disabled/.test(x.dataset.cn || '')) || /^Card \/ Workout/.test(x.dataset.cs || '') || SOFT_RE.test(x.dataset.cs || '') || (x.classList.contains('tx') && (IDX.links[(x._text || '').trim()] || ((IDX.slinks || {})[state.cur] || {})[(x._text || '').trim()])) || x.tagName === 'INPUT') out.push(x);
    });
    return out;
  }
  function flashHotspots(persist) {
    const layer = $('#hot'); layer.innerHTML = '';
    const pr = $('#phone').getBoundingClientRect(); const sc = state.scale || 1;
    for (const x of hotspots()) { const r = x.getBoundingClientRect(); if (r.width < 2 || r.bottom < pr.top || r.top > pr.bottom) continue; const d = document.createElement('div'); d.className = 'hs'; Object.assign(d.style, { left: (r.left - pr.left) / sc + 'px', top: (r.top - pr.top) / sc + 'px', width: r.width / sc + 'px', height: r.height / sc + 'px' }); layer.appendChild(d); }
    layer.classList.add('on'); clearTimeout(layer._h); if (!persist) layer._h = setTimeout(() => layer.classList.remove('on'), 700);
  }

  // --- screen display
  async function loadScreen(id) {
    if (cache.has(id)) return cache.get(id);
    if (IDX.packs) { $('#screen').classList.add('loading'); await loadPack('common'); await loadPack(IDX.byId[id].page); $('#screen').classList.remove('loading'); return cache.get(id); }
    const r = await fetch('s/' + id.replace(':', '-') + '.json'); const j = await r.json(); cache.set(id, j); return j;
  }
  async function show(id) {
    const meta = screenMeta(id); if (!meta) { go(IDX.home, false); return; }
    state.cur = id; const s = await loadScreen(id); if (state.cur !== id) return;
    const root = s.root; const H = root.h;
    const scr = $('#screen'); scr.innerHTML = ''; scr.scrollTop = 0; $('#phone').classList.remove('scrolled'); $('#fixed').innerHTML = '';
    const rootEl = render(Object.assign({}, root, { abs: 1, x: 0, y: 0 }), { al: null, pw: PHONE_W, ph: H });
    rootEl.style.position = 'relative'; rootEl.style.left = rootEl.style.top = '0';
    if (!rootEl.style.backgroundColor && !rootEl.style.background) rootEl.style.backgroundColor = '#fff';
    rootEl.style.minHeight = PHONE_H + 'px'; if (H < PHONE_H) rootEl.style.height = PHONE_H + 'px';
    scr.appendChild(rootEl);
    if (state.titles && state.titles[id]) retitle(rootEl, state.titles[id]);
    if (root.fit && !/static/.test(location.search)) { fitScreen(rootEl, root); }
    else if (H > PHONE_H + 4 && !/static/.test(location.search)) pinBars(rootEl, root);
    $('#title').textContent = meta.name; $('#crumb').textContent = meta.page + (meta.sec ? ' › ' + meta.sec : '');
    const flow = IDX.flows[meta.flow]; const i = flow.indexOf(id); $('#pos').textContent = `${i + 1} / ${flow.length}`;
    $('#prev').disabled = i <= 0; $('#next').disabled = i >= flow.length - 1;
    document.querySelectorAll('#list a.on').forEach(a => a.classList.remove('on'));
    const a = document.querySelector(`#list a[data-id="${id}"]`); if (a) { a.classList.add('on'); if (!state.listScrolled) { a.scrollIntoView({ block: 'center' }); } }
    state.listScrolled = false;
    document.title = meta.name + ' · FitOn Revive prototype';
    if (state.hot) setTimeout(() => flashHotspots(true), 50); else $('#hot').classList.remove('on');
    $('#more').classList.remove('on');
  }
  function pinBars(rootEl, root) {
    const kids = root.ch || []; const els = [...rootEl.children];
    if (root.lm === 'V') {
      // sticky header (first child) & footer (last child)
      const f = kids[0], fe = els[0];
      if (f && !f.abs && TOP_RE.test(f.nm || f.cs || '')) { fe.style.position = 'sticky'; fe.style.top = '0'; fe.style.zIndex = 5; markTop(fe, f); }
      const flowKids = kids.map((k, i) => [k, els[i]]).filter(([k]) => !k.abs);
      const [l, le] = flowKids[flowKids.length - 1] || [];
      if (l && BOT_RE.test(l.nm || l.cs || '')) { le.style.position = 'sticky'; le.style.bottom = '0'; le.style.zIndex = 5; }
      kids.forEach((k, i) => { if (k.abs && BOT_RE.test(k.nm || k.cs || '') && k.y + k.h >= root.h - 2) moveFixed(els[i], k, root); if (k.abs && TOP_RE.test(k.nm || k.cs || '') && k.y < 2) moveFixed(els[i], k, root, true); });
    } else {
      kids.forEach((k, i) => {
        const el = els[i]; if (!el) return;
        if (k.y < 2 && TOP_RE.test(k.nm || k.cs || '')) moveFixed(el, k, root, true);
        else if (k.y + k.h >= root.h - 2 && (BOT_RE.test(k.nm || k.cs || '') || (/Button/.test(k.nm || '') && k.h < 140))) moveFixed(el, k, root);
      });
    }
  }
  // swap the header title (e.g. a category screen reused for every category)
  function retitle(rootEl, t) {
    const tx = [...rootEl.querySelectorAll('.tx')].find(x => x.getBoundingClientRect && x._text && x._text === x._text.toUpperCase() && /[A-Z]{3}/.test(x._text) && x.closest('[data-cs^="TopBar"]'));
    if (tx) { const sp = tx.querySelector('span'); if (sp) { sp.textContent = t; [...tx.querySelectorAll('span')].slice(1).forEach(x => x.remove()); } }
  }
  function fitScreen(rootEl, root) {
    // one-screen layout: keep the header on top, pin bottom bars/CTAs above the bottom edge, no scrolling
    const kids = root.ch || []; const els = [...rootEl.children];
    kids.forEach((k, i) => { const el = els[i]; if (!el) return;
      if (k.y < 2 && TOP_RE.test(k.nm || k.cs || '')) moveFixed(el, k, root, true);
      else if (k.y + k.h >= root.h - 140 && (BOT_RE.test(k.nm || k.cs || '') || k.cs === 'Button')) moveFixed(el, k, root); });
    rootEl.style.height = PHONE_H + 'px'; rootEl.style.minHeight = PHONE_H + 'px';
  }
  function markTop(el, k) {
    el.classList.add('pin-top');
    // headers drawn with white text (over a dark hero) switch to dark text once the page scrolls under the light gradient
    const lum = c => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c || ''); return m ? (0.299 * m[1] + 0.587 * m[2] + 0.114 * m[3]) : 0; };
    requestAnimationFrame(() => { const t = [...el.querySelectorAll('.tx span')]; if (t.length && t.every(x => lum(getComputedStyle(x).color) > 200)) el.classList.add('light-hdr'); });
  }
  function moveFixed(el, k, root, top) {
    if (top) markTop(el, k);
    const layer = $('#fixed'); el.style.position = 'absolute'; el.style.left = k.x + 'px';
    if (top) el.style.top = k.y + 'px'; else { el.style.top = 'auto'; el.style.bottom = (root.h - (k.y + k.h)) + 'px'; }
    if (!top) el.style.bottom = Math.max(0, root.h - (k.y + k.h)) + 'px';
    layer.appendChild(el);
  }

  // --- "More" menu (the tab bar's More tab has no design in the file)
  function showMore() {
    state.cur = 'more';
    const m = $('#more'); m.innerHTML = `<div class="mhd"><b>More</b><span>Features in this prototype</span></div>` +
      IDX.more.map(x => `<a href="#s${x.id.replace(':', '-')}"><span>${x.label}</span><i>›</i></a>`).join('') + `<div class="mnote">The More tab isn't designed in the Figma file — this menu is a stand-in so you can reach every feature.</div>`;
    m.classList.add('on'); $('#title').textContent = 'More'; $('#crumb').textContent = 'Prototype menu'; $('#pos').textContent = '';
  }

  // --- sidebar list
  function buildList() {
    const L = $('#list'); const q = ($('#q').value || '').toLowerCase(); let html = '';
    for (const pg of IDX.pages) {
      const items = []; for (const fl of pg.flows) { const its = IDX.flows[fl].map(id => IDX.byId[id]).filter(m => !q || (m.name + ' ' + m.sec + ' ' + m.page).toLowerCase().includes(q)); if (its.length) items.push([fl, its]); }
      if (!items.length) continue;
      html += `<details ${q ? 'open' : ''} data-pg="${pg.name}"><summary>${pg.name}</summary>`;
      for (const [fl, its] of items) { const sec = its[0].sec || 'Screens'; html += `<div class="sec">${sec}</div>` + its.map(m => `<a data-id="${m.id}" href="#s${m.id.replace(':', '-')}">${m.name}</a>`).join(''); }
      html += `</details>`;
    }
    L.innerHTML = html;
    const cur = state.cur && IDX.byId[state.cur]; if (cur) { const d = L.querySelector(`details[data-pg="${cur.page}"]`); if (d) d.open = true; }
  }
  function fit() {
    const st = $('#stage'); const r = st.getBoundingClientRect();
    const mobile = window.matchMedia('(max-width: 700px)').matches;
    const sc = mobile ? Math.min(r.width / PHONE_W, r.height / PHONE_H) : Math.min(1, (r.height - 24) / PHONE_H, (r.width - 24) / PHONE_W);
    state.scale = sc; $('#phone').style.transform = `scale(${sc})`;
    $('#phonewrap').style.width = PHONE_W * sc + 'px'; $('#phonewrap').style.height = PHONE_H * sc + 'px';
  }

  async function init() {
    IDX = await (await fetch('index.json')).json();
    IDX.byId = {}; for (const s of IDX.screens) IDX.byId[s.id] = s;
    buildList(); fit(); window.addEventListener('resize', fit);
    $('#q').addEventListener('input', buildList);
    $('#screen').addEventListener('click', handleClick); $('#fixed').addEventListener('click', handleClick);
    $('#prev').onclick = () => { const m = screenMeta(state.cur); const f = IDX.flows[m.flow]; const i = f.indexOf(state.cur); if (i > 0) go(f[i - 1]); };
    $('#next').onclick = () => { const nx = nextInFlow(); if (nx) go(nx); };
    $('#backbtn').onclick = back;
    $('#hotbtn').onclick = () => { state.hot = !state.hot; $('#hotbtn').classList.toggle('on', state.hot); if (state.hot) flashHotspots(true); else $('#hot').classList.remove('on'); };
    $('#menubtn').onclick = () => document.body.classList.toggle('menu');
    $('#list').addEventListener('click', e => { if (e.target.tagName === 'A') { state.listScrolled = true; document.body.classList.remove('menu'); const id = e.target.dataset.id; if (state.cur && state.cur !== id) state.hist.push(state.cur); state.skipPush = true; } });
    $('#more').addEventListener('click', e => { const a = e.target.closest('a'); if (a) { state.hist.push('more'); state.skipPush = true; $('#more').classList.remove('on'); } });
    $('#screen').addEventListener('scroll', () => { if (state.hot) flashHotspots(true); $('#phone').classList.toggle('scrolled', $('#screen').scrollTop > 4); });
    window.addEventListener('hashchange', route);
    document.addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') return; if (e.key === 'ArrowRight') $('#next').click(); if (e.key === 'ArrowLeft') $('#prev').click(); if (e.key === 'Backspace' || e.key === 'Escape') back(); });
    route();
  }
  function route() {
    const h = location.hash.replace(/^#\/?s?/, '');
    if (state.skipPush) state.skipPush = false;
    else if (state.cur && h && h.replace('-', ':') !== state.cur && state.lastHash !== h) { /* pushed in go() */ }
    state.lastHash = h;
    if (h === 'more') { showMore(); return; }
    const id = h ? h.replace('-', ':') : IDX.home;
    show(IDX.byId[id] ? id : IDX.home);
  }
  init();
})();
