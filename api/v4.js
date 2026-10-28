import me from '../server/v4-me.js';
import admin_roles from '../server/v4-admin-roles.js';
import mt5_diagnostics from '../server/v4-mt5-diagnostics.js';
import file_upload from '../server/v4-file-upload.js';
import file_delete from '../server/v4-file-delete.js';
import access_management from '../server/v4-access-management.js';
// Consolidated Vercel Hobby dispatcher. Every route retains its own authentication and method checks.
const routes = Object.freeze({'me': me, 'admin-roles': admin_roles, 'mt5-diagnostics': mt5_diagnostics, 'file-upload': file_upload, 'file-delete': file_delete, 'access-management': access_management});
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const name = url.pathname.startsWith('/api/v4-') ? url.pathname.slice('/api/v4-'.length) : url.searchParams.get('route');
    if (!name || !Object.hasOwn(routes, name)) {
      return new Response(JSON.stringify({error:'Ruta no encontrada'}), {status:404, headers:{'Content-Type':'application/json; charset=utf-8'}});
    }
    return routes[name].fetch(request);
  }
};
