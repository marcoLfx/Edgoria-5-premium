import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../public/',import.meta.url);
const src=fs.readFileSync(new URL('app.js',root),'utf8');
const css=fs.readFileSync(new URL('styles.css',root),'utf8');
const html=fs.readFileSync(new URL('index.html',root),'utf8');
const begin=src.indexOf('/* NEO 12: SVG charts');
const end=src.indexOf('\nfunction mindset()',begin);
assert.ok(begin>0&&end>begin);
const state={period:'1',analysisDate:'',role:'trader',account:'all'};
const ctx=vm.createContext({state,eg14AccountsCapital:()=>10000,realizedCurve:(rows)=>{let v=0;return Object.entries(Object.groupBy(rows,t=>t.closed_at.slice(0,10))).sort((a,b)=>a[0].localeCompare(b[0])).map(([date,tr])=>{const pnl=tr.reduce((s,t)=>s+Number(t.pnl),0);v+=pnl;return {date,pnl,cumulative:v,capitalEstimate:10000+v}})},Math,Number,Date,String,Object,Map,activeTradingDay:()=> '2026-10-27',isValidDay:()=>false,escapeHTML:v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),usd:n=>(Number(n)<0?'−':'')+'$'+Math.abs(Number(n)).toFixed(2),configuredCalendarPreset:()=> 'ny_close',CALENDAR_PRESETS:{ny_close:{label:'Cierre NY'}},dailyRealizedPnL:trades=>Object.entries(Object.groupBy(trades,t=>t.closed_at.slice(0,10))).map(([date,v])=>({date,pnl:v.reduce((a,t)=>a+t.pnl,0),count:v.length})).sort((a,b)=>a.date.localeCompare(b.date)),sessionWeekday:date=>new Date(date).getUTCDay(),tradingSessionDay:date=>date.slice(0,10),visibleTrades:()=>[],stats:()=>({grossWin:0,grossLoss:0,maxDd:0,avgR:null,total:0}),pageTitle:(_,title,__,action)=>`<h1>${title}</h1>${action||''}`});
vm.runInContext(src.slice(begin,end),ctx);
test('Neo 12 ships interactive period controls and preserves MT5 Bridge navigation',()=>{
 const periods=vm.runInContext('neoPeriodControl()',ctx);
 for(const code of ['7','30','90','all'])assert.match(periods,new RegExp(`data-period="${code}"`));
 assert.match(src,/case 'neo-period'/);
 assert.match(src,/data-view="connect"/);
 assert.doesNotMatch(src,/data-view="upload"/);
 assert.match(html,/styles\.css\?v=17\.0/);
});
test('Charts use actual values and show meaningful empty states without invented performance',()=>{
 assert.match(vm.runInContext('neoEquityChart([])',ctx),/No hay cierres MT5/);
 assert.match(vm.runInContext('neoSessionPlot([])',ctx),/sesiones identificadas/);
 const data=[{closed_at:'2026-09-01T19:00:00Z',pnl:100,session:'Londres',symbol:'XAUUSD',strategy:'Breakout',risk:50},{closed_at:'2026-09-02T19:00:00Z',pnl:-25,session:'Nueva York',symbol:'EURUSD',strategy:'Scalping',risk:25}];
 ctx.fixture=data;
 assert.match(vm.runInContext('neoEquityChart(fixture)',ctx),/75\.00/);
 assert.match(vm.runInContext('neoSessionPlot(fixture)',ctx),/Londres/);
 assert.match(vm.runInContext("neoHorizontalBars(neoGroups(fixture,'symbol'))",ctx),/XAUUSD/);
 assert.match(vm.runInContext('neoDrawdownChart(fixture)',ctx),/drawdown|Drawdown|Retroceso/);
});
test('UI preserves data privacy and clear closed-trade-only caveat',()=>{
 assert.match(src,/no se inventan|Los valores N\/D/);
 assert.match(src,/Clasificación real por símbolo MT5/);
 assert.match(src,/El drawdown mostrado es realizado/);
 assert.match(css,/neo-analytics/);
 assert.match(css,/@media\(max-width:560px\)/);
});
