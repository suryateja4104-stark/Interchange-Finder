# Interchange Finder

A single-page web app for finding Indian Railways routes that need a change of train. Enter a start, a destination and a date. It lists the stations where you can change trains, the trains on each leg with every halt in between, the waiting time at each change, an estimated fare, and draws the selected route on a map of India.

I built it after an Indore to Dehradun booking where no direct train existed and IRCTC gave no help with connections.

## How it works

Everything runs in the browser. `index.html` is one file that carries the timetable, the map outlines and the routing code, so it works offline once loaded.

- **Timetable:** the Railway Board's *Trains at a Glance 2026*, taken from the parsed file in the open [railways-mcp](https://github.com/shubhamyadav8901/railways-mcp) project. 3,567 trains and 807 stations after cleanup.
- **Routing:** a depth-first search over train legs with timed connections. It knows which weekdays each train runs and applies minimum and maximum waits. It allows a longer wait when you must change between two stations of the same city, for example New Delhi and Nizamuddin.
- **Fares:** estimates from the length of the leg and per-km rates you can edit in the page. The timetable has no distances or fares, so treat them as rough.
- **Map:** drawn as SVG on a Lambert conic projection. State outlines are embedded, and stations are placed from their coordinates. Route lines join the halting stations and do not follow the exact track.

## Limits

- Timetable times are the printed 2026 times. Trains retimed since then will differ.
- Seat availability and live running status are not included.
- 188 trains in the source could not be parsed and are missing.
- Each leg is a separate ticket. A missed connection is not covered.
- There is no bus data. When no rail route exists the page suggests nearby stations and links to bus sites.

## Layout

```
index.html              the built app, open it directly or host it on GitHub Pages
src/template.html       page markup, styles and UI code
src/engine.js           route search and fare estimate
data/timetable.json     compact timetable built from the 2026 source
data/basemap.json       India outline and states in kilometres
scripts/build.sh        rebuild the timetable and index.html from the latest upstream file
scripts/refresh.sh      change check used by the monthly job
scripts/validate.js     sanity checks on the rebuilt data
.github/workflows/      monthly refresh job
scripts/build_basemap.sh rebuild the map outlines
tests/engine_smoke.js   runs sample searches in Node
```

## Rebuild

```
scripts/build.sh            # needs git and python3
scripts/build_basemap.sh    # optional, needs node
node tests/engine_smoke.js
```

## Automatic refresh

`.github/workflows/refresh-timetable.yml` runs on the 1st of every month (03:23 UTC) and can be started by hand from the Actions tab. It runs `scripts/refresh.sh`, which:

1. clones the upstream railways-mcp project and hashes its timetable files,
2. stops if the hash matches `data/SOURCE.json`,
3. otherwise rebuilds `data/timetable.json` and `index.html`, runs `scripts/validate.js` (train and station counts, sample routes), and updates `data/SOURCE.json`,
4. commits the result to `main`.

If validation fails, the job fails and nothing is committed. GitHub emails the person who last edited the workflow when a scheduled run fails. Use "Run workflow" with "force" ticked to rebuild without an upstream change. GitHub pauses scheduled workflows in a repo with no activity for 60 days, so if the data stays unchanged for two months you may need to re-enable it in the Actions tab.

This keeps the page as current as the upstream file. It does not add retimings that the upstream project has not published.

## Data sources and credits

See [ATTRIBUTION.md](ATTRIBUTION.md). This project is not affiliated with Indian Railways, IRCTC, CRIS or the Railway Board. Check IRCTC or NTES before you book.

## License

No license has been chosen for the code yet.
