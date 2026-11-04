const {chromium}=require('playwright');const fs=require('fs');
const SA=''+(process.env.SA_DIR||"/tmp/sa/site-assets/deal-desk")+'/';
const loader=(client,mode)=> mode==='saved'?`<!doctype html><html><head><meta name=viewport content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="rsq" data-client="${client}"></div><script src="https://assets.rockstarinfo.com/deal-desk/saved-quotes.js"></script></body></html>`:
`<!doctype html><html><head><meta name=viewport content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="rsec" data-client="${client}" data-mode="${mode}"></div><script src="https://assets.rockstarinfo.com/deal-desk/deal-desk.js"></script></body></html>`;
exports.sent=[];
exports.open=async(opts={})=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:opts.viewport||{width:1280,height:900},deviceScaleFactor:opts.dpr||1,...(opts.ctx||{})});
await ctx.grantPermissions(['clipboard-read','clipboard-write'],{origin:'https://dealer.test'});
await ctx.route('**/*',async r=>{const u=new URL(r.request().url());
 if(u.host==='assets.rockstarinfo.com'){const f=SA+u.pathname.replace('/deal-desk/','');if(fs.existsSync(f))return r.fulfill({path:f,headers:{'access-control-allow-origin':'*'}});return r.fulfill({status:404,body:''});}
 if(u.host==='dealer.test'){const c=opts.client;const m=u.pathname.startsWith('/quote')?'offer':u.pathname.startsWith('/saved')?'saved':'builder';return r.fulfill({contentType:'text/html',body:loader(c,m)});}
 exports.sent.push(r.request().method()+' '+u.host+u.pathname+' '+(r.request().postData()||'').slice(0,300));
 if(u.host.includes('workers.dev')&&opts.fakeStore) return opts.fakeStore(r,u);
 return r.abort();});
return {b,ctx};};
