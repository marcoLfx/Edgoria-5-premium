// EDGORIA V4: strict XLSX / CSV MT5 deals importer, no dependencies or formula execution.
// This parser is deliberately conservative: if a history lacks Position ID / Entry type, refuse rather than invent trades.
import {inflateRawSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {positionToTrade} from './positions.js';
const fail=(message,status=422)=>{throw Object.assign(new Error(message),{status,code:'MT5_FILE_FORMAT'})};
const norm=x=>String(x??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const strip=x=>String(x??'').replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&#39;',"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)));
const numeric=x=>{if(typeof x==='number')return x;let t=String(x??'').trim().replace(/[\s\u00a0$€£]/g,''); if(/^\([0-9.,]+\)$/.test(t))return -numeric(t.slice(1,-1)); if(!t)return NaN; if(t.includes(',')&&t.includes('.')){t=t.lastIndexOf(',')>t.lastIndexOf('.')?t.replaceAll('.','').replace(',','.'):t.replaceAll(',','')}else if(t.includes(',')){const parts=t.split(',');t=parts.length===2&&parts[1].length!==3?t.replace(',','.'):t.replaceAll(',','')}return Number(t)};
export function csvRows(text){
 let data=String(text).replace(/^\uFEFF/,'');const lines=data.split(/\r?\n/).slice(0,12);const delimiter=[',',';','\t'].sort((a,b)=>lines.slice(0,6).reduce((n,l)=>n+l.split(b).length,0)-lines.slice(0,6).reduce((n,l)=>n+l.split(a).length,0))[0];
 let rows=[],row=[],v='',quoted=false;
 for(let i=0;i<data.length;i++){
  const ch=data[i];if(ch==='"'){if(quoted&&data[i+1]==='"'){v+='"';i++}else quoted=!quoted}
  else if(!quoted&&ch===delimiter){row.push(v);v=''}
  else if(!quoted&&(ch==='\r'||ch==='\n')){if(ch==='\r'&&data[i+1]==='\n')i++;row.push(v);if(row.some(c=>String(c).trim()))rows.push(row);row=[];v='';if(rows.length>20005)fail('Máximo 20.000 filas por archivo',413)}
  else v+=ch;
 }
 if(quoted)fail('CSV: comillas sin cerrar');if(v||row.length){row.push(v);rows.push(row)}
 return rows;
}
function decodeXml(bytes){if(bytes.length>=2&&bytes[0]===0xff&&bytes[1]===0xfe)return bytes.subarray(2).toString('utf16le');if(bytes.length>=2&&bytes[0]===0xfe&&bytes[1]===0xff)return new TextDecoder('utf-16be').decode(bytes.subarray(2));return bytes.toString('utf8').replace(/^\uFEFF/,'')};
function unzipXlsx(buffer){
 if(buffer.length>3_000_000)fail('El archivo XLSX supera el máximo de 3 MB',413);
 const eocdSig=0x06054b50;let off=-1;for(let i=buffer.length-22;i>=Math.max(0,buffer.length-65557);i--)if(buffer.readUInt32LE(i)===eocdSig){off=i;break}
 if(off<0)fail('Archivo Excel inválido (ZIP)');const count=buffer.readUInt16LE(off+10),at=buffer.readUInt32LE(off+16);
 if(count>180)fail('Libro Excel demasiado complejo');let p=at,sum=0;const files=new Map();
 for(let i=0;i<count;i++){
  if(p+46>buffer.length||buffer.readUInt32LE(p)!==0x02014b50)fail('Directorio XLSX incorrecto');
  const method=buffer.readUInt16LE(p+10),compressed=buffer.readUInt32LE(p+20),rawLen=buffer.readUInt32LE(p+24);
  const nameLen=buffer.readUInt16LE(p+28),extra=buffer.readUInt16LE(p+30),comment=buffer.readUInt16LE(p+32),local=buffer.readUInt32LE(p+42);
  const name=buffer.toString('utf8',p+46,p+46+nameLen);p+=46+nameLen+extra+comment;
  if(!/^xl\/(?:worksheets\/sheet\d+\.xml|sharedStrings\.xml)$/.test(name))continue;
  if(rawLen>12_000_000||compressed>3_000_000)fail('Tamaño de hoja Excel no permitido');
  if(buffer.readUInt32LE(local)!==0x04034b50)fail('Cabecera XLSX incorrecta');const start=local+30+buffer.readUInt16LE(local+26)+buffer.readUInt16LE(local+28);
  if(start+compressed>buffer.length)fail('Datos XLSX truncados');let data=buffer.subarray(start,start+compressed);
  if(method===8)data=inflateRawSync(data,{maxOutputLength:12_000_001});else if(method!==0)fail('Compresión Excel no soportada');
  sum+=data.length;if(sum>20_000_000)fail('Archivo Excel expandido demasiado grande');files.set(name,decodeXml(data));
 }
 return files;
}
function cellRows(xml,shared){
 const rows=[];for(const row of xml.matchAll(/<(?:[a-zA-Z][\w.-]*:)?row\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z][\w.-]*:)?row>/g)){
  const cols=[];for(const c of row[1].matchAll(/<(?:[a-zA-Z][\w.-]*:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:[a-zA-Z][\w.-]*:)?c>)/g)){
   const attr=c[1]||'',inner=c[2]||'';
   const a=attr.match(/\br="([A-Z]+)\d+"/),idx=a?.[1]?a[1].split('').reduce((p,ch)=>p*26+ch.charCodeAt(0)-64,0)-1:cols.length;
   if(idx>200)continue;const typ=attr.match(/\bt="([^"]+)"/)?.[1];
   const raw=inner.match(/<(?:[a-zA-Z][\w.-]*:)?v(?:\s[^>]*)?>([\s\S]*?)<\/(?:[a-zA-Z][\w.-]*:)?v>/)?.[1];
   const value=typ==='inlineStr'?strip([...inner.matchAll(/<(?:[a-zA-Z][\w.-]*:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:[a-zA-Z][\w.-]*:)?t>/g)].map(m=>m[1]).join('')):typ==='s'?shared[Number(raw)]??'':strip(raw??'');
   cols[idx]=value;
  }
  rows.push(cols);if(rows.length>20005)fail('El archivo supera 20.000 filas',413);
 }
 return rows;
}
function xlsxSheetRows(buffer){
 const files=unzipXlsx(buffer);const raw=files.get('xl/sharedStrings.xml')||'';const shared=[...raw.matchAll(/<(?:[a-zA-Z][\w.-]*:)?si(?:\s[^>]*)?>([\s\S]*?)<\/(?:[a-zA-Z][\w.-]*:)?si>/g)].map(si=>strip([...si[1].matchAll(/<(?:[a-zA-Z][\w.-]*:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:[a-zA-Z][\w.-]*:)?t>/g)].map(m=>m[1]).join('')));
 const sheets=[...files.keys()].filter(x=>x.startsWith('xl/worksheets/')).sort();
 if(!sheets.length)fail('No encontramos hojas en el archivo Excel');
 return sheets.map(s=>cellRows(files.get(s),shared));
}
export function xlsxRows(buffer){
 const candidates=xlsxSheetRows(buffer);
 const best=candidates.find(rows=>findHeader(rows)!==null||findPositionsHeader(rows)!==null)||candidates.find(hasCashTransactionsHeader);
 if(!best)fail('No encontré un historial MT5 reconocible. Se admiten Posiciones, Deals y movimientos de balance identificables.');
 return best;
}

