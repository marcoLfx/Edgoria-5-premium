// EDGORIA 5.7 | Pure administration view-model. No credentials or persistence.
export const ADMIN_TIMEZONE = 'America/Lima';
export const ACTIVE_STATUSES = new Set(['active']);
export function dateKey(value, zone=ADMIN_TIMEZONE){
  if(!value)return '';
  const d=new Date(value);if(!Number.isFinite(d.getTime()))return '';
  return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
}
export function longDate(value, zone=ADMIN_TIMEZONE){
  if(!value)return '—';const d=new Date(value);if(!Number.isFinite(d.getTime()))return '—';
  return new Intl.DateTimeFormat('es-PE',{timeZone:zone,year:'numeric',month:'short',day:'2-digit'}).format(d);
}
export function money(cents){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(cents||0)/100)}
export function monthName(month){
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return '';
  return new Intl.DateTimeFormat('es-PE',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${month}-15T12:00:00Z`));
}
export function shiftedMonth(month,delta){
  const [year,m]=month.split('-').map(Number);
  const d=new Date(Date.UTC(year,m-1+delta,1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;
}
export function monthCells(month){
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return [];
  const [year,m]=month.split('-').map(Number);
  const first=new Date(Date.UTC(year,m-1,1));
  const offset=(first.getUTCDay()+6)%7; // Monday first
  const days=new Date(Date.UTC(year,m,0)).getUTCDate();
  return Array.from({length:Math.ceil((offset+days)/7)*7},(_,i)=>{
    const index=i-offset+1;
    const dt=new Date(Date.UTC(year,m-1,index));
    return {date:dt.toISOString().slice(0,10),day:dt.getUTCDate(),inside:index>=1&&index<=days};
  });
}
export function periodState(period, now=Date.now()){
  if(period.status==='revoked')return 'revoked';
  const start=Date.parse(period.starts_at),end=Date.parse(period.expires_at);
  if(!Number.isFinite(start)||!Number.isFinite(end))return 'invalid';
  if(end<=now)return 'expired';
  if(start>now)return 'scheduled';
  return 'active';
}
export function isPeriodOnDay(period,date,zone=ADMIN_TIMEZONE){
  const start=dateKey(period.starts_at,zone),end=dateKey(new Date(Date.parse(period.expires_at)-1),zone);
  if(!start||!end||period.status==='revoked')return false;
  // Calendar shows any local calendar day touched by the active interval.
  return start<=date&&date<=end;
}
export function calendarSummary(periods,date){
  const running=periods.filter(p=>isPeriodOnDay(p,date));
  const starts=periods.filter(p=>dateKey(p.starts_at)===date);
  const expires=periods.filter(p=>dateKey(p.expires_at)===date);
  return {running,starts,expires,paidCents:starts.reduce((a,p)=>a+Number(p.amount_usd_cents||0),0)};
}
export function stats(data,now=Date.now()){
  const users=data.users||[],periods=data.periods||[];
  const paid=periods.filter(p=>Number.isFinite(Date.parse(p.verified_at)));
  return {
    users:users.length,
    pending:users.filter(u=>u.access_status==='pending').length,
    live:users.filter(u=>u.access_status==='active' && u.manual_subscription?.status==='active' && Date.parse(u.manual_subscription.expires_at)>now).length,
    expiring7:users.filter(u=>u.manual_subscription?.status==='active'&&Date.parse(u.manual_subscription.expires_at)>now&&Date.parse(u.manual_subscription.expires_at)<=now+7*86400000).length,
    verifiedPayments:paid.length,
    recordedCents:paid.reduce((acc,p)=>acc+Number(p.amount_usd_cents||0),0)
  };
}
export function sanitizeUserLookup(data){return new Map((data.users||[]).map(u=>[u.user_id,u]));}
export function userDisplay(user){return String(user?.full_name||user?.email||'Usuario').trim()}
export function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
