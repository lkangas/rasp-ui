# Soaring forecast — RASP viewer

Browser-only static page (no backend, no build step): a slider-based UI for
the Finnish Aviation Federation's (Ilmailuliitto) RASP soaring forecast
normally served as a bare grid of static images at
[ennuste.ilmailuliitto.fi](http://ennuste.ilmailuliitto.fi/). This page hosts
no forecast imagery of its own — it just points `<img>` tags at the source
site's own URLs and adds a day slider, a time slider, a product picker and
automatic preloading on top.

## Use

Open `index.html` directly in a browser, or serve the directory statically
(`python -m http.server`). Pick "Perus" (basic) or "Laaja" (extended) to
control how many products show up in the dropdown, pick a product, then drag
the day/time sliders — every image for the selected product across all 4
forecast days and all 13 hourly times is preloaded up front, so scrubbing is
instant. Click the forecast image to step forward one hour, shift-click to
step back; the ▶ button loops through the day's times automatically.

## How it works

The source site (`ennuste.ilmailuliitto.fi`) is itself a "RASP" (Regional
Atmospheric Soaring Prediction, Dr. Jack Glendening's soaring-forecast
system) install: a plain HTML page driven by `root/RASP.js` +
`root/params.js` + `root/site.js`, which builds image URLs as

```
{day}/{param}.curr.{HHMM}lst.d2.png
```

`day` is `0`-`3` (today .. day+3), `HHMM` is one of 13 hourly forecast times
(`0900`-`2100`), and `param` is one of ~34 forecast parameters (thermal
strength, cloudbase, wind, rain, CAPE, cross-sections, …) or one of 15
per-station vertical soundings. `config.js` in this repo transcribes that
exact product catalog (names, Finnish titles/descriptions, and which
products are "extra" i.e. Laaja-only) straight from the source's
`root/params.js`, so the product list here matches the source 1:1. If the
source ever adds/renames a product, re-fetch `root/params.js` from the
source and update `config.js` to match.

## Deploying over HTTPS: the mixed-content problem

`ennuste.ilmailuliitto.fi` has **no HTTPS listener** — it's plain HTTP only.
A page served over HTTPS (like `weather.defocus.fi`) that hotlinks `http://`
images hits browsers' mixed-content auto-upgrade: the browser silently tries
HTTPS for the image first and, since the source has none, the image just
fails to load with no HTTP fallback.

`config.js`'s `IMG_BASE` handles this automatically, keyed off the page's own
protocol (`location.protocol`) rather than a value someone has to remember to
edit before deploying:

- **Local/plain-HTTP testing** (`python -m http.server`, or `file://`):
  resolves to the direct source URL (`http://ennuste.ilmailuliitto.fi/`) —
  fine since there's no mixed-content issue when the page itself isn't HTTPS.
- **Production (HTTPS) deploy**: resolves to a same-origin path
  (`/soaring-img/`) that the server reverse-proxies to the source. This repo
  doesn't include that proxy config since it lives in the parent `wx` repo's
  `deploy/Caddyfile` — see that repo's README for the exact block, and make
  sure the block exists there before this app is live, or every image will
  404. The proxy should be a live passthrough only (no caching/storage on the
  server) so this app still isn't "hosting" the forecast imagery, just
  relaying it over a secure connection.

## Layout

- `index.html` — page shell (parset/product dropdowns, day/time sliders,
  image area).
- `style.css` — styling (light/dark via `prefers-color-scheme`).
- `config.js` — the product catalog transcribed from the source, the image
  URL builder, and `IMG_BASE`.
- `app.js` — slider/dropdown wiring, per-product preloading, race-safe
  display updates, play/pause time animation.

## Attribution

Forecast data and imagery: Ilmailuliitto (Finnish Aviation Federation),
[ennuste.ilmailuliitto.fi](http://ennuste.ilmailuliitto.fi/), based on Dr.
Jack Glendening's RASP soaring-forecast model. This project is an
independent, unofficial alternative viewer and isn't affiliated with
Ilmailuliitto.
