/* Small display fixes for the interactive match UI. */
(function(){
  'use strict';
  function fix(){
    const overlay=document.getElementById('wsm-overlay');
    if(!overlay)return;
    overlay.querySelectorAll('*').forEach(el=>{
      if(el.children.length)return;
      if(!el.textContent)return;
      el.textContent=el.textContent.replace(/Zawodników XY/g,'Zawodnik Widzewa').replace(/Zawodnik XY/g,'Zawodnik Widzewa');
    });
    const event=document.getElementById('wsm-event');
    if(event && /wykonuje rzut wolny/.test(event.textContent) && !/\d+ m/.test(event.textContent)){
      const distance=17+Math.floor(Math.random()*34);
      event.textContent=event.textContent.replace('wykonuje rzut wolny','wykonuje rzut wolny '+distance+' m od bramki przeciwnika');
    }
  }
  const observer=new MutationObserver(fix);
  function init(){observer.observe(document.body,{childList:true,subtree:true,characterData:true});fix();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
