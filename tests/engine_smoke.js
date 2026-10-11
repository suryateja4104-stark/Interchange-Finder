const { createEngine } = require('../src/engine.js');
const E = createEngine(require('../data/timetable.json'));
for (const [f,t,c] of [['Indore','Dehradun',2],['Indore','Dehradun',3],['Indore','Guwahati',3]]) {
  const o=E.stationSearch(f)[0], d=E.stationSearch(t)[0]; const t0=Date.now();
  const r=E.search({origins:o.ids,dests:d.ids,date:'2026-10-14',maxChanges:c}); const by={}; r.its.forEach(i=>by[i.changes]=(by[i.changes]||0)+1);
  console.log(f,t,'changes<=',c, r.count, Date.now()-t0+'ms', r.capped, by, 'best', (E.rank(r.its,'fastest',1)[0].dur/60).toFixed(1)+'h');
}
