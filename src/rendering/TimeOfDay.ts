export const timePresets={morning:{name:'晨',hour:6.12},noon:{name:'午',hour:12},dusk:{name:'昏',hour:17.88},night:{name:'夜',hour:23}} as const;
export type TimeId=keyof typeof timePresets;
export const timeIds=Object.keys(timePresets) as TimeId[];
export function resolveTime(value:string|null):TimeId{return timeIds.includes(value as TimeId)?value as TimeId:'noon';}
const wrap=(h:number)=>(h%24+24)%24;
export function daylightAt(hour:number){
 const h=wrap(hour),elevation=Math.sin((h-6)/24*Math.PI*2),day=Math.max(0,Math.min(1,(elevation+.16)/.48)),nightness=1-Math.max(0,Math.min(1,(elevation+.14)/.20)),warm=(1-nightness)*(1-Math.max(0,elevation));
 const angle=(h-6)/24*Math.PI*2;const raw=[Math.cos(angle),elevation,.35] as const;
 const blend=Math.min(1,day/.18);const direction=[.35*(1-blend)+raw[0]*blend,.48*(1-blend)+Math.max(-.12,raw[1])*blend,-.65*(1-blend)+raw[2]*blend];
 const sunset=(1-Math.cos(angle))/2;
 const color=[1,.91-warm*(.19+.25*sunset),.74-warm*(.47+.15*sunset)];
 const phase:TimeId=h<5||h>=21?'night':h<10?'morning':h<16?'noon':h<21?'dusk':'night';
 return{hour:h,sunset,solarElevation:elevation,phase,day,warm,nightness,direction,color,label:`${String(Math.floor(h)).padStart(2,'0')}:${String(Math.floor(h%1*60)).padStart(2,'0')}`};
}
export type DaylightValues=ReturnType<typeof daylightAt>;
/** One full day takes 24 real minutes. All clocks stop on pause, help or hidden pages. */
export class TimeOfDay{
 hour=12;automatic=true;private chosen:TimeId='noon';private destination?:number;
 constructor(id:TimeId='noon'){this.hour=timePresets[id].hour;this.chosen=id;}
 select(id:TimeId,instant=false){this.automatic=false;this.chosen=id;this.destination=timePresets[id].hour;if(instant){this.hour=this.destination;this.destination=undefined;}}
 setAutomatic(value:boolean){this.automatic=value;if(!value)this.chosen=this.current.phase;if(value)this.destination=undefined;}
 update(dt:number,active:boolean){if(!active||!Number.isFinite(dt)||dt<=0)return;
  if(this.destination!==undefined){const delta=wrap(this.destination-this.hour+12)-12;this.hour=wrap(this.hour+delta*(1-Math.exp(-dt*.65)));if(Math.abs(delta)<.005){this.hour=this.destination;this.destination=undefined;}}
  else if(this.automatic)this.hour=wrap(this.hour+dt/60);
 }
 get selection(){return this.automatic?this.current.phase:this.chosen;}
 get current(){return daylightAt(this.hour);}
}
