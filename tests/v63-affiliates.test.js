import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import portal,{summarizeAffiliateData} from '../server/v63-partner-dashboard.js';

const sampleAffiliate={id:'11111111-1111-4111-8111-111111111111',code:'edg-aabbccddeeff',status:'active',rate_basis_points:2500};
const userId='22222222-2222-4222-8222-222222222222';
const request=()=>new Request('https://edgoria.example/api/affiliate-portal',{headers:{Authorization:'Bearer '+ 't'.repeat(45)}});

test('resumen del partner: solo porcentajes permitidos y comisiones agregadas',()=>{
 const data=summarizeAffiliateData(sampleAffiliate,[{attributed_at:'2026-11-01T10:00:00Z'},{attributed_at:'2026-11-01T11:00:00Z'},{attributed_at:'2026-11-03T11:00:00Z'}],[
  {id:'1',status:'pending',commission_cents:275,created_at:'2026-11-04T10:00:00Z'},
  {id:'2',status:'paid',commission_cents:330,created_at:'2026-11-05T10:00:00Z'}
 ]);
 assert.equal(data.referrals_total,3);
 assert.equal(data.first_sales_verified,2);
 assert.equal(data.conversion_pct,66.7);
 assert.equal(data.commission_cents.pending,275);
 assert.equal(data.commission_cents.paid,330);
 assert.equal(data.rate_basis_points,2500);
 assert.equal(data.referral_days.find(r=>r.day==='2026-11-01').count,2);
});

test('afiliado suspendido conserva cifras pero no puede publicar enlace',()=>{
 const out=summarizeAffiliateData({...sampleAffiliate,status:'suspended'},[],[]);
 assert.equal(out.approved,false);
 assert.equal(out.code,null);
});

test('el endpoint exige autenticación (no expone datos a anónimos)', async()=>{
 const original=global.fetch,origEnv={...process.env};
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://test-edgoria.supabase.co';
 process.env.SUPABASE_SECRET_KEY='sb_secret_'+'a'.repeat(32);
 process.env.EDGORIA_AFFILIATES_V60_ENABLED='1';
 global.fetch=async()=>new Response('{}',{status:401});
 try{const response=await portal.fetch(request());assert.equal(response.status,401)}
 finally{global.fetch=original;Object.assign(process.env,origEnv)}
});

test('portal aprobado: cada respuesta solo contiene datos agregados',async()=>{
 const origFetch=global.fetch,origEnv={...process.env};
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://test-edgoria.supabase.co';
 process.env.SUPABASE_SECRET_KEY='sb_secret_'+'a'.repeat(32);
 process.env.EDGORIA_AFFILIATES_V60_ENABLED='1';
 global.fetch=async(input)=>{
  const url=String(input);
  if(url.endsWith('/auth/v1/user'))return Response.json({id:userId});
  if(url.includes('edgoria_affiliates?'))return Response.json([sampleAffiliate]);
  if(url.includes('edgoria_referral_attributions?'))return Response.json([{attributed_at:'2026-11-04T13:00:00Z'}]);
  if(url.includes('edgoria_partner_commissions?'))return Response.json([{id:'some-commission',status:'approved',commission_cents:275,created_at:'2026-11-05T12:00:00Z'}]);
  throw new Error('unexpected endpoint '+url);
 };
 try{
  const response=await portal.fetch(request());assert.equal(response.status,200);
  const out=await response.json();assert.equal(out.approved,true);assert.equal(out.referrals_total,1);
  assert.equal(out.commission_cents.approved,275);
  assert.equal(JSON.stringify(out).includes(userId),false);
  assert.equal(JSON.stringify(out).includes('referred_user_id'),false);
 }finally{global.fetch=origFetch;Object.assign(process.env,origEnv)}
});

test('una cuenta no aprobada no puede obtener códigos de otros partners',async()=>{
 const orig=global.fetch,env={...process.env};
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://test-edgoria.supabase.co';
 process.env.SUPABASE_SECRET_KEY='sb_secret_'+'a'.repeat(32);
 process.env.EDGORIA_AFFILIATES_V60_ENABLED='1';
 global.fetch=async(input)=>{
   const url=String(input);
   if(url.endsWith('/auth/v1/user'))return Response.json({id:userId});
   if(url.includes('edgoria_affiliates?'))return Response.json([]);
   throw new Error('unexpected '+url);
 };
 try{const resp=await portal.fetch(request()),out=await resp.json();assert.equal(resp.status,200);assert.equal(out.approved,false);assert.equal(out.code,undefined)}
 finally{global.fetch=orig;Object.assign(process.env,env)}
});

test('migración 6.3 solo cambia el límite de porcentaje, no activa usuarios ni toca trades',()=>{
 const sql=readFileSync(new URL('../supabase/edgoria_v63_affiliate_rate_fix.sql',import.meta.url),'utf8');
 assert.match(sql,/1500/);assert.match(sql,/rate_basis_points BETWEEN 0 AND 3000/);
 assert.doesNotMatch(sql,/DELETE FROM|TRUNCATE|INSERT INTO.*edgoria_access_periods|UPDATE.*auth\.users/i);
});

test('portal visual: accesible también a partners sin subscripción de trader',()=>{
 const src=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.match(src,/if\(state\.member\?\.affiliate\?\.status==='active'\)return affiliatesView\(\)/);
 assert.match(src,/refresh-affiliate-portal/);
 assert.match(src,/Las estadísticas de afiliación no están disponibles/);
});
