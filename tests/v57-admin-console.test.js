import adminConsole from '../server/admin-console.js';
import adminApi from '../api/admin.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {monthCells,shiftedMonth,dateKey,calendarSummary,periodState,stats,money,escapeHtml} from '../public/admin57-model.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const example={user_id:'3d6f9f4f-3dc7-4d94-a250-6d164d2d231d',starts_at:'2026-11-10T15:00:00Z',expires_at:'2026-12-10T15:00:00Z',amount_usd_cents:1099,status:'active',verified_at:'2026-11-10T15:00:00Z'};

test('admin calendar builds responsive months and uses Peru dates consistently',()=>{
 assert.equal(shiftedMonth('2026-12',1),'2027-01');
 assert.equal(shiftedMonth('2026-01',-1),'2025-12');
 const cells=monthCells('2026-11');assert.equal(cells.filter(c=>c.inside).length,30);assert.equal(cells.find(c=>c.inside).date,'2026-11-01');
 assert.equal(dateKey('2026-11-10T15:00:00Z'),'2026-11-10');
 assert.equal(money(1099),'$10.99');
});
test('a verified monthly payment appears across the actual activation window',()=>{
 assert.equal(periodState(example,Date.parse('2026-11-11T00:00:00Z')),'active');
 assert.equal(periodState(example,Date.parse('2026-11-01T00:00:00Z')),'scheduled');
 assert.equal(periodState(example,Date.parse('2026-12-11T00:00:00Z')),'expired');
 const start=calendarSummary([example],'2026-11-10');assert.equal(start.running.length,1);assert.equal(start.starts.length,1);assert.equal(start.paidCents,1099);
 assert.equal(calendarSummary([example],'2026-11-12').running.length,1);
 assert.equal(calendarSummary([example],'2026-12-11').running.length,0);
 assert.equal(calendarSummary([{...example,status:'revoked'}],'2026-11-12').running.length,0);
});
test('reporting derives verified totals from period history and never invents revenue',()=>{
 const data={periods:[example],users:[{access_status:'active',manual_subscription:{status:'active',expires_at:'2026-12-10T15:00:00Z'}}]};
 const value=stats(data,Date.parse('2026-11-12T00:00:00Z'));
 assert.equal(value.live,1);assert.equal(value.recordedCents,1099);assert.equal(value.verifiedPayments,1);
});
test('admin display escapes untrusted user content',()=>{
 assert.equal(escapeHtml('<img src=x onerror=alert(1)>'),'&lt;img src=x onerror=alert(1)&gt;');
});
test('admin console is separate, server protected, and payment amount is real not hardcoded',()=>{
 const api=read('server/admin-console.js'),ui=read('public/admin57.js'),html=read('public/admin.html'),backend=read('server/v4-access-management.js'),vercel=read('vercel.json');
 assert.match(api,/requireAdmin\(req\)/);assert.match(vercel,/"source": "\/admin"/);
 assert.match(html,/admin57\.js/);assert.doesNotMatch(html,/app\.js/);
 assert.match(ui,/data-view="calendar"|\['calendar'/);assert.match(ui,/user\.email|u\.email/);
 assert.match(ui,/USDT_RECEIVED_AND_VERIFIED/);assert.match(ui,/amount_cents:amount/);
 assert.match(backend,/Number\(body\.amount_cents\)/);assert.match(backend,/\[1099,1499\]/);
 assert.doesNotMatch(ui,/SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|sb_secret_/);
});
test('periods are created transactionally on server verified audit, with RLS',()=>{
 const sql=read('supabase/edgoria_v57_subscription_calendar.sql');
 assert.match(sql,/enable row level security/i);assert.match(sql,/revoke all on public\.edgoria_subscription_periods from public,anon,authenticated/i);
 assert.match(sql,/after insert on public\.edgoria_manual_payment_audit/i);assert.match(sql,/new\.action='verify'/);
 assert.match(sql,/new\.action='revoke'/);assert.match(sql,/payment_reference text not null unique/);
});
test('admin users are redirected to isolated admin URL, trader navigation unchanged',()=>{
 const app=read('public/app.js');
 assert.match(app,/state\.role==='admin'\)\{bootFinished\(\);location\.replace\('\/admin'\)/);
 assert.match(app,/button\('dashboard','Dashboard'\)\+button\('calendar','Calendario'\)/);
});

test('anonymous requests cannot read the admin-only API',async()=>{
 const r=await adminConsole.fetch(new Request('https://edgoria.example/api/admin?route=console'));
 assert.equal(r.status,401);
 const routed=await adminApi.fetch(new Request('https://edgoria.example/api/admin?route=console'));
 assert.equal(routed.status,401);
});
test('the admin console API rejects writes',async()=>{
 const r=await adminConsole.fetch(new Request('https://edgoria.example/api/admin?route=console',{method:'POST'}));
 assert.equal(r.status,405);
});
