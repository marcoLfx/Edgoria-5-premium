import test from 'node:test';
import assert from 'node:assert/strict';
import connector from '../server/mt5-connect.js';
const owner='11111111-1111-4111-8111-111111111111';
const account='22222222-2222-4222-8222-222222222222';
const conn='33333333-3333-4333-8333-333333333333';
const respond=(v,status=200)=>new Response(v===undefined?'':JSON.stringify(v),{status,headers:{'Content-Type':'application/json'}});
const request=()=>new Request('https://edgoria.example/api/mt5-connect',{method:'POST',headers:{Authorization:'Bearer '+'A'.repeat(80),'Content-Type':'application/json'},body:JSON.stringify({account_id:account,mt5_login:'123456',server:'Broker-Demo'})});
test('MT5 connection API creates a read-only token for an authenticated owner',async()=>{
 const oldFetch=global.fetch,oldURL=process.env.NEXT_PUBLIC_SUPABASE_URL,oldKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://mockproject.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='eyJhbGciOi.test_signature.valid_signature';
 const seen=[];
 global.fetch=async(url,opts={})=>{
  const u=new URL(url);seen.push({path:u.pathname,method:opts.method||'GET'});
  if(u.pathname==='/auth/v1/user')return respond({id:owner});
  if(u.pathname==='/rest/v1/accounts')return respond([{id:account}]);
  if(u.pathname==='/rest/v1/edgoria_mt5_connections'&&opts.method==='POST')return respond([{id:conn}]);
  if(u.pathname==='/rest/v1/edgoria_mt5_connections')return respond([]);
  if(u.pathname==='/rest/v1/edgoria_mt5_tokens'&&opts.method==='POST')return respond(undefined,201);
  throw Error('unexpected request '+u.pathname);
 };
 try{
  const result=await connector.fetch(request());
  assert.equal(result.status,201);
  const data=await result.json();
  assert.match(data.token,/^[a-f0-9]{64}$/);
  assert.equal(data.endpoint,'https://edgoria.example/api/mt5-ingest');
  assert.ok(seen.some(x=>x.path.endsWith('edgoria_mt5_tokens')&&x.method==='POST'));
 }finally{global.fetch=oldFetch;oldURL===undefined?delete process.env.NEXT_PUBLIC_SUPABASE_URL:process.env.NEXT_PUBLIC_SUPABASE_URL=oldURL;oldKey===undefined?delete process.env.SUPABASE_SERVICE_ROLE_KEY:process.env.SUPABASE_SERVICE_ROLE_KEY=oldKey}
});
