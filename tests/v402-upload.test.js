import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import v4 from '../api/v4.js';
import {parseSpreadsheet} from '../server/mt5-spreadsheet.js';
const user='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const acc='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const batch='cccccccc-cccc-4ccc-cccc-cccccccccccc';
const fixture=readFileSync(new URL('./fixtures/mt5_native_positions.xlsx',import.meta.url));
const J=(x,status=200)=>Response.json(x,{status});
test('V4 multipart XLSX upload creates a batch plus 2 net-reconciled positions, no raw file stored',async()=>{
 const oldFetch=globalThis.fetch;
 const oldUrl=process.env.NEXT_PUBLIC_SUPABASE_URL,oldKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co';
 process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='sb_publishable_test_only_do_not_use';
 let positions=[],calls=[];
 globalThis.fetch=async (uri,opts={})=>{
   const url=new URL(uri),path=url.pathname,method=opts.method||'GET';calls.push([path,method]);
   if(path==='/auth/v1/user')return J({id:user,email_confirmed_at:'2026-10-26T00:00:00Z'});
   if(path==='/rest/v1/edgoria_v4_access_grants')return J([{access_status:'active'}]);
  if(path==='/rest/v1/accounts')return J([{id:acc}]);
   if(path==='/rest/v1/edgoria_mt5_connections')return J([]);
   if(path==='/rest/v1/edgoria_v4_import_batches'&&method==='GET')return J([]);
   if(path==='/rest/v1/edgoria_v4_import_batches'&&method==='POST')return J([{id:batch}]);
   if(path==='/rest/v1/edgoria_v4_file_positions'&&method==='POST'){
     positions.push(...JSON.parse(opts.body)); return new Response(null,{status:201});
   }
   throw Error('unexpected route '+path+' '+method);
 };
 try{
   const fd=new FormData(); fd.set('account_id',acc);
   fd.set('file',new File([fixture],'report_mt5.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
   const req=new Request('https://edgoria.test/api/v4?route=file-upload',{method:'POST',headers:{Authorization:'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.abc123'},body:fd});
   const response=await v4.fetch(req),data=await response.json();
   assert.equal(response.status,201,JSON.stringify(data));assert.equal(data.positions,2);assert.equal(data.reconciled_net,166.5);
   assert.equal(data.source_format,'mt5_positions_report');assert.equal(positions.length,2);
   assert.equal(positions.reduce((n,t)=>n+t.pnl,0),166.5);
   assert.ok(calls.some(([path])=>path==='/rest/v1/edgoria_v4_file_positions'));
   assert.ok(calls.some(([path])=>path==='/auth/v1/user'));
   assert.equal(process.env.SUPABASE_SERVICE_ROLE_KEY,undefined,'test must not require private key');
   assert.ok(!positions.some(p=>'file' in p||'raw' in p||'password' in p));
 }finally{globalThis.fetch=oldFetch;
   if(oldUrl===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=oldUrl;
   if(oldKey===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=oldKey;
 }
});
test('V4 importer refuses a damaged workbook instead of inventing P&L',()=>{
 assert.throws(()=>parseSpreadsheet(Buffer.from('not a workbook'),'report.xlsx'),/Excel inválido|ZIP/);
});
