import {json,rest,sha256,filter} from '../server/supabase.js';
import {positionToTrade} from '../server/positions.js';
const uid=/^\d{1,24}$/;
export default {async fetch(req){
 if(req.method!=='POST')return json({error:'Método no permitido'},405);
 const rawToken=req.headers.get('authorization')||'';
 if(!/^Bearer [a-f0-9]{64}$/.test(rawToken))return json({error:'Token requerido'},401);
 try{
  const hash=await sha256(rawToken.slice(7));
  const tokens=await rest('edgoria_mt5_tokens',{query:`token_sha256=eq.${hash}&select=connection_id`});
  if(tokens?.length!==1)return json({error:'Token revocado o inválido'},401);
  const rows=await rest('edgoria_mt5_connections',{query:`id=eq.${filter(tokens[0].connection_id)}&status=eq.active&select=id,user_id,account_id,mt5_login,server`});
  if(rows?.length!==1)return json({error:'Conexión inactiva'},403);
  const conn=rows[0];
  const bodyString=await req.text();if(bodyString.length>110000)return json({error:'Lote demasiado grande'},413);
  const body=JSON.parse(bodyString);
  if(String(body.login)!==conn.mt5_login||String(body.server)!==conn.server)return json({error:'Cuenta MT5 no coincide'},403);
  if(String(body.currency||'').toUpperCase()!=='USD')return json({error:'La conciliación de EDGORIA 3.0 admite por ahora cuentas MT5 denominadas en USD. No importamos otras divisas sin conversión validada.'},422);
  if(!Array.isArray(body.deals)||body.deals.length>150)return json({error:'Máximo 150 ejecuciones por envío'},400);
  if(!body.deals.length){await rest('edgoria_mt5_connections',{method:'PATCH',query:`id=eq.${filter(conn.id)}`,body:{last_sync_at:new Date().toISOString()}});return json({ok:true,received:0,complete_positions:0})}
  const normalized=[];
  for(const d of body.deals){
   const time=Number(d.time),v=Number(d.volume),entry=Number(d.entry),type=Number(d.type);
   const nums=['profit','commission','swap','fee'].map(x=>Number(d[x]??0));
   if(!uid.test(String(d.ticket))||!uid.test(String(d.position))||!Number.isSafeInteger(time)||time<946684800||time>4102444800||!Number.isFinite(v)||v<=0||v>10000||!Number.isInteger(entry)||entry<0||entry>3||![0,1].includes(type)||nums.some(n=>!Number.isFinite(n)||Math.abs(n)>1e9)||!/^[\w.\-#]{1,30}$/.test(String(d.symbol)))return json({error:'Ejecución inválida'},400);
   normalized.push({connection_id:conn.id,deal_ticket:String(d.ticket),position_id:String(d.position),event_time:new Date(time*1000).toISOString(),symbol:String(d.symbol),deal_type:type===0?'BUY':'SELL',entry_code:entry,volume:v,profit:nums[0],commission:nums[1],swap:nums[2],fee:nums[3]});
  }
  await rest('edgoria_mt5_deals',{method:'POST',query:'on_conflict=connection_id,deal_ticket',prefer:'resolution=ignore-duplicates,return=minimal',body:normalized});
  const positionIds=[...new Set(normalized.map(x=>x.position_id))];let completed=0;
  for(const id of positionIds){
   const ds=await rest('edgoria_mt5_deals',{query:`connection_id=eq.${filter(conn.id)}&position_id=eq.${filter(id)}&order=event_time.asc&limit=1000`});
   if(ds.length===1000)continue; // do not aggregate truncated histories
   const trade=positionToTrade(ds,{userId:conn.user_id,accountId:conn.account_id,connectionKey:`${conn.server}:${conn.mt5_login}`});
   if(trade){await rest('trades',{method:'POST',query:'on_conflict=account_id,external_id',prefer:'resolution=ignore-duplicates,return=minimal',body:trade});completed++}
  }
  await rest('edgoria_mt5_connections',{method:'PATCH',query:`id=eq.${filter(conn.id)}`,body:{last_sync_at:new Date().toISOString()}});
  return json({ok:true,received:normalized.length,complete_positions:completed});
 }catch(e){return json({error:'Sincronización no completada. El conector reintentará.'},500)}
}};
