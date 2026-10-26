# MMM-SchoolLunchMenu

A local school lunch menu with side dishes, closure handling and upcoming meals.

Version 0.1.0. MIT-licensed standalone MagicMirror module.

![Synthetic standalone module preview](docs/preview.png)

## Installation

From your MagicMirror installation directory:

```sh
cd modules
git clone https://github.com/QuietNodeLab/MMM-SchoolLunchMenu.git
```

Alternatively, download the repository ZIP and extract it as the folder below.

Copy this folder into `MagicMirror/modules/MMM-SchoolLunchMenu`. No extra npm
runtime packages or shared dashboard stylesheet are required. Use MagicMirror
2.38.0 with Node 24 as the tested baseline; other versions still need
verification.

Copy `lunch-menu.example.json` to `MagicMirror/config/lunch-menu.json`. Keep
real data private and outside Git. Optionally copy `school-day.example.json` to
config as `school-day.json`.

Add a module entry to your local config:

```js
{
  module: "MMM-SchoolLunchMenu",
  position: "top_left",
  config: {
    "menuFile": "lunch-menu.json",
    "schoolFile": "school-day.json",
    "timezone": "Europe/London"
  }
}
```

## Behavior and configuration

The menu has a `days` object keyed by YYYY-MM-DD. Entries contain `main`,
optional `sides`/`notes` arrays, and optional `earlyDismissal`. `alternates` and
`alwaysAvailable` are arrays. Maintain the file manually; there is no PDF or
school-portal importer.

The optional school file uses `closed` and `earlyDismissal` maps (see
school-day.example.json). It does not require a school-day module. A closure
takes precedence over a stale menu entry; weekends are skipped. Malformed
existing school data reports an error rather than silently ignoring closures.

Options: `menuFile` (lunch-menu.json), `schoolFile` (school-day.json),
`timezone` (null = browser zone), `refreshInterval` (600000 ms),
`showAlternates` (true), `lookAheadDays` (7), `debugDate` (null). Set
`debugDate: "2030-01-08"` for the synthetic preview. English food-icon matching
is built in.

## Synthetic data example

```json
{
  "days": {
    "2030-01-08": {
      "main": "Pasta with vegetables",
      "sides": ["Fresh fruit"],
      "notes": ["Water available"]
    },
    "2030-01-10": {
      "main": "Sample pizza",
      "sides": ["Salad"]
    }
  },
  "alternates": ["Vegetarian sandwich"]
}
```

## Development

`npm ci --ignore-scripts` and `npm test` run offline with Node 24. External APIs
must be mocked. JSON date modules use calendar dates; the configured zone
selects "today". Private configuration and cache data are ignored. All example
people, locations and events are synthetic or public examples. Screenshots use
only mock data.

Styles are scoped to the module. Change its own card CSS in your local
custom.css if desired; do not copy a full dashboard theme. Keep filenames as
filenames rather than absolute deployment paths. JSON helpers search config
first, then the module. Timers stop when the module is suspended and restart
when it resumes.

See [VALIDATION.md](VALIDATION.md) for tests actually performed and their
limits.

## License and attribution

The custom package code is MIT-licensed under module contributors; see
[LICENSE](LICENSE). No source-project Git history, private configuration,
optional device services or upstream module implementation is bundled.
MagicMirror is a separate dependency. See [ATTRIBUTION.md](ATTRIBUTION.md) for
artwork and external data notes.
