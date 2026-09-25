# Umrah Guide: offline web app (PWA)

A free, step-by-step Umrah companion. Static files only; no server code, no accounts, no tracking.

## Put it online with GitHub Pages (free)

1. Create a new **public** repository on GitHub, e.g. `umrah-guide`.
2. Upload **everything in this folder** to the root of the repository (keep the `assets` and `icons` folders, and the hidden `.nojekyll` file).
3. In the repository go to **Settings → Pages**. Under *Build and deployment* choose **Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**.
4. After a minute the guide is live at `https://<your-username>.github.io/umrah-guide/`.

All paths are relative, so it works both at a project address (`/umrah-guide/`) and on a custom domain.

## Install on a phone

- **Android (Chrome):** open the address, then tap **Install** on the home screen banner, or ⋮ → *Install app*.
- **iPhone (Safari):** open the address, tap **Share** → *Add to Home Screen*.

Open it once while online; after that every page works with no internet.

## What is stored on the phone

Only in the browser's local storage on that phone, never sent anywhere:
checklist ticks, the Tawaf and Sa‘i counters, the last step opened, "My info" fields and the text size.
"Start a new Umrah" in the Menu clears everything except "My info".

## Updating content

Edit the HTML pages, then change anything in `service-worker.js` (for example the `VERSION` value) so phones download the new version. Users see "Guide updated" and get it next time they open the app.

## Files

| File | Purpose |
|---|---|
| `index.html` | Home · Start here |
| `journey.html`, `menu.html` | Journey map, quick-jump menu with search |
| `step1.html` … `step8.html`, `complete.html` | The 8 Umrah steps and the completion screen |
| `duas.html`, `women.html`, `care.html`, `mistakes.html`, `quick.html`, `sources.html` | Guidance and reference screens |
| `print.html` | Printable two-sided A4 quick card |
| `manifest.json` | App name, colours and icons |
| `service-worker.js` | Offline caching of every page, style, font and icon |
| `assets/` | Styles, app script, self-hosted fonts (Amiri, Atkinson Hyperlegible, Newsreader, SIL Open Font License) |
| `icons/` | App icons (192, 512, maskable, Apple touch, favicon) |
| `search-index.json` | Text used by the search box in the Menu |

## Before publishing

- Have the content reviewed by a qualified scholar and fill in the `[REVIEWING SCHOLAR / INSTITUTION]`, `[GUIDE WEB ADDRESS]` and `[QR CODE]` placeholders.
- Audio buttons, other languages and night mode show "coming soon" messages until they are built.
- Saudi rules (visas, Nusuk, vaccines) were checked in September 2026; re-check each season.
