import test from 'node:test';
import assert from 'node:assert/strict';
import {issueDemoLease,assessDemoAccess,scenarioAccess,HOUR} from '../dist/licensing.js';

const start=Date.UTC(2026,0,1),paidUntil=start+30*24*HOUR;
const lease=issueDemoLease({serverNow:start,accessUntil:paidUntil});
test('el permiso temporal termina a las 72 horas exactas aunque siga el período pagado',()=>{
  const before=assessDemoAccess({lease,now:start+72*HOUR-1,online:false});
  const after=assessDemoAccess({lease,now:start+72*HOUR,online:false});
  assert.equal(before.canWrite,true);assert.equal(before.canBuild,false);
  assert.equal(after.canWrite,false);assert.equal(after.canRead,true);assert.equal(after.canExport,true);
});
test('el permiso offline nunca extiende una prueba ni un período pagado',()=>{
  const trialEnd=start+12*HOUR,l=issueDemoLease({serverNow:start,accessUntil:trialEnd});
  assert.equal(l.expiresAt,trialEnd);
  assert.equal(assessDemoAccess({lease:l,now:trialEnd,online:false}).canWrite,false);
  assert.equal(issueDemoLease({serverNow:trialEnd,accessUntil:trialEnd}),null);
  assert.equal(issueDemoLease({serverNow:start,accessUntil:paidUntil,accountActive:false}),null);
});
test('reabrir offline no renueva el permiso y reconectar solo lo renueva con cuenta vigente',()=>{
  const expired=start+73*HOUR;
  assert.equal(assessDemoAccess({lease,now:expired,online:false}).canWrite,false);
  const renewed=issueDemoLease({serverNow:expired,accessUntil:paidUntil});
  assert.equal(renewed.expiresAt,expired+72*HOUR);
  assert.equal(assessDemoAccess({lease:renewed,now:expired,online:true}).canWrite,true);
});
test('una denegación conocida en línea detiene la carga; offline no permite conocer una revocación nueva',()=>{
  assert.equal(assessDemoAccess({lease,now:start+HOUR,online:true,accountActive:false}).status,'unpaid');
  assert.equal(assessDemoAccess({lease,now:start+HOUR,online:false,accountActive:false}).status,'offline');
});
test('un retroceso simple de reloj o permiso inválido pide conexión y conserva lectura y exportación',()=>{
  for(const args of [
    {lease,now:start-HOUR,online:false},
    {lease:null,now:start,online:false},
    {lease:{issuedAt:start,expiresAt:NaN},now:start,online:false},
    {lease,now:NaN,online:false},
  ]){const a=assessDemoAccess(args);assert.equal(a.canWrite,false);assert.equal(a.canRead,true);assert.equal(a.canExport,true);}
});
test('los escenarios de prueba y suscripción vencida no habilitan escritura',()=>{
  for(const id of ['expired','trial','unpaid','clock'])assert.equal(scenarioAccess(id).access.canWrite,false,id);
  assert.equal(scenarioAccess('connected').access.canBuild,true);
  assert.equal(scenarioAccess('offline').access.canBuild,false);
});
