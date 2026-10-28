import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/neo13.css',import.meta.url),'utf8');
test('NEO 13 loads a unique stylesheet and cache-busted module',()=>{
 assert.match(html,/href="\/neo13\.css\?v=17\.0"/);
 assert.match(html,/src="\/app\.js\?v=4\.2\.0"/);
 assert.match(html,/EDGORIA NOVA 4.2/);
 assert.match(css,/\.neo13-primary-row/);
});
test('NEO 13 follows visual reference: equity and sessions above three comparison charts',()=>{
 const part=app.slice(app.indexOf('function analytics(){'),app.indexOf('function mindset(){'));
 assert.match(part,/neo13-primary-row/);
 assert.match(part,/neo13-secondary-row/);
 assert.match(part,/neoEquityChart\(arr\)/);
 assert.match(part,/neo13Sessions\(arr\)/);
 assert.match(part,/neoWeekPlot\(arr\)/);
 assert.match(part,/neoVerticalBars\(months\.slice\(-7\)/);
 assert.doesNotMatch(part,/neoDrawdownChart\(arr\)/);
});
test('NEO 13 bridge navigation retains the only MT5 import workflow',()=>{
 assert.match(app,/case 'neo13-import'/);
 assert.match(app,/scrollIntoView/);
 assert.match(app,/id="mt5-import-section"/);
 assert.doesNotMatch(app,/n:'Importar Excel MT5'/);
 assert.doesNotMatch(app,/Playbooks/);
});
