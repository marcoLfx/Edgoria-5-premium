import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';

const base=dirname(fileURLToPath(import.meta.url));
test('v4.0.6: pages binds Mis cuentas MT5 and does not reference undefined prop',()=>{
  const js=readFileSync(join(base,'../public/app.js'),'utf8');
  assert.match(js,/const pages=\{[^\n]*prop:accountsView/);
  assert.doesNotMatch(js,/analytics,mindset,prop,replay/);
});
test('v4.0.6: index requests versioned app and catches early JavaScript errors',()=>{
  const html=readFileSync(join(base,'../public/index.html'),'utf8');
  assert.match(html,/src="\/app\.js\?v=4\.2\.0"/);
  assert.match(html,/addEventListener\('error'/);
});

test('v4.0.6: app module executes and reaches setup when Supabase public config is absent',async()=>{
  const root={innerHTML:''};
  globalThis.document={querySelector:s=>s==='#root'?root:null,querySelectorAll:()=>[],addEventListener:()=>{},hidden:false};
  globalThis.window={__edgoriaBootState:{step:'Cargando la aplicación',done:false}};
  globalThis.location={search:'',hash:''};
  globalThis.fetch=async()=>({ok:true,json:async()=>({configured:false})});
  globalThis.setInterval=()=>0;
  await import('../public/app.js');
  // init() is called at the module end and resolves asynchronously.
  for(let attempt=0;attempt<20&&!globalThis.window.__edgoriaBootState.done;attempt++)await new Promise(resolve=>setTimeout(resolve,5));
  assert.equal(globalThis.window.__edgoriaBootState.done,true);
  assert.match(root.innerHTML,/Conexión de datos pendiente/);
});
