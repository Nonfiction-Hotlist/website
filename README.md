# nonfictionhotlist.com

The Nonfiction Hotlist's main website, being rebuilt from the Squarespace site at nonfictionhotlist.com. This repo holds the site's structure and copy. Design and branding come later, so pages are plain on purpose.

The yearly lists live in a separate repo, [Nonfiction-Hotlist/list](https://github.com/Nonfiction-Hotlist/list) (list.nonfictionhotlist.com).

The rebuilt site is previewed at https://new.nonfictionhotlist.com (search engines are told to skip it). nonfictionhotlist.com itself is still Squarespace until the switch-over.

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
