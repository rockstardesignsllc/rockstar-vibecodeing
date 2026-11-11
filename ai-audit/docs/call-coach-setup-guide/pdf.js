const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + process.argv[2]); 
  await p.pdf({ path: process.argv[3], format: 'Letter', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: '<div style="width:100%;font:8pt Helvetica,Arial,sans-serif;color:#5f6672;padding:0 0.75in;display:flex;justify-content:space-between"><span>RockstarAI Call Coach Setup Guide v1.1 | Internal use only</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>' });
  await b.close();
})();
