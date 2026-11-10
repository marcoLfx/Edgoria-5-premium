import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const publicDir=new URL('../public/',import.meta.url),root=new URL('../',import.meta.url);
const v=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
const paths=new Set(v.rewrites.map(r=>r.source));
function linkCheck(file){
 const html=readFileSync(new URL(file,publicDir),'utf8');
 const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
 for(const m of html.matchAll(/\bhref="([^"]+)"/g)){
  const href=m[1];if(/^(?:https?:|mailto:|tel:|javascript:)/.test(href))continue;
  if(href.startsWith('#')){assert.ok(ids.has(href.slice(1)),`Anchor ${href} missing in ${file}`);continue}
  if(!href.startsWith('/'))continue;
  const pathname=href.split('?')[0].split('#')[0];
  assert.ok(paths.has(pathname)||existsSync(new URL(pathname.slice(1),publicDir))||pathname==='/',`Broken internal link ${href} in ${file}`);
 }
}
test('landing internal links and anchor targets',()=>linkCheck('index.html'));
test('affiliate landing internal legal and access links',()=>linkCheck('afiliados.html'));
