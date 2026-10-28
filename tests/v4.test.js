import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseSpreadsheet,csvRows,extractPositions} from '../server/mt5-spreadsheet.js';
const v4=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const sql=readFileSync(new URL('../supabase/edgoria_v4_additive.sql',import.meta.url),'utf8');
const csv=readFileSync(new URL('../public/downloads/ejemplo_mt5_deals.csv',import.meta.url));
test('Excel XLSX example reconstructs closed positions net of all charges',()=>{
 const result=parseSpreadsheet(readFileSync(new URL('./fixtures/deals.xlsx',import.meta.url)),'deals.xlsx');
 assert.equal(result.positions.length,2);
 assert.equal(result.positions[0].pnl,15.8);
 assert.equal(result.positions[1].pnl,-9.4);
});
test('CSV example matches XLSX positions',()=>{
 const result=parseSpreadsheet(csv,'deals.csv');assert.equal(result.positions.length,2);assert.equal(result.parsed_deals,4);
 assert.equal(result.incomplete_positions,0);
});
test('partial close excluded from imported performance',()=>{
 const input=csv.toString().split('\n');let rows=input.slice(0,2).concat([input[2].replace(',0.10,2026',',0.05,2026')]);
 const x=extractPositions(csvRows(rows.join('\n')));assert.equal(x.positions.length,0);assert.equal(x.incomplete_positions,1);
});
test('invalid arbitrary spreadsheets are rejected, not invented',()=>{
 assert.throws(()=>parseSpreadsheet(Buffer.from('abc,def\n1,2\n'),'fake.csv'),/Formato no reconocido/);
 assert.throws(()=>parseSpreadsheet(Buffer.from('hello'),'bad.xls'),/Solo se permiten|Usa un archivo/);
});
test('frontend includes three distinct role dashboards and upload/download controls',()=>{
 for(const phrase of ['adminRolesView','partnerDashboard','v4Settings','v4-upload-form','delete-import-batch','loadIdentity','full_name','country','phone'])assert.ok(v4.includes(phrase),phrase);
 assert.doesNotMatch(v4,/case 'new-trade'|case 'edit-trade'/);
});
test('base migration keeps original server-only rules; 4.0.3 adds user-scoped import via separate RLS',()=>{
 for(const table of ['edgoria_v4_profiles','edgoria_v4_roles','edgoria_v4_partner_applications','edgoria_v4_import_batches','edgoria_v4_file_positions'])assert.match(sql,new RegExp('alter table public\\.'+table+' enable row level security'));
 assert.match(sql,/revoke all on public.edgoria_v4_roles from anon,authenticated/);
 assert.match(sql,/revoke all on public.edgoria_v4_file_positions from anon,authenticated/);
});
test('file deletion only acts through server side and cascades affected batch',()=>{
 const src=readFileSync(new URL('../server/v4-file-delete.js',import.meta.url),'utf8');assert.match(src,/userContext/);assert.match(src,/user_id=eq/);
 assert.match(sql,/batch_id uuid not null references public.edgoria_v4_import_batches\(id\) on delete cascade/);
});

// Native MT5 history reports are not Deal exports: they have Posiciones, Ordenes, Transacciones and Resultados.
test('MT5 native bilingual history report parses closed positions and reconciles commissions',()=>{
 const result=parseSpreadsheet(readFileSync(new URL('./fixtures/mt5_native_positions.xlsx',import.meta.url)),'history.xlsx');
 assert.equal(result.positions.length,2);
 assert.equal(result.source_format,'mt5_positions_report');
 assert.equal(result.reconciled_net,166.5);
 assert.equal(result.report_net,166.5);
 assert.equal(result.reconciliation_delta,0);
 assert.equal(result.report_account_login,'123456');
 assert.equal(result.report_currency,'USD');
 assert.equal(result.positions[0].pnl,188);
 assert.equal(result.positions[1].pnl,-21.5);
});
test('MT5 native Positions exported as CSV and HTML can also be imported',()=>{
 const rows=['Time,Position,Symbol,Type,Volume,Price,S / L,T / P,Time,Price,Commission,Swap,Profit',
 '2026.10.23 10:00:00,100001,XAUUSD,buy,0.1,4012,4000,4040,2026.10.23 10:20:00,4031,-1,0,189',
 '2026.10.23 12:00:00,100002,BTCUSD,sell,0.2,81000,81200,80500,2026.10.23 12:25:00,81100,-1.5,0,-20'];
 const c=parseSpreadsheet(Buffer.from(rows.join('\n')),'positions.csv');
 assert.equal(c.positions.length,2);assert.equal(c.reconciled_net,166.5);
 const h='<table>'+rows.map(line=>'<tr>'+line.split(',').map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</table>';
 const result=parseSpreadsheet(Buffer.from(h),'positions.html');
 assert.equal(result.positions.length,2);assert.equal(result.reconciled_net,166.5);
});
test('Import page retains file selection during periodic refresh and shows persistent errors',()=>{
 assert.match(v4,/v4-selected-file/);assert.match(v4,/v4-upload-status/);
 assert.match(v4,/v4-upload-form input\[type=file\]/);
 assert.match(v4,/uploadResult=\{kind:'error'/);
});
