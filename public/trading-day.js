// EDGORIA 10.1: calendar sessions from REAL close timestamps; all zones use IANA DST rules.
// Broker reset times differ; profiles are reporting preferences, NOT compliance verification.
export const TIME_ZONES=Object.freeze(['America/Lima','America/New_York','America/Chicago','Europe/Prague','Europe/Athens','UTC','Europe/London','Europe/Madrid']);
export const DEFAULT_ZONE='America/Lima';
export const CALENDAR_PRESETS=Object.freeze({
  ny_close:{label:'Forex / cierre Nueva York 17:00',zone:'America/New_York',hour:17,dayLabel:'end',detail:'Sesión de 17:00 NY a 17:00 NY; aparece en el día de cierre. Ajuste DST automático.'},
  ftmo:{label:'FTMO / 00:00 CE(S)T',zone:'Europe/Prague',hour:0,dayLabel:'start',detail:'Día civil de 00:00 a 00:00 en hora centroeuropea (con horario de verano).'},
  fundednext:{label:'FundedNext CFD / 00:00 servidor',zone:'Europe/Athens',hour:0,dayLabel:'start',detail:'Día de 00:00 a 00:00 GMT+2/GMT+3, según horario de verano. Comprueba el servidor real.'},
  topstep:{label:'Topstep futures / 17:00 Chicago',zone:'America/Chicago',hour:17,dayLabel:'end',detail:'La actividad posterior a 17:00 CT corresponde a la siguiente jornada. Cierre real de mercado ≈15:10 CT.'},
  lima16:{label:'EDGORIA anterior / 16:00 Lima',zone:'America/Lima',hour:16,dayLabel:'start',detail:'Regla antigua, etiqueta el día en que comienza la jornada 16:00–16:00.'},
  utc:{label:'Día civil UTC / 00:00',zone:'UTC',hour:0,dayLabel:'start',detail:'00:00 a 00:00 UTC.'}
});
const dayShift=(y,m,d,offset=0)=>new Date(Date.UTC(y,m-1,d+offset)).toISOString().slice(0,10);
export function tradingDay(value,zone=DEFAULT_ZONE,cutoffHour=16){
  return tradingSessionDay(value,{zone:TIME_ZONES.includes(zone)?zone:DEFAULT_ZONE,hour:cutoffHour,dayLabel:'start'});
}
export function tradingSessionDay(value,preset='ny_close'){
  const time=new Date(value);
  if(!Number.isFinite(time.getTime()))return '';
  const rule=typeof preset==='string'?(CALENDAR_PRESETS[preset]||CALENDAR_PRESETS.ny_close):preset;
  const zone=TIME_ZONES.includes(rule?.zone)?rule.zone:DEFAULT_ZONE;
  const hourLimit=Number.isInteger(rule?.hour)&&rule.hour>=0&&rule.hour<24?rule.hour:16;
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(time);
  const p=Object.fromEntries(parts.map(a=>[a.type,a.value]));
  const base=hourLimit>0 && Number(p.hour)<hourLimit?-1:0;
  const label=rule?.dayLabel==='end'?1:0;
  return dayShift(+p.year,+p.month,+p.day,base+label);
}
export const tradingWeekday=(value,zone=DEFAULT_ZONE)=>{
  const d=tradingDay(value,zone);return d?new Date(d+'T12:00:00Z').getUTCDay():null;
};
export const sessionWeekday=(value,preset='ny_close')=>{
  const d=tradingSessionDay(value,preset);return d?new Date(d+'T12:00:00Z').getUTCDay():null;
};
export function dailyRealizedPnL(trades=[],preset='ny_close'){
  const result=new Map();
  for(const trade of trades){
    const day=tradingSessionDay(trade.closed_at,preset);
    if(!day)continue;
    const amount=Number(trade.pnl);
    if(!Number.isFinite(amount))continue;
    const current=result.get(day)||{date:day,pnl:0,count:0,wins:0,losses:0,breakeven:0};
    current.pnl+=amount;current.count++;
    if(amount>0)current.wins++;else if(amount<0)current.losses++;else current.breakeven++;
    result.set(day,current);
  }
  return [...result.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
