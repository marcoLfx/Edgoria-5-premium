// EDGORIA NEO 14 — descriptive metrics based exclusively on CLOSED trades.
// Nominal-capital percentages are NOT actual account returns or a prop-firm risk calculation.
import {tradingSessionDay} from './trading-day.js';
const amount = x => Number(x);
export const isValidDay = x => /^\d{4}-\d{2}-\d{2}$/.test(String(x||'')) && !Number.isNaN(Date.parse(x+'T12:00:00Z')) && new Date(x+'T12:00:00Z').toISOString().slice(0,10)===x;
export function nominalCapital(accounts=[], selected='all') {
 const eligible=accounts.filter(a=>(selected==='all'||a.id===selected)&&Number.isFinite(amount(a.account_size))&&amount(a.account_size)>0);
 return eligible.length ? eligible.reduce((s,a)=>s+amount(a.account_size),0) : null;
}
export const nominalPct=(pnl,capital)=>Number.isFinite(Number(capital))&&Number(capital)>0?Number(pnl)/Number(capital)*100:null;
export const knownLots=(trades=[])=>{
 const values=trades.map(t=>amount(t.volume_lots)).filter(n=>Number.isFinite(n)&&n>0);
 return {average:values.length?values.reduce((s,n)=>s+n,0)/values.length:null,count:values.length,total:values.reduce((s,n)=>s+n,0)};
};
export function dailyPerformance(trades=[],preset='ny_close') {
 const byDay=new Map();
 const sorted=[...trades].filter(t=>Number.isFinite(amount(t.pnl))&&Number.isFinite(Date.parse(t.closed_at)))
  .sort((a,b)=>Date.parse(a.closed_at)-Date.parse(b.closed_at)||String(a.id||a.position_id||'').localeCompare(String(b.id||b.position_id||'')));
 for(const t of sorted){
  const date=tradingSessionDay(t.closed_at,preset);if(!date)continue;
  if(!byDay.has(date))byDay.set(date,{date,pnl:0,count:0,wins:0,losses:0,equity:0,peak:0,drawdown:0});
  const d=byDay.get(date),n=amount(t.pnl);d.pnl+=n;d.count++;
  if(n>0)d.wins++;else if(n<0)d.losses++;
  d.equity+=n;d.peak=Math.max(d.peak,d.equity);d.drawdown=Math.max(d.drawdown,d.peak-d.equity);
 }
 return [...byDay.values()].sort((a,b)=>a.date.localeCompare(b.date)).map(({equity,peak,...r})=>({...r,pnl:Math.round(r.pnl*1000000)/1000000,drawdown:Math.round(r.drawdown*1000000)/1000000}));
}
export function dailyRecords(trades=[],preset='ny_close') {
 const days=dailyPerformance(trades,preset);
 const wins=days.filter(day=>day.pnl>0),losses=days.filter(day=>day.pnl<0);
 const best=wins.reduce((a,b)=>!a||b.pnl>a.pnl?b:a,null);
 const worst=losses.reduce((a,b)=>!a||b.pnl<a.pnl?b:a,null);
 const tradesClean=trades.filter(t=>Number.isFinite(Number(t.pnl)));
 const bestTrade=tradesClean.filter(t=>Number(t.pnl)>0).reduce((a,b)=>!a||Number(b.pnl)>Number(a.pnl)?b:a,null);
 const worstTrade=tradesClean.filter(t=>Number(t.pnl)<0).reduce((a,b)=>!a||Number(b.pnl)<Number(a.pnl)?b:a,null);
 return {best,worst,bestTrade,worstTrade,days};
}
export function realizedCurve(trades=[],preset='ny_close',capital=null){
 const rows=dailyPerformance(trades,preset);let cumulative=0;
 return rows.map(r=>{cumulative+=r.pnl;return {...r,cumulative,capitalEstimate:capital>0?capital+cumulative:null,percentage:nominalPct(cumulative,capital)}});
}
export function periodSummary(trades=[],preset='ny_close',capital=null){
 const days=dailyPerformance(trades,preset),pnl=days.reduce((s,d)=>s+d.pnl,0),wins=trades.filter(t=>Number(t.pnl)>0).length;
 const best=days.length?[...days].sort((a,b)=>b.pnl-a.pnl)[0]:null;
 const worst=days.length?[...days].sort((a,b)=>a.pnl-b.pnl)[0]:null;
 return {days,pnl,percent:nominalPct(pnl,capital),best,worst,winRate:trades.length?wins/trades.length*100:null,drawdownDayMax:days.length?Math.max(...days.map(d=>d.drawdown)):null,drawdownDayPct:days.length?nominalPct(Math.max(...days.map(d=>d.drawdown)),capital):null,lots:knownLots(trades)};
}
export function periodTrades(trades=[],period='30',preset='ny_close',date='',todayIso=new Date().toISOString()){
 if(period==='all')return [...trades];
 const current=tradingSessionDay(todayIso,preset);
 if((period==='1'||period==='today'||period==='date')&&!(period==='date'&&isValidDay(date)))return period==='date'?[]:trades.filter(t=>tradingSessionDay(t.closed_at,preset)===current);
 if(period==='date')return trades.filter(t=>tradingSessionDay(t.closed_at,preset)===date);
 if(!['7','30','90'].includes(String(period)))return [];
 const start=new Date(current+'T12:00:00Z');start.setUTCDate(start.getUTCDate()-Number(period)+1);const lower=start.toISOString().slice(0,10);
 return trades.filter(t=>tradingSessionDay(t.closed_at,preset)>=lower);
}
