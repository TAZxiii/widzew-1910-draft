/* Integrates the real interactive match result into the current playable season. */
(function(){
  'use strict';
  let committedRound=null;
  let timer=null;
  const TEAMS=['Legia Warszawa','Lech Poznań','Górnik Zabrze','Jagiellonia Białystok','Raków Częstochowa','GKS Katowice','Pogoń Szczecin','Cracovia','Piast Gliwice','Korona Kielce','Motor Lublin','Radomiak Radom','Wieczysta Kraków','Wisła Kraków','Wisła Płock','Śląsk Wrocław','Zagłębie Lubin'];
  function currentRound(){return Number(window.seasonGameState?.currentRound)}
  function readOpponent(){const el=document.querySelector('.round-match.widzew-match'),text=String(el?.textContent||''),opponent=TEAMS.find(t=>text.includes(t));if(!opponent)return null;const wi=text.indexOf('Widzew Łódź'),oi=text.indexOf(opponent);return{name:opponent,home:wi<oi}}
  function readScore(){const raw=String(document.getElementById('wsm-score')?.textContent||'').match(/(\d+)\s*:\s*(\d+)/);return raw?{a:Number(raw[1]),b:Number(raw[2])}:null}
  function readWidzewScorers(){return Array.from(document.querySelectorAll('#wsm-scorers > div')).map(el=>{const m=String(el.textContent||'').match(/^(.+?)\s*[—-]\s*(\d+)'/);return m?{minute:Number(m[2]),type:'widzew',name:m[1].trim(),player:null}:null}).filter(Boolean)}
  function readOpponentScorerMinutes(){return Array.from(document.querySelectorAll('#wsm-feed .wsm-row')).map(el=>{const text=String(el.textContent||'');if(!/Gol przeciwnika/i.test(text))return null;const m=text.match(/^(\d+)'/);return m?Number(m[1]):null}).filter(Number.isFinite)}
  function freeMinutes(existing,count){const used=new Set(existing),out=[];while(out.length<count){const m=1+Math.floor(Math.random()*90);if(used.has(m))continue;used.add(m);out.push(m)}return out}
  function buildResult(){const state=window.seasonGameState,round=currentRound(),opponent=readOpponent(),score=readScore();if(!state||!Number.isFinite(round)||!opponent||!score)return null;const gf=opponent.home?score.b:score.a,ga=opponent.home?score.a:score.b,widzewScorers=readWidzewScorers(),opponentMinutes=readOpponentScorerMinutes();const missing=Math.max(0,ga-opponentMinutes.length);freeMinutes(widzewScorers.map(s=>s.minute).concat(opponentMinutes),missing).forEach(m=>opponentMinutes.push(m));const scorers=widzewScorers.concat(opponentMinutes.map(minute=>({minute,type:'opponent',name:'Przeciwnik',player:null})));scorers.sort((a,b)=>a.minute-b.minute);return{round,opponent:opponent.name,home:opponent.home,gf,ga,scorers}}
  function commit(){const state=window.seasonGameState;if(!state)return false;const result=buildResult();if(!result)return false;const round=result.round;if(committedRound===round)return true;if(!Array.isArray(state.widzewResults))state.widzewResults=[];const list=state.widzewResults,existing=list.findIndex(m=>Number(m.round)===round);if(existing>=0)list[existing]=result;else list.push(result);if(typeof window.updateTopScorersFromMatch==='function')window.updateTopScorersFromMatch(result);if(typeof window.renderPlayableSeason==='function')window.renderPlayableSeason();if(typeof window.enhanceLeagueTable==='function')window.enhanceLeagueTable();committedRound=round;return true}
  function check(){const overlay=document.getElementById('wsm-overlay'),close=document.getElementById('wsm-close');if(!overlay||!close)return;if(getComputedStyle(close).display!=='none')commit()}
  /* The match UI removes its overlay immediately when this button is clicked.
     Capture the click first so the result is committed while the score/feed still exist. */
  document.addEventListener('click',function(event){if(event.target?.closest?.('#wsm-close'))commit()},true);
  function start(){if(timer)return;timer=setInterval(check,250);check()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('beforeunload',()=>{if(timer)clearInterval(timer)});
})();
