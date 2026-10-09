import {reducedMotion} from './motion.js';

// One timer, explicit pause reasons, and no auto advance during reading or interaction.
export function createAutoplay({delay,advance,reduced=reducedMotion,clock={set:setTimeout,clear:clearTimeout}}){
  let timer=null,destroyed=false;const reasons=new Set();
  function restart(){if(timer!==null)clock.clear(timer);timer=null;if(destroyed||!delay||reduced()||reasons.size)return;timer=clock.set(()=>{timer=null;if(destroyed||reduced()||reasons.size)return;advance();restart();},delay);}
  restart();return {restart,setPaused(reason,paused){if(paused)reasons.add(reason);else reasons.delete(reason);restart();},get running(){return timer!==null;},destroy(){destroyed=true;if(timer!==null)clock.clear(timer);timer=null;}};
}
export function bindCarousel(element,{reduced=reducedMotion,doc=element.ownerDocument||globalThis.document,Observer=globalThis.IntersectionObserver,clock}={}){
  const track=element.querySelector('[data-carousel-track]'),slides=[...track.children];
  const prev=element.querySelector('[data-carousel-control="prev"]'),next=element.querySelector('[data-carousel-control="next"]');
  const dots=[...element.querySelectorAll('[data-carousel-index]')],status=element.querySelector('[data-carousel-status]');
  const toggle=element.querySelector('[data-carousel-toggle]'),page=element.closest?.('.landing');
  const requested=Number(element.dataset?.carouselAutoplay||0),delay=Number.isFinite(requested)&&requested>=3000?requested:0;
  let index=0,timer=null,destroyed=false,auto=null,userPaused=false,autoScrolling=false,observer;
  function update(value,announce=true){
    index=Math.max(0,Math.min(slides.length-1,value));prev.disabled=index===0;next.disabled=index===slides.length-1;
    slides.forEach((slide,i)=>{slide.dataset.carouselActive=String(i===index);});
    dots.forEach((dot,i)=>{dot.setAttribute('aria-current',i===index?'true':'false');dot.classList.toggle('active',i===index);});
    if(status){status.setAttribute?.('aria-live',announce?'polite':'off');status.textContent=`${index+1} de ${slides.length}: ${slides[index].dataset.title}`;}
  }
  function go(value,{manual=true}={}){const to=Math.max(0,Math.min(slides.length-1,value));autoScrolling=!manual;update(to,manual);track.scrollTo({left:slides[to].offsetLeft,behavior:reduced()?'auto':'smooth'});if(manual)auto?.restart();}
  function rotation(){auto?.setPaused('user',userPaused);if(toggle){toggle.textContent=reduced()?'Recorrido manual':userPaused?'Activar recorrido':'Pausar recorrido';toggle.setAttribute?.('aria-pressed',String(userPaused||reduced()));toggle.disabled=reduced();}}
  function click(event){const control=event.target.closest('[data-carousel-control],[data-carousel-index],[data-carousel-toggle]');if(!control||!element.contains(control)||control.disabled)return;if(control.hasAttribute('data-carousel-toggle')){userPaused=!userPaused;rotation();return;}go(control.hasAttribute('data-carousel-index')?Number(control.dataset.carouselIndex):index+(control.dataset.carouselControl==='next'?1:-1));}
  function key(event){if(event.target!==track||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();go(event.key==='Home'?0:event.key==='End'?slides.length-1:index+(event.key==='ArrowRight'?1:-1));}
  function scroll(){clearTimeout(timer);timer=setTimeout(()=>{if(destroyed)return;let closest=0;slides.forEach((s,i)=>{if(Math.abs(s.offsetLeft-track.scrollLeft)<Math.abs(slides[closest].offsetLeft-track.scrollLeft))closest=i;});update(closest,!autoScrolling);autoScrolling=false;},130);}
  const hover=()=>auto?.setPaused('hover',true),unhover=()=>auto?.setPaused('hover',false),focus=()=>auto?.setPaused('focus',true),unfocus=e=>{if(!element.contains(e.relatedTarget))auto?.setPaused('focus',false);};
  const visibility=()=>auto?.setPaused('hidden',!!doc?.hidden),motion=()=>{auto?.setPaused('page',page?.dataset.motionPaused==='true');rotation();},touch=event=>{if(event.pointerType==='touch'){userPaused=true;rotation();}};
  element.addEventListener('click',click);track.addEventListener('keydown',key);track.addEventListener('scroll',scroll,{passive:true});update(0);
  if(delay){auto=createAutoplay({delay,advance:()=>go((index+1)%slides.length,{manual:false}),reduced,clock});element.addEventListener('mouseenter',hover);element.addEventListener('mouseleave',unhover);element.addEventListener('focusin',focus);element.addEventListener('focusout',unfocus);track.addEventListener('pointerdown',touch,{passive:true});doc?.addEventListener('visibilitychange',visibility);page?.addEventListener('ensambla-motion',motion);visibility();motion();rotation();if(Observer){auto.setPaused('offscreen',true);observer=new Observer(entries=>{auto.setPaused('offscreen',!entries[0]?.isIntersecting);},{threshold:.2});observer.observe(element);}}
  return {go,get index(){return index;},destroy(){destroyed=true;clearTimeout(timer);auto?.destroy();observer?.disconnect();element.removeEventListener('click',click);element.removeEventListener('mouseenter',hover);element.removeEventListener('mouseleave',unhover);element.removeEventListener('focusin',focus);element.removeEventListener('focusout',unfocus);track.removeEventListener('keydown',key);track.removeEventListener('scroll',scroll);track.removeEventListener('pointerdown',touch);doc?.removeEventListener('visibilitychange',visibility);page?.removeEventListener('ensambla-motion',motion);}};
}
export function bindCarousels(root){const controllers=[...root.querySelectorAll('[data-carousel]')].map(el=>bindCarousel(el));return ()=>controllers.forEach(c=>c.destroy());}
