# nonfictionhotlist.com

The Nonfiction Hotlist's main website, being rebuilt from the Squarespace site at nonfictionhotlist.com. This repo holds the site's structure and copy, and the shared brand kit every Hotlist site uses. The redesign follows the build brief (`~/Documents/Nonfiction Hotlist/nfh-website-build-brief.md`) and the homepage design canvas; every page now uses it.

The yearly lists live in a separate repo, [Nonfiction-Hotlist/list](https://github.com/Nonfiction-Hotlist/list) (list.nonfictionhotlist.com).

The rebuilt site is previewed at https://new.nonfictionhotlist.com (search engines are told to skip it). nonfictionhotlist.com itself is still Squarespace until the switch-over.

How everything runs (both sites, the timers, keys that expire, what to do when an email arrives, and the switch from Squarespace): [OPERATIONS.md in the list repo](https://github.com/Nonfiction-Hotlist/list/blob/main/OPERATIONS.md).

## What's here

```
content/
  site.json          Navigation, footer, contact email.
  pages/<page>.md    One file per page. Front matter (title, path, description, source) then the copy.
  news/<date>-<slug>.md   News posts. Front matter carries the date, listing image and excerpt.
  forms/<form>.json  Form fields (contact, newsletter).
  media/             Images from the Squarespace pages.
  files/             Downloads (PDFs) the pages link to.
  redirects.json     Old Squarespace addresses and where they now go.
capture/
  capture.json       Everything read from nonfictionhotlist.com on 1 November 2026: navigation, footer,
                     and every page's sections and blocks.
  extract.py         Reads saved Squarespace pages into capture.json.
  to-content.py      Turns capture.json into content/.
```

## Working on it

```sh
npm install        # first time only
npm run serve      # builds into site/ and previews at http://localhost:8090
npm run release    # build, then check every link, every old Squarespace address, and each page in a browser
```

Every push to `main` runs `.github/workflows/publish.yml`: build, the same checks, then GitHub Pages publishes `site/`.

`scripts/build.js` turns `content/` into `site/` using `src/layout.html`. The layout's styles are placeholders for reading the structure; design comes later. Forms are shown but not connected yet. Old Squarespace addresses in `content/redirects.json` get forwarding pages.

## Brand kit (shared by every Hotlist site)

`brand/` holds the design system in code: `tokens.json` (exported from the design system artifact), `base.css`, `components.css` (classes start with `nfh-`), `nfh.js` (menu, storytellers, forms, background video), fonts and logos. `scripts/brand/build-brand.js` turns `tokens.json` into CSS variables and publishes the kit at `/brand/v1/` (`nfh.css` is the one stylesheet a page needs). The list sites and dashboards copy `/brand/v1/` in when they build, so a change reaches them after their own checks. A change that would break pages already on v1 goes in `v2`.

The top bar, menu and footer are built once by `scripts/lib/chrome.js` from `content/site.json`.

Colors to know: white reading text sits on `--gradient-green-text` (green to forest, 5:1 or better), not on `--gradient-green` (its light corner is 3.5:1, fine for headlines only). Spark yellow appears once per page.

## Homepage

`scripts/pages/home.js` (markup and copy) and `src/home.css` (layout), built to match the canvas section by section. Its text is changed in code, not in the Drive kit: the "Home Page" Doc still syncs but no longer feeds the homepage. Storyteller quotes are in `content/testimonials.json`. Photos: originals stay outside the repo; `npm run images` makes the web sizes in `content/img/` (list in `scripts/brand/images.js`).

## Other pages

`scripts/pages/page.js` and `src/page.css`. Pages still come from the Drive kit (`content/pages/*.md`, `content/news/*.md`), and page.js decides how each `:::` section looks: the first section is the page's hero; FAQ, contributor names, photo groups, format chips, call-to-action bands, the submission apps and the news list each get their own layout. Per-page settings (the label over the headline, the outlined year on 2026 pages, the Yahoo theme, the reading layout for legal pages) are in `PAGES` at the top of page.js. Yahoo x NFH pages use the purples from the Yahoo artwork (`.nfh-theme-yahoo` in page.css); the bar and footer stay green.

## Editing in Google Drive

The site's text is edited in the "NFH Website" folder in Drive (inside Nonfiction Hotlist CD):

```
00 How this works            Guide for editors
01 Pages/                    One Google Doc per page
02 News/                     One Google Doc per news post
Media/                       Images the pages use
Site                         Google Sheet: Pages, News, Menu, Footer, Settings
Site manifest (do not edit)  The map the website reads
```

In the Docs, the `:::` blocks below appear as grey bracket lines (`[section about]`, `[button: Submit Here | /submit2026/]`, `[image: photo.jpg]`, `[faq]` ... `[end faq]`). The guide explains them to editors.

- `npm run kit` writes `drive-kit/setup-website.gs` from the current content. Paste it into a new project at script.google.com (as matthew@nonfictionhotlist.com) and run `buildKit`. Put the Site manifest ID it logs in `content/drive.json` as `{ "manifestId": "..." }`.
- The Publish workflow runs `scripts/kit/pull-drive.js` every 15 minutes (and when the publish trigger in the list repo asks): it turns the Docs and Site sheet back into `content/`, fetches new or replaced images, commits and publishes. Edits that break a rule are skipped, listed in `content/sync-problems.txt`, and the run fails once so the owner gets an email.
- `refreshKit` runs in the kit every 10 minutes: a new row in the Pages or News tab gets its own Doc, and the Media folder's images are listed for the sync.
- `npm run test:kit` checks the conversion both ways on every page, then runs the setup script against a stand-in for Google and reads the result back. `npm run test:kit:clean` must report no changes.

## Forms (contact and newsletter)

The contact form (home page, Subscribe) and the newsletter box (footer) are part of the site. They send to a small Apps Script, `drive-kit/forms.gs`, deployed as a web app under matthew@nonfictionhotlist.com; its address is `FORMS` in `scripts/lib/address.js`. For each entry the script turns away spam (a hidden trap field, and forms sent within 3 seconds), saves a row in the private "Website sign-ups" Sheet in matthew@'s Drive (never in the kit folders, which are shared by link), emails NOTIFY_EMAIL about contact entries, and adds the person to the Brevo list only if they ticked "Sign up for news and updates" or used the newsletter box. The Brevo key stays in the script's properties. Field names and labels are in `content/forms/*.json`. `node drive-kit/test/forms-test.js` checks every rule.

## Top bar (shared with the Hotlist lists)

The menu bar is built once, here, by `scripts/lib/header.js` from the Site sheet's Menu tab and Settings (the button), and published at `/shared/header.html`. The website uses it on every page, and the list site (Nonfiction-Hotlist/list) copies it in when it builds, so list.nonfictionhotlist.com shows the same bar above the list's own controls. Its links are full addresses on the website's current address, set in `scripts/lib/address.js` (the preview address until the switch from Squarespace). On phones the menu folds behind a Menu button.

## Team dashboard

https://new.nonfictionhotlist.com/dashboard/ (unlisted, search engines told to skip it): a card for every page and news post with a preview (a screenshot taken at publish time by `scripts/build-previews.js`) and a one-click link to its Google Doc, the Site sheet's tabs and the kit's folders, when each page last changed, edits the sync skipped, and recent changes. Built by `scripts/build-dashboard.js` on every publish; the links come from `content/drive.json`, which the sync keeps up to date.

## Video

Background videos (silent, looping, up to 60 seconds, like the home page's) are handled like images, with one extra step: the site serves its own lighter versions, never the original.

1. **Upload the original** to the kit's Media folder in Drive, at full quality (an H.264 or ProRes export is fine). Keep the name simple; the site names it in lower case with dashes (`Nonfiction Hotlist.mp4` becomes `nonfiction-hotlist`).
2. **Place it** in a page Doc, right under a `[section]` line: `[background video: Nonfiction Hotlist.mp4]`. The section's content (the logo, on the home page) sits in a thin frame over the video.
3. **The sync does the rest.** It downloads the original once, and `scripts/lib/video.js` makes `content/video/<name>-1080.mp4` (desktop), `<name>-720.mp4` (phones) and `<name>.jpg` (the first frame): H.264 so it plays everywhere, no sound, a keyframe every 2 seconds, and "faststart" so it starts before it has fully loaded. Only those are committed. GitHub installs ffmpeg only on runs where a video changed.
4. **To replace a video**, upload the new file to Media with the same name. The sync notices the change and makes new versions.

The page plays the video muted and on a loop, the phone or desktop version as fits the screen, and only while it's on screen. Visitors whose device asks for less motion see the still instead.

Limits: 60 seconds and 20 MB per web version. Longer videos and anything with sound (trailers, films, talks) go on Vimeo or YouTube and are placed with `[embed: link]`; they stream at the right quality for each viewer there, and the repo and site stay light. To make web versions by hand: `node scripts/lib/video.js original.mp4 name`.

## How pages are written

Markdown, with a few additions for things Squarespace had:

- `::: section name` ... `:::` marks a page section (a band on the page). The name comes from its first heading.
- `[Label](/path){.button}` is a button.
- `::: faq` ... `:::` holds questions (`### Question`) and answers.
- `::: marquee` ... `:::` is a scrolling line of words.
- `::: form contact` ... `:::` places a form from `content/forms/`.
- `::: embed URL` ... `:::` embeds another site (the submission and reviewer apps, the Canva deck).
- `::: news-list` ... `:::` lists the news posts.

## Pages

| Path | From Squarespace | In the menu |
|------|------------------|-------------|
| `/` | `/` (and `/home`, a copy) | |
| `/news/` | `/news` | About > News |
| `/news/<post>/` | `/news/...` (two had "Blog Post Title One" addresses) | |
| `/contributors/` | `/contributors` | The Hotlist > Contributors |
| `/the-2026-hotlist/` | `/the-2026-hotlist` | The Hotlist > 2026 Hotlist |
| `/submit2026/` | `/submit2026` | |
| list.nonfictionhotlist.com/2025 | `/the-2025-hotlist` (and `-1`, a copy) forward there | The Hotlist > 2025 Hotlist |
| `/yahoo/` | `/yahoo` | Yahoo x NFH |
| `/yahooxnfh1/` | `/yahooxnfh-1` (the fuller of two copies of the 1.0 open call) | |
| `/yahooxnfh/submit/`, `/yahooxnfh/reviewer/` | same | |
| `/terms-of-use/`, `/privacy-policy/`, `/submission-agreement/` | same | About > (first two) |

## Things found on the Squarespace site

- The footer newsletter sign-up (and the one on the 2025 Hotlist page) has no storage set, so sign-ups go nowhere.
- A footer heading still reads "Some Stuff".
- "Hear From Our Storytellers" on the home page is a heading with nothing under it.
- The 2026 FAQ says the deadline is September 9th; the banner on the same page says it was extended to September 25th.
- Contributor names linked through Canva redirect links; they now link straight to each person's page.
- The 2025 Hotlist page embedded the Canva deck; the menu and home page now link to list.nonfictionhotlist.com/2025 instead.
- The Deadline news post links to /yahooxnfh, which was a 404; it now redirects to /yahoo/.
- Submissions and reviewer login are separate apps (nfh-submission-prod.vercel.app, nfh-custom-build.vercel.app), embedded in the pages.
