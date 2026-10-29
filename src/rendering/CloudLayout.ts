import {random} from '../world/WorldConfig.ts';
/** World metres, half extents. Shared by density bounds and projected sunlight occlusion. */
export const cloudCells=(()=>{const rng=random(3184);return Array.from({length:32},(_,i)=>{const angle=i*2.399963,range=1200+rng()*6800,band=i%3;return{x:Math.cos(angle)*range,y:570+band*480+rng()*260,z:Math.sin(angle)*range,rx:430+rng()*650,ry:250+band*105+rng()*260,rz:330+rng()*490};});})();
