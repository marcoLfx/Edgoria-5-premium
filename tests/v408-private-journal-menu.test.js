import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
test('admin has private MT5 Bridge access while partner stays isolated',()=>{
 assert.match(js,/adminPrivateViews=new Set\(\['dashboard','trades','calendar','analytics','mindset','prop','connect'\]\)/);
 assert.match(js,/state\.role==='partner'\?partnerAllowedViews/);
 assert.match(js,/state\.role==='admin'&&!state\.personalJournalLoaded/);
 assert.match(js,/state\.personalJournalLoaded=true/);
 assert.match(js,/role==='admin'.*personalJournalLoaded/);
});
test('Excel import is centralized in MT5 Bridge, preserving file upload and session API',()=>{
 assert.match(js,/function connectV4\(\)\{return v3ConnectView\(\)\+v4FilePanel\(\)\}/);
 assert.match(js,/id=\"mt5-import-section\"/);
 assert.match(js,/id="v4-upload-form"/);
 assert.match(js,/fetch\('\/api\/v4-file-upload'/);
 assert.doesNotMatch(js,/data-view="import"/);
 assert.doesNotMatch(js,/n:'Importar Excel MT5'/);
 assert.match(js,/href="#mt5-import-section"/);
});
test('sidebar works with mouse wheel and mouse draggable scrollbar',()=>{
 assert.match(js,/pointerdown/);
 assert.match(js,/setPointerCapture/);
 assert.match(js,/rail\.addEventListener\('wheel'/);
 assert.match(css,/\.sidebar-scrollrail\{/);
 assert.match(css,/\.sidebar-scroll\{/);
 assert.match(js,/data-action="signout" title="Cerrar sesión"/);
});
test('No Playbooks menu, new version cache buster',()=>{
 assert.doesNotMatch(js,/Playbooks|playbook/i);
 assert.match(html,/app\.js\?v=4\.2\.0/);
 assert.match(html,/styles\.css\?v=17\.0/);
});
