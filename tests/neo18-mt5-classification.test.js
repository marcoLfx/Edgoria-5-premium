import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {csvRows,extractCashMovements,parseSpreadsheet} from '../server/mt5-spreadsheet.js';
import v4 from '../api/v4.js';

const rows=[
 ['Time','Ticket','Type','Amount','Comment'],
 ['2026.10.25 12:00:00','110','balance','-100.10','Withdrawal completed'],
 ['2026.10.25 13:00:00','111','balance','-50.50','Witdrawl PAYOUT #2'],
 ['2026.10.25 14:00:00','112','balance','-75.00','Retiro aprobado'],
 ['2026.10.25 15:00:00','113','balance','-25.00','Profit split'],
 ['2026.10.25 16:00:00','114','balance','-8.00','Withdrawal fee'],
 ['2026.10.25 17:00:00','115','balance','-4.00','Payout reversed'],
 ['2026.10.25 18:00:00','116','balance','-900.00',''],
 ['2026.10.25 19:00:00','117','balance','10000','NYS Account Onboarding'],
 ['2026.10.25 20:00:00','118','balance','100.00','Withdrawal reversed'],
 ['2026.10.25 20:15:00','119','buy','-120.00','payout story'],
 ['2026.10.25 21:00:00','120','balance','-37.99','Cash-out paid'],
];
const csv=rows.map(row=>row.join(',')).join('\n');