const aliases={ticket:['ticket','deal','dealticket','ejecucion','negociacion'],position:['position','positionid','positionticket','idposicion'],symbol:['symbol','simbolo','activo','instrument'],type:['type','tipo','dealtype','operacion'],entry:['entry','entrada','entrytype','dealentry','directioninout'],volume:['volume','volumen','lots','lotaje'],time:['time','fecha','fechaejecucion','deal_time','timestamp'],profit:['profit','beneficio','ganancia','pnl'],commission:['commission','comision'],swap:['swap','interes'],fee:['fee','cargo','tarifa']};
export function findHeader(rows){for(let i=0;i<Math.min(25,rows.length);i++){
 const names=rows[i].map(norm);const col={};for(const [field,variants] of Object.entries(aliases))col[field]=names.findIndex(n=>variants.map(norm).includes(n));
 if(['ticket','position','symbol','type','entry','volume','time','profit'].every(x=>col[x]>=0))return {at:i,col};
 }return null}
// MT5's native Excel report contains separate Posiciones / Orders / Transacciones / Resultados
// sheets/sections. The Posiciones table already contains reconciled fully-closed positions
// with open/close timestamps and aggregate commissions. Do not require Deal Position ID here.
const positionAliases={
 position:['position','posicion','positionid','idposicion','ticket'],
 symbol:['symbol','simbolo','activo','instrument','instrumento'],
 type:['type','tipo','direccion','direction','side'],
 volume:['volume','volumen','lots','lotaje','vol'],
 profit:['profit','beneficio','ganancia','pnl','netprofit','result','resultado'],
 commission:['commission','comision','comisiones'],
 swap:['swap','interes','intereses'],fee:['fee','tasa','cargo','tarifa']
};
const colMatch=(names,variants)=>names.findIndex(n=>variants.includes(n));
export function findPositionsHeader(rows){
 for(let i=0;i<Math.min(90,rows.length);i++){
  const names=(rows[i]||[]).map(norm),col={};
  for(const [field,aliases] of Object.entries(positionAliases))col[field]=colMatch(names,aliases);
  if(!['position','symbol','type','volume','profit'].every(k=>col[k]>=0))continue;
  const dts=names.map((v,j)=>(['time','datetime','fechahora','hora','date'].includes(v)?j:-1)).filter(x=>x>=0);
  let open=colMatch(names,['opentime','openingtime','fechaapertura','horadeapertura','fechaentrada','apertura']);
  let close=colMatch(names,['closetime','closingtime','fechacierre','horadecierre','fechasalida','cierre']);
  if(open<0)open=dts[0]??-1;
  if(close<0)close=dts.find(j=>j!==open)??-1;
  if(open>=0&&close>=0&&open!==close)return {at:i,col:{...col,open,close}};
 }
 return null;
}
function roundMoney(n){return Math.round((n+Number.EPSILON)*100)/100}
function reportMeta(rows){
 let accountLogin=null,currency=null,reportedNet=null;
 for(const row of rows){
  const k=norm(row?.[0]);
  if(['cuentadetrading','tradingaccount','account','cuenta','handelskonto','comptedetrading'].includes(k)){
   const text=row.filter(x=>x!==null&&x!==undefined).map(String).join(' ');
   const match=text.match(/\b(\d{3,24})\s*\(\s*([A-Z]{3})\s*[,;)]/);
   if(match){accountLogin=match[1];currency=match[2]}
   else{const cur=text.match(/\b(USD|EUR|GBP|JPY|AUD|CAD|CHF|PEN)\b/);if(cur)currency=cur[1]}
  }
  if(['beneficioneto','netprofit','ganancianeta','resultadoneto'].includes(k)){
   const vals=row.slice(1).map(numeric).filter(Number.isFinite);
   if(vals.length)reportedNet=vals[0];
  }
 }
 return {account_login:accountLogin,currency,reported_net:reportedNet};
}
export function extractNativePositions(rows){
 const h=findPositionsHeader(rows);
 if(!h)fail('El archivo MT5 no contiene la tabla de Posiciones cerradas que necesitamos.');
 const {at,col}=h,positions=[],seen=new Set();let ignored=0;
 const meta=reportMeta(rows);
 if(meta.currency&&meta.currency!=='USD')fail('El reporte está en '+meta.currency+'. Esta versión del journal solo admite cuentas USD para evitar cálculos de P&L incorrectos.');
 for(const row of rows.slice(at+1)){
  const first=norm(row?.[0]);
  if(['ordenes','orders','transacciones','transactions','deals','operaciones','resultados','results','summary','resumen'].includes(first))break;
  const get=k=>row[col[k]],id=String(get('position')??'').trim(),symbol=String(get('symbol')??'').trim();
  if(!/^\d{1,24}$/.test(id)||!/^[-\w.#]{1,30}$/.test(symbol)){if(row.some(v=>v!==null&&String(v??'').trim()))ignored++;continue}
  const direction=typeOf(get('type')),vol=numeric(get('volume'));
  const opened=dateUTC(get('open')),closed=dateUTC(get('close'));
  const gross=numeric(get('profit'));
  const commission=col.commission<0?0:numeric(get('commission')||0);
  const swap=col.swap<0?0:numeric(get('swap')||0);
  const fee=col.fee<0?0:numeric(get('fee')||0);
  if(seen.has(id))fail('La posición '+id+' aparece repetida. Exporta el informe de MT5 sin combinar tablas o archivos.');
  if(!direction||!opened||!closed||Date.parse(closed)<Date.parse(opened)||!Number.isFinite(vol)||vol<=0||![gross,commission,swap,fee].every(Number.isFinite)){ignored++;continue}
  seen.add(id);positions.push({position_id:id,symbol,direction,opened_at:opened,closed_at:closed,pnl:roundMoney(gross+commission+swap+fee),commission:roundMoney(commission+fee),swap:roundMoney(swap),volume_lots:vol});
  if(positions.length>20000)fail('El informe supera 20.000 posiciones',413);
 }
 if(!positions.length)fail('La sección Posiciones de MT5 no contiene cierres completos válidos. Revisa el período del reporte.');
 const sumNet=roundMoney(positions.reduce((v,p)=>v+p.pnl,0));
 const diff=meta.reported_net===null?null:roundMoney(sumNet-meta.reported_net);
 const warnings=[];
 if(meta.reported_net!==null&&Math.abs(diff)>0.05)warnings.push('El P&L no coincide con el resumen del broker (diferencia '+diff.toFixed(2)+' USD). Revisa si el archivo abarca el período completo.');
 if(col.commission<0)warnings.push('No se encontró columna de comisiones: comprueba si están incluidas en Beneficio.');
 if(!meta.currency)warnings.push('El informe no indica la moneda. Confirma que la cuenta esté en USD.');
 return {positions,parsed_deals:positions.length,ignored_rows:ignored,incomplete_positions:0,source_format:'mt5_positions_report',report_account_login:meta.account_login,report_currency:meta.currency,report_net:meta.reported_net,reconciled_net:sumNet,reconciliation_delta:diff,warnings};
}
function htmlTextRows(text){
 // No HTML execution, rendering or storage; only table cell text is parsed.
 const cleaned=String(text).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'');
 const rows=[];
 for(const m of cleaned.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  const cells=[...m[1].matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map(x=>strip(x[1].replace(/<[^>]+>/g,'').replace(/&nbsp;/gi,' ')));
  if(cells.some(v=>v.trim()))rows.push(cells);
  if(rows.length>20005)fail('El reporte HTML excede 20.000 filas',413);
 }
 return rows;
}
// MT5 balance/cash movements are NEVER trade profit or loss.
// Classify only known cash operations; a negative amount alone is not a payout.
const cashHeaderAliases={
 time:['fechahora','datetime','time','date','fecha','timestamp','operationtime','dealdate'],
 ticket:['transaccion','transaction','deal','ticket','ejecucion','dealid','operationid','id','referencia','reference'],
 type:['tipo','type','dealtype','operationtype','movimiento','movement','operacion','operation'],
 amount:['beneficio','profit','pnl','amount','importe','monto','cambioenbalance','balancechange','change','netamount'],
 comment:['comentario','comment','description','descripcion','reason','detalle','concepto','memo','note','notas']
};
function cashHeader(row){
 const cols=(row||[]).map(norm),found={};
 for(const [key,values] of Object.entries(cashHeaderAliases))found[key]=cols.findIndex(c=>values.includes(c));
 return found.time>=0&&found.amount>=0&&(found.type>=0||found.comment>=0)?found:null;
}
function hasCashTransactionsHeader(rows){return rows.some(row=>cashHeader(row)!==null)}
const withdrawalTerms=/(?:\bwithdraw(?:al|l|n|ed|ing)?\b|\bwitdraw(?:al|l)?\b|\bwithraw(?:al)?\b|\bwthdraw(?:al)?\b|\bpayouts?\b|\bpay[ -]?outs?\b|\bcash[ -]?outs?\b|\bretiros?\b|\bretirad[ao]s?\b|\bretrait\b|\bsaque\b|\bprofit[ -]?(?:split|share)\b|\bdisbursement\b|\bpayment to trader\b|\bprofit distribution\b|\bpago de (?:beneficios|ganancias)\b)/i;
const excludedCashTerms=/(?:\bfees?\b|\bcommission\b|\bcomision(?:es)?\b|\bcargo\b|\bajuste\b|\badjustment\b|\bchargeback\b|\binternal[ -]?transfer\b|\btransferencia interna\b|\bimpuesto\b|\btax\b|\brevers(?:al|ed|o)?\b|\breversal\b|\brefund\b|\breembolso\b|\bcancel(?:led|ed|ado|ada|acion)?\b|\banulad[ao]\b|\breject(?:ed|ion)?\b|\brechazad[ao]\b)/i;
const depositTerms=/(?:\bdeposit(?:o|s)?\b|\btop[ -]?up\b|\brecarga\b|\bfunding\b|\bonboarding\b|\bcredit\b|\bingreso de capital\b)/i;
const cashTypes=new Set(['balance','2','withdraw','withdrawal','withdrawl','witdrawl','payout','cashout','retiro','retirada','debit','deposit','deposito','credit','cash','banktransfer']);
function movementKind(rawType,label,amount){
 const typ=norm(rawType),normalized=String(label||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(!Number.isFinite(amount)||Math.abs(amount)<0.005||excludedCashTerms.test(normalized))return null;
 const kind=cashTypes.has(typ),withdrawal=withdrawalTerms.test(normalized)||withdrawalTerms.test(String(rawType||''));
 const deposit=depositTerms.test(normalized)||depositTerms.test(String(rawType||''));
 // Descriptive metadata is essential; balance +/- is not proof of transfer.
 if(withdrawal&&amount<0&&(kind||!typ))return 'withdrawal';
 if(deposit&&amount>0&&(kind||!typ))return 'deposit';
 return null;
}
// Publicly testable, readonly classifications (deposits not stored in withdrawal table).
export function extractCashMovements(rows=[]){
 const withdrawals=[],deposits=[],seen=new Set();
 for(let i=0;i<rows.length;i++){
  const header=cashHeader(rows[i]);if(!header)continue;
  for(const row of rows.slice(i+1)){
   if(cashHeader(row))break;
   const marker=norm(row?.[0]);
   if(['resultados','results','resumen','summary','ordenes','orders','posiciones','positions','estadisticas','statistics'].includes(marker))break;
   const get=k=>header[k]>=0?row[header[k]]:undefined;
   const amt=numeric(get('amount')),rawType=String(get('type')??''),label=String(get('comment')??'').trim(),kind=movementKind(rawType,label,amt);
   if(!kind)continue;
   const when=dateUTC(get('time'));if(!when)continue;
   let rawId=String(get('ticket')??'').trim();
   if(rawId&&!/^[a-z0-9_.:-]{1,60}$/i.test(rawId))rawId='';
   // Stable source reference across repeat exports; fall back to timestamp+amount+descriptor.
   const key=rawId?'mt5:'+rawId:'mt5:hash:'+createHash('sha256').update([when,amt.toFixed(2),norm(rawType),norm(label)].join('|')).digest('hex').slice(0,28);
   if(seen.has(key))continue;
   seen.add(key);
   const item={source_reference:key,event_time:when,amount:Math.abs(roundMoney(amt)),event_type:kind,description:label.slice(0,300)};
   if(kind==='withdrawal')withdrawals.push(item);else deposits.push(item);
   if(withdrawals.length+deposits.length>700)fail('Demasiados movimientos de balance en un archivo (máximo 700)',413);
  }
 }
 return {withdrawals,deposits};
}
export function extractCashWithdrawals(rows=[]){return extractCashMovements(rows).withdrawals}

function dateUTC(value){
 if(typeof value==='number'||(/^\d+(\.\d+)?$/.test(String(value))&&Number(value)>20000&&Number(value)<100000)){
  const d=new Date(Date.UTC(1899,11,30)+Number(value)*86400000);if(!Number.isNaN(d.getTime()))return d.toISOString();
 }
 let text=String(value??'').trim().replace(/^(\d{4})[.\/](\d\d)[.\/](\d\d)/,'$1-$2-$3').replace(/^(\d{2})[.\/-](\d{2})[.\/-](\d{4})(?= |$)/,'$3-$2-$1').replace(/^(\d{4}-\d\d-\d\d) (\d\d:\d\d)/,'$1T$2');
 const d=new Date(/[Zz]|[+-]\d\d:\d\d$/.test(text)?text:text+'Z');return Number.isNaN(d.getTime())?null:d.toISOString();
}
function typeOf(value){const k=norm(value);if(['buy','compra','0'].includes(k))return 'BUY';if(['sell','venta','1'].includes(k))return 'SELL';return null}
function entryOf(value){const k=norm(value);if(['in','0','entrada'].includes(k))return 0;if(['out','1','salida'].includes(k))return 1;if(['inout','2'].includes(k))return 2;if(['outby','3'].includes(k))return 3;return null}
export function extractPositions(rows){
 const meta=findHeader(rows);if(!meta)fail('Formato no reconocido. Exporta Deals de MT5 con Ticket, Position, Symbol, Type, Entry, Time, Volume y Profit.');
 const {at,col}=meta,groups=new Map();let accepted=0,skipped=0;
 for(const row of rows.slice(at+1)){
  const get=k=>row[col[k]],ticket=String(get('ticket')??'').trim(),pos=String(get('position')??'').trim(),symbol=String(get('symbol')??'').trim();
  if(!/^\d{1,24}$/.test(ticket)||!/^\d{1,24}$/.test(pos)||!/^[\w.#-]{1,30}$/.test(symbol)){skipped++;continue}
  const type=typeOf(get('type')),entry=entryOf(get('entry')),vol=numeric(get('volume')),iso=dateUTC(get('time'));
  const profit=numeric(get('profit')),commission=col.commission<0?0:numeric(get('commission')||0),swap=col.swap<0?0:numeric(get('swap')||0),fee=col.fee<0?0:numeric(get('fee')||0);
  if(!type||entry===null||!iso||!Number.isFinite(vol)||vol<=0||![profit,commission,swap,fee].every(Number.isFinite)){skipped++;continue}
  const arr=groups.get(pos)||[];arr.push({deal_ticket:ticket,position_id:pos,event_time:iso,symbol,deal_type:type,entry_code:entry,volume:vol,profit,commission,swap,fee});groups.set(pos,arr);accepted++;
 }
 if(!accepted)fail('El archivo no contiene ejecuciones MT5 utilizables. Comprueba encabezados, fechas y columnas de entrada/salida.');
 const completed=[];let openPositions=0;
 for(const [id,deals] of groups){const t=positionToTrade(deals,{userId:'00000000-0000-0000-0000-000000000001',accountId:'00000000-0000-0000-0000-000000000002',connectionKey:'file'});if(!t){openPositions++;continue}completed.push({position_id:id,symbol:t.symbol,direction:t.direction,opened_at:t.opened_at,closed_at:t.closed_at,pnl:t.pnl,commission:t.commission,swap:t.swap,volume_lots:t.volume_lots})}
 return {positions:completed,parsed_deals:accepted,ignored_rows:skipped,incomplete_positions:openPositions};
}
function summaryOfPositions(data){
 const positions=data.positions||[];
 const gross_profit=roundMoney(positions.filter(p=>p.pnl>0).reduce((sum,p)=>sum+Number(p.pnl),0));
 const gross_loss=roundMoney(Math.abs(positions.filter(p=>p.pnl<0).reduce((sum,p)=>sum+Number(p.pnl),0)));
 return {...data,gross_profit,gross_loss,wins:positions.filter(p=>p.pnl>0).length,losses:positions.filter(p=>p.pnl<0).length,break_even:positions.filter(p=>p.pnl===0).length};
}
export function parseSpreadsheet(buffer,filename){
 const ext=String(filename).split('.').pop().toLowerCase();let rows,grids;
 if(ext==='csv'){if(buffer.length>3_000_000)fail('CSV demasiado grande',413);rows=csvRows(buffer.toString('utf8'));grids=[rows]}
 else if(ext==='xlsx'){
  grids=xlsxSheetRows(buffer);
  rows=grids.find(sheet=>findHeader(sheet)!==null||findPositionsHeader(sheet)!==null)||grids.find(hasCashTransactionsHeader)||grids[0];
 }
 else if(ext==='html'||ext==='htm'){if(buffer.length>3_000_000)fail('Reporte HTML demasiado grande',413);rows=htmlTextRows(buffer.toString('utf8'));grids=[rows]}
 else fail('Usa un archivo MT5 en formato XLSX, CSV o HTML',400);
 // Analyze every worksheet, never only the first worksheet containing positions.
 const cashResults=grids.map(sheet=>extractCashMovements(sheet));
 const cashAll=cashResults.flatMap(x=>x.withdrawals);
 const depositsAll=cashResults.flatMap(x=>x.deposits);
 const uniq=new Map(cashAll.map(m=>[m.source_reference,m]));
 const cash_movements=[...uniq.values()];
 const deposits_detected=new Set(depositsAll.map(m=>m.source_reference)).size;
 const meta=reportMeta(rows);
 if(meta.currency&&meta.currency!=='USD')fail('El reporte está en '+meta.currency+'. Esta versión solo admite USD.');
 let data;
 if(findHeader(rows)!==null){
  data=extractPositions(rows);
  const net=roundMoney(data.positions.reduce((a,p)=>a+Number(p.pnl),0));
  const delta=meta.reported_net===null?null:roundMoney(net-meta.reported_net);
  const warnings=delta!==null&&Math.abs(delta)>0.05?['Los resultados no coinciden con el resumen MT5; confirma el rango del historial.']:[];
  data={...data,source_format:'mt5_deals',warnings,report_account_login:meta.account_login,report_currency:meta.currency,report_net:meta.reported_net,reconciled_net:net,reconciliation_delta:delta};
 }else if(findPositionsHeader(rows)!==null)data=extractNativePositions(rows);
 else if(cash_movements.length){
  data={positions:[],parsed_deals:0,ignored_rows:0,incomplete_positions:0,source_format:'mt5_cash_report',report_account_login:meta.account_login,report_currency:meta.currency,report_net:null,reconciled_net:0,reconciliation_delta:null,warnings:['Este reporte contiene movimientos de retiro identificables, pero no posiciones cerradas. No modifica las estadísticas de trading.','Confirma que la cuenta está denominada en USD.']};
 }else fail('Formato no reconocido: no se encontraron posiciones cerradas ni retiros identificables. Exporta historial MT5 XLSX, CSV o HTML.');
 return summaryOfPositions({...data,cash_movements,deposits_detected,withdrawals_total:roundMoney(cash_movements.reduce((a,m)=>a+m.amount,0))});
}
