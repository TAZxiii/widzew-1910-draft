/* ETAP 6E — corrections to 6D transitions and Z handling */
(function(){
    'use strict';
    const E=window.WidzewSeasonMatchEngine;
    if(!E) throw Error('Silnik musi być załadowany przed 6E');

    const BASE_TRANSITION=E.transitionForAction;
    const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
    const rand=r=>clamp(Number(r()),0,0.999999999);
    const int=(a,b,r)=>a+Math.floor(rand(r)*(b-a+1));

    // Korekty zmian Z dla akcji, dla których po sukcesie Z ma maleć
    // dokładnie o zakres podany w arkuszu „Zmiany Z”.
    // Wyjątek 1.3/2.3/4.2 pozostaje zgodny z arkuszem:
    // gdy akcja prowadzi do eventu 8, generujemy nowe Z w zakresie eventu 8.
    const DECREASE_RANGES={
        '1.1':[1,5],
        '1.2':[5,11],
        '1.3':[15,30],
        '1.4':[3,8],
        '1.5':[5,12],
        '2.1':[1,2],
        '2.2':[3,6],
        '2.4':[2,4],
        '2.5':[3,5],
        '4.1':[1,5],
        '5.1':[1,5]
    };

    function correctedDecreaseZ(actionId,z,r){
        const range=DECREASE_RANGES[String(actionId)];
        if(!range || !Number.isFinite(Number(z))) return null;
        return Number(z)-int(range[0],range[1],r);
    }

    function transitionForAction6E(actionId,success,z,rng){
        const id=String(actionId);
        const r=rng||Math.random;
        let t=BASE_TRANSITION(actionId,success,z,r);

        if(success && Number.isFinite(Number(z))){
            // Akcje 1.1–1.5: po sukcesie, jeśli pozostajemy w evencie 1,
            // nowe Z musi być stare Z pomniejszone o zakres z arkusza.
            // Dla 1.3 przejście do eventu 8 zachowuje logikę nowego Z eventu 8.
            if(['1.1','1.2','1.3','1.4','1.5'].includes(id)){
                const nz = (id==='1.3' && t.nextEvent===8)
                    ? (typeof E.chooseZ==='function' ? E.chooseZ(8,'8.1',r) : null)
                    : correctedDecreaseZ(id,z,r);
                if(nz!==null) t={...t,nextEvent:t.nextEvent||1,newZ:nz};
            }

            // Akcje 2.1–2.5: 2.1, 2.2, 2.4 i 2.5 zmniejszają Z
            // dokładnie o zakres z arkusza. 2.3 jest wyjątkiem — po sukcesie
            // przechodzi do eventu 8 z nowym Z z zakresu eventu 8.
            if(['2.1','2.2','2.4','2.5'].includes(id)){
                const nz=correctedDecreaseZ(id,z,r);
                if(nz!==null) t={...t,nextEvent:t.nextEvent||2,newZ:nz};
            }
            if(id==='2.3' && t.nextEvent===8){
                const nz=typeof E.chooseZ==='function' ? E.chooseZ(8,'8.1',r) : null;
                if(nz!==null) t={...t,nextEvent:8,newZ:nz};
            }

            // 4.1: Z maleje o 1–5.
            if(id==='4.1'){
                const nz=correctedDecreaseZ(id,z,r);
                if(nz!==null) t={...t,nextEvent:1,newZ:nz};
            }

            // 5.1: Z maleje o 1–5. Nie korzystamy z nowego losowania Z
            // eventu 1, bo arkusz definiuje zmianę względem aktualnego Z.
            if(id==='5.1'){
                const nz=correctedDecreaseZ(id,z,r);
                if(nz!==null) t={...t,nextEvent:1,newZ:nz};
            }

            // 6.1: po sukcesie event 2, a Z maleje o 1–5.
            if(id==='6.1'){
                const nz=correctedDecreaseZ(id,z,r);
                t={...t,nextEvent:2};
                if(nz!==null) t.newZ=nz;
            }
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
        fix_1_1_to_1_5_z:'decrease_by_workbook_range',
        fix_2_1_to_2_5_z:'decrease_by_workbook_range_except_2_3_event8',
        fix_4_1_z:'decrease_1_to_5',
        fix_5_1_z:'decrease_1_to_5',
        fix_6_1_event:2,
        fix_99_11_event:107
    };
})();
