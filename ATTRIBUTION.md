# Data sources and credits

**Timetable.** Derived from the Railway Board's publicly available *Trains at a Glance 2026* (indianrailways.gov.in). The parsed file `data/tag2026.json.gz` comes from [shubhamyadav8901/railways-mcp](https://github.com/shubhamyadav8901/railways-mcp), which is licensed Apache-2.0. That project's [DISCLAIMER](https://github.com/shubhamyadav8901/railways-mcp/blob/main/DISCLAIMER.md) says the data is for personal, non-commercial use and must not be relied on for booking decisions. Station codes and coordinates in that file derive from the CC0 [datameet/railways](https://github.com/datameet/railways) dataset. `data/timetable.json` here is a compacted version of it.

**Map outlines.** State boundaries come from [udit-001/india-maps-data](https://github.com/udit-001/india-maps-data) (district boundaries, which that repository states are based on 2011 data with later updates). They are merged into states, simplified and projected by `scripts/build_basemap.sh`. That repository has no license file at the time of writing, so check its terms before reusing `data/basemap.json` beyond personal use. The outlines are indicative and not survey-grade.

**Fonts.** Barlow, Barlow Condensed and IBM Plex Mono are loaded from Google Fonts and are licensed under the SIL Open Font License.

**Revenue.** The timetable data is intended for personal use by its source. Do not build a paid product on it without checking the terms of the Railway Board publication and the sources above.
