"""Build the search landing pages (website/<slug>/index.html) from the support page's
header and footer, so they always match the rest of the site.
Run: python scripts/site_guides.py   then   python scripts/site_faq_schema.py
"""
import json, os, re

ROOT = os.path.join(os.path.dirname(__file__), "..", "website")
PLAY = "https://play.google.com/store/apps/details?id=com.wecanserve.scanmycard"
TICK = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" '
        'stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>')
PLAY_LOGO = ('<svg class="play-badge__logo" viewBox="0 0 24 26" aria-hidden="true"><path fill="#00D7FE" d="M1.2 1.1C.9 1.4.8 1.9.8 2.5v21c0 .6.1 1.1.4 1.4L12.9 13z"/>'
             '<path fill="#FFCE00" d="M16.8 16.9 12.9 13l3.9-3.9 4.7 2.7c1.3.8 1.3 2 0 2.8z"/><path fill="#FF3A44" d="M16.8 16.9 12.9 13 1.2 24.9c.4.5 1.2.5 2 .1z"/>'
             '<path fill="#00F076" d="M16.8 9.1 3.2 1C2.4.6 1.6.6 1.2 1.1L12.9 13z"/></svg>')
BADGE = (f'<a class="play-badge" href="{PLAY}" data-play aria-label="Get it on Google Play">{PLAY_LOGO}'
         '<span class="play-badge__text"><small>Get it on</small><strong>Google Play</strong></span></a>')

STEPS_ART = [
    '<div class="step__art art-snap" aria-hidden="true"><div class="bcard bcard--cream" style="--accent:#EFA300"><b>Priya Sharma</b><i>Export Manager</i><span class="bcard__co">Sharma Handicrafts</span></div><div class="bcard" style="--accent:#0044AC"><b>Rahul Mehta</b><i>Consultant</i><span class="bcard__co">Mehta Realty</span></div><span class="viewfinder"></span><span class="shutter"></span></div>',
    '<div class="step__art art-ai" aria-hidden="true"><div class="row"><span>Name</span><b class="ok"></b></div><div class="row"><span>Company</span><b class="ok"></b></div><div class="row"><span>Phone</span><b style="--w:80%"></b></div><div class="row"><span>Email</span><b style="--w:45%"></b></div><div class="row"><span>Website</span><b style="--w:15%"></b></div></div>',
    '<div class="step__art art-export" aria-hidden="true"><div class="file"><span class="xl">X</span>Trade fair leads.xlsx</div><div class="targets"><span>WhatsApp</span><span>Email</span><span>Drive</span></div></div>',
]

