import {test} from 'node:test';import assert from 'node:assert/strict';import {Vector3} from 'three';
import {World} from '../src/world/World.ts';
import {MissionManager,crossesCheckpoint,route} from '../src/missions/MissionManager.ts';import {FlightController} from '../src/aircraft/FlightController.ts';import {islands,terrainHeight} from '../src/world/WorldConfig.ts';
const clamp=(v:number,a:number,b:number)=>Math.min(b,Math.max(a,v));
test('high-speed segment crossing passes a ring without center proximity',()=>{const p=route[0];assert.equal(crossesCheckpoint(p.position.clone().addScaledVector(p.normal,-250),p.position.clone().addScaledVector(p.normal,250),p),true);assert.equal(crossesCheckpoint(new Vector3(-700,500,1130),new Vector3(-200,500,1130),p),false);});
test('checkpoint order, completion, failure and retries',()=>{const m=new MissionManager();m.start();const cross=(index:number)=>{const p=route[index];m.update(1,p.position.clone().addScaledVector(p.normal,-200),p.position.clone().addScaledVector(p.normal,200));};cross(2);assert.equal(m.index,0);for(let i=0;i<5;i++)cross(i);assert.equal(m.state,'COMPLETED');const elapsed=m.elapsed;m.update(9,new Vector3(),new Vector3());assert.equal(m.elapsed,elapsed);m.start();m.fail();assert.equal(m.state,'FAILED');m.start();assert.equal(m.elapsed,0);assert.equal(m.index,0);});
test('three complete physical flights: takeoff, five checkpoints, landing and restart',()=>{
 const f=new FlightController(),m=new MissionManager(),world=new World();
 for(let cycle=0;cycle<3;cycle++){
  f.reset();m.start();
  for(let i=0;i<60*650&&m.state==='RUNNING';i++){
   const p=m.current!;let input;
   if(f.state!=='AIRBORNE')input={pitch:1,roll:0,yaw:0,throttle:1};else{const dx=p.position.x-f.position.x,dz=p.position.z-f.position.z,desired=Math.atan2(-dx,-dz),error=Math.atan2(Math.sin(desired-f.heading),Math.cos(desired-f.heading));input={pitch:clamp((p.position.y-f.position.y)*.018-f.velocity.y*.13,-.28,.3)/.36,roll:clamp(-error*2,-1,1),yaw:0,throttle:clamp((.46-f.throttle)*5,-1,1)};}
   f.update(1/60,input);m.update(1/60,f.previousPosition,f.position);assert.notEqual(f.state,'CRASHED');assert.equal(world.collides(f.previousPosition,f.position),false);for(const d of islands)assert.ok(f.position.y-terrainHeight(d,f.position.x,f.position.z)>1);
  }
  assert.equal(m.state,'COMPLETED');assert.equal(m.index,5);
  for(let i=0;i<60*160&&f.state!=='ON_WATER'&&f.state!=='CRASHED';i++){f.update(1/60,{pitch:clamp((.5-f.position.y)*.009-f.velocity.y*.15,-.09,.2)/.36,roll:0,yaw:0,throttle:clamp(((f.state==='AIRBORNE'?.12:0)-f.throttle)*5,-1,1)});}
  assert.equal(f.state,'ON_WATER');assert.equal(f.landingCount,1);
 }
});
