import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const landing=read('../public/index.html'),app=read('../public/app.html'),js=read('../public/app.js'),css=read('../public/edgoria-landing54.css');
test('Landing is the site homepage with full navigation and no obsolete version',()=>{
 assert.match(landing,/<nav class="desktop-links"/);
 for(const id of ['producto','metodo','seguridad','preguntas'])assert.match(landing,new RegExp('id="'+id+'"'));
 assert.doesNotMatch(landing,/NOVA 4\.2/);
 assert.match(landing,/href="\/app\?register=1"/);
 assert.match(landing,/href="\/app"/);
});
test('Private app loads original application and its Supabase routes',()=>{
 assert.match(app,/src="\/app\.js\?v=5\.4\.0"/);
 assert.match(js,/fetch\('\/api\/config'/);
 assert.match(js,/signInWithPassword/);
 assert.match(js,/resetPasswordForEmail/);
 assert.match(js,/loadCloud\(\)/);
});
test('Signup and password recovery return to the private app',()=>{
 assert.match(js,/emailRedirectTo:location\.origin\+'\/app'/);
 assert.match(js,/redirectTo:location\.origin\+'\/app'/);
 assert.match(js,/renderAuth\(new URLSearchParams\(location\.search\)/);
});
test('Marketing supports mobile nav and forwards referral / auth recovery codes',()=>{
 assert.match(landing,/aria-expanded="false"/);
 assert.match(landing,/new URL\('\/app'/);
 assert.match(landing,/u\.searchParams\.set\('ref',code\)/);
 assert.match(css,/@media\(max-width:880px\)/);
});
test('No secret keys or credentials in landing source',()=>{
 assert.doesNotMatch(landing,/sb_secret_[a-zA-Z0-9]{10,}|eyJhbGciOi/);
});

test('Overview risk panel receives the defined risk variable',()=>{
 const dashboard=js.slice(js.indexOf('function dashboard(){'),js.indexOf('function tradesView(){'));
 assert.match(dashboard,/const arr=visibleTrades\(\),s=stats\(arr\),base=eg14AccountsCapital\(\),risk=eg15Risk\(\)/);
 assert.match(dashboard,/eg17RiskAside\(risk\)/);
 assert.doesNotMatch(dashboard,/eg17RiskAside\(r\)/);
});
