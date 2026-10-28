import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import api from '../api/v4.js';

const user='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const account='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const batch='cccccccc-cccc-4ccc-cccc-cccccccccccc';
const token='eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.abc123';
const key='sb_publishable_local_mock_for_tests_123456';
const fixtures=readFileSync(new URL('./fixtures/mt5_native_positions.xlsx',import.meta.url));
function J(value,status=200){return Response.json(value,{status});}
async function withMock(handler){
 const fetchOriginal=globalThis.fetch;
 const saved=Object.fromEntries(['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_URL'].map(k=>[k,process.env[k]]));
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://testproject.supabase.co';
 process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=key;
 delete process.env.SUPABASE_SECRET_KEY;delete process.env.SUPABASE_SERVICE_ROLE_KEY;delete process.env.SUPABASE_URL;
 globalThis.fetch=handler;
 try{await handler.verify()}finally{
   globalThis.fetch=fetchOriginal;for(const [k,v] of Object.entries(saved))v===undefined?delete process.env[k]:process.env[k]=v;
 }
}
test('file import, diagnostics and deletion work using RLS user credentials only',async()=>{
 const calls=[],positions=[];
 const handler=async(uri,opts={})=>{
  const path=new URL(uri).pathname,method=opts.method||'GET';
  calls.push({path,method});
  assert.equal(opts.headers?.apikey,key);
  assert.equal(opts.headers?.Authorization,'Bearer '+token);
  if(path==='/auth/v1/user')return J({id:user,email_confirmed_at:'2026-10-26T00:00:00Z'});
  if(path==='/rest/v1/edgoria_v4_access_grants')return J([{access_status:'active'}]);
  if(path==='/rest/v1/accounts')return J([{id:account}]);
  if(path==='/rest/v1/edgoria_mt5_connections')return J([]);
  if(path==='/rest/v1/edgoria_v4_import_batches' && method==='GET')return J([]);
  if(path==='/rest/v1/edgoria_v4_import_batches' && method==='POST')return J([{id:batch}]);
  if(path==='/rest/v1/edgoria_v4_import_batches' && method==='DELETE')return new Response(null,{status:204});
  if(path==='/rest/v1/edgoria_v4_file_positions' && method==='POST'){
   positions.push(...JSON.parse(opts.body));return new Response(null,{status:201});
  }
  throw Error('Unexpected request '+method+' '+path);
 };
 handler.verify=async()=>{
  const reqDiag=new Request('https://edgoria.test/api/v4-mt5-diagnostics',{headers:{Authorization:'Bearer '+token}});
  const diag=await api.fetch(reqDiag);assert.equal(diag.status,200);assert.equal((await diag.json()).database,'Lectura correcta');
  const fd=new FormData();fd.set('account_id',account);fd.set('file',new File([fixtures],'report.xlsx'));
  const upload=new Request('https://edgoria.test/api/v4-file-upload',{method:'POST',headers:{Authorization:'Bearer '+token},body:fd});
  const res=await api.fetch(upload);const data=await res.json();assert.equal(res.status,201,JSON.stringify(data));
  assert.equal(data.positions,2);assert.equal(data.reconciled_net,166.5);
  assert.equal(positions.length,2);assert.ok(positions.every(p=>p.user_id===user&&p.account_id===account));
  // The batch is selected by authenticated caller before it can be deleted.
  // Use a mock with the saved batch for this final verification.
  const delHandler=globalThis.fetch;globalThis.fetch=async(uri,opts)=>{
   if(new URL(uri).pathname==='/rest/v1/edgoria_v4_import_batches' && (opts.method||'GET')==='GET')return J([{id:batch}]);
   return delHandler(uri,opts);
  };
  try{
   const del=await api.fetch(new Request('https://edgoria.test/api/v4-file-delete',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({batch_id:batch})}));
   assert.equal(del.status,200);assert.equal((await del.json()).removed,true);
  }finally{globalThis.fetch=delHandler}
  assert.ok(calls.some(c=>c.method==='POST' && c.path==='/rest/v1/edgoria_v4_file_positions'));
 };
 await withMock(handler);
});
test('import requires Supabase user session and rejects bearer of API publishable key',async()=>{
 const old=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const oldK=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://testproject.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=key;
 try{
  const req=new Request('https://edgoria.test/api/v4-file-upload',{method:'POST',headers:{Authorization:'Bearer '+key}});
  const res=await api.fetch(req);assert.equal(res.status,401);
  assert.equal((await res.json()).code,'AUTH_REQUIRED');
 }finally{old===undefined?delete process.env.NEXT_PUBLIC_SUPABASE_URL:process.env.NEXT_PUBLIC_SUPABASE_URL=old;
 oldK===undefined?delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=oldK}
});
