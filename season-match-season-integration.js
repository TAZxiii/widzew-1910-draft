/* Integrates the real interactive match result into the current playable season. */
(function(){
  'use strict';
  let committedRound=null;
  let timer=null;

  const TEAMS=['Legia Warszawa','Lech Poznań','Górnik Zabrze','Jagiellonia Białystok','Raków Częstochowa','GKS Katowice','Pogoń Szczecin','Cracovia','Piast Gliwice','Korona Kielce','Motor Lublin','Radomiak Radom','Wieczysta Kraków','Wisła Kraków','Wisła Płock','Śląsk Wrocław','Zagłębie Lubin'];

  function currentRound(){
    return Number(window.seasonGameState?.currentRound);
  }

  function readOpponent(){
    const el=document.querySelector('.round-match.widzew-match');
    const text=String(el?.textContent||'');
    const opponent=TEAMS.find(t=>text.includes(t));
    if(!opponent)return null;
    const wi=text.indexOf('Widzew Łódź');
    const oi=text.indexOf(opponent);
    return {name:opponent,home:wi<oi};
  }

  function readScore(){
    const raw=String(document.getElementById('wsm-score')?.textContent||'').match(/(\d+)\s*:\s*(\d+)/);
    if(!raw)return null;
    return {a:Number(raw[1]),b:Number(raw[2])};
  }

  function readWidzewScorers(){
    return Array.from(document.querySelectorAll('#wsm-scorers > div')).map(el=>{
      const m=String(el.textContent||'').match(/^(.+?)\s*[—-]\s*(\d+)'/);
      if(!m)return null;
      return {minute:Number(m[2]),type:'widzew',name:m[1].trim(),player:null};
    }).filter(Boolean);
  }

  function readOpponentScorerMinutes(){
    return Array.from(document.querySelectorAll('#wsm-feed .wsm-row')).map(el=>{
      const text=String(el.textContent||'');
      if(!/Gol przeciwnika/i.test(text))return null;
      const m=text.match(/^(\d+)'/);
      return m?Number(m[1]):null;
    }).filter(Number.isFinite);
  }

  function freeMinutes(existing,count){
    const used=new Set(existing);
    const out=[];
    while(out.length<count){
      const minute=1+Math.floor(Math.random()*90);
      if(used.has(minute))continue;
      used.add(minute);
      out.push(minute);
    }
    return out;
  }

  function buildResult(){
    const state=window.seasonGameState;
    const round=currentRound();
    const opponent=readOpponent();
    const score=readScore();
    if(!state||!Number.isFinite(round)||!opponent||!score)return null;

    const gf=opponent.home?score.b:score.a;
    const ga=opponent.home?score.a:score.b;
    const widzewScorers=readWidzewScorers();
    const opponentMinutes=readOpponentScorerMinutes();
    const allUsed=widzewScorers.map(s=>s.minute).concat(opponentMinutes);
    const missingOpponent=Math.max(0,ga-opponentMinutes.length);
    freeMinutes(allUsed,missingOpponent).forEach(m=>opponentMinutes.push(m));

    const scorers=widzewScorers.concat(opponentMinutes.map(minute=>({minute,type:'opponent',name:'Przeciwnik',player:null})));
    scorers.sort((a,b)=>a.minute-b.minute);

    return {round,opponent:opponent.name,home:opponent.home,gf,ga,scorers};
  }

  function commit(){
    if(!window.seasonGameState)return false;
    const result=buildResult();
    if(!result)return false;
    const round=result.round;
    if(committedRound===round)return true;
    const results=window.seasonGameState.widzewResults;
    if(!Array.isArray(results))window.seasonGameState.widzewResults=[];
    const list=window.seasonGameState.widzewResults;
    const existing=list.findIndex(m=>Number(m.round)===round);
    if(existing>=0)list[existing]=result;else list.push(result);

    if(typeof window.updateTopScorersFromMatch==='function')window.updateTopScorersFromMatch(result);
    if(typeof window.renderPlayableSeason==='function')window.renderPlayableSeason();
    if(typeof window.enhanceLeagueTable==='function')window.enhanceLeagueTable();

    committedRound=round;
    return true;
  }

  function check(){
    const overlay=document.getElementById('wsm-overlay');
    if(!overlay)return;
    const close=document.getElementById('wsm-close');
    if(!close)return;
    const visible=getComputedStyle(close).display!=='none';
    if(visible)commit();
  }

  function start(){
    if(timer)return;
    timer=setInterval(check,250);
    check();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  window.addEventListener('beforeunload',()=>{if(timer)clearInterval(timer);});
})();
