import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/neo17.css',import.meta.url),'utf8');
const part=app.slice(app.indexOf('function dashboard(){'),app.indexOf('\nfunction tradesView(){'));
test('NEO 17 loads its own scoped stylesheet and cache busts public assets',()=>{
 assert.match(html,/neo17\.css\?v=17\.0/);
 assert.match(html,/app\.js\?v=4\.2\.0/);
 assert.match(html,/EDGORIA NOVA 4.2/);
 assert.match(css,/\.eg17-dashboard/);
});
test('overview presents a clear primary outcome, equity and limits without duplicated giant risk tiles',()=>{
 assert.match(part,/eg17-overview/);assert.match(part,/eg17-hero-value/);
 assert.match(part,/eg17RiskAside\(r\)/);
 assert.match(part,/neoEquityChart\(arr\)/);
 assert.doesNotMatch(part,/eg15RiskPanel\(\)/);
 assert.doesNotMatch(part,/Hoy y resultado general/);
});
test('historical best and worst records are one-day net and remain available in Analytics',()=>{
 assert.match(part,/dailyRecords\(visibleTrades\(false\),configuredCalendarPreset\(\)\)/);
 assert.match(part,/eg17RecordMini\(rec\.best,true,base\)/);
 assert.match(part,/eg17RecordMini\(rec\.worst,false,base\)/);
 assert.match(app,/function eg16RecordsPanel\(\)/);
});
test('secondary analyses and calendar configuration remain accessible in a disclosure',()=>{
 assert.match(part,/<details class="eg17-extra">/);
 assert.match(part,/distribution\(s\)/);
 assert.match(part,/dailyPlot\(arr,14\)/);
 assert.match(part,/perfBars\(arr,'symbol'\)/);
 assert.match(part,/calendarConfigUI\(\)/);
 assert.match(app,/function eg16FundedPayouts\(\)/);
});
test('daily and 7/30/90/all date filtering retained, and mobile accessibility styles supplied',()=>{
 assert.match(app,/\['1','1 día'\]/);
 assert.match(app,/id="eg14-date"/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/@media\(max-width:440px\)/);
});
