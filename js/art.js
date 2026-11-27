/* =========================================================
   집중 놀이터 그림 모음 art.js v2 "따뜻한 그림책" (2026-11-21)
   - 모든 그림은 코드로 그린 SVG 문자열. 외부 이미지·폰트 없음.
   - 함수 이름·매개변수는 v1과 똑같다 (owl, snail, areaIcon, gameIcon, icon, profile,
     insect, flower, fruit, animal, vehicle, numberCard, dotsCard, momBaby, silhouette, scene).
     → v1 자리에 이 파일만 바꿔 끼우면 그림체가 바뀐다.
   - 그림 규칙(v2): viewBox 0 0 100 100, 연필선(#4A3F37, 2.3) + 수채 2~3톤
     (바탕색 → 오른쪽 아래 그늘 → 왼쪽 위 밝은 물자국) + 색이 선에서 살짝 비껴 나간 "인쇄 어긋남"
     + SVG 필터(번짐·종이결). 필터는 SVG마다 안에 들어 있어 따로 준비할 것이 없다.
   - 공통 옵션: size(px), label(화면 읽기용 이름)
   - 새로 생긴 함수(v2): roomArt, heroScene, praiseScene, restScene, meadow, cardBack, config
   - (2026-11-22 추가) pose, prop, action, crab, safety + 놀이 아이콘 4개(낱말그림·문장만들기·몸따라해요·같이몸놀이)
   - 선택: vendor/perfect-freehand.js 가 먼저 불러와져 있으면 풀·줄기·붓선이 붓처럼 굵기가 변한다.
     없어도 그대로 동작한다.
   ========================================================= */
