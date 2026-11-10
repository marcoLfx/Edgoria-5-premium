import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import handler from '../server/v4-access-management.js';
import {deleteAuthUser} from '../server/supabase.js';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const admin='aa42fa55-cf0a-4f51-bd46-c9c7b5f64611';
const target='b27965fb-e058-4e6f-b210-b8147d725462';
const bearer='eyJhbGci.eyJzdWIi.sigABCDE123456';
const profile={user_id:target,email:'example@edgoria.test',email_confirmed_at:'2026-11-01T00:00:00Z'};
function setup({failDelete=false,secret='sb_secret_dummyABC1234567890'}={}){
 const vars=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY','EDGORIA_ADMIN_USER_ID','EDGORIA_ACCESS_PERIODS_ENABLED'];
 const previous=Object.fromEntries(vars.map(k=>[k,process.env[k]]));
 const original=global.fetch;
 Object.assign(process.env,{NEXT_PUBLIC_SUPABASE_URL:'https://edgoriatest.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_dummyABC1234567',SUPABASE_SECRET_KEY:secret,EDGORIA_ADMIN_USER_ID:admin,EDGORIA_ACCESS_PERIODS_ENABLED:'1'});
 delete process.env.SUPABASE_SERVICE_ROLE_KEY;
 const seen=[];
 global.fetch=async (input,options={})=>{
  const url=new URL(input);seen.push({url:url.pathname,options});
  if(url.pathname==='/auth/v1/user')return Response.json({id:admin,email_confirmed_at:'2026-11-01T00:00:00Z'});
  if(url.pathname.endsWith('/edgoria_v4_profiles'))return Response.json([profile]);
  if(url.pathname.endsWith('/edgoria_v4_roles'))return Response.json([]);
  if(url.pathname.startsWith('/auth/v1/admin/users/'))return failDelete?Response.json({error:'FK/storage'}, {status:409}):Response.json({id:target});
  return Response.json([]);
 };
 return {seen,restore:()=>{global.fetch=original;for(const k of vars){if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k]}}};
}
function req(extra={}){return new Request('https://example.test/api/v4?route=access-management',{method:'POST',headers:{Authorization:'Bearer '+bearer,'Content-Type':'application/json'},body:JSON.stringify({action:'delete-user',user_id:target,...extra})})}
const confirmation={confirmation:'DELETE_USER',confirmation_phrase:'ELIMINAR DEFINITIVAMENTE',confirmation_email:profile.email};

test('recovery email points to distinct reset page, not journal',()=>{
 assert.match(source('public/app.js'),/resetPasswordForEmail\(email,\{redirectTo:location.origin\+'\/reset-password'\}\)/);
 assert.match(source('public/app.js'),/target=new URL\('\/reset-password'/);
 assert.match(source('vercel.json'),/"source":\s*"\/reset-password"/);
 assert.match(source('public/reset-password.js'),/verifyOtp/);
 assert.match(source('public/reset-password.js'),/exchangeCodeForSession/);
 assert.match(source('public/reset-password.js'),/setSession/);
 assert.match(source('public/reset-password.js'),/sb.auth.updateUser\(\{password\}\)/);
 assert.match(source('public/reset-password.js'),/sb.auth.signOut\(\)/);
});

test('valid reset callback requires a token, no existing session bypass',()=>{
 const js=source('public/reset-password.js');const fn=js.match(/function callbackInput\(url\)\{[\s\S]*?\n\}/)?.[0];assert.ok(fn);
 const run=new Function(fn+'\nreturn callbackInput;')();
 assert.ok(run(new URL('https://example.test/reset-password')).error);
 assert.equal(run(new URL('https://example.test/reset-password#type=recovery&access_token=abc&refresh_token=def')).kind,'implicit');
 assert.equal(run(new URL('https://example.test/reset-password?code=test123')).kind,'code');
 assert.equal(run(new URL('https://example.test/reset-password?token_hash=123&type=recovery')).kind,'token_hash');
});

test('delete user never silently archives or suspends, confirms email and phrase',async()=>{
 const x=setup();try{
  const invalid=await handler.fetch(req({confirmation:'DELETE_USER',confirmation_email:profile.email}));
  assert.equal(invalid.status,400);
  assert.equal(x.seen.filter(t=>t.options.method==='DELETE').length,0);
  const valid=await handler.fetch(req(confirmation));assert.equal(valid.status,200);
  const deletions=x.seen.filter(t=>t.options.method==='DELETE');assert.equal(deletions.length,1);
  assert.match(deletions[0].url,/\/auth\/v1\/admin\/users\//);
  assert(!deletions[0].options.headers.Authorization,'New secret API key is not a JWT');
  assert.equal(deletions[0].options.headers.apikey,process.env.SUPABASE_SECRET_KEY);
  assert.equal(x.seen.filter(t=>/rpc\/edgoria_(suspend|archive)_user/.test(t.url)).length,0);
 }finally{x.restore()}
});

test('failed Auth deletion does not suspend the account',async()=>{
 const x=setup({failDelete:true});try{
  const result=await handler.fetch(req(confirmation));assert.equal(result.status,409);
  assert.equal(x.seen.filter(t=>t.options.method==='DELETE').length,1);
  assert.equal(x.seen.filter(t=>/rpc\/edgoria_(suspend|archive)_user/.test(t.url)).length,0);
 }finally{x.restore()}
});

test('non-admin and self-delete do not reach privileged deletion',async()=>{
 const x=setup();try{
  const self=await handler.fetch(req({...confirmation,user_id:admin}));assert.equal(self.status,400);
  const anonymous=new Request('https://example.test/api/v4?route=access-management',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete-user',user_id:target,...confirmation})});
  const r=await handler.fetch(anonymous);assert.equal(r.status,401);
  assert.equal(x.seen.filter(t=>t.options.method==='DELETE').length,0);
 }finally{x.restore()}
});
