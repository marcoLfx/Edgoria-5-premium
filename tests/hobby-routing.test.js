import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import v4 from '../api/v4.js';
import mt5 from '../api/mt5.js';
const conf = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url),'utf8'));
const functions = readdirSync(new URL('../api/', import.meta.url)).filter(n=>n.endsWith('.js'));
const oldRoutes = {
 '/api/v4-me':'/api/v4?route=me',
 '/api/v4-admin-roles':'/api/v4?route=admin-roles',
 '/api/v4-mt5-diagnostics':'/api/v4?route=mt5-diagnostics',
 '/api/v4-file-upload':'/api/v4?route=file-upload',
 '/api/v4-file-delete':'/api/v4?route=file-delete',
 '/api/mt5-connect':'/api/mt5?route=connect',
 '/api/mt5-disconnect':'/api/mt5?route=disconnect',
 '/api/mt5-ingest':'/api/mt5?route=ingest',
 '/api/mt5-rotate':'/api/mt5?route=rotate'
};
test('Hobby function cap respected with headroom',()=>{
 assert.ok(functions.length<=12, 'Functions '+functions.length+' exceed Hobby cap');
 assert.equal(functions.length,9);
});
test('rewrite all legacy V4 and MT5 URLs without changing public frontend paths',()=>{
 const bySource=Object.fromEntries(conf.rewrites.map(x=>[x.source,x.destination]));
 for(const [source,dest] of Object.entries(oldRoutes)) assert.equal(bySource[source],dest);
});
test('v4 rejects unknown routes and file upload GET',async()=>{
 const unknown=await v4.fetch(new Request('https://example.test/api/v4?route=invalid'));
 assert.equal(unknown.status,404);
 const rejected=await v4.fetch(new Request('https://example.test/api/v4?route=file-upload'));
 assert.equal(rejected.status,405);
});
test('mt5 rejects unknown routes and GET ingestion',async()=>{
 const unknown=await mt5.fetch(new Request('https://example.test/api/mt5?route=invalid'));
 assert.equal(unknown.status,404);
 const rejected=await mt5.fetch(new Request('https://example.test/api/mt5?route=ingest'));
 assert.equal(rejected.status,405);
});
test('secrets not copied into client or rewrite destinations',()=>{
 const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.doesNotMatch(app,/sb_secret_[A-Za-z0-9_-]{10,}|eyJhbGciOi[A-Za-z0-9_-]{20,}/);
 for(const rewrite of conf.rewrites) assert.match(rewrite.destination,/^\/api\/(v4|mt5)\?route=[a-z0-9-]+$/);
});

test('dispatch works if Vercel preserves original request pathname',async()=>{
 const v4Upload=await v4.fetch(new Request('https://example.test/api/v4-file-upload'));
 assert.equal(v4Upload.status,405);
 const mt5Ingest=await mt5.fetch(new Request('https://example.test/api/mt5-ingest'));
 assert.equal(mt5Ingest.status,405);
});
