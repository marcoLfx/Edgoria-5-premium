import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {userContext} from '../server/v4-user-data.js';
import me from '../server/v4-me.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const adminId='11111111-1111-4111-8111-111111111111';
const traderId='22222222-2222-4222-8222-222222222222';
const jwt='eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.ZXhhbXBsZQ';
const req=new Request('https://example.com/api/v4-me',{headers:{Authorization:`Bearer ${jwt}`}});
const restore=()=>{globalThis.fetch=originalFetch;for(const k of keys){if(originalEnv[k]===undefined)delete process.env[k];else process.env[k]=originalEnv[k]}};
const originalFetch=globalThis.fetch;
const keys=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','EDGORIA_ADMIN_USER_ID','EDGORIA_USDT_MANUAL_ENABLED','EDGORIA_ENFORCE_PAID_ACCESS'];
const originalEnv=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
function mock({id,role='trader',status='active',paid=false}){
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://aaaaaaaaaaaaaaaaaaaa.supabase.co';
 process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='sb_publishable_aaaaaaaaaaaaaaaaaaaaaaaaaaaa';
 process.env.EDGORIA_ADMIN_USER_ID=adminId;
 process.env.EDGORIA_ENFORCE_PAID_ACCESS=paid?'1':'0';
 process.env.EDGORIA_USDT_MANUAL_ENABLED='1';
 const calls=[];
 globalThis.fetch=async(input)=>{
  const u=new URL(input);calls.push(u.pathname);
  let body;
  if(u.pathname==='/auth/v1/user')body={id,email_confirmed_at:'2026-11-01T00:00:00Z'};
  else if(u.pathname.endsWith('/edgoria_v4_roles'))body=[{role}];
  else if(u.pathname.endsWith('/edgoria_v4_access_grants'))body=[{access_status:status,trial_ends_at:null}];
  else if(u.pathname.endsWith('/edgoria_v4_profiles'))body=[{user_id:id,full_name:'Persona de prueba'}];
  else if(u.pathname.endsWith('/edgoria_manual_subscriptions'))body=[{expires_at:'2026-12-12T00:00:00Z',status:'active'}];
  else throw Error('Unexpected request: '+u.pathname);
  return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}});
 };
 return calls;
}

test('administrador por UID autenticado entra aunque el acceso de trader esté pendiente',async()=>{
 const calls=mock({id:adminId,status:'pending',paid:true});try{
 const ctx=await userContext(req);assert.equal(ctx.user.id,adminId);
 assert.equal(calls.filter(x=>x.includes('access_grants')).length,0);
 assert.equal(calls.filter(x=>x.includes('manual_subscriptions')).length,0);
 }finally{restore()}
});

test('administrador con rol DB entra aunque no tenga una membresía de trader',async()=>{
 const calls=mock({id:traderId,role:'admin',status:'pending',paid:true});try{
 const ctx=await userContext(req);assert.equal(ctx.user.id,traderId);
 assert.ok(calls.some(x=>x.includes('v4_roles')));
 assert.ok(!calls.some(x=>x.includes('access_grants')));
 }finally{restore()}
});

test('trader pendiente sigue bloqueado',async()=>{
 mock({id:traderId,role:'trader',status:'pending'});try{
 await assert.rejects(userContext(req),e=>e.code==='ACCESS_PENDING'&&e.status===403);
 }finally{restore()}
});

test('trader suspendido sigue bloqueado',async()=>{
 mock({id:traderId,role:'trader',status:'suspended'});try{
 await assert.rejects(userContext(req),e=>e.code==='ACCESS_DISABLED'&&e.status===403);
 }finally{restore()}
});

test('trader activo conserva su journal sin permisos administrativos',async()=>{
 mock({id:traderId,role:'trader',status:'active'});try{
 const ctx=await userContext(req);assert.equal(ctx.user.id,traderId);
 }finally{restore()}
});

test('administrador no consulta suscripciones mensuales para determinar el rol',async()=>{
 const calls=mock({id:adminId,status:'pending',paid:true});try{
 const result=await me.fetch(req);const body=await result.json();assert.equal(result.status,200);assert.equal(body.role,'admin');
 assert.ok(!calls.some(x=>x.includes('manual_subscriptions')));
 }finally{restore()}
});

test('el inicio de sesión único no contiene formulario duplicado en Admin',()=>{
 const admin=read('public/admin57.js');
 assert.doesNotMatch(admin,/id="admin-login"/);
 assert.doesNotMatch(admin,/signInWithPassword/);
 assert.match(admin,/location\.replace\('\/app'\)/);
 const journal=read('public/app.js');assert.match(journal,/state\.role!=='admin'&&data\.access\?\.access_status/);
 assert.match(journal,/state\.role==='admin'\)\{bootFinished\(\);location\.replace\('\/admin'\)/);
});

test('el servidor sigue validando privilegios administrativos',()=>{
 assert.match(read('server/v4-access.js'),/requireAdmin/);
 assert.match(read('server/admin-console.js'),/requireAdmin\(req\)/);
});
