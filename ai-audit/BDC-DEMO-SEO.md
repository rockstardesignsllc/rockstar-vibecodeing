# Rex BDC Demo: page setup and SEO

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
