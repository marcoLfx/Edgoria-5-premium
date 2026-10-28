import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
test('all server business mutation paths require server-only secret helpers',()=>{
 for(const file of ['mt5-connect','mt5-disconnect','mt5-ingest','affiliate-enroll','affiliate-claim','checkout','webhooks-lemonsqueezy']){
  const p = file.startsWith('mt5-') ? `server/${file}.js` : `api/${file}.js`; const s=fs.readFileSync(p,'utf8');assert.ok(s.includes('rest')&&s.includes('export default'));
 }
});
test('EA is read-only by code audit',()=>{
 const ea=fs.readFileSync('mt5/EDGORIA_ReadOnly_Bridge.mq5','utf8');
 for(const operation of ['OrderSend(','PositionClose(','OrderModify(','trade.Buy(','trade.Sell('])assert.equal(ea.includes(operation),false,operation);
 assert.ok(ea.includes('HistoryDealsTotal()'));assert.ok(ea.includes('WebRequest('));
});
test('client cannot create its own subscription or affiliate commissions',()=>{
 const sql=fs.readFileSync('supabase/edgoria_commerce.sql','utf8');
 assert.ok(sql.includes('revoke all on public.%I from anon,authenticated'));
 assert.ok(sql.includes('enable row level security'));
 assert.ok(fs.readFileSync('supabase/edgoria_mt5_bridge.sql','utf8').includes('revoke all on public.edgoria_mt5_tokens'));
});
