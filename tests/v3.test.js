import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {positionToTrade} from '../server/positions.js';
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const source=file=>readFileSync(new URL(file,import.meta.url),'utf8');
const migration=source('../supabase/edgoria_v3_enforce_mt5_only_AFTER_PREVIEW.sql');
test('No manual trade authoring, but file-based imports allowed in V4',()=>{
 assert.doesNotMatch(app,/case 'new-trade'|case 'edit-trade'|case 'import-csv'|form.id==='trade-form'|form.id==='import-form'/);
 assert.match(app,/\.like\('external_id','mt5:%'\)/);
 assert.match(app,/Las operaciones importadas son inmutables/);
 assert.match(migration,/revoke insert,update,delete on table public.trades from anon,authenticated/i);
 assert.match(migration,/drop policy if exists trades_insert_own/);
});
test('Playbooks removed; private notes do not write trade P&L',()=>{
 assert.doesNotMatch(app,/const plays=\['ICT FVG'/);
 assert.doesNotMatch(app,/function strategyModal\(item\)|data-view="playbook"/);
 assert.match(app,/function annotationModal\(t\)/);
 assert.match(app,/from\('edgoria_trade_annotations'\)\.upsert/);
});
test('Replay is a placeholder and no OHLC uploader remains',()=>{
 assert.match(app,/Replay Studio está en desarrollo/);
 assert.doesNotMatch(app,/function parseOHLC\(|import-ohlc|id="ohlcfile"/);
});
test('MT5 history import reads all available positions first time',()=>{
 const ea=source('../mt5/EDGORIA_ReadOnly_Bridge.mq5');
 assert.match(ea,/HistoryDaysFirstImport = 0/);
 assert.match(ea,/HistorySelect\(start,end\)/);
 assert.match(ea,/ACCOUNT_CURRENCY/);
 assert.doesNotMatch(ea,/OrderSend|CTrade\s|trade\.Buy\(|trade\.Sell\(/);
});
test('V3 currency consistency protected',()=>{
 assert.match(source('../server/mt5-ingest.js'),/body\.currency/);
 assert.match(source('../server/mt5-ingest.js'),/USD/);
});
test('Reconnection rotates a token and keeps trade history',()=>{
 const rotate=source('../server/mt5-rotate.js');
 assert.match(rotate,/on_conflict=connection_id/);
 assert.doesNotMatch(rotate,/method:'DELETE'/);
 assert.doesNotMatch(source('../server/mt5-connect.js'),/method:'DELETE'.*edgoria_mt5_connections/);
});
test('No incomplete trade is fabricated',()=>{
 const deals=[{deal_ticket:'1',position_id:'1',symbol:'EURUSD',deal_type:'BUY',entry_code:0,volume:1,profit:0,event_time:'2026-01-01T00:00:00Z'}];
 assert.equal(positionToTrade(deals,{userId:'x',accountId:'y',connectionKey:'z'}),null);
});
