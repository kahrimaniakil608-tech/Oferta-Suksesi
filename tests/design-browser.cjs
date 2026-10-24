// Responsive design review and interaction regressions. Run after pnpm build.
// DESIGN_PHASE=before records a baseline; DESIGN_SWEEP=1 checks every route.
// AXE_PATH optionally enables axe using a locally installed script.
// Runs built Next.js against fixtures; browser requests outside localhost are intercepted or blocked.
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {createRequire}=require('node:module');
const {chromium,expect}=require('@playwright/test');
const {png,listen}=require('./browser-flows.cjs');
const {response,requests,controls,item,ad}=require('./fixtures/ui-ux.cjs');
const root=path.resolve(__dirname,'..'),webRequire=createRequire(path.join(root,'apps/web/package.json'));
const phase=process.env.DESIGN_PHASE || 'after';
const verify=phase==='after'||phase==='continued'||phase==='continued-final';
const auditDir=path.join(root,'docs/audits/design-2026-10-21',phase);fs.mkdirSync(auditDir,{recursive:true});
const log=fs.openSync(`/tmp/oferta-design-browser-${phase}-${process.pid}.log`,'w');
let server,app,browser,context,origin,uploadFailure=false,uploadMalformed=false;
(async()=>{
 server=http.createServer(async(req,res)=>{
  const u=new URL(req.url,'http://localhost');const chunks=[];for await(const c of req)chunks.push(c);
  const raw=Buffer.concat(chunks).toString();
  const [status,data]=response(u.pathname.replace(/^\/api\/v1/,''),req.method,raw?JSON.parse(raw):{},u.searchParams);
  res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));
 });
 const apiPort=await listen(server),placeholder=http.createServer(),webPort=await listen(placeholder);await new Promise(r=>placeholder.close(r));origin=`http://127.0.0.1:${webPort}`;
 app=spawn(process.execPath,[webRequire.resolve('next/dist/bin/next'),process.env.DESIGN_DEV_DIR?'dev':'start','--hostname','127.0.0.1','--port',String(webPort)],{cwd:process.env.DESIGN_DEV_DIR||path.join(root,'apps/web'),env:{...process.env,API_URL:`http://127.0.0.1:${apiPort}/api/v1`,NODE_ENV:process.env.DESIGN_DEV_DIR?'development':'production'},stdio:['ignore',log,log]});
 for(let n=0;n<80;n++){try{if((await fetch(origin+'/api/ready')).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));if(n===79)throw Error('Web server did not start');}
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
 context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'Europe/Skopje'});
 await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());
  const cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'Content-Type,Authorization','Access-Control-Allow-Methods':'GET,POST,PATCH,PUT,DELETE'};
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
  if(u.pathname.startsWith('/api/v1/')){
   const [status,data]=response(u.pathname.replace('/api/v1',''),req.method(),req.postDataJSON()||{},u.searchParams);
   if(req.method()!=='GET')await new Promise(r=>setTimeout(r,120));
   return route.fulfill({status,json:data,headers:cors});
  }
  if(u.pathname.startsWith('/images/upload/'))return route.fulfill({status:uploadFailure?503:201,json:uploadFailure?{message:'Synthetic upload failure'}:uploadMalformed?{}:{url:'ads/test/uploaded.webp'},headers:cors});
  if(u.pathname==='/_next/image' && ['/logo-white.png','/logo-black.png'].includes(u.searchParams.get('url')))return route.fulfill({status:200,contentType:'image/png',body:fs.readFileSync(path.join(root,'apps/web/public',u.searchParams.get('url')))});
  if(u.pathname.startsWith('/uploads/')||u.pathname.startsWith('/_next/image'))return route.fulfill({status:200,contentType:'image/png',body:png});
  if(u.origin===origin)return route.continue();
  return route.abort();
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.stack || error.message));
 if(process.env.DESIGN_CLOCK_OFFSET)await page.clock.setFixedTime(new Date(Date.now()+Number(process.env.DESIGN_CLOCK_OFFSET)));
 const alerts=page.locator('[role=alert]:not(#__next-route-announcer__)');
 const go=async(p,role='ADMIN')=>{controls.role=role;return await page.goto(origin+p,{waitUntil:'networkidle'});};
 const count=(p,method='GET')=>requests.filter(r=>r.p===p&&r.method===method).length;
 if(verify){
  await go('/',null);
  await page.getByRole('button',{name:'Hap navigimin',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('link',{name:'Kompanitë',exact:true})).toBeVisible();
  await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Hap navigimin',exact:true})).toBeFocused();
  await page.setViewportSize({width:1440,height:900});
  const categoryToggle=page.getByRole('button',{name:'Hap listën e kategorive'});
  await categoryToggle.click();await page.keyboard.press('Escape');await expect(categoryToggle).toBeFocused();await expect(categoryToggle).toHaveAttribute('aria-expanded','false');
  await categoryToggle.click();await page.getByRole('combobox',{name:'Fjalë kyçe'}).focus();await expect(categoryToggle).toHaveAttribute('aria-expanded','false');
  await page.getByRole('combobox',{name:'Kategoria',exact:true}).selectOption('test');
  await page.getByRole('combobox',{name:'Qyteti',exact:true}).selectOption('test-city');
  const keyword=page.getByRole('combobox',{name:'Fjalë kyçe'});
  await keyword.fill('banese');await expect(page.getByRole('option').filter({hasText:item.title})).toBeVisible();
  const scopedSuggestion=requests.filter(r=>r.p==='/listings'&&new URLSearchParams(r.search).get('limit')==='5').at(-1);
  assert.equal(new URLSearchParams(scopedSuggestion.search).get('category'),'test');
  assert.equal(new URLSearchParams(scopedSuggestion.search).get('city'),'test-city');
  const all=page.getByRole('link',{name:'Shiko të gjitha rezultatet →',exact:true});
  await expect(all).toHaveAttribute('href','/kerko?q=banese&category=test&city=test-city');
  await keyword.press('ArrowDown');await keyword.press('Escape');await keyword.press('Enter');
  await expect(page).toHaveURL(/\/kerko\?q=banese&category=test&city=test-city/);
  console.log('PASS: visitor mobile navigation, disclosure Escape/focus, scoped suggestions, Escape then Enter searches');

  await go('/qytete/test-city/test?price_min=100&price_max=200&has_photos=true&isFeatured=true&page=3',null);
  const sidebar=page.locator('aside').filter({has:page.getByRole('heading',{name:'Filtra',exact:true})});
  await sidebar.getByLabel('Çmimi minimal').fill('');await sidebar.getByLabel('Çmimi maksimal').fill('');
  await sidebar.getByRole('switch',{name:'Me foto',exact:true}).click();await sidebar.getByRole('switch',{name:'Vetëm të zgjedhurat',exact:true}).click();
  const within=sidebar.getByRole('combobox',{name:'Kërko brenda filtrave'});
  await within.fill('banese');await expect(sidebar.getByRole('option').filter({hasText:item.title})).toBeVisible();
  const filteredSuggestion=new URLSearchParams(requests.filter(r=>r.p==='/listings'&&new URLSearchParams(r.search).get('limit')==='5').at(-1).search);
  assert.equal(filteredSuggestion.get('category'),'test');assert.equal(filteredSuggestion.get('city'),'test-city');
  for(const key of ['price_min','price_max','has_photos','isFeatured','page'])assert.equal(filteredSuggestion.has(key),false,key+' was cleared');
  await within.press('ArrowDown');await within.press('Escape');await expect(within).toHaveAttribute('aria-expanded','false');await within.press('Enter');
  await expect(page).toHaveURL(/\/kerko\?/);const scopedUrl=new URL(page.url());
  assert.equal(scopedUrl.searchParams.get('category'),'test');assert.equal(scopedUrl.searchParams.get('city'),'test-city');
  for(const key of ['price_min','price_max','has_photos','isFeatured','page'])assert.equal(scopedUrl.searchParams.has(key),false);
  controls.override=p=>p==='/cities'?[200,{broken:true}]:null;
  await go('/shpallje',null);await expect(sidebar.getByRole('alert')).toContainText('Qytetet nuk u ngarkuan');
  controls.override=null;await sidebar.getByRole('button',{name:'Provo përsëri'}).click();await expect(sidebar.getByRole('combobox',{name:'Qyteti',exact:true})).toBeEnabled();
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Hap filtrat'}).click();
  const filterDialog=page.getByRole('dialog',{name:'Filtra',exact:true});
  const mobileSearch=filterDialog.getByRole('combobox',{name:'Kërko brenda filtrave'});
  await mobileSearch.fill('banese');await expect(filterDialog.getByRole('listbox')).toBeVisible();
  if(process.env.AXE_PATH){await page.addScriptTag({path:process.env.AXE_PATH});const violations=await page.evaluate(async()=> (await window.axe.run(document)).violations);assert.deepEqual(violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],'Open mobile filters and suggestions are accessible');}
  await page.screenshot({path:path.join(auditDir,'390-mobile-filter-suggestions.png'),fullPage:true});
  await mobileSearch.press('Escape');await expect(filterDialog).toBeVisible();await expect(mobileSearch).toHaveAttribute('aria-expanded','false');
  await mobileSearch.press('Escape');await expect(filterDialog).toHaveCount(0);await expect(page.getByRole('button',{name:'Hap filtrat'})).toBeFocused();
  console.log('PASS: sidebar search retains route scope, clears removed filters, recovers cities, and supports keyboard dismissal within mobile filters');

  await go('/shpalljet/synthetic-listing',null);
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(new Error('Denied'))}}));
  await page.getByRole('button',{name:'Kopjo linkun',exact:true}).click();await expect(page.getByLabel('Linku i shpalljes')).toHaveValue(page.url());
  await page.getByLabel('Linku i shpalljes').focus();
  assert.ok(await page.getByLabel('Linku i shpalljes').evaluate(input=>input.selectionEnd===input.value.length));
  controls.override=p=>p.endsWith('/status')&&p.includes('/favourites/')?[503,{}]:null;
  await go('/shpalljet/synthetic-listing','USER');await expect(page.getByRole('alert').filter({hasText:'Preferencat nuk u ngarkuan.'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Prefero',exact:true})).toBeDisabled();controls.override=null;
  await page.getByRole('alert').filter({hasText:'Preferencat nuk u ngarkuan.'}).getByRole('button',{name:'Provo përsëri'}).click();
  const favourite=page.getByRole('button',{name:'Prefero',exact:true});await expect(favourite).toBeEnabled();
  const favBefore=requests.filter(r=>r.p.includes('/favourites/')&&r.method==='POST').length;
  await favourite.evaluate(button=>{button.click();button.click();});await expect(page.getByRole('button',{name:'E preferuar',exact:true})).toHaveAttribute('aria-pressed','true');
  assert.equal(requests.filter(r=>r.p.includes('/favourites/')&&r.method==='POST').length,favBefore+1);
  console.log('PASS: clipboard denial recovery, favourite load retry and duplicate-click protection');

  await page.setViewportSize({width:1440,height:900});await go('/admin');
  await expect(page.locator('a[href="/admin/shpalljet/listing-0"]')).toBeVisible();await expect(page.locator('a[href="/admin/perdoruesit/user-one"]')).toBeVisible();
  await expect(page.getByRole('link').filter({hasText:'Shpallje Aktive'})).toHaveAttribute('href','/admin/shpalljet?status=PUBLISHED');
  await page.getByRole('button',{name:'Ngushto menynë',exact:true}).click();
  await expect(page.getByRole('navigation',{name:'Administrimi'}).getByRole('link',{name:'Shpalljet',exact:true})).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'Hap menynë',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Shpalljet');await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Hap kërkimin në administrim'}).click();await page.getByLabel('Titull, autor ose telefon').fill('banese');await page.getByRole('dialog').getByRole('button',{name:'Kërko',exact:true}).click();await expect(page).toHaveURL(/search=banese/);
  await go('/admin/shpalljet');
  await page.getByRole('combobox',{name:'Kategoria',exact:true}).selectOption('test');await expect(page).toHaveURL(/categoryId=test/);
  await page.getByRole('combobox',{name:'Periudha',exact:true}).selectOption('custom');
  await page.getByLabel('Data e fillimit',{exact:true}).fill('2026-10-21');await page.getByLabel('Data e përfundimit',{exact:true}).fill('2026-10-01');
  await page.getByRole('button',{name:'Filtro',exact:true}).click();await expect(alerts).toContainText('Data e fillimit');
  await go('/admin/shpalljet?datePreset=custom&dateFrom=invalid');await expect(alerts).toContainText('Periudha është e pavlefshme');
  await go('/admin/shpalljet');await expect(page.getByRole('button',{name:/Refuzuar/})).toBeVisible();await expect(page.getByRole('button',{name:/Arkivuara/})).toBeVisible();
  await page.locator('tbody input[type=checkbox]').first().check();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Bulk toolbar fits mobile');
  console.log('PASS: admin record links, scoped stats, collapsed/mobile navigation, search, live catalogue and date validation');

  await go('/admin/operacionet');await expect(page.locator('article')).toHaveCount(1);
  controls.failPath='/admin/operations/support';await page.getByRole('button',{name:'Mesazhet e kontaktit'}).click();await expect(alerts).toBeVisible();await expect(page.locator('article')).toHaveCount(0);
  controls.failPath='';await page.getByRole('button',{name:'Provo përsëri'}).click();await expect(page.locator('article')).toHaveCount(1);
  console.log('PASS: operations failures hide stale cases and retry restores the queue');

  controls.override=p=>p==='/admin/categories'?[200,[{id:919,name:'Kategori e personalizuar',slug:'custom',icon:'🌿',children:[]}]]:null;
  await go('/admin/reklamat/new');await expect(page.getByRole('checkbox',{name:'🌿 Kategori e personalizuar'})).toBeVisible();
  const picker=page.getByRole('button',{name:'Zgjidh imazhin e reklamës'});
  await expect(picker).toBeEnabled();await picker.focus();await expect(picker).toBeFocused();
  // Send Enter to the resolved control, rather than whichever element happens
  // to own global keyboard focus between two asynchronous browser commands.
  let chooser;
  try {
    [chooser]=await Promise.all([page.waitForEvent('filechooser'),picker.press('Enter')]);
  } catch(error) {
    console.error('Campaign picker failure',await page.evaluate(()=>({url:location.pathname,activeTag:document.activeElement?.tagName,activeLabel:document.activeElement?.getAttribute('aria-label'),alerts:[...document.querySelectorAll('[role="alert"]')].map(node=>node.textContent)})));
    await page.screenshot({path:path.join(auditDir,'campaign-picker-failure.png'),fullPage:true});
    throw error;
  }
  await chooser.setFiles({name:'banner.png',mimeType:'image/png',buffer:png});
  await expect(page.getByRole('button',{name:'Hiq imazhin e reklamës'})).toBeVisible();
  page.once('dialog',dialog=>dialog.accept());await go('/admin/reklamat/ad-test');
  await expect(page.getByRole('checkbox',{name:'🌿 Kategori e personalizuar'})).toBeVisible();
  await page.locator('input[type=file]').setInputFiles({name:'replacement.png',mimeType:'image/png',buffer:png});
  uploadFailure=true;const beforeSave=count('/admin/ads/ad-test','PATCH');
  await page.getByRole('button',{name:'Ruaj Ndryshimet',exact:true}).click();await expect(alerts).toContainText('Imazhi nuk u ngarkua');
  await expect(page.getByRole('button',{name:'Ruaj Ndryshimet',exact:true})).toBeEnabled();
  assert.equal(count('/admin/ads/ad-test','PATCH'),beforeSave,'Failed image upload must not save the campaign');
  uploadFailure=false;
  uploadMalformed=true;
  await page.getByRole('button',{name:'Ruaj Ndryshimet',exact:true}).click();await expect(alerts).toContainText('Imazhi nuk u ngarkua');
  await expect(page.getByRole('button',{name:'Ruaj Ndryshimet',exact:true})).toBeEnabled();
  assert.equal(count('/admin/ads/ad-test','PATCH'),beforeSave,'Malformed upload must not save');uploadMalformed=false;
  await page.getByRole('button',{name:'Ruaj Ndryshimet',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Ndryshimet u ruajtën'})).toBeVisible();
  assert.equal(count('/admin/ads/ad-test','PATCH'),beforeSave+1);
  assert.equal(requests.filter(r=>r.p==='/admin/ads/ad-test'&&r.method==='PATCH').at(-1).body.imageUrl,'ads/test/uploaded.webp');
  const savedCampaign=requests.filter(r=>r.p==='/admin/ads/ad-test'&&r.method==='PATCH').at(-1).body;
  assert.equal(savedCampaign.startsAt,ad.startsAt,'Editing the banner preserves the start instant');assert.equal(savedCampaign.endsAt,ad.endsAt,'Editing the banner preserves the end instant');
  await expect(page.getByRole('img',{name:ad.title,exact:true})).toHaveAttribute('src',/\/uploads\/ads\/test\/uploaded.webp$/);
  await expect(page.getByText('Keni ndryshime të paruajtura.',{exact:true})).toHaveCount(0);
  await page.getByLabel('Titulli',{exact:true}).fill('');await page.getByRole('button',{name:'Ruaj Ndryshimet',exact:true}).click();await expect(alerts).toContainText('Plotësoni këtë fushë');assert.equal(count('/admin/ads/ad-test','PATCH'),beforeSave+1);
  await page.getByLabel('Titulli',{exact:true}).fill(ad.title);
  await page.getByLabel('URL Destinacionit',{exact:true}).fill('bad-url');await page.getByRole('button',{name:'Ruaj Ndryshimet',exact:true}).click();await expect(alerts).toContainText('formatin');assert.equal(count('/admin/ads/ad-test','PATCH'),beforeSave+1);
  await page.getByLabel('URL Destinacionit',{exact:true}).fill(ad.targetUrl);
  await page.getByLabel('Fillon',{exact:true}).fill('2030-06-15T10:00');await page.getByLabel('Mbaron',{exact:true}).fill('2030-06-15T09:00');
  await page.getByRole('button',{name:'Ruaj Ndryshimet',exact:true}).click();await expect(alerts).toContainText('pas datës');assert.equal(count('/admin/ads/ad-test','PATCH'),beforeSave+1);
  await page.getByLabel('Mbaron',{exact:true}).fill('2030-06-15T11:00');await page.getByRole('button',{name:'Ruaj Ndryshimet',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Ndryshimet u ruajtën'})).toBeVisible();
  assert.equal(requests.filter(r=>r.p==='/admin/ads/ad-test'&&r.method==='PATCH').at(-1).body.startsAt,'2030-06-15T08:00:00.000Z');
  await expect(page.getByLabel('ose vendos URL direkt')).toHaveCount(0);
  controls.override=null;
  console.log('PASS: campaign targeting, keyboard upload, failure/malformed recovery, preview paths, required fields, preserved schedules and same-day scheduling');

  controls.override=(p,m)=>p==='/admin/ads'&&m==='POST'?[201,{id:'ad-test'}]:null;
  await go('/admin/reklamat/new');
  await page.getByLabel('Titulli',{exact:false}).fill('Kampanjë e re');await page.getByLabel('Emri i Reklamuesit',{exact:false}).fill('Kompani testuese');
  await page.getByRole('combobox',{name:/^Zona/}).selectOption('zone');await page.getByLabel('URL e Destinacionit',{exact:false}).fill('https://example.invalid');
  await page.getByLabel('Fillon',{exact:false}).fill('2030-06-15T10:00');await page.getByLabel('Mbaron',{exact:false}).fill('2030-06-15T11:00');
  await page.locator('input[type=file]').setInputFiles({name:'banner.png',mimeType:'image/png',buffer:png});
  const beforeCreate=count('/admin/ads','POST');uploadMalformed=true;
  await page.getByRole('button',{name:/Krijo/}).click();await expect(alerts).toContainText('Imazhi nuk u ngarkua');assert.equal(count('/admin/ads','POST'),beforeCreate);
  await expect(page.getByRole('button',{name:/Krijo/})).toBeEnabled();
  uploadMalformed=false;await page.getByRole('button',{name:/Krijo/}).click();await expect(page).toHaveURL(/\/admin\/reklamat\/ad-test$/);assert.equal(count('/admin/ads','POST'),beforeCreate+1);
  controls.override=null;
  for(const path of ['/kategorite/test?page=broken','/qytete/test-city?page=-2','/qytete/test-city/test?page=1.5']){
    const from=requests.length;await go(path,null);
    const query=requests.slice(from).find(r=>r.p==='/listings'&&new URLSearchParams(r.search).get('limit')==='20');
    assert.equal(new URLSearchParams(query.search).get('page'),'1','Invalid collection page normalizes');
  }
  console.log('PASS: new campaign malformed-upload recovery and invalid collection pagination');
 }

 const routes = [
  "/",
  "/kategorite",
  "/kategorite/test",
  "/qytete/test-city",
  "/qytete/test-city/test",
  "/shpallje",
  "/kerko?q=banese",
  "/shpalljet/synthetic-listing",
  "/kompanite",
  "/kompanite/synthetic",
  "/perdoruesit/owner",
  "/blog",
  "/blog/synthetic-post",
  "/kontakti",
  "/rreth-nesh",
  "/redaksia",
  "/pyetjet-e-shpeshta",
  "/kushtet-e-perdorimit",
  "/politikat-e-privatesise",
  "/posto-shpallje",
  "/auth/hyr",
  "/auth/regjistrohu",
  "/auth/fjalekalim-i-harruar",
  "/auth/rivendos-fjalekalimin?token=synthetic-token",
  "/does-not-exist",
  "/audit-info",
  "/paneli",
  "/paneli/shpalljet",
  "/paneli/te-preferuarat",
  "/paneli/analitika",
  "/paneli/pagesat",
  "/paneli/cilesimet",
  "/admin",
  "/admin/shpalljet",
  "/admin/shpalljet/new",
  "/admin/shpalljet/listing-test",
  "/admin/shpallje",
  "/admin/moderimi",
  "/admin/operacionet",
  "/admin/kompanite",
  "/admin/perdoruesit",
  "/admin/perdoruesit/owner",
  "/admin/badges",
  "/admin/reklamat",
  "/admin/reklamat/new",
  "/admin/reklamat/ad-test",
  "/admin/reklamat/zonat",
  "/admin/blog",
  "/admin/blog/e-re",
  "/admin/blog/post-test",
  "/admin/blog/kategorite",
  "/admin/kategorite",
  "/admin/qytetet",
  "/admin/eksportet",
  "/admin/cilesimet",
  "/shpallje?page=15"
];
 const selected = ['/', '/shpallje?page=15', '/kerko?q=banese', '/shpalljet/synthetic-listing', '/qytete/test-city/test', '/admin', '/admin/shpalljet', '/admin/cilesimet', '/admin/reklamat/new', '/admin/reklamat/ad-test', '/paneli'];
 const snapshotOverride=(p,m,b,search)=>{
  if(p==='/categories')return [200,['Patundshmëri','Rreth punës','Automjete','Shtëpia juaj','Shërbime','Të ndryshme','Interesi juaj','Celular','PC, TV etj.','Bujqësi','Bashkëpunim','Kafshë'].map((name,i)=>({id:i+1,slug:i===0?'test':`category-${i}`,name,icon:['🏠','💼','🚗','🛋️','🔧','📦','🎯','📱','💻','🌾','🤝','🐾'][i],children:[],attributeSchema:{}}))];
  if(p==='/pages/audit-info')return [200,{id:'audit-info',slug:'audit-info',title:'Informacion',content:'<h2>Rreth shërbimit</h2><p>Përmbajtje sintetike për kontrollin e faqes.</p>',isPublished:true,updatedAt:new Date().toISOString()}];
  if(p==='/listings')return [200,{data:Array.from({length:12},(_,i)=>({...item,id:'review-'+i,slug:'review-'+i,isFeatured:i%3===0,isUrgent:i%3===0,viewsCount:1234567})),meta:{total:620,page:Number(search.get('page')||1),totalPages:31}}];
  return null;
 };
 if(verify){
  controls.override=snapshotOverride;await page.setViewportSize({width:1440,height:900});
  await page.clock.setFixedTime(new Date(Date.now()+3600000));await go('/',null);
  await page.clock.setFixedTime(new Date());
  const arrow=page.getByRole('button',{name:'Lëviz djathtas',exact:true});await arrow.focus();await expect(arrow).toHaveCSS('opacity','1');
  await go('/qytete/test-city',null);await expect(page.getByRole('navigation',{name:'Vendndodhja në faqe'}).getByRole('link',{name:'Shpalljet',exact:true})).toHaveAttribute('href','/shpallje');
  await page.getByRole('button',{name:'Pamje listë',exact:true}).click();await expect(page).toHaveURL(/view=list/);await expect(page.getByRole('button',{name:'Pamje listë',exact:true})).toHaveAttribute('aria-pressed','true');
  console.log('PASS: carousel keyboard visibility, city breadcrumb destination and selected collection view');
 }
 const observations=[];
 const reviewRoutes=process.env.DESIGN_ROUTES?JSON.parse(process.env.DESIGN_ROUTES):process.env.DESIGN_SWEEP==='1'?routes:selected;
 for(const width of process.env.DESIGN_WIDTHS?JSON.parse(process.env.DESIGN_WIDTHS):[1440,768,390,320]){
  await page.setViewportSize({width,height:900});
  for(const route of reviewRoutes){
   controls.override=snapshotOverride;
   const role=route.startsWith('/admin')?'ADMIN':route.startsWith('/paneli')?'USER':null;
   const start=errors.length; const response=await go(route,role);
   const metrics=await page.evaluate(()=>({title:document.title,headings:[...document.querySelectorAll('h1')].map(e=>e.textContent),width:innerWidth,documentWidth:document.documentElement.scrollWidth,mainLandmarks:document.querySelectorAll('main').length}));
   let axe=[];
   if(process.env.AXE_PATH && width===390){await page.addScriptTag({path:process.env.AXE_PATH});axe=(await page.evaluate(async()=>window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa','best-practice']}}))).violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));}
   observations.push({path:route,http:response.status(),...metrics,errors:errors.slice(start),axeRan:!!process.env.AXE_PATH&&width===390,axe});
   if(selected.includes(route)&&[390,1440].includes(width))await page.screenshot({path:path.join(auditDir,`${width}-${route.replace(/[^a-z0-9]+/gi,'-')||'home'}.png`),fullPage:true});
   fs.writeFileSync(path.join(auditDir,'routes.json'),JSON.stringify(observations,null,2));
  }
  console.log('REVIEW viewport',width,'complete');
 }
 controls.override=null;
 console.log('REVIEW observations',observations.length,'overflow',observations.filter(r=>r.documentWidth>r.width).length,'runtime errors',errors.length,'axe',observations.reduce((n,r)=>n+r.axe.length,0));
 if(verify){
  assert.deepEqual(observations.filter(r=>r.documentWidth>r.width),[],'No document overflow');
  assert.deepEqual(observations.filter(r=>r.http!==(r.path==='/does-not-exist'?404:200)),[],'Expected HTTP statuses');
  assert.deepEqual(observations.filter(r=>r.mainLandmarks!==1||r.headings.length!==1),[],'One main landmark and one primary heading per page');
  assert.deepEqual(observations.filter(r=>r.axe.length),[],'No axe violations');
  assert.deepEqual(errors,[],'No browser runtime errors');
 }
 console.log('DESIGN_BROWSER_OK');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(app)app.kill('SIGTERM');if(server)await new Promise(r=>server.close(r));fs.closeSync(log);});
