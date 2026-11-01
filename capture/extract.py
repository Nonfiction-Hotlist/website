"""Reads the saved Squarespace pages (raw/*.html) and writes their structure and copy as JSON:
navigation, footer, and per page its sections and blocks (text as light markdown, buttons, images, forms, embeds).
Run with: python3 -I tools/extract.py RAW_DIR OUT_FILE
"""
import json, re, sys, html as H
from html.parser import HTMLParser

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
SKIP = {"script", "style", "noscript", "svg", "template"}


class Node:
    __slots__ = ("tag", "attrs", "kids", "parent")
    def __init__(self, tag, attrs, parent):
        self.tag, self.attrs, self.kids, self.parent = tag, dict(attrs), [], parent
    @property
    def cls(self): return (self.attrs.get("class") or "").split()
    def has(self, c): return c in self.cls
    def walk(self):
        yield self
        for k in self.kids:
            if isinstance(k, Node): yield from k.walk()
    def find(self, pred): return next((n for n in self.walk() if pred(n)), None)
    def findall(self, pred): return [n for n in self.walk() if pred(n)]
    def text(self):
        out = []
        for k in self.kids:
            if isinstance(k, str): out.append(k)
            elif k.tag not in SKIP: out.append(k.text() + ("\n" if k.tag in ("br", "p", "div", "li", "h1", "h2", "h3", "h4") else ""))
        return "".join(out)


