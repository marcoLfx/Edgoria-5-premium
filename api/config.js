// Vercel Function. Only publishable Supabase credentials may reach the browser.
export default {
  fetch(request) {
    if(request.method !== 'GET') return Response.json({error:'Método no permitido'}, {status:405,headers:{Allow:'GET'}});
    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/$/,'');
    const key = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '').trim();
    let validUrl = false;
    try {
      const u=new URL(url);
      validUrl=u.protocol==='https:' && u.username==='' && u.password==='' && u.pathname==='/' && /^[-a-z0-9]+\.supabase\.co$/i.test(u.hostname);
    }catch{}
    let legacyAnon = false;
    if (/^eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/.test(key)) {
      try {
        const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8'));
        legacyAnon = payload.role === 'anon';
      } catch {}
    }
    const validKey = /^sb_publishable_[a-zA-Z0-9_-]{12,}$/.test(key) || legacyAnon;
    const configured = validUrl && validKey;
    return Response.json({configured,url:configured?url:null,publishableKey:configured?key:null}, {headers:{'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff'}});
  }
};