(function (global) {
  'use strict';

  /* ---------- 색 (v1 이름은 그대로 두고 값만 그림책 색으로) ---------- */
  const INK = '#4A3F37';      // 연필 선
  const TEXT = '#3B322B';     // 글자·눈동자
  const SHADOW = '#5C5047';   // 그림자 짝
  const C = {
    cream: '#F5EDDC', white: '#FFFCF5', paper: '#FBF2DD',
    honey: '#E0A54E', sky: '#8DA9BF', apricot: '#D98B65', lilac: '#B394AE',
    leaf: '#7F9650', sprout: '#A9BC78', mint: '#86AE9F', pink: '#DDA394', sand: '#D6B88E',
    forest: '#5E6E2E', brown: '#A3734F', gray: '#ABA59B', red: '#C65D48', cheek: '#E39A86',
    // v2 이름
    olive: '#8C9A4B', oliveDeep: '#5E6B2C', mustard: '#DCA43C', terracotta: '#C2694A',
    dustyblue: '#8AA6BD', sage: '#A3B795', mauve: '#B08EA8', rose: '#D9A08F', plum: '#7E5C78',
    moss: '#6F8742', bark: '#7A5A44', night: '#55708A',
  };
  const BELLY = '#FBEFD3';

  let uid = 0;
  const nid = (p) => `bk${p}${++uid}`;
  const OPT = { texture: true };
  let SH = false;               // 그림자 짝 모드
  const LW = 2.3;
  const LINE = `stroke="${INK}" stroke-width="${LW}" stroke-linecap="round" stroke-linejoin="round"`;
  const PEN = (w = LW, op = .9, col = INK) => `fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}"`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const FONT = `system-ui,-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif`;

  /* ---------- 색 섞기 ---------- */
  function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function rgb2hex(r, g, b) { return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase(); }
  function mix(a, b, t) { if (!/^#[0-9a-f]{6}$/i.test(a)) return a; const x = hex2rgb(a), y = hex2rgb(b); return rgb2hex(...x.map((v, i) => Math.round(v + (y[i] - v) * t))); }
  /** 색을 밝게(+)/어둡게(-). amt -1~1 (v1과 같은 쓰임) */
  function shade(hex, amt) { return amt < 0 ? mix(hex, '#3E2E24', -amt) : mix(hex, '#FFF8EA', amt); }
  const named = (c, fallback) => (c ? (C[c] || c) : fallback);

  /* ---------- 모양 → path ---------- */
  const f1 = (n) => +n.toFixed(1);
  function circ(cx, cy, r) { return `M${f1(cx - r)} ${f1(cy)}a${f1(r)} ${f1(r)} 0 1 0 ${f1(2 * r)} 0a${f1(r)} ${f1(r)} 0 1 0 ${f1(-2 * r)} 0Z`; }
  function elp(cx, cy, rx, ry) { return `M${f1(cx - rx)} ${f1(cy)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0Z`; }
  function rr(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`; }
  function star(cx, cy, R, r = R * .5, n = 5) { let d = ''; for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, q = i % 2 ? r : R; d += (i ? 'L' : 'M') + f1(cx + Math.cos(a) * q) + ' ' + f1(cy + Math.sin(a) * q); } return d + 'Z'; }
  function rng(seed) { let a = seed >>> 0 || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  /** 손으로 오린 듯한 둥근 덩어리 */
  function blob(cx, cy, rx, ry, seed = 1, wob = .08, n = 10) {
    const R = rng(seed), pts = [];
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, k = 1 + (R() - .5) * 2 * wob; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    return smooth(pts, true);
  }
  /** 점들을 부드러운 곡선으로 (Catmull-Rom) */
  function smooth(p, closed) {
    const n = p.length, g = (i) => p[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
    let d = `M${f1(p[0][0])} ${f1(p[0][1])}`;
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
      d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
    }
    return d + (closed ? 'Z' : '');
  }
  function sample(p, per = 6) { // 곡선 위 점을 촘촘히 (붓선용)
    const out = [], n = p.length, g = (i) => p[Math.max(0, Math.min(n - 1, i))];
    for (let i = 0; i < n - 1; i++) {
      const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
      for (let s = 0; s < per; s++) {
        const t = s / per, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map((k) => .5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
      }
    }
    out.push(p[n - 1]);
    return out;
  }
  /** 붓선: perfect-freehand 가 있으면 굵기가 변하는 붓선, 없으면 둥근 선 */
  function brush(pts, size = 4, col = INK, op = 1) {
    if (SH) col = SHADOW;
    const PF = global.PerfectFreehand;
    if (PF && PF.getStroke) {
      const o = PF.getStroke(sample(pts), { size, thinning: .65, smoothing: .6, streamline: .3, simulatePressure: true, start: { taper: size * 2.5 }, end: { taper: size * 3 } });
      if (o.length > 2) return `<path d="M${o.map((q) => f1(q[0]) + ' ' + f1(q[1])).join('L')}Z" fill="${col}" opacity="${op}"/>`;
    }
    return `<path d="${smooth(pts, false)}" ${PEN(size * .55, op, col)}/>`;
  }

  /* ---------- 수채 붓칠 (그림책 질감의 핵심) ----------
     P(path, 색, {hi:[x,y,rx,ry] 밝은 물자국, s:그늘 폭, line:false 연필선 없음, lw, flat, op, tr}) */
  function P(d, col, o = {}) {
    const tr = o.tr ? ` transform="${o.tr}"` : '';
    if (SH) return `<path d="${d}" fill="${SHADOW}"${tr}/>`;
    const lw = o.lw == null ? LW : o.lw;
    const line = o.line === false ? '' : `<path d="${d}" ${PEN(lw, o.lo == null ? .9 : o.lo)}/>`;
    let wash;
    if (o.flat) wash = `<path d="${d}" fill="${col}"/>`;
    else {
      const id = nid('c'), dk = mix(col, '#5A4030', o.dk == null ? .3 : o.dk), s = o.s == null ? 2.6 : o.s;
      const hi = o.hi ? `<ellipse cx="${o.hi[0]}" cy="${o.hi[1]}" rx="${o.hi[2]}" ry="${o.hi[3] == null ? o.hi[2] : o.hi[3]}" fill="${mix(col, '#FFFBF0', .55)}" opacity=".75"/>` : '';
      wash = `<clipPath id="${id}"><path d="${d}"/></clipPath><path d="${d}" fill="${col}"/><g clip-path="url(#${id})"><path d="${d}" fill="${dk}" opacity=".55"/><path d="${d}" fill="${col}" transform="translate(${-s} ${-s * 1.15})"/>${hi}<path d="${d}" fill="none" stroke="${dk}" stroke-width="2.2" opacity=".3"/></g>`;
    }
    const off = o.off == null ? .8 : o.off;
    return `<g${tr}><g transform="translate(${off} ${off})"${o.op != null ? ` opacity="${o.op}"` : ''}>${wash}</g>${line}</g>`;
  }
  const dab = (x, y, rx, ry, op = .55) => SH ? '' : `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry == null ? rx : ry}" fill="#FFF9EC" opacity="${op}"/>`;

  /* ---------- 필터: 수채 번짐 + 종이결 (SVG마다 하나) ---------- */
  function paintFilter(id, k = 1, grain = true, seed = 3, amt = 1) {
    return `<filter id="${id}" x="-6%" y="-6%" width="112%" height="112%" color-interpolation-filters="sRGB">` +
      `<feTurbulence type="fractalNoise" baseFrequency="${f1(.045 / k * 100) / 100}" numOctaves="2" seed="${seed}" result="w"/>` +
      `<feDisplacementMap in="SourceGraphic" in2="w" scale="${f1(2.4 * k)}" xChannelSelector="R" yChannelSelector="G" result="d"/>` +
      (grain ? `<feTurbulence type="fractalNoise" baseFrequency="${k > 1.5 ? .9 : .75}" numOctaves="2" seed="11" result="g"/>` +
        `<feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${f1(-.9 * amt * 100) / 100} ${f1((1 + .32 * amt) * 100) / 100}" result="ga"/>` +
        `<feComposite in="d" in2="ga" operator="in"/>` : '') +
      `</filter>`;
  }
  function svg(inner, o = {}) {
    const vb = o.vb || '0 0 100 100';
    const k = (+vb.split(' ')[2] || 100) / 100;
    const size = o.size ? ` width="${o.size}" height="${o.size}"` : '';
    const a11y = o.label ? ` role="img" aria-label="${esc(o.label)}"` : ' aria-hidden="true"';
    const par = o.par ? ` preserveAspectRatio="${o.par}"` : '';
    let defs = o.defs || '', body = inner;
    if (OPT.texture && o.tex !== false) { const f = nid('f'); defs += paintFilter(f, k * (o.k || 1), o.grain !== false, (uid % 7) + 1, o.amt || (k > 1.5 ? .55 : 1)); body = `<g filter="url(#${f})">${inner}</g>`; }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${size}${par}${a11y} style="overflow:visible">` +
      (defs ? `<defs>${defs}</defs>` : '') + body + '</svg>';
  }

  /* ---------- 표정 (모든 캐릭터·과일·동물이 함께 씀) ----------
     기본 · 웃음 · 응원 · 놀람 · 쉬어요(=졸림) · 윙크 · 시무룩(짝꿍카드 구별용) */
  const FACE_ALIAS = { basic: '기본', smile: '웃음', cheer: '응원', surprise: '놀람', rest: '쉬어요', sleep: '쉬어요', 졸림: '쉬어요', wink: '윙크', sad: '시무룩' };
  function face(cx, cy, s = 1, type = '기본', o = {}) {
    type = FACE_ALIAS[type] || type;
    const dx = (o.gap || 11) * s, ey = cy, my = cy + 9 * s;
    const er = 3.3 * s * (o.bigEyes ? 1.35 : 1) * (o.eye || 1);
    const lw = Math.max(1.8, 2.4 * s);
    const st = `stroke="${TEXT}" stroke-width="${lw}" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
    const dot = (x) => `<ellipse cx="${x}" cy="${ey}" rx="${er * .92}" ry="${er * 1.08}" fill="${TEXT}"/><circle cx="${x + er * .3}" cy="${ey - er * .42}" r="${er * .34}" fill="#FFF9EE"/>`;
    const happy = (x) => `<path d="M${x - 4.2 * s} ${ey + 1.6 * s} Q${x} ${ey - 4.4 * s} ${x + 4.2 * s} ${ey + 1.6 * s}" ${st}/>`;
    const closed = (x) => `<path d="M${x - 4.2 * s} ${ey - 1 * s} Q${x} ${ey + 3.6 * s} ${x + 4.2 * s} ${ey - 1 * s}" ${st}/>`;
    const blush = (x) => `<ellipse cx="${x}" cy="${my - 1 * s}" rx="${4.6 * s}" ry="${2.8 * s}" fill="${C.cheek}" opacity=".42"/><ellipse cx="${x + .6 * s}" cy="${my - .6 * s}" rx="${3 * s}" ry="${1.8 * s}" fill="${C.cheek}" opacity=".45"/>`;
    const cheeks = o.noCheeks ? '' : blush(cx - dx - 4 * s) + blush(cx + dx + 4 * s);
    let eyes = '', mouth = '', extra = '';
    switch (type) {
      case '웃음':
        eyes = happy(cx - dx) + happy(cx + dx);
        mouth = `<path d="M${cx - 5 * s} ${my - 1.5 * s} Q${cx} ${my + 5.5 * s} ${cx + 5 * s} ${my - 1.5 * s} Z" fill="${TEXT}" stroke="${TEXT}" stroke-width="${lw * .5}" stroke-linejoin="round"/><path d="M${cx - 2.4 * s} ${my + 1.6 * s} Q${cx} ${my + .6 * s} ${cx + 2.4 * s} ${my + 1.6 * s}" fill="${C.cheek}"/>`;
        break;
      case '응원':
        eyes = dot(cx - dx) + dot(cx + dx);
        mouth = `<path d="M${cx - 6 * s} ${my - 2 * s} Q${cx} ${my + 8 * s} ${cx + 6 * s} ${my - 2 * s} Z" fill="${TEXT}"/><path d="M${cx - 3 * s} ${my + 2.6 * s} Q${cx} ${my + 1 * s} ${cx + 3 * s} ${my + 2.6 * s}" fill="${C.cheek}"/>`;
        extra = `<path d="${star(cx + dx + 12 * s, ey - 11 * s, 4.6 * s, 2 * s)}" fill="${C.mustard}" stroke="${INK}" stroke-width="${lw * .5}" stroke-linejoin="round"/>`;
        break;
      case '놀람':
        eyes = [cx - dx, cx + dx].map((x) => `<circle cx="${x}" cy="${ey}" r="${er * 1.4}" fill="#FFF9EE" ${st}/><circle cx="${x}" cy="${ey + .3 * s}" r="${er * .72}" fill="${TEXT}"/><circle cx="${x + er * .25}" cy="${ey - er * .2}" r="${er * .22}" fill="#FFF9EE"/>`).join('');
        mouth = `<ellipse cx="${cx}" cy="${my + 1 * s}" rx="${2.6 * s}" ry="${3.4 * s}" fill="${TEXT}"/>`;
        break;
      case '쉬어요':
        eyes = closed(cx - dx) + closed(cx + dx);
        mouth = `<path d="M${cx - 2.5 * s} ${my} Q${cx} ${my + 2.5 * s} ${cx + 2.5 * s} ${my}" ${st}/>`;
        if (!o.noZ) { const zx = cx + dx + 8 * s, zy = ey - 13 * s, z = (x, y, q) => `<path d="M${x} ${y}h${q}l${-q} ${q}h${q}" ${PEN(lw * .7, .6)}/>`; extra = z(zx, zy, 5 * s) + z(zx + 7 * s, zy - 8 * s, 3.6 * s); }
        break;
      case '윙크':
        eyes = dot(cx - dx) + happy(cx + dx);
        mouth = `<path d="M${cx - 4 * s} ${my - 1 * s} Q${cx} ${my + 4 * s} ${cx + 4 * s} ${my - 1 * s}" ${st}/>`;
        break;
      case '시무룩':
        eyes = dot(cx - dx) + dot(cx + dx);
        mouth = `<path d="M${cx - 4 * s} ${my + 2.5 * s} Q${cx} ${my - 1.5 * s} ${cx + 4 * s} ${my + 2.5 * s}" ${st}/>`;
        break;
      default:
        eyes = dot(cx - dx) + dot(cx + dx);
        mouth = `<path d="M${cx - 3.5 * s} ${my - .5 * s} Q${cx} ${my + 3.5 * s} ${cx + 3.5 * s} ${my - .5 * s}" ${st}/>`;
    }
    return `<g class="face">${cheeks}${eyes}${o.noMouth ? '' : mouth}${extra}</g>`;
  }

  /* ---------- 무늬 (짝꿍카드 '무늬만 다름') ---------- */
  const PATTERNS = ['없음', '점', '줄', '하트', '별'];
  function patternDef(id, kind, color) {
    const c = color || 'rgba(255,250,238,.8)';
    if (kind === '점') return `<pattern id="${id}" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="2.6" fill="${c}"/><circle cx="11" cy="11" r="2.6" fill="${c}"/></pattern>`;
    if (kind === '줄') return `<pattern id="${id}" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="5" height="12" fill="${c}"/></pattern>`;
    if (kind === '하트') return `<pattern id="${id}" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M9 14 C2 9 4 4 9 7 C14 4 16 9 9 14Z" fill="${c}"/></pattern>`;
    if (kind === '별') return `<pattern id="${id}" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M9 3l1.8 3.8 4.2.5-3.1 2.8.8 4.1L9 12.2 5.3 14.2l.8-4.1L3 7.3l4.2-.5Z" fill="${c}"/></pattern>`;
    return '';
  }
  const ground = (cx = 50, cy = 96, rx = 28) => SH ? '' : `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="3.6" fill="#6B5040" opacity=".12"/>`;

  /* =========================================================
     1. 마스코트 — 보미(꿀색 부엉이) · 달롱(연두 달팽이)
     ========================================================= */
  const FACES = ['기본', '웃음', '응원', '놀람', '쉬어요'];
  const BOMI = { body: '#DFA24C', wing: '#C4863A', belly: BELLY, beak: '#D78345', feet: '#C2694A' };

  function owlG(o = {}) {
    const f = FACE_ALIAS[o.face] || o.face || '기본', pose = o.pose || '기본';
    const wingL = { 만세: 'rotate(118 24 50)' }[pose] || 'rotate(8 24 50)';
    const wingR = { 인사: 'rotate(-128 76 50)', 가리키기: 'rotate(-74 76 50)', 만세: 'rotate(-118 76 50)' }[pose] || 'rotate(-8 76 50)';
    const wing = (side, tr) => {
      const L = side < 0;
      const d = L ? 'M26 46 C12 50 9 70 16 86 C27 84 32 62 26 46Z' : 'M74 46 C88 50 91 70 84 86 C73 84 68 62 74 46Z';
      const fx = L ? 16 : 76;
      return `<g transform="${tr}">${P(d, BOMI.wing, { s: 2 })}<path d="M${fx} 64 q4 2.4 8 0 M${fx} 72 q4 2.4 8 0 M${fx + 1} 79 q3 2 6 0" ${PEN(1.4, .55)}/></g>`;
    };
    const bodyD = 'M50 15 C75 15 85 37 85 60 C85 83 70 95 50 95 C30 95 15 83 15 60 C15 37 25 15 50 15Z';
    const maskD = 'M50 33 C41 24 21 27 21 45 C21 60 36 64 50 57 C64 64 79 60 79 45 C79 27 59 24 50 33Z';
    const open = ['웃음', '응원', '놀람'].includes(f);
    const beak = open
      ? P('M44.5 52 Q50 48.5 55.5 52 L50 55.5Z', BOMI.beak, { lw: 1.6, s: .8 }) + P(`M46.5 56 Q50 ${f === '놀람' ? 64 : 61} 53.5 56Z`, '#A85A3A', { lw: 1.6, s: .6 })
      : P('M45.5 51.5 L50 58.5 L54.5 51.5 Q50 49 45.5 51.5Z', BOMI.beak, { lw: 1.6, s: .8 });
    const extra = pose === '인사' ? `<path d="M95 20 q4 4 0 8 M100 16 q6 8 0 16" ${PEN(1.8, .5)}/>`
      : pose === '만세' ? P(star(11, 16, 6.5, 3), C.mustard, { lw: 1.5, s: 1 }) + P(star(90, 11, 5, 2.3), C.mustard, { lw: 1.5, s: 1 }) + P(star(96, 32, 3.4, 1.6), C.rose, { lw: 1.2, s: .6 })
      : pose === '가리키기' ? `<path d="M93 26 l7 -2 M95 34 l7 1" ${PEN(1.8, .5)}/>` : '';
    return `${ground(50, 97, 27)}
      ${wing(-1, wingL)}${wing(1, wingR)}
      ${P('M32 24 L25 7 C33 9 39 13 42 19Z', BOMI.wing, { s: 1.2 })}${P('M68 24 L75 7 C67 9 61 13 58 19Z', BOMI.wing, { s: 1.2 })}
      ${P(bodyD, BOMI.body, { hi: [34, 30, 11, 8], s: 4 })}
      <path d="M44 19 l1 4 M50 17.5 v4 M56 19 l-1 4" ${PEN(1.5, .5, '#8E5E2A')}/>
      ${P(elp(50, 76, 21, 16), BOMI.belly, { lw: 1.4, lo: .5, s: 2.2 })}
      <path d="M40 70 q3 3 6 0 M51 70 q3 3 6 0 M45 77 q3 3 6 0 M56 77 q3 2.6 5 0 M39 77.5 q2.5 2.4 4.5 0 M47 84 q3 2.6 6 0" ${PEN(1.5, .65, BOMI.wing)}/>
      ${P(maskD, '#FCF3DE', { lw: 1.5, lo: .55, s: 1.6 })}
      ${face(50, 45, 1.6, f, { gap: 13, noCheeks: true, noMouth: true, eye: 1.08 })}
      ${beak}
      <ellipse cx="25" cy="56" rx="5" ry="3" fill="${C.cheek}" opacity=".45"/><ellipse cx="75" cy="56" rx="5" ry="3" fill="${C.cheek}" opacity=".45"/>
      ${P('M38 92 c1 4 4 5 6 3 c2 2 5 1 5 -2Z', BOMI.feet, { lw: 1.6, s: .8 })}${P('M51 92 c0 3 3 5 5 3 c2 2 5 1 6 -3Z', BOMI.feet, { lw: 1.6, s: .8 })}
      ${extra}`;
  }
  /** 부엉이 보미 (안내·칭찬·힌트). face: FACES, pose: 기본 | 인사 | 가리키기 | 만세 */
  function owl(o = {}) {
    return svg(owlG(o), { size: o.size, label: o.label || `보미 ${o.face || '기본'} ${o.pose || '기본'}` });
  }

  const DALLONG = { skin: '#B4C877', skinDark: '#8BA453', shell: '#CC875D', shellDark: '#9F5F3E', swirl: '#F6E2C4' };
  function snailG(o = {}) {
    const f = o.face || '기본', pose = o.pose || '기본';
    const tall = pose === '기지개';
    const hy = tall ? 28 : 40;
    const stalkL = pose === '인사' ? [[31, hy - 7], [24, hy - 20], [14, hy - 26]] : [[31, hy - 7], [27, hy - 18], [22, hy - 24]];
    const stalkR = [[42, hy - 7], [46, hy - 18], [49, hy - 25]];
    const tipL = stalkL[2];
    const wave = pose === '인사' ? `<path d="M6 ${hy - 34} q-3 4 0 8 M2 ${hy - 38} q-6 8 0 16" ${PEN(1.8, .5)}/>` : '';
    const bodyD = `M13 90 C9 90 13 ${hy + 22} 18 ${hy + 6} C20 ${hy - 6} 30 ${hy - 10} 37 ${hy - 10} C46 ${hy - 10} 53 ${hy - 2} 53 ${hy + 10} L53 77 L89 82 C95 83 95 90 89 90 Z`;
    return `${ground(52, 93, 40)}
      ${brush(stalkL, 3.6, INK, .9)}${brush(stalkR, 3.6, INK, .9)}
      ${P(circ(tipL[0], tipL[1], 3.8), DALLONG.skinDark, { lw: 1.6, s: 1 })}${P(circ(49, hy - 25, 3.8), DALLONG.skinDark, { lw: 1.6, s: 1 })}
      ${P(bodyD, DALLONG.skin, { hi: [30, hy, 7, 5], s: 3 })}
      <path d="M58 86 q6 1.5 12 1 M74 87 q5 0 9 -.5" ${PEN(1.3, .4)}/>
      <g transform="${tall ? 'translate(4 4)' : ''}">
        ${P(circ(69, 58, 23.5), DALLONG.shell, { hi: [61, 46, 7, 5], s: 4 })}
        <path d="M69 58 m0 -4 a4 4 0 1 1 -4 4 a8 8 0 1 1 8 8 a12 12 0 1 1 -12 -12 a16 16 0 1 1 16 16" fill="none" stroke="${SH ? SHADOW : DALLONG.swirl}" stroke-width="4" stroke-linecap="round" opacity=".9"/>
        <path d="M69 58 m0 -4 a4 4 0 1 1 -4 4 a8 8 0 1 1 8 8 a12 12 0 1 1 -12 -12 a16 16 0 1 1 16 16" ${PEN(1.3, .55, DALLONG.shellDark)}/>
      </g>
      ${SH ? '' : face(36, hy + 4, 1.05, f, { gap: 7 })}
      ${wave}`;
  }
  /** 달팽이 달롱 (쉬는 시간·곧 열려요). pose: 기본 | 인사 | 기지개 */
  function snail(o = {}) {
    return svg(snailG(o), { size: o.size, label: o.label || `달롱 ${o.face || '기본'} ${o.pose || '기본'}` });
  }

  /* =========================================================
     2. 영역 7개 · 놀이 13개 · UI 아이콘
     ========================================================= */
  const AREAS = [
    { id: 'attention', name: '찾기 놀이', power: '끝까지 찾기 · 기다렸다 톡 누르기', color: '#DCA43C', tint: '#F6E6BF', deep: '#74540F', games: ['숫자찾기', '벌찾기', '달라진그림', '달롱건너기'] },
    { id: 'memory', name: '기억 놀이',power: '보고 기억하기 · 순서 기억', color: '#B08EA8', tint: '#EEE0EA', deep: '#654662', games: ['짝꿍카드', '불빛순서', '잎아래'] },
    { id: 'seeing', name: '비교 놀이', power: '그림 비교하기 · 모양 찾기', color: '#8AA6BD', tint: '#E0E9EF', deep: '#3C5D76', games: ['다른그림', '같은모양'] },
    { id: 'thinking', name: '규칙 놀이',power: '규칙 찾기 · 순서 · 분류', color: '#93AE87', tint: '#E2EBDB', deep: '#466140', games: ['패턴', '퍼즐', '우체통'] },
    { id: 'hands', name: '그리기 놀이', power: '그림 그리기 · 선 따라가기', color: '#CC7754', tint: '#F5DFD1', deep: '#8A4127', games: ['반쪽그림', '선긋기미로'] },
    { id: 'words', name: '말 놀이', power: '낱말 · 듣고 따라 하기', color: '#D9A08F', tint: '#F6E3DC', deep: '#874A41', games: ['낱말그림', '문장만들기', '감정표정', '심부름', '이럴땐'] },
    { id: 'body', name: '몸 놀이', power: '몸 움직이기 · 따라 하기 · 숨 고르기', color: '#A2AD58', tint: '#ECEDD0', deep: '#555D20', games: ['몸따라해요', '같이몸놀이'] },
  ];
  const CREAM_W = '#FCF4E2';
  const AREA_ICON = {
    attention: () => P(circ(48, 54, 33), CREAM_W, { s: 2 }) + P(circ(48, 54, 22), C.mustard, { s: 2.4, hi: [42, 46, 6, 4] }) + P(circ(48, 54, 10.5), CREAM_W, { s: 1.4 }) + `<circle cx="48" cy="54" r="3.6" fill="${SH ? SHADOW : TEXT}"/>` +
      brush([[86, 14], [72, 30], [56, 46]], 5, SH ? SHADOW : C.terracotta) + P('M80 8 L92 8 L92 20 L86 16 Z', C.terracotta, { lw: 1.6, s: .8 }),
    memory: () => P('M24 64 C9 64 10 43 24 42 C22 25 43 19 50 30 C58 17 81 24 78 41 C93 43 92 64 76 64 Z', '#F4EAF0', { s: 2.4 }) +
      P(star(50, 44, 13, 6.2), C.mustard, { s: 1.6, hi: [46, 40, 3, 2] }) + P(circ(33, 76, 5), '#F4EAF0', { s: 1 }) + P(circ(23, 86, 3), '#F4EAF0', { s: .6, lw: 1.6 }),
    seeing: () => P('M58 56 L64 50 L90 76 Q92 84 84 84 Z', C.bark, { s: 1.4 }) + P(circ(42, 42, 25), '#EAF0F2', { s: 3, hi: [33, 32, 7, 5] }) +
      `<path d="M42 17 a25 25 0 0 1 0 50 a25 25 0 0 1 0 -50" ${PEN(4.4, .9)}/>` + P('M26 42 Q42 27 58 42 Q42 57 26 42Z', C.dustyblue, { lw: 1.8, s: 1.2 }) + `<circle cx="42" cy="42" r="5.4" fill="${SH ? SHADOW : TEXT}"/><circle cx="44" cy="40" r="1.6" fill="#FFF9EE"/>`,
    thinking: () => P('M21 29 h19 a7.5 7.5 0 1 1 13 0 h19 v19 a7.5 7.5 0 1 0 0 13 v19 h-19 a7.5 7.5 0 1 0 -13 0 h-19 v-19 a7.5 7.5 0 1 1 0 -13 Z', C.sage, { s: 3, hi: [32, 40, 7, 5] }) +
      `<circle cx="42" cy="54" r="3" fill="${SH ? SHADOW : TEXT}"/><circle cx="54" cy="54" r="3" fill="${SH ? SHADOW : TEXT}"/><path d="M43 63 q5 4 10 0" ${PEN(2, .8, TEXT)}/>`,
    hands: () => brush([[10, 88], [22, 80], [34, 88], [46, 80], [58, 88]], 5, SH ? SHADOW : C.mustard) +
      `<g transform="rotate(35 50 50)">${P(rr(38, 12, 24, 58, 5), C.terracotta, { s: 2.4, hi: [44, 30, 2.5, 10] })}${P(rr(38, 25, 24, 11, 1), CREAM_W, { s: 1, lw: 1.6 })}${P('M38 70 L50 92 L62 70 Z', '#EBD3B6', { s: 1.4 })}${P('M45 83 L50 92 L55 83Z', C.terracotta, { s: .6, lw: 1.4 })}</g>`,
    words: () => P('M16 21 h68 a9 9 0 0 1 9 9 v33 a9 9 0 0 1 -9 9 h-38 l-17 14 v-14 h-13 a9 9 0 0 1 -9 -9 v-33 a9 9 0 0 1 9 -9Z', '#F7E7E1', { s: 2.6 }) +
      `<text x="50" y="58" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="27" fill="${SH ? SHADOW : C.terracotta}">가</text>`,
    body: () => P(circ(57, 19, 11.5), CREAM_W, { s: 1.6 }) +
      [`<path d="M53 34 L45 58 M50 42 L27 33 M50 42 L74 29 M45 58 L29 81 M45 58 L64 70 L68 89" fill="none" stroke="${SH ? SHADOW : INK}" stroke-width="15" stroke-linecap="round" stroke-linejoin="round" opacity=".88"/>`,
        `<path d="M53 34 L45 58 M50 42 L27 33 M50 42 L74 29 M45 58 L29 81 M45 58 L64 70 L68 89" fill="none" stroke="${SH ? SHADOW : C.olive}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`,
        `<path d="M51 37 L46 52 M49 43 L36 38" fill="none" stroke="#C9D08E" stroke-width="3" stroke-linecap="round" opacity=".7"/>`].join(''),
  };
  /** 영역 아이콘. id: attention|memory|seeing|thinking|hands|words|body (또는 한글 이름) */
  function areaIcon(id, o = {}) {
    const a = AREAS.find((x) => x.id === id || x.name === id) || AREAS[0];
    return svg(AREA_ICON[a.id](), { size: o.size, label: o.label || a.name });
  }

  const T = (x, y, s, txt, col = TEXT) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="${s}" fill="${SH ? SHADOW : col}">${txt}</text>`;
  const GAME_ICON = {
    숫자찾기: () => P(rr(9, 9, 37, 37, 9), CREAM_W, { s: 2 }) + P(rr(54, 9, 37, 37, 9), CREAM_W, { s: 2 }) + P(rr(9, 54, 37, 37, 9), CREAM_W, { s: 2 }) + P(rr(54, 54, 37, 37, 9), C.mustard, { s: 2.4 }) +
      T(28, 36, 22, '1') + T(72, 36, 22, '2') + T(28, 81, 22, '3') + T(72, 81, 22, '4'),
    벌찾기: () => `<g transform="translate(-2 4) scale(1.04)">${INSECT.벌(C.honey)}</g>`,
    반쪽그림: () => P('M50 28 C42 11 13 13 13 38 C13 59 38 73 50 87 Z', C.rose, { s: 2.6, hi: [26, 30, 6, 4] }) + `<path d="M50 28 C58 11 87 13 87 38 C87 59 62 73 50 87" ${PEN(2.4, .7)} stroke-dasharray="2 7"/><path d="M50 8 V94" ${PEN(2, .6)} stroke-dasharray="5 6"/>`,
    다른그림: () => P(rr(5, 19, 41, 58, 7), CREAM_W, { s: 2 }) + P(rr(54, 19, 41, 58, 7), CREAM_W, { s: 2 }) + P(circ(26, 40, 8), C.mustard, { s: 1.2, lw: 1.8 }) + P(circ(75, 40, 8), C.dustyblue, { s: 1.2, lw: 1.8 }) +
      P(rr(15, 56, 21, 11, 4), C.olive, { s: 1, lw: 1.8 }) + P(rr(64, 56, 21, 11, 4), C.olive, { s: 1, lw: 1.8 }) + brush([[62, 30], [75, 25], [89, 34], [88, 50], [74, 56], [61, 48], [63, 33]], 4, SH ? SHADOW : C.terracotta, .9),
    짝꿍카드: () => P(rr(9, 18, 39, 57, 7), CREAM_W, { tr: 'rotate(-10 29 46)', s: 2 }) + P(rr(52, 26, 39, 57, 7), CREAM_W, { tr: 'rotate(10 71 54)', s: 2 }) +
      `<g transform="translate(9 26) scale(.4)">${FRUIT_PARTS.사과(FRUIT_COLOR.사과)}</g><g transform="translate(51 34) scale(.4)">${FRUIT_PARTS.사과(FRUIT_COLOR.사과)}</g>`,
    선긋기미로: () => P(rr(9, 9, 82, 82, 14), CREAM_W, { s: 2.4 }) + `<path d="M24 24 H76 M24 24 V52 H52 M76 40 V76 H36 M36 76 V64" ${PEN(5, .85)}/>` + brush([[32, 34], [48, 33], [64, 35], [64, 50], [63, 64], [47, 64]], 5, SH ? SHADOW : C.terracotta) + `<circle cx="47" cy="64" r="4.4" fill="${SH ? SHADOW : C.terracotta}"/>`,
    불빛순서: () => P(circ(30, 30, 17), C.mustard, { s: 2, hi: [25, 24, 5, 3.5] }) + P(circ(70, 30, 17), CREAM_W, { s: 2 }) + P(circ(30, 70, 17), CREAM_W, { s: 2 }) + P(circ(70, 70, 17), C.dustyblue, { s: 2 }) +
      T(30, 37, 19, '1') + T(70, 77, 19, '2') + `<path d="M30 6 v-5 M11 13 l-4 -4 M49 13 l4 -4" ${PEN(2.2, .7)}/>`,
    같은모양: () => P('M28 11 L46 44 H10 Z', C.mustard, { s: 2 }) + P(circ(72, 28, 16), CREAM_W, { s: 2 }) + P(rr(12, 56, 32, 32, 6), CREAM_W, { s: 2 }) + P('M72 55 L90 88 H54 Z', C.mustard, { s: 2 }) +
      `<path d="M30 50 C40 64 58 64 66 56" ${PEN(2.6, .8, C.oliveDeep)} stroke-dasharray="4 5"/>`,
    패턴: () => P(circ(14, 50, 10), C.sage, { s: 1.4 }) + P(rr(29, 40, 21, 21, 5), C.mustard, { s: 1.6 }) + P(circ(66, 50, 10), C.sage, { s: 1.4 }) +
      `<rect x="80" y="38" width="18" height="24" rx="5" fill="${SH ? 'none' : '#FFF9EE'}" ${PEN(2.2, .85)} stroke-dasharray="4 4"/>` + T(89, 56, 15, '?'),
    // (2026-11-24 새로) 달라진 그림 찾기 · 퍼즐 맞추기
    달라진그림: () => P(rr(12, 20, 76, 60, 8), CREAM_W, { s: 2 }) + P(circ(34, 42, 10), C.mustard, { s: 1.2, lw: 1.8 }) + P(rr(48, 56, 28, 14, 4), C.olive, { s: 1, lw: 1.8 }) +
      brush([[60, 28], [74, 24], [86, 34], [84, 48], [70, 52], [58, 42], [60, 30]], 4, SH ? SHADOW : C.terracotta, .9),
    퍼즐: () => P(rr(9, 9, 39, 39, 8), C.sage, { s: 2 }) + P(rr(52, 9, 39, 39, 8), CREAM_W, { s: 2 }) + P(rr(9, 52, 39, 39, 8), CREAM_W, { s: 2 }) + P(rr(52, 52, 39, 39, 8), C.mustard, { s: 2.4 }) +
      P(circ(50, 29, 6), C.sage, { s: .6, lw: 1.4 }) + P(circ(71, 50, 6), CREAM_W, { s: .6, lw: 1.4 }),
    // (2026-11-26 새로) 달롱 건너기: 징검돌 + 깃발 + 달롱 껍데기
    달롱건너기: () => P(rr(6, 62, 88, 28, 10), '#E0E9EF', { s: 1.6 }) + P(elp(26, 74, 15, 8), CREAM_W, { s: 1.6, lw: 2 }) + P(elp(62, 78, 15, 8), CREAM_W, { s: 1.6, lw: 2 }) +
      `<path d="M76 10 V60" ${PEN(3.2, .9)}/>` + P('M78 12 L96 18 L78 30Z', C.terracotta, { s: .8, lw: 1.8 }) + P(circ(27, 54, 12), '#CC875D', { s: 2, hi: [22, 49, 4, 3] }) + `<path d="M27 54 m0 -3 a3 3 0 1 1 -3 3 a6 6 0 1 1 6 6" ${PEN(1.8, .8)}/>`,
    // (2026-11-26 새로) 잎 아래 어디?: 큰 잎 + 잎 아래로 보이는 열매
    잎아래: () => P(rr(6, 74, 88, 18, 8), '#F6E6BF', { s: 1.4 }) + `<g transform="translate(40 34) scale(.44)">${FRUIT_PARTS.딸기(FRUIT_COLOR.딸기)}</g>` +
      P('M8 70 C2 36 26 8 50 6 C74 10 98 36 92 70 C70 80 30 80 8 70Z', C.sage, { s: 2.6, hi: [30, 30, 8, 5] }) + `<path d="M50 14 V64 M50 34 L32 22 M50 48 L30 38 M50 34 L68 22 M50 48 L70 38" ${PEN(2.2, .7)}/>`,
    // (2026-11-27 새로) 보미 우체통: 우체통 + 소포 + 우표
    우체통: () => P(rr(44, 66, 12, 28, 3), '#F6E6BF', { s: 1.2, lw: 2 }) + P('M14 70 V44 C14 22 32 12 50 12 C68 12 86 22 86 44 V70 Z', C.terracotta, { s: 2.4, hi: [30, 28, 7, 5] }) +
      `<path d="M30 56 H70" ${PEN(3.4, .9)}/>` + P(circ(50, 36, 9), CREAM_W, { s: 1, lw: 2 }) + P('M86 48 V26 H97 V38 H92 V48Z', C.mustard, { s: .8, lw: 1.8 }) +
      P(rr(60, 70, 26, 22, 5), '#E0E9EF', { s: 1.6 }) + `<path d="M73 70 V92 M60 81 H86" ${PEN(2.2, .8)}/>`,
    // (2026-11-27 새로) 달롱 집 심부름: 집 단면 + 상자 + 공
    심부름: () => P(rr(14, 40, 72, 48, 6), '#F6E6BF', { s: 2 }) + P('M8 44 L50 12 L92 44Z', C.terracotta, { s: 2.4, hi: [36, 32, 7, 4] }) +
      P(rr(22, 60, 26, 24, 3), '#E4C796', { s: 1.2, lw: 2 }) + `<path d="M28 68 H42" ${PEN(2.4, .8)}/>` + P(circ(68, 72, 11), C.sage, { s: 1.4, lw: 2, hi: [64, 68, 3, 2] }) +
      P(rr(60, 48, 16, 10, 2), '#E0E9EF', { s: 1, lw: 1.8 }),
    // 이럴 땐 어떻게?: 말풍선 안에 두 얼굴
    이럴땐: () => P('M16 21 h68 a9 9 0 0 1 9 9 v33 a9 9 0 0 1 -9 9 h-38 l-17 14 v-14 h-13 a9 9 0 0 1 -9 -9 v-33 a9 9 0 0 1 9 -9Z', '#F7E7E1', { s: 2.6 }) +
      face(35, 44, .5, '웃음', { gap: 9 }) + face(65, 44, .5, '기본', { gap: 9 }),
    // (2026-11-22 새로) 말·언어 · 몸·감각 놀이
    낱말그림: () => P('M16 21 h68 a9 9 0 0 1 9 9 v33 a9 9 0 0 1 -9 9 h-38 l-17 14 v-14 h-13 a9 9 0 0 1 -9 -9 v-33 a9 9 0 0 1 9 -9Z', '#F7E7E1', { s: 2.6 }) + `<g transform="translate(29 18) scale(.42)">${FRUIT_PARTS.사과(FRUIT_COLOR.사과)}</g>` + face(50, 46, .5, '웃음', { gap: 9 }),
    문장만들기: () => P('M16 21 h68 a9 9 0 0 1 9 9 v33 a9 9 0 0 1 -9 9 h-38 l-17 14 v-14 h-13 a9 9 0 0 1 -9 -9 v-33 a9 9 0 0 1 9 -9Z', '#F7E7E1', { s: 2.6 }) +
      P(rr(14, 30, 22, 28, 4), CREAM_W, { tr: 'rotate(-6 25 44)', s: 1.2, lw: 1.8 }) + P(rr(39, 29, 22, 28, 4), CREAM_W, { s: 1.2, lw: 1.8 }) + P(rr(64, 30, 22, 28, 4), CREAM_W, { tr: 'rotate(6 75 44)', s: 1.2, lw: 1.8 }) +
      P(circ(25, 42, 6.5), C.honey, { lw: 1.4, s: .8 }) + P('M50 52 C44 48 41 44 42 40 C43 36 48 36 50 40 C52 36 57 36 58 40 C59 44 56 48 50 52Z', C.rose, { lw: 1.4, s: .6 }) + `<g transform="translate(64 31) scale(.22)">${FRUIT_PARTS.딸기(FRUIT_COLOR.딸기)}</g>` +
      `<path d="M36 44 h3 M61 44 h3" ${PEN(2, .6)}/>`,
    // (2026-11-24 새로) 감정 표정 고르기: 웃는 얼굴 + 작은 시무룩한 얼굴
    감정표정: () => P(circ(40, 44, 31), C.honey, { s: 2.6, hi: [30, 32, 8, 5] }) + face(40, 41, 1.7, '웃음', { gap: 11 }) +
      P(circ(72, 72, 19), '#B9CCDA', { s: 2, lw: 2.2 }) + face(72, 70, .95, '시무룩', { gap: 8, noCheeks: true }),
    몸따라해요: () => `<g transform="translate(6 2) scale(.98)">${POSE.나무(false)}</g>` + wind(-4, 52, .7) + wind(-2, 64, .6) + wind(0, 76, .5),
    같이몸놀이: () => `<g transform="translate(-6 -6) scale(.84)">${PROP.풍선()}</g>` + `<g transform="translate(40 36) scale(.62)">${PROP.공()}</g>`,
  };
  const GAMES = [
    { id: '숫자찾기', name: '숫자 찾기', area: 'attention' }, { id: '벌찾기', name: '윙윙 꽃밭', area: 'attention' },
    { id: '짝꿍카드', name: '짝꿍 카드', area: 'memory' }, { id: '불빛순서', name: '불빛 순서', area: 'memory' },
    { id: '다른그림', name: '다른 그림 찾기', area: 'seeing' }, { id: '같은모양', name: '같은 모양', area: 'seeing' },
    { id: '패턴', name: '패턴 잇기', area: 'thinking' },
    { id: '달라진그림', name: '달라진 그림 찾기', area: 'attention' }, { id: '퍼즐', name: '퍼즐 맞추기', area: 'thinking' },
    { id: '달롱건너기', name: '달롱 건너기', area: 'attention' },
    { id: '잎아래', name: '잎 아래 어디?', area: 'memory' },
    { id: '우체통', name: '보미 우체통', area: 'thinking' },
    { id: '반쪽그림', name: '반쪽 그림', area: 'hands' }, { id: '선긋기미로', name: '선 긋기 미로', area: 'hands' },
    { id: '심부름', name: '달롱 집 심부름', area: 'words' },
    { id: '이럴땐', name: '이럴 땐 어떻게?', area: 'words' },
    { id: '낱말그림', name: '이게 뭐야?', area: 'words' }, { id: '문장만들기', name: '누가 뭐 해요?', area: 'words' }, { id: '감정표정', name: '감정 표정 고르기', area: 'words' },
    { id: '몸따라해요', name: '몸으로 따라 해요!', area: 'body' }, { id: '같이몸놀이', name: '같이 놀아요!', area: 'body' },
  ];
  /** 놀이 메뉴 아이콘. id: 숫자찾기|벌찾기|반쪽그림|다른그림|짝꿍카드|선긋기미로|불빛순서|같은모양|패턴|낱말그림|문장만들기|몸따라해요|같이몸놀이 */
  function gameIcon(id, o = {}) {
    const g = GAME_ICON[id] || GAME_ICON.숫자찾기;
    return svg(g(), { size: o.size, label: o.label || id });
  }

  /* UI 아이콘: 연필로 그은 선 아이콘. 색은 글자색(currentColor)을 따른다. o.wash: 뒤에 물감 동그라미 색 */
  const U = `fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"`;
  function gearPath() {
    let d = '';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, a1 = a - 0.2, a2 = a + 0.2, R = 40, r = 30;
      const p = (ang, rad) => `${(50 + Math.cos(ang) * rad).toFixed(1)} ${(50 + Math.sin(ang) * rad).toFixed(1)}`;
      d += (i ? 'L' : 'M') + p(a1 - 0.18, r) + 'L' + p(a1, R) + 'L' + p(a2, R) + 'L' + p(a2 + 0.18, r);
    }
    return d + 'Z';
  }
  const UI = {
    홈: `<path d="M14 49 L50 16 L86 49" ${U}/><path d="M24 43 V84 H76 V43" ${U}/><path d="M42 84 V63 H58 V84" ${U}/>`,
    보호자: `<rect x="20" y="44" width="60" height="42" rx="10" ${U}/><path d="M32 44 V32 a18 18 0 0 1 36 0 V44" ${U}/><circle cx="50" cy="64" r="5" fill="currentColor"/>`,
    설정: `<path d="${gearPath()}" ${U} stroke-width="7"/><circle cx="50" cy="50" r="11" ${U} stroke-width="7"/>`,
    소리켬: `<path d="M14 40 H30 L50 22 V78 L30 60 H14 Z" ${U}/><path d="M64 36 q10 14 0 28 M74 26 q18 24 0 48" ${U}/>`,
    소리끔: `<path d="M14 40 H30 L50 22 V78 L30 60 H14 Z" ${U}/><path d="M64 38 L86 62 M86 38 L64 62" ${U}/>`,
    힌트: `<path d="M50 12 a26 26 0 0 1 16 46 c-4 4 -5 8 -5 12 H39 c0 -4 -1 -8 -5 -12 a26 26 0 0 1 16 -46Z" ${U}/><path d="M40 82 H60 M44 92 H56" ${U}/>`,
    뒤로: `<path d="M58 18 L26 50 L58 82" ${U} stroke-width="10"/>`,
    다음: `<path d="M42 18 L74 50 L42 82" ${U} stroke-width="10"/>`,
    다시: `<path d="M78 50 a28 28 0 1 1 -9 -20.6" ${U}/><path d="M72 14 V30 H56" ${U}/>`,
    멈춤: `<path d="M36 22 V78 M64 22 V78" ${U} stroke-width="11"/>`,
    닫기: `<path d="M24 24 L76 76 M76 24 L24 76" ${U} stroke-width="10"/>`,
    확인: `<path d="M18 52 L40 74 L82 28" ${U} stroke-width="10"/>`,
    더하기: `<path d="M50 18 V82 M18 50 H82" ${U} stroke-width="10"/>`,
    고치기: `<path d="M20 80 L24 62 L66 20 L80 34 L38 76 Z" ${U}/><path d="M58 28 L72 42" ${U}/>`,
    지우기: `<path d="M20 28 H80 M40 28 V18 H60 V28 M28 28 L32 84 H68 L72 28" ${U}/><path d="M44 42 V70 M56 42 V70" ${U}/>`,
    별: `<path d="M50 12 L61 36 L87 39 L67 57 L73 83 L50 70 L27 83 L33 57 L13 39 L39 36 Z" ${U}/>`,
    시계: `<circle cx="50" cy="54" r="32" ${U}/><path d="M50 36 V54 L62 62 M40 12 H60" ${U}/>`,
    기록: `<path d="M16 16 V84 H86" ${U}/><path d="M28 66 L46 46 L60 56 L82 30" ${U}/>`,
    쉬기: `<path d="M64 14 a34 34 0 1 0 22 52 a28 28 0 0 1 -22 -52Z" ${U}/>`,
  };
  function icon(name, o = {}) {
    const wash = o.wash ? `<path d="${blob(50, 52, 40, 38, name.length * 7 + 3, .1)}" fill="${named(o.wash)}" opacity=".55"/>` : '';
    return svg(wash + (UI[name] || UI.홈), { size: o.size, label: o.label || name, grain: false, k: .7 });
  }

  /* =========================================================
     3. 프로필 동물 8종 (얼굴, 정면) — 아이마다 동물+색
     ========================================================= */
  const PROFILE_KINDS = ['토끼', '곰', '고양이', '강아지', '여우', '펭귄', '사자', '다람쥐'];
  /** 프로필 아이콘. kind: PROFILE_KINDS, color: 바탕 원 색(HEX 또는 honey/sky…), face */
  function profile(kind = '토끼', o = {}) {
    const bg = named(o.color, C.sky);
    const f = o.face || '기본';
    const head = (fill) => P(circ(50, 56, 26), fill, { s: 3, hi: [40, 46, 7, 5] });
    let parts = '';
    switch (kind) {
      case '토끼':
        parts = P(elp(38, 24, 8, 20), '#FBF5EA', { s: 1.6 }) + P(elp(62, 24, 8, 20), '#FBF5EA', { s: 1.6 }) + `<ellipse cx="38" cy="26" rx="3.5" ry="13" fill="${C.cheek}" opacity=".6"/><ellipse cx="62" cy="26" rx="3.5" ry="13" fill="${C.cheek}" opacity=".6"/>` + head('#FBF5EA'); break;
      case '곰':
        parts = P(circ(29, 34, 10), C.brown, { s: 1.6 }) + P(circ(71, 34, 10), C.brown, { s: 1.6 }) + head(C.brown) + P(elp(50, 66, 12, 9), '#EBD2B0', { line: false, s: 1 }); break;
      case '고양이':
        parts = P('M28 44 L28 19 L46 34Z', C.gray, { s: 1.4 }) + P('M72 44 L72 19 L54 34Z', C.gray, { s: 1.4 }) + head(C.gray) + `<path d="M17 62 h12 M17 68 h12 M71 62 h12 M71 68 h12" ${PEN(1.6, .7)}/>`; break;
      case '강아지':
        parts = head(C.sand) + P('M28 40 C16 40 14 62 22 70 C28 66 30 52 32 44Z', C.brown, { s: 1.4 }) + P('M72 40 C84 40 86 62 78 70 C72 66 70 52 68 44Z', C.brown, { s: 1.4 }) + `<ellipse cx="61" cy="48" rx="7" ry="6" fill="${C.brown}" opacity=".45"/>`; break;
      case '여우':
        parts = P('M26 46 L24 17 L46 34Z', C.terracotta, { s: 1.4 }) + P('M74 46 L76 17 L54 34Z', C.terracotta, { s: 1.4 }) + head(C.terracotta) + P('M26 56 Q38 77 50 75 Q62 77 74 56 Q62 64 50 62 Q38 64 26 56Z', '#FBF1E1', { line: false, s: 1 }); break;
      case '펭귄':
        parts = P(circ(50, 56, 26), '#4E5A63', { s: 3 }) + P('M50 40 C36 36 30 50 32 62 C34 76 66 76 68 62 C70 50 64 36 50 40Z', '#FBF5EA', { line: false, s: 1.4 }) + P('M45 66 L50 70.5 L55 66Z', C.mustard, { lw: 1.6, s: .6 }); break;
      case '사자':
        parts = Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2; return P(circ(50 + Math.cos(a) * 28, 56 + Math.sin(a) * 28, 10.5), C.terracotta, { s: 1.6, lw: 1.8 }); }).join('') + head(C.honey); break;
      case '다람쥐':
        parts = P(circ(32, 32, 7), C.brown, { s: 1 }) + P(circ(68, 32, 7), C.brown, { s: 1 }) + head('#CF9A6C') + P(elp(36, 66, 9, 7), '#F6E5CC', { line: false, s: .8 }) + P(elp(64, 66, 9, 7), '#F6E5CC', { line: false, s: .8 }) + `<path d="M50 34 V44" ${PEN(3.4, .7, C.brown)}/>`; break;
    }
    const nose = kind === '펭귄' ? '' : `<ellipse cx="50" cy="${kind === '곰' ? 62 : 63}" rx="3.4" ry="2.6" fill="${TEXT}"/>`;
    const fc = kind === '펭귄' ? face(50, 52, .95, f, { gap: 9, noCheeks: true }).replace(new RegExp(TEXT, 'g'), '#FFF6E6') : face(50, 52, .95, f, { gap: 10 });
    const inner = P(circ(50, 50, 47), bg, { s: 4, lw: 1.6, lo: .6, hi: [32, 26, 14, 9] }) + `<g transform="translate(0 4)">${parts}${fc}${nose}</g>`;
    return svg(inner, { size: o.size, label: o.label || `${kind} 프로필` });
  }

  /* =========================================================
     4. 곤충 6종 · 꽃 3종 (벌찾기·다른그림용)
     구별 포인트: 벌 = 통통·줄 2개·더듬이 길게·날개 2쌍 / 꽃등에 = 날씬·큰 눈·더듬이 짧게·날개 1쌍 뒤로
     ========================================================= */
  const WINGC = '#E4EDEF';
  const DARK = '#4A3B31';
  const INSECT = {
    벌: (c) => P(elp(44, 30, 13, 17), WINGC, { tr: 'rotate(-20 44 30)', s: 1, lw: 1.8, op: .9 }) + P(elp(60, 30, 10, 14), WINGC, { tr: 'rotate(20 60 30)', s: 1, lw: 1.8, op: .9 }) +
      (() => { const id = nid('k'), body = elp(50, 58, 30, 22); return `<clipPath id="${id}"><path d="${body}"/></clipPath>` + P(body, c, { s: 3.4, hi: [56, 46, 10, 5], line: false }) +
        `<g clip-path="url(#${id})"><path d="M42 34 Q35 58 42 82 M58 34 Q51 58 58 82" fill="none" stroke="${SH ? SHADOW : DARK}" stroke-width="7.5"/></g><path d="${body}" ${PEN()}/>`; })() +
      `<path d="M80 58 l8 0" ${LINE}/>` + P(circ(24, 54, 13), DARK, { s: 2, hi: [20, 49, 3, 2.4] }) + `<circle cx="19.5" cy="51" r="2.6" fill="#FFF9EE"/>` +
      brush([[21, 43], [15, 31], [8, 26]], 3, INK) + brush([[27, 42], [27, 30], [20, 22]], 3, INK) + `<circle cx="8" cy="26" r="2.6" fill="${SH ? SHADOW : DARK}"/><circle cx="20" cy="22" r="2.6" fill="${SH ? SHADOW : DARK}"/>`,
    꽃등에: (c) => P('M46 50 L80 26 Q86 34 78 42 Z', WINGC, { s: 1, lw: 1.8, op: .9 }) + P('M46 56 L80 76 Q86 68 78 62 Z', WINGC, { s: 1, lw: 1.8, op: .9 }) +
      P(elp(56, 53, 32, 11), c, { s: 2.2, hi: [60, 47, 12, 2.6] }) + `<path d="M48 43.5 v19 M60 43 v20 M72 45 v16" stroke="${SH ? SHADOW : DARK}" stroke-width="3.4" stroke-linecap="round"/>` +
      P(elp(22, 53, 11, 12), '#D9A548', { s: 1.4 }) + P(elp(18, 47, 7, 8), '#8E4632', { s: 1, lw: 1.6 }) + P(elp(18, 60, 7, 7), '#8E4632', { s: 1, lw: 1.6 }) + `<circle cx="16" cy="45" r="2" fill="#FFF9EE"/><path d="M12 52 l-5 -2" ${PEN(1.8)}/>`,
    나비: (c) => P('M48 48 C30 17 7 22 11 42 C13 55 30 56 48 52Z', c, { s: 2.4, hi: [24, 34, 6, 5] }) + P('M52 48 C70 17 93 22 89 42 C87 55 70 56 52 52Z', c, { s: 2.4, hi: [70, 34, 6, 5] }) +
      P('M48 54 C32 58 21 76 34 82 C42 86 48 70 49 58Z', mix(c, '#FFF6E6', .35), { s: 1.8 }) + P('M52 54 C68 58 79 76 66 82 C58 86 52 70 51 58Z', mix(c, '#FFF6E6', .35), { s: 1.8 }) +
      `<circle cx="27" cy="39" r="4.6" fill="#FFF6E6" opacity=".85"/><circle cx="73" cy="39" r="4.6" fill="#FFF6E6" opacity=".85"/>` + P(rr(45, 34, 10, 46, 5), DARK, { s: 1, lw: 1.6 }) +
      brush([[48, 36], [42, 24], [35, 18]], 3, INK) + brush([[52, 36], [58, 24], [65, 18]], 3, INK),
    무당벌레: (c) => P(circ(50, 25, 12), DARK, { s: 1.4 }) + brush([[44, 17], [38, 9], [31, 8]], 3, INK) + brush([[56, 17], [62, 9], [69, 8]], 3, INK) + `<path d="M22 44 l-10 -4 M20 58 h-10 M24 72 l-10 6 M78 44 l10 -4 M80 58 h10 M76 72 l10 6" ${LINE}/>` +
      P(circ(50, 58, 30), c, { s: 3.4, hi: [60, 42, 7, 5] }) + `<path d="M50 29 V88" ${PEN(2.6, .9)}/>` + [[36, 48, 6], [64, 48, 6], [34, 68, 5], [66, 68, 5]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${SH ? SHADOW : DARK}" opacity=".92"/>`).join(''),
    잠자리: (c) => P(elp(30, 38, 22, 8), WINGC, { tr: 'rotate(-12 30 38)', s: .8, lw: 1.6, op: .9 }) + P(elp(70, 38, 22, 8), WINGC, { tr: 'rotate(12 70 38)', s: .8, lw: 1.6, op: .9 }) +
      P(elp(32, 54, 20, 7), WINGC, { tr: 'rotate(12 32 54)', s: .8, lw: 1.6, op: .9 }) + P(elp(68, 54, 20, 7), WINGC, { tr: 'rotate(-12 68 54)', s: .8, lw: 1.6, op: .9 }) +
      P(rr(45, 36, 10, 56, 5), c, { s: 1.6 }) + `<path d="M46 52 h8 M46 62 h8 M46 72 h8 M46 82 h8" ${PEN(1.4, .5)}/>` + P(circ(50, 40, 7), c, { s: 1 }) + P(circ(43, 24, 8), mix(c, '#3E2E24', .3), { s: 1.4 }) + P(circ(57, 24, 8), mix(c, '#3E2E24', .3), { s: 1.4 }) +
      `<circle cx="41" cy="21" r="2.4" fill="#FFF9EE"/><circle cx="55" cy="21" r="2.4" fill="#FFF9EE"/>`,
    개미: (c) => `<path d="M30 56 L18 74 M50 56 L50 78 M66 56 L80 74 M32 56 L20 40 M64 56 L78 42" ${LINE}/>` + P(circ(18, 48, 11), c, { s: 1.6 }) + P(elp(44, 56, 12, 9), c, { s: 1.4 }) + P(elp(72, 56, 17, 13), c, { s: 2.4, hi: [68, 50, 4, 3] }) +
      brush([[12, 40], [8, 28], [2, 24]], 3, INK) + brush([[20, 38], [22, 26], [18, 18]], 3, INK) + `<circle cx="14" cy="46" r="2.4" fill="#FFF9EE"/>`,
  };
  const INSECT_COLOR = { 벌: '#E3A93F', 꽃등에: '#D99A45', 나비: C.dustyblue, 무당벌레: C.red, 잠자리: '#7FA89B', 개미: '#7A5240' };
  function insectG(kind, o = {}) {
    const fn = INSECT[kind] || INSECT.벌;
    const flip = o.dir === 'right' && (kind === '벌' || kind === '꽃등에' || kind === '개미');
    const g = fn(named(o.color, INSECT_COLOR[kind]));
    return flip ? `<g transform="translate(100 0) scale(-1 1)">${g}</g>` : g;
  }
  /** 곤충. kind: 벌|나비|무당벌레|잠자리|개미|꽃등에, color, dir: 'left'|'right' */
  function insect(kind = '벌', o = {}) { return svg(insectG(kind, o), { size: o.size, label: o.label || kind }); }

  const STEM = () => SH ? SHADOW : C.moss;
  const FLOWER = {
    동글꽃: (c) => brush([[50, 52], [47, 74], [50, 97]], 6, STEM()) + P('M50 82 Q36 69 27 78 Q38 89 50 84Z', C.sprout, { s: 1.4, lw: 1.8 }) +
      [0, 72, 144, 216, 288].map((r) => P(elp(50, 20, 12, 13.5), c, { tr: `rotate(${r} 50 36)`, s: 2, hi: [46, 15, 3.5, 3] })).join('') + P(circ(50, 36, 10), C.mustard, { s: 1.8 }) + `<circle cx="46.5" cy="33" r="2.4" fill="#FFF6E6" opacity=".8"/>`,
    튤립: (c) => brush([[50, 52], [51, 74], [50, 97]], 6, STEM()) + P('M50 92 C34 86 30 70 34 60 C42 68 48 78 50 92Z', C.sprout, { s: 1.4, lw: 1.8 }) +
      P('M28 22 L38 30 L50 16 L62 30 L72 22 C76 40 70 58 50 58 C30 58 24 40 28 22Z', c, { s: 3, hi: [38, 38, 4, 7] }) + `<path d="M50 17 C44 30 44 46 50 57" ${PEN(1.6, .5)}/>`,
    해바라기: (c) => brush([[50, 58], [49, 78], [50, 97]], 6, STEM()) + P('M50 84 Q66 69 75 78 Q64 91 50 86Z', C.sprout, { s: 1.4, lw: 1.8 }) +
      Array.from({ length: 12 }, (_, i) => P(elp(50, 12, 6, 12), c, { tr: `rotate(${i * 30} 50 36)`, s: 1.2, lw: 1.7 })).join('') + P(circ(50, 36, 14), '#8F6342', { s: 2.4 }) +
      [[45, 32], [52, 38], [56, 31], [47, 40], [54, 44]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.7" fill="#E8CFA5" opacity=".7"/>`).join(''),
  };
  const FLOWER_COLOR = { 동글꽃: C.rose, 튤립: C.terracotta, 해바라기: C.mustard };
  function flowerG(kind, o = {}) { return (FLOWER[kind] || FLOWER.동글꽃)(named(o.color, FLOWER_COLOR[kind])); }
  /** 꽃. kind: 동글꽃|튤립|해바라기 */
  function flower(kind = '동글꽃', o = {}) { return svg(flowerG(kind, o), { size: o.size, label: o.label || kind }); }

  /* =========================================================
     5. 짝꿍카드용: 과일 6 · 동물 6 · 탈것 6 (값으로 바꾸는 그림)
     옵션: color, count(1~4), face(표정, 없음이면 얼굴 없음), dir('left'|'right'),
           pattern('없음'|'점'|'줄'|'하트'|'별'), shadow(true=그림자 짝), baby(동물만: 아기)
     ========================================================= */
  const PF = (d, pf) => pf ? `<path d="${d}" fill="${pf}" transform="translate(.8 .8)"/>` : '';
  const LEAF = (x = 0, y = 0) => P(`M${54 + x} ${22 + y} C${62 + x} ${12 + y} ${76 + x} ${14 + y} ${76 + x} ${18 + y} C${70 + x} ${26 + y} ${60 + x} ${26 + y} ${54 + x} ${22 + y}Z`, C.leaf, { s: 1, lw: 1.8 });
  const FRUIT_PARTS = {
    사과: (c, pf) => { const d = 'M50 30 C40 20 18 22 18 48 C18 72 36 88 50 82 C64 88 82 72 82 48 C82 22 60 20 50 30Z'; return P(d, c, { s: 4, hi: [32, 42, 5, 8] }) + PF(d, pf) + `<path d="M50 30 Q50 18 56 12" ${PEN(2.6)}/>` + LEAF(); },
    바나나: (c, pf) => { const d = 'M18 30 C20 64 46 84 82 70 C84 66 82 62 78 62 C52 68 34 52 30 28 C28 22 20 22 18 30Z'; return P(d, c, { s: 3 }) + PF(d, pf) + P('M18 30 L20 20 L28 22 L30 28Z', '#7E6238', { s: .6, lw: 1.8 }) + `<path d="M28 44 C34 58 46 66 60 68" ${PEN(1.8, .5)}/>`; },
    딸기: (c, pf) => { const d = 'M50 88 C28 76 16 54 22 38 C30 26 70 26 78 38 C84 54 72 76 50 88Z'; return P(d, c, { s: 3.6, hi: [34, 44, 5, 7] }) + PF(d, pf) + P('M26 32 L36 22 L44 30 L50 18 L56 30 L64 22 L74 32 Q50 40 26 32Z', C.leaf, { s: 1, lw: 1.8 }) + [[34, 50], [46, 46], [58, 48], [68, 52], [40, 62], [56, 64], [48, 76]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.6" ry="2.4" fill="#F7E3B0"/>`).join(''); },
    포도: (c, pf) => [[38, 36], [52, 34], [66, 38], [32, 50], [46, 50], [60, 50], [72, 52], [40, 64], [54, 64], [66, 66], [48, 78], [60, 78]].map(([x, y]) => P(circ(x, y, 9), c, { s: 1.8, lw: 2 }) + PF(circ(x, y, 9), pf) + dab(x - 3, y - 3, 2, 2, .5)).join('') + `<path d="M52 26 Q52 16 58 10" ${PEN(2.6)}/>` + LEAF(),
    수박: (c, pf) => { const d = 'M16 34 H84 C84 56 68 74 50 74 C32 74 16 56 16 34Z'; return P('M10 34 H90 C90 60 72 82 50 82 C28 82 10 60 10 34Z', '#6F8A48', { s: 2 }) + P(d, c, { line: false, s: 3 }) + PF(d, pf) + `<path d="M10 34 H90" ${LINE}/>` + [[34, 44], [50, 48], [66, 44], [42, 60], [58, 60]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2.4" ry="3.6" fill="${SH ? SHADOW : DARK}"/>`).join(''); },
    귤: (c, pf) => P(circ(50, 54, 32), c, { s: 4, hi: [37, 42, 6, 5] }) + PF(circ(50, 54, 32), pf) + `<path d="M50 22 l-2 -6" ${LINE}/>` + LEAF(-4, -2) + `<circle cx="62" cy="70" r="1.4" fill="${mix(c, '#3E2E24', .3)}"/><circle cx="70" cy="60" r="1.4" fill="${mix(c, '#3E2E24', .3)}"/>`,
  };
  const FRUIT_COLOR = { 사과: '#C9594A', 바나나: '#E8C35A', 딸기: '#D2614F', 포도: '#8E6F9E', 수박: '#D97B6E', 귤: '#E39A48' };
  const FRUIT_FACE = { 사과: [50, 54, .9], 바나나: [44, 56, .7], 딸기: [50, 54, .85], 포도: [53, 52, .8], 수박: [50, 50, .8], 귤: [50, 56, .9] };
  const FRUITS = Object.keys(FRUIT_PARTS);

  function arrange(drawOne, count) {
    count = Math.max(1, Math.min(4, count | 0 || 1));
    if (count === 1) return drawOne();
    const spots = { 2: [[-20, 0], [20, 0]], 3: [[-22, 14], [22, 14], [0, -18]], 4: [[-20, -20], [20, -20], [-20, 20], [20, 20]] }[count];
    const sc = count === 2 ? .56 : .5;
    return spots.map(([x, y]) => `<g transform="translate(${50 + x - 50 * sc} ${50 + y - 50 * sc}) scale(${sc})">${drawOne()}</g>`).join('');
  }
  function wrapDir(inner, dir) { return dir === 'right' ? `<g transform="translate(100 0) scale(-1 1)">${inner}</g>` : inner; }
  function withShadow(on, fn) { const prev = SH; SH = !!on; try { return fn(); } finally { SH = prev; } }
  function toShadow(g) {
    return g.replace(/<g class="face">[\s\S]*?<\/g>/g, '')
      .replace(/fill="(?!none|url)[^"]*"/g, `fill="${SHADOW}"`)
      .replace(/stroke="(?!none)[^"]*"/g, `stroke="${SHADOW}"`)
      .replace(/opacity="[^"]*"/g, '');
  }

  /** 과일. kind: 사과|바나나|딸기|포도|수박|귤. 예) Art.fruit('사과',{count:2}) / {face:'웃음', pattern:'점', shadow:true} */
  function fruitG(kind, o = {}, ctx = {}) {
    const draw = FRUIT_PARTS[kind] || FRUIT_PARTS.사과;
    const sh = !!o.shadow;
    let pf = '';
    if (!sh && o.pattern && o.pattern !== '없음') { const id = nid('p'); ctx.defs = (ctx.defs || '') + patternDef(id, o.pattern); pf = `url(#${id})`; }
    const col = named(o.color, FRUIT_COLOR[kind]);
    const one = () => withShadow(sh, () => {
      let g = draw(col, pf);
      if (sh) g = toShadow(g);
      else if (o.face && o.face !== '없음') { const [x, y, s] = FRUIT_FACE[kind]; g += face(x, y, s, o.face, { gap: 9 }); }
      return wrapDir(g, o.dir);
    });
    return arrange(one, o.count);
  }
  function fruit(kind = '사과', o = {}) {
    const ctx = {}; const g = fruitG(kind, o, ctx);
    return svg(g, { size: o.size, label: o.label || `${kind}${o.count > 1 ? ' ' + o.count + '개' : ''}${o.shadow ? ' 그림자' : ''}`, defs: ctx.defs });
  }

  // 동물 6종 (옆모습, 기본은 왼쪽을 봄)
  const ANIMAL = {
    강아지: { color: C.sand, body: 'M30 50 C30 42 36 40 44 40 H70 C80 40 84 48 84 56 C84 66 78 70 70 70 H44 C34 70 30 62 30 50Z',
      draw: (c, B) => brush([[82, 50], [91, 42], [90, 30]], 6, INK, .9) + P(rr(40, 62, 9, 20, 4.5), c, { s: 1 }) + P(rr(70, 62, 9, 20, 4.5), c, { s: 1 }) + B + P(circ(28, 40, 18), c, { s: 2.6, hi: [24, 32, 5, 4] }) + P(elp(14, 46, 7, 5.5), mix(c, '#FFF8EA', .5), { s: .8, lw: 1.8 }) + `<circle cx="9" cy="44" r="2.6" fill="${SH ? SHADOW : DARK}"/>` + P('M34 26 C46 22 48 42 40 50 C34 46 32 34 34 26Z', C.brown, { s: 1.2 }), face: [26, 36, .75, 7] },
    고양이: { color: C.gray, body: 'M32 52 C32 44 38 42 46 42 H70 C80 42 84 50 84 58 C84 66 78 70 70 70 H46 C36 70 32 62 32 52Z',
      draw: (c, B) => brush([[82, 56], [95, 48], [86, 26]], 6, INK, .9) + P(rr(42, 62, 9, 20, 4.5), c, { s: 1 }) + P(rr(70, 62, 9, 20, 4.5), c, { s: 1 }) + B + P('M16 30 L16 13 L28 24Z', c, { s: .8 }) + P('M38 26 L42 11 L46 30Z', c, { s: .8 }) + P(circ(30, 40, 17), c, { s: 2.6, hi: [26, 32, 5, 4] }) + `<path d="M6 44 h10 M6 49 h10" ${PEN(1.5, .7)}/><ellipse cx="18" cy="45" rx="2.4" ry="1.8" fill="${SH ? SHADOW : DARK}"/>`, face: [28, 37, .72, 7] },
    토끼: { color: '#F7F1E4', body: 'M34 58 C34 46 46 44 58 44 C74 44 84 52 84 62 C84 72 74 76 62 76 H46 C38 76 34 68 34 58Z',
      draw: (c, B) => P(circ(86, 60, 7), '#FBF7EE', { s: .8 }) + P(elp(50, 78, 10, 5), c, { s: .8 }) + P(elp(74, 78, 10, 5), c, { s: .8 }) + B + P(elp(30, 16, 6, 16), c, { tr: 'rotate(-12 30 30)', s: 1 }) + P(elp(42, 16, 6, 16), c, { tr: 'rotate(10 42 30)', s: 1 }) + P(circ(32, 44, 16), c, { s: 2.4 }) + `<ellipse cx="18" cy="48" rx="2.4" ry="1.8" fill="${SH ? SHADOW : DARK}"/>`, face: [30, 41, .7, 7] },
    곰: { color: C.brown, body: 'M30 54 C30 40 42 36 56 36 C72 36 86 44 86 58 C86 70 76 76 64 76 H46 C36 76 30 66 30 54Z',
      draw: (c, B) => P(rr(38, 66, 13, 18, 6), c, { s: 1 }) + P(rr(68, 66, 13, 18, 6), c, { s: 1 }) + B + P(circ(34, 20, 7), c, { s: 1 }) + P(circ(28, 38, 18), c, { s: 2.6, hi: [24, 30, 5, 4] }) + P(elp(15, 44, 8, 6.5), '#EBD2B0', { s: .8, lw: 1.8 }) + `<circle cx="10" cy="42" r="2.6" fill="${SH ? SHADOW : DARK}"/>`, face: [28, 34, .72, 7] },
    오리: { color: '#FBF5E6', body: 'M30 56 C30 46 40 44 50 46 L76 44 L90 38 L86 56 C84 70 72 76 58 76 C42 76 30 68 30 56Z',
      draw: (c, B) => `<path d="M48 76 v8 h-6 M64 76 v8 h-6" fill="none" stroke="${SH ? SHADOW : C.terracotta}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>` + B + P('M48 54 C56 50 68 52 74 58 C66 66 54 64 48 54Z', mix(c, '#3E2E24', .08), { s: 1, lw: 1.8 }) + P(circ(32, 34, 15), c, { s: 2 }) + P('M18 34 L4 38 L18 42 Z', C.mustard, { s: .6, lw: 1.8 }), face: [33, 31, .65, 6] },
    코끼리: { color: '#A9B4B8', body: 'M34 50 C34 38 46 34 60 34 C76 34 88 42 88 56 C88 68 80 74 68 74 H48 C38 74 34 64 34 50Z',
      draw: (c, B) => P(rr(44, 64, 12, 20, 5), c, { s: 1 }) + P(rr(70, 64, 12, 20, 5), c, { s: 1 }) + `<path d="M88 52 l6 6" ${LINE}/>` + B + P(circ(30, 42, 18), c, { s: 2.6, hi: [26, 34, 5, 4] }) + P('M16 48 C10 58 8 70 16 78 C20 80 22 76 18 72 C16 66 20 58 24 54Z', c, { s: 1 }) + P('M38 28 C56 24 58 54 42 56 C38 50 36 38 38 28Z', mix(c, '#FFF8EA', .35), { s: 1.4 }), face: [26, 38, .7, 6] },
  };
  const ANIMALS = Object.keys(ANIMAL);
  function animalG(kind, o = {}, ctx = {}) {
    const a = ANIMAL[kind] || ANIMAL.강아지;
    const sh = !!o.shadow;
    const col = named(o.color, a.color);
    let PP = '';
    if (!sh && o.pattern && o.pattern !== '없음') {
      const id = nid('p');
      ctx.defs = (ctx.defs || '') + patternDef(id, o.pattern, /^#F[0-9A-F]F/i.test(col) || col === '#FBF5E6' || col === '#F7F1E4' ? 'rgba(74,63,55,.28)' : 'rgba(255,250,238,.75)');
      PP = `<path d="${a.body}" fill="url(#${id})" transform="translate(.8 .8)"/>`;
    }
    const one = () => withShadow(sh, () => {
      const bodyEl = P(a.body, col, { s: 3.4, hi: [56, 46, 12, 4] }) + PP;
      let g = a.draw(col, bodyEl);
      if (!sh) { const [x, y, s, gap] = a.face; g += face(x, y, s, o.face || '기본', { gap, bigEyes: !!o.baby, noZ: true }); }
      else g = toShadow(g);
      if (o.baby) g = `<g transform="translate(50 86) scale(.68) translate(-50 -86)">${g}</g>`;
      return wrapDir(g, o.dir);
    });
    return arrange(one, o.count);
  }
  /** 동물(옆모습). kind: 강아지|고양이|토끼|곰|오리|코끼리. 옵션: color, face, dir('left' 기본|'right'), pattern, baby, shadow, count */
  function animal(kind = '강아지', o = {}) {
    const ctx = {}; const g = animalG(kind, o, ctx);
    return svg(g, { size: o.size, label: o.label || `${o.baby ? '아기 ' : ''}${kind}${o.shadow ? ' 그림자' : ''}`, defs: ctx.defs });
  }

  const GLASS = '#DCE7EB';
  const WHEEL = (x, y, r) => P(circ(x, y, r), '#4E4540', { s: 1.4, lw: 1.8 }) + `<circle cx="${x}" cy="${y}" r="${r * .38}" fill="${SH ? SHADOW : '#EADBC6'}"/>`;
  const VEHICLE = {
    자동차: (c) => P('M12 64 V52 C12 48 16 46 20 46 L30 30 C32 27 35 26 38 26 H62 C66 26 68 27 70 30 L80 46 C86 46 90 50 90 56 V64 Z', c, { s: 3, hi: [40, 50, 14, 3] }) + P('M34 32 H48 V46 H26Z', GLASS, { s: .8, lw: 1.8 }) + P('M54 32 H66 L74 46 H54Z', GLASS, { s: .8, lw: 1.8 }) + WHEEL(30, 66, 10) + WHEEL(72, 66, 10) + `<circle cx="16" cy="54" r="3" fill="${SH ? SHADOW : C.mustard}"/>`,
    버스: (c) => P(rr(8, 22, 84, 46, 10), c, { s: 3, hi: [30, 28, 14, 2.5] }) + [16, 34, 52].map((x) => P(rr(x, 30, 14, 14, 3), GLASS, { s: .8, lw: 1.8 })).join('') + P(rr(72, 30, 14, 30, 3), GLASS, { s: .8, lw: 1.8 }) + `<path d="M9 52 H70" stroke="${SH ? SHADOW : '#FBF2DD'}" stroke-width="4" opacity=".9"/>` + WHEEL(26, 70, 9) + WHEEL(72, 70, 9),
    기차: (c) => P(rr(40, 34, 50, 34, 6), c, { s: 2.4 }) + P(rr(10, 22, 34, 46, 6), mix(c, '#3E2E24', .15), { s: 2.4 }) + P(rr(16, 28, 22, 14, 3), GLASS, { s: .8, lw: 1.8 }) + P(rr(18, 10, 10, 12, 1), '#4E4540', { s: .6, lw: 1.6 }) + P(circ(23, 6, 4.4), '#EFE8DC', { s: .6, lw: 1.4 }) + [22, 50, 76].map((x) => WHEEL(x, 72, 8)).join('') + `<path d="M4 82 H96" ${PEN(2, .4)}/>`,
    비행기: (c) => P('M8 52 C8 44 18 42 26 42 H80 C90 42 96 46 96 50 C96 54 90 58 80 58 H26 C18 58 8 58 8 52Z', c, { s: 2.4 }) + P('M44 46 L60 16 H70 L62 46Z', mix(c, '#3E2E24', .14), { s: 1.4 }) + P('M44 56 L60 84 H70 L62 56Z', mix(c, '#3E2E24', .14), { s: 1.4 }) + P('M12 46 L6 28 H14 L24 44Z', mix(c, '#3E2E24', .14), { s: 1 }) + [70, 78].map((x) => P(circ(x, 49, 3), GLASS, { s: .4, lw: 1.4 })).join(''),
    배: (c) => `<path d="M48 14 V58" ${LINE}/>` + P('M50 16 L78 52 H50Z', '#FBF5EA', { s: 1.6 }) + P('M46 22 L24 52 H46Z', C.mustard, { s: 1.6 }) + P('M10 60 H90 L78 80 H22 Z', c, { s: 2.6, hi: [40, 64, 16, 2] }) + brush([[4, 88], [14, 84], [24, 88], [34, 84], [44, 88], [54, 84], [64, 88], [74, 84], [84, 88], [96, 85]], 4, SH ? SHADOW : C.dustyblue),
    자전거: (c) => `<circle cx="24" cy="62" r="18" ${PEN(4, .9)}/><circle cx="76" cy="62" r="18" ${PEN(4, .9)}/><path d="M24 62 L40 36 H66 L76 62 M40 36 L52 62 L66 36 M52 62 H24" fill="none" stroke="${SH ? SHADOW : c}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 62 L40 36 H66 L76 62 M40 36 L52 62 L66 36 M52 62 H24" ${PEN(1.2, .5)}/><path d="M36 30 H46 M66 36 L62 24 H72" ${PEN(4, .9)}/><circle cx="52" cy="62" r="4" fill="${SH ? SHADOW : DARK}"/>`,
  };
  const VEHICLE_COLOR = { 자동차: C.terracotta, 버스: C.mustard, 기차: C.dustyblue, 비행기: '#ECE5D6', 배: C.red, 자전거: '#7FA89B' };
  const VEHICLES = Object.keys(VEHICLE);
  function vehicleG(kind, o = {}) {
    const sh = !!o.shadow;
    const one = () => withShadow(sh, () => { let g = (VEHICLE[kind] || VEHICLE.자동차)(named(o.color, VEHICLE_COLOR[kind])); if (sh) g = toShadow(g); return wrapDir(g, o.dir === 'left' ? 'right' : ''); });
    return arrange(one, o.count);
  }
  /** 탈것. kind: 자동차|버스|기차|비행기|배|자전거. 옵션: color, dir('left'|'right' — 기본은 오른쪽으로 감), count, shadow */
  function vehicle(kind = '자동차', o = {}) { return svg(vehicleG(kind, o), { size: o.size, label: o.label || kind }); }

  /* ---------- 짝 규칙 카드 (7단계): 숫자-점, 엄마-아기, 그림-그림자 ---------- */
  function numberCard(n, o = {}) {
    return svg(`<text x="50" y="72" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="62" fill="${named(o.color, TEXT)}">${n | 0}</text>`, { size: o.size, label: o.label || `숫자 ${n}`, grain: false });
  }
  function dotsCard(n, o = {}) {
    const L = { 1: [[50, 50]], 2: [[30, 30], [70, 70]], 3: [[28, 28], [50, 50], [72, 72]], 4: [[30, 30], [70, 30], [30, 70], [70, 70]], 5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]], 6: [[30, 24], [70, 24], [30, 50], [70, 50], [30, 76], [70, 76]] };
    let pts = L[n];
    if (!pts) { pts = []; for (let i = 0; i < n; i++) pts.push([20 + (i % 5) * 15, n > 5 ? (i < 5 ? 36 : 64) : 50]); }
    const c = named(o.color, C.mustard);
    return svg(pts.map(([x, y]) => P(circ(x, y, n > 6 ? 6 : 9), c, { s: 1.4, lw: 2 })).join(''), { size: o.size, label: o.label || `점 ${n}개` });
  }
  function momBaby(kind = '오리', which = 'mom', o = {}) {
    return which === 'baby' ? animal(kind, Object.assign({}, o, { baby: true })) : animal(kind, o);
  }
  function silhouette(type, kind, o = {}) {
    const f = { fruit, animal, vehicle }[type];
    if (f) return f(kind, Object.assign({}, o, { shadow: true }));
    if (type === 'insect') return svg(withShadow(true, () => toShadow((INSECT[kind] || INSECT.벌)(SHADOW))), { size: o.size, label: `${kind} 그림자` });
    return '';
  }

  /* =========================================================
     6. 그림체 4가지 (다른그림 단계별) — 같은 장면 데이터를 4가지로
     style: 'line' | 'flat' | 'water'(기본 추천) | 'pencil'
     ========================================================= */
  const SAMPLE_SCENE = {
    w: 400, h: 300, sky: '#E3EAEC', ground: '#E6E9D2',
    items: [
      { t: 'circle', cx: 330, cy: 62, r: 30, c: '#E5B65A' },
      { t: 'path', d: 'M0 210 Q110 160 230 200 T400 190 V300 H0Z', c: '#B3C08A', shade: 'M0 250 Q140 220 400 240 V300 H0Z' },
      { t: 'rect', x: 70, y: 140, w: 110, h: 90, c: '#F3DCC8', shade: 'M150 140 H180 V230 H150Z' },
      { t: 'path', d: 'M58 146 L125 88 L192 146Z', c: '#C9714F', shade: 'M125 88 L192 146 H150Z' },
      { t: 'rect', x: 108, y: 180, w: 32, h: 50, c: '#8E6446' },
      { t: 'rect', x: 80, y: 158, w: 22, h: 22, c: '#8DA9BF' },
      { t: 'rect', x: 270, y: 150, w: 16, h: 70, c: '#8E6446' },
      { t: 'circle', cx: 278, cy: 128, r: 40, c: '#7F9650', shade: 'M278 168 A40 40 0 0 0 318 128 A40 40 0 0 1 278 150Z' },
      { t: 'circle', cx: 220, cy: 240, r: 9, c: '#D9A08F' }, { t: 'circle', cx: 345, cy: 246, r: 9, c: '#B08EA8' },
      { t: 'path', d: 'M40 70 q12 -18 28 -6 q14 -12 26 4 q14 2 10 14 H40 q-12 -4 0 -12Z', c: '#FFFCF5' },
    ],
  };
  function shapeD(s) {
    if (s.t === 'circle') return circ(s.cx, s.cy, s.r);
    if (s.t === 'ellipse') return elp(s.cx, s.cy, s.rx, s.ry);
    if (s.t === 'rect') return rr(s.x, s.y, s.w, s.h, s.rx || 4);
    return s.d;
  }
  function scene(style = 'water', sc = SAMPLE_SCENE, o = {}) {
    const W = sc.w, H = sc.h;
    let defs = '', body = '', tex = true;
    if (style === 'line') {
      body = `<rect width="${W}" height="${H}" fill="${sc.sky}"/>` + sc.items.map((s) => `<path d="${shapeD(s)}" fill="${s.c}" stroke="${INK}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>`).join('');
    } else if (style === 'flat') {
      tex = false;
      body = `<rect width="${W}" height="${H}" fill="${sc.sky}"/>` + sc.items.map((s) => `<path d="${shapeD(s)}" fill="${s.c}"/>` + (s.shade ? `<path d="${s.shade}" fill="${INK}" opacity=".12"/>` : '')).join('');
    } else if (style === 'pencil') {
      const h = nid('h');
      defs = `<pattern id="${h}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><path d="M0 0 V7" stroke="#6E655C" stroke-width="1.1" opacity=".5"/></pattern>`;
      body = `<rect width="${W}" height="${H}" fill="#FBF8F0"/>` + sc.items.map((s) => { const d = shapeD(s); return `<path d="${d}" fill="${s.c}" opacity=".2"/>` + (s.c !== '#FFFCF5' ? `<path d="${d}" fill="url(#${h})"/>` : '') + `<path d="${d}" ${PEN(1.8, .85)}/><path d="${d}" ${PEN(1, .45)} transform="translate(1.6 -1)"/>`; }).join('');
    } else { // water
      body = `<rect width="${W}" height="${H}" fill="#FBF6EA"/>` + P(rr(6, 6, W - 12, H - 12, 6), sc.sky, { line: false, s: 6 }) + sc.items.map((s) => P(shapeD(s), s.c, { lw: 2.6, s: 6, off: 2 })).join('');
    }
    return svg(body, { vb: `0 0 ${W} ${H}`, defs, tex, k: .7, label: o.label || `견본 장면 (${STYLE_NAMES[style] || style})` });
  }
  const STYLE_NAMES = { line: '굵은 선 그림책', flat: '색면 일러스트', water: '수채 그림책', pencil: '연필 스케치' };

  /* =========================================================
     7. (v2 새로) 장면 그림 — 기본 그림 겸 앱 배경
     ========================================================= */
  const at = (x, y, s, g, r = 0) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})">${g}</g>`;
  const grass = (x, y, n = 5, h = 12, seed = 1, col = C.moss) => { const R = rng(seed); let s = ''; for (let i = 0; i < n; i++) { const gx = x + (i - n / 2) * 4 + R() * 3, hh = h * (.6 + R() * .6); s += brush([[gx, y], [gx + (R() - .5) * 4, y - hh * .55], [gx + (R() - .3) * 6, y - hh]], 2.6, col, .75); } return s; };
  const cloud = (x, y, s = 1, seed = 2) => P(blob(x, y, 30 * s, 12 * s, seed, .12, 9), '#FFFAF0', { line: false, s: 2, op: .9 }) + P(blob(x - 10 * s, y - 7 * s, 15 * s, 11 * s, seed + 3, .1, 8), '#FFFAF0', { line: false, s: 1.5, op: .9 });
  const hill = (d, col, seed = 1) => P(d, col, { line: false, s: 5, off: 0 });
  const tree = (x, y, s = 1, col = C.olive) => P(`M${x - 3 * s} ${y} L${x - 2 * s} ${y - 26 * s} H${x + 2 * s} L${x + 3 * s} ${y}Z`, C.bark, { s: 1, lw: 1.8 }) + P(blob(x, y - 36 * s, 18 * s, 20 * s, x | 0, .14, 9), col, { s: 4, hi: [x - 6 * s, y - 44 * s, 6 * s, 5 * s] });
  const sun = (x, y, r) => P(blob(x, y, r, r, 4, .05, 12), '#E9BE62', { line: false, s: 3, hi: [x - r * .3, y - r * .3, r * .4, r * .3] });

  const ROOM = {
    attention: () => at(18, 66, 1.05, flowerG('해바라기')) + at(110, 92, .8, flowerG('동글꽃', { color: C.rose })) + at(92, 28, .62, insectG('벌'), -8) + `<path d="M96 60 q-14 10 -30 4 q-12 -4 -20 6" ${PEN(2, .45)} stroke-dasharray="1 6"/>`,
    memory: () => at(30, 62, .66, `${P(rr(9, 18, 39, 57, 7), CREAM_W, { tr: 'rotate(-12 29 46)', s: 2 })}${P(rr(52, 26, 39, 57, 7), '#B08EA8', { tr: 'rotate(8 71 54)', s: 2 })}<g transform="translate(9 26) scale(.4)">${FRUIT_PARTS.딸기(FRUIT_COLOR.딸기)}</g>`, -4) + at(104, 70, .62, `${P(rr(10, 18, 40, 58, 7), CREAM_W, { tr: 'rotate(6 30 46)', s: 2 })}<g transform="translate(10 26) scale(.42)">${FRUIT_PARTS.딸기(FRUIT_COLOR.딸기)}</g>`) + at(60, 6, .5, AREA_ICON.memory()),
    seeing: () => at(30, 82, .66, insectG('무당벌레'), -10) + at(108, 96, .6, flowerG('튤립')) + at(56, 38, 1.05, AREA_ICON.seeing()),
    thinking: () => at(30, 100, .5, P(circ(50, 50, 30), C.sage, { s: 2 })) + at(70, 100, .5, P(rr(22, 22, 56, 56, 10), C.mustard, { s: 2 })) + at(110, 100, .5, P(circ(50, 50, 30), C.sage, { s: 2 })) + at(150, 100, .5, `<rect x="22" y="22" width="56" height="56" rx="10" fill="#FFF9EE" ${PEN(3, .8)} stroke-dasharray="7 7"/>`) + at(60, 26, .8, AREA_ICON.thinking(), -8),
    hands: () => at(40, 40, 1, P(rr(8, 8, 84, 70, 4), '#FFF9EE', { s: 2, tr: 'rotate(-5 50 43)' }) + brush([[24, 50], [30, 34], [44, 30], [50, 42], [56, 30], [70, 34], [74, 50], [50, 72], [26, 52]], 5, C.terracotta, .85)) + at(118, 84, .7, AREA_ICON.hands(), 10),
    words: () => at(30, 40, .9, AREA_ICON.words(), -6) + at(104, 92, .7, animalG('오리', { face: '웃음' })) + at(118, 36, .4, P('M16 21 h68 a9 9 0 0 1 9 9 v33 a9 9 0 0 1 -9 9 h-13 v14 l-17 -14 h-38 a9 9 0 0 1 -9 -9 v-33 a9 9 0 0 1 9 -9Z', '#F2E6C9', { s: 2 }) + T(50, 58, 28, '나', C.oliveDeep)),
    body: () => at(26, 66, .95, AREA_ICON.body()) + at(116, 104, .5, P(circ(50, 50, 34), C.terracotta, { s: 4, hi: [40, 38, 9, 7] }) + `<path d="M20 44 Q50 30 80 44 M18 60 Q50 74 82 60" ${PEN(3, .5)}/>`) + `<path d="M120 90 q10 -30 22 -2" ${PEN(2, .4)} stroke-dasharray="1 6"/>`,
  };
  /** 방 카드 삽화(정사각형, 기본 그림). id: 영역 id */
  function roomArt(id, o = {}) {
    const a = AREAS.find((x) => x.id === id || x.name === id) || AREAS[0];
    const seed = a.id.length * 13;
    const bg = P(rr(-12, -12, 224, 224, 0), a.tint, { line: false, s: 0, off: 0, flat: true }) +
      P(blob(150, 46, 46, 36, seed, .12, 9), mix(a.tint, '#FFFBF2', .5), { line: false, s: 0, off: 0, flat: true }) +
      hill(`M-10 150 Q50 ${120 + seed % 14} 110 140 T210 ${132 + seed % 9} V210 H-10Z`, mix(a.color, '#F3EEDC', .55)) +
      hill(`M-10 172 Q70 156 130 168 T210 162 V210 H-10Z`, mix(a.color, '#E9E3CC', .35)) + grass(30, 176, 5, 12, seed) + grass(172, 170, 4, 10, seed + 1);
    return svg(bg + ROOM[a.id](), { vb: '0 0 200 200', size: o.size, label: o.label || `${a.name} 방`, par: 'xMidYMid slice', k: .8 });
  }
  /** 첫 화면 배경(가로로 긴 풍경). 보미는 HTML에서 따로 올린다. */
  function heroScene(o = {}) {
    const g = `<rect x="-20" y="-20" width="440" height="300" fill="#F4EBD7"/>` + sun(318, 62, 22) + cloud(90, 56, 1, 3) + cloud(236, 34, .7, 7) +
      hill('M-10 190 Q80 140 180 170 T410 150 V270 H-10Z', '#C9CF9F') + hill('M-10 214 Q120 186 240 206 T410 196 V270 H-10Z', '#A9B67A') +
      tree(52, 198, 1.02, C.olive) + tree(352, 190, .82, '#93A65C') + at(150, 196, .34, flowerG('동글꽃')) + at(270, 202, .3, flowerG('튤립')) + at(300, 210, .26, flowerG('동글꽃', { color: C.mustard })) +
      grass(120, 236, 6, 14, 3) + grass(220, 240, 5, 12, 5) + grass(330, 236, 5, 12, 8) + at(214, 120, .26, insectG('나비'), 10);
    return svg(g, { vb: '0 0 400 260', label: o.label || '들판 풍경', par: o.par || 'xMidYMax slice', k: .9 });
  }
  /** 칭찬 장면 배경(작은 언덕 + 종이 꽃잎). 보미 만세는 위에 올린다. o.tall: 세로 화면(폰)용 300x600 */
  function praiseScene(o = {}) {
    if (o.tall) {
      const R = rng(33); let petals = '';
      const cols = [C.mustard, C.rose, C.sage, C.dustyblue, C.terracotta];
      for (let i = 0; i < 16; i++) { const x = 14 + R() * 272, y = 30 + R() * 330, c = cols[i % 5]; if (x > 70 && x < 230 && y > 120 && y < 330) continue; petals += P(i % 3 ? `M${x} ${y} q6 -8 12 0 q-6 8 -12 0Z` : star(x, y, 6, 3), c, { lw: 1.2, s: 1, tr: `rotate(${(R() * 80 - 40) | 0} ${x} ${y})` }); }
      const g = `<rect x="-20" y="-20" width="340" height="640" fill="#F6EEDB"/>` + P(blob(150, 250, 140, 170, 5, .07, 12), '#F4E4BE', { line: false, s: 0, off: 0, flat: true }) + P(blob(150, 240, 90, 100, 8, .08, 10), '#F7EACB', { line: false, s: 0, off: 0, flat: true }) +
        hill('M-10 500 Q150 450 310 500 V610 H-10Z', '#BCC58F') + hill('M-10 545 Q170 520 310 548 V610 H-10Z', '#A9B67A') + grass(70, 520, 6, 16, 4) + grass(230, 522, 6, 16, 6) + at(12, 455, .5, flowerG('동글꽃')) + at(236, 450, .55, flowerG('해바라기')) + petals;
      return svg(g, { vb: '0 0 300 600', label: o.label || '칭찬 장면', par: 'xMidYMax slice', k: .9 });
    }
    const R = rng(21); let petals = '';
    const cols = [C.mustard, C.rose, C.sage, C.dustyblue, C.terracotta];
    for (let i = 0; i < 18; i++) { const x = 20 + R() * 360, y = 20 + R() * 150, c = cols[i % 5]; petals += P(i % 3 ? `M${x} ${y} q6 -8 12 0 q-6 8 -12 0Z` : star(x, y, 6, 3), c, { lw: 1.2, s: 1, tr: `rotate(${(R() * 80 - 40) | 0} ${x} ${y})` }); }
    const g = `<rect x="-20" y="-20" width="440" height="340" fill="#F6EEDB"/>` + P(blob(200, 130, 150, 110, 5, .08, 12), '#F3E3BC', { line: false, s: 0, off: 0, flat: true }) +
      hill('M-10 250 Q200 190 410 250 V310 H-10Z', '#B9C38C') + grass(120, 262, 6, 14, 4) + grass(290, 262, 6, 14, 6) + at(40, 228, .5, flowerG('동글꽃')) + at(320, 226, .5, flowerG('해바라기')) + petals;
    return svg(g, { vb: '0 0 400 300', label: o.label || '칭찬 장면', par: o.par || 'xMidYMid slice', k: .9 });
  }
  /** 잠깐 쉬어요 장면(저녁 하늘, 달, 잎사귀). 달롱은 위에 올린다. o.tall: 세로 화면(폰)용 300x600 */
  function restScene(o = {}) {
    if (o.tall) {
      const R = rng(12); let stars = '';
      for (let i = 0; i < 16; i++) { const x = 12 + R() * 276, y = 150 + R() * 230; stars += `<path d="${star(x, y, 2.2 + R() * 2, 1)}" fill="#F3E2B4" opacity="${.45 + R() * .4}"/>`; }
      const g = `<rect x="-20" y="-20" width="340" height="640" fill="#8097AB"/>` + P(blob(150, 300, 220, 200, 4, .06, 10), '#8DA3B6', { line: false, s: 0, off: 0, flat: true }) + stars +
        P(circ(240, 118, 18), '#F6E7BE', { line: false, s: 2, hi: [234, 112, 6, 5] }) + `<circle cx="248" cy="113" r="15" fill="#8DA3B6"/>` +
        hill('M-10 470 Q90 430 170 452 T310 440 V610 H-10Z', '#6D8569') + hill('M-10 520 Q150 496 310 516 V610 H-10Z', '#5C7458') +
        P('M40 560 C80 516 220 512 262 556 C210 576 100 578 40 560Z', '#93AE6D', { s: 4 }) + `<path d="M48 558 C110 544 190 544 256 556" ${PEN(1.6, .5)}/>` + grass(24, 572, 4, 14, 2, '#46593F') + grass(282, 570, 4, 14, 9, '#46593F');
      return svg(g, { vb: '0 0 300 600', label: o.label || '쉬는 시간 저녁 하늘', par: 'xMidYMax slice', k: .9 });
    }
    const R = rng(8); let stars = '';
    for (let i = 0; i < 14; i++) { const x = 16 + R() * 368, y = 14 + R() * 120; stars += `<path d="${star(x, y, 2.4 + R() * 2, 1)}" fill="#F3E2B4" opacity="${.5 + R() * .4}"/>`; }
    const g = `<rect x="-20" y="-20" width="440" height="340" fill="#7F96AA"/>` + P(blob(200, 60, 260, 120, 4, .06, 10), '#93A8B9', { line: false, s: 0, off: 0, flat: true }) + stars +
      P(circ(322, 64, 26), '#F6E7BE', { line: false, s: 3, hi: [314, 56, 9, 7] }) + `<circle cx="333" cy="58" r="22" fill="#93A8B9" opacity=".95"/>` +
      hill('M-10 230 Q120 190 220 214 T410 200 V310 H-10Z', '#6D8569') + hill('M-10 260 Q160 236 410 256 V310 H-10Z', '#5C7458') +
      P('M110 262 C150 222 260 220 300 258 C250 274 160 276 110 262Z', '#93AE6D', { s: 4 }) + `<path d="M118 260 C170 248 240 248 296 258" ${PEN(1.6, .5)}/>` + grass(60, 270, 5, 14, 2, '#46593F') + grass(350, 268, 5, 14, 9, '#46593F');
    return svg(g, { vb: '0 0 400 300', label: o.label || '쉬는 시간 저녁 하늘', par: o.par || 'xMidYMid slice', k: .9 });
  }
  /** 윙윙 꽃밭 놀이판 바탕 (풀밭) */
  function meadow(o = {}) {
    const g = `<rect x="-20" y="-20" width="440" height="440" fill="#EEF0DA"/>` + P(blob(120, 110, 150, 110, 3, .12, 10), '#E3E9C8', { line: false, s: 0, off: 0, flat: true }) + P(blob(300, 300, 160, 120, 6, .12, 10), '#DCE3BC', { line: false, s: 0, off: 0, flat: true }) +
      Array.from({ length: 14 }, (_, i) => grass(20 + (i * 97) % 380, 30 + (i * 61) % 360, 4, 10, i + 1, '#9DAE6A')).join('');
    return svg(g, { vb: '0 0 400 400', label: o.label || '풀밭', par: o.par || 'xMidYMid slice', k: .8, grain: true });
  }
  /** 짝꿍카드 뒷면 (종이 무늬 + 보미 깃털) */
  function cardBack(o = {}) {
    const col = named(o.color, C.mauve), id = nid('cb');
    const pat = `<pattern id="${id}" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(12)"><path d="M6 12 q6 -9 12 0 q-6 9 -12 0Z" fill="#FFF6E8" opacity=".35"/><circle cx="20" cy="3" r="1.6" fill="#FFF6E8" opacity=".5"/></pattern>`;
    const g = P(rr(4, 4, 92, 132, 10), col, { s: 3, lw: 2 }) + `<rect x="4" y="4" width="92" height="132" rx="10" fill="url(#${id})"/>` + P(rr(14, 14, 72, 112, 8), mix(col, '#3E2E24', .12), { line: false, s: 0, flat: true, op: .35 }) +
      `<rect x="14" y="14" width="72" height="112" rx="8" ${PEN(1.4, .5, '#FFF6E8')} stroke-dasharray="3 5"/>` + at(28, 46, .44, owlG({ face: '기본' }));
    return svg(g, { vb: '0 0 100 140', size: o.size, defs: pat, label: o.label || '카드 뒷면', k: .8 });
  }

  /* =========================================================
     8. (2026-11-22 새로) 새 놀이 4개용 — 몸놀이 자세 · 준비물 · 하는 일 · 게 · 안전 그림
     - 사람은 성별·피부색을 정하지 않은 둥근 아이(머리 동그라미 + 통통한 팔다리).
       피부색은 SKINS 4가지 중 고를 수 있다(o.skin: 0~3 또는 HEX). 기본 1.
     - 움직임 화살표는 테라코타, 바람·숨은 더스티블루. o.arrows:false 면 화살표 없이.
     ========================================================= */
  const SKINS = ['#F0D3B5', '#DDB088', '#B98059', '#8A5A3E'];
  let POSE_SKIN = null;   // pose(name,{skin}) 가 그리는 동안만 쓰는 피부색
  const KID = { shirt: C.mustard, pants: C.dustyblue, shoe: C.terracotta, hair: '#5B4434' };
  const GROWN = { shirt: C.sage, pants: '#9C8670', shoe: C.bark, hair: '#4A382C' };
  const dirv = (a) => [Math.sin(a * Math.PI / 180), Math.cos(a * Math.PI / 180)]; // 0=아래, 90=오른쪽, 180=위, -90=왼쪽
  const addv = (p, v, k) => [p[0] + v[0] * k, p[1] + v[1] * k];
  const pts2d = (a) => 'M' + a.map((p) => f1(p[0]) + ' ' + f1(p[1])).join(' L');
  const ARROW_C = () => SH ? SHADOW : C.terracotta;
  const AIR_C = () => SH ? SHADOW : C.dustyblue;

  /** 통통한 팔다리: 연필 테두리 + 물감 + 그늘 + 밝은 물자국 */
  function limb(p, w, col) {
    const d = pts2d(p), cap = 'stroke-linecap="round" stroke-linejoin="round" fill="none"';
    if (SH) return `<path d="${d}" stroke="${SHADOW}" stroke-width="${f1(w + 4.4)}" ${cap}/>`;
    return `<path d="${d}" stroke="${INK}" stroke-width="${f1(w + 3.6)}" ${cap} opacity=".82"/>` +
      `<path d="${d}" stroke="${col}" stroke-width="${f1(w)}" ${cap} transform="translate(.5 .5)"/>` +
      `<path d="${d}" stroke="${mix(col, '#5A4030', .3)}" stroke-width="${f1(w * .36)}" ${cap} opacity=".42" transform="translate(${f1(w * .2)} ${f1(w * .24)})"/>` +
      `<path d="${d}" stroke="${mix(col, '#FFFBF0', .5)}" stroke-width="${f1(w * .2)}" ${cap} opacity=".55" transform="translate(${f1(-w * .18)} ${f1(-w * .2)})"/>`;
  }
  /** 화살표(움직임 방향). pts: 곡선 점들, both: 양쪽 화살촉 */
  function arrow(pts, o = {}) {
    const c = o.col || ARROW_C(), w = o.w || 3.2;
    const head = (e, p) => { const a = Math.atan2(e[1] - p[1], e[0] - p[0]), L = 5 + w; return `<path d="M${f1(e[0] - Math.cos(a - .6) * L)} ${f1(e[1] - Math.sin(a - .6) * L)} L${f1(e[0])} ${f1(e[1])} L${f1(e[0] - Math.cos(a + .6) * L)} ${f1(e[1] - Math.sin(a + .6) * L)}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`; };
    const n = pts.length;
    return `<g opacity="${o.op || .92}"><path d="${smooth(pts, false)}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>` +
      head(pts[n - 1], pts[n - 2]) + (o.both ? head(pts[0], pts[1]) : '') + '</g>';
  }
  const wind = (x, y, s = 1) => brush([[x, y], [x + 8 * s, y - 3 * s], [x + 16 * s, y + 1 * s], [x + 22 * s, y - 2 * s]], 3, AIR_C(), .8);
  const motion = (x, y, n = 3, len = 7, ang = 0) => Array.from({ length: n }, (_, i) => { const yy = y + i * 5; return `<path d="M${x} ${yy} l${f1(Math.cos(ang) * len)} ${f1(Math.sin(ang) * len)}" ${PEN(2, .55)}/>`; }).join('');

  /** 사람 한 명 그리기(뼈대 각도로). 각도: 0=아래, 90=오른쪽, 180=위, -90=왼쪽
     o: x,y(엉덩이) s(크기) tilt(엉덩이→목 방향, 180=꼿꼿) head(머리 더 기울기) aL,aR,lL,lR([위,아래] 각도)
        fL,fR(발끝 -1 왼쪽 / 1 오른쪽) side(옆모습: 왼·오른 팔다리가 겹침) legsFront armsBack face look adult skin shirt pants
        mouth('후' 내쉬기 입) hands(false면 손 그리지 않음) */
  function figure(o) {
    const s = o.s || 1, G = o.adult ? GROWN : KID;
    const sk = o.skin != null ? o.skin : POSE_SKIN;
    const skin = typeof sk === 'number' ? SKINS[sk] || SKINS[1] : (sk || SKINS[1]);
    const shirt = o.shirt || G.shirt, pants = o.pants || G.pants, shoe = G.shoe;
    const ad = o.adult ? 1 : 0;
    const T = (20 + ad * 4) * s, UA = (12 + ad * 3) * s, FA = (11 + ad * 3) * s, TH = (12.5 + ad * 5) * s, SN = (11.5 + ad * 5) * s, HR = (11.5 - ad * 1.3) * s, W = (7.4 + ad * .6) * s;
    const hip = [o.x, o.y], up = dirv(o.tilt == null ? 180 : o.tilt), down = [-up[0], -up[1]], n = [down[1], -down[0]];
    const neck = addv(hip, up, T);
    const sw = o.side ? 1.6 : 7.6 + ad, hw = o.side ? 1.4 : 5.2 + ad * .6;
    const sh = (k) => addv(addv(neck, down, 3.6 * s), n, k * sw * s);
    const hp = (k) => addv(hip, n, k * hw * s);
    const arm = (k, a) => { const p0 = sh(k), p1 = addv(p0, dirv(a[0]), UA); return [p0, p1, addv(p1, dirv(a[1]), FA)]; };
    const leg = (k, a) => { const p0 = hp(k), p1 = addv(p0, dirv(a[0]), TH); return [p0, p1, addv(p1, dirv(a[1]), SN)]; };
    const AL = arm(-1, o.aL || [-10, -4]), AR = arm(1, o.aR || [10, 4]);
    const LL = leg(-1, o.lL || [-3, 0]), LR = leg(1, o.lR || [3, 0]);
    const far = o.side ? .14 : 0;                                   // 옆모습: 먼 쪽 팔다리는 조금 어둡게
    const foot = (L, fd, dk) => { const e = L[2], fx = (fd || 0) * 2.6 * s; return P(elp(e[0] + fx, e[1] + 1.6 * s, 5 * s, 3.3 * s), mix(shoe, '#3E2E24', dk), { lw: 1.7, s: .8 }); };
    const hand = (A, dk) => o.hands === false ? '' : P(circ(A[2][0], A[2][1], 3.7 * s), mix(skin, '#3E2E24', dk), { lw: 1.7, s: .8 });
    const legs = limb(LL, W, mix(pants, '#3E2E24', far)) + foot(LL, o.fL == null ? -1 : o.fL, far) + limb(LR, W, pants) + foot(LR, o.fR == null ? 1 : o.fR, 0);
    const arms = limb(AL, W * .92, mix(shirt, '#3E2E24', far)) + hand(AL, far) + limb(AR, W * .92, shirt) + hand(AR, 0);
    const mid = addv(neck, down, T * .55);
    const tw = (7 + ad) * s, bw = (9.6 + ad) * s;
    const torsoPts = [addv(neck, n, tw), addv(mid, n, bw), addv(addv(hip, n, bw * .95), down, 1.5 * s), addv(hip, down, 5.2 * s), addv(addv(hip, n, -bw * .95), down, 1.5 * s), addv(mid, n, -bw), addv(neck, n, -tw), addv(neck, down, -2.2 * s)];
    const torso = P(smooth(torsoPts, true), shirt, { s: 2 * s, hi: [neck[0] - 3 * s, neck[1] + 6 * s, 3 * s, 4 * s] }) +
      (o.adult ? '' : `<path d="${pts2d([addv(addv(neck, n, -4 * s), down, 1.2 * s), addv(neck, down, 4 * s), addv(addv(neck, n, 4 * s), down, 1.2 * s)])}" ${PEN(1.4, .5)}/>`);
    const ha = (o.tilt == null ? 180 : o.tilt) + (o.head || 0);
    const hc = addv(neck, dirv(ha), HR * .86);
    const rot = f1(o.hrot != null ? o.hrot : ha - 180);   // hrot: 머리(얼굴) 돌림을 따로 정할 때 (옆모습)
    const r = HR, hairC = SH ? SHADOW : G.hair;
    const look = (o.look || 0) * 2.2 * s;
    const fc = SH ? '' : (o.mouth === '후'
      ? face(look, 1.2 * s, .5 * s, '쉬어요', { gap: 9, noMouth: true, noZ: true }) + `<ellipse cx="${f1(look)}" cy="${f1(6 * s)}" rx="${f1(1.9 * s)}" ry="${f1(2.3 * s)}" fill="${TEXT}"/>`
      : face(look, 1.2 * s, .5 * s, o.face || '웃음', { gap: 9, noZ: true }));
    const head = `<g transform="translate(${f1(hc[0])} ${f1(hc[1])}) rotate(${rot})">` +
      P(circ(-r * .98, 1.5 * s, 2.8 * s), skin, { lw: 1.6, s: .5 }) + P(circ(r * .98, 1.5 * s, 2.8 * s), skin, { lw: 1.6, s: .5 }) +
      P(circ(0, 0, r), skin, { s: 2.2 * s, hi: [-r * .38, -r * .1, r * .3, r * .26] }) +
      P(`M${f1(-r * 1.02)} ${f1(.6 * s)} C${f1(-r * 1.08)} ${f1(-r * 1.3)} ${f1(r * 1.08)} ${f1(-r * 1.3)} ${f1(r * 1.02)} ${f1(.6 * s)} Q${f1(r * .7)} ${f1(-r * .5)} ${f1(r * .1)} ${f1(-r * .46)} Q${f1(-r * .5)} ${f1(-r * .44)} ${f1(-r * 1.02)} ${f1(.6 * s)}Z`, hairC, { s: 1.4 * s, lw: 1.8 }) +
      `<path d="M${f1(-r * .1)} ${f1(-r * .98)} q${f1(-1 * s)} ${f1(-4 * s)} ${f1(3 * s)} ${f1(-5.2 * s)}" ${PEN(2.2, .85, hairC)}/>` +
      fc + '</g>';
    return (o.legsFront ? '' : legs) + (o.armsBack ? arms : '') + torso + (o.legsFront ? legs : '') + (o.armsBack ? '' : arms) + head;
  }
  const skinNow = () => typeof POSE_SKIN === 'number' ? SKINS[POSE_SKIN] || SKINS[1] : (POSE_SKIN || SKINS[1]);
  const floor = (y = 92, x1 = 12, x2 = 88) => SH ? '' : `<path d="M${x1} ${y} C${x1 + 20} ${y - .8} ${x2 - 20} ${y + .8} ${x2} ${y}" ${PEN(1.6, .35)}/>`;

  /* ---------- 준비물 (같이 놀아요) ---------- */
  const PROP = {
    풍선: () => brush([[50, 66], [46, 76], [53, 86], [49, 96]], 2.6, INK, .8) + P('M47 64 L53 64 L51 69 L49 69Z', C.terracotta, { lw: 1.4, s: .4 }) +
      P('M50 64 C30 62 22 42 24 30 C26 14 38 6 50 6 C62 6 74 14 76 30 C78 42 70 62 50 64Z', C.rose, { s: 3.4, hi: [38, 24, 6, 10] }) + dab(36, 20, 2.6, 5, .7),
    공: () => ground(50, 88, 26) + P(circ(50, 54, 31), C.sage, { s: 4, hi: [38, 42, 8, 6] }) +
      `<path d="M22 48 C38 40 62 40 78 48 M50 23 C40 38 40 70 50 85 M26 68 C40 60 60 60 74 68" ${PEN(1.6, .5, C.oliveDeep)} stroke-dasharray="3 4"/>`,
    방석: () => ground(52, 88, 40) + P('M12 56 L42 74 L90 56 L90 65 L42 84 L12 65Z', mix(C.mustard, '#3E2E24', .22), { s: 1.4, lw: 2 }) +
      P(smooth([[12, 56], [34, 44], [60, 37], [78, 45], [90, 56], [67, 66], [42, 74], [25, 66]], true), C.mustard, { s: 3, hi: [36, 50, 12, 5] }) +
      `<path d="${smooth([[24, 56], [38, 48], [59, 43], [73, 49], [79, 56], [64, 63], [43, 68], [32, 63]], true)}" ${PEN(1.4, .55, '#74540F')} stroke-dasharray="3 3.5"/>` +
      P(elp(51, 56, 3.6, 2.6), C.terracotta, { lw: 1.4, s: .6 }),
    매트: () => ground(50, 84, 42) + P('M8 70 L22 44 H92 L78 70Z', C.sage, { s: 3, hi: [40, 52, 14, 3] }) + P('M8 70 H78 V76 H8Z', mix(C.sage, '#3E2E24', .25), { s: 1, lw: 1.8 }) + P('M78 70 L92 44 V50 L78 76Z', mix(C.sage, '#3E2E24', .32), { s: .6, lw: 1.8 }) +
      `<path d="M30 70 L44 44 M52 70 L66 44" ${PEN(1.5, .45, C.oliveDeep)} stroke-dasharray="3 4"/>`,
    상자: () => ground(50, 90, 36) + P('M18 44 L32 36 L20 20 L4 30Z', '#E4C796', { s: 1.2, lw: 1.8 }) + P('M82 44 L68 36 L80 20 L96 30Z', '#E4C796', { s: 1.2, lw: 1.8 }) +
      P('M18 44 H82 V86 H18Z', '#D9B47E', { s: 3, hi: [32, 54, 8, 5] }) + P('M18 44 L32 36 H68 L82 44Z', '#9E7646', { s: .8, lw: 1.8 }) +
      `<path d="M50 44 V86" ${PEN(5, .35, '#C9A26B')}/><path d="M28 74 h12 M28 79 h8" ${PEN(1.6, .45)}/>`,
    거울: () => ground(50, 94, 26) + `<path d="M40 92 L50 80 L60 92" ${PEN(4, .9, SH ? SHADOW : C.bark)}/>` +
      P(elp(50, 44, 27, 38), C.bark, { s: 2.4 }) + P(elp(50, 44, 21, 32), '#DCE7EB', { s: 2, hi: [42, 32, 6, 12] }) +
      `<path d="M36 40 L48 22 M38 52 L56 26" stroke="${SH ? SHADOW : '#FFFFFF'}" stroke-width="3" stroke-linecap="round" opacity=".7"/>`,
    쿠션: () => ground(50, 84, 40) + P('M10 62 C10 46 16 40 26 42 C40 38 60 38 74 42 C84 40 90 46 90 62 C90 76 84 82 74 80 C60 84 40 84 26 80 C16 82 10 76 10 62Z', C.dustyblue, { s: 3.4, hi: [30, 52, 12, 4] }) +
      P(circ(10, 46, 4), C.dustyblue, { lw: 1.4, s: .5 }) + P(circ(90, 46, 4), C.dustyblue, { lw: 1.4, s: .5 }) + P(circ(10, 78, 4), C.dustyblue, { lw: 1.4, s: .5 }) + P(circ(90, 78, 4), C.dustyblue, { lw: 1.4, s: .5 }) +
      `<path d="M30 62 q20 6 40 0" ${PEN(1.5, .4)}/>`,
    양말공: () => ground(50, 86, 26) + P(circ(50, 56, 28), C.rose, { s: 3.4, hi: [40, 44, 7, 5] }) +
      `<path d="M26 44 C40 50 60 50 76 44 M23 58 C40 64 60 64 77 58 M28 72 C42 77 58 77 72 72" ${PEN(4, .55, C.cream)}/>` + P('M60 30 C70 24 80 30 76 40 C72 36 66 34 60 30Z', mix(C.rose, '#3E2E24', .15), { s: .8, lw: 1.8 }),
  };
  const PROP_ALIAS = { 말랑공: '공', 말랑한공: '공', 빈상자: '상자', 바구니: '상자', 미끄럼방지매트: '매트' };
  /** 준비물. name: 풍선|공|방석|매트|상자|거울|쿠션|양말공 (말랑공·빈상자도 됨) */
  function prop(name = '풍선', o = {}) {
    const k = PROP[name] ? name : (PROP_ALIAS[name] || '풍선');
    return svg(PROP[k](), { size: o.size, label: o.label || k });
  }

  /* ---------- 자세 (몸으로 따라 해요 · 같이 놀아요) ---------- */
  const at2 = (x, y, s, g) => `<g transform="translate(${x} ${y}) scale(${s})">${g}</g>`;
  const POSE = {
    서기: (A) => ground(50, 91, 18) + figure({ x: 50, y: 62, face: '웃음' }),
    나무: (A) => ground(50, 91, 16) +
      [[30, 22, -30], [26, 30, -70], [36, 16, 10], [70, 22, 30], [74, 30, 70], [64, 16, -10]].map(([x, y, r]) => P('M0 0 C4 -6 12 -6 14 0 C10 5 4 5 0 0Z', C.olive, { lw: 1.5, s: .8, tr: `translate(${x} ${y}) rotate(${r - 90})` })).join('') +
      figure({ x: 50, y: 62, aL: [-150, -165], aR: [150, 165], lL: [2, 0], lR: [-2, 0], fL: -1, fR: 1 }) ,
    바람: (A) => ground(52, 91, 18) + figure({ x: 52, y: 62, tilt: 166, head: -6, aL: [172, 150], aR: [150, 128], lL: [-2, 0], lR: [4, 0] }) +
      (A ? wind(4, 34) + wind(2, 48, .9) + wind(6, 62, .8) + arrow([[30, 16], [52, 8], [78, 14]], { both: true }) : ''),
    한발서기: (A) => ground(47, 91, 12) + figure({ x: 50, y: 62, aL: [-96, -88], aR: [96, 88], lL: [3, 0], lR: [100, 12], fL: 0, fR: 1, face: '기본' }) +
      (A ? `<path d="M74 66 q4 4 0 8 M79 63 q6 7 0 14" ${PEN(1.8, .5)}/>` : ''),
    곰걸음: (A) => ground(50, 91, 32) + figure({ x: 64, y: 50, side: true, tilt: -72, head: -36, hrot: -14, look: -1, aL: [-6, -2], aR: [8, 4], lL: [6, -2], lR: [22, 4], fL: -1, fR: -1, face: '웃음' }) +
      (A ? arrow([[88, 26], [70, 20], [48, 26], [28, 22]]) + at2(78, 74, .22, animalG('곰', { face: '웃음' })) : ''),
    토끼폴짝: (A) => ground(50, 93, 14) + figure({ x: 50, y: 58, aL: [-160, 168], aR: [160, -168], lL: [-48, 22], lR: [48, -22], fL: -1, fR: 1 }) +
      (A ? arrow([[6, 90], [10, 72], [17, 64], [24, 72], [27, 86]], { dash: '5 4', w: 2.8 }) + `<path d="M42 84 l-3 4 M50 85 v5 M58 84 l3 4" ${PEN(1.8, .5)}/>` : ''),
    게걸음: (A) => ground(50, 91, 26) + figure({ x: 50, y: 64, aL: [-112, 162], aR: [112, -162], lL: [-58, -8], lR: [58, 8], fL: -1, fR: 1 }) +
      (A ? `<path d="M30 32 l-4 -5 M34 30 l-1 -6 M70 32 l4 -5 M66 30 l1 -6" ${PEN(2, .7)}/>` + arrow([[22, 14], [50, 12], [78, 14]], { both: true }) : ''),
    팔벌리기: (A) => ground(50, 91, 18) + figure({ x: 50, y: 62, aL: [-92, -90], aR: [92, 90], lL: [-6, 0], lR: [6, 0] }) +
      (A ? arrow([[18, 36], [8, 36]]) + arrow([[82, 36], [92, 36]]) : ''),
    늘이기: (A) => ground(50, 91, 14) + figure({ x: 50, y: 60, aL: [-172, -178], aR: [172, 178], lL: [-1, 4], lR: [1, -4], fL: 0, fR: 0, face: '웃음' }) +
      (A ? arrow([[18, 74], [18, 52], [18, 30]]) + arrow([[82, 74], [82, 52], [82, 30]]) : ''),
    웅크리기: (A) => ground(50, 91, 22) + figure({ x: 50, y: 80, head: 0, legsFront: true, aL: [-34, 78], aR: [34, -78], lL: [-150, -4], lR: [150, 4], fL: -1, fR: 1, face: '쉬어요' }) +
      (A ? arrow([[18, 30], [18, 52], [18, 72]]) + arrow([[82, 30], [82, 52], [82, 72]]) : ''),
    숨들이쉬기: (A) => (A ? `<circle cx="50" cy="56" r="40" fill="${SH ? 'none' : '#E0E9EF'}" opacity=".7"/>` : '') + ground(50, 91, 28) +
      figure({ x: 50, y: 76, legsFront: true, aL: [-28, -8], aR: [28, 8], lL: [-80, 62], lR: [80, -62], fL: 1, fR: -1, face: '쉬어요' }) +
      (A ? arrow([[14, 18], [24, 26], [36, 34]], { col: AIR_C() }) + arrow([[86, 18], [76, 26], [64, 34]], { col: AIR_C() }) : ''),
    숨내쉬기: (A) => (A ? `<circle cx="50" cy="60" r="28" fill="${SH ? 'none' : '#E0E9EF'}" opacity=".7"/>` : '') + ground(50, 91, 28) +
      figure({ x: 50, y: 76, legsFront: true, aL: [-28, -8], aR: [28, 8], lL: [-80, 62], lR: [80, -62], fL: 1, fR: -1, mouth: '후' }) +
      (A ? brush([[58, 46], [68, 42], [78, 46], [88, 42]], 3, AIR_C(), .8) + brush([[58, 50], [70, 52], [84, 56]], 3, AIR_C(), .6) + `<circle cx="90" cy="34" r="2.6" ${PEN(1.6, .6, AIR_C())}/><circle cx="80" cy="30" r="1.8" ${PEN(1.4, .5, AIR_C())}/>` : ''),
    공중그림: (A) => ground(46, 91, 16) + figure({ x: 46, y: 62, aL: [-12, -4], aR: [148, 168], lL: [-4, 0], lR: [4, 0] }) +
      (A ? arrow([[72, 22], [80, 10], [92, 16], [92, 30], [80, 36], [70, 30], [70, 22]], { dash: '5 5', w: 2.8 }) : ''),
    징검다리: (A) => at2(16, 64, .4, PROP.방석()) + at2(50, 64, .4, PROP.방석()) + at2(80, 68, .3, PROP.방석()) +
      figure({ x: 48, y: 58, side: true, look: 1, hrot: 0, aL: [24, 70], aR: [-30, -16], lL: [-34, -10], lR: [30, 2], fL: 1, fR: 1 }) +
      (A ? arrow([[22, 18], [48, 12], [74, 18]]) : ''),
    풍선치기: (A) => at2(58, -4, .36, PROP.풍선()) + ground(46, 91, 16) + figure({ x: 46, y: 64, head: 10, aL: [-30, -10], aR: [158, 170], lL: [-4, 0], lR: [4, 0], face: '웃음' }) +
      (A ? `<path d="M64 26 l5 -3 M66 32 l6 0 M58 22 l2 -5" ${PEN(2, .6)}/>` : ''),
    짐안기: (A) => ground(50, 91, 20) + figure({ x: 50, y: 62, aL: [-30, 40], aR: [30, -40], lL: [-14, 4], lR: [10, -2] , hands: false }) +
      at2(29, 40, .42, PROP.상자()) + P(circ(33.6, 62, 3.7), skinNow(), { lw: 1.7, s: .8 }) + P(circ(66.4, 62, 3.7), skinNow(), { lw: 1.7, s: .8 }) +
      (A ? arrow([[24, 98], [50, 98], [76, 98]]) : ''),
    벽밀기: (A) => P('M84 0 H100 V96 H84Z', '#E6D5B8', { s: 2, line: false }) + `<path d="M84 0 V96" ${PEN(2.4, .8)}/><path d="M84 18 H100 M92 18 V38 M84 38 H100 M84 58 H100 M92 58 V78 M84 78 H100" ${PEN(1.4, .35)}/>` +
      ground(52, 91, 28) + figure({ x: 44, y: 62, side: true, tilt: 132, head: -10, hrot: -22, look: 1, aL: [86, 92], aR: [80, 88], lL: [-34, -26], lR: [-8, 6], fL: 1, fR: 1, face: '응원' }) +
      (A ? `<path d="M76 34 l-5 -3 M77 46 l-6 0 M76 58 l-5 3" ${PEN(2, .6)}/>` : ''),
    기어가기: (A) => at2(-6, 58, .5, PROP.쿠션()) + ground(62, 92, 28) + figure({ x: 70, y: 66, side: true, tilt: -82, head: -50, hrot: -10, look: -1, aL: [-4, -2], aR: [6, 0], lL: [6, 90], lR: [-4, 92], fL: 1, fR: 1 }) +
      (A ? arrow([[92, 26], [70, 20], [46, 26]]) : ''),
    거울: (A) => `<path d="M50 8 V92" ${PEN(2.2, .5)} stroke-dasharray="4 5"/>` + ground(24, 93, 14) + ground(76, 93, 12) +
      figure({ x: 24, y: 52, s: .82, adult: true, aL: [-12, -4], aR: [130, 160], lL: [-3, 0], lR: [3, 0], look: 1 }) +
      figure({ x: 77, y: 64, s: .86, aL: [-130, -160], aR: [12, 4], lL: [-3, 0], lR: [3, 0], look: -1 }) +
      (A ? `<path d="${star(50, 22, 4, 1.6)}" fill="${SH ? SHADOW : C.mustard}"/><path d="${star(50, 70, 3, 1.2)}" fill="${SH ? SHADOW : C.mustard}" opacity=".8"/>` : ''),
    공주고받기: (A) => ground(22, 93, 14) + ground(80, 93, 12) +
      figure({ x: 22, y: 52, s: .82, adult: true, aL: [-12, -4], aR: [70, 110], lL: [-3, 0], lR: [3, 0], look: 1 }) +
      figure({ x: 80, y: 64, s: .86, aL: [-70, -110], aR: [12, 4], lL: [-3, 0], lR: [3, 0], look: -1 }) +
      at2(41, 24, .18, PROP.공()) + (A ? arrow([[36, 46], [50, 34], [64, 46]], { dash: '4 5', w: 2.6 }) + arrow([[64, 60], [50, 68], [36, 60]], { dash: '4 5', w: 2.6 }) : ''),
    어른곁: (A) => ground(34, 93, 16) + ground(70, 93, 12) +
      figure({ x: 34, y: 52, s: .9, adult: true, aL: [-10, -4], aR: [36, 30], lL: [-3, 0], lR: [3, 0], look: 1 }) +
      figure({ x: 70, y: 64, s: .86, aL: [-44, -40], aR: [10, 4], lL: [-3, 0], lR: [3, 0], look: -1 }) +
      (A ? P('M52 18 C48 12 40 14 44 22 L52 30 L60 22 C64 14 56 12 52 18Z', C.rose, { lw: 1.6, s: .8 }) : ''),
  };
  const POSE_ALIAS = { 바람에흔들: '바람', '바람에 흔들': '바람', '한 발 서기': '한발서기', '곰 걸음': '곰걸음', 토끼: '토끼폴짝', '토끼 뛰기': '토끼폴짝', 토끼뛰기: '토끼폴짝', '게 걸음': '게걸음',
    '팔 벌리기': '팔벌리기', 앉아숨쉬기: '숨들이쉬기', 숨쉬기: '숨들이쉬기', 들이쉬기: '숨들이쉬기', 내쉬기: '숨내쉬기', '공중에 그림': '공중그림', 하늘에그림: '공중그림', '징검다리 밟기': '징검다리',
    '풍선 치기': '풍선치기', '짐 안기': '짐안기', 짐나르기: '짐안기', '벽 밀기': '벽밀기', 쿠션넘기: '기어가기', '거울 놀이': '거울', '공 주고받기': '공주고받기', 늘이고: '늘이기', 웅크리고: '웅크리기' };
  /** 몸놀이 자세. name: POSES 중 하나(띄어 쓴 이름도 됨). o: size, label, arrows(false면 화살표·바람선 없이), skin(0~3 또는 HEX, 아이·어른 모두) */
  function pose(name = '서기', o = {}) {
    const k = POSE[name] ? name : (POSE_ALIAS[name] || '서기');
    const prev = POSE_SKIN; POSE_SKIN = o.skin != null ? o.skin : null;
    try { return svg(POSE[k](o.arrows !== false), { size: o.size, label: o.label || k }); } finally { POSE_SKIN = prev; }
  }

  /* ---------- 하는 일 그림 (누가 뭐 해요?) ---------- */
  const ACTION = {
    먹어요: () => P(circ(40, 48, 32), C.honey, { s: 4, hi: [28, 34, 9, 7] }) + face(40, 40, 1.35, '웃음', { gap: 11, noMouth: true }) +
      P(elp(40, 62, 8, 9), '#7A3B30', { lw: 2, s: 1 }) + P(elp(40, 67, 5, 3.4), C.rose, { line: false, s: .4 }) +
      limb([[94, 94], [64, 70]], 5.4, '#C99A66') + `<g transform="rotate(-40 58 64)">${P(elp(58, 64, 10, 7), '#C99A66', { s: 1.2 })}${P(elp(57, 63, 6, 4), C.terracotta, { lw: 1.4, s: .6 })}</g>`,
    타요: () => ground(50, 94, 30) + P(circ(50, 70, 21), '#4E4540', { s: 2 }) + P(circ(50, 70, 9), '#EADBC6', { s: .8, lw: 1.8 }) +
      `<path d="M50 61 V79 M41 70 H59" ${PEN(2, .6)}/>` + P('M50 6 L72 30 H60 V44 H40 V30 H28Z', C.olive, { s: 2, hi: [44, 22, 4, 6] }),
    좋아해요: () => P('M50 86 C26 70 10 54 12 36 C14 20 34 14 50 30 C66 14 86 20 88 36 C90 54 74 70 50 86Z', C.rose, { s: 4, hi: [28, 34, 7, 6] }) +
      `<path d="${star(86, 14, 6, 2.6)}" fill="${SH ? SHADOW : C.mustard}" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/><path d="${star(12, 70, 4, 1.8)}" fill="${SH ? SHADOW : C.mustard}"/>`,
    봐요: () => AREA_ICON.seeing(),
  };
  /** 하는 일 그림. name: 먹어요|타요|좋아해요|봐요 */
  function action(name = '먹어요', o = {}) { return svg((ACTION[name] || ACTION.먹어요)(), { size: o.size, label: o.label || name }); }

  /* ---------- 게 (동물 걸음 배지: 곰·토끼는 Art.animal) ---------- */
  function crabG(o = {}) {
    const c = named(o.color, C.terracotta), f = o.face || '웃음';
    const legs = [[-1, 0], [-1, 1], [-1, 2], [1, 0], [1, 1], [1, 2]].map(([k, i]) => brush([[50 + k * 24, 62 + i * 6], [50 + k * (34 + i * 2), 64 + i * 7], [50 + k * (38 + i * 2), 76 + i * 6]], 3.6, INK, .9)).join('');
    const claw = (k) => brush([[50 + k * 22, 54], [50 + k * 32, 44], [50 + k * 32, 34]], 4.4, INK, .9) +
      P(`M${50 + k * 32} 36 C${50 + k * 22} 32 ${50 + k * 22} 14 ${50 + k * 34} 12 C${50 + k * 44} 12 ${50 + k * 46} 30 ${50 + k * 32} 36Z`, c, { s: 1.6, hi: [50 + k * 31, 20, 3, 4] }) +
      `<path d="M${50 + k * 33} 24 L${50 + k * 42} 18" ${PEN(2.4, .85)}/>`;
    const eye = (k) => `<path d="M${50 + k * 8} 46 V32" ${PEN(2.6, .9)}/>` + P(circ(50 + k * 8, 30, 5), '#FFF9EE', { lw: 1.8, s: .4 }) + `<circle cx="${50 + k * 8 + 1}" cy="31" r="2.4" fill="${SH ? SHADOW : TEXT}"/>`;
    const mouth = f === '웃음' ? `<path d="M44 62 Q50 68 56 62" ${PEN(2.2, .9, TEXT)}/>` : `<path d="M46 63 Q50 66 54 63" ${PEN(2, .9, TEXT)}/>`;
    return ground(50, 94, 34) + legs + claw(-1) + claw(1) + eye(-1) + eye(1) +
      P('M18 62 C18 46 34 42 50 42 C66 42 82 46 82 62 C82 76 66 82 50 82 C34 82 18 76 18 62Z', c, { s: 3.4, hi: [36, 52, 9, 4] }) +
      (SH ? '' : mouth + `<ellipse cx="34" cy="62" rx="4.4" ry="2.6" fill="${C.cheek}" opacity=".5"/><ellipse cx="66" cy="62" rx="4.4" ry="2.6" fill="${C.cheek}" opacity=".5"/>`);
  }
  /** 게(정면). o: face('웃음'|'기본'), color */
  function crab(o = {}) { return svg(crabG(o), { size: o.size, label: o.label || '게' }); }

  /* ---------- 몸놀이 안전 그림 3장 ---------- */
  const SAFETY = {
    치우기: () => floor(88, 6, 94) + at2(34, 40, .5, PROP.상자()) + at2(12, 64, .26, PROP.공()) + P(rr(72, 72, 12, 12, 2), C.dustyblue, { s: 1, lw: 1.8 }) + P(rr(76, 62, 10, 10, 2), C.mustard, { s: 1, lw: 1.8 }) +
      arrow([[40, 30], [58, 22], [78, 28]]) + `<path d="M24 80 l-6 2 M26 74 l-7 -2" ${PEN(1.8, .5)}/>`,
    어른곁: () => POSE.어른곁(true),
    멈춰요: () => P(blob(50, 50, 40, 39, 7, .05, 12), C.terracotta, { s: 4, hi: [36, 34, 9, 7] }) + P(rr(33, 28, 11, 44, 5), '#FCF4E2', { s: 1.2 }) + P(rr(56, 28, 11, 44, 5), '#FCF4E2', { s: 1.2 }),
  };
  /** 몸놀이 안전 안내 그림. name: 치우기 | 어른곁 | 멈춰요 */
  function safety(name = '치우기', o = {}) { return svg((SAFETY[name] || SAFETY.치우기)(), { size: o.size, label: o.label || name }); }

  /* ---------- 설정·내보내기 ---------- */
  /** Art.config({texture:false}) → 필터를 끈다(아주 느린 기기용). */
  function config(o = {}) { Object.assign(OPT, o); return Object.assign({}, OPT); }

  global.Art = {
    version: '2.0',
    COLORS: C, INK, TEXT, AREAS, GAMES, FACES, PATTERNS, PROFILE_KINDS, FRUITS, ANIMALS, VEHICLES,
    INSECTS: Object.keys(INSECT), FLOWERS: Object.keys(FLOWER), UI_ICONS: Object.keys(UI), STYLE_NAMES, SAMPLE_SCENE,
    owl, snail, face: (t, o = {}) => svg(P(circ(50, 50, 40), C.honey, { s: 4, hi: [38, 36, 10, 7] }) + face(50, 46, 2, t), o),
    areaIcon, gameIcon, icon, profile, insect, flower, fruit, animal, vehicle,
    numberCard, dotsCard, momBaby, silhouette, scene, shade,
    roomArt, heroScene, praiseScene, restScene, meadow, cardBack, config,
    // (2026-11-22 새로) 새 놀이 4개용
    POSES: Object.keys(POSE), PROPS: Object.keys(PROP), ACTIONS: Object.keys(ACTION), SAFETY: Object.keys(SAFETY), SKINS,
    pose, prop, action, crab, safety,
  };
})(typeof window !== 'undefined' ? window : globalThis);
