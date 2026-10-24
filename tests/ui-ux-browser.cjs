// Acceptance regressions for docs/UI-UX-AUDIT-2026-10-20.md.
// Runs built Next.js against fixtures; browser requests outside localhost are intercepted or blocked.
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {createRequire}=require('node:module');
const {chromium,expect}=require('@playwright/test');
const {png,images,listen}=require('./browser-flows.cjs');
const {response,requests,controls,item,post,ad,paged}=require('./fixtures/ui-ux.cjs');
const root=path.resolve(__dirname,'..'),webRequire=createRequire(path.join(root,'apps/web/package.json'));
const log=fs.openSync('/tmp/oferta-ui-ux-browser.log','w');
let server,app,browser,context,origin;
(async()=>{
 server=http.createServer(async(req,res)=>{
  const u=new URL(req.url,'http://localhost');const chunks=[];for await(const c of req)chunks.push(c);
  const raw=Buffer.concat(chunks).toString();
  const [status,data]=response(u.pathname.replace(/^\/api\/v1/,''),req.method,raw?JSON.parse(raw):{},u.searchParams);
  res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));
 });
 const apiPort=await listen(server),placeholder=http.createServer(),webPort=await listen(placeholder);await new Promise(r=>placeholder.close(r));origin=`http://127.0.0.1:${webPort}`;
 app=spawn(process.execPath,[webRequire.resolve('next/dist/bin/next'),'start','--hostname','127.0.0.1','--port',String(webPort)],{cwd:path.join(root,'apps/web'),env:{...process.env,API_URL:`http://127.0.0.1:${apiPort}/api/v1`,NODE_ENV:'production'},stdio:['ignore',log,log]});
 for(let n=0;n<80;n++){try{if((await fetch(origin+'/api/ready')).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));if(n===79)throw Error('Web server did not start');}
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
 context=await browser.newContext({viewport:{width:390,height:844}});
 await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());
  const cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'Content-Type,Authorization','Access-Control-Allow-Methods':'GET,POST,PATCH,PUT,DELETE'};
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
  if(u.pathname.startsWith('/api/v1/')){
   const [status,data]=response(u.pathname.replace('/api/v1',''),req.method(),req.postDataJSON()||{},u.searchParams);
   if(req.method()!=='GET')await new Promise(r=>setTimeout(r,120));
   return route.fulfill({status,json:data,headers:cors});
  }
  if(u.pathname.startsWith('/images/upload/'))return route.fulfill({status:201,json:images,headers:cors});
  if(u.pathname.startsWith('/uploads/')||u.pathname.startsWith('/_next/image'))return route.fulfill({status:200,contentType:'image/png',body:png});
  if(u.origin===origin)return route.continue();
  return route.abort();
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 const alerts=page.locator('[role=alert]:not(#__next-route-announcer__)');
 const go=async(p,role='ADMIN')=>{controls.role=role;await page.goto(origin+p,{waitUntil:'networkidle'});};
 const count=(p,method='GET')=>requests.filter(r=>r.p===p&&r.method===method).length;
 // Preserve the original artwork when legacy rows omit icons. Saved custom
 // icons take priority, and newly created categories remain in the live catalog.
 const originals=[
  ['patundshmeri','Patundshmëri','🏠'],['rreth-punes','Rreth Punës','💼'],
  ['automjete','Automjete','🚗'],['shtepia-juaj','Shtëpia Juaj','🛋️'],
  ['sherbime','Shërbime','🔧'],['te-ndryshme','Të Ndryshme','📦'],
  ['interesi-juaj','Interesi Juaj','🎯'],['celular','Celular','📱'],
  ['pc-tv','PC, TV etj.','💻'],['bujqesi','Bujqësi','🌾'],
  ['bashkepunim','Bashkëpunim','🤝'],['kafsha','Kafshë','🐾'],
 ];
 const categoryRows=originals.map(([slug,name],index)=>({
  id:1000+index,slug,name,attributeSchema:{},children:[],
  ...[{}, {icon:null}, {icon:''}, {icon:'   '}][index%4],
 }));
 categoryRows.push({id:2000,slug:'new-category',name:'Kategori e re',children:[],attributeSchema:{}});
 const expectedIcons=[...originals,['new-category','Kategori e re','📁']];
 controls.override=p=>p==='/categories'?[200,categoryRows]:null;
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:900});await go('/',null);
  const section=page.getByRole('region',{name:'Shfleto Kategoritë'});
  await expect(section.getByRole('img')).toHaveCount(expectedIcons.length);
  for(const [slug,name,icon] of expectedIcons){
   await expect(section.getByRole('img',{name,exact:true})).toHaveText(icon);
   await expect(section.locator(`a[href="/kategorite/${slug}"]`)).toContainText(name);
   await expect(page.getByRole('combobox',{name:'Kategoria',exact:true}).locator(`option[value="${slug}"]`)).toHaveText(`${icon} ${name}`);
  }
  if(width===1440)await section.screenshot({path:'/tmp/oferta-category-icons.png'});
 }
 await page.getByRole('button',{name:'Hap listën e kategorive'}).click();
 for(const [slug,,icon] of expectedIcons){
  await expect(page.getByRole('navigation',{name:'Navigimi kryesor'}).locator(`a[href="/kategorite/${slug}"]`)).toContainText(icon);
 }
 await go('/kategorite',null);
 for(const [,name,icon] of expectedIcons)await expect(page.getByRole('img',{name,exact:true})).toHaveText(icon);
 categoryRows[0].icon='🌟';
 for(const route of ['/','/kategorite']){
  await go(route,null);await expect(page.getByRole('img',{name:'Patundshmëri',exact:true})).toHaveText('🌟');
 }
 controls.override=null;await page.setViewportSize({width:390,height:844});
 console.log('PASS: original category icons on mobile/desktop, directory, navigation and search; custom icons and live categories retained');
 // Distinct pages survive navigation and reload; upstream failures are not 404s.
 await go('/kompanite/synthetic',null);
 await expect(page.getByText('Company page 1',{exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Faqja 2',exact:true}).click();
 await expect(page.getByText('Company page 2',{exact:true})).toBeVisible();
 await page.reload();await expect(page.getByText('Company page 2',{exact:true})).toBeVisible();
 await expect(page.getByRole('link',{name:'Faqja 2',exact:true})).toHaveAttribute('aria-current','page');
 console.log('PASS UX20: company pagination requests and renders page two and survives reload');
 // Full image viewer traps focus, supports zoom and returns focus.
 await go('/shpalljet/synthetic-listing',null);
 const opener=page.getByRole('button',{name:'Hap fotot në madhësi të plotë'});
 await opener.click();const viewer=page.getByRole('dialog');await expect(viewer).toBeVisible();
 await viewer.getByRole('button',{name:'Zmadho',exact:true}).click();await expect(viewer.getByRole('button',{name:'Zvogëlo'})).toHaveAttribute('aria-pressed','true');
 await viewer.getByRole('button',{name:'Foto tjetër →'}).click();await expect(viewer.getByRole('status')).toContainText('2 / 2');
 await page.keyboard.press('Escape');await expect(viewer).toHaveCount(0);await expect(opener).toBeFocused();
 console.log('PASS UX04/22: full photo viewer zoom, next image, Escape and focus restoration');
 // Filters retain search scope and reject an inverted range.
 await go('/kategorite/test?q=retained&city=test-city&price_min=10&price_max=90&isFeatured=true&has_photos=true',null);
 await page.getByRole('button',{name:'Hap filtrat'}).click();const filters=page.getByRole('dialog');
 await filters.getByRole('combobox',{name:'Kërko brenda filtrave'}).fill('updated');
 await filters.getByRole('combobox',{name:'Kërko brenda filtrave'}).press('Enter');
 await expect(page).toHaveURL(/q=updated/);await page.waitForLoadState('networkidle');let q=new URL(page.url()).searchParams;
 for(const [key,value] of Object.entries({city:'test-city',price_min:'10',price_max:'90',isFeatured:'true',has_photos:'true'}))assert.equal(q.get(key),value);
 if(!await filters.count())await page.getByRole('button',{name:'Hap filtrat'}).click();
 await page.getByRole('dialog').getByLabel('Çmimi minimal').fill('100');await page.getByRole('dialog').getByLabel('Çmimi maksimal').fill('10');
 await page.getByRole('dialog').getByRole('button',{name:'Apliko Filtrat'}).click();
 await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();assert.equal(new URL(page.url()).searchParams.get('price_min'),'10');
 await page.keyboard.press('Escape');
 console.log('PASS UX13/16: sidebar search retains all active filters; invalid price ranges remain local');
 // Filter navigation must survive repeated close/reopen/apply cycles;
 // Back restores the previous scope and leaves controls usable.
 controls.role='USER';
 for(let attempt=0;attempt<10;attempt++){
  await page.goto(origin+'/kategorite/test?q=retained&view=list');
  await page.getByRole('button',{name:'Hap filtrat'}).click();
  for(let tab=0;tab<12;tab++)await page.keyboard.press('Tab');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'Hap filtrat'})).toBeFocused();
  await page.getByRole('button',{name:'Hap filtrat'}).click();
  await page.getByRole('dialog').getByLabel('Qyteti',{exact:true}).selectOption('test-city');
  await page.getByRole('dialog').getByRole('button',{name:'Apliko Filtrat'}).click();
  await expect(page).toHaveURL(/city=test-city/);
  await page.waitForLoadState('networkidle');
  await page.goBack({waitUntil:'networkidle'});
  await expect(page).toHaveURL(/q=retained&view=list$/);
  await page.getByRole('button',{name:'Hap filtrat'}).click();
  await expect(page.getByRole('dialog').getByRole('button',{name:'Apliko Filtrat'})).toBeEnabled();
  await page.keyboard.press('Escape');
 }
 console.log('PASS UX04/13: ten Escape/reopen/filter/Back cycles preserve navigation and scope');
 // Search suggestions expose an active descendant while the textbox retains focus.
 await go('/',null);const searchbox=page.getByRole('combobox',{name:'Fjalë kyçe'});
 await searchbox.fill('banese');await expect(searchbox).toHaveAttribute('aria-expanded','true');await searchbox.press('ArrowDown');
 const active=await searchbox.getAttribute('aria-activedescendant');assert(active);await expect(page.locator(`[id="${active}"]`)).toHaveAttribute('aria-selected','true');await expect(searchbox).toBeFocused();await searchbox.press('Escape');await expect(searchbox).toHaveAttribute('aria-expanded','false');
 console.log('PASS UX17: keyboard autocomplete has a valid active option and keeps textbox focus');
 // Zero/negotiable price has the same meaning on collection and detail surfaces.
 controls.override=(p,m)=>p==='/listings'?[200,paged([{...item,attributes:{price:0,cmimi_negociueshem:true}}],1)]:p==='/listings/synthetic-listing'?[200,{...item,attributes:{price:0,cmimi_negociueshem:true}}]:null;
 for(const url of ['/shpallje','/shpalljet/synthetic-listing']){await go(url,null);await expect(page.locator('p').filter({hasText:/^0 €I negociueshëm$/}).first()).toBeVisible();await expect(page.getByText('I negociueshëm',{exact:true}).first()).toBeVisible();}
 controls.override=null;console.log('PASS UX18: zero and explicit negotiability are consistent across collection and detail');
 // Configured image policy, explicit batch rejection and form error focus.
 await go('/posto-shpallje','USER');
 await expect(page.getByText('Deri në 3 foto.',{exact:false})).toBeVisible();
 const beforeUploads=count('/media/upload-permits','POST');
 await page.locator('input[type=file]').setInputFiles([1,2,3,4].map(i=>({name:`photo-${i}.png`,mimeType:'image/png',buffer:png})));
 await expect(alerts).toContainText('4');assert.equal(count('/media/upload-permits','POST'),beforeUploads);
 await page.locator('button[type=submit]').click();await expect(alerts.filter({hasText:'Kontrolloni fushat'})).toBeFocused();
 await alerts.getByRole('button').first().click();await expect(page.getByLabel('Titulli *',{exact:true})).toBeFocused();
 console.log('PASS UX03/25/26: image policy, no silent truncation, error summary and field focus');
 // All high-risk loaders distinguish failure from empty/savable state.
 for(const [url,endpoint,empty] of [
  ['/admin/reklamat','/admin/ads','Nuk ka'],['/admin/moderimi','/admin/listings/moderation-queue','Të gjitha'],
  ['/admin/blog/post-test','/blog/posts/admin/post-test',''],['/admin/cilesimet','/admin/settings',''],
  ['/paneli/cilesimet','/users/me/notification-prefs',''],
 ]){
  controls.failPath=endpoint;await go(url,url.startsWith('/paneli')?'USER':'ADMIN');
  await expect(alerts).toContainText('padisponueshëm');
  assert.equal(await page.getByRole('button',{name:'Ruaj',exact:true}).count(),0);
  if(empty)assert.equal(await page.getByText(new RegExp('^'+empty)).count(),0);
  controls.failPath='';await page.getByRole('button',{name:'Provo përsëri'}).click();await expect(alerts).toHaveCount(0);
 }
 for(const [url,endpoint] of [['/admin/blog/post-test','/blog/posts/admin/post-test'],['/admin/cilesimet','/admin/settings'],['/admin/shpalljet/listing-test','/admin/listings/listing-test']]){
  controls.malformed.add(endpoint);await go(url);await expect(alerts).toBeVisible();assert.equal(await page.getByRole('button',{name:'Ruaj',exact:true}).count(),0);controls.malformed.clear();
 }
 console.log('PASS UX31/37/38: collection/editor/settings failures, retries and malformed data never enable unknown forms');
 // Selection scope and partial bulk suspension: only failed IDs survive and retry.
 await go('/admin/perdoruesit');await page.getByRole('checkbox',{name:'Zgjidh User One',exact:true}).check();
 await page.getByLabel('Filtro sipas rolit').selectOption('ADMIN');await expect(page.getByText('1 zgjedhur',{exact:true})).toHaveCount(0);
 await page.getByLabel('Filtro sipas rolit').selectOption('');await expect(page.getByRole('checkbox',{name:'Zgjidh User One',exact:true})).not.toBeChecked();
 await page.getByRole('checkbox',{name:'Zgjidh User One',exact:true}).check();await page.getByRole('checkbox',{name:'Zgjidh User Two',exact:true}).check();
 controls.override=(p,m)=>p.endsWith('/suspend')&&m==='POST'?(p.includes('user-two')?[503,{message:'Synthetic partial failure'}]:[200,{ok:true}]):null;
 const usersBefore=count('/admin/users');
 await page.getByRole('button',{name:'Pezullo',exact:true}).click();await page.getByLabel('Arsyeja e pezullimit').fill('Policy violation');await page.getByLabel('Kohëzgjatja në ditë').fill('14');
 await page.getByRole('button',{name:'Konfirmo pezullimin'}).click();await expect(alerts).toContainText('1 u pezulluan; 1 dështuan');
 await expect.poll(()=>count('/admin/users')).toBeGreaterThan(usersBefore);
 await expect(page.getByRole('checkbox',{name:'Zgjidh User One',exact:true})).not.toBeChecked();await expect(page.getByRole('checkbox',{name:'Zgjidh User Two',exact:true})).toBeChecked();
 controls.override=(p,m)=>p.endsWith('/suspend')&&m==='POST'?[200,{ok:true}]:null;
 await page.getByRole('button',{name:'Pezullo',exact:true}).click();await page.getByRole('button',{name:'Konfirmo pezullimin'}).click();await expect(page.getByRole('status').filter({hasText:'1 u pezulluan'})).toBeVisible();
 assert.equal(count('/admin/users/user-one/suspend','POST'),1);assert.equal(count('/admin/users/user-two/suspend','POST'),2);
 controls.override=null;
 console.log('PASS UX39/40/41: filter changes clear selection, partial bulk results refetch, retry only failures');
 // Confirmation protects bulk listing actions and reconciles the server result.
 await go('/admin/shpalljet');const rows=page.locator('tbody input[type=checkbox]');await rows.nth(0).check();await rows.nth(1).check();
 controls.override=(p,m,b)=>p==='/admin/listings/bulk'&&m==='POST'?[200,{succeeded:1,failed:1,results:[{id:b.listingIds[0],success:true},{id:b.listingIds[1],success:false,error:'Needs review'}]}]:null;
 const listBefore=count('/admin/listings');await page.getByRole('button',{name:/Aprovo/}).first().click();await expect(page.getByRole('dialog')).toContainText('2 shpallje');
 const beforeBulk=count('/admin/listings/bulk','POST');await page.getByRole('button',{name:'Konfirmo',exact:true}).evaluate(button=>{button.click();button.click();});await expect(alerts).toContainText('1 u përfunduan; 1 dështuan');await expect.poll(()=>count('/admin/listings')).toBeGreaterThan(listBefore);
 assert.equal(count('/admin/listings/bulk','POST'),beforeBulk+1);await expect(rows.nth(0)).not.toBeChecked();await expect(rows.nth(1)).toBeChecked();controls.override=null;
 console.log('PASS UX39/41: listing bulk confirmation, partial-result details and collection refresh');
 // All campaigns remain reachable; independent zones and query survive navigation.
 await go('/admin/reklamat');await page.getByRole('link',{name:'Faqja 2',exact:true}).click();await expect.poll(()=>requests.some(r=>r.p==='/admin/ads'&&new URLSearchParams(r.search).get('page')==='2')).toBe(true);
 console.log('PASS UX42: campaigns use server-backed pagination beyond the first page');
 // Blog review and dirty form guard; keyboard toolbar exposes names and pressed state.
 await go('/admin/blog/post-test');await page.getByLabel('Titulli *',{exact:true}).fill('Changed unpublished title');
 let dialogs=0;page.once('dialog',async d=>{dialogs++;await d.dismiss();});await page.getByRole('link',{name:'Anulo',exact:true}).click();assert.equal(dialogs,1);await expect(page).toHaveURL(/\/admin\/blog\/post-test$/);
 await page.getByText('Kontrollo përpara ruajtjes',{exact:true}).click();await expect(page.getByRole('article',{name:'Parashikimi i publikimit'})).toContainText('Changed unpublished title');
 await expect(page.getByRole('button',{name:'Tekst i trashë'})).toHaveAttribute('aria-pressed','false');
 // Discard prompt on reload also protects the changes.
 page.once('dialog',d=>d.accept());await page.reload();
 console.log('PASS UX08/48: unsaved navigation guard, publish review and named formatting controls');
 // Moderator entry is directly actionable; no hidden mobile navigation links.
 await go('/admin','MODERATOR');await expect(page).toHaveURL(/\/admin\/moderimi$/);await expect(page.getByRole('heading',{level:1})).toContainText('Moderimi');
 assert.equal(await page.locator('#admin-navigation a:visible').count(),0);
 await page.getByRole('button',{name:'Hap menynë',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Hap menynë',exact:true})).toBeFocused();
 console.log('PASS UX05/45: moderator landing, hidden navigation and keyboard drawer');
 assert.deepEqual(errors,[]);
 console.log('UI_UX_BROWSER_OK');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(app)app.kill('SIGTERM');if(server)await new Promise(r=>server.close(r));fs.closeSync(log);});
