"""Turns capture.json (from extract.py) into the website repo's content: one Markdown file per page and
news post, site.json (navigation, footer), forms, media (downloaded) and redirects from old addresses.
Run with: python3 -I tools/to-content.py CAPTURE_JSON REPO_DIR
"""
import hashlib, json, os, re, sys, urllib.parse, urllib.request

cap = json.load(open(sys.argv[1]))
REPO = sys.argv[2]
C = os.path.join(REPO, "content")
for d in ("pages", "news", "media", "files", "forms"):
    os.makedirs(os.path.join(C, d), exist_ok=True)
ORIGIN = "https://nonfictionhotlist.com"

# Old address -> new path. Pages left out are duplicates; they redirect to the page they copy.
PAGES = {
    "/": ("index", "/"),
    "/news": ("news", "/news/"),
    "/contributors": ("contributors", "/contributors/"),
    "/the-2026-hotlist": ("the-2026-hotlist", "/the-2026-hotlist/"),
    "/submit2026": ("submit2026", "/submit2026/"),
    "/the-2025-hotlist": ("the-2025-hotlist", "/the-2025-hotlist/"),
    "/yahoo": ("yahoo", "/yahoo/"),
    "/yahooxnfh-1": ("yahooxnfh1", "/yahooxnfh1/"),        # the fuller copy (adds the FAQ) of the 1.0 open call
    "/yahooxnfh/submit": ("yahooxnfh-submit", "/yahooxnfh/submit/"),
    "/yahooxnfh/reviewer": ("yahooxnfh-reviewer", "/yahooxnfh/reviewer/"),
    "/terms-of-use": ("terms-of-use", "/terms-of-use/"),
    "/privacy-policy": ("privacy-policy", "/privacy-policy/"),
    "/submission-agreement": ("submission-agreement", "/submission-agreement/"),
}
NEWS = {
    "/news/yahoo-inc": "yahoo-inc", "/news/indiewire": "indiewire", "/news/deadline": "deadline",
    "/news/Blog Post Title One-3zaa9-zlxng-67tfc-xhhbr": "pure-nonfiction",
    "/news/Blog Post Title One-3zaa9-zlxng-67tfc-xhhbr-27jam": "realscreen",
}
# /yahooxnfh is linked from the Deadline post but was a 404 on Squarespace; it now goes to the Yahoo page.
REDIRECTS = {"/yahooxnfh": "/yahoo/", "/home": "/", "/the-2025-hotlist-1": "/the-2025-hotlist/", "/yahooxnfh1": "/yahooxnfh1/", "/yahooxnfh-1": "/yahooxnfh1/"}
for old, slug in NEWS.items():
    if slug not in old: REDIRECTS[old] = f"/news/{slug}/"

path_of = lambda url: urllib.parse.unquote(urllib.parse.urlparse(url).path).rstrip("/") or "/"
new_path = {**{o: p for o, (_, p) in PAGES.items()}, **{o: f"/news/{s}/" for o, s in NEWS.items()}, **REDIRECTS}


def fix_link(href):
    """Canva redirect wrappers to their target; old internal addresses to new paths."""
    if "canva.com/link?" in href:
        t = urllib.parse.parse_qs(urllib.parse.urlparse(href).query).get("target")
        if t: href = t[0]
    if href.startswith("mailto:"): return href.rstrip("?")
    if href.startswith(ORIGIN): href = href[len(ORIGIN):] or "/"
    if href.startswith("/") and not href.startswith("//"):
        p, _, frag = href.partition("#")
        p = urllib.parse.unquote(p).rstrip("/") or "/"
        if p in new_path: href = new_path[p] + ("#" + frag if frag else "")
        elif p.startswith("/s/"): href = "/files/" + fetch_file(ORIGIN + urllib.parse.quote(p))
    return href


def links_in(md):
    return re.sub(r"\]\(([^)\s]+)\)", lambda m: "](" + fix_link(m.group(1)) + ")", md)


