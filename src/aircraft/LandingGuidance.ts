import type {AircraftId,FlightTuning} from './FlightConfig.ts';
import type {FlightState} from './FlightController.ts';
import {touchdownProblems} from './LandingEnvelope.ts';
export const landingProfiles={
 redwing:{minKmh:110,maxKmh:145,setupMin:60,setupMax:100,flareHeight:5,maxApproachSink:2,maxTouchdownSink:1.2,maxBankDegrees:6},
 mc72:{minKmh:160,maxKmh:210,setupMin:90,setupMax:140,flareHeight:7,maxApproachSink:2,maxTouchdownSink:1.1,maxBankDegrees:5},
 m5:{minKmh:80,maxKmh:105,setupMin:50,setupMax:80,flareHeight:4,maxApproachSink:1.8,maxTouchdownSink:1.1,maxBankDegrees:6},
} as const;
export const landingProfile=(id:AircraftId)=>landingProfiles[id];
export interface LandingSnapshot{
 state:FlightState;speed:number;clearance:number;verticalSpeed:number;bank:number;pitch:number;throttle:number;
 overWater:boolean;clearAhead:boolean;landingCount:number;rolling?:boolean;
}
export interface LandingAdvice{
 title:string;instruction:string;tone:'neutral'|'caution'|'danger'|'good';automatic:boolean;
 speedGood:boolean;sinkGood:boolean;bankGood:boolean;pitchGood:boolean;waterGood:boolean;ready:boolean;
 height:number;sink:number;speedKmh:number;
}
/** Conservative game approach bands, deliberately below the physics failure thresholds. */
export function landingAdvice(tuning:Readonly<FlightTuning>,s:LandingSnapshot):LandingAdvice{
 const p=landingProfile(tuning.id),height=Math.max(0,s.clearance),sink=-s.verticalSpeed,speedKmh=s.speed*3.6,bank=Math.abs(Math.atan2(Math.sin(s.bank),Math.cos(s.bank)))*180/Math.PI;
 const speedGood=speedKmh>=p.minKmh&&speedKmh<=p.maxKmh,sinkGood=sink>=-.35&&sink<=(height<=p.flareHeight?p.maxTouchdownSink:p.maxApproachSink),bankGood=bank<=p.maxBankDegrees,pitchGood=s.pitch>=-.06&&s.pitch<=.12,waterGood=s.overWater&&s.clearAhead;
 const result:LandingAdvice={title:'水面降落参考',instruction:`先在 ${p.setupMin}–${p.setupMax} 米选好开阔海面，逐步减速。`,tone:'neutral',automatic:s.state==='LANDING'||s.state==='ON_WATER'&&s.landingCount>0||s.state==='AIRBORNE'&&height<Math.max(120,p.setupMax+20)&&(sink>.3||s.throttle<.4),speedGood,sinkGood,bankGood,pitchGood,waterGood,ready:false,height,sink,speedKmh};
 const say=(title:string,instruction:string,tone:LandingAdvice['tone'])=>Object.assign(result,{title,instruction,tone});
 if(s.state==='CRASHED')return say('飞行已中断','按 R 返回港口，重新练习进近。','danger');
 if(s.state==='LANDING')return say('已着水 · 保持直线','松开俯仰输入并收油门，让船体自然滑行减速。','good');
 if(s.state!=='AIRBORNE')return s.landingCount>0?say('着水完成','保持低油门滑行；下一次起飞仍按 Shift 加速。','good'):result;
 if(!waterGood)return say('先寻找开阔水面',s.overWater?'前方有岸线或地形，换一条更开阔的进近方向。':'下方不是足够深的海面，先飞离岛岸。','danger');
 if(s.rolling)return say('先结束翻滚','松开空格和转向键，恢复平飞后再开始进近。','danger');
 const failures=touchdownProblems(tuning,s.speed,s.verticalSpeed,s.bank,s.pitch);
 if(failures.includes('bank'))return say('机翼倾斜过大','松开转弯键，让机翼回正后再下降。','danger');
 if(failures.includes('sink'))return say('下降过快','先松开 S，轻点 W 减缓下降；来不及拉平就加油复飞。','danger');
 if(failures.includes('pitch'))return say('机头过低','松开 S，轻点 W 恢复接近平飞姿态。','danger');
 if(s.verticalSpeed>.7&&s.throttle>.5)return say('正在爬升 · 暂未进近',`先完成起飞并恢复平飞；准备着水时，从 ${p.setupMin}–${p.setupMax} 米逐步收油进近。`,'neutral');
 if(!speedGood)return speedKmh>p.maxKmh?say('速度偏高 · 先减速',`按 Ctrl 逐渐收油，接近 ${p.minKmh}–${p.maxKmh} km/h 后再下降。`,failures.includes('speed')?'danger':'caution'):say(s.throttle>.75?'空速偏低 · 调整机头':'空速偏低 · 轻补油门',s.throttle>.75?`油门已较高，减小抬头幅度并恢复平飞，待空速回到 ${p.minKmh}–${p.maxKmh} km/h。`:`轻按 Shift，恢复到 ${p.minKmh}–${p.maxKmh} km/h；不要继续压低机头。`,'caution');
 if(!bankGood)return say('先放平机翼','松开 A / D，减小坡度，避免翼尖先触水。','caution');
 if(!pitchGood)return say('调整机头姿态','轻点 W / S，接近水面时保持机头接近平放或略微抬起。','caution');
 if(!sinkGood)return sink<-.35?say('正在爬升','需要着水时再轻点 S 建立缓降；当前可以继续爬升复飞。','neutral'):say('减小下降率',`松开 S，轻点 W；最后 ${p.flareHeight} 米把下降率减至 ${p.maxTouchdownSink.toFixed(1)} m/s 以内。`,'caution');
 if(height<=20&&s.throttle>.35)return say('油门偏大 · 逐渐收油','按 Ctrl 减小油门，保持建议空速，避免接水后再次加速起飞。','caution');
 if(height>20)return say('进近稳定 · 缓慢下降',`轻点 S 建立 ${p.maxApproachSink.toFixed(1)} m/s 以内的缓降，保持空速区间。`,'neutral');
 if(height>p.flareHeight)return say('接近水面 · 逐渐放平',`最后 ${p.flareHeight} 米松开 S，减小下降率，避免持续低头。`,'neutral');
 result.ready=true;return say('着水条件良好','保持机翼水平、低油门，松开 S，轻柔接触浪面。','good');
}
