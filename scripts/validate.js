// Sanity checks on the rebuilt timetable. Exits non-zero if something looks broken.
const { createEngine } = require('../src/engine.js');
const D = require('../data/timetable.json');
const problems = [];
if (!D.meta || !D.meta.built_at) problems.push('missing meta.built_at');
if (D.tr.length < 3000) problems.push(`only ${D.tr.length} trains (expected 3000+)`);
if (D.st.length < 700) problems.push(`only ${D.st.length} stations (expected 700+)`);
const E = createEngine(D);
const date = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
const cases = [['Delhi (all', 'Mumbai (all'], ['Chennai (all', 'Kolkata (all'], ['Indore', 'Delhi (all'], ['Bengaluru (all', 'Hyderabad (all']];
for (const [a, b] of cases) {
  const o = E.stationSearch(a)[0], d = E.stationSearch(b)[0];
  if (!o || !d) { problems.push(`station not found: ${a} or ${b}`); continue; }
  const r = E.search({ origins: o.ids, dests: d.ids, date, maxChanges: 1 });
  if (!r.count) problems.push(`no route found for ${o.label} to ${d.label} on ${date}`);
  else console.log(`ok  ${o.label} -> ${d.label}: ${r.count} options`);
}
console.log(`trains ${D.tr.length}, stations ${D.st.length}, built ${D.meta && D.meta.built_at}`);
if (problems.length) { console.error('VALIDATION FAILED:\n - ' + problems.join('\n - ')); process.exit(1); }
console.log('validation passed');
