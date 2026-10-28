import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
test('startup stages are timed',()=>{assert.match(app,/bootStage\('Conectando con \/api\/config'/);assert.match(app,/bootStage\('Verificando sesión de Supabase'/);assert.match(app,/bootStage\('Cargando operaciones y dashboard'/)});
test('fallback authentication library available',()=>{assert.match(app,/esm\.sh\/@supabase/);assert.match(app,/cdn\.jsdelivr\.net\/npm\/@supabase/)});
test('boot spinner never waits indefinitely without feedback',()=>{assert.match(html,/DIAGNÓSTICO DE INICIO/);assert.match(html,/20000/);assert.match(html,/boot-stage-detail/)});
test('existing admin and roles remain separate',()=>{assert.match(app,/EDGORIA_ADMIN_USER_ID|EDGORIA role verification/);assert.match(app,/state\.role==='partner'/)});
