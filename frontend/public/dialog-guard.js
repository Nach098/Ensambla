// A click can target <dialog> when a text-selection drag ends on its backdrop.
// Dismiss only a complete, stationary gesture that starts and ends outside.
// Forms and import steps require an explicit close, cancel or Escape instead.
export function bindDialogDismiss(dialog,onDismiss,{threshold=8}={}){
  let gesture=null,ready=false;
  const reset=()=>{gesture=null;ready=false;};
  const outside=event=>{
    if(event.target!==dialog||!Number.isFinite(event.clientX)||!Number.isFinite(event.clientY))return false;
    const r=dialog.getBoundingClientRect();
    return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom;
  };
  const down=event=>{
    reset();
    if(!dialog.open||dialog.inert||event.button!==0||event.isPrimary===false||!outside(event))return;
    gesture={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false};
  };
  const move=event=>{
    if(gesture&&event.pointerId===gesture.id&&Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>threshold)gesture.moved=true;
  };
  const up=event=>{
    if(!gesture||event.pointerId!==gesture.id){reset();return;}
    move(event);
    ready=event.button===0&&event.isPrimary!==false&&!gesture.moved&&outside(event);
    gesture=null;
  };
  const click=event=>{
    const dismiss=ready;reset();
    if(!dismiss||!dialog.open||dialog.inert||event.detail===0||event.button!==0||!outside(event))return;
    if(dialog.querySelector('form,input,textarea,select'))return;
    onDismiss();
  };
  const listeners={pointerdown:down,pointermove:move,pointerup:up,pointercancel:reset,click,close:reset};
  for(const [name,handler] of Object.entries(listeners))dialog.addEventListener(name,handler);
  return {reset,destroy(){reset();for(const [name,handler] of Object.entries(listeners))dialog.removeEventListener(name,handler);}};
}
