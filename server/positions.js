// Reconcile a completed MT5 hedging position. Never invent initial entries or close incomplete histories.
export function positionToTrade(deals,{userId,accountId,connectionKey}){
 const data=[...deals].sort((a,b)=>Date.parse(a.event_time)-Date.parse(b.event_time)||String(a.deal_ticket).localeCompare(String(b.deal_ticket)));
 if(!data.length||data.some(d=>Number(d.entry_code)===2))return null; // netting reversal requires dedicated accounting
 const opened=data.filter(d=>Number(d.entry_code)===0);
 const closed=data.filter(d=>[1,3].includes(Number(d.entry_code)));
 if(!opened.length||!closed.length)return null;
 const sum=x=>x.reduce((n,d)=>n+Number(d.volume),0);
 const openVol=sum(opened),closeVol=sum(closed);
 if(openVol<=0||closeVol+0.000001<openVol||closeVol>openVol+0.000001)return null;
 const base=opened[0],out=closed[closed.length-1];
 if(data.some(d=>d.symbol!==base.symbol))return null;
 const charge=(k)=>data.reduce((s,d)=>s+(Number(d[k])||0),0);
 const total=charge('profit')+charge('commission')+charge('swap')+charge('fee');
 if(!Number.isFinite(total))return null;
 return {
  user_id:userId,account_id:accountId,
  external_id:`mt5:${connectionKey}:${base.position_id}`,
  symbol:String(base.symbol).slice(0,30),direction:base.deal_type,opened_at:base.event_time,closed_at:out.event_time,
  pnl:Math.round(total*100)/100,
  risk:0,volume_lots:Math.round(openVol*100000)/100000,commission:Math.round((charge('commission')+charge('fee'))*100)/100,swap:Math.round(charge('swap')*100)/100,
  strategy:'MT5 importado',session:'Otra',emotion:'',notes:'Sincronizado desde ejecuciones MT5; posición cerrada completamente.',tags:[]
 };
}
