# Rockstar AI Audit: page setup and SEO

Two pages in HighLevel, on the Rockstar Info site. Both stay out of Google; the title, description and image are what
people see when the link is texted or shared on social media.

| | Page 1: the audit | Page 2: audit complete |
|---|---|---|
| HighLevel page name | `AI Audit` | `AI Audit Complete` |
| Address | `https://aiaudit.rockstarinfo.com` | `https://aiaudit.rockstarinfo.com/audit-complete` |
| HighLevel path | `/` (the home page of the `aiaudit` subdomain) | `/audit-complete` |
| Paste into a Custom HTML/JS element | `pages/audit.html` | `pages/audit-complete.html` |
| Social sharing image | `social/social-share-audit.png` | `social/social-share-audit-complete.png` |

## Page 1: the audit

**Title**
```
Your Free AI Audit | Rockstar AI
```

**Description**
```
Chat with Rex for 8 minutes and find out where calls and leads slip through the cracks, what it's costing you, and exactly how to fix it. 100% free.
```

**Keywords**
```
free AI audit, AI audit, AI for small business, AI receptionist, AI lead response, missed calls, AI for car dealers, AI for powersports, RockstarAI, Rockstar AI
```

**Social sharing image:** `social/social-share-audit.png` (1200 × 630)

## Page 2: audit complete

**Title**
```
Your AI Audit Is Complete | Rockstar AI
```

**Description**
```
Your personalized AI plan from Rockstar is on the way. Book your 20 minute Strategy Call to walk through your results and next steps.
```

**Keywords**
```
AI audit results, AI strategy call, RockstarAI, Rockstar AI
```

**Social sharing image:** `social/social-share-audit-complete.png` (1200 × 630)

## HighLevel steps (both pages)

1. Sites, then the Rockstar Info website or funnel, then add the page.
2. Settings for the page, SEO meta data: paste the title, description and keywords above, and upload the social
   sharing image.
3. Turn on **Hide from search engines** (noindex). Keep both pages out of the site menu.
4. Add a **Custom JS/HTML** element and paste in the page's file from `pages/`. Set the section and row to full width
   with no padding, so the chat and the thank-you page have room.
5. Point the `aiaudit` subdomain at the site: Settings, Domains, add `aiaudit.rockstarinfo.com`, then add the DNS
   record HighLevel shows you, and set page 1 as the subdomain's home page.

Page 2 is where conversion tracking belongs (Meta pixel, Google Ads conversion): only people who finished an audit
land there. Add the tracking code in the page's tracking code settings, not in the Custom HTML element. The page already sends a Meta `Lead` event and a Google `ai_audit_complete` event once per finished audit, so
use those as the conversion events.

## Changing the share images

The images are rendered from `social/social-share-audit.html` and `social/social-share-audit-complete.html` at
1200 × 630. Edit the HTML, take a 1200 × 630 screenshot of each page, and save it over the matching PNG.

## BDC Demo page (bdcdemo.aifordealers.com)

One page in HighLevel, on the AiForDealers site, at the home page of the `bdcdemo` subdomain. Keep it out of Google
(noindex), like the audit pages: it is a page you send to dealers, not one they search for.

| | BDC Demo |
|---|---|
| HighLevel page name | `AI BDC Demo` |
| Address | `https://bdcdemo.aifordealers.com` |
| HighLevel path | `/` |
| Paste into a Custom HTML/JS element | `pages/bdc-demo.html` |
| Social sharing image | `social/social-share-bdc-demo.png` (1200 × 630) |

**Title**
```
Live AI BDC Demo: Text With Rex | RockstarAI for Dealers
```

**Description**
```
Take Rex for a 3 minute test drive. He plays your dealership's AI agent, you play the customer, and you watch him answer questions and book the appointment.
```

**Keywords**
```
AI BDC, AI BDC demo, dealership AI, AI for car dealers, automotive AI chat, AI appointment setting, car dealer lead response, RockstarAI, Rockstar AI, aifordealers
```

**Schema** (paste into the page's Tracking Code, Header section, in HighLevel)
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://bdcdemo.aifordealers.com/#webpage",
      "url": "https://bdcdemo.aifordealers.com/",
      "name": "Live AI BDC Demo: Text With Rex | RockstarAI for Dealers",
      "description": "Take Rex for a 3 minute test drive. He plays your dealership's AI agent, you play the customer, and you watch him answer questions and book the appointment.",
      "inLanguage": "en-US",
      "isPartOf": { "@type": "WebSite", "name": "AiForDealers", "url": "https://aifordealers.com/" },
      "primaryImageOfPage": { "@type": "ImageObject", "url": "https://bdcdemo.aifordealers.com/social-share-bdc-demo.png", "width": 1200, "height": 630 },
      "about": { "@id": "https://bdcdemo.aifordealers.com/#software" },
      "publisher": { "@id": "https://bdcdemo.aifordealers.com/#org" }
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://bdcdemo.aifordealers.com/#software",
      "name": "RockstarAI BDC",
      "alternateName": "Rex, the AI BDC agent",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "description": "An AI BDC agent for car dealerships that answers website chats, texts and lead emails in about 12 seconds, 24/7, and works every shopper toward a booked appointment.",
      "url": "https://aifordealers.com/rockstarai-bdc",
      "audience": { "@type": "BusinessAudience", "audienceType": "Automotive dealerships" },
      "provider": { "@id": "https://bdcdemo.aifordealers.com/#org" }
    },
    {
      "@type": "Organization",
      "@id": "https://bdcdemo.aifordealers.com/#org",
      "name": "Rockstar Designs",
      "url": "https://rockstarinfo.com/",
      "brand": { "@type": "Brand", "name": "RockstarAI for Dealers", "url": "https://aifordealers.com/" }
    }
  ]
}
</script>
```
Replace the image URL with wherever HighLevel stores the share image once you upload it (right-click the image in the media library, Copy link).
