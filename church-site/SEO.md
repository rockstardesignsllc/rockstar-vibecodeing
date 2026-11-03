# SEO + social share settings

Paste these into each page's **GoHighLevel page settings → SEO / Meta** (SEO Title,
Meta Description) and upload the matching image from `church-site/og/` as the
**Share / OG image**.

Location messaging is centered on **Smithville, TN** (the area people search for and
that we market to), even though the physical address is in Dowelltown. The real
address still appears on-page (footer, contact, map link); these SEO fields are the
search/social-facing copy.

Site name for SEO: **Local Church Gathering** (matches the domain and is searchable);
the visual brand stays "Church."

---

## Home — `/`
- **SEO Title:** Local Church Gathering | A Church in Smithville, TN
- **Meta Description:** A relaxed, family-style church in Smithville, TN. Come as you are, Sundays at 10 AM. A place to breathe, belong, and grow — plan your first visit.
- **Share image:** `og/og-home.png`

## Beliefs — `/what-we-believe`
- **SEO Title:** What We Believe | Local Church Gathering, Smithville TN
- **Meta Description:** What our Smithville, TN church believes about God, Jesus, the Bible, and following Him in everyday life. Simple, Bible-rooted, Jesus-centered faith.
- **Share image:** `og/og-what-we-believe.png`

## Messages — `/past-sermons`
- **SEO Title:** Messages | Local Church Gathering, Smithville TN
- **Meta Description:** Watch and catch up on recent messages from our church in Smithville, TN. New teaching every week — follow along and keep growing all week long.
- **Share image:** `og/og-past-sermons.png`

## Social Media — `/social`
- **SEO Title:** Social Media | Local Church Gathering, Smithville TN
- **Meta Description:** Follow our Smithville, TN church on Facebook, Instagram, YouTube, and TikTok for messages, encouragement, and updates throughout the week.
- **Share image:** `og/og-social.png`

## Contact — `/contact-us`
- **SEO Title:** Contact & Plan a Visit | Church in Smithville, TN
- **Meta Description:** Questions or planning your first visit to our Smithville, TN church? Reach out — Sundays at 10 AM. No pressure, real community. We'd love to meet you.
- **Share image:** `og/og-contact-us.png`

## Generosity — `/generosity`
- **SEO Title:** Give | Generosity at Local Church Gathering, Smithville TN
- **Meta Description:** Give online or in person to our church in Smithville, TN. Generosity is worship — pray first, give with joy. Safe, simple online giving.
- **Share image:** `og/og-generosity.png`

## Resources — `/resources`
- **SEO Title:** Books & Resources | Local Church Gathering, Smithville TN
- **Meta Description:** Practical, Biblical books and resources from Mat & Dara Koenig to help you grow in faith, marriage, and everyday life — from our Smithville, TN church.
- **Share image:** `og/og-resources.png`

## Meet with Pastor Mat — `/pastor-mat` (booking page)
- **SEO Title:** Meet with Pastor Mat | Church in Smithville, TN
- **Meta Description:** Book a time to talk with Pastor Mat. Questions about faith, or just need someone to talk to? A low-pressure conversation in Smithville, TN.
- **Share image:** `og/og-pastor-mat.png`

## Family Meal — `/meal`
- **SEO Title:** Community Family Meal | Church in Smithville, TN
- **Meta Description:** Join our monthly community meal in Smithville, TN — the last Sunday of every month, right after the 10 AM gathering. Always free. RSVP today.
- **Share image:** `og/og-meal.png`

## Privacy Policy — `/privacy-policy`
- **SEO Title:** Privacy Policy | Local Church Gathering, Smithville TN
- **Meta Description:** How Local Church Gathering in Smithville, TN collects, uses, and protects your information, including your text messaging preferences.
- **Share image:** `og/og-privacy-policy.png`

## Terms of Service — `/terms-of-service`
- **SEO Title:** Terms of Service | Local Church Gathering, Smithville TN
- **Meta Description:** The terms for using the Local Church Gathering website and communications, for our church family in and around Smithville, TN.
- **Share image:** `og/og-terms-of-service.png`

---

## Structured data (Schema.org / JSON-LD)

Every built page in `dist/` already includes a `<script type="application/ld+json">`
block — you don't paste this separately; it travels with the page HTML. It describes:

- **Church** — name (Local Church Gathering), the real postal address (273 Dry Creek Rd,
  Dowelltown, TN — accurate so Google Maps / the knowledge panel match your location),
  geo coordinates, phone, email, Sunday 10:00 service time, social profiles (`sameAs`),
  and Mat & Dara as founders.
- **areaServed: Smithville, Tennessee** — the area we market to, so search ties the
  church to Smithville even though the street address is in Dowelltown.
- **WebSite**, **WebPage**, and a **BreadcrumbList** on every page.
- **Resources** also lists the five books (ItemList of Book).

It's generated from `site.config.json` + `pages.json`, so updating the address, phone,
service time, or socials there updates the schema on every page on the next build.
After publishing, check a page in Google's **Rich Results Test** to confirm it parses.
