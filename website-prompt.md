# Build the ScanMyCard website

You are building the public website for **ScanMyCard**, an Android app (iOS later) that turns paper business cards into organized digital contacts using AI. The site lives at **https://scanmycard.in** (the app already links there).

The site has two jobs:
1. **Sell the app**: explain the problem, show how it works, show pricing, and send people to the Google Play Store.
2. **Meet Google Play's requirements**: a public Privacy Policy, Terms, and an **Account Deletion** page. Play Console needs working URLs for these before the app can go live, so they are not optional.

---

## 1. Product facts (use these exactly; don't invent features)

**What it does**
- Snap photos of business cards (one or many at once) with the phone camera, or pick them from the gallery.
- AI (Google Gemini) reads each card and extracts: **Name, Company, Designation, Phone, Email, Website, Country, Address**.
- The user reviews the extracted details, edits them before saving, and saves the ones they want.
- Saved contacts are kept in the user's account, **organized into folders**, with search, multi-select, bulk move and bulk delete.
- **Export to Excel (.xlsx)**: all contacts or a single folder, shared to WhatsApp, email, Drive, etc.
- Sign in with **Google** or email/password. Data syncs to the account, so it survives a phone change.
- Push notifications for scan results, low credits and payments.
- Scans many cards in one go (sent in batches), typically a few seconds per batch.

**Do NOT claim** (not true today): CSV export, editing contacts after saving, a web dashboard, iOS availability, CRM integrations, offline scanning, QR code reading, team accounts.

**Pricing: pay-as-you-go credit packs, 1 credit = 1 card. No subscription. Credits don't expire.**
New users get **5 free scans**.

| Pack | Price (INR, + 18% GST) | Cards |
|---|---|---|
| Starter | ₹99 | 50 |
| Popular | ₹499 | 750 |
| Pro | ₹999 | 1,000 |
| Business Starter | ₹2,499 | 2,775 |
| Business Pro | ₹3,999 | 5,710 |
| Business Enterprise | ₹5,999 | 10,000 |

Payments are handled by Razorpay (UPI, cards, netbanking, wallets).
> Note for the owner: the Popular pack's numbers may change before launch. Keep pricing in one data file so it's a one-line edit.

