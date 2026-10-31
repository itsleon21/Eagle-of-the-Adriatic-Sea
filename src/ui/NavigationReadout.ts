/** Local metric coordinates; the simulated sea has no geographic latitude/longitude origin. */
export function headingDegrees(heading:number){return ((-heading*180/Math.PI)%360+360)%360;}
const directions=['N','NE','E','SE','S','SW','W','NW'];
export function headingDirection(degrees:number){return directions[Math.round(((degrees%360)+360)%360/45)%8];}
export function coordinateLabel(value:number){return `${value>=0?'+':'−'}${Math.abs(Math.round(value)).toLocaleString('en-US')} m`;}
export function compassMarks(){return Array.from({length:217},(_,i)=>{const degree=(i-72)*5,wrapped=(degree%360+360)%360;return {degree,label:wrapped%45===0?directions[wrapped/45]:wrapped%10===0?String(wrapped).padStart(3,'0'):'',major:wrapped%10===0||wrapped%45===0};});}

export interface NavigationTarget {
 name:string;
 position:{x:number;y:number;z:number};
 kind:'mission'|'race'|'commission';
}
/** Shortest signed angle; north crossings and repeated full rolls cannot flip the bearing. */
export function targetBearing(heading:number,x:number,z:number,target:NavigationTarget,halfWidth:number){
 const dx=target.position.x-x,dz=target.position.z-z;
 const bearing=Math.hypot(dx,dz)<.01?headingDegrees(heading):((Math.atan2(dx,-dz)*180/Math.PI)%360+360)%360;
 const delta=((bearing-headingDegrees(heading)+540)%360)-180;
 const limit=Math.max(0,halfWidth-12),pixels=delta*6;
 return {bearing,delta,offset:Math.max(-limit,Math.min(limit,pixels)),edge:pixels < -limit?'left':pixels > limit?'right':'ahead'} as const;
}
export function navigationDistance(distance:number){return distance>=1000?`${(distance/1000).toFixed(1)} km`:`${Math.max(0,Math.round(distance))} m`;}
