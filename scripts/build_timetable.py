import gzip, json, sys, collections
src_dir, out_path = sys.argv[1], sys.argv[2]
d = json.load(gzip.open(src_dir + '/tag2026.json.gz'))
eq = json.load(open(src_dir + '/station_equivalences.json'))

stations = {s[0]: s for s in d['stations']}
canon = {}
for g in eq['groups']:
    cur = g['current']
    for c in g['codes']:
        canon[c] = cur
def cc(code):
    return canon.get(code, code)

WD = {'MON':0,'TUE':1,'WED':2,'THU':3,'FRI':4,'SAT':5,'SUN':6}
def hm(s):
    h, m = s.split(':'); return int(h) * 60 + int(m)

idx = {}
st_out = []
def sidx(code):
    if code not in idx:
        s = stations.get(code)
        if s is None:
            # canonical code may be missing from station list; borrow from any alias
            for g in eq['groups']:
                if code in g['codes']:
                    for c in g['codes']:
                        if c in stations: s = stations[c]; break
        if s is None: return None
        idx[code] = len(st_out)
        st_out.append([code, s[1], s[2], s[3], round(s[4], 4) if s[4] is not None else None, round(s[5], 4) if s[5] is not None else None])
    return idx[code]

def to_mmdd(s):
    m, dd = s.split('-'); return int(m) * 100 + int(dd)

tr_out = []; bad = collections.Counter()
for t in d['trains']:
    raw = [s for s in t['stops'] if s[0] is not None and (s[2] or s[3])]
    # drop consecutive duplicate stations
    stops = []
    for s in raw:
        c = cc(s[0])
        if stops and stops[-1][0] == c: 
            # merge: keep first arrival, last departure
            stops[-1][2] = s[3] or stops[-1][2]; continue
        stops.append([c, s[1], s[3], s[4], s[2]])  # code,name,dep,day,arr
    # NOTE: indexes -> 0 code, 1 name, 2 dep, 3 day, 4 arr
    if len(stops) < 2: bad['lt2'] += 1; continue

    def build(use_day):
        out = []; cur = None
        for code, name, dep, day, arr in stops:
            a = hm(arr) if arr else None; p = hm(dep) if dep else None
            if use_day and day is not None:
                base = (day - 1) * 1440
                if a is not None:
                    A = base + a
                    P = A + ((p - a) % 1440) if p is not None else A
                else:
                    P = base + p; A = P
            else:
                if cur is None:
                    A = a if a is not None else p
                    P = p if p is not None else A
                    if a is not None and p is not None and p < a: P = p + 1440
                else:
                    A = a if a is not None else p
                    while A < cur: A += 1440
                    P = p if p is not None else A
                    while P < A: P += 1440
            if cur is not None and A < cur: return None
            if P < A: return None
            out.append((code, A, P)); cur = P
        return out
    res = build(True)
    if res is None: res = build(False); bad['wrap_fallback'] += 1
    if res is None: bad['nonmono'] += 1; continue
    # first stop: arrival = departure; last: departure = arrival
    res[0] = (res[0][0], res[0][2], res[0][2]); res[-1] = (res[-1][0], res[-1][1], res[-1][1])
    # normalise so first departure's day is relative to origin day 0 when day-known
    first = res[0][2]
    if first >= 1440 and stops[0][3] is None:  # wrap-derived: shift to start day 0
        sh = (first // 1440) * 1440; res = [(c, a - sh, p - sh) for c, a, p in res]
    ids = []
    ok = True
    for c, a, p in res:
        i = sidx(c)
        if i is None: ok = False; break
        ids.append([i, a, p])
    if not ok: bad['nostation'] += 1; continue
    days = -1
    if t['days']:
        days = 0
        for w in t['days']: days |= 1 << WD[w]
    v = t.get('valid')
    tr_out.append([t['n'], t['name'], t['type'] or '', ','.join(t['classes']) if t['classes'] else '', days,
                   to_mmdd(v['from']) if v else 0, to_mmdd(v['to']) if v else 0, ids, 1 if stops[0][3] is not None else 0])
json.dump({'meta': {'id': d['meta']['id'], 'built_at': d['meta']['built_at'], 'name': d['meta']['name']}, 'st': st_out, 'tr': tr_out},
          open(out_path, 'w'), separators=(',', ':'))
print('trains', len(tr_out), 'stations', len(st_out), dict(bad))
