const toggle=document.querySelector('#nav-toggle');
const mobile=document.querySelector('#mobile-menu');
function setMenu(open){if(!mobile||!toggle)return;mobile.hidden=!open;toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Cerrar menú':'Abrir menú');}
if(toggle&&mobile){toggle.addEventListener('click',()=>setMenu(mobile.hidden));mobile.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));document.addEventListener('keydown',e=>{if(e.key==='Escape')setMenu(false);});}
const featureContent={
 overview:{code:'01 / VISIÓN GENERAL',icon:'◫',title:'Tu jornada, sin ruido.',body:'Consulta P&L, win rate, profit factor, curva de capital y los resultados relevantes sin perseguir indicadores por toda la pantalla.',bullets:['Resumen compacto','Operaciones cerradas','Vista por cuenta']},
 journal:{code:'02 / REGISTRO',icon:'▤',title:'Cada operación tiene contexto.',body:'Centraliza tu historial y añade notas y etiquetas para convertir cada sesión en una revisión clara.',bullets:['Historial MT5','Notas por sesión','Orden y seguimiento']},
 analytics:{code:'03 / ANÁLISIS',icon:'▥',title:'Los patrones se ven con perspectiva.',body:'Explora los resultados por símbolo, horario y estrategia según los datos reales disponibles.',bullets:['Filtros por período','Mapas de calor','Resultados comparables']},
 strategy:{code:'04 / MÉTODO',icon:'◈',title:'Tus reglas merecen un lugar.',body:'Construye y consulta playbooks para revisar qué estrategias ejecutas y cómo las documentas.',bullets:['Playbooks','Criterios de entrada','Revisión de proceso']}
};
const tabs=[...document.querySelectorAll('[role="tab"][data-feature]')];
const panel=document.querySelector('#panel-feature');
function setFeature(id,focus=false){const f=featureContent[id];if(!f||!panel)return;tabs.forEach(t=>{const active=t.dataset.feature===id;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;if(active&&focus)t.focus();});panel.setAttribute('aria-labelledby','tab-'+id);document.querySelector('#feature-display-code').textContent=f.code;document.querySelector('#feature-icon').textContent=f.icon;document.querySelector('#feature-title').textContent=f.title;document.querySelector('#feature-body').textContent=f.body;const list=document.querySelector('#feature-bullets');list.replaceChildren(...f.bullets.map(s=>{const el=document.createElement('span');el.textContent=s;return el}));}
tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>setFeature(tab.dataset.feature));tab.addEventListener('keydown',e=>{const d=e.key==='ArrowDown'||e.key==='ArrowRight'?1:e.key==='ArrowUp'||e.key==='ArrowLeft'?-1:0;if(d){e.preventDefault();const next=tabs[(i+d+tabs.length)%tabs.length];setFeature(next.dataset.feature,true)}else if(e.key==='Home'||e.key==='End'){e.preventDefault();setFeature(tabs[e.key==='Home'?0:tabs.length-1].dataset.feature,true)}});});
// Illustrative visual only: never materialize demo values as real trade metrics.
const heatmap=document.querySelector('.heatmap');if(heatmap){for(let i=0;i<56;i++){const s=document.createElement('span');const intensity=[0,1,2,0,3,1,4,2,1,0,3,2][(i*7+Math.floor(i/8))%12];s.className='heat-'+intensity;heatmap.append(s)}}
const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
if(!reduced&&'IntersectionObserver' in window){const obs=new IntersectionObserver(entries=>{for(const e of entries){if(e.isIntersecting){e.target.classList.add('visible');obs.unobserve(e.target)}}},{rootMargin:'0px 0px -35px 0px',threshold:.08});document.querySelectorAll('.reveal').forEach(el=>obs.observe(el))}else{document.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible'))}
// Preserve affiliate links and route email recovery/callback links to private app.
const params=new URLSearchParams(location.search);const ref=params.get('ref');
if(ref&&/^edg-[a-f0-9]{12}$/.test(ref)){document.querySelectorAll('a[href^="/app"]').forEach(a=>{const url=new URL(a.getAttribute('href'),location.origin);url.searchParams.set('ref',ref);a.href=url.pathname+url.search;});}
if(location.hash.includes('type=recovery')||params.get('type')==='recovery'||params.has('code')||params.has('token_hash')||location.hash.includes('access_token=')){const redirect=new URL('/app'+location.search+location.hash,location.origin);location.replace(redirect.href);}