media_seen = {}
by_hash = {}
def fetch(url, folder):
    if url in media_seen: return media_seen[url]
    name = urllib.parse.unquote(url.rstrip("/").split("/")[-1])
    name = re.sub(r"[^A-Za-z0-9._-]+", "-", name).strip("-").lower()
    name = re.sub(r"-+", "-", name)
    # Different images can share a file name; later ones get -2, -3 before the extension.
    base, ext = os.path.splitext(name); n = 2
    while name in media_seen.values(): name = f"{base}-{n}{ext}"; n += 1
    req = urllib.request.Request(url if "?" in url or url.endswith(".pdf") else url + "?format=2500w", headers={"User-Agent": "Mozilla/5.0"})
    data = urllib.request.urlopen(req, timeout=60).read()
    digest = hashlib.sha1(data).hexdigest()
    if digest in by_hash: name = by_hash[digest]        # the same image uploaded twice: one file
    else: open(os.path.join(C, folder, name), "wb").write(data); by_hash[digest] = name
    media_seen[url] = name
    return name
fetch_media = lambda url: fetch(url, "media")
fetch_file = lambda url: fetch(url, "files")


def tidy_text(md):
    # Squarespace splits a big heading over several same-level headings for line breaks; join them.
    out = []
    for block in md.split("\n\n"):
        m = re.match(r"^(#{1,6}) (.*)$", block)
        if m and out and re.match(r"^" + m.group(1) + r" ", out[-1]) and not re.match(r"^" + m.group(1) + r"#", out[-1]) and len(m.group(2)) < 40 and len(out[-1]) < 60:
            out[-1] = out[-1] + " " + m.group(2)
        else:
            out.append(block)
    res = []
    for b in out:
        m = re.match(r"^(#{1,6}) (.*)$", b)
        if m: b = m.group(1) + " " + re.sub(r"\s+", " ", m.group(2).replace("****", " ").replace("**", "")).strip()
        b = re.sub(r"\*\*(\w[^*]*?)\*\*and\*\*", r"**\1** and **", b)    # "**a,**and**b**" -> "**a,** and **b**"
        res.append(b)
    return links_in("\n\n".join(res))


def embed_url(u):
    if "embedly.com" in u:
        src = urllib.parse.parse_qs(urllib.parse.urlparse(u if u.startswith("http") else "https:" + u).query).get("url") or \
              urllib.parse.parse_qs(urllib.parse.urlparse(u if u.startswith("http") else "https:" + u).query).get("src")
        if src: return src[0]
    return u


def block_md(b, forms):
    t = b["type"]
    if t == "text": return tidy_text(b["text"])
    if t == "button": return f"[{b['label']}]({fix_link(b['href'])}){{.button}}"
    if t in ("image", "image-classic", "gallery"):
        return "\n\n".join(f"![{im['alt']}](/media/{fetch_media(im['src'])})" for im in b["images"])
    if t == "scrolling":
        items = []
        for line in b.get("text", "").split("\n\n"):
            line = re.sub(r"^#+\s*", "", line).strip()
            if line and line not in ("-", "✳︎", "✳") and line not in items and not any(len(line) > len(i) + 6 and i in line for i in items):
                items.append(line)
        return "::: marquee\n" + "\n".join(f"- {i}" for i in items) + "\n:::"
    if t == "accordion":
        return "::: faq\n" + "\n\n".join(f"### {i['q']}\n\n{tidy_text(i['a'])}" for i in b["items"]) + "\n:::"
    if t == "form":
        key = "contact" if "Contact" in b.get("formName", "") else re.sub(r"\W+", "-", b.get("formName", "form").lower())
        forms[key] = {"name": b.get("formName"), "submit": b.get("submit"), "thanks": b.get("thanks"), "fields": b.get("formFields", [])}
        return f"::: form {key}\n:::"
    if t == "newsletter":
        forms["newsletter"] = {"name": "Newsletter", "note": "On Squarespace this block has no storage set, so sign-ups go nowhere.",
                               "heading": "Sign up for the latest events and news", "fields": [{"type": "email", "title": "Email Address", "required": True}], "submit": "Sign Up", "thanks": "Thank you!"}
        return "::: form newsletter\n:::"
    if t in ("code", "embed", "video"):
        return f"::: embed {embed_url(b['url'])}\n:::" if b.get("url") else ""
    return f"<!-- {t} block: {json.dumps(b)[:200]} -->"


def front(d):
    lines = ["---"]
    for k, v in d.items():
        if v in (None, "", [], False): continue
        lines.append(f"{k}: {json.dumps(v, ensure_ascii=False)}")
    return "\n".join(lines + ["---", ""])


