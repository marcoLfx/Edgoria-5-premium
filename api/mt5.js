import connect from '../server/mt5-connect.js';
import disconnect from '../server/mt5-disconnect.js';
import ingest from '../server/mt5-ingest.js';
import rotate from '../server/mt5-rotate.js';
// Consolidated Vercel Hobby dispatcher. Every route retains its own authentication and method checks.
const routes = Object.freeze({'connect': connect, 'disconnect': disconnect, 'ingest': ingest, 'rotate': rotate});
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const name = url.pathname.startsWith('/api/mt5-') ? url.pathname.slice('/api/mt5-'.length) : url.searchParams.get('route');
    if (!name || !Object.hasOwn(routes, name)) {
      return new Response(JSON.stringify({error:'Ruta no encontrada'}), {status:404, headers:{'Content-Type':'application/json; charset=utf-8'}});
    }
    return routes[name].fetch(request);
  }
};
