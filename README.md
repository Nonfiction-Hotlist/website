# nonfictionhotlist.com

The Nonfiction Hotlist's main website, being rebuilt from the Squarespace site at nonfictionhotlist.com. This repo holds the site's structure and copy. Design and branding come later, so pages are plain on purpose.

The yearly lists live in a separate repo, [Nonfiction-Hotlist/list](https://github.com/Nonfiction-Hotlist/list) (list.nonfictionhotlist.com).

Nothing here is online yet. The live site is still Squarespace.

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
| `/the-2025-hotlist/` | `/the-2025-hotlist` (and `-1`, a copy) | The Hotlist > 2025 Hotlist |
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
- The 2025 Hotlist page embeds the Canva deck rather than list.nonfictionhotlist.com.
- Submissions and reviewer login are separate apps (nfh-submission-prod.vercel.app, nfh-custom-build.vercel.app), embedded in the pages.
