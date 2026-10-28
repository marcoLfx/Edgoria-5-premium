import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {tradingDay,tradingSessionDay,sessionWeekday,dailyRealizedPnL,CALENDAR_PRESETS} from '../public/trading-day.js';
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
test('multiple real prop-firm day templates with DST aware timezones',()=>{
 assert.deepEqual(Object.keys(CALENDAR_PRESETS).sort(),['ftmo','fundednext','lima16','ny_close','topstep','utc']);
 assert.equal(CALENDAR_PRESETS.ftmo.zone,'Europe/Prague');
 assert.equal(CALENDAR_PRESETS.fundednext.zone,'Europe/Athens');
 assert.equal(CALENDAR_PRESETS.topstep.zone,'America/Chicago');
});
test('NY 17:00 reporting day labels next day and adjusts to daylight saving',()=>{
 // 2026-10-25 after DST in London, NY still EDT until Nov 1.
 assert.equal(tradingSessionDay('2026-10-26T20:59:59Z','ny_close'),'2026-10-26');
 assert.equal(tradingSessionDay('2026-10-26T21:00:00Z','ny_close'),'2026-10-27');
 // NY EST from 2026-11-01: 22:00 UTC boundary.
 assert.equal(tradingSessionDay('2026-11-02T21:59:59Z','ny_close'),'2026-11-02');
 assert.equal(tradingSessionDay('2026-11-02T22:00:00Z','ny_close'),'2026-11-03');
});
test('FTMO Europe/Prague 00:00 and FundedNext Europe/Athens 00:00 with DST',()=>{
 assert.equal(tradingSessionDay('2026-10-25T22:59:59Z','ftmo'),'2026-10-25');
 assert.equal(tradingSessionDay('2026-10-25T23:00:00Z','ftmo'),'2026-10-26');
 assert.equal(tradingSessionDay('2026-10-25T21:59:59Z','fundednext'),'2026-10-25');
 assert.equal(tradingSessionDay('2026-10-25T22:00:00Z','fundednext'),'2026-10-26');
 assert.equal(tradingSessionDay('2026-07-01T20:59:59Z','fundednext'),'2026-07-01');
 assert.equal(tradingSessionDay('2026-07-01T21:00:00Z','fundednext'),'2026-07-02');
});
test('Topstep Chicago 17:00 labels next-day session, old Lima profile remains',()=>{
 assert.equal(tradingSessionDay('2026-10-26T21:59:59Z','topstep'),'2026-10-26');
 assert.equal(tradingSessionDay('2026-10-26T22:00:00Z','topstep'),'2026-10-27');
 assert.equal(tradingSessionDay('2026-10-26T20:59:59Z','lima16'),'2026-10-25');
 assert.equal(tradingSessionDay('2026-10-26T21:00:00Z','lima16'),'2026-10-26');
 assert.equal(tradingDay('2026-10-26T21:00:00Z','America/Lima'),'2026-10-26');
});
test('daily statistics are based on close times, preserving P&L and breakeven',()=>{
 const trades=[
 {closed_at:'2026-10-26T20:58:00Z',pnl:125},
 {closed_at:'2026-10-26T21:00:00Z',pnl:-70},
 {closed_at:'2026-10-26T21:03:00Z',pnl:0},
 {closed_at:'2026-10-27T19:00:00Z',pnl:40},
 {closed_at:'bad',pnl:999}
 ];
 const rows=dailyRealizedPnL(trades,'ny_close');
 assert.deepEqual(rows.map(r=>r.date),['2026-10-26','2026-10-27']);
 assert.deepEqual(rows.map(r=>r.pnl),[125,-30]);
 assert.deepEqual(rows.map(r=>r.count),[1,3]);
 assert.equal(rows.reduce((s,r)=>s+r.pnl,0),95);
 assert.equal(rows[1].breakeven,1);
 assert.equal(sessionWeekday('2026-10-26T21:00:00Z','ny_close'),2);
});
test('charts, calendar and free access UI load without removing Excel MT5/roles',()=>{
 assert.match(app,/function calendarConfigUI\(/);
 assert.match(app,/function dailyPlot\(/);
 assert.match(app,/function cumulativeDayChart\(/);
 assert.match(app,/function realizedDrawdownChart\(/);
 assert.match(app,/data-action="explore-calendar-day"/);
 assert.match(app,/case 'explore-calendar-day'/);
 assert.match(app,/id="calendar-preset"/);
 assert.match(app,/EDGORIA \/ FREE JOURNAL/);
 assert.match(app,/function connectV4\(\)\{return v3ConnectView\(\)\+v4FilePanel\(\)\}/);
 assert.match(app,/admin:adminView,roles:adminRolesView/);
 assert.match(app,/id="v4-upload-form"/);
 assert.doesNotMatch(app,/Playbooks|playbook/i);
 assert.match(css,/\.v101-daily-plot/);
 assert.match(html,/app\.js\?v=4\.2\.0/);
});
