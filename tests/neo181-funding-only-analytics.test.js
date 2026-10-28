import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/neo181.css',import.meta.url),'utf8');
const view=(fn,next)=>app.slice(app.indexOf(`function ${fn}(`),app.indexOf(`function ${next}(`));
test('bridge only shows concise operational confirmation, no financial cards or payout counters',()=>{
 const bridge=view('v4FilePanel','connectV4');
 assert.match(bridge,/eg181-import-confirmation/);
 assert.match(bridge,/Abrir Analytics/);
 assert.doesNotMatch(bridge,/eg18-receipt|eg18-cards|Ganancias brutas|Pérdidas brutas|Retiros identificados|withdrawals_count|withdrawals_total/);
});
test('funded withdrawals appear only inside Analytics, scoped to funded accounts',()=>{
 const funding=view('eg16FundedPayouts','eg17CompactRiskItem');
 assert.match(funding,/account_type==='funded'/);
 assert.match(funding,/eg181-funded-section/);
 assert.match(funding,/eg181-events/);
 assert.match(funding,/detected.*manual|manual.*detected/s);
 assert.match(view('analytics','mindset'),/eg16FundedPayouts\(\)/);
 assert.doesNotMatch(view('connectV4','partnerDashboard'),/eg16FundedPayouts/);
});
test('NEO 18.1 stylesheet and JS cache bust, scoped responsive styles',()=>{
 assert.match(html,/neo181\.css\?v=18\.1/);
 assert.match(html,/app\.js\?v=4\.2\.0/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/eg181-account-list/);
});
test('frontend update receipt hides cash values and uses Analytics navigation',()=>{
 const form=app.slice(app.indexOf("if(form.id==='v4-upload-form')"),app.indexOf("if(form.id==='recover-form')"));
 assert.match(form,/notify\(out.reread_existing/);
 assert.match(form,/reread:!!out.reread_existing/);
 assert.doesNotMatch(form,/withdrawals_detected|withdrawals_total|breakdown:/);
});