def section_id(md):
    m = re.search(r"^#{1,3} (.+)$", md, re.M)
    return re.sub(r"[^a-z0-9]+", "-", m.group(1).lower()).strip("-")[:40] if m else ""


forms = {}
pages_by_old = {path_of(p["url"]): p for p in cap["pages"]}
title_of = lambda p: re.sub(r"\s*—\s*nonfiction hotlist\.$", "", p["title"]).strip()

for old, (slug, path) in PAGES.items():
    p = pages_by_old[old]
    parts = []
    for sec in p["sections"]:
        if old == "/news" and sec.get("items"): parts.append("::: news-list\n:::"); continue
        body = "\n\n".join(x for x in (block_md(b, forms) for b in sec["blocks"]) if x)
        if not body.strip(): continue
        sid = section_id(body)
        parts.append(f"::: section{(' ' + sid) if sid else ''}\n{body}\n:::")
    title = {"index": "nonfiction hotlist.", "the-2025-hotlist": "The 2025 Hotlist", "yahooxnfh1": "Yahoo x NFH 1.0"}.get(slug, title_of(p))
    meta = {"title": title, "path": path, "description": re.sub(r"\s+", " ", p["description"]).strip()[:300], "source": p["url"]}
    open(os.path.join(C, "pages", slug + ".md"), "w").write(front(meta) + "\n" + "\n\n".join(parts) + "\n")

# News posts: listing data (date, excerpt, image) from the news index, body from each post.
listing = {path_of(ORIGIN + it["href"]): it for sec in pages_by_old["/news"]["sections"] for it in sec.get("items", [])}
for old, slug in NEWS.items():
    p, it = pages_by_old[old], listing.get(old, {})
    blocks = [b for sec in p["sections"] for b in sec["blocks"]]
    body = "\n\n".join(x for x in (block_md(b, forms) for b in blocks) if x)
    mm, dd, yy = (it.get("date") or "1/1/00").split("/")
    meta = {"title": title_of(p), "date": f"20{yy}-{int(mm):02d}-{int(dd):02d}", "path": f"/news/{slug}/",
            "image": f"/media/{fetch_media(it['image']['src'])}" if it.get("image") else "",
            "excerpt": (it.get("excerpt") or "").split("\n")[0][:400], "source": p["url"]}
    open(os.path.join(C, "news", f"{meta['date']}-{slug}.md"), "w").write(front(meta) + "\n" + body + "\n")

# Site-wide: navigation and footer.
def nav_item(i):
    if i.get("children"): return {"label": i["label"], "children": [nav_item(c) for c in i["children"]]}
    return {"label": i["label"], "href": fix_link(i["href"])}
foot = cap["footer"]
site = {
    "name": "nonfiction hotlist.",
    "origin": ORIGIN,
    "email": "info@nonfictionhotlist.com",
    "nav": [nav_item(i) for i in cap["nav"]["items"]],
    "navButton": {"label": cap["nav"]["buttons"][0]["label"], "href": "/#subscribe"} if cap["nav"]["buttons"] else None,
    "footer": {
        "columns": [
            {"heading": "Some Stuff", "note": "Placeholder heading on the Squarespace site.", "links": [{"label": "Terms of Use", "href": "/terms-of-use/"}, {"label": "Privacy Policy", "href": "/privacy-policy/"}]},
            {"heading": "Follow Us", "links": [{"label": l["label"], "href": l["href"]} for b in foot for l in b.get("links", []) if "instagram" in l["href"] or "linkedin" in l["href"]]},
            {"heading": "Contact", "links": [{"label": "info@nonfictionhotlist.com", "href": "mailto:info@nonfictionhotlist.com"}]},
        ],
        "newsletter": True,
    },
}
json.dump(site, open(os.path.join(C, "site.json"), "w"), indent=2, ensure_ascii=False)
for k, f in forms.items(): json.dump(f, open(os.path.join(C, "forms", f"{k}.json"), "w"), indent=2, ensure_ascii=False)
json.dump(dict(sorted(REDIRECTS.items())), open(os.path.join(C, "redirects.json"), "w"), indent=2)
print(f"{len(PAGES)} pages, {len(NEWS)} news posts, {len(forms)} forms, {len(os.listdir(os.path.join(C, 'media')))} images, {len(os.listdir(os.path.join(C, 'files')))} files, {len(REDIRECTS)} redirects")