**Company and contact**
- Brand: ScanMyCard, by WeCanServe
- Support email: wecanserve23@gmail.com
- WhatsApp support: +91 90290 05313 (link: https://wa.me/919029005313)
- Android package: `com.wecanserve.scanmycard`
- Play Store link: `https://play.google.com/store/apps/details?id=com.wecanserve.scanmycard` (put it in one constant; the listing goes live after launch)

---

## 2. Who it's for and the problem (drive the copy from this)

**Audience:** Indian professionals and small businesses who collect lots of cards: sales and BD teams, exporters and importers at trade fairs (IHGF, India International Trade Fair and similar), real-estate agents, pharma reps, event organizers, founders and freelancers.

**Problem:** after an expo or a week of meetings you have a pile of 50–300 cards. Typing them into Excel or a CRM takes hours, so it gets skipped, cards get lost, and leads go cold.

**Promise:** "From a stack of cards to a clean Excel sheet in minutes." Scan the whole pile, let AI do the typing, export, follow up the same day.

Use concrete, believable numbers (for example, "typing 100 cards by hand ≈ 3 hours; with ScanMyCard ≈ 10 minutes"). Label them as estimates; don't present them as studied facts.

---

## 3. Pages

1. **Home** (`/`)
   - **Hero:** headline, sub-headline, Google Play badge button, and a phone mockup showing a card turning into a contact row.
   - **Problem:** the messy pile of cards versus the clean sheet. Make it a visual before/after, ideally interactive (a slider or animation).
   - **How it works**, in 3 steps: Snap → AI extracts → Export.
   - **Features grid:** multi-card scanning, AI extraction of 8 fields, folders, Excel export, Google sign-in plus cloud sync, pay-per-card pricing.
   - **Use cases:** trade fairs, sales teams, real estate, events. Give each a short story.
   - **Pricing:** Personal vs Business toggle, cards per pack, per-card cost worked out, and "5 free scans to start".
   - **FAQ** (section 5).
   - **Final call to action:** Play Store button.
2. **Pricing** (`/pricing`): the full table, GST note, "credits never expire", payment methods.
3. **Privacy Policy** (`/privacy`). Required by Google Play; see section 4.
4. **Terms of Service** (`/terms`)
5. **Delete your account** (`/delete-account`). Required by Google Play; see section 4.
6. **Support / Contact** (`/support`): email, WhatsApp, and a simple contact form that opens a `mailto:` with the fields filled in, so no backend is needed.
7. A **404** page.

Footer on every page: links to Privacy, Terms, Delete account and Support; "© ScanMyCard by WeCanServe"; contact email.

---

## 4. Google Play compliance pages (must be accurate)

### `/delete-account`
Google requires a web page where users can request account and data deletion without reinstalling the app. Include:
- **In-app steps:** "Open ScanMyCard → tap **Profile** in the bottom bar → tap your profile card at the top → **Delete Account** → confirm. This permanently deletes your account, saved contacts, folders, notifications, profile photo and purchase records."
- **Without the app:** a short form (name, account email, reason) that opens a pre-filled email to wecanserve23@gmail.com with subject "Account deletion request". State: "We'll delete your account and data within 30 days and confirm by email."
- What gets deleted: the account, contacts, folders, events, notifications and profile photo.
- What may be kept: payment records that the payment processor (Razorpay) and Indian tax law require us to keep, held only as long as legally required.

### `/privacy`
Write a clear, plain-English privacy policy, more complete than the current in-app one. Cover:
- **Data collected:** name, email, profile photo (optional), business-card images, the contact details extracted from them, purchase history, and the device push-notification token.
- **How images are processed:** they're sent to our server and to Google's Gemini AI (Google Cloud / Vertex AI) only to extract the text. They are not stored on our servers after processing and not used for advertising.
- **Where data is stored:** Google Firebase (authentication and database), Cloudflare R2 (profile photos).
- **Service providers:** Google Firebase, Google Cloud / Vertex AI, Razorpay (payments; we never see full card or UPI details), Expo (push notifications), Cloudflare.
- **Security:** encrypted connections (HTTPS), with each user's data accessible only to that user.
- **Data retention, the user's rights, and deletion** (link to `/delete-account`).
- **Children:** the service isn't directed at anyone under 13 (or 18 for purchases).
- **Contact:** wecanserve23@gmail.com. Add a "Last updated" date.
- Add an HTML comment at the top: `<!-- Have this reviewed before launch; not legal advice. -->`

### `/terms`
Adapt these sections: Acceptance of Terms, Use of the App, User Responsibilities (only scan cards you're allowed to store), AI/OCR Accuracy (results may contain mistakes; review before use), Credits & Payments (prepaid, non-refundable except where required by law or when a scan fails, in which case credits are automatically returned), Intellectual Property, Limitation of Liability, Governing Law (India), Changes to Terms, Contact.

---

## 5. FAQ content (accurate answers)
- **How many cards can I scan at once?** As many as you like. Select them in the queue and the app processes them in batches.
- **How accurate is it?** Very accurate on clear, well-lit cards. You can review and fix every field before saving.
- **What if a scan fails?** You don't lose credits. Failed scans are refunded automatically.
- **Do credits expire?** No.
- **Can I export to Excel?** Yes. Export everything, or one folder, as .xlsx and share it anywhere.
- **Is my data private?** Yes. Only you can access your contacts. We don't sell data or use your cards for ads.
- **Is there an iPhone app?** Android first; iOS is coming.
- **How do I delete my account?** In the app (Profile tab → tap your profile card → Delete Account) or at /delete-account.

---

## 6. Design direction: modern, distinctive, not a generic template
- **Brand colors:** primary green `#09A84E`, near-black text `#17261D`, soft background `#F5F8F6`, plus one warm accent for highlights (amber `#EFA300` is already used in the app). Support light and dark modes.
- **Feel:** clean and confident, with a "messy to organized" theme. Scattered, slightly rotated card shapes in the hero that snap into a neat table as you scroll is the signature moment.
- **Interactive "try it" demo:** a sample business card. On click, show an animated "AI reading" scan line, then the 8 fields fill in one by one. It's fake, scripted data on the client side, with no backend.
- **Before/after slider:** a photo of a card pile versus an Excel sheet.
- **Typography:** a modern geometric or grotesque sans for headings (Inter, Plus Jakarta Sans or similar), generous spacing, big bold headlines.
- **Motion:** subtle scroll reveals, and respect `prefers-reduced-motion`.
- **Mobile first.** Most visitors arrive from a phone, so the Play Store button must always be easy to reach (a sticky bottom bar on mobile).
- **Accessibility:** WCAG AA contrast, real alt text, keyboard-navigable components.
- **Assets:** the app icon and logo are in the app repo at `mobile/assets/images/icon.png` and `mobile/assets/images/logo.png`. Use the official "Get it on Google Play" badge.

---

## 7. Technical requirements
- **Stack:** Next.js (App Router) + TypeScript + Tailwind CSS, statically exported (`output: 'export'`) so it can be hosted for free (Vercel, Netlify, Cloudflare Pages or Firebase Hosting). No server, database or login.
- **Content in data files:** pricing, FAQs, features, contact details and the Play link go in `src/content/*.ts`, so non-developers can edit them.
- **SEO:** a unique title and description per page, Open Graph and Twitter images, `sitemap.xml`, `robots.txt`, JSON-LD (`SoftwareApplication` with offers, plus `FAQPage`), and a canonical URL of `https://scanmycard.in`.
- **Performance:** Lighthouse score of 95+ on mobile; optimized images (WebP/AVIF); no heavy animation libraries unless they're tree-shaken (Framer Motion is fine).
- **Analytics:** a single place to drop in Google Analytics or Plausible later; leave a commented placeholder.
- **Pages must be served at clean URLs:** `/privacy`, `/terms`, `/delete-account`, `/support`. These exact URLs go into Play Console.
- Include a **README** covering how to run, build and deploy, and how to point `scanmycard.in` at the host.

## 8. Definition of done
- [ ] All pages above exist, are responsive, and work in light and dark mode.
- [ ] Every Play Store button uses the single Play-link constant.
- [ ] `/privacy`, `/terms` and `/delete-account` are reachable from the footer on every page and carry no marketing distractions.
- [ ] The interactive demo and before/after work on mobile.
- [ ] No claims beyond section 1.
- [ ] `npm run build` produces a static site with no errors; Lighthouse mobile scores are 95+.
