import {random} from '../world/WorldConfig.ts';
export type WeatherId='sunny'|'cloudy'|'overcast'|'rain'|'fog';
export interface WeatherValues {coverage:number;density:number;sun:number;ambient:number;haze:number;fogNear:number;fogFar:number;rain:number;wind:number;wetness:number;tint:number[]}
export const weatherPresets:Record<WeatherId,WeatherValues&{name:string}>={
 sunny:{name:'晴天',coverage:.38,density:.65,sun:3.6,ambient:.16,haze:1.7,fogNear:4500,fogFar:18500,rain:0,wind:.25,wetness:0,tint:[.65,.69,.68]},
 cloudy:{name:'多云',coverage:.58,density:.85,sun:2.15,ambient:.44,haze:2.8,fogNear:3400,fogFar:14500,rain:0,wind:.48,wetness:0,tint:[.67,.68,.67]},
 overcast:{name:'阴天',coverage:.97,density:1.35,sun:.58,ambient:.81,haze:5.6,fogNear:1800,fogFar:9000,rain:0,wind:.55,wetness:.12,tint:[.66,.67,.67]},
 rain:{name:'雨天',coverage:.995,density:1.6,sun:.32,ambient:.68,haze:6.5,fogNear:650,fogFar:4600,rain:1,wind:.85,wetness:1,tint:[.49,.51,.52]},
 fog:{name:'多雾',coverage:.67,density:.78,sun:.95,ambient:.66,haze:5.8,fogNear:250,fogFar:2400,rain:0,wind:.12,wetness:.28,tint:[.73,.74,.72]},
};
export const weatherIds=Object.keys(weatherPresets) as WeatherId[];
export const resolveWeather=(value:string|null|undefined):WeatherId=>weatherIds.includes(value as WeatherId)?value as WeatherId:'sunny';
const clone=(w:WeatherValues):WeatherValues=>({coverage:w.coverage,density:w.density,sun:w.sun,ambient:w.ambient,haze:w.haze,fogNear:w.fogNear,fogFar:w.fogFar,rain:w.rain,wind:w.wind,wetness:w.wetness,tint:[...w.tint]});
export class WeatherController{
 target:WeatherId;readonly current:WeatherValues;automatic=true;private from:WeatherValues;private transition=1;private elapsed=0;private nextChange=210;private rng=random(5207);
 constructor(initial:WeatherId='sunny'){this.target=initial;this.current=clone(weatherPresets[initial]);this.from=clone(this.current);}
 select(id:WeatherId,immediate=false){this.target=id;this.from=clone(this.current);this.transition=immediate?1:0;this.elapsed=0;if(immediate)Object.assign(this.current,clone(weatherPresets[id]));}
 setAutomatic(enabled:boolean){this.automatic=enabled;this.elapsed=0;}
 update(dt:number,advance=true){
  if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.1);
  if(advance&&this.automatic){this.elapsed+=dt;if(this.elapsed>=this.nextChange){const choices=weatherIds.filter(id=>id!==this.target);this.select(choices[Math.floor(this.rng()*choices.length)]);this.nextChange=180+this.rng()*180;}}
  this.transition=Math.min(1,this.transition+dt/7);const t=this.transition*this.transition*(3-2*this.transition),to=weatherPresets[this.target];
  for(const key of Object.keys(this.from) as (keyof WeatherValues)[]){if(key==='tint'){this.current.tint=this.from.tint.map((v,i)=>v+(to.tint[i]-v)*t);}else this.current[key]=this.from[key]+(to[key]-this.from[key])*t;}
 }
 get settled(){return this.transition===1;}
}
