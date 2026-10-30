import {random} from '../world/WorldConfig.ts';
/** Interleave the weather activation order so even fair skies contain several altitudes.
 * Low broken cumulus, deep middle towers and high, thin wind-stretched banks. */
export const cloudCells=(()=>{
 const rng=random(3184);
 return Array.from({length:48},(_,i)=>{
  const angle=i*2.399963,band=i%6,high=band===3||band===5,tower=band===1||band===4,cirrus=band===5,range=(cirrus?12000:high?9500:1200)+rng()*(high?4500:7600);
  return{x:Math.cos(angle)*range,z:Math.sin(angle)*range,
   y:cirrus?4800+rng()*800:high?3200+rng()*850:tower?1450+rng()*700:band===0?950+rng()*350:650+rng()*320,
   rx:cirrus?1800+rng()*1100:high?1050+rng()*950:tower?800+rng()*700:band===0?850+rng()*650:270+rng()*430,
   ry:cirrus?100+rng()*75:high?95+rng()*95:tower?520+rng()*260:band===0?320+rng()*150:180+rng()*180,
   rz:cirrus?400+rng()*700:high?370+rng()*600:tower?600+rng()*500:band===0?600+rng()*500:230+rng()*420,
   layer:cirrus?3:high?2:tower?1:0};
 });
})();
