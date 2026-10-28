import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {closedLossMonitor} from '../public/risk15.js';
import {periodTrades} from '../public/performance14.js';
const p='utc';
const at=(day,hour,pnl,id)=>({id,closed_at:`2026-10-${day}T${hour}:00:00Z`,pnl});

test('1-day filter includes only closes of selected session and date supports exact one-day query',()=>{
 const records=[at('25','10',100,'a'),at('26','10',-50,'b'),at('26','19',30,'c')];
 assert.deepEqual(periodTrades(records,'1',p,'','2026-10-26T21:00:00Z').map(x=>x.id),['b','c']);
 assert.deepEqual(periodTrades(records,'date',p,'2026-10-25').map(x=>x.id),['a']);
});
test('pnl is percentage of nominal and daily 5% and total 10% usage differ',()=>{
 const rows=[at('25','10',150,'a'),at('26','10',-600,'b'),at('26','11',200,'c')];
 const result=closedLossMonitor(rows,10000,p,'2026-10-26');
 assert.equal(result.daily.pnl,-400);
 assert.equal(result.daily.pct,-4);
 assert.equal(result.daily.maxBelowStart,600);
 assert.equal(result.limits.dailyUsd,500);
 assert.equal(result.limits.dailyUtilization,120);
 assert.equal(result.total.pnl,-250);
 assert.equal(result.total.pct,-2.5);
 assert.equal(result.total.maxBelowInitial,450);
 assert.equal(result.limits.totalUsd,1000);
 assert.equal(result.limits.totalUtilization,45);
});
test('total drawdown from high water mark differs from reduction below starting nominal',()=>{
 const r=closedLossMonitor([at('25','10',900,'a'),at('26','10',-1000,'b')],10000,p,'2026-10-26');
 assert.equal(r.total.maxDrawdown,1000);
 assert.equal(r.total.drawdownPct,10);
 assert.equal(r.total.maxBelowInitial,100);
 assert.equal(r.total.maxBelowInitialPct,1);
 assert.equal(r.limits.totalUtilization,10);
});
test('selected day and overall historical data remain independent',()=>{
 const r=closedLossMonitor([at('25','10',-400,'a'),at('26','10',50,'b')],10000,p,'2026-10-25');
 assert.equal(r.daily.pnl,-400);
 assert.equal(r.total.pnl,-350);
 assert.equal(r.limits.dailyUtilization,80);
});
test('missing capital produces N/D rather than false percentages or limits',()=>{
 const r=closedLossMonitor([at('25','10',-75,'a')],null,p,'2026-10-25');
 assert.equal(r.daily.pct,null);
 assert.equal(r.total.pct,null);
 assert.equal(r.limits.dailyUtilization,null);
 assert.equal(r.limits.totalUsd,null);
});
test('no closed trades gives zero results and zero limit usage when capital is known',()=>{
 const r=closedLossMonitor([],10000,p,'2026-10-27');
 assert.equal(r.daily.pnl,0);
 assert.equal(r.total.maxDrawdown,0);
 assert.equal(r.limits.dailyUtilization,0);
});
test('same timestamp event order is deterministic and only valid records count',()=>{
 const records=[{...at('25','10',-500,'z')},{...at('25','10',800,'a')},{closed_at:'bad',pnl:123}];
 const r=closedLossMonitor(records,10000,p,'2026-10-25');
 assert.equal(r.total.count,2);
 assert.equal(r.total.maxBelowInitial,0);
 assert.equal(r.total.maxDrawdown,500);
});
test('NEO 15 dashboard always shows 1-day, date picker, limits and explicit build marker',()=>{
 const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('../public/neo15.css',import.meta.url),'utf8');
 assert.match(app,/period:'1'/);
 assert.match(app,/\['1','1 día'\]/);
 assert.match(app,/Jornada específica/);
 assert.match(app,/const r=eg15Risk\(\)/);
 assert.match(app,/eg15RiskPanel\(true\)/);
 assert.match(app,/EDGORIA NOVA 4.2/);
 assert.match(app,/drawdown|Drawdown/);
 assert.match(html,/neo15\.css\?v=17\.0/);
 assert.match(css,/\.eg15-gauges/);
});