class Tree(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = self.cur = Node("root", [], None)
        self.skip = 0
        self.json = None   # a form block's settings, kept from its <script type="application/json">
    def handle_starttag(self, tag, attrs):
        if tag == "script" and "sqs-form-block-context" in (dict(attrs).get("class") or "") and not self.skip:
            self.json = Node("formcontext", attrs, self.cur); self.cur.kids.append(self.json); self.skip = 1; return
        if self.skip:
            if tag in SKIP: self.skip += 1
            return
        if tag in SKIP: self.skip = 1; return
        n = Node(tag, attrs, self.cur); self.cur.kids.append(n)
        if tag not in VOID: self.cur = n
    def handle_startendtag(self, tag, attrs):
        if not self.skip and tag not in SKIP: self.cur.kids.append(Node(tag, attrs, self.cur))
    def handle_endtag(self, tag):
        if self.skip:
            if tag in SKIP: self.skip -= 1
            if not self.skip: self.json = None
            return
        n = self.cur
        while n is not None and n.tag != tag: n = n.parent
        if n is not None and n.parent is not None: self.cur = n.parent
    def handle_data(self, d):
        if self.json is not None: self.json.attrs["data"] = self.json.attrs.get("data", "") + d; return
        if not self.skip: self.cur.kids.append(d)


def clean(s): return re.sub(r"[ \t ]+", " ", re.sub(r"\s*\n\s*", "\n", s)).strip()


def inline(n):
    """Text of an element with links and emphasis as markdown."""
    out = []
    for k in n.kids:
        if isinstance(k, str): out.append(k); continue
        if k.tag in SKIP: continue
        t = inline(k)
        if k.tag == "a" and k.attrs.get("href") and t.strip(): out.append(f"[{t.strip()}]({k.attrs['href']})")
        elif k.tag in ("strong", "b") and t.strip(): out.append(f"**{t.strip()}**")
        elif k.tag in ("em", "i") and t.strip(): out.append(f"*{t.strip()}*")
        elif k.tag == "br": out.append("\n")
        else: out.append(t)
    return re.sub(r"[ \t ]+", " ", "".join(out))


def md(n):
    """Block-level markdown for a text block."""
    lines = []
    def go(x):
        for k in x.kids:
            if isinstance(k, str):
                if k.strip(): lines.append(clean(k))
                continue
            if k.tag in SKIP: continue
            if re.fullmatch(r"h[1-6]", k.tag): lines.append("#" * int(k.tag[1]) + " " + clean(inline(k)))
            elif k.tag == "p": t = clean(inline(k)); lines.append(t) if t else None
            elif k.tag in ("ul", "ol"):
                for i, li in enumerate([c for c in k.kids if isinstance(c, Node) and c.tag == "li"]):
                    lines.append(("- " if k.tag == "ul" else f"{i + 1}. ") + clean(inline(li)))
            elif k.tag == "blockquote": lines.append("> " + clean(inline(k)))
            else: go(k)
    go(n)
    return "\n\n".join(l for l in lines if l)


def img_of(n):
    src = n.attrs.get("data-src") or n.attrs.get("data-image") or n.attrs.get("src") or ""
    if src.startswith("data:"): src = ""
    return {"src": src.split("?")[0], "alt": clean(n.attrs.get("alt") or "")} if src else None


def block(b):
    kind = b.attrs.get("data-sqsp-block") or (b.attrs.get("data-definition-name") or "").split(".")[-1] \
        or next((c[:-6] for c in b.cls if c.endswith("-block") and c not in ("sqs-block", "website-component-block")), "unknown")
    out = {"type": kind}
    if kind == "accordion":
        out["items"] = [{"q": clean(i.find(lambda n: n.has("accordion-item__title")).text()),
                         "a": md(i.find(lambda n: n.has("accordion-item__dropdown")))}
                        for i in b.findall(lambda n: n.has("accordion-item"))
                        if i.find(lambda n: n.has("accordion-item__title")) and i.find(lambda n: n.has("accordion-item__dropdown"))]
    elif kind in ("html", "markdown", "text"):
        out["text"] = md(b)
    elif kind == "button":
        a = b.find(lambda n: n.tag == "a")
        if a: out.update(label=clean(a.text()), href=a.attrs.get("href", ""))
    elif kind in ("image", "gallery", "gallery-block"):
        out["images"] = [i for i in (img_of(n) for n in b.findall(lambda n: n.tag == "img")) if i]
        cap = b.find(lambda n: n.has("image-caption") or n.tag == "figcaption")
        if cap and clean(cap.text()): out["caption"] = clean(cap.text())
        t = b.find(lambda n: n.has("image-title") or n.has("image-subtitle"))
        if t and clean(t.text()): out["text"] = clean(t.text())
        a = b.find(lambda n: n.tag == "a" and n.attrs.get("href"))
        if a: out["href"] = a.attrs["href"]
    elif kind in ("form", "newsletter"):
        ctx = b.find(lambda n: n.tag == "formcontext")
        if ctx:
            try:
                j = json.loads(ctx.attrs.get("data", ""))
                out["formName"] = j.get("formName", "")
                out["submit"] = j.get("formSubmitButtonText", "")
                out["thanks"] = clean(re.sub(r"<[^>]+>", " ", (j.get("formSubmissionMessage") or {}).get("html", "")))
                out["formFields"] = [{k: f[k] for k in ("type", "title", "description", "placeholder", "required", "options") if f.get(k) not in (None, "", [])} for f in j.get("formFields", [])]
            except Exception as e: out["formError"] = str(e)
        out["fields"] = []
        for f in b.findall(lambda n: n.has("field") or n.has("form-item")):
            lab = f.find(lambda n: n.tag in ("label", "legend") or n.has("title"))
            if lab and clean(lab.text()) and clean(lab.text()) not in out["fields"]: out["fields"].append(clean(lab.text()))
        cfg = b.attrs.get("data-block-json")
        if cfg:
            try:
                j = json.loads(H.unescape(cfg))
                for k in ("formName", "submitButtonText", "submissionMessage", "title", "description"):
                    if j.get(k): out[k] = j[k] if isinstance(j[k], str) else j[k]
            except Exception: pass
        out["text"] = md(b)
    elif kind in ("video", "embed", "code", "audio"):
        fr = b.find(lambda n: n.tag == "iframe")
        url = (fr.attrs.get("src") or fr.attrs.get("data-src")) if fr else ""
        cfg = b.attrs.get("data-block-json")
        if not url and cfg:
            try: url = json.loads(H.unescape(cfg)).get("url", "")
            except Exception: pass
        if url: out["url"] = url
        t = clean(b.text())
        if t: out["text"] = t[:2000]
    elif kind in ("spacer", "horizontalrule", "line", "shape"):
        return None
    else:
        t = md(b)
        if t: out["text"] = t
        imgs = [i for i in (img_of(n) for n in b.findall(lambda n: n.tag == "img")) if i]
        if imgs: out["images"] = imgs
        links = [{"label": clean(a.text()), "href": a.attrs["href"]} for a in b.findall(lambda n: n.tag == "a" and n.attrs.get("href")) if clean(a.text())]
        if links: out["links"] = links
    return out if len(out) > 1 else None


def blocks_in(root):
    # Outermost .sqs-block elements only.
    res = []
    def go(n):
        for k in n.kids:
            if not isinstance(k, Node): continue
            if k.has("sqs-block"):
                b = block(k)
                if b: res.append(b)
            else: go(k)
    go(root)
    return res


def nav(doc):
    hdr = doc.find(lambda n: n.tag == "header")
    desk = hdr and hdr.find(lambda n: n.has("header-display-desktop")) or hdr
    lst = desk and desk.find(lambda n: n.has("header-nav-list"))
    items = []
    if not lst: return items
    for it in [k for k in lst.kids if isinstance(k, Node) and k.has("header-nav-item")]:
        if it.has("header-nav-item--folder"):
            title = it.find(lambda n: n.has("header-nav-folder-title-text")) or it.find(lambda n: n.has("header-nav-folder-title"))
            kids = [{"label": clean(a.text()), "href": a.attrs.get("href", "")} for a in it.findall(lambda n: n.tag == "a" and n.parent and n.parent.has("header-nav-folder-item"))]
            items.append({"label": clean(title.text()) if title else "", "children": kids})
        else:
            a = it.find(lambda n: n.tag == "a")
            if a: items.append({"label": clean(a.text()), "href": a.attrs.get("href", "")})
    ctas = [{"label": clean(a.text()), "href": a.attrs.get("href", "")} for a in desk.findall(lambda n: n.tag == "a" and n.has("btn"))] if desk else []
    return {"items": items, "buttons": ctas}


def page(doc):
    main = doc.find(lambda n: n.tag == "main") or doc.find(lambda n: n.attrs.get("id") == "page") or doc
    sections = []
    secs = main.findall(lambda n: n.tag == "section" and n.has("page-section"))
    if not secs: secs = [main]
    for s in secs:
        bg = s.find(lambda n: n.has("section-background"))
        bgimg = bg and bg.find(lambda n: n.tag == "img")
        entry = {"blocks": blocks_in(s)}
        # Collection lists (blog index, summary blocks) without .sqs-block wrappers
        items = s.findall(lambda n: n.tag == "article" and (n.has("blog-item") or n.has("summary-item") or any("blog" in c for c in n.cls)))
        if items:
            entry["items"] = []
            for a in items:
                t = a.find(lambda n: re.fullmatch(r"h[1-4]", n.tag))
                link = a.find(lambda n: n.tag == "a" and n.attrs.get("href"))
                ex = a.find(lambda n: n.has("blog-excerpt") or n.has("summary-excerpt"))
                im = a.find(lambda n: n.tag == "img")
                dt = a.find(lambda n: n.tag == "time")
                entry["items"].append({k: v for k, v in {
                    "title": clean(t.text()) if t else "", "href": link.attrs["href"] if link else "",
                    "excerpt": clean(ex.text()) if ex else "", "date": clean(dt.text()) if dt else "",
                    "image": img_of(im) if im else None}.items() if v})
        if bgimg and img_of(bgimg): entry["background"] = img_of(bgimg)
        if entry["blocks"] or entry.get("items"): sections.append(entry)
    return sections


def footer(doc):
    f = doc.find(lambda n: n.tag == "footer")
    return blocks_in(f) if f else []


def meta(doc, name):
    m = doc.find(lambda n: n.tag == "meta" and (n.attrs.get("property") == name or n.attrs.get("name") == name))
    return m.attrs.get("content", "") if m else ""


if __name__ == "__main__":
    raw, out = sys.argv[1], sys.argv[2]
    index = json.load(open(f"{raw}/index.json"))
    site = {"nav": None, "footer": None, "pages": []}
    for p in index:
        t = Tree(); t.feed(open(p["file"].replace("raw/", raw + "/"), encoding="utf-8").read()); doc = t.root
        if site["nav"] is None: site["nav"], site["footer"] = nav(doc), footer(doc)
        title = doc.find(lambda n: n.tag == "title")
        site["pages"].append({
            "url": p["url"], "title": H.unescape(clean(title.text())) if title else "",
            "description": meta(doc, "description") or meta(doc, "og:description"),
            "ogImage": meta(doc, "og:image").split("?")[0], "noindex": "noindex" in meta(doc, "robots"),
            "sections": page(doc)})
    json.dump(site, open(out, "w"), indent=1, ensure_ascii=False)
    for p in site["pages"]:
        n = sum(len(s["blocks"]) for s in p["sections"])
        print(f'{len(p["sections"]):3} sections {n:3} blocks  {p["url"]}')
