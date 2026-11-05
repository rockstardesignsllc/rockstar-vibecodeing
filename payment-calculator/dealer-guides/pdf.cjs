const {chromium}=require('playwright');
(async()=>{const jobs=JSON.parse(process.argv[2]);const b=await chromium.launch();
for(const j of jobs){const p=await b.newPage();await p.goto('file://'+j.html,{waitUntil:'load'});await p.waitForTimeout(300);
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
await p.pdf({path:j.pdf,format:'Letter',printBackground:true,displayHeaderFooter:true,preferCSSPageSize:true,
headerTemplate:`<div style="width:100%;font-family:Inter,Arial;font-size:8px;color:#8a8d94;padding:0 0.7in;display:flex;justify-content:space-between"><span>${esc(j.header)}</span><span style="color:#d70015;font-weight:700">ROCKSTAR</span></div>`,
footerTemplate:`<div style="width:100%;font-family:Inter,Arial;font-size:8px;color:#8a8d94;padding:0 0.7in;display:flex;justify-content:space-between"><span>${esc(j.footer)}</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`});
await p.close();}
await b.close();})();
