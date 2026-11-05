const h=require('./harness.cjs');const fs=require('fs');const {devices}=require('playwright');
const kind=process.argv[2];const client=process.env.GUIDE_CLIENT||{std:'guide-standard',sub:'guide-subprime',ps:'guide-powersports'}[kind];
const OUT=(process.env.OUT_DIR||'/tmp/guide-shots')+'/';fs.mkdirSync(OUT,{recursive:true});
const now=Date.now();
const fakeQuotes={dealer:'your-dealership',quotes:[
 {customer_name:'Jane Doe',customer_phone:'(615) 555-0199',vehicle:kind==='ps'?'2026 Polaris RANGER XP 1000 Premium':'2023 Ford F-150 XLT',stock:kind==='ps'?'P1234':'A1234',deal_monthly_payment:'432.18',deal_type:'purchase',deal_term:'60',event:'quote_requested',salesperson:'Jamie Rivera',saved_at:new Date(now-3600e3).toISOString(),quote_name:'q1',quote_id:'Q1'},
 {customer_name:'Marcus Lee',customer_phone:'(615) 555-0123',vehicle:kind==='ps'?'2025 Kawasaki Ninja 650':'2021 Toyota Camry SE',stock:'B2201',deal_monthly_payment:'289.40',deal_type:'purchase',deal_term:'72',event:'quote_created',salesperson:'Jamie Rivera',saved_at:new Date(now-86400e3*2).toISOString(),quote_name:'q2',quote_id:'Q2'},
 {customer_name:'Rosa Martinez',customer_phone:'(615) 555-0177',vehicle:kind==='ps'?'2026 Yamaha Grizzly EPS':'2022 Honda CR-V EX',stock:'C3307',deal_monthly_payment:'351.02',deal_type:'purchase',deal_term:'48',event:'quote_printed',salesperson:'Chris Park',saved_at:new Date(now-86400e3*6).toISOString(),quote_name:'q3',quote_id:'Q3'}]};
