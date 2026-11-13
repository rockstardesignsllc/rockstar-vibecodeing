# churchcaptions.com: title, description, keywords and schema

For the home page in GHL:

1. **Page > Settings > SEO Meta Data**: paste the Title, Description and Keywords, and upload `social-01-home.png` from the `churchcaptions/social-images/` folder as the **Social Image** (1200 x 630).
2. **Page > Settings > Tracking Code > Header Tracking Code**: paste the schema block. Copy the whole block, script tags included.

This site stands alone: the schema names Church Captions as the organization and has no links to any other Rockstar site. No prices, review stars or testimonials appear in it.

## 01. Home: https://churchcaptions.com/

**File:** `01-home.html`  
**Social image:** `social-01-home.png`  
**Schema includes:** Organization, WebSite, WebPage, WebApplication (features), FAQ (7)

**Title**
```
Church Captions | Free Live Sermon Captions and Translation
```

**Description**
```
Live sermon captions and real time translation in 13 languages. People scan a QR code and follow along on their phone. Free for Christian churches in need.
```

**Keywords**
```
church captions, live captions for church, sermon transcription, church translation, real time sermon translation, church hearing impaired, church accessibility, ProPresenter captions, QR code sermon captions, churchcaptions
```

**Schema**
```html
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization","@id":"https://churchcaptions.com/#organization","name":"Church Captions","legalName":"Rockstar Designs LLC","url":"https://churchcaptions.com/","address":{"@type":"PostalAddress","streetAddress":"2222 W Grand River Ave, STE A","addressLocality":"Okemos","addressRegion":"MI","postalCode":"48864","addressCountry":"US"}},{"@type":"WebSite","@id":"https://churchcaptions.com/#website","url":"https://churchcaptions.com/","name":"Church Captions","description":"Live captions and real time translation for Christian churches.","publisher":{"@id":"https://churchcaptions.com/#organization"}},{"@type":"WebPage","@id":"https://churchcaptions.com/#webpage","url":"https://churchcaptions.com/","name":"Church Captions | Free Live Sermon Captions and Translation","description":"Live sermon captions and real time translation in 13 languages. People scan a QR code and follow along on their phone. Free for Christian churches in need.","isPartOf":{"@id":"https://churchcaptions.com/#website"},"publisher":{"@id":"https://churchcaptions.com/#organization"},"inLanguage":"en-US","mainEntity":{"@id":"https://churchcaptions.com/#app"}},{"@type":"WebApplication","@id":"https://churchcaptions.com/#app","name":"Church Captions","url":"https://churchcaptions.com/","applicationCategory":"AccessibilityApplication","operatingSystem":"Any (web browser)","description":"Live captions and real time translation for Christian churches. People scan a QR code to read the sermon live on their phone or choose from 13 languages, with optional audio through headphones. Can also run as a live transcription overlay in ProPresenter. Translation is provided by Google Translate and is not always 100% accurate.","featureList":["Live sermon captions on phones and tablets by QR code","Real time translation into 13 languages","Listen in your language with headphones","ProPresenter live transcription overlay","Self serve setup, ready to use right away"],"isAccessibleForFree":true,"publisher":{"@id":"https://churchcaptions.com/#organization"},"audience":{"@type":"Audience","audienceType":"Christian churches, pastors and ministry teams"}},{"@type":"FAQPage","@id":"https://churchcaptions.com/#faq","url":"https://churchcaptions.com/","mainEntity":[{"@type":"Question","name":"Is it really free?","acceptedAnswer":{"@type":"Answer","text":"Yes. Church Captions is 100% free for churches in need. We do ask that you pay it forward with a donation, because that's what covers the cost of keeping it running and improving it."}},{"@type":"Question","name":"Who can use Church Captions?","acceptedAnswer":{"@type":"Answer","text":"Christian churches only. It was built to help Christian churches reach everyone in the room with the message."}},{"@type":"Question","name":"How fast can we get started?","acceptedAnswer":{"@type":"Answer","text":"Right away. It's 100% self serve, so once you sign up you can set it up instantly and start using it."}},{"@type":"Question","name":"Do people need to download an app?","acceptedAnswer":{"@type":"Answer","text":"No. They scan your church's QR code with their phone or tablet and the live captions open right up."}},{"@type":"Question","name":"How many languages does it translate?","acceptedAnswer":{"@type":"Answer","text":"13 languages. People pick their language from the same QR code and see the message translated in real time. They can also put in headphones and tap the audio icon to listen in their language."}},{"@type":"Question","name":"How accurate is the translation?","acceptedAnswer":{"@type":"Answer","text":"Translation is provided by Google Translate. It's very helpful, but it isn't always 100% accurate, so some words or phrases may come through a little differently than your pastor said them."}},{"@type":"Question","name":"Can we show captions on our screens?","acceptedAnswer":{"@type":"Answer","text":"Yes. You can use Church Captions as an overlay in ProPresenter for live transcription on the big screen while your pastor preaches."}}]}]}</script>
```
