/* Link attribution is completed only after account registration. */
(()=>{try{
 const code=new URLSearchParams(location.search).get('ref');
 if(!code||!/^edg-[a-f0-9]{12}$/.test(code))return;
 localStorage.setItem('edgoria_ref',JSON.stringify({code,seen:Date.now()}));
 for(const link of document.querySelectorAll('a[href^="/app"]')){
  const url=new URL(link.href,location.origin);url.searchParams.set('ref',code);
  link.setAttribute('href',url.pathname+url.search);
 }
 }catch(err){console.warn('No se pudo conservar la invitación de afiliado',err?.message||'')}
})();
