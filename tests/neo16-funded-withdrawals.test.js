import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dailyRecords} from '../public/performance14.js';
import {csvRows,extractCashWithdrawals,parseSpreadsheet} from '../server/mt5-spreadsheet.js';
import v4 from '../api/v4.js';

const dataset=[
 {closed_at:'2026-10-22T17:00:00Z',pnl:100},
 {closed_at:'2026-10-22T17:10:00Z',pnl:-70},
 {closed_at:'2026-10-23T17:00:00Z',pnl:250},
 {closed_at:'2026-10-23T17:10:00Z',pnl:-10},
 {closed_at:'2026-10-24T17:00:00Z',pnl:-180},
 {closed_at:'2026-10-24T17:10:00Z',pnl:30},
];
test('historical best/worst are each one single daily NET, not sums across days',()=>{
 const r=dailyRecords(dataset,'utc');
 assert.equal(r.best.date,'2026-10-23');assert.equal(r.best.pnl,240);
 assert.equal(r.worst.date,'2026-10-24');assert.equal(r.worst.pnl,-150);
 assert.equal(r.bestTrade.pnl,250);assert.equal(r.worstTrade.pnl,-180);
 assert.equal(r.days.length,3);
});
test('daily records do not present a positive day as the worst loss or a negative day as the best gain',()=>{
 assert.equal(dailyRecords([{closed_at:'2026-10-23T17:00:00Z',pnl:30}],'utc').worst,null);
 assert.equal(dailyRecords([{closed_at:'2026-10-23T17:00:00Z',pnl:-30}],'utc').best,null);
});
const nativeRows=[
 ['Posiciones'],
 ['Posición','Símbolo','Tipo','Volumen','Beneficio','Apertura','Cierre','Comisión','Swap'],
 ['100','XAUUSD','buy','0.10','120','2026-10-24 13:01:00','2026-10-24 13:13:00','-1','0'],
 ['Transacciones'],
 ['Fecha/Hora','Transacción','Símbolo','Tipo','Dirección','Volumen','Precio','Orden','Comisión','Tasa','Swap','Beneficio','Balance','Comentario'],
 ['2026.10.22 20:30:19','999','','balance','','','','','','','','10000.00','10000.00','NYS Account Onboarding'],
 ['2026.10.25 12:30:19','1000','','balance','','','','','','','','-125.50','9874.50','Payout #1 Withdrawal'],
 ['2026.10.25 12:32:19','1001','','balance','','','','','','','','-15.00','9859.50','Withdrawal fee'],
 ['2026.10.25 12:34:19','1002','','balance','','','','','','','','-500.00','9359.50',''],
 ['2026.10.25 12:39:19','1003','','balance','','','','','','','','-87.50','9272.00','Pago de retiro'],
 ['2026.10.25 12:40:19','1004','','balance','','','','','','','','100.00','9372.00','Withdrawal reversed'],
];
test('MT5 transactions register only explicitly labeled negative withdrawals, exclude onboarding, fees and unexplained balance',()=>{
 const events=extractCashWithdrawals(nativeRows);
 assert.deepEqual(events.map(x=>[x.source_reference,x.amount]),[['mt5:1000',125.5],['mt5:1003',87.5]]);
 assert.equal(events[0].event_type,'withdrawal');
 assert.match(events[0].event_time,/2026-10-25/);
});
const csv=[
 'Ticket,Position,Symbol,Type,Entry,Volume,Time,Profit,Commission,Swap',
 '100,500,XAUUSD,buy,in,0.1,2026.10.24 12:00:00,0,0,0',
 '101,500,XAUUSD,sell,out,0.1,2026.10.24 12:05:00,42,-1,0',
 ...nativeRows.slice(3).map(r=>r.join(',')),
].join('\n');
test('CSV upload extracts trade P&L and cash withdrawal separately, never mixing both',()=>{
 const result=parseSpreadsheet(Buffer.from(csv),'history.csv');
 assert.equal(result.positions.length,1);assert.equal(result.positions[0].pnl,41);
 assert.equal(result.cash_movements.length,2);
 assert.equal(result.reconciled_net,41);
});
test('real MT5 account onboarding positive balance is not reported as a withdrawal',()=>{
 const r=parseSpreadsheet(readFileSync('/mnt/data/ReportHistory-270599.xlsx'),'MT5.xlsx');
 assert.equal(r.positions.length,18);
 assert.deepEqual(r.cash_movements,[]);
});
const user='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',acc='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',batch='cccccccc-cccc-4ccc-cccc-cccccccccccc';
const J=(value,status=200)=>Response.json(value,{status});
async function upload(accountType,existing=false){
 const oldFetch=globalThis.fetch,oldUrl=process.env.NEXT_PUBLIC_SUPABASE_URL,oldKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='sb_publishable_test_only_do_not_use';
 const calls=[];
 globalThis.fetch=async(uri,opts={})=>{
  const path=new URL(uri).pathname,method=opts.method||'GET';
  calls.push({path,method,body:opts.body,headers:opts.headers,url:uri});
  if(path==='/auth/v1/user')return J({id:user,email_confirmed_at:'2026-10-26T00:00:00Z'});
  if(path==='/rest/v1/edgoria_v4_access_grants')return J([{access_status:'active'}]);
  if(path==='/rest/v1/accounts')return J([{id:acc,account_type:accountType}]);
  if(path==='/rest/v1/edgoria_mt5_connections')return J([]);
  if(path==='/rest/v1/edgoria_v4_import_batches'&&method==='GET')return J(existing?[{id:batch}]:[]);
  if(path==='/rest/v1/edgoria_v4_import_batches'&&method==='POST')return J([{id:batch}]);
  if(path==='/rest/v1/edgoria_v4_file_positions'&&method==='POST')return new Response(null,{status:201});
  if(path==='/rest/v1/edgoria_v4_cash_movements'&&method==='POST')return new Response(null,{status:201});
  throw Error('Unexpected '+path+' '+method);
 };
 try{
  const fd=new FormData();fd.set('account_id',acc);fd.set('file',new File([csv],'history.csv',{type:'text/csv'}));
  const req=new Request('https://edgoria.test/api/v4?route=file-upload',{method:'POST',headers:{Authorization:'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.abc123'},body:fd});
  const res=await v4.fetch(req),data=await res.json();return {status:res.status,data,calls};
 }finally{globalThis.fetch=oldFetch;if(oldUrl===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=oldUrl;if(oldKey===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=oldKey}
}
test('funded upload persists own MT5 withdrawal with dedup preference separately from positions',async()=>{
 const x=await upload('funded');assert.equal(x.status,201,JSON.stringify(x.data));assert.equal(x.data.positions,1);assert.equal(x.data.withdrawals_detected,2);
 const cash=x.calls.find(c=>c.path==='/rest/v1/edgoria_v4_cash_movements');
 assert.ok(cash);assert.equal(JSON.parse(cash.body).length,2);assert.match(cash.headers.Prefer,/ignore-duplicates/);
 assert.match(new URL(cash.url).search,/on_conflict/);
});
test('non-funded upload does not write withdrawal rows even if file includes them',async()=>{
 const x=await upload('challenge');assert.equal(x.status,201);assert.equal(x.data.withdrawals_detected,0);assert.equal(x.data.withdrawals_skipped,2);
 assert.ok(!x.calls.some(c=>c.path==='/rest/v1/edgoria_v4_cash_movements'));
});
test('frontend shows funded withdraw section but never aggregates MT5 and manual totals',()=>{
 const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.match(app,/eg16FundedPayouts/);assert.match(app,/account_type==='funded'/);
 assert.match(app,/eg16RecordsPanel/);assert.match(app,/visibleTrades\(false\)/);
 assert.doesNotMatch(app,/Hoy y resultado general/);
 assert.match(app,/Registrado manualmente|Registrado manualmente/i);
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 assert.match(html,/neo16\.css\?v=17\.0/);
});

test('re-uploading exactly the same previously imported funded Excel backfills cash events without duplicating positions',async()=>{
 const x=await upload('funded',true);
 assert.equal(x.status,200,JSON.stringify(x.data));assert.equal(x.data.reread_existing,true);
 assert.equal(x.data.positions,0);assert.equal(x.data.withdrawals_detected,2);
 assert.ok(!x.calls.some(c=>c.path==='/rest/v1/edgoria_v4_file_positions'&&c.method==='POST'));
 assert.ok(!x.calls.some(c=>c.path==='/rest/v1/edgoria_v4_import_batches'&&c.method==='POST'));
 assert.equal(x.calls.filter(c=>c.path==='/rest/v1/edgoria_v4_cash_movements'&&c.method==='POST').length,1);
});
