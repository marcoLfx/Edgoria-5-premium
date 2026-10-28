import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');
test('Excel entry removed from left menu and global header',()=>{
  assert.doesNotMatch(js,/data-view="import"/);
  assert.doesNotMatch(js,/n:'Importar Excel MT5'/);
  assert.match(js,/navGroup\('TU ACTIVIDAD',\['dashboard','trades','calendar','analytics'\]\)/);
});
test('Excel importer and multi-account logic preserved inside MT5 Bridge',()=>{
  assert.match(js,/function connectV4\(\)\{return v3ConnectView\(\)\+v4FilePanel\(\)\}/);
  assert.match(js,/href="#mt5-import-section"/);
  assert.match(js,/id="v4-upload-form"/);
  assert.match(js,/data-action="new-account"/);
  assert.match(js,/api\/v4-file-upload/);
  assert.match(js,/apiPost\('v4-file-delete'/);
});
test('UI version and responsive professional styles',()=>{
  assert.match(html,/styles\.css\?v=17\.0/);
  assert.match(html,/app\.js\?v=4\.2\.0/);
  assert.match(css,/\.mt5-bridge-hub/);
  assert.match(css,/#mt5-import-section/);
  assert.match(css,/@media\(max-width:550px\)/);
});
