# Notch

A phone app that teaches you to sew, from your first stitch to drafting your own patterns and making your own clothes.

**Live at:** https://adewyn.github.io/notch/

- Works offline once it's opened one time.
- Everything you save (progress, measurements, notes, projects, and photos) stays on your phone. Nothing is sent anywhere.
- One seam allowance everywhere: **5/8 in (1.5 cm)**.
- All lessons, diagrams, and patterns are original. Diagrams are drawn in code. No AI images.

## Install it on your iPhone

1. Open **Safari** (it must be Safari, not Chrome) and go to https://adewyn.github.io/notch/
2. Tap the **Share** button (the square with an arrow pointing up).
3. Scroll down and tap **Add to Home Screen**, then tap **Add**.
4. Open Notch from your home screen. From now on it works without internet.

Your Notch data lives inside the home-screen app. It's separate from Safari, so always open Notch from the home-screen icon.

## Keep your data safe

Open **More → Export backup** now and then, and save the file to Files or iCloud Drive. To restore, use **More → Import backup**.

- A backup replaces everything in Notch with what's in the file.
- Backups include your project photos, so they grow as you add photos. Photos are shrunk before saving to keep this reasonable.
- A backup made by a newer Notch is refused by an older one, so an out-of-date app can never wipe your data. Update first (see below), then import.

## Get updates

Updates arrive by themselves. When a new version is out, open Notch while online; you'll see "Notch was updated" with a **Reload** button. Until you reload (or reopen the app), you keep using the old version. If it doesn't show up, close Notch fully (swipe it away in the app switcher) and open it again.

You can check which version you have at the bottom of the **More** tab.

## Putting it on GitHub Pages (already done)

This is how the site was set up, in case it ever needs redoing:

1. Go to https://github.com/new
2. Name the repository `notch`, choose **Public**, and click **Create repository**.
3. Upload all the files in this folder (or push them with git).
4. In the repository, click **Settings** (top bar), then **Pages** (left sidebar).
5. Under **Build and deployment**, set **Source** to **Deploy from a branch**, **Branch** to **main**, folder **/ (root)**, and click **Save**.
6. Wait a minute or two. The address shows at the top of the Pages screen.

## Releasing a new version (for whoever edits the code)

1. Make the changes.
2. In `sw.js`, raise the number in `CACHE` (for example `notch-v1` to `notch-v2`). This is how phones know to fetch the new files.
3. In `js/db.js`, raise `APP_VERSION`.
4. Add a line to the changelog below.
5. Commit and push to `main`. GitHub Pages updates within a couple of minutes.

Rules for saved data:

- Never rename the database or change the shape of saved data without adding a migration step in `js/db.js` (`MIGRATIONS`) and raising `DATA_VERSION`.
- If the backup file format changes, raise `BACKUP_VERSION`. Older apps then refuse the new files.

## How it's built

Plain HTML, CSS, and JavaScript. No build step: the files you see are the files that run.

```
index.html            the page
css/style.css         the look (light and dark)
js/app.js             Path, lessons, measurements, More, and navigation
js/core.js            shared state and helpers (text tokens, diagrams, sheets, toasts)
js/library.js         Library: glossary, flashcards, fabric guide, Fix it
js/projects.js        My projects (notes and photos)
js/db.js              saving on the phone (IndexedDB), backups, and migrations
js/diagrams.js        the shared diagrams and drawing helpers, drawn as SVG in code
js/dia3.js ... dia5.js  each level's own diagrams (added with register())
js/pdf.js             printable PDFs (practice sheets now; patterns later)
js/units.js           inches and centimeters
data/course.json      the levels
data/level1.json ...  lessons and projects, one file per level
data/glossary.json    every term, explained simply
data/fabrics.json     the fabric guide
data/troubleshoot.json  Fix it problems and steps
data/measurements.json  how to take each measurement
sw.js                 offline support
```

To fix or add a lesson, edit the level's JSON file. In lesson text:

- `{{12 in}}` shows a length in the user's chosen unit; `{{SA}}` shows the seam allowance.
- `[[selvedge]]` links a glossary term. `[[baste|basting]]` links the term "baste" but shows the word "basting".
- `**bold**` makes text bold.
- Each step's `dia` names a diagram from `js/diagrams.js` with its options.

To try it on a computer, run `python3 -m http.server 8796` in this folder and open http://localhost:8796/?nosw (the `?nosw` part turns off offline caching so you always see your latest edits).

It can later be wrapped as an App Store or Play Store app with Capacitor, with no changes to how it works.

## Changelog

- **0.2.0** (Nov 26, 2026): Phase 2. Levels 3 (Fabric school), 4 (Reading a pattern), and 5 (Garment skills): 51 new lessons and projects, including a fabric swatch book, elastic-waist pajama pants, a gathered skirt cut from your measurements, a woven top, an A-line skirt with a zipper, and a button-up shirt. New Projects tab (notes, pattern and size, fabric, photos, and status), with a button on every project lesson to track it. New Library tab: a searchable glossary of about 170 words, flashcards that bring words back after a few days, a fabric guide with 32 fabrics, and Fix it, a step-by-step troubleshooter for 16 common problems. Photos are shrunk before saving and are included in backups.
- **0.1.1** (Nov 26, 2026): Second pass. Fixed the pillowcase finished length (30¼ in, not 31½) and its drawings; the tote now asks for 7/8 yd of canvas so it still fits after prewashing; added missing backstitching steps, trimmed corners in the pivot practice, and fixed the backstitch start; the seam allowance example now has the right math; the shopping list now covers everything levels 1 and 2 use. Small metric amounts now show to the millimeter (1/8 in shows as 0.3 cm, not 0.5). Offline updates now swap all files at once. Added a gentle backup reminder on the Path, Mark as not done, larger level numbers, keyboard access for the skill checklist, and safer note saving.
- **0.1.0** (Nov 26, 2026): Phase 1. App shell and Path map with all 9 levels; levels 1 and 2 (34 lessons and projects: tools, threading, hand stitches, first seams, fabric basics, a pincushion, a drawstring bag, a pillowcase, and a lined tote); tappable glossary words; 24 guided body measurements with history and inches/cm; printable practice sheets (Letter and A4); backups with version checks; offline support; light and dark mode; screen stays awake during lessons.
