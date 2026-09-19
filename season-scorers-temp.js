/* Temporary per-season Widzew scorer database.
   Single source of truth for the visible top-scorer list during the current season.
   It records already generated/played scorers only — it never rolls new scorers. */
(function(){
  'use strict';

  let scorerDB = {};
  let processedRounds = new Set();

  function normalizeName(value){
    return String(value || '').trim().toLocaleLowerCase('pl');
  }

  function escapeName(value){
    if(typeof window.seasonSafe === 'function') return window.seasonSafe(value);
    return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function scorerKey(s){
    const player = s?.player || s?.playerRef || null;
    if(player?.row && typeof window.playerKey === 'function'){
      const key = window.playerKey(player.row);
      if(key) return String(key);
    }
    if(player?.first || player?.last){
      const key = normalizeName(`${player.first || ''} ${player.last || ''}`);
      if(key) return key;
    }
    return normalizeName(s?.name);
  }

  function isOwnGoal(s){
    const type = String(s?.type || '').toLowerCase();
    const name = String(s?.name || '').trim().toLocaleLowerCase('pl');
    return type === 'own' || type === 'own-goal' || type === 'samoboj' || name === 'samobój' || name === 'samoboj';
  }

  function recordMatch(match){
    if(!match) return false;
    const round = Number(match.round);
    if(!Number.isFinite(round)) return false;
    if(processedRounds.has(round)) return false;

    const scorers = Array.isArray(match.scorers) ? match.scorers : [];
    scorers.forEach(s=>{
      if(isOwnGoal(s)){
        scorerDB.__OWN__ = scorerDB.__OWN__ || {name:'Samobój',goals:0,own:true};
        scorerDB.__OWN__.goals++;
        return;
      }
      if(String(s?.type || '').toLowerCase() !== 'widzew') return;

      const name = String(s?.name || s?.player?.name || '').trim();
      if(!name) return;
      const key = scorerKey(s) || normalizeName(name);
      if(!key) return;
      if(!scorerDB[key]) scorerDB[key] = {name,goals:0};
      scorerDB[key].goals++;
    });

    processedRounds.add(round);
    render();
    return true;
  }

  function render(){
    const el = document.getElementById('topScorers');
    if(!el) return;

    // Dla aktualnego sezonu źródłem prawdy są już wygenerowane wyniki meczów.
    // Nie losujemy tu niczego i nie polegamy na kolejności hooków innych warstw.
    const liveResults = Array.isArray(window.seasonGameState?.widzewResults)
      ? window.seasonGameState.widzewResults
      : [];
    const liveDB = {};
    liveResults.forEach(match => {
      (Array.isArray(match?.scorers) ? match.scorers : []).forEach(s => {
        const type = String(s?.type || '').toLowerCase();
        const name = String(s?.name || '').trim();
        const own = type === 'own' || type === 'own-goal' || type === 'samoboj' || name.toLocaleLowerCase('pl') === 'samobój' || name.toLocaleLowerCase('pl') === 'samoboj';
        if(own){
          liveDB.__OWN__ = liveDB.__OWN__ || {name:'Samobój',goals:0,own:true};
          liveDB.__OWN__.goals++;
          return;
        }
        if(type !== 'widzew' || !name) return;
        const player = s?.player || s?.playerRef || null;
        const key = scorerKey(s) || normalizeName(name);
        if(!key) return;
        if(!liveDB[key]) liveDB[key] = {name,goals:0};
        liveDB[key].goals++;
      });
    });

    const source = Object.keys(liveDB).length ? liveDB : scorerDB;
    const rows = Object.values(source)
      .filter(row => !row.own && Number(row.goals) > 0)
      .sort((a,b)=>Number(b.goals)-Number(a.goals) || a.name.localeCompare(b.name,'pl'));

    const own = source.__OWN__?.goals || 0;

    const header = `
      <div class="scorer-table-header">
        <span class="scorer-goals-header">Liczba bramek</span>
        <span class="scorer-name-header">Zawodnik</span>
      </div>`;

    const normal = rows.map(row =>
      `<div class="scorer-row"><b>${Number(row.goals)}</b><span class="scorer-dash">-</span><strong>${escapeName(row.name)}</strong></div>`
    ).join('');

    const ownHtml = own > 0
      ? `<div class="scorer-own-divider"></div><div class="scorer-row scorer-own"><b>${own}</b><span class="scorer-dash">-</span><strong>Samobój</strong></div>`
      : '';

    el.innerHTML = header + (normal || ownHtml
      ? normal + ownHtml
      : '<div class="scorer-empty">Brak bramek Widzewa.</div>');
  }

  function reset(){
    scorerDB = {};
    processedRounds = new Set();
    render();
  }

  window.resetSeasonScorers = reset;
  window.recordSeasonMatchScorers = recordMatch;
  window.getSeasonScorers = function(){
    return JSON.parse(JSON.stringify(scorerDB));
  };
  window.renderSeasonScorers = render;

  /* The temporary DB is the sole renderer of the top-scorer panel. */
  window.renderTopScorers = render;

  /*
   * script.js definiuje funkcje sezonu wewnątrz DOMContentLoaded.
   * Dlatego wcześniejsze próby owinięcia initSeasonMode/symulacji
   * wykonywane podczas ładowania strony były zbyt wczesne.
   * Podpinamy integrację po zdefiniowaniu funkcji przez rdzeń.
   */
  function installSeasonHooks(){
    const originalInit = window.initSeasonMode;
    if(typeof originalInit === 'function' && !originalInit.__seasonScorersHook){
      const wrappedInit = async function(mode){
        reset();
        const result = await originalInit.apply(this, arguments);
        if(mode === 'simulate'){
          (window.seasonGameState?.widzewResults || []).forEach(recordMatch);
          render();
        }
        return result;
      };
      wrappedInit.__seasonScorersHook = true;
      window.initSeasonMode = wrappedInit;
    }

    const originalSimulateCurrent = window.simulateCurrentWidzewMatch;
    if(typeof originalSimulateCurrent === 'function' && !originalSimulateCurrent.__seasonScorersHook){
      const wrappedSimulate = function(){
        const before = Number(window.seasonGameState?.currentRound);
        const result = originalSimulateCurrent.apply(this, arguments);
        const match = (window.seasonGameState?.widzewResults || []).find(m=>Number(m.round)===before);
        if(match) recordMatch(match);
        return result;
      };
      wrappedSimulate.__seasonScorersHook = true;
      window.simulateCurrentWidzewMatch = wrappedSimulate;
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', installSeasonHooks, {once:true});
  } else {
    installSeasonHooks();
  }

  render();
})();