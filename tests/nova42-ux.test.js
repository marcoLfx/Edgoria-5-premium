import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const app=read('public/app.js'), html=read('public/index.html'), css=read('public/nova42.css'),landing=read('public/descubre.html');
const journal=app.slice(app.indexOf('function mindset(){'),app.indexOf('function replay(){'));
const overview=app.slice(app.indexOf('function dashboard(){'),app.indexOf('function tradesView(){'));
const analytics=app.slice(app.indexOf('function analytics(){'),app.indexOf('function mindset(){'));
test('NOVA 4.2 ships new uniquely versioned stylesheet, module and landing page',()=>{
 assert.match(html,/nova42\.css\?v=4\.2\.0/);
 assert.match(html,/app\.js\?v=4\.2\.0/);
 assert.match(read('public/release.json'),/"version": "4\.2\.0"/);
 assert.match(landing,/VISTA ILUSTRATIVA/);
 assert.match(landing,/Solicitar acceso a EDGORIA/);
});
test('overview includes a real personal review action and historical metrics still in place',()=>{
 assert.match(overview,/eg42DailyReview\(\)/);
 assert.match(app,/function eg42DailyReview\(\)/);
 assert.match(overview,/neoEquityChart\(arr\)/);
 assert.match(overview,/eg17RiskAside\(r\)/);
 assert.match(overview,/dailyRecords\(visibleTrades\(false\),configuredCalendarPreset\(\)\)/);
 assert.doesNotMatch(overview,/Inventad|fake results/i);
});
test('analytics stops duplicating the redundant insight row but retains actual calculations and funded payout',()=>{
 assert.doesNotMatch(analytics,/class="eg14-analytics-insights"/);
 assert.match(analytics,/neo13-primary-row/);
 assert.match(analytics,/eg16RecordsPanel\(\)/);
 assert.match(analytics,/eg16FundedPayouts\(\)/);
 assert.match(analytics,/eg42-analytics-risk/);
});
test('guided journal retains same private storage and backend form contract',()=>{
 assert.match(journal,/id="mindset-form"/);
 for(const prop of ['entry_date','mood','note','screenshots','discipline'])assert.ok(journal.includes(`name="${prop}"`),prop);
 assert.match(journal,/eg42-template-button/);
 assert.match(app,/case 'journal-template'/);
 assert.match(app,/sb\.storage\.from\('edgoria-journal'\)\.upload/);
 assert.match(app,/journal_entries'\)\.insert/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
test('primary navigation hides unfinished replay from main menu, retains MT5 account and bridge separation',()=>{
 const sidebar=app.slice(app.indexOf('function sidebarNavigation(){'),app.indexOf('function shell(){'));
 assert.doesNotMatch(sidebar,/\['mindset','prop','replay'/);
 assert.match(sidebar,/\['prop','connect'\]/);
 assert.match(app,/function mt5AccountsManager\(\)/);
 assert.match(app,/function connectV4\(\)/);
});
test('commercial page describes product without impossible return, replay or AI guarantees',()=>{
 assert.match(landing,/no un broker|no un proveedor de señales/i);
 assert.match(landing,/No genera rentabilidad/);
 assert.match(landing,/No ejecuta compras o ventas/);
 assert.match(landing,/Acceso sujeto a verificación de correo/);
 assert.doesNotMatch(landing,/rentabilidad garantizada|replay ilimitado incluido/i);
});