test('recognizes English, Spanish, misspelled withdrawal, profit split and cash-out, without false positives',()=>{
 const out=extractCashMovements(rows);
 assert.deepEqual(out.withdrawals.map(x=>[x.source_reference,x.amount]),[['mt5:110',100.1],['mt5:111',50.5],['mt5:112',75],['mt5:113',25],['mt5:120',37.99]]);
 assert.equal(out.deposits.length,1);
 assert.equal(out.deposits[0].amount,10000);
 assert.equal(out.withdrawals.reduce((a,x)=>a+x.amount,0).toFixed(2),'288.59');
});
test('supports recognizable balance-only CSV without inventing any closed trade',()=>{
 const r=parseSpreadsheet(Buffer.from(csv),'funded-report.csv');
 assert.equal(r.positions.length,0);
 assert.equal(r.reconciled_net,0);
 assert.equal(r.source_format,'mt5_cash_report');
 assert.equal(r.cash_movements.length,5);
 assert.equal(r.gross_profit,0);assert.equal(r.gross_loss,0);
 assert.equal(r.withdrawals_total,288.59);
});
test('does not infer withdrawals from negative balance without explicit labels',()=>{
 assert.throws(()=>parseSpreadsheet(Buffer.from('Date,Type,Amount,Description\n2026-10-25,balance,-100,Internal adjustment\n2026-10-26,balance,1000,deposit\n'),'unknown.csv'),/Formato no reconocido/);
});
test('identical cash event without ticket gets stable dedup reference',()=>{
 const r=csvRows('Date,Type,Amount,Description\n2026-10-25 13:00:00,balance,-100.50,Payout 2026\n');
 const a=extractCashMovements(r),b=extractCashMovements(r);
 assert.equal(a.withdrawals.length,1);
 assert.match(a.withdrawals[0].source_reference,/^mt5:hash:/);
 assert.equal(a.withdrawals[0].source_reference,b.withdrawals[0].source_reference);
});
test('real account report separates trading P&L from positive onboarding balance',()=>{
 const r=parseSpreadsheet(readFileSync('/mnt/data/ReportHistory-270599.xlsx'),'actual-mt5.xlsx');
 assert.equal(r.positions.length,18);
 assert.equal(Math.round((r.gross_profit-r.gross_loss)*100)/100,r.reconciled_net);
 assert.equal(r.deposits_detected,1);
 assert.deepEqual(r.cash_movements,[]);
});
test('closed position report with transactions returns gains/loss and cash separately',()=>{
 const deals=['Ticket,Position,Symbol,Type,Entry,Volume,Time,Profit,Commission,Swap',
 '100,201,XAUUSD,buy,in,0.1,2026.10.25 07:01:00,0,0,0',
 '101,201,XAUUSD,sell,out,0.1,2026.10.25 07:10:00,61,-1,0',
 '102,202,XAUUSD,sell,in,0.2,2026.10.25 08:01:00,0,0,0',
 '103,202,XAUUSD,buy,out,0.2,2026.10.25 08:10:00,-21,-2,0',
 ...rows.map(r=>r.join(','))].join('\n');
 const out=parseSpreadsheet(Buffer.from(deals),'history.csv');
 assert.equal(out.positions.length,2);
 assert.equal(out.gross_profit,60);assert.equal(out.gross_loss,23);
 assert.equal(out.reconciled_net,37);
 assert.equal(out.withdrawals_total,288.59);
});
test('HTML balance-only report is parsed without creating trade positions',()=>{
 const html='<table><tr><th>Date</th><th>Transaction</th><th>Type</th><th>Amount</th><th>Description</th></tr><tr><td>2026.10.26 12:00:00</td><td>299</td><td>balance</td><td>-95.00</td><td>Payout approved</td></tr></table>';
 const r=parseSpreadsheet(Buffer.from(html),'history.html');
 assert.equal(r.positions.length,0);assert.equal(r.cash_movements.length,1);assert.equal(r.withdrawals_total,95);
});
const user='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',account='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',batch='cccccccc-cccc-4ccc-cccc-cccccccccccc';
async function simulateUpload(type,previous=false){
 const oldFetch=globalThis.fetch,prevUrl=process.env.NEXT_PUBLIC_SUPABASE_URL,prevKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='sb_publishable_test_only_do_not_use';
 const calls=[];globalThis.fetch=async(url,opts={})=>{
  const path=new URL(url).pathname,method=opts.method||'GET';calls.push({path,method,body:opts.body});
  const J=(obj)=>Response.json(obj);
  if(path==='/auth/v1/user')return J({id:user,email_confirmed_at:'2026-10-26T00:00:00Z'});
  if(path==='/rest/v1/edgoria_v4_access_grants')return J([{access_status:'active'}]);
  if(path==='/rest/v1/accounts')return J([{id:account,account_type:type}]);
  if(path==='/rest/v1/edgoria_mt5_connections')return J([]);
  if(path==='/rest/v1/edgoria_v4_import_batches'&&method==='GET')return J(previous?[{id:batch}]:[]);
  if(path==='/rest/v1/edgoria_v4_import_batches'&&method==='POST')return J([{id:batch}]);
  if(path==='/rest/v1/edgoria_v4_cash_movements'&&method==='POST')return new Response(null,{status:201});
  throw Error('Unexpected: '+path+' '+method);
 };
 try{
  const form=new FormData();form.set('account_id',account);form.set('file',new File([csv],'cash-only.csv',{type:'text/csv'}));
  const req=new Request('https://edgoria.test/api/v4?route=file-upload',{method:'POST',headers:{Authorization:'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.abc123'},body:form});
  const response=await v4.fetch(req);return {status:response.status,data:await response.json(),calls};
 }finally{
  globalThis.fetch=oldFetch;
  if(prevUrl===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=prevUrl;
  if(prevKey===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=prevKey;
 }
}
test('funded can import MT5 withdrawal-only file safely, with zero imported positions',async()=>{
 const x=await simulateUpload('funded');assert.equal(x.status,201,JSON.stringify(x.data));
 assert.equal(x.data.positions,0);assert.equal(x.data.withdrawals_total,288.59);
 assert.equal(x.data.withdrawals_detected,5);assert.equal(x.data.gross_profit,0);
 assert.equal(x.data.funded_account,true);
 assert.equal(JSON.parse(x.calls.find(c=>c.path.endsWith('/edgoria_v4_import_batches')&&c.method==='POST').body).positions_imported,0);
 assert.equal(x.calls.filter(c=>c.path.endsWith('/edgoria_v4_file_positions')).length,0);
});
test('challenge cannot import withdrawals only as trades or payouts',async()=>{
 const x=await simulateUpload('challenge');assert.equal(x.status,422);assert.equal(x.calls.filter(c=>c.method==='POST'&&c.path.includes('edgoria_v4')).length,0);
});
test('rereading funded cash file does not create new positions or batches',async()=>{
 const x=await simulateUpload('funded',true);assert.equal(x.status,200,JSON.stringify(x.data));assert.equal(x.data.reread_existing,true);
 assert.equal(x.data.positions,0);assert.equal(x.data.withdrawals_detected,5);
 assert.equal(x.calls.filter(c=>c.path.endsWith('/edgoria_v4_import_batches')&&c.method==='POST').length,0);
});
test('UI keeps classification backend while financial results live only in Analytics',()=>{
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.match(html,/neo18\.css\?v=18\.0/);assert.match(html,/neo181\.css\?v=18\.1/);assert.match(html,/app\.js\?v=4\.2\.0/);
 assert.match(app,/eg181-import-confirmation/);assert.match(app,/eg181-funded-section/);assert.match(app,/Retiros detectados en archivos/);
});
