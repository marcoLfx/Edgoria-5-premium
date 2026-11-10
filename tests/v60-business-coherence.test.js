import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const txt=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const vercel=JSON.parse(txt('vercel.json'));
test('Vercel configuration is structurally valid and retains app/admin/recovery',()=>{
 for(const rule of vercel.headers){assert.equal(typeof rule.source,'string');for(const h of rule.headers){assert.deepEqual(Object.keys(h).sort(),['key','value']);}}
 for(const path of ['/app','/admin','/reset-password'])assert.ok(vercel.rewrites.some(x=>x.source===path));
});
test('public landing uses the defined prices and restrained integration section',()=>{
 const page=txt('public/index.html');
 for(const value of ['US$10.99','US$14.99','MetaTrader 5','cTrader','Próximamente','id="afiliados"','id="integraciones"','/afiliados.html'])assert.ok(page.includes(value),value);
 assert.ok(!page.includes('NOVA 4.2'));
});
test('admin uses separate affiliates tab and manual action only, no automatic activation',()=>{
 const page=txt('public/admin59.js');
 assert.ok(page.includes("['affiliates','Afiliados']"));
 assert.ok(page.includes("'/api/admin?route=affiliates'"));
 assert.ok(page.includes("'verify-sale'"));
 assert.ok(page.includes('access_granted')===false);
});
test('server validates admins and never grants a trader subscription through recorded sale',()=>{
 const api=txt('server/v60-affiliates.js');
 assert.ok(api.includes('requireAdmin(request)'));
 assert.ok(api.includes("process.env.EDGORIA_AFFILIATES_V60_ENABLED==='1'"));
 assert.ok(!api.includes('edgoria_grant_manual_access'));
 assert.ok(!api.includes('EDGORIA_ACCESS_PERIODS_ENABLED'));
 assert.ok(api.includes("action==='verify-sale'"));
});
test('sales migration has one-time commission and RLS without public writes',()=>{
 const sql=txt('supabase/edgoria_v60_affiliates_manual.sql');
 for(const x of ['edgoria_manual_sales','edgoria_partner_commissions','edgoria_commercial_audit','enable row level security','rate_basis_points set default 2500','not exists','to service_role'])assert.ok(sql.includes(x),x);
 assert.ok(!sql.includes('edgoria_grant_manual_access'));
 assert.ok(!sql.includes('edgoria_suspend_manual_access'));
});
test('new affiliate enrollment defaults to 25 percent',()=>{
 assert.ok(txt('api/affiliate-enroll.js').includes('rate_basis_points:2500'));
});
test('existing journal, MT5 and reset password preserved',()=>{
 for(const path of ['public/app.js','server/mt5-connect.js','public/reset-password.js','public/admin.html','public/afiliados.html'])assert.ok(existsSync(new URL('../'+path,import.meta.url)),path);
});
