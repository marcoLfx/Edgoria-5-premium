import {json,filter,sha256} from '../server/supabase.js';
import {userContext} from '../server/v4-user-data.js';
import {safeError} from '../server/v4-access.js';
import {parseSpreadsheet} from '../server/mt5-spreadsheet.js';
const guid=/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i;
export default {async fetch(req){
 if(req.method!=='POST')return json({error:'Método no permitido'},405);
 try{
  const {user,rest}=await userContext(req),fd=await req.formData(),account_id=String(fd.get('account_id')||'');
  const file=fd.get('file');if(!guid.test(account_id)||!file||typeof file.arrayBuffer!=='function')throw Object.assign(new Error('Selecciona la cuenta y un archivo'),{status:400});
  const owner=await rest('accounts',{query:`id=eq.${filter(account_id)}&user_id=eq.${filter(user.id)}&select=id,account_type`});
  if(owner.length!==1)throw Object.assign(new Error('Cuenta no encontrada'),{status:403});
  if(file.size>3_000_000||file.size===0)throw Object.assign(new Error('Archivo vacío o mayor a 3 MB'),{status:413});
  const filename=String(file.name||'mt5.xlsx').slice(0,180);if(!/\.(csv|xlsx|html|htm)$/i.test(filename))throw Object.assign(new Error('Solo se permiten reportes .xlsx, .csv o .html'),{status:400});
  const buffer=Buffer.from(await file.arrayBuffer()),hash=await sha256(buffer),data=parseSpreadsheet(buffer,filename);
  if(data.report_currency && data.report_currency!=='USD')throw Object.assign(new Error('Esta cuenta está en '+data.report_currency+' y EDGORIA exige reportes USD en esta versión.'),{status:422});
  // Prevent importing one MT5 login's history into a different, linked EDGORIA account.
  const linked=await rest('edgoria_mt5_connections',{query:`account_id=eq.${filter(account_id)}&user_id=eq.${filter(user.id)}&select=mt5_login&limit=1`});
  if(linked?.length && data.report_account_login && String(linked[0].mt5_login)!==data.report_account_login)
    throw Object.assign(new Error('El número de cuenta del Excel no coincide con el login MT5 vinculado a esta ficha. Elige la cuenta correcta.'),{status:422});
  const funded=owner[0].account_type==='funded',movements=funded?(data.cash_movements||[]):[];
  if(!data.positions.length&&!movements.length)throw Object.assign(new Error('No se identificaron posiciones cerradas ni retiros para una cuenta funded. No se importó ningún movimiento.'),{status:422});
  const stats={funded_account:funded,gross_profit:data.gross_profit,gross_loss:data.gross_loss,wins:data.wins,losses:data.losses,break_even:data.break_even,withdrawals_total:funded?data.withdrawals_total:0,deposits_detected:data.deposits_detected};
  const previous=await rest('edgoria_v4_import_batches',{query:`user_id=eq.${user.id}&account_id=eq.${filter(account_id)}&sha256=eq.${hash}&select=id`});
  if(previous.length){
   // Re-reading an already-imported report can safely backfill previously excluded cash withdrawals.
   // Never duplicate trades, never delete the existing import batch.
   if(movements.length){
    const existing=movements.map(m=>({...m,user_id:user.id,account_id,batch_id:previous[0].id}));
    await rest('edgoria_v4_cash_movements',{method:'POST',query:'on_conflict=user_id,account_id,source_reference',body:existing,prefer:'resolution=ignore-duplicates,return=minimal'});
   }
   return json({ok:true,reread_existing:true,...stats,batch_id:previous[0].id,positions:0,inspected_positions:data.positions.length,withdrawals_detected:movements.length,withdrawals_skipped:funded?0:data.cash_movements.length,source_format:data.source_format,reconciled_net:data.reconciled_net??null,warnings:['Archivo analizado de nuevo sin duplicar operaciones ni movimientos registrados.']},200);
  }
  const result=await rest('edgoria_v4_import_batches',{method:'POST',prefer:'return=representation',body:{user_id:user.id,account_id,filename,sha256:hash,total_rows:data.parsed_deals,positions_imported:data.positions.length}});
  const batch=result?.[0];if(!batch?.id)throw Error('No se creó el lote');
  try{
   for(let i=0;i<data.positions.length;i+=200){const records=data.positions.slice(i,i+200).map(p=>({...p,user_id:user.id,account_id,batch_id:batch.id}));await rest('edgoria_v4_file_positions',{method:'POST',body:records,prefer:'return=minimal'})}
   if(movements.length){const records=movements.map(m=>({...m,user_id:user.id,account_id,batch_id:batch.id}));await rest('edgoria_v4_cash_movements',{method:'POST',query:'on_conflict=user_id,account_id,source_reference',body:records,prefer:'resolution=ignore-duplicates,return=minimal'});}
  }
  catch(e){await rest('edgoria_v4_import_batches',{method:'DELETE',query:`id=eq.${filter(batch.id)}&user_id=eq.${user.id}`});throw e}
  return json({ok:true,...stats,batch_id:batch.id,filename,withdrawals_detected:movements.length,withdrawals_skipped:funded?0:(data.cash_movements||[]).length,positions:data.positions.length,parsed_deals:data.parsed_deals,ignored_rows:data.ignored_rows,incomplete_positions:data.incomplete_positions,source:'uploaded_unverified',source_format:data.source_format,report_account_login:data.report_account_login,report_currency:data.report_currency,reconciled_net:data.reconciled_net??null,reported_net:data.report_net??null,warnings:data.warnings||[],timezone_note:'Las horas sin zona horaria se interpretan en UTC; MT5 puede usar la zona del servidor del broker.'},201);
 }catch(e){console.error('v4 upload:',e?.code||e?.message);const [body,status]=safeError(e);return json(body,status)}
}};
