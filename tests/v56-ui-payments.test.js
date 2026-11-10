import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as calendar from '../public/trading-day.js';
import * as perf from '../public/performance14.js';
import * as risk from '../public/risk15.js';
const read=(p)=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const js=read('public/app.js'), landing=read('public/index.html');
function isolated(){
 const c={...calendar,...perf,...risk,console,Date,Intl,Math,Number,String,Object,Boolean,Set,Map,Array,JSON,URL,URLSearchParams,crypto,localStorage:{getItem(){return null},setItem(){}},document:{querySelector(){return null},querySelectorAll(){return []},addEventListener(){}},window:{},setInterval(){},setTimeout(){return 1},clearTimeout(){},navigator:{},location:{search:'',hash:'',origin:'https://edgoria.example'},fetch(){throw Error('network disabled')}};
 c.globalThis=c;
 const code=js.replace(/^import[^\n]*\n/gm,'').replace(/\ninit\(\);\s*$/,'\n');
 new vm.Script(code+'\nglobalThis.__ed56={dashboard,sidebarNavigation,adminView,membership,state};').runInNewContext(c,{timeout:3000});
 return c.__ed56;
}
test('menu order strictly follows request, while keeping bottom account group',()=>{
 const x=isolated(); x.state.role='trader';const html=x.sidebarNavigation();
 const names=['Dashboard','Calendario','Journal','Analytics','Strategy Lab','Risk Watch','AI Coach','Reportes','Cuenta','Mis Cuentas','Suscripción','Ajustes'];
 let pos=-1;for(const n of names){const i=html.indexOf('>'+n+'</button>');assert.ok(i>pos,`Missing/out of order: ${n}`);pos=i;}
});
test('Insights full width and daily risk panel removed, dashboard still renders',()=>{
 const x=isolated();let html=x.dashboard();
 assert.match(html,/Insights de EDGORIA/);assert.doesNotMatch(html,/Plan de riesgo del día/);
 assert.match(read('public/edgoria56.css'),/grid-template-columns:minmax\(0,1fr\)/);
 assert.doesNotMatch(html,/(NaN|undefined)/);
 x.state.user={id:'test',user_metadata:{full_name:'Demo'}};x.state.profile={full_name:'Demo'};x.state.period='all';
 x.state.data.accounts=[{id:'a1',account_size:10000,name:'Test',created_at:'2026-10-01T10:00:00Z'}];
 x.state.data.trades=[{id:'1',account_id:'a1',closed_at:'2026-10-02T16:00:00Z',pnl:30,symbol:'EURUSD',risk:20},{id:'2',account_id:'a1',closed_at:'2026-10-03T16:00:00Z',pnl:-10,symbol:'XAUUSD',risk:20}];
 html=x.dashboard();assert.match(html,/EURUSD/);assert.doesNotMatch(html,/(NaN|undefined)/);
});
test('landing displays offer and private wording, with login CTA',()=>{
 assert.match(landing,/US\$14\.99/);assert.match(landing,/US\$10\.99/);assert.match(landing,/5 cuentas vinculadas/);
 assert.match(landing,/Pago manual en USDT/);assert.match(landing,/href="\/app\?register=1"/);
 assert.doesNotMatch(landing,/EDGORIA utiliza autenticación con Supabase/);
});
test('manual payment actions gated to admin, with independent paid record',()=>{
 const server=read('server/v4-access-management.js');const sql=read('supabase/edgoria_v56_manual_usdt.sql');
 assert.match(server,/requireAdmin\(req\)/);assert.match(server,/EDGORIA_USDT_MANUAL_ENABLED/);
 assert.match(server,/USDT_RECEIVED_AND_VERIFIED/);assert.match(server,/edgoria_record_usdt_payment/);
 assert.match(sql,/enable row level security/);assert.match(sql,/revoke all on public\.edgoria_manual_subscriptions from anon,authenticated/);
 assert.match(sql,/edgoria_manual_payment_audit/);assert.match(sql,/grant execute on function public\.edgoria_record_usdt_payment.*service_role/);
});
test('server enforces at most five MT5 connections and database trigger guard',()=>{
 assert.match(read('server/mt5-connect.js'),/owned\.length>=5/);
 assert.match(read('supabase/edgoria_v56_manual_usdt.sql'),/create trigger edgoria_five_mt5_links/);
});
test('membership shows limited connections and launch price without auto checkout',()=>{
 const x=isolated();const html=x.membership();
 assert.match(html,/US\$10\.99/);assert.match(html,/US\$14\.99/);assert.match(html,/Conexiones MT5/);
 assert.doesNotMatch(html,/start-checkout/);
 assert.match(read('api/checkout.js'),/EDGORIA_USDT_MANUAL_ENABLED/);
});
