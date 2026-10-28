import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import v4 from '../api/v4.js';
const ID='aaaa1111-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const OTHER='bbbb2222-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const TOKEN='eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.signature';
const pub='sb_publishable_mock_key_long_enough_1234';
const priv='sb_secret_mock_key_long_enough_12345';
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const sql=readFileSync(new URL('../migrations/20261027_edgoria31_final.sql',import.meta.url),'utf8');
const mail=readFileSync(new URL('../EMAIL_BIENVENIDA_SUPABASE.html',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
async function withMock({confirmed=true,status='pending',admin=false,otherConfirmed=true},fn){
 const keys=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY','EDGORIA_ADMIN_USER_ID'];
 const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));const original=globalThis.fetch;
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=pub;process.env.SUPABASE_SECRET_KEY=priv;delete process.env.EDGORIA_ADMIN_USER_ID;
 let writes=[];
 globalThis.fetch=async(url,options={})=>{
   const u=new URL(url),path=u.pathname,query=u.searchParams,method=options.method||'GET';
   if(path==='/auth/v1/user')return Response.json({id:ID,email_confirmed_at:confirmed?'2026-10-20T00:00:00Z':null});
   if(path==='/rest/v1/edgoria_v4_access_grants'&&options.headers?.apikey===pub)return Response.json([{access_status:status}]);
   if(path==='/rest/v1/edgoria_v4_roles'&&options.headers?.apikey===pub)return Response.json([{role:admin?'admin':'trader'}]);
   assert.equal(options.headers?.apikey,priv,'Privileged data only available with secret server key');
   if(path==='/rest/v1/edgoria_v4_profiles')return Response.json(method==='GET'?[{user_id:OTHER,full_name:'Prueba Registro',email:'prueba@example.test',email_confirmed_at:otherConfirmed?'2026-10-20T00:00:00Z':null,country:'PE',created_at:'2026-10-20T00:00:00Z'}]:[]);
   if(path==='/rest/v1/edgoria_v4_access_grants'&&method==='GET')return Response.json([{user_id:OTHER,access_status:'pending'}]);
   if(path==='/rest/v1/edgoria_v4_access_grants'&&method==='POST'){writes.push(JSON.parse(options.body));return new Response(null,{status:204});}
   if(path==='/rest/v1/edgoria_v4_roles'||path==='/rest/v1/edgoria_v4_partner_applications')return Response.json([]);
   throw new Error(`Unexpected ${method} ${path}`);
 };
 try{await fn(writes)}finally{globalThis.fetch=original;for(const [k,v] of Object.entries(saved))v===undefined?delete process.env[k]:process.env[k]=v}
}
const req=(route,method='GET',data)=>new Request(`https://example.test/api/v4-${route}`,{method,headers:{Authorization:'Bearer '+TOKEN,'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});
test('verified signup is blocked from app API until administrator activates',async()=>{
 await withMock({confirmed:true,status:'pending'},async()=>{const r=await v4.fetch(req('me'));assert.equal(r.status,403);assert.equal((await r.json()).code,'ACCESS_PENDING');});
});
test('unverified signup cannot access app API even with active grant',async()=>{
 await withMock({confirmed:false,status:'active'},async()=>{const r=await v4.fetch(req('me'));assert.equal(r.status,403);assert.equal((await r.json()).code,'EMAIL_UNCONFIRMED');});
});
test('admin sees identity and email confirmation and can activate only confirmed registrations',async()=>{
 await withMock({confirmed:true,status:'active',admin:true,otherConfirmed:true},async writes=>{
  const r=await v4.fetch(req('access-management'));assert.equal(r.status,200);
  const body=await r.json();assert.equal(body.users[0].email,'prueba@example.test');assert.equal(body.users[0].email_confirmed,true);assert.equal(body.users[0].access_status,'pending');
  const a=await v4.fetch(req('access-management','POST',{user_id:OTHER,action:'activate'}));assert.equal(a.status,200);assert.equal(writes[0].access_status,'active');
 });
 await withMock({confirmed:true,status:'active',admin:true,otherConfirmed:false},async writes=>{
  const a=await v4.fetch(req('access-management','POST',{user_id:OTHER,action:'activate'}));assert.equal(a.status,409);assert.equal(writes.length,0);
 });
});
test('free trial is not an implicit approval',async()=>{
 await withMock({confirmed:true,status:'active',admin:true},async writes=>{
  const r=await v4.fetch(req('access-management','POST',{user_id:OTHER,action:'grant-month'}));assert.equal(r.status,200);assert.equal(writes[0].access_status,undefined);
 });
});
test('SQL migration introduces pending signup gate, protects media and does not unlock suspended users',()=>{
 assert.match(sql,/values\(new\.id,'pending'\)/);
 assert.match(sql,/as restrictive for all to authenticated/);
 assert.match(sql,/on conflict \(user_id\) do nothing/);
 assert.match(sql,/public\.edgoria_journal_attachments enable row level security/);
 assert.match(sql,/public=false/);
 assert.match(sql,/edgoria-journal/);
 assert.doesNotMatch(sql,/update public\.edgoria_v4_access_grants set access_status='active'/);
});
test('journal media is private with no public URL and named welcome email is a confirmation template',()=>{
 assert.match(app,/storage\.from\('edgoria-journal'\)\.upload/);
 assert.match(app,/createSignedUrl/);
 assert.match(app,/name="screenshots"/);
 assert.match(app,/EDGORIA NOVA 4\.2/);
 assert.match(html,/edgoria31\.css\?v=3\.1\.1/);
 assert.match(mail,/\{\{ \.ConfirmationURL \}\}/);
 assert.match(mail,/\{\{ with \.Data\.full_name \}\}/);
 assert.match(mail,/pendiente de aprobación administrativa/);
});