PAGES = [
    {
        "slug": "visiting-card-scanner",
        "title": "Visiting Card Scanner App for Android | ScanMyCard",
        "desc": "ScanMyCard is a visiting card scanner app for Android. AI reads every card, saves it to your phone contacts and exports to Excel. 10 free scans.",
        "crumb": "Visiting card scanner",
        "eyebrow": "Visiting card scanner",
        "h1": "A visiting card scanner that does the typing for you.",
        "lead": "Point your phone at a visiting card, or a whole stack of them. ScanMyCard's AI reads the name, number, email and more, you check it, and the contact is saved to your phone, WhatsApp and Excel.",
        "steps_title": "Scan a visiting card in three steps",
        "steps": [
            ("Snap the cards", "Open the scanner, keep all four corners of the card inside the frame and tap the button. Switch between horizontal and vertical cards with one tap, or pick photos from your gallery."),
            ("AI reads every field", "Google Gemini AI reads name, company, designation, phone, email, website, country and address in a few seconds. Fix anything before you save."),
            ("Save, call, export", "Save the contact to your phone, open a WhatsApp chat, or export all your cards to an Excel sheet and share it."),
        ],
        "toc": [("what", "What a visiting card scanner does"), ("why", "Why people use ScanMyCard"), ("who", "Who it's for"), ("tips", "Tips for a perfect scan"), ("price", "What it costs"), ("privacy", "Your data")],
        "body": """
<h2 id="what">What a visiting card scanner does</h2>
<p>A visiting card scanner turns a paper card into a digital contact. Instead of typing each name and number into your phone, you take a photo and the app reads the text for you. Good scanners also understand <em>what</em> each line is: which one is the person's name, which is the company, which number is a mobile and which is an office line.</p>
<p>ScanMyCard uses Google Gemini AI for this, so it copes with busy designs, logos, two-column layouts, vertical cards and cards with details on both lines. You always see the result before it's saved, and you can correct any field.</p>

<h2 id="why">Why people use ScanMyCard</h2>
<ul>
  <li><strong>8 fields from every card:</strong> name, company, designation, phone, email, website, country and address.</li>
  <li><strong>Whole stacks, not one card at a time:</strong> scan card after card, or pick many photos from your gallery at once. The app processes them in batches.</li>
  <li><strong>Save to phone contacts:</strong> one tap adds the card to your phone's contacts. If it has two numbers, choose one or save both.</li>
  <li><strong>WhatsApp, call and email:</strong> start the follow-up straight from the contact page.</li>
  <li><strong>Folders, notes and tags:</strong> keep each exhibition, city or client in its own folder, and note where you met.</li>
  <li><strong>Duplicate check:</strong> scan a card you already have and the app offers to skip it or update the old contact.</li>
  <li><strong>Excel export:</strong> every contact, or one folder, as an .xlsx file. See <a href="/business-card-to-excel">business cards to Excel</a>.</li>
</ul>

<h2 id="who">Who it's for</h2>
<p>Anyone who comes home with a pocket full of cards: sales and business development teams, exporters and importers at trade fairs like IHGF, real-estate agents after site visits, pharma and medical reps, event organisers, founders, freelancers and small business owners. If you collect more than a handful of visiting cards a month, typing them is the slowest part of your follow-up.</p>

<h2 id="tips">Tips for a perfect scan</h2>
<ul>
  <li>Use good light and avoid strong reflections on glossy cards.</li>
  <li>Keep all four corners of the card inside the frame.</li>
  <li>Choose <strong>Horizontal</strong> or <strong>Vertical</strong> to match the card.</li>
  <li>Hold your phone steady for a moment while the photo is taken.</li>
  <li>For cards someone sent you as photos, use <strong>Gallery</strong> instead of the camera.</li>
</ul>
<p>If a card can't be read at all, you're not charged: the credit goes back to your account automatically.</p>

<h2 id="price">What it costs</h2>
<p>You get <strong>10 free scans</strong> when you verify your email. After that you buy prepaid packs: 1 credit scans 1 card, and credits never expire.</p>
<div class="table-wrap"><table>
  <thead><tr><th>Pack</th><th>Cards</th><th>Price</th></tr></thead>
  <tbody>
    <tr><td>Starter</td><td>50</td><td>₹99 + GST</td></tr>
    <tr><td>Popular</td><td>330</td><td>₹499 + GST</td></tr>
    <tr><td>Business Enterprise</td><td>10,000</td><td>₹5,999 + GST (₹0.60 per card)</td></tr>
  </tbody>
</table></div>
<p>All packs are on the <a href="/pricing">pricing page</a>. Pay with UPI, cards, net banking or wallets through Razorpay.</p>

<h2 id="privacy">Your data</h2>
<p>Your contacts belong to you. Only you can see them, they're saved to your account so they survive a phone change, and we never sell them or use them for ads. You can delete your account and all your data at any time. Read the <a href="/privacy">privacy policy</a>.</p>
""",
        "faq": [
            ("Is ScanMyCard free?", "<p>You get 10 free scans when you sign up and verify your email. After that, prepaid packs start at ₹99 + GST for 50 cards, and credits never expire.</p>"),
            ("Can it read vertical visiting cards?", "<p>Yes. Choose <strong>Vertical</strong> on the scanner for portrait cards and <strong>Horizontal</strong> for landscape ones.</p>"),
            ("Does it work with cards in my phone's gallery?", "<p>Yes. Tap <strong>Gallery</strong> on the scanner and pick many photos at once.</p>"),
            ("Can I save the scanned card to my phone contacts?", "<p>Yes. Open the contact and tap <strong>Save to phone contacts</strong>. If there are two numbers, choose one or save both.</p>"),
            ("Is there an iPhone version?", "<p>ScanMyCard is on Android today. An iPhone version is planned.</p>"),
        ],
    },
    {
        "slug": "business-card-to-excel",
        "title": "Business Card to Excel: Scan Cards to a Sheet | ScanMyCard",
        "desc": "Turn a stack of business cards into an Excel sheet in minutes. AI reads each card, you review, then export .xlsx and share on WhatsApp. 10 free scans.",
        "crumb": "Business card to Excel",
        "eyebrow": "Business cards to Excel",
        "h1": "From a stack of business cards to an Excel sheet.",
        "lead": "Typing 100 visiting cards into Excel takes hours. With ScanMyCard you snap them, the AI fills in every column, and you share the .xlsx file on WhatsApp, email or Drive.",
        "steps_title": "Business cards to Excel in three steps",
        "steps": [
            ("Scan the stack", "Photograph cards one after another, or pick photos from your gallery. Put them in a folder for the event or client."),
            ("Review the details", "AI fills in name, company, designation, phone, email, website, address and country. Check each card and fix anything."),
            ("Export to Excel", "Export everything, or one folder, as an .xlsx file and share it on WhatsApp, email, Google Drive or any app."),
        ],
        "toc": [("manual", "The manual way vs ScanMyCard"), ("columns", "What's in the Excel file"), ("folders", "One sheet per event or client"), ("share", "Sharing and importing"), ("tips", "Tips for a clean sheet")],
        "body": """
<h2 id="manual">The manual way vs ScanMyCard</h2>
<p>Typing a card into a spreadsheet means copying around 8 fields: name, company, designation, phone, email, website, address and country. At about 2 minutes a card, 100 cards is more than 3 hours of typing, and mistakes in phone numbers and emails are easy to make.</p>
<p>With ScanMyCard the AI does the typing. You photograph the cards, glance over each result and fix the odd smudged digit. The same 100 cards take roughly 10 minutes. (Our estimate, not a study: your time depends on the cards and your connection.)</p>

<h2 id="columns">What's in the Excel file</h2>
<p>The export is a real .xlsx file, ready for Excel, Google Sheets or WPS Office. Every contact is one row, with a header row and filter dropdowns:</p>
<div class="table-wrap"><table>
  <thead><tr><th>Column</th><th>Example</th></tr></thead>
  <tbody>
    <tr><td>Sr. No.</td><td>1</td></tr>
    <tr><td>Name</td><td>Priya Sharma</td></tr>
    <tr><td>Company</td><td>Sharma Handicrafts</td></tr>
    <tr><td>Designation</td><td>Export Manager</td></tr>
    <tr><td>Phone</td><td>+91 98765 43210</td></tr>
    <tr><td>Email</td><td>priya@sharmahandicrafts.in</td></tr>
    <tr><td>Website</td><td>sharmahandicrafts.in</td></tr>
    <tr><td>Address</td><td>14 Civil Lines, Moradabad</td></tr>
    <tr><td>Country</td><td>India</td></tr>
    <tr><td>LinkedIn</td><td>linkedin.com/in/…</td></tr>
    <tr><td>Notes</td><td>Met at IHGF, wants brass samples</td></tr>
    <tr><td>Tags</td><td>buyer, follow-up</td></tr>
  </tbody>
</table></div>

<h2 id="folders">One sheet per event or client</h2>
<p>Create a folder for each trade fair, city or client, for example "IHGF Delhi · Oct" or "Dealers, West zone". Export just that folder and you get a sheet with only those contacts, ready to hand to your sales team.</p>

<h2 id="share">Sharing and importing</h2>
<ul>
  <li>Share the file on <strong>WhatsApp</strong>, <strong>email</strong>, <strong>Google Drive</strong> or any app on your phone.</li>
  <li>Open it in <strong>Google Sheets</strong> to work on it with your team.</li>
  <li>Most CRMs can import an Excel or CSV file, so the sheet is a quick way to move new leads into your CRM.</li>
</ul>

<h2 id="tips">Tips for a clean sheet</h2>
<ul>
  <li>Add notes and tags while the meeting is fresh: they become the Notes and Tags columns.</li>
  <li>When the app says a card is already in My Cards, choose <strong>Skip</strong> or <strong>Update</strong> to avoid duplicate rows.</li>
  <li>Review each card before saving, especially phone numbers with unusual formats.</li>
</ul>
<p>Start with 10 free scans. After that, packs start at ₹99 + GST for 50 cards. See <a href="/pricing">pricing</a>, or read about the <a href="/visiting-card-scanner">visiting card scanner</a>.</p>
""",
        "faq": [
            ("What format is the export?", "<p>A standard .xlsx Excel file with a header row and filter dropdowns. It opens in Excel, Google Sheets and WPS Office.</p>"),
            ("Can I export only some contacts?", "<p>Yes. Export all your contacts, or just one folder.</p>"),
            ("Are my notes and tags exported?", "<p>Yes. They appear in the Notes and Tags columns.</p>"),
            ("Can I get the sheet on WhatsApp?", "<p>Yes. After exporting, share the file to WhatsApp, email, Google Drive or any other app on your phone.</p>"),
            ("How much does it cost?", "<p>You start with 10 free scans. Prepaid packs start at ₹99 + GST for 50 cards, 1 credit = 1 card, and credits never expire.</p>"),
        ],
    },
]


