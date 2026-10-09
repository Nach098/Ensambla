// Academic simulation only. No signature, network validation or real gate.
// Production authorization belongs on the server, on every request.
export const HOUR=60*60*1000;
export const OFFLINE_HOURS=72;
export const accessScenarios=[
  {id:'connected',label:'Con conexión',hours:0,online:true},
  {id:'offline',label:'24 h sin internet',hours:24,online:false},
  {id:'expired',label:'72 h sin internet',hours:72,online:false},
  {id:'trial',label:'Fin de la prueba',hours:12,online:false,trialHours:12},
  {id:'unpaid',label:'Suscripción vencida',hours:1,online:true,accountActive:false},
  {id:'clock',label:'Reloj atrasado',hours:-1,online:false},
];

export function issueDemoLease({serverNow,accessUntil,accountActive=true}){
  if(!Number.isFinite(serverNow)||!Number.isFinite(accessUntil))throw new Error('Las fechas deben ser válidas.');
  if(!accountActive||accessUntil<=serverNow)return null;
  return {issuedAt:serverNow,expiresAt:Math.min(serverNow+OFFLINE_HOURS*HOUR,accessUntil)};
}

export function assessDemoAccess({lease,now,online,accountActive=true,lastSeenAt=lease?.issuedAt}){
  const base={canRead:true,canExport:true,canWrite:false,canBuild:false,remainingHours:0};
  if(!Number.isFinite(now)||!lease||!Number.isFinite(lease.issuedAt)||!Number.isFinite(lease.expiresAt)||lease.expiresAt<=lease.issuedAt)return {...base,status:'reconnect',title:'Necesitás validar el acceso',copy:'Conectate para comprobar tu cuenta. Tus datos siguen disponibles.'};
  // This detects a simple rollback; it cannot make a browser clock trusted.
  if(!online&&Number.isFinite(lastSeenAt)&&now<lastSeenAt-5*60*1000)return {...base,status:'clock',title:'Volvé a validar la hora',copy:'La fecha del equipo cambió. Conectate antes de seguir cargando datos.'};
  if(online&&!accountActive)return {...base,status:'unpaid',title:'Tu suscripción necesita atención',copy:'Podés consultar y exportar. El propietario debe reactivar el plan para continuar.'};
  if(now>=lease.expiresAt)return {...base,status:'expired',title:'Es momento de reconectar',copy:'El permiso temporal terminó. Conectate para comprobar tu prueba o suscripción antes de continuar.'};
  return {...base,canWrite:true,canBuild:online,remainingHours:(lease.expiresAt-now)/HOUR,status:online?'connected':'offline',title:online?'Todo listo para trabajar':'Podés seguir trabajando',copy:online?'La cuenta se valida al conectar. En el producto final, los cambios se guardan en Ensambla.':'Cargá tus datos con el permiso temporal. Los cambios quedan pendientes hasta reconectar.'};
}

export function scenarioAccess(id='connected'){
  const scenario=accessScenarios.find(s=>s.id===id)||accessScenarios[0];
  // Relative time, independent of the device's real clock or stored trial.
  const start=Date.UTC(2026,0,1);
  const accessUntil=start+(scenario.trialHours??30*24)*HOUR;
  const lease=issueDemoLease({serverNow:start,accessUntil});
  return {scenario,lease,access:assessDemoAccess({lease,now:start+scenario.hours*HOUR,online:scenario.online,accountActive:scenario.accountActive!==false,lastSeenAt:start})};
}
