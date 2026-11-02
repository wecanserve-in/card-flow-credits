"""Fill each page's FAQ structured data from the FAQ shown on the page.

Pages mark the spot with <script type="application/ld+json" data-faq-schema></script>
and show questions as <details><summary>Q</summary><div class="faq__a">A</div></details>.
Run after editing any FAQ:  python scripts/site_faq_schema.py
"""
import glob, html, json, os, re

ROOT = os.path.join(os.path.dirname(__file__), "..", "website")
SLOT = re.compile(r'<script type="application/ld\+json" data-faq-schema>.*?</script>', re.S)
ITEM = re.compile(r'<details><summary>(.*?)</summary><div class="faq__a">(.*?)</div></details>', re.S)


def text(fragment):
    fragment = re.sub(r"<[^>]+>", "", fragment)
    return re.sub(r"\s+", " ", html.unescape(fragment)).strip()


for path in glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True):
    page = open(path, encoding="utf-8").read()
    if not SLOT.search(page):
        continue
    items = ITEM.findall(page)
    schema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": text(q), "acceptedAnswer": {"@type": "Answer", "text": text(a)}}
            for q, a in items
        ],
    }
    block = ('<script type="application/ld+json" data-faq-schema>\n'
             + json.dumps(schema, ensure_ascii=False, indent=1) + "\n</script>")
    page = SLOT.sub(lambda _: block, page, count=1)
    open(path, "w", encoding="utf-8", newline="\n").write(page)
    print(f"{os.path.relpath(path, ROOT)}: {len(items)} questions")