def build(page, skeleton):
    url = f"https://scanmycard.in/{page['slug']}"
    out = skeleton
    out = re.sub(r"<title>.*?</title>", f"<title>{page['title'].replace('&', '&amp;')}</title>", out, count=1)
    for pattern, value in [
        (r'(<meta name="description" content=")[^"]*', page["desc"]),
        (r'(<link rel="canonical" href=")[^"]*', url),
        (r'(<meta property="og:url" content=")[^"]*', url),
        (r'(<meta property="og:title" content=")[^"]*', page["title"]),
        (r'(<meta property="og:description" content=")[^"]*', page["desc"]),
        (r'(<meta name="twitter:title" content=")[^"]*', page["title"]),
        (r'(<meta name="twitter:description" content=")[^"]*', page["desc"]),
    ]:
        out = re.sub(pattern, lambda m: m.group(1) + value.replace("&", "&amp;"), out, count=1)
    out = re.sub(r'<body class="[^"]*">', f'<body class="page-guide page-{page["slug"]}">', out, count=1)

    crumbs = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "ScanMyCard", "item": "https://scanmycard.in/"},
        {"@type": "ListItem", "position": 2, "name": page["crumb"], "item": url}]}
    ld = ('<script type="application/ld+json">\n' + json.dumps(crumbs, ensure_ascii=False, indent=1) + "\n</script>\n"
          '<script type="application/ld+json" data-faq-schema></script>\n</head>')
    out = out.replace("</head>", ld, 1)

    steps = "\n".join(
        f'      <li class="step reveal" style="--rd:{i * .08:.2f}s">\n        <span class="step__num">0{i + 1}</span>\n'
        f'        <h3>{h}</h3>\n        <p>{p}</p>\n        {STEPS_ART[i]}\n      </li>'
        for i, (h, p) in enumerate(page["steps"]))
    toc = "\n".join(f'        <li><a href="#{a}">{t}</a></li>' for a, t in page["toc"])
    faq = "\n".join(f'      <details><summary>{q}</summary><div class="faq__a">{a}</div></details>' for q, a in page["faq"])
    main = f"""<main id="main">
<section class="page-hero">
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span aria-current="page">{page['crumb']}</span></nav>
    <p class="eyebrow">{page['eyebrow']}</p>
    <h1>{page['h1']}</h1>
    <p class="lead">{page['lead']}</p>
    <div class="hero__ctas">
      {BADGE}
      <a class="btn btn--ghost" href="/assets/video/scanmycard-tutorial-v5.mp4" data-tutorial aria-haspopup="dialog">Watch the tutorial</a>
    </div>
    <ul class="ticks"><li>{TICK}10 free scans</li><li>{TICK}Credits never expire</li><li>{TICK}Android</li></ul>
  </div>
</section>

<section class="section section--tint" aria-labelledby="steps-title">
  <div class="wrap">
    <div class="section__head reveal">
      <p class="eyebrow">How it works</p>
      <h2 class="h2" id="steps-title">{page['steps_title']}</h2>
    </div>
    <ol class="steps">
{steps}
    </ol>
  </div>
</section>

<div class="wrap legal guide">
  <nav class="toc" aria-label="On this page">
    <h2>On this page</h2>
    <ol>
{toc}
    </ol>
  </nav>
  <div class="prose">
{page['body'].strip()}
  </div>
</div>

<section class="section section--tint" id="faq" aria-labelledby="faq-title">
  <div class="wrap faq-grid">
    <div class="section__head">
      <p class="eyebrow">FAQ</p>
      <h2 class="h2" id="faq-title">Questions, answered.</h2>
    </div>
    <div class="faq">
{faq}
    </div>
  </div>
</section>

<section class="section" aria-labelledby="cta-title">
  <div class="wrap">
    <div class="cta reveal">
      <div>
        <h2 id="cta-title">Your next stack of cards deserves better than a rubber band.</h2>
        <p>Install ScanMyCard, scan your first 10 cards free, and watch your own pile turn into contacts and a spreadsheet.</p>
        {BADGE}
      </div>
      <div class="cta__art" aria-hidden="true">
        <div class="bcard bcard--cream" style="--accent:#EFA300;--r:-14deg;left:4%;top:12%"><b>Priya Sharma</b><i>Export Manager</i><span class="bcard__co">Sharma Handicrafts</span></div>
        <div class="bcard bcard--dark" style="--accent:#5B8DEF;--r:12deg;right:2%;bottom:10%"><b>Lukas Weber</b><i>Head of Sourcing</i><span class="bcard__co">Haus &amp; Hof GmbH</span></div>
        <img class="cta__icon" src="/assets/images/app-icon-256.png" width="160" height="160" alt="" loading="lazy" decoding="async">
      </div>
    </div>
  </div>
</section>
</main>"""
    out = re.sub(r"<main id=\"main\">.*?</main>", lambda _: main, out, count=1, flags=re.S)
    folder = os.path.join(ROOT, page["slug"])
    os.makedirs(folder, exist_ok=True)
    open(os.path.join(folder, "index.html"), "w", encoding="utf-8", newline="\n").write(out)
    print("built", page["slug"], len(page["title"]), "char title,", len(page["desc"]), "char description")


skeleton = open(os.path.join(ROOT, "support", "index.html"), encoding="utf-8").read()
for p in PAGES:
    build(p, skeleton)
