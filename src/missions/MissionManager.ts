import { Vector3 } from 'three';
import {islands,harborRunway} from '../world/WorldConfig.ts';
export interface Checkpoint { name:string; position:Vector3; normal:Vector3; radius:number }
export const route:Checkpoint[]=[
 {name:'港湾出口',position:new Vector3(harborRunway.x+700,100,harborRunway.z),normal:new Vector3(1,0,0),radius:85},
 {name:'海岸小镇',position:new Vector3(islands[1].x+150,220,islands[1].z+820),normal:new Vector3(0,0,-1),radius:115},
 {name:'灯塔外海',position:new Vector3(islands[2].x+650,200,islands[2].z+500),normal:new Vector3(1,0,0),radius:95},
 {name:'返航海面',position:new Vector3(islands[2].x-900,105,islands[2].z+1000),normal:new Vector3(-.5,0,1).normalize(),radius:115},
 {name:'港口终点',position:new Vector3(harborRunway.x+400,55,harborRunway.z),normal:new Vector3(-1,0,0),radius:100},
];
export function crossesCheckpoint(from:Vector3,to:Vector3,checkpoint:Checkpoint){
 const a=from.clone().sub(checkpoint.position).dot(checkpoint.normal),b=to.clone().sub(checkpoint.position).dot(checkpoint.normal);
 if(a*b>0||Math.abs(a-b)<1e-8)return false;
 const t=a/(a-b);if(t<0||t>1)return false;
 return from.clone().lerp(to,t).distanceToSquared(checkpoint.position)<=checkpoint.radius**2;
}
export class MissionManager {
 state:'IDLE'|'RUNNING'|'COMPLETED'|'FAILED'='IDLE'; index=0; elapsed=0;
 get current(){return this.state==='RUNNING'?route[this.index]:undefined;}
 reset(){this.state='IDLE';this.index=0;this.elapsed=0;}
 start(){this.reset();this.state='RUNNING';}
 fail(){if(this.state==='RUNNING')this.state='FAILED';}
 update(dt:number,from:Vector3,to:Vector3){
  if(this.state!=='RUNNING')return false;this.elapsed+=dt;
  if(this.current&&crossesCheckpoint(from,to,this.current)){this.index++;if(this.index===route.length)this.state='COMPLETED';return true;}return false;
 }
}
export const formatTime=(seconds:number)=>`${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toFixed(1).padStart(4,'0')}`;
