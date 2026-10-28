import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = file => readFileSync(new URL(file, import.meta.url), 'utf8');
const app=read('../public/app.js');
const index=read('../public/index.html');
const me=read('../server/v4-me.js');
const access=read('../server/v4-access.js');
const css=read('../public/edgoria311.css');

test('pending, email-unconfirmed and suspended failures retain their codes in browser',()=>{
  const identity=app.slice(app.indexOf('async function loadIdentity(){'),app.indexOf('async function logout(){'));
  assert.match(identity,/if\(\['ACCESS_PENDING','EMAIL_UNCONFIRMED','ACCESS_DISABLED'\]\.includes\(e\?\.code\)\)throw e/);
  assert.doesNotMatch(identity,/catch\(e\)\{console\.error\(.*?throw new Error/);
  assert.match(app,/renderPending\(e\.code\)/);
  assert.match(app,/renderSuspended\(\)/);
});
test('no grant cannot result in implicit active access from v4-me',()=>{
  assert.match(me,/grants\[0\]\|\|\{access_status:'pending'/);
  assert.doesNotMatch(me,/grants\[0\]\|\|\{access_status:'active'/);
});
test('commercial API failure cannot blank administrative approvals',()=>{
  const check=app.slice(app.indexOf('async function checkAdmin(){'),app.indexOf('async function fetchAccessAdmin(){'));
  assert.match(check,/Promise\.allSettled\(/);
  assert.match(check,/fetchAccessAdmin\(\)/);
  assert.match(check,/fetchAdminRoles\(\)/);
  assert.match(check,/apiGet\('admin'\)/);
  assert.match(check,/state\.isAdmin=true/);
  assert.match(app,/function eg311UsersOverview\(\)/);
  assert.match(app,/case 'retry-admin'/);
  assert.match(access,/CONFLICT/);
});
test('release fingerprint, styling, private journal and branded confirmation email ship',()=>{
  assert.match(index,/edgoria311\.css\?v=3\.1\.2/);
  assert.match(index,/app\.js\?v=4\.2\.0/);
  assert.match(app,/EDGORIA \/ NOVA 4\.2/);
  assert.match(app,/name="screenshots"/);
  assert.match(css,/prefers-reduced-motion/);
  const json=JSON.parse(read('../public/release.json'));
  assert.equal(json.version,'4.2.0');
  assert.match(read('../EMAIL_BIENVENIDA_SUPABASE.html'),/\{\{ \.ConfirmationURL \}\}/);
});