const fakeStore=(r,u)=>{ if(u.pathname.endsWith('/quotes')&&r.request().method()==='GET')return r.fulfill({contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(fakeQuotes)});
 if(r.request().method()==='OPTIONS')return r.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'}});
 if(u.pathname.endsWith('/dealers'))return r.fulfill({status:401,body:'',headers:{'access-control-allow-origin':'*'}});
 return r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{}'});};
(async()=>{
const {b,ctx}=await h.open({client,dpr:2,fakeStore});const p=await ctx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('https://dealer.test/home');await p.waitForTimeout(2500);
const F=async(l,v)=>{const el=p.getByLabel(l,{exact:true}).first();await el.fill(String(v));await el.dispatchEvent('input');await el.dispatchEvent('change');};
const S=async(l,v)=>{await p.getByLabel(l).first().selectOption(v,{timeout:3000}).catch(e=>console.log('noselect',l))};
const sec=async(title)=>p.locator('.ec-sec').filter({has:p.locator('h3',{hasText:new RegExp('^'+title+'$')})}).first();
const shot=async(loc,name)=>{try{await loc.scrollIntoViewIfNeeded();await p.waitForTimeout(300);await loc.screenshot({path:OUT+kind+'-'+name+'.png'});}catch(e){console.log('shotfail',name,e.message.slice(0,100))}};
// empty top view first
await p.screenshot({path:OUT+kind+'-d00-top.png',clip:{x:0,y:0,width:1280,height:330}});
await F('Salesperson name','Jamie Rivera');await F('Salesperson cell (adds a Text button)','6155550142');await F('Salesperson notification email','jamie@yourdealership.com');
await F('First name (required)','Jane');await F('Last name (required)','Doe');await F('Email','jane@example.com');await F('Phone','6155550199');await F('Street address','100 Main St');await F('City','Nashville');await F('State','TN');await F('ZIP code','37201');
if(kind==='ps'){await F('Stock number','P1234');await F('Year','2026');await F('Make','Polaris');await F('Model','RANGER XP 1000');await F('Trim','Premium');await F('Odometer','12');await F('Purchase price','21999');await F('Freight in dollars','895');await F('Setup and prep in dollars','450');}
else {await F('Stock number','A1234');await F('VIN','1FTFW1E50PFA12345');await F('Year','2023');await F('Make','Ford');await F('Model','F-150');await F('Trim','XLT');await F('Odometer','28500');await F('Purchase price','32995');}
await F('Title, registration and dealer fees in dollars','650');await F('Of those fees, the dealer doc fee','499');await S('Vehicle is', kind==='ps'?'n':'u');
await F('Trade allowance (what it is worth)','6000');await F('Trade balance owed (what the customer owes)','2500');
await F('Trade year','2018');await F('Trade make',kind==='ps'?'Honda':'Chevrolet');await F('Trade model',kind==='ps'?'Rancher':'Malibu');
await p.waitForTimeout(1500);
for (const [t,n] of [['Dealership','d01-dealership'],['Salesperson','d02-salesperson'],['Customer','d03-customer'],['Vehicle','d04-vehicle'],['Pricing','d05-pricing'],['Trade','d06-trade'],['Payment layout','d07-layout'],['Interest rate','d08-rate'],['Finance term','d09-term']]) await shot(await sec(t),n);
await shot(p.locator('#ec-taxauto'),'d05b-taxbox');
await shot(p.locator('.ec-side'),'d10-sidebar');
// links
const linkAdj=await p.locator('#ec-prev').getAttribute('href');
// tax by hand
await p.locator('#ec-taxtoggle').click();await p.waitForTimeout(400);await shot(p.locator('#ec-taxauto').locator('..'),'d05c-taxmanual');
await p.locator('#ec-taxtoggle').click();await p.waitForTimeout(600);
if(kind==='ps'){await shot(p.locator('#ec-offers'),'d05d-offers');
 const add=p.locator('[data-offer]').first(); if(await add.count()){await add.click();await p.waitForTimeout(500);await shot(p.locator('#ec-offers .ec-fo.on').first(),'d05e-offerpicked');await shot(await sec('Pricing'),'d05f-pricing-rebate'); await add.click().catch(()=>{});await F('Rebate (leave blank if none)','');}
}
// rate modes
await p.locator('[data-rm="f"]').click();await p.waitForTimeout(300);await shot(await sec('Interest rate'),'d08b-rate-fixed');
await p.locator('[data-rm="h"]').click();await p.waitForTimeout(300);await shot(await sec('Interest rate'),'d08c-rate-hidden');
const linkHidden=await p.locator('#ec-prev').getAttribute('href');
if(kind!=='sub'){await p.locator('[data-rm="t"]').click();}else{await p.locator('[data-rm="f"]').click();}
await p.waitForTimeout(300);
// lease
let linkLease=null;
if(kind==='std'){await p.locator('#ec-ls').check();await p.waitForTimeout(300);await F('Lease down payment','3000');await F('Annual mileage','12000');await F('Term 1 (months)','36');await F('Term 1 monthly payment','489');await F('Term 2 (months)','39');await F('Term 2 monthly payment','472');await p.waitForTimeout(400);await shot(await sec('Lease'),'d11-lease');await shot(p.locator('.ec-side'),'d11b-sidebar-lease');linkLease=await p.locator('#ec-prev').getAttribute('href');await p.locator('#ec-ls').uncheck();}
// grid
await p.locator('[data-pm="g"]').click();await p.waitForTimeout(500);
if(kind!=='sub'){await p.locator('[data-rm="f"]').click();await p.waitForTimeout(200);}
await shot(await sec('Interest rate'),'d12-grid-rate');await shot(await sec('Payment grid'),'d12b-grid-terms');await shot(p.locator('.ec-side'),'d12c-grid-sidebar');
const linkGrid=await p.locator('#ec-prev').getAttribute('href');
// name warn
await F('First name (required)','');await p.locator('#ec-copy').click();await p.waitForTimeout(300);await shot(p.locator('.ec-side'),'d13-namewarn');await F('First name (required)','Jane');
await p.locator('[data-pm="a"]').click();
// copy
await p.locator('#ec-copy').click();await p.waitForTimeout(300);await shot(p.locator('#ec-copy'),'d14-copied');
// forgot code
await p.locator('#ec-codelink').click();await p.waitForTimeout(300);await shot(p.locator('.ec-codehelp'),'d15-forgot');
fs.writeFileSync(OUT+kind+'-links.json',JSON.stringify({linkAdj,linkHidden,linkLease,linkGrid}));
// customer pages on phone
const iphone=devices['iPhone 13'];
const mctx=await b.newContext({...iphone});await mctx.route('**/*',async r=>{const u=new URL(r.request().url());const SA=(process.env.SA_DIR||'/tmp/sa/site-assets/deal-desk')+'/';
 if(u.host==='assets.rockstarinfo.com'){const f=SA+u.pathname.replace('/deal-desk/','');if(fs.existsSync(f))return r.fulfill({path:f});return r.fulfill({status:404,body:''});}
 if(u.host==='dealer.test')return r.fulfill({contentType:'text/html',body:`<!doctype html><html><head><meta name=viewport content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="rsec" data-client="${client}" data-mode="offer"></div><script src="https://assets.rockstarinfo.com/deal-desk/deal-desk.js"></script></body></html>`});
 if(u.protocol==='https:'&&u.host.includes('fonts'))return r.continue();return r.abort();});
const cust=async(link,tag)=>{const m=await mctx.newPage();m.on('pageerror',e=>console.log('MERR',e.message));await m.goto(link);await m.waitForTimeout(2000);
 await m.screenshot({path:OUT+kind+'-c'+tag+'-full.png',fullPage:true});
 for (const [s,n] of [['.ec-bar','bar'],['.ec-hero','hero'],['.ec-paybox','paybox'],['.ec-controls','controls'],['.ec-lease','lease'],['.ec-details','details'],['.ec-breakdown','breakdown'],['.ec-rep','rep'],['.ec-disc','disc']]){const l=m.locator(s).first();if(await l.count()){await l.scrollIntoViewIfNeeded();await l.screenshot({path:OUT+kind+'-c'+tag+'-'+n+'.png'});}}
 fs.writeFileSync(OUT+kind+'-c'+tag+'.txt',await m.evaluate(()=>document.body.innerText));return m;};
const m1=await cust(linkAdj,'1');
// lock in
await m1.locator('#ec-lock').click().catch(e=>console.log('lockfail'));await m1.waitForTimeout(1500);const fb=m1.locator('.ec-fallback');if(await fb.count()){await fb.scrollIntoViewIfNeeded();await fb.screenshot({path:OUT+kind+'-c1-fallback.png'});}
await cust(linkGrid,'2');
if(linkLease) await cust(linkLease,'3');
if(kind!=='sub') await cust(linkHidden,'4');
// saved quotes page
const s=await ctx.newPage();await s.goto('https://dealer.test/saved-quotes');await s.waitForTimeout(1500);
await s.screenshot({path:OUT+kind+'-s1-login.png',fullPage:true});
await s.locator('#sq-code').fill('ABCD-EFGH-JKLM-NPQR');const dl=s.locator('#sq-dealer');if(await dl.count())await dl.fill('Your Dealership');
await s.locator('#sq-go').click();await s.waitForTimeout(1500);await s.screenshot({path:OUT+kind+'-s2-list.png',fullPage:true});
console.log('sent:',h.sent.filter(x=>!x.includes('fonts')).map(x=>x.slice(0,90)).join('\n'));
await b.close();})();
