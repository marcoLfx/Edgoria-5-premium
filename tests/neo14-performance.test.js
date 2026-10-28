import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {isValidDay,nominalCapital,nominalPct,dailyPerformance,realizedCurve,periodSummary,knownLots,periodTrades} from '../public/performance14.js';
import {extractNativePositions,extractPositions} from '../server/mt5-spreadsheet.js';
const p='lima16';
const trades=[
 {id:'a',closed_at:'2026-10-25T20:50:00Z',pnl:100,volume_lots:.20},// 15:50 Lima => previous session Oct 24
 {id:'b',closed_at:'2026-10-25T21:01:00Z',pnl:150,volume_lots:.30},// 16:01 Lima => Oct 25
 {id:'c',closed_at:'2026-10-26T01:10:00Z',pnl:-400,volume_lots:null},// 20:10 Lima => Oct 25
 {id:'d',closed_at:'2026-10-26T20:58:00Z',pnl:50} // 15:58 Lima => Oct 25
];
test('calendar session daily results, accurate best/worst and realized intra-day drawdown',()=>{
 const days=dailyPerformance(trades,p);assert.equal(days.length,2);
 assert.equal(days[0].date,'2026-10-24');assert.equal(days[0].pnl,100);
 assert.equal(days[1].date,'2026-10-25');assert.equal(days[1].pnl,-200);
 assert.equal(days[1].drawdown,400);
 const summary=periodSummary(trades,p,10000);
 assert.equal(summary.best.pnl,100);assert.equal(summary.worst.pnl,-200);
 assert.equal(summary.drawdownDayMax,400);assert.equal(summary.drawdownDayPct,4);
});
test('percentages nominal only when account size configured; no division-by-zero',()=>{
 const accounts=[{id:'a',account_size:10000},{id:'b',account_size:5000},{id:'c',account_size:0}];
 assert.equal(nominalCapital(accounts,'all'),15000);
 assert.equal(nominalCapital(accounts,'a'),10000);
 assert.equal(nominalCapital(accounts,'c'),null);
 assert.equal(nominalPct(150,15000),1);
 assert.equal(nominalPct(150,0),null);
});
test('volume averages skip legacy imports with missing volume',()=>{
 assert.deepEqual(knownLots(trades),{average:.25,count:2,total:.5});
 assert.equal(knownLots([{pnl:1}]).average,null);
});
test('exact date and current session are computed from broker day, not midnight',()=>{
 assert.equal(isValidDay('2026-10-25'),true);assert.equal(isValidDay('2026-02-30'),false);
 assert.equal(periodTrades(trades,'date',p,'2026-10-25').length,3);
 assert.equal(periodTrades(trades,'today',p,'','2026-10-26T12:00:00Z').length,3);
 assert.equal(periodTrades(trades,'7',p,'','2026-10-26T12:00:00Z').length,4);
 assert.equal(periodTrades(trades,'date',p,'bad').length,0);
});
test('realized curve returns day point, daily P&L, cumulative and estimated nominal balance',()=>{
 const points=realizedCurve(trades,p,10000);
 assert.equal(points[0].capitalEstimate,10100);
 assert.equal(points[1].capitalEstimate,9900);
 assert.equal(points[1].percentage,-1);
});
test('native MT5 positions retain original lotage',()=>{
 const rows=[['Posición','Símbolo','Tipo','Volumen','Beneficio','Apertura','Cierre','Comisión','Swap'],['123','XAUUSD','buy','0.15','120','2026-10-25 12:00:00','2026-10-25 14:00:00','-2','0']];
 const r=extractNativePositions(rows);
 assert.equal(r.positions.length,1);assert.equal(r.positions[0].volume_lots,.15);
 assert.equal(r.positions[0].pnl,118);
});
test('integration files and UI controls have version 14 with real hover support',()=>{
 const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 assert.match(app,/data-action="neo-period"/);assert.match(app,/\['1','1 día'\]/);
 assert.match(app,/eg14-equity-tooltip/);assert.match(app,/MEJOR DÍA/);assert.match(app,/Lotaje promedio/);
 assert.match(app,/Mis cuentas MT5/);assert.match(app,/MT5 Bridge/);
 assert.match(html,/neo14\.css\?v=17\.0/);
 assert.match(html,/app\.js\?v=4\.2\.0/);
});
