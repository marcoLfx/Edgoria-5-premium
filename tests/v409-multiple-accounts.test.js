import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
test('new-account and edit-account actions are dispatched to real modal',()=>{
 assert.match(app,/case 'new-account':accountModal\(null\);break;/);
 assert.match(app,/case 'edit-account':\{/);
 assert.match(app,/accountModal\(account\);break;/);
 assert.match(app,/function accountModal\(a\)/);
 assert.match(app,/id="account-form"/);
});
test('admin and trader can manage private accounts separately from the Bridge',()=>{
 assert.match(app,/function mt5AccountsManager\(\)/);
 assert.match(app,/function accountsView\(\)/);
 assert.match(app,/prop:accountsView/);
 assert.match(app,/function connectV4\(\)\{return v3ConnectView\(\)\+v4FilePanel\(\)\}/);
 assert.match(app,/function connectV2\(\)/);
 assert.match(app,/function mt5AccountsManager\(\)/);
 assert.match(app,/adminPrivateViews=new Set\(\['dashboard','trades','calendar','analytics','mindset','prop','connect'\]\)/);
});
test('account creation uses own authenticated session and preserves account ID',()=>{
 assert.match(app,/table==='accounts'\?await sb\.from\(table\)\.insert\(\{\.\.\.row,user_id:state\.user\.id\}\)\.select\('id'\)\.single\(\)/);
 assert.match(app,/if\(created\?\.id\)state\.account=created\.id/);
 assert.match(app,/return result\?\.data\|\|null/);
 assert.match(app,/id\?'update':'insert'/);
 assert.match(app,/\.eq\('id',id\)\.eq\('user_id',state\.user\.id\)/);
});
test('import dropdown selects newly created account and remains versioned',()=>{
 assert.match(app,/function v4FilePanel\(\)/);
 assert.match(app,/name="account_id" required>\$\{accounts\.map\(a=>`<option value="\$\{escapeHTML\(a\.id\)\}" \$\{state\.account===a\.id\?'selected':''\}/);
 assert.match(html,/app\.js\?v=4\.2\.0/);
 assert.doesNotMatch(app,/Playbooks|playbook/i);
});
