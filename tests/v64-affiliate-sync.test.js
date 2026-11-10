import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import portal from '../server/v63-partner-dashboard.js';

const me='11111111-1111-4111-8111-111111111111';
const partner='22222222-2222-4222-8222-222222222222';
const fakeRequest=()=>new Request('https://test.example/api/v4?route=affiliate-portal',{
  headers:{Authorization:'Bearer '+'z'.repeat(45)}
});

test('la misma API de afiliado devuelve una comisión actualizada tras un cambio de Admin',async()=>{
 const fetchOrig=global.fetch;
 const saved={SUPABASE_SECRET_KEY:process.env.SUPABASE_SECRET_KEY,NEXT_PUBLIC_SUPABASE_URL:process.env.NEXT_PUBLIC_SUPABASE_URL,EDGORIA_AFFILIATES_V60_ENABLED:process.env.EDGORIA_AFFILIATES_V60_ENABLED};
 let commissionState='pending';
 process.env.SUPABASE_SECRET_KEY='sb_secret_'+'x'.repeat(32);
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://test-edgoria.supabase.co';
 process.env.EDGORIA_AFFILIATES_V60_ENABLED='1';
 global.fetch=async input=>{
  const url=String(input);
  if(url.endsWith('/auth/v1/user'))return Response.json({id:me});
  if(url.includes('/edgoria_affiliates?'))return Response.json([{id:partner,code:'edg-aaaaaaaaaaaa',status:'active',rate_basis_points:2500}]);
  if(url.includes('/edgoria_referral_attributions?'))return Response.json([{attributed_at:'2026-11-10T16:00:00Z'}]);
  if(url.includes('/edgoria_partner_commissions?'))return Response.json([{id:'x',status:commissionState,commission_cents:275,created_at:'2026-11-10T16:01:00Z'}]);
  throw Error('Unexpected path '+url);
 };
 try{
  const pending=await (await portal.fetch(fakeRequest())).json();
  assert.equal(pending.commission_cents.pending,275);
  assert.equal(pending.commission_cents.paid,0);
  commissionState='paid';
  const paid=await (await portal.fetch(fakeRequest())).json();
  assert.equal(paid.commission_cents.pending,0);
  assert.equal(paid.commission_cents.paid,275);
  assert.equal(paid.commission_history[0].status,'paid');
  assert.equal(JSON.stringify(paid).includes(me),false);
 }finally{
  global.fetch=fetchOrig;
  for(const [key,value] of Object.entries(saved)){
   if(value===undefined)delete process.env[key];else process.env[key]=value;
  }
 }
});

test('la interfaz comprueba el panel en la pestaña visible sin borrar formularios en uso',()=>{
 const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.match(js,/setInterval\(pollAffiliateDashboard,20000\)/);
 assert.match(js,/addEventListener\('focus',pollAffiliateDashboard\)/);
 assert.match(js,/document\.hidden\|\|busy/);
 assert.match(js,/\$\('#partner-application-form'\)/);
 assert.match(js,/const changed=await refreshAffiliatePortal\(\)/);
});

test('las tarjetas muestran señal visual sin cambiar los textos de compatibilidad',()=>{
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 assert.match(html,/aria-label="MetaTrader 5 disponible"/);
 assert.match(html,/aria-label="cTrader próximamente"/);
 assert.match(html,/No se promete una fecha de lanzamiento/);
});
