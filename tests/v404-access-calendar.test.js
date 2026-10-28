import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {tradingDay,tradingWeekday} from '../public/trading-day.js';
import v4 from '../api/v4.js';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');
const migration=readFileSync(new URL('../supabase/edgoria_v4_0_4_access_grants.sql',import.meta.url),'utf8');
const USER='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const OTHER='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const TOKEN='eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.abc123';
const pub='sb_publishable_local_mock_for_tests_123456';
const priv='sb_secret_local_mock_for_tests_123456';
const json=(data,status=200)=>Response.json(data,{status});

test('16:00 closes previous day until exact cutoff in Lima',()=>{
 assert.equal(tradingDay('2026-10-26T20:59:59Z','America/Lima'),'2026-10-25'); // local 15:59:59
 assert.equal(tradingDay('2026-10-26T21:00:00Z','America/Lima'),'2026-10-26'); // local 16:00:00
 assert.equal(tradingDay('2026-10-27T20:59:59Z','America/Lima'),'2026-10-26');
 assert.equal(tradingWeekday('2026-10-27T20:59:59Z','America/Lima'),1);
});
test('timezone selection and daylight saving change cutoff, no browser timezone dependency',()=>{
 assert.equal(tradingDay('2026-11-01T20:30:00Z','America/New_York'),'2026-10-31'); // NY 15:30 EST after DST
 assert.equal(tradingDay('2026-11-01T21:00:00Z','America/New_York'),'2026-11-01');
 assert.equal(tradingDay('2026-11-01T16:00:00Z','UTC'),'2026-11-01');
 assert.equal(tradingDay('invalid','America/Lima'),'');
 assert.equal(tradingDay('2026-10-26T21:00:00Z','not/valid'),'2026-10-26');
});
test('removed playbooks from navigation and editing, wheel scroll and signout reachable',()=>{
 assert.doesNotMatch(app,/n:'Playbooks'|function playbook\(|function strategyModal\(/);
 assert.match(app,/data-action="signout" title="Cerrar sesión"/);
 assert.match(css,/\.sidebar\{overflow-y:auto/);
 assert.match(css,/overscroll-behavior-y:contain/);
 assert.match(app,/v4-access-management/);
});
test('new table allows own read only, never privileged mutations from browser',()=>{
 assert.match(migration,/revoke all on public\.edgoria_v4_access_grants from anon,authenticated/);
 assert.match(migration,/grant select on public\.edgoria_v4_access_grants to authenticated/);
 assert.doesNotMatch(migration,/grant (?:insert|update|delete|all) on public\.edgoria_v4_access_grants to authenticated/);
 assert.match(migration,/using\(user_id=\(select auth.uid\(\)\)\)/);
});

async function runWithMock(role,func){
 const keys=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','SUPABASE_URL','SUPABASE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY','EDGORIA_ADMIN_USER_ID'];
 const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]])),original=globalThis.fetch;
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=pub;process.env.SUPABASE_SECRET_KEY=priv;delete process.env.SUPABASE_URL;delete process.env.EDGORIA_ADMIN_USER_ID;
 let changes=[];
 globalThis.fetch=async(url,opts={})=>{
  const u=new URL(url),path=u.pathname,method=opts.method||'GET',privileged=opts.headers?.apikey===priv;
  if(path==='/auth/v1/user')return json({id:USER,email_confirmed_at:'2026-10-26T00:00:00Z'});
  if(path==='/rest/v1/edgoria_v4_access_grants'&&!privileged)return json([{access_status:'active'}]);
  if(path==='/rest/v1/edgoria_v4_roles'&&!privileged)return json([{role}]);
  assert.ok(privileged,'Sensitive read or write must require private key: '+path);
  if(path==='/rest/v1/edgoria_v4_profiles'&&method==='GET')return json([{user_id:OTHER,full_name:'Cuenta demo',country:'PE',email:'demo@example.com',email_confirmed_at:'2026-10-26T00:00:00Z',created_at:'2026-10-25T00:00:00Z'}]);
  if(path==='/rest/v1/edgoria_v4_roles'&&method==='GET')return json([]);
  if(path==='/rest/v1/edgoria_v4_partner_applications')return json([]);
  if(path==='/rest/v1/edgoria_v4_access_grants'&&method==='GET')return json([{user_id:OTHER,access_status:'active'}]);
  if(path==='/rest/v1/edgoria_v4_access_grants'&&method==='POST'){changes.push(JSON.parse(opts.body));return new Response(null,{status:204});}
  throw Error('Unexpected '+method+' '+path);
 };
 try{await func(changes)}finally{globalThis.fetch=original;for(const [k,v] of Object.entries(saved))v===undefined?delete process.env[k]:process.env[k]=v;}
}
const request=(method='GET',body)=>new Request('https://edgoria.test/api/v4-access-management',{method,headers:{Authorization:'Bearer '+TOKEN,...(body?{'Content-Type':'application/json'}:{})},body:body&&JSON.stringify(body)});
test('admin can list enabled accounts and grant 1 calendar month server-side',async()=>{
 await runWithMock('admin',async changes=>{
  const get=await v4.fetch(request());assert.equal(get.status,200);const out=await get.json();assert.equal(out.totals.registered,1);assert.equal(out.totals.active,1);
  const post=await v4.fetch(request('POST',{user_id:OTHER,action:'grant-month'}));assert.equal(post.status,200,JSON.stringify(await post.clone().json()));
  assert.equal(changes.length,1);assert.equal(changes[0].user_id,OTHER);assert.equal(changes[0].access_status,undefined); // Free month must not auto-approve accounts.
  const d=Date.parse(changes[0].trial_ends_at)-Date.parse(changes[0].trial_granted_at);assert.ok(d>=28*86400000&&d<=31*86400000);
  const self=await v4.fetch(request('POST',{user_id:USER,action:'suspend'}));assert.equal(self.status,400);assert.equal(changes.length,1);
 });
});
test('trader cannot view or mutate administrative users',async()=>{
 await runWithMock('trader',async changes=>{
  const get=await v4.fetch(request());assert.equal(get.status,403);
  const post=await v4.fetch(request('POST',{user_id:OTHER,action:'grant-month'}));assert.equal(post.status,403);
  assert.equal(changes.length,0);
 });
});
test('suspended user is rejected by authenticated server API',async()=>{
 const saved={url:process.env.NEXT_PUBLIC_SUPABASE_URL,key:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY},orig=globalThis.fetch;
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=pub;
 globalThis.fetch=async(u,opts={})=>{
  const path=new URL(u).pathname;
  if(path==='/auth/v1/user')return json({id:USER,email_confirmed_at:'2026-10-26T00:00:00Z'});
  if(path==='/rest/v1/edgoria_v4_access_grants')return json([{access_status:'suspended'}]);
  throw Error('Unexpected '+path);
 };
 try{
  const get=await v4.fetch(new Request('https://edgoria.test/api/v4-me',{headers:{Authorization:'Bearer '+TOKEN}}));
  assert.equal(get.status,403);assert.equal((await get.json()).code,'ACCESS_DISABLED');
 }finally{globalThis.fetch=orig;saved.url===undefined?delete process.env.NEXT_PUBLIC_SUPABASE_URL:process.env.NEXT_PUBLIC_SUPABASE_URL=saved.url;saved.key===undefined?delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=saved.key;}
});
