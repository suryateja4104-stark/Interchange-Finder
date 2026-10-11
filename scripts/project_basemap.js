const fs = require('fs');
const D = Math.PI / 180, R = 6371, p1 = 12.5 * D, p2 = 28.5 * D, p0 = 22 * D, l0 = 80 * D;
const n = Math.log(Math.cos(p1) / Math.cos(p2)) / Math.log(Math.tan(Math.PI / 4 + p2 / 2) / Math.tan(Math.PI / 4 + p1 / 2));
const F = Math.cos(p1) * Math.pow(Math.tan(Math.PI / 4 + p1 / 2), n) / n;
const r0 = F / Math.pow(Math.tan(Math.PI / 4 + p0 / 2), n);
function proj(lon, lat) { const r = F / Math.pow(Math.tan(Math.PI / 4 + lat * D / 2), n), th = n * (lon * D - l0); return [R * r * Math.sin(th), -R * (r0 - r * Math.cos(th))]; }
function ring(c) { let s = '', last = null, k = 0; for (const [lo, la] of c) { const [x, y] = proj(lo, la); const X = Math.round(x), Y = Math.round(y); if (last && last[0] === X && last[1] === Y) continue; s += (k++ ? 'L' : 'M') + X + ' ' + Y; last = [X, Y]; } return k > 2 ? s + 'Z' : ''; }
function path(g) { const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates; return polys.map(p => p.map(ring).join('')).join(''); }
function bbox(g) { const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const p of polys) for (const [lo, la] of p[0]) { const [x, y] = proj(lo, la); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return [Math.round(x1 - x0), Math.round(y1 - y0)]; }
function centroid(g) { const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates; let best = null, ba = -1; for (const p of polys) { const o = p[0]; let a = 0, cx = 0, cy = 0; for (let i = 0; i < o.length - 1; i++) { const [x1, y1] = o[i], [x2, y2] = o[i + 1], c = x1 * y2 - x2 * y1; a += c; cx += (x1 + x2) * c; cy += (y1 + y2) * c; } a /= 2; if (Math.abs(a) > ba) { ba = Math.abs(a); best = [cx / (6 * a), cy / (6 * a)]; } } return proj(best[0], best[1]).map(Math.round); }
const states = JSON.parse(fs.readFileSync(process.argv[2])), india = JSON.parse(fs.readFileSync(process.argv[3]));
const out = { india: path(india.type === 'GeometryCollection' ? india.geometries[0] : (india.features ? india.features[0].geometry : india)), states: states.features.map(f => ({ n: f.properties.st_nm, d: path(f.geometry), c: centroid(f.geometry), b: bbox(f.geometry) })) };
fs.writeFileSync(process.argv[4], JSON.stringify(out));
console.log('bytes', JSON.stringify(out).length, 'states', out.states.length);
module.exports = { proj };
