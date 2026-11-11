import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import route from '../server/v60-affiliates.js';

const adminId='11111111-1111-4111-8111-111111111111';
const envKeys=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY','EDGORIA_ADMIN_USER_ID','EDGORIA_AFFILIATES_V60_ENABLED'];
const makeReq=()=>new Request('https://edgoria.example/api/admin?route=affiliates',{headers:{Authorization:'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.signature'}});
async function withMock(testCase,action){
 const original=globalThis.fetch;
 const prior=Object.fromEntries(envKeys.map(k=>[k,process.env[k]]));
 Object.assign(process.env,{
  NEXT_PUBLIC_SUPABASE_URL:'https://edgoria-test.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_'+'p'.repeat(32),
  SUPABASE_SECRET_KEY:'sb_secret_'+'s'.repeat(32),
  EDGORIA_ADMIN_USER_ID:adminId,
  EDGORIA_AFFILIATES_V60_ENABLED:'1'
 });
 globalThis.fetch=async(req)=>{
  const url=String(req);
  if(url.endsWith('/auth/v1/user'))return Response.json({id:adminId,email_confirmed_at:'2026-11-10T01:00:00Z'});
  if(url.includes('/rest/v1/edgoria_v4_profiles?')){
    assert.ok(!url.includes('email,'),'No consultar columna email ausente del esquema inicial');
    return Response.json([{user_id:adminId,full_name:'Usuario de prueba',created_at:'2026-11-10T00:00:00Z'}]);
  }
  if(testCase==='sales-error'&&url.includes('/rest/v1/edgoria_manual_sales?'))return Response.json({code:'42703',message:'private details omitted'},{status:400});
  if(url.includes('/rest/v1/'))return Response.json([]);
  throw new Error('Unexpected URL '+url.split('?')[0]);
 };
 try{return await action();} finally{
  globalThis.fetch=original;
  for(const k of envKeys){if(prior[k]===undefined)delete process.env[k];else process.env[k]=prior[k]}
 }
}

test('Admin Afiliados sigue operativo sin columna email en tabla de perfiles',async()=>withMock('success',async()=>{
 const response=await route.fetch(makeReq());
 const body=await response.json();
 assert.equal(response.status,200);assert.equal(body.ok,true);
 assert.equal(body.profiles[0].full_name,'Usuario de prueba');
 assert.equal(Object.hasOwn(body.profiles[0],'email'),false);
}));

test('Error de una tabla crítica identifica la fuente, sin exponer datos privados',async()=>withMock('sales-error',async()=>{
 const response=await route.fetch(makeReq());
 const body=await response.json();
 assert.equal(response.status,503);
 assert.equal(body.code,'AFFILIATES_REPORT_SOURCE');
 assert.equal(body.source,'edgoria_manual_sales');
 assert.ok(!JSON.stringify(body).includes('private details'));
}));

test('El Admin conserva correos desde directorio de usuarios ya autenticado',()=>{
 const ui=readFileSync(new URL('../public/admin59.js',import.meta.url),'utf8');
 assert.match(ui,/store\.users\.find\(p=>p\.user_id===id\)/);
});

test('El Journal ya limita cinco fichas y cinco vinculaciones MT5 sin modificar EA',()=>{
 const ui=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const server=readFileSync(new URL('../server/mt5-connect.js',import.meta.url),'utf8');
 const migration=readFileSync(new URL('../supabase/edgoria_v62_partners_and_account_limit.sql',import.meta.url),'utf8');
 assert.match(ui,/accounts\.length>=5/);
 assert.match(server,/owned\.length>=5/);
 assert.match(migration,/create trigger eg62_max_five_accounts before insert/);
});
