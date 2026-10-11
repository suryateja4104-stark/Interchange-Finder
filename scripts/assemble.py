import sys
tpl, eng, data, geo, out = sys.argv[1:6]
t = open(tpl).read(); e = open(eng).read(); d = open(data).read().replace('</', '<\\/').replace('<!--', '<\\!--'); g = open(geo).read().replace('</', '<\\/')
assert '__DATA__' in t and '/*ENGINE*/' in t and '__GEO__' in t
t = t.replace('/*ENGINE*/', e).replace('__DATA__', d).replace('__GEO__', g)
open(out, 'w').write(t); print(len(t))
