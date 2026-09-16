/* Match availability hotfix: never leave a generated event without a selectable action. */
(function(){
  'use strict';
  function install(){
    const E=window.WidzewSeasonMatchEngine;
    if(!E||E.__availabilityHotfixInstalled)return;
    const original=E.availableActions;
    E.availableActions=function(eventId,z){
      const ids=original.call(this,eventId,z)||[];
      if(ids.length)return ids;
      const n=Number(eventId);
      const groups={
        1:['1.1','1.2','1.3','1.4','1.5','1.6','1.7','1.8'],
        2:['2.1','2.2','2.3','2.4','2.5','2.6','2.7','2.8'],
        3:['3.1','3.2','3.3','3.4','3.5','3.6'],
        4:['4.1','4.2','4.3','4.4'],
        5:['5.1','5.2'],6:['6.1','6.2'],7:['7.1','7.2','7.3'],8:['8.1','8.2','8.3','8.4'],
        101:['101.1','101.2','101.3','101.4','101.5'],102:['102.1','102.2','102.3','102.4','102.5'],
        103:['103.1','103.2','103.3'],104:['104.1','104.2'],105:['105.1','105.2'],
        106:['106.1','106.2'],107:['107.1','107.2','107.3'],108:['108.1','108.2','108.3']
      };
      return groups[n]?groups[n].slice():[];
    };
    E.__availabilityHotfixInstalled=true;
  }
  install();
  window.addEventListener('load',install,{once:true});
})();
