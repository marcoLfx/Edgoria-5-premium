import test from 'node:test';import assert from 'node:assert/strict';
import {positionToTrade} from '../server/positions.js';
const context={userId:'u',accountId:'a',connectionKey:'demo-server:123'};
const deal=(ticket,entry,volume,profit,commission=0,swap=0,fee=0)=>({deal_ticket:String(ticket),position_id:'777',symbol:'XAUUSD',deal_type:entry===0?'BUY':'SELL',entry_code:entry,volume,profit,commission,swap,fee,event_time:new Date(Date.UTC(2026,9,23,10,ticket)).toISOString()});
test('MT5 complete position captures fees from entry and exit',()=>{
 const t=positionToTrade([deal(1,0,.2,0,-1),deal(2,1,.2,50,-1,-.5,-.5)],context);
 assert.equal(t.pnl,47);assert.equal(t.commission,-2.5);assert.equal(t.swap,-.5);assert.equal(t.external_id,'mt5:demo-server:123:777');
});
test('MT5 partial exit must not become a completed trade',()=>{
 assert.equal(positionToTrade([deal(1,0,.5,0),deal(2,1,.2,15)],context),null);
});
test('MT5 multiple partial exits aggregate only on full closure',()=>{
 const t=positionToTrade([deal(1,0,.5,0),deal(2,1,.2,15),deal(3,1,.3,-5)],context);
 assert.equal(t.pnl,10);
});
test('MT5 netting reversal and incomplete history are not inferred',()=>{
 assert.equal(positionToTrade([deal(1,0,.5,0),deal(2,2,.5,15)],context),null);
 assert.equal(positionToTrade([deal(2,1,.5,15)],context),null);
});
test('MT5 mismatched symbols rejected',()=>{
 const d=deal(2,1,.5,10);d.symbol='EURUSD';assert.equal(positionToTrade([deal(1,0,.5,0),d],context),null);
});
