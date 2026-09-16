/* ETAP 6E — corrections to 6D transitions and Z handling */
(function(){
    'use strict';
    const E=window.WidzewSeasonMatchEngine;
    if(!E) throw Error('Silnik musi być załadowany przed 6E');

    const BASE_TRANSITION=E.transitionForAction;
    const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
    const rand=r=>clamp(Number(r()),0,0.999999999);
    const int=(a,b,r)=>a+Math.floor(rand(r)*(b-a+1));

    const DECREASE_RANGES={
        '1.1':[1,5], '1.2':[5,11], '1.3':[15,30], '1.4':[3,8], '1.5':[5,12],
        '2.1':[1,2], '2.2':[3,6], '2.4':[2,4], '2.5':[3,5],
        '4.1':[1,5], '5.1':[1,5]
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
            if(['1.1','1.2','1.3','1.4','1.5'].includes(id)){
                const nz = (id==='1.3' && t.nextEvent===8)
                    ? (typeof E.chooseZ==='function' ? E.chooseZ(8,'8.1',r) : null)
                    : correctedDecreaseZ(id,z,r);
                if(nz!==null) t={...t,nextEvent:t.nextEvent||1,newZ:nz};
            }

            if(['2.1','2.2','2.4','2.5'].includes(id)){
                const nz=correctedDecreaseZ(id,z,r);
                if(nz!==null) t={...t,nextEvent:t.nextEvent||2,newZ:nz};
            }
            if(id==='2.3' && t.nextEvent===8){
                const nz=typeof E.chooseZ==='function' ? E.chooseZ(8,'8.1',r) : null;
                if(nz!==null) t={...t,nextEvent:8,newZ:nz};
            }

            if(id==='4.1'){
                const nz=correctedDecreaseZ(id,z,r);
                if(nz!==null) t={...t,nextEvent:1,newZ:nz};
            }

            if(id==='5.1'){
                const nz=correctedDecreaseZ(id,z,r);
                if(nz!==null) t={...t,nextEvent:1,newZ:nz};
            }

            if(id==='6.1'){
                const nz=correctedDecreaseZ(id,z,r);
                t={...t,nextEvent:2};
                if(nz!==null) t.newZ=nz;
            }
        }

        // Zasada 16 m: w każdej defensywnej akcji, gdy wynikiem jest 99.11,
        // decyzja o kolejnym evencie zależy od aktualnego Z.
        // Z <= 16 m -> rzut karny (107), Z > 16 m -> rzut wolny (104).
        const eventId=Number(id.split('.')[0]);
        if([101,102,103,104,105,106,108].includes(eventId) && t && t.message==='99.11'){
            t={...t,nextEvent:Number(z)<=16?107:104};
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
        fix_99_11_threshold_m:16,
        fix_99_11_event_le_16:107,
        fix_99_11_event_gt_16:104
    };
})();
