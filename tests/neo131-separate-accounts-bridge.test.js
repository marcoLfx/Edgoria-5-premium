import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const slice=(start,end)=>src.slice(src.indexOf(start),src.indexOf(end,src.indexOf(start)));
test('Mis cuentas MT5 is its own screen and only has create/edit/delete controls',()=>{
 const accounts=slice('function mt5AccountsManager(){','function connectV2(){');
 assert.match(src,/prop:accountsView/);
 assert.match(accounts,/function accountsView\(\)/);
 assert.match(accounts,/data-action="new-account"/);
 assert.match(accounts,/data-action="edit-account"/);
 assert.match(accounts,/data-action="delete-account"/);
 assert.doesNotMatch(accounts,/v4-upload-form|bridge-form|mt5-connect|Importar Excel.*<form/);
});
test('Bridge only links existing accounts and retains Excel importer in its own view',()=>{
 const bridge=slice('function connectV2(){','function v4FilePanel(){');
 assert.doesNotMatch(bridge,/mt5AccountsManager\(\)|data-action="new-account"|data-action="edit-account"|data-action="delete-account"/);
 assert.match(bridge,/data-view="prop"/);
 assert.match(bridge,/id="bridge-form"/);
 assert.match(bridge,/href="#mt5-import-section"/);
 assert.match(src,/function connectV4\(\)\{return v3ConnectView\(\)\+v4FilePanel\(\)\}/);
 assert.match(src,/id="v4-upload-form"/);
 assert.match(src,/fetch\('\/api\/v4-file-upload'/);
});
test('account deletion requires a confirmation and is scoped to its logged in user',()=>{
 const action=slice("case 'delete-account':", "case 'refresh-sync':");
 assert.match(action,/window\.confirm/);
 assert.match(action,/window\.prompt/);
 assert.match(action,/confirmation!=='ELIMINAR'/);
 assert.match(action,/\.eq\('user_id',state\.user\.id\)/);
 assert.match(action,/if\(state\.account===account\.id\)state\.account='all'/);
 assert.match(action,/refreshData\(\)/);
});
test('versioned assets force new JavaScript and retain sidebar and current UI',()=>{
 assert.match(html,/app\.js\?v=4\.2\.0/);
 assert.match(html,/neo13\.css\?v=17\.0/);
 assert.match(src,/id="sidebar-scrollrail"/);
 assert.doesNotMatch(src,/Playbooks/);
});
