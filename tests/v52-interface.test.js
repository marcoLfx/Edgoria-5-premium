import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/edgoria52.css',import.meta.url),'utf8');
test('EDGORIA 5.2 loads its own UI without replacing existing application imports',()=>{
 assert.match(html,/edgoria52\.css\?v=5\.2\.0/);
 assert.match(html,/app\.js\?v=5\.2\.0/);
 assert.match(app,/from '\.\/trading-day\.js'/);
 assert.match(app,/from '\.\/performance14\.js/);
});
test('Overview preserves real metrics at the top of the dashboard',()=>{
 const dash=app.slice(app.indexOf('function dashboard(){'),app.indexOf('function tradesView(){'));
 for(const label of ['Net P&L','Win Rate','Profit Factor','RR Promedio','Operaciones'])assert.ok(dash.includes(label),label);
 assert.ok(dash.indexOf('ed51-metrics') < dash.indexOf('ed51-chart-row'));
 assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)!important/);
});
test('Analytics moves advanced diagnostics into a disclosure and keeps real calculations',()=>{
 const analytics=app.slice(app.indexOf('function analytics(){'),app.indexOf('function mindset(){'));
 assert.match(analytics,/visibleTrades\(\)/);
 assert.match(analytics,/stats\(arr\)/);
 assert.match(analytics,/eg52-advanced/);
 assert.match(analytics,/<summary>/);
 assert.match(analytics,/neoEquityChart\(arr\)/);
 assert.match(analytics,/neoHorizontalBars/);
 assert.match(analytics,/neoWeekPlot\(arr\)/);
});
test('No funded withdrawals UI rendered; keeps historical data intact',()=>{
 assert.doesNotMatch(app,/function payoutModal\(/);
 assert.doesNotMatch(app,/function eg16FundedPayouts\(/);
 assert.doesNotMatch(app,/form\.id==='payout-form'/);
 assert.match(app,/edgoria_v4_cash_movements/);
 assert.match(app,/payouts:\[\]/);
});
test('Reduced motion and responsive layout supported',()=>{
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/max-width:520px/);
 assert.match(css,/focus-visible/);
});
