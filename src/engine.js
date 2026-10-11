/* Rail route engine: interchange search over the TAG 2026 timetable. No network, no dummy data. */
function createEngine(DATA) {
  const ST = DATA.st.map((s, i) => ({ i, code: s[0], name: s[1], state: s[2], zone: s[3], lat: s[4], lon: s[5] }));
  const TR = DATA.tr.map((t, i) => ({ i, n: t[0], name: t[1], type: t[2], classes: t[3] ? t[3].split(',') : [], days: t[4], vf: t[5], vt: t[6], stops: t[7], originKnown: t[8] === 1 }));
  const byCode = {}; ST.forEach(s => byCode[s.code] = s.i);
  const byStation = ST.map(() => []);
  TR.forEach(tr => tr.stops.forEach((s, p) => byStation[s[0]].push([tr.i, p])));

  /* Same-city station clusters. Changing between them needs a road transfer. */
  const CLUSTER_DEFS = {
    'Delhi (all stations)': ['NDLS', 'DLI', 'NZM', 'ANVT', 'DEE', 'DEC'],
    'Mumbai (all stations)': ['CSMT', 'DR', 'LTT', 'BDTS', 'MMCT', 'BVI'],
    'Kolkata (all stations)': ['HWH', 'SDAH', 'KOAA'],
    'Chennai (all stations)': ['MAS', 'MS'],
    'Hyderabad (all stations)': ['SC', 'HYB', 'KCG'],
    'Lucknow (all stations)': ['LKO', 'LJN'],
    'Varanasi (all stations)': ['BSB', 'BSBS'],
    'Patna (all stations)': ['PNBE', 'RJPB'],
    'Bengaluru (all stations)': ['SBC', 'YPR', 'KJM']
  };
  const clusters = [];
  const mates = ST.map(s => [s.i]);
  Object.entries(CLUSTER_DEFS).forEach(([name, codes]) => {
    const ids = codes.map(c => byCode[c]).filter(x => x !== undefined);
    if (ids.length < 2) return;
    clusters.push({ name, ids });
    ids.forEach(a => { mates[a] = ids.slice(); });
  });

  /* ---- dates ---- */
  const dayNum = iso => { const [y, m, d] = iso.split('-').map(Number); return Math.floor(Date.UTC(y, m - 1, d) / 86400000); };
  const weekday = dn => ((dn + 3) % 7 + 7) % 7; // Mon=0
  const mmdd = dn => { const d = new Date(dn * 86400000); return (d.getUTCMonth() + 1) * 100 + d.getUTCDate(); };
  function runsOn(tr, O) {
    if (tr.vf) { const k = mmdd(O); const ok = tr.vf <= tr.vt ? (k >= tr.vf && k <= tr.vt) : (k >= tr.vf || k <= tr.vt); if (!ok) return false; }
    if (tr.days === -1) return true;
    return ((tr.days >> weekday(O)) & 1) === 1;
  }
  function earliestBoard(tr, p, tmin, maxWait) {
    const dep = tr.stops[p][2];
    const O0 = Math.ceil((tmin - dep) / 1440);
    for (let k = 0; k < 6; k++) {
      const O = O0 + k;
      if (O * 1440 + dep - tmin > maxWait) return null;
      if (runsOn(tr, O)) return O;
    }
    return null;
  }

  /* ---- fares (rough estimate; rates are editable) ---- */
  const CLASS_ORDER = ['2S', 'SL', 'CC', '3E', '3A', 'EC', '2A', '1A', 'FC'];
  const DEFAULT_RATES = { '2S': 0.30, 'SL': 0.52, 'CC': 1.40, '3E': 1.15, '3A': 1.38, 'EC': 2.90, '2A': 2.00, '1A': 3.40, 'FC': 3.40 };
  const FIXED = { '2S': 15, 'SL': 50, 'CC': 85, '3E': 85, '3A': 85, 'EC': 105, '2A': 95, '1A': 135, 'FC': 135 };
  const TYPE_MULT = { 'Vande Bharat': 1.7, 'Rajdhani': 1.35, 'Shatabdi': 1.4, 'Duronto': 1.25, 'Humsafar': 1.15, 'Garib Rath': 0.65, 'Jan Shatabdi': 0.75, 'Tejas': 1.5 };
  const hav = (a, b, c, d) => { const R = 6371, r = Math.PI / 180, dl = (c - a) * r, dg = (d - b) * r; const x = Math.sin(dl / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dg / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
  function legKm(tr, p, q) {
    let km = 0, ok = true;
    for (let k = p; k < q; k++) { const a = ST[tr.stops[k][0]], b = ST[tr.stops[k + 1][0]]; if (a.lat == null || b.lat == null) { ok = false; break; } km += hav(a.lat, a.lon, b.lat, b.lon); }
    if (ok) return km * 1.08;
    const a = ST[tr.stops[p][0]], b = ST[tr.stops[q][0]];
    if (a.lat == null || b.lat == null) return null;
    return hav(a.lat, a.lon, b.lat, b.lon) * 1.22;
  }
  function legFare(tr, km, basis, rates) {
    if (km == null || !tr.classes.length) return null;
    let cls = null;
    if (basis === 'cheapest') { cls = tr.classes.slice().sort((x, y) => CLASS_ORDER.indexOf(x) - CLASS_ORDER.indexOf(y))[0]; }
    else {
      const start = CLASS_ORDER.indexOf(basis);
      for (let k = start; k < CLASS_ORDER.length; k++) if (tr.classes.includes(CLASS_ORDER[k])) { cls = CLASS_ORDER[k]; break; }
      if (!cls) cls = tr.classes.slice().sort((x, y) => CLASS_ORDER.indexOf(y) - CLASS_ORDER.indexOf(x))[0];
    }
    const mult = TYPE_MULT[tr.type] || 1;
    let f = Math.max(km, 30) * (rates[cls] ?? DEFAULT_RATES[cls] ?? 1) * mult + (FIXED[cls] || 0);
    if (['1A', '2A', '3A', 'CC', 'EC', '3E', 'FC'].includes(cls)) f *= 1.05;
    return { cls, fare: Math.round(f / 5) * 5 };
  }

  const ALIAS = {
    goa: ['MAO', 'THVM', 'KRMI'], margao: ['MAO'], panaji: ['THVM', 'KRMI'], panjim: ['THVM', 'KRMI'],
    bangalore: ['SBC', 'YPR', 'KJM', 'BNC'], bombay: ['CSMT', 'MMCT', 'DR', 'BDTS', 'TNA'], madras: ['MAS', 'MS'], calcutta: ['HWH', 'SDAH', 'KOAA', 'SRC'],
    kochi: ['ERS', 'ERN', 'AWY'], cochin: ['ERS', 'ERN', 'AWY'], trivandrum: ['TVC'], mysore: ['MYS'], vizag: ['VSKP'], allahabad: ['PRYJ', 'PCOI'],
    baroda: ['BRC'], poona: ['PUNE'], pondicherry: ['PDY'], gurugram: ['GGN']
  };
  function stationSearch(q, limit = 8) {
    q = q.trim().toLowerCase(); if (!q) return [];
    const out = [];
    clusters.forEach(c => { if (c.name.toLowerCase().startsWith(q) || c.name.toLowerCase().includes(q)) out.push({ kind: 'cluster', label: c.name, ids: c.ids, score: c.name.toLowerCase().startsWith(q) ? 0 : 3 }); });
    ST.forEach(s => {
      const n = s.name.toLowerCase(), c = s.code.toLowerCase();
      let score = -1;
      if (c === q) score = 0; else if (n === q) score = 0; else if (n.startsWith(q)) score = 1; else if (c.startsWith(q)) score = 2; else if (n.includes(q)) score = 4;
      if (score >= 0) out.push({ kind: 'station', label: `${s.name} (${s.code})`, ids: [s.i], score: score + Math.min(byStation[s.i].length, 400) * -0.001 });
    });
    // common alternative names for cities whose stations carry a different name
    for (const k in ALIAS) {
      if (k.indexOf(q) !== 0 || q.length < 2) continue;
      for (const code of ALIAS[k]) {
        const i = byCode[code]; if (i === undefined || out.some(o => o.ids.length === 1 && o.ids[0] === i)) continue;
        out.push({ kind: 'station', label: `${ST[i].name} (${ST[i].code})`, ids: [i], score: (k === q ? -1 : 1.2) + Math.min(byStation[i].length, 400) * -0.001 });
      }
    }
    out.sort((a, b) => a.score - b.score);
    return out.slice(0, limit);
  }

  function search(opts) {
    const maxChanges = opts.maxChanges ?? 2;
    if (maxChanges <= 2) return searchPass(opts, maxChanges + 1, null);
    const base = searchPass(opts, 3, null);
    let bound = opts.maxTotalH ?? 72;
    if (base.its.length) bound = Math.min(bound, Math.min(...base.its.map(i => i.dur)) * 1.35 / 60); else bound = Math.min(bound, 48);
    const extra = searchPass({ ...opts, maxTotalH: bound }, maxChanges + 1, 4);
    return { its: base.its.concat(extra.its), capped: base.capped || extra.capped, count: base.its.length + extra.its.length, t0: base.t0 };
  }

  function searchPass(opts, maxLegs, onlyLegs) {
    const { origins, dests, date, minLayover = 60, minLayoverCity = 180, maxLayoverH = 12, maxTotalH = 72, windowH = 24, basis = 'cheapest', rates = {} } = opts;
    const D = dayNum(date);
    const t0 = D * 1440;
    const destSet = new Set(dests);
    const INF = 99;
    // untimed backward reachability: A[x] = legs still needed after arriving at x
    let A = new Array(ST.length).fill(INF); dests.forEach(d => A[d] = 0);
    for (let r = 0; r < maxLegs; r++) {
      const B = new Array(ST.length).fill(INF);
      for (const tr of TR) { let m = INF; for (let p = tr.stops.length - 1; p >= 0; p--) { const s = tr.stops[p][0]; if (m < INF && 1 + m < B[s]) B[s] = 1 + m; if (A[s] < m) m = A[s]; } }
      const A2 = A.slice();
      for (let x = 0; x < ST.length; x++) if (!destSet.has(x)) { let b = INF; for (const mt of mates[x]) if (B[mt] < b) b = B[mt]; if (b < A2[x]) A2[x] = b; }
      A = A2;
    }
    const results = []; let capped = false; const CAP = 40000; let tick = 0; const deadline = Date.now() + (onlyLegs ? 5000 : 12000);
    const maxWait = maxLayoverH * 60;
    const visited = new Set();
    const path = [];
    function dfs(boardStations, tmin, wait, legsUsed, fromStation) {
      for (const s of boardStations) {
        const cityHop = fromStation !== null && s !== fromStation;
        const tm = tmin + (fromStation === null ? 0 : (cityHop ? minLayoverCity : minLayover));
        for (const [ti, p] of byStation[s]) {
          if (p === TR[ti].stops.length - 1) continue;
          const tr = TR[ti];
          if (path.some(l => l.tr.i === ti)) continue;
          const O = earliestBoard(tr, p, tm, wait);
          if (O === null) continue;
          const depAbs = O * 1440 + tr.stops[p][2];
          for (let q = p + 1; q < tr.stops.length; q++) {
            if ((++tick & 2047) === 0 && Date.now() > deadline) { capped = true; return; }
            const x = tr.stops[q][0];
            const arrAbs = O * 1440 + tr.stops[q][1];
            if (path.length === 0 ? false : (arrAbs - path[0].depAbs > maxTotalH * 60)) break;
            if (path.length === 0 && arrAbs - depAbs > maxTotalH * 60) break;
            if (visited.has(x)) continue;
            const leg = { tr, p, q, O, depAbs, arrAbs };
            if (destSet.has(x)) {
              path.push(leg); if (!onlyLegs || path.length >= onlyLegs) results.push(path.slice()); path.pop();
              if (results.length >= CAP) { capped = true; return; }
              break; // reached destination; no point riding further
            }
            if (legsUsed + 1 < maxLegs && A[x] <= maxLegs - (legsUsed + 1)) {
              visited.add(x); path.push(leg);
              dfs(mates[x], arrAbs, maxWait, legsUsed + 1, x);
              path.pop(); visited.delete(x);
              if (capped) return;
            }
          }
        }
      }
    }
    origins.forEach(o => visited.add(o));
    const winWait = Math.max(0, windowH * 60 - 1);
    // first leg: start of search day, board at any chosen origin station
    for (const o of origins) { dfs([o], t0, winWait, 0, null); if (capped) break; }

    // build itineraries
    const its = results.map(path => {
      const legs = path.map(l => {
        const km = legKm(l.tr, l.p, l.q);
        const f = legFare(l.tr, km, basis, rates);
        return { train: l.tr, p: l.p, q: l.q, O: l.O, n: l.tr.n, name: l.tr.name, type: l.tr.type, classes: l.tr.classes, daysKnown: l.tr.days !== -1, originKnown: l.tr.originKnown,
          from: ST[l.tr.stops[l.p][0]], to: ST[l.tr.stops[l.q][0]], dep: l.depAbs, arr: l.arrAbs, km: km == null ? null : Math.round(km),
          stops: l.q - l.p, cls: f ? f.cls : null, fare: f ? f.fare : null };
      });
      const changes = legs.length - 1;
      const layovers = []; for (let k = 1; k < legs.length; k++) layovers.push(legs[k].dep - legs[k - 1].arr);
      const dur = legs[legs.length - 1].arr - legs[0].dep;
      const fareKnown = legs.every(l => l.fare != null);
      const fare = fareKnown ? legs.reduce((a, l) => a + l.fare, 0) : null;
      const via = legs.slice(1).map(l => l.from.name + (l.from.i !== legs[legs.indexOf(l) - 1].to.i ? ` (via ${legs[legs.indexOf(l) - 1].to.name})` : ''));
      const key = legs.slice(1).map(l => l.from.i).join('>');
      return { legs, changes, layovers, dur, fare, fareKnown, dep: legs[0].dep, arr: legs[legs.length - 1].arr, via, key, km: legs.reduce((a, l) => a + (l.km || 0), 0) };
    });
    return { its, capped, count: its.length, t0 };
  }

  function rank(its, mode, topN = 12) {
    const cmp = {
      fastest: (a, b) => a.dur - b.dur || a.changes - b.changes || (a.fare ?? 1e9) - (b.fare ?? 1e9),
      cheapest: (a, b) => (a.fare ?? 1e9) - (b.fare ?? 1e9) || a.dur - b.dur,
      fewest: (a, b) => a.changes - b.changes || a.dur - b.dur
    }[mode];
    const pool = its.slice().sort(cmp);
    const seen = new Set(), out = [];
    for (const it of pool) {
      const k = it.key + '|' + it.legs.map(l => l.n).join('-');
      const k2 = it.key; // one itinerary per distinct interchange sequence
      if (seen.has(k2)) continue; seen.add(k2); out.push(it);
      if (out.length >= topN) break;
    }
    return out;
  }

  function hubs(its) {
    const m = new Map();
    for (const it of its) {
      if (it.changes === 0) continue;
      for (let k = 1; k < it.legs.length; k++) {
        const s = it.legs[k].from, key = s.i;
        let h = m.get(key); if (!h) { h = { st: s, count: 0, best: Infinity, bestFare: Infinity, single: 0 }; m.set(key, h); }
        h.count++; if (it.dur < h.best) h.best = it.dur; if (it.fare != null && it.fare < h.bestFare) h.bestFare = it.fare;
        if (it.changes === 1) h.single++;
      }
    }
    return [...m.values()].sort((a, b) => b.single - a.single || b.count - a.count).slice(0, 15);
  }

  function nearestStations(id, n = 6) {
    const s = ST[id]; if (s.lat == null) return [];
    return ST.filter(x => x.i !== id && x.lat != null && byStation[x.i].length > 5).map(x => ({ st: x, km: Math.round(hav(s.lat, s.lon, x.lat, x.lon)) })).sort((a, b) => a.km - b.km).slice(0, n);
  }
  return { ST, TR, byCode, byStation, clusters, search, rank, hubs, stationSearch, nearestStations, dayNum, weekday, CLASS_ORDER, DEFAULT_RATES, mates };
}
if (typeof module !== 'undefined') module.exports = { createEngine };
