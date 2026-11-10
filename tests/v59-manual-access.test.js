import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import handler from '../server/v4-access-management.js';
import {userContext} from '../server/v4-user-data.js';
import consoleApi from '../server/admin-console.js';
import {calendarSummary,periodState,monthCells} from '../public/admin57-model.js';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
const admin='aa42fa55-cf0a-4f51-bd46-c9c7b5f64611',trader='b27965fb-e058-4e6f-b210-b8147d725462';
const token='eyJhbGci.eyJzdWIi.sigABCDE123456';
const prevEnv={...process.env};
function setup(id=admin,periods=[]){
 Object.assign(process.env,{NEXT_PUBLIC_SUPABASE_URL:'https://testrepo.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_testingABC1234567',SUPABASE_SECRET_KEY:'sb_secret_testingABC123456789',EDGORIA_ADMIN_USER_ID:admin,EDGORIA_ACCESS_PERIODS_ENABLED:'1'});
 const seen=[];const original=global.fetch;
 global.fetch=async (input,init={})=>{
  const url=new URL(input);seen.push({table:url.pathname,method:init.method||'GET',body:init.body});
  if(url.pathname==='/auth/v1/user')return Response.json({id,email_confirmed_at:'2026-01-01T00:00:00Z'});
  if(url.pathname.endsWith('/edgoria_v4_roles'))return Response.json([]);
  if(url.pathname.endsWith('/edgoria_v4_profiles'))return Response.json([{user_id:trader,email:'client@example.com',email_confirmed_at:'2026-01-02T00:00:00Z'}]);
  if(url.pathname.endsWith('/edgoria_v4_access_grants'))return Response.json([{access_status:'active'}]);
  if(url.pathname.endsWith('/edgoria_access_periods'))return Response.json(periods);
  if(url.pathname.startsWith('/rest/v1/rpc/edgoria_'))return Response.json('fbcc2078-ac5b-4618-9c26-2dd2e6a0c389');
  return Response.json([]);
 };
 return {seen,restore:()=>{global.fetch=original;process.env=prevEnv}};
}
const request=(action,user=trader,extra={})=>new Request('https://example.test/api/v4?route=access-management',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({action,user_id:user,...extra})});

test('7-day trial grant never calls USDT/payment tables',async()=>{
 const x=setup();try{const result=await handler.fetch(request('grant-trial'));assert.equal(result.status,200);const writes=x.seen.filter(x=>x.method==='POST');assert.equal(writes.length,1);assert.match(writes[0].table,/rpc\/edgoria_grant_manual_access$/);assert.equal(JSON.parse(writes[0].body).p_kind,'trial');assert(!x.seen.some(t=>/usdt|payment|subscription/i.test(t.table)));}finally{x.restore()}
});
test('monthly activation starts from server time and is not linked to payment verification',async()=>{
 const x=setup();try{const res=await handler.fetch(request('grant-month'));assert.equal(res.status,200);const rpc=x.seen.find(x=>x.table.endsWith('/rpc/edgoria_grant_manual_access'));assert.equal(JSON.parse(rpc.body).p_kind,'monthly');const sql=read('supabase/edgoria_v59_access_manual.sql');assert.match(sql,/v_now\s*\+\s*interval '1 month'/);assert.match(sql,/v_now\s*\+\s*interval '7 days'/);assert.doesNotMatch(sql,/payment_reference|payment_method|edgoria_manual_subscriptions|edgoria_record_usdt_payment/);}finally{x.restore()}
});
test('removal is blocked without email confirmation and no hard deletion occurs',async()=>{
 const x=setup();try{const res=await handler.fetch(request('archive-user',trader,{confirmation:'ARCHIVE_USER',confirmation_email:'not-client@example.com'}));assert.equal(res.status,400);assert(!x.seen.some(t=>t.table.includes('/rpc/')));}finally{x.restore()}
});
test('verified archival and restoration use independently audited RPCs',async()=>{
 const x=setup();try{const r=await handler.fetch(request('archive-user',trader,{confirmation:'ARCHIVE_USER',confirmation_email:'client@example.com'}));assert.equal(r.status,200);const rpc=x.seen.find(t=>t.table.endsWith('/rpc/edgoria_archive_user'));assert(rpc);const recover=await handler.fetch(request('restore-user',trader,{confirmation:'RESTORE_USER'}));assert.equal(recover.status,200);assert(x.seen.find(t=>t.table.endsWith('/rpc/edgoria_restore_user')));}finally{x.restore()}
});
test('admin cannot change their own access, server checks role',async()=>{
 const x=setup();try{const result=await handler.fetch(request('grant-month',admin));assert.equal(result.status,400)}finally{x.restore()}
});
test('expired periods deny trader API regardless of payment status',async()=>{
 const x=setup(trader,[{status:'active',kind:'monthly',starts_at:'2026-01-01T00:00:00Z',ends_at:'2026-02-01T00:00:00Z'}]);try{
  await assert.rejects(()=>userContext(new Request('https://x.test',{headers:{Authorization:`Bearer ${token}`}})),e=>e.code==='ACCESS_EXPIRED');
  assert(!x.seen.some(t=>/manual_subscriptions/.test(t.table)));
 }finally{x.restore()}
});
test('legacy approved users are grandfathered until manually migrated',async()=>{
 const x=setup(trader,[]);try{const result=await userContext(new Request('https://x.test',{headers:{Authorization:`Bearer ${token}`}}));assert.equal(result.user.id,trader)}finally{x.restore()}
});
test('live period allows access; calendar reports start and expiry dates',async()=>{
 const future=new Date(Date.now()+7*86400000).toISOString(),past=new Date(Date.now()-86400000).toISOString();
 const x=setup(trader,[{status:'active',kind:'trial',starts_at:past,ends_at:future}]);try{const result=await userContext(new Request('https://x.test',{headers:{Authorization:`Bearer ${token}`}}));assert.equal(result.user.id,trader)}finally{x.restore()}
 const p={user_id:trader,starts_at:'2026-11-10T15:00:00Z',expires_at:'2026-11-17T15:00:00Z',status:'active'};
 assert.equal(periodState(p,Date.parse('2026-11-18T00:00:00Z')),'expired');assert.equal(calendarSummary([p],'2026-11-11').running.length,1);assert(monthCells('2026-11').some(x=>x.date==='2026-11-11'));
});
test('admin dashboard requires authenticated admin',async()=>{
 const original=process.env.EDGORIA_ADMIN_USER_ID;const r=await consoleApi.fetch(new Request('https://x.test'));assert.equal(r.status,401);process.env.EDGORIA_ADMIN_USER_ID=original;
});
test('front end exposes manual trial/month/archive and no payment-triggered action',()=>{
 const ui=read('public/admin59.js'),html=read('public/admin.html');assert.match(ui,/grant-trial/);assert.match(ui,/grant-month/);assert.match(ui,/archive-user/);assert.match(ui,/restore-user/);assert.doesNotMatch(ui,/verify-usdt-month|USDT_RECEIVED_AND_VERIFIED|amount_cents/);assert.match(html,/admin59\.js/)
});
