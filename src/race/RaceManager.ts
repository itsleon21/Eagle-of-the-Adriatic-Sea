import {Vector3} from 'three';
import {crossesCheckpoint} from '../missions/MissionManager.ts';
import type {Checkpoint} from '../missions/MissionManager.ts';
import {islands} from '../world/WorldConfig.ts';
export const coral=islands.find(d=>d.id==='coral')!;
const corners=[[-5300,-1400],[-3200,-1500],[-3000,700],[-5350,500]];
export const raceCourse:Checkpoint[]=corners.map(([x,z],i)=>{const previous=corners[(i+3)%4];return{name:i===0?'起终点':'转向航门 '+i,position:new Vector3(x,140,z),normal:new Vector3(x-previous[0],0,z-previous[1]).normalize(),radius:95};});
export const raceLaunch=new Vector3(coral.x-450,0,coral.z-450);
export const raceHeading=Math.atan2(-(raceCourse[0].position.x-raceLaunch.x),-(raceCourse[0].position.z-raceLaunch.z));
export class RaceInvitation{
 private armed=true;
 constructor(suppressed=false){this.armed=!suppressed;}
 update(distance:number,height:number){if(distance>350)this.armed=true;if(this.armed&&distance<165&&height<80){this.armed=false;return true;}return false;}
}
export class RaceManager{
 state:'COUNTDOWN'|'READY'|'RUNNING'|'COMPLETED'|'FAILED'='COUNTDOWN';
 countdown=3;elapsed=0;lap=0;index=0;readonly laps=3;readonly splits:number[]=[];readonly sectors:number[]=[];
 get current(){return this.state==='READY'||this.state==='RUNNING'?raceCourse[this.index]:undefined;}
 reset(){this.state='COUNTDOWN';this.countdown=3;this.elapsed=0;this.lap=this.index=0;this.splits.length=0;this.sectors.length=0;}
 fail(){if(this.state!=='COMPLETED')this.state='FAILED';}
 update(dt:number,from:Vector3,to:Vector3){
  if(!Number.isFinite(dt)||dt<=0)return false;
  if(this.state==='COUNTDOWN'){this.countdown=Math.max(0,this.countdown-dt);if(this.countdown===0)this.state='READY';return false;}
  if(this.state!=='READY'&&this.state!=='RUNNING')return false;
  if(this.state==='RUNNING')this.elapsed+=dt;
  const gate=this.current!;if(!crossesCheckpoint(from,to,gate))return false;
  // Forward crossings only: reversing through the same gate cannot award a lap.
  if(to.clone().sub(from).dot(gate.normal)<=0)return false;
  const a=from.clone().sub(gate.position).dot(gate.normal),b=to.clone().sub(gate.position).dot(gate.normal),t=a/(a-b);if(from.y+(to.y-from.y)*t<45)return false;
  if(this.state==='READY'){this.state='RUNNING';this.elapsed=0;this.index=1;return true;}
  this.sectors.push(this.elapsed);
  if(this.index===0){this.lap++;this.splits.push(this.elapsed);if(this.lap===this.laps){this.state='COMPLETED';return true;}}
  this.index=(this.index+1)%raceCourse.length;return true;
 }
}
