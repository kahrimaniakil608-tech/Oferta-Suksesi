const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {createRequire}=require('node:module');
const apiRequire=createRequire(path.resolve(__dirname,'../apps/api/package.json'));
require('ts-node').register({project:path.resolve(__dirname,'../apps/api/tsconfig.json'),transpileOnly:true});
const {validateSync}=apiRequire('class-validator');
const {AppController}=require('../apps/api/src/app.controller.ts');
const {UsersController}=require('../apps/api/src/users/users.controller.ts');
const {BlogController}=require('../apps/api/src/blog/blog.controller.ts');
const {OperationsController}=require('../apps/api/src/workflows/operations.controller.ts');
const {localDateTime,campaignInstant,validCampaignDates}=require('../apps/web/src/lib/campaign-dates.ts');

test('campaign editing preserves instants across time zones, milliseconds and repeated DST hours',()=>{
 const oldZone=process.env.TZ;
 try {
  for(const zone of ['Europe/Skopje','America/New_York','Asia/Kathmandu']){
   process.env.TZ=zone;
   for(const instant of ['2026-06-15T08:25:43.123Z','2026-10-25T00:30:00.000Z','2026-10-25T01:30:00.000Z']){
    assert.equal(campaignInstant(localDateTime(instant),instant),instant);
   }
  }
  process.env.TZ='Europe/Skopje';
  const from='2026-10-25T00:30:00.000Z',to='2026-10-25T01:30:00.000Z';
  assert.equal(localDateTime(from),localDateTime(to));
  assert.equal(localDateTime('2026-06-15T08:25:43.123Z'),'2026-06-15T10:25');
  assert.equal(validCampaignDates(localDateTime(from),localDateTime(to),from,to),true);
  assert.equal(campaignInstant('2030-06-15T10:00'),'2030-06-15T08:00:00.000Z');
  assert.equal(validCampaignDates('2030-06-15T10:00','2030-06-15T11:00'),true);
  for(const [start,end] of [['','2030-06-15T11:00'],['bad','bad'],['2030-06-15T11:00','2030-06-15T10:00'],['2030-06-15T10:00','2030-06-15T10:00']])assert.equal(validCampaignDates(start,end),false);
 } finally {if(oldZone===undefined)delete process.env.TZ;else process.env.TZ=oldZone;}
});

test('public posting policy exposes effective image rules without arbitrary settings',async()=>{
 const settings={max_images_per_listing:'3',require_image_to_publish:'true',maintenance_mode:'false',smtp_password:'private'};
 const controller=new AppController({}, {get:async key=>settings[key]});
 const result=await controller.getSiteConfig();
 assert.equal(result.maxImagesPerListing,3);assert.equal(result.requireImageToPublish,true);
 assert.equal(result.maintenance,false);assert.equal(JSON.stringify(result).includes('private'),false);
});

test('member password change uses the same eight-character minimum as registration and reset',()=>{
 const Dto=Reflect.getMetadata('design:paramtypes',UsersController.prototype,'changePassword')[1];
 const errors=password=>validateSync(Object.assign(new Dto(),{currentPassword:'existing',newPassword:password}));
 assert(errors('1234567').some(error=>error.property==='newPassword'&&error.constraints.minLength));
 assert.equal(errors('12345678').length,0);
});

test('member rejection reason is owner-scoped and does not expose moderation internals',async()=>{
 let query;
 const controller=new UsersController({
  $transaction:promises=>Promise.all(promises),
  listing:{findMany:async args=>{query=args;return [
   {id:'rejected',status:'REJECTED',moderationLogs:[{reason:'Please add an accurate description.'}]},
   {id:'automatic',status:'REJECTED',moderationLogs:[]},
   {id:'published',status:'PUBLISHED',moderationLogs:[{reason:'Old reason'}]},
  ];},count:async()=>3},
 });
 const result=await controller.myListings({user:{id:'owner'}},undefined,'1','20');
 assert.equal(query.where.userId,'owner');
 assert.deepEqual(query.include.moderationLogs.where,{action:'REJECTED',moderatorId:{not:null}});
 assert.deepEqual(query.include.moderationLogs.select,{reason:true});
 assert.equal(result.data[0].rejectionReason,'Please add an accurate description.');
 assert.match(result.data[1].rejectionReason,/korrigjim/);assert.equal(result.data[2].rejectionReason,null);
 assert(result.data.every(row=>!('moderationLogs' in row)));
});

test('admin blog search and publication filters constrain both rows and totals on later pages',async()=>{
 const seen=[];
 const controller=new BlogController({$transaction:p=>Promise.all(p),blogPost:{findMany:async args=>{seen.push(args);return [];},count:async args=>{seen.push(args);return 31;}}});
 const result=await controller.getAdminPosts('2','20','  Këshilla  ','false');
 assert.deepEqual(seen[0].where,{title:{contains:'Këshilla',mode:'insensitive'},isPublished:false});
 assert.deepEqual(seen[1].where,seen[0].where);assert.equal(seen[0].skip,20);assert.equal(result.meta.totalPages,2);
 await assert.rejects(()=>controller.getAdminPosts('1','20',undefined,'unrecognized'),/Invalid published filter/);
});

test('operations triage resolves assignee names and applies support/delivery filters to totals',async()=>{
 const seen={};
 const controller=new OperationsController({
  $transaction:p=>Promise.all(p),
  listingReport:{findMany:async args=>{seen.reports=args;return [{id:'report',assignedTo:'staff-id'}];},count:async()=>1},
  user:{findMany:async args=>{seen.users=args;return [{id:'staff-id',name:'Moderator Name'}];}},
  supportMessage:{findMany:async args=>{seen.support=args;return [];},count:async args=>{seen.supportCount=args;return 0;}},
  outboxEvent:{findMany:async args=>{seen.delivery=args;return [];},count:async args=>{seen.deliveryCount=args;return 0;}},
 });
 const result=await controller.reports('1','IN_REVIEW');
 assert.equal(result.data[0].assigneeName,'Moderator Name');assert.deepEqual(seen.users.select,{id:true,name:true});
 assert.deepEqual(seen.reports.orderBy,[{createdAt:'asc'},{id:'asc'}]);
 await controller.support('2','OPEN');assert.deepEqual(seen.support.where,{status:'OPEN'});assert.deepEqual(seen.supportCount.where,seen.support.where);assert.equal(seen.support.skip,20);
 await controller.deliveries('1','email.listing.expired');assert.equal(seen.delivery.where.topic,'email.listing.expired');assert.deepEqual(seen.deliveryCount.where,seen.delivery.where);
 await assert.rejects(()=>controller.support('1','INVALID'),/Invalid support status/);
});
