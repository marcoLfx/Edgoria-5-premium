import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import me from '../server/v4-me.js';
import payment from '../server/v61-payments.js';
import {userContext} from '../server/v4-user-data.js';
const dirname=path.dirname(fileURLToPath(import.meta.url));
const read=p=>readFileSync(path.join(dirname,'..',p),'utf8');
const USER='10edb3c3-3fff-4aae-8c06-100000000001';
const ADMIN='10edb3c3-3fff-4aae-8c06-100000000002';
const PROOF='10edb3c3-3fff-4aae-8c06-100000000003';
const jwt='eyJabc.eyJdef.sig_ABC';
const req=(method='GET',url='https://edgoria.test/api/v4?route=me',body)=>new Request(url,{method,headers:{Authorization:'Bearer '+jwt},...(body?{body:JSON.stringify(body),headers:{Authorization:'Bearer '+jwt,'Content-Type':'application/json'}}:{})});
const fixture={grant:'pending',periods:[],actor:USER};
function mockFetch(){
 const prior=globalThis.fetch;
 globalThis.fetch=async(input,options={})=>{
  const u=new URL(String(input));const table=u.pathname.split('/').pop();
  if(u.pathname==='/auth/v1/user')return Response.json({id:fixture.actor,email:'user@example.com',email_confirmed_at:'2026-11-09T12:00:00Z',created_at:'2026-11-09T12:00:00Z'});
  if(u.pathname.includes('/rpc/edgoria_review_payment_proof'))return Response.json('verified');
  if(table==='edgoria_v4_roles')return Response.json([]);
  if(table==='edgoria_v4_profiles')return Response.json([{user_id:fixture.actor,full_name:'Tester'}]);
  if(table==='edgoria_v4_access_grants')return Response.json([{access_status:fixture.grant,trial_ends_at:null}]);
  if(table==='edgoria_access_periods')return Response.json(fixture.periods);
  if(table==='edgoria_payment_proofs')return Response.json([{id:PROOF,user_id:USER,status:'pending',amount_cents:1099,object_path:USER+'/'+PROOF+'.png'}]);
  if(table==='edgoria_affiliates')return Response.json([]);
  throw Error('Unexpected mock request: '+u);
 };
 return()=>{globalThis.fetch=prior};
}
function setEnv(){
 const current={...process.env};
 Object.assign(process.env,{NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_abcdefghijklmnopqrstuvwxyz',SUPABASE_SECRET_KEY:'sb_secret_abcdefghijklmnopqrstuvwxyz',EDGORIA_ADMIN_USER_ID:ADMIN,EDGORIA_ACCESS_PERIODS_ENABLED:'1',EDGORIA_PAYMENT_PROOFS_ENABLED:'1'});
 return()=>{process.env=current};
}
// Tests are sequential because mock fetch and process.env are process globals.
test('pending user receives personal profile, not a premium entitlement',async()=>{
 const restore=setEnv(),stop=mockFetch();fixture.actor=USER;fixture.grant='pending';fixture.periods=[];
 try{const r=await me.fetch(req());assert.equal(r.status,200);const d=await r.json();assert.equal(d.allowed,false);assert.equal(d.eligibility_status,'pending');assert.equal(d.profile.full_name,'Tester');}
 finally{stop();restore()}
});
test('pending user cannot call a protected server data endpoint',async()=>{
 const restore=setEnv(),stop=mockFetch();fixture.actor=USER;fixture.grant='pending';
 try{await assert.rejects(userContext(req()),error=>error.code==='ACCESS_PENDING');}
 finally{stop();restore()}
});
test('active monthly access is allowed while period is current',async()=>{
 const restore=setEnv(),stop=mockFetch();fixture.actor=USER;fixture.grant='active';fixture.periods=[{status:'active',starts_at:'2026-11-01T00:00:00.000Z',ends_at:'2030-12-01T00:00:00.000Z'}];
 try{const d=await (await me.fetch(req())).json();assert.equal(d.allowed,true);}
 finally{stop();restore()}
});
test('expired access gets locked before entering the trading journal',async()=>{
 const restore=setEnv(),stop=mockFetch();fixture.actor=USER;fixture.grant='active';fixture.periods=[{status:'active',starts_at:'2024-11-01T00:00:00.000Z',ends_at:'2024-12-01T00:00:00.000Z'}];
 try{const d=await (await me.fetch(req())).json();assert.equal(d.allowed,false);assert.equal(d.eligibility_status,'expired');await assert.rejects(userContext(req()),e=>e.code==='ACCESS_EXPIRED');}
 finally{stop();restore()}
});
test('payment admin endpoint rejects ordinary users and cannot elevate member permissions',async()=>{
 const restore=setEnv(),stop=mockFetch();fixture.actor=USER;fixture.grant='active';fixture.periods=[];
 try{const r=await payment.fetch(req('GET','https://edgoria.test/api/admin?route=payments'));assert.equal(r.status,403);}
 finally{stop();restore()}
});
test('admin payment decision calls atomic review and returns access_granted false',async()=>{
 const restore=setEnv(),stop=mockFetch();fixture.actor=ADMIN;fixture.grant='pending';
 try{const r=await payment.fetch(req('POST','https://edgoria.test/api/admin?route=payments',{action:'verify',id:PROOF}));assert.equal(r.status,200);const d=await r.json();assert.equal(d.access_granted,false);assert.equal(d.commission_created,false);}
 finally{stop();restore()}
});
test('SQL rules keep users from approving receipts or reading others\' proofs',()=>{
 const s=read('supabase/edgoria_v61_payment_proofs.sql');
 assert.match(s,/alter table public\.edgoria_payment_proofs enable row level security/i);
 assert.match(s,/grant select,insert on public\.edgoria_payment_proofs to authenticated/i);
 assert.match(s,/user_id=\(select auth\.uid\(\)\)/i);
 assert.doesNotMatch(s,/grant update on public\.edgoria_payment_proofs to authenticated/i);
 assert.match(s,/edgoria_review_payment_proof/);
 assert.doesNotMatch(s,/grant execute on function public\.edgoria_review_payment_proof\([\w,\s]+\) to authenticated/i);
});
test('landing shows both platform logos, cTrader as upcoming and affiliates after FAQ',()=>{
 const s=read('public/index.html');assert.match(s,/Logotipo de MetaTrader 5/);assert.match(s,/Logotipo de cTrader/);assert.ok(s.indexOf('id="afiliados"')>s.indexOf('id="preguntas"'));
});
test('pending workspace keeps only dashboard shell, membership, affiliates and settings active',()=>{
 const s=read('public/app.js');assert.match(s,/pendingAllowedViews=new Set\(\['dashboard','membership','affiliates','settings'\]\)/);
 assert.match(s,/disabled title="Se habilita al activar tu acceso"/);
 assert.match(s,/const paymentBucket='edgoria-payment-proofs'/);
});
test('Vercel headers and rewrites remain valid',()=>{
 const doc=JSON.parse(read('vercel.json'));for(const rule of doc.headers||[])for(const hdr of rule.headers)assert.deepEqual(Object.keys(hdr).sort(),['key','value']);
 assert.ok(doc.rewrites.some(r=>r.source==='/app'));assert.ok(doc.rewrites.some(r=>r.source==='/admin'));assert.ok(doc.rewrites.some(r=>r.source==='/reset-password'));
});
test('the first verified sale is the only sale eligible for affiliate commission',()=>{
 const sql=read('supabase/edgoria_v60_affiliates_manual.sql');
 assert.match(sql,/select 1 from public\.edgoria_manual_sales s\s+where s\.buyer_id=p_buyer_id and s\.id<>v_sale/i);
 assert.doesNotMatch(sql,/public\.edgoria_partner_commissions c\s+join public\.edgoria_manual_sales s on s\.id=c\.sale_id/);
});
