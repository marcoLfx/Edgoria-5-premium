import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const f=path=>readFileSync(new URL(path,root),'utf8');
test('application is an explicit form, never a signup side effect',()=>{
 const ui=f('public/app.js');
 assert.match(ui,/id="partner-application-form"/);
 assert.match(ui,/audience_size/);
 assert.match(ui,/name="motivation"/);
 assert.match(ui,/function ensureRequestedAffiliate\(\)[\s\S]{0,180}return;/);
 assert.doesNotMatch(ui,/case 'enroll-affiliate':await apiPost\('affiliate-enroll'\)/);
});
test('partner request is authenticated, user-scoped and validates fields',()=>{
 const api=f('api/affiliate-enroll.js');
 assert.match(api,/userContext\(req,\{allowPending:true\}\)/);
 assert.match(api,/user_id:user.id/);
 assert.match(api,/name.length<3/);
 assert.match(api,/motivation.length<40/);
 assert.doesNotMatch(api,/status:'active'/);
 assert.doesNotMatch(api,/SUPABASE_SECRET/);
});
test('backend approval generates ref and admin lists requests',()=>{
 const server=f('server/v60-affiliates.js');
 const admin=f('public/admin59.js');
 const sql=f('supabase/edgoria_v62_partners_and_account_limit.sql');
 assert.match(server,/approve-application/);
 assert.match(server,/rpc\/edgoria_review_partner_request/);
 assert.match(admin,/Solicitudes de partners/);
 assert.match(admin,/Compras verificadas/);
 assert.match(sql,/v_code:='edg-'/);
 assert.match(sql,/on conflict\(user_id\)/);
 assert.match(sql,/grant execute on function public.edgoria_review_partner_request.*to service_role/);
 assert.match(sql,/revoke all on function public.edgoria_review_partner_request.*authenticated/);
});
test('account limit applied in user interface and database trigger',()=>{
 const ui=f('public/app.js');
 const sql=f('supabase/edgoria_v62_partners_and_account_limit.sql');
 assert.match(ui,/accounts.length\}\/5/);
 assert.match(ui,/accounts\.length>=5/);
 assert.match(sql,/create trigger eg62_max_five_accounts before insert on public\.accounts/);
 assert.match(sql,/pg_advisory_xact_lock/);
 assert.match(sql,/v_total>=5/);
});
test('referrals follow landing registration and admin tracks verified sales',()=>{
 const home=f('public/index.html');
 const ref=f('public/edgoria62-referral.js');
 const sql=f('supabase/edgoria_v62_partners_and_account_limit.sql');
 assert.match(home,/edgoria62-referral\.js/);
 assert.match(ref,/searchParams\.set\('ref',code\)/);
 assert.match(f('public/admin59.js'),/sales\.length\?sales\.map/);
 assert.doesNotMatch(sql,/edgoria_access_periods|edgoria_v4_access_grants|edgoria_manual_sales/);
});
