// EDGORIA NEO 15 — closed-trade-only historical loss metrics.
// Not a prop firm compliance check: ignores open positions, floating P&L,
// balance adjustments, varying reference equity and proprietary provider rules.
import {tradingSessionDay} from './trading-day.js';
import {nominalPct} from './performance14.js';
const finite=x=>Number.isFinite(Number(x))?Number(x):0;
const valid=x=>Number.isFinite(Number(x?.pnl))&&Number.isFinite(Date.parse(x?.closed_at));
const round=x=>{const v=Math.round(x*1e8)/1e8;return Object.is(v,-0)?0:v};
export function closedLossMonitor(trades=[],capital=null,preset='ny_close',day='',dailyLimitPercent=5,totalLimitPercent=10){
 const all=[...trades].filter(valid).sort((a,b)=>Date.parse(a.closed_at)-Date.parse(b.closed_at)||String(a.id||a.position_id||'').localeCompare(String(b.id||b.position_id||'')));
 const daily=all.filter(t=>tradingSessionDay(t.closed_at,preset)===day);
 let cumulative=0,peak=0,highDrawdown=0,minCumulative=0;
 for(const trade of all){cumulative+=finite(trade.pnl);peak=Math.max(0,peak,cumulative);highDrawdown=Math.max(highDrawdown,peak-cumulative);minCumulative=Math.min(minCumulative,cumulative)}
 let dayCumulative=0,dayMin=0,dayPeak=0,dayDrawdown=0;
 for(const trade of daily){dayCumulative+=finite(trade.pnl);dayPeak=Math.max(dayPeak,dayCumulative);dayMin=Math.min(dayMin,dayCumulative);dayDrawdown=Math.max(dayDrawdown,dayPeak-dayCumulative)}
 const hasCapital=Number.isFinite(Number(capital))&&Number(capital)>0;
 const dailyUsd=hasCapital?capital*dailyLimitPercent/100:null,totalUsd=hasCapital?capital*totalLimitPercent/100:null;
 const dailyLoss=round(-dayMin),totalLoss=round(-minCumulative);
 return {
  daily:{date:day,count:daily.length,pnl:round(dayCumulative),pct:hasCapital?nominalPct(dayCumulative,capital):null,maxBelowStart:dailyLoss,maxDrawdown:round(dayDrawdown)},
  total:{count:all.length,pnl:round(cumulative),pct:hasCapital?nominalPct(cumulative,capital):null,maxBelowInitial:totalLoss,maxBelowInitialPct:hasCapital?nominalPct(totalLoss,capital):null,maxDrawdown:round(highDrawdown),drawdownPct:hasCapital?nominalPct(highDrawdown,capital):null,currentDrawdown:round(peak-cumulative)},
  limits:{dailyUsd,totalUsd,dailyUtilization:dailyUsd>0?dailyLoss/dailyUsd*100:null,totalUtilization:totalUsd>0?totalLoss/totalUsd*100:null,dailyLimitPercent,totalLimitPercent}
 };
}
