import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p)=>readFileSync(new URL(p,import.meta.url),'utf8');
const app=read('../public/app.js');
const html=read('../public/index.html');
const style=read('../public/edgoria312.css');
const diagnostic=read('../public/version.html');
test('EDGORIA NOVA 4.2 ships clearly visible admin hub and independent version diagnostics',()=>{
 assert.match(html,/edgoria312\.css\?v=3\.1\.2/);
 assert.match(html,/app\.js\?v=4\.2\.0/);
 assert.match(app,/ADMIN CENTER 3\.1\.2/);
 assert.match(diagnostic,/release\.json/);
 assert.match(diagnostic,/nova42\.css/);
 assert.match(style,/eg312-admin-hero/);
});
test('approval remains server driven, with searchable statuses and verified-email safeguard',()=>{
 assert.match(app,/function admin312List\(/);
 assert.match(app,/id="admin-users-search"/);
 assert.match(app,/case 'admin-filter'/);
 assert.match(app,/data-action="access-activate"/);
 assert.match(app,/Debe confirmar su correo|Primero debe confirmar el correo/);
 assert.match(read('../server/v4-access-management.js'),/email_confirmed_at/);
 assert.match(read('../server/v4-user-data.js'),/ACCESS_PENDING/);
 assert.match(app,/name="screenshots"/);
});
