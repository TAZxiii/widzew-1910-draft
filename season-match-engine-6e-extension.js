/* ETAP 6E — corrections to 6D transitions and Z handling */
(function(){
    'use strict';
    const E=window.WidzewSeasonMatchEngine;
    if(!E) throw Error('Silnik musi być załadowany przed 6E');

    const BASE_TRANSITION=E.transitionForAction;
    const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
    const rand=r=>clamp(Number(r()),0,0.999999999);
    const int=(a,b,r)=>a+Math.floor(rand(r)*(b-a+1));

    function correctedZ(actionId,z,r){
        const id=String(actionId);
        if(!Number.isFinite(Number(z))) return null;
        const ranges={
            '1.1':[1,5], '1.2':[5,11], '1.4':[3,8], '1.5':[5,12],
            '2.1':[1,2], '2.2':[3,6], '2.4':[2,4], '2.5':[3,5],
            '4.1':[1,5], '4.2':[10,20], '5.1':[1,5], '5.2':[10,20],
            '6.1':[1,5]
        };
        if(ranges[id]) return Number(z)-int(ranges[id][0],ranges[id][1],r);
        return null;
    }

    function transitionForAction6E(actionId,success,z,rng){
        const id=String(actionId);
        const r=rng||Math.random;
        let t=BASE_TRANSITION(actionId,success,z,r);

        // 6.1 w evencie 6 po sukcesie prowadzi do eventu 2, nie eventu 1.
        if(id==='6.1' && success){
            t={...t,nextEvent:2};
            const nz=correctedZ(id,z,r);
            if(nz!==null) t.newZ=nz;
        }

        // 1.1 po sukcesie pozostaje w evencie 1, ale Z maleje o 1–5.
        if(id==='1.1' && success){
            t={...t,nextEvent:1};
            const nz=correctedZ(id,z,r);
            if(nz!==null) t.newZ=nz;
        }

        // W defensywie komunikat 99.11 prowadzi do eventu 107.
        const eventId=Number(id.split('.')[0]);
        if([101,102,103,104,105,106,108].includes(eventId) && t && t.message==='99.11'){
            t={...t,nextEvent:107};
        }

        return t;
    }

    E.transitionForAction=transitionForAction6E;
    E.constants.ETAP_6E={
        fix_6_1_event:2,
        fix_1_1_z:'decrease_1_to_5',
        fix_99_11_event:107
    };
})();
