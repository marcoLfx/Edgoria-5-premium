import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=new URL('../',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,root),'utf8');
const landing=read('public/index.html');
const app=read('public/app.html');
const js=read('public/app.js');
const landingJS=read('public/edgoria-launch55.js');
const css=read('public/edgoria-launch55.css');
const vercel=JSON.parse(read('vercel.json'));
test('landing has branded hero, navigation, viewport and CTA',()=>{
  assert.match(landing,/alt="" width="39" height="39"/);
  assert.match(landing,/<h1 id="hero-title">Cada operación cuenta/);
  assert.match(landing,/aria-label="Principal"/);
  assert.match(landing,/href="\/app\?register=1"/);
  assert.match(landing,/href="\/app"/);
  assert.match(landing,/meta name="viewport"/);
  assert.doesNotMatch(landing,/NOVA 4\.2|Trusted by 100K|500\+ brokers/);
});
test('navigation links resolve to on-page anchors or existing public assets',()=>{
  const anchors=new Set([...landing.matchAll(/\bid="([\w-]+)"/g)].map(m=>m[1]));
  for(const [_,id] of landing.matchAll(/href="#([\w-]+)"/g))assert.ok(anchors.has(id),'Missing #'+id);
  for(const a of ['/app','/app?register=1','/privacidad.html','/terminos.html'])assert.ok(landing.includes('href="'+a+'"'),a);
  assert.ok(vercel.rewrites.some(r=>r.source==='/app'&&r.destination==='/app.html'));
});
test('interactive nav and tabs work and are accessible',()=>{
  assert.match(landing,/aria-controls="mobile-menu"/);
  assert.match(landing,/role="tablist"/);
  assert.equal((landing.match(/role="tab"/g)||[]).length,4);
  assert.match(landingJS,/ArrowRight/);assert.match(landingJS,/setMenu/);
  assert.match(landingJS,/featureContent/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/@media\(max-width:520px\)/);
});
test('demo preview never claims real trading performance',()=>{
  assert.match(landing,/Vista conceptual de interfaz/);
  assert.match(landing,/Importa tu historial para ver tus resultados/);
  assert.match(landing,/No ejecuta órdenes ni genera señales de inversión/);
  assert.doesNotMatch(landing,/\$1,284|64\.8%|100K\+|500\+ br[oó]kers/);
});
test('private journal remains separate, and Overview ReferenceError is fixed',()=>{
  assert.match(app,/src="\/app\.js\?v=5\.5\.0"/);
  assert.match(js,/eg17RiskAside\(risk\)/);
  assert.doesNotMatch(js,/\$\{eg17RiskAside\(r\)\}/);
  assert.match(js,/signInWithPassword/);
  assert.match(js,/resetPasswordForEmail/);
});
test('landing preserves referral and recovery redirects',()=>{
  assert.match(landingJS,/const ref=params\.get\('ref'\)/);
  assert.match(landingJS,/params\.has\('token_hash'\)/);
  assert.match(landingJS,/location\.replace\(redirect\.href\)/);
});
