import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {FlightController,neutralInput} from '../src/aircraft/FlightController.ts';
import {FlightConfig,M5FlightConfig} from '../src/aircraft/FlightConfig.ts';
import {resolveAircraftId,getAircraft,cruiseKmh} from '../src/aircraft/AircraftCatalog.ts';
import {MissionManager} from '../src/missions/MissionManager.ts';
import {World} from '../src/world/World.ts';
const step=(f:FlightController,seconds:number,input=neutralInput())=>{for(let i=0;i<Math.round(seconds*60);i++)f.update(1/60,input);};
const clamp=(v:number,a:number,b:number)=>Math.min(b,Math.max(a,v));

test('selection is restricted to catalog aircraft and URL selection survives without storage',()=>{
 assert.equal(resolveAircraftId('?aircraft=m5','redwing'),'m5');assert.equal(resolveAircraftId('','m5'),'m5');assert.equal(resolveAircraftId('?aircraft=../../bad','m5'),'m5');assert.equal(resolveAircraftId('?aircraft=bad','bad'),'redwing');
 assert.equal(getAircraft('m5').modelFile,'m5.glb');assert.ok(cruiseKmh(getAircraft('redwing'))>cruiseKmh(getAircraft('m5')));
});

test('redwing is faster and responds more quickly while M5 is suited to slow cruise',()=>{
 const red=new FlightController(true,FlightConfig),m5=new FlightController(true,M5FlightConfig);
 for(const f of [red,m5]){f.position.y=500;f.throttle=.65;step(f,35);}
 assert.equal(red.state,'AIRBORNE');assert.equal(m5.state,'AIRBORNE');assert.ok(red.airspeed>m5.airspeed*1.5);
 red.reset(true);m5.reset(true);step(red,.35,{pitch:0,roll:.5,yaw:0,throttle:0});step(m5,.35,{pitch:0,roll:.5,yaw:0,throttle:0});assert.ok(Math.abs(red.bank)>Math.abs(m5.bank)*1.8);
});

test('redwing rolls through inverted attitude and completes full rotations in either direction',()=>{
 for(const roll of [-1,1]){
  const f=new FlightController(true,FlightConfig);f.position.y=500;f.throttle=.8;let inverted=false;
  for(let i=0;i<165;i++){f.update(1/60,{pitch:0,roll,yaw:0,throttle:0,aerobatic:true});if(new Vector3(0,1,0).applyQuaternion(f.orientation).y<-.8)inverted=true;}
  assert.equal(f.state,'AIRBORNE');assert.ok(inverted);assert.ok(Math.abs(f.bank)>Math.PI*2,'rotation is not clamped to a bank angle');assert.ok(Math.abs(f.orientation.length()-1)<1e-10);
  step(f,3);assert.ok(Math.abs(f.levelBank)<.001);assert.equal(f.rolling,false);
 }
});

test('M5 ignores the aerobatic modifier and both aircraft retain their tuning on reset',()=>{
 const m5=new FlightController(true,M5FlightConfig);m5.position.y=500;step(m5,4,{pitch:0,roll:1,yaw:0,throttle:0,aerobatic:true});assert.equal(m5.rolling,false);assert.ok(Math.abs(m5.bank)<=M5FlightConfig.maxBank);
 for(const tuning of [FlightConfig,M5FlightConfig]){const f=new FlightController(true,tuning);f.position.y=500;step(f,1,{pitch:0,roll:1,yaw:0,throttle:1,aerobatic:true});f.crash('test');f.reset();assert.equal(f.tuning,tuning);assert.equal(f.bank,0);assert.equal(f.rolling,false);assert.equal(f.state,'ON_WATER');assert.equal(f.throttle,0);assert.equal(f.airspeed,0);assert.ok(f.orientation.equals(f.previousOrientation));}
});

test('a completed roll can land upright and an inverted aircraft cannot land safely',()=>{
 const f=new FlightController(true);f.bank=Math.PI*2;f.pitch=0;f.position.y=1.06;f.velocity.set(30,-1,0);f.throttle=0;f.update(1/60,neutralInput());assert.equal(f.state,'LANDING');
 f.reset(true);f.bank=Math.PI;f.position.y=1.06;f.velocity.set(30,-1,0);f.throttle=0;f.update(1/60,{pitch:0,roll:0,yaw:0,throttle:0,aerobatic:true});assert.equal(f.state,'CRASHED');
});

test('aerobatic flight remains frame-rate independent at 30, 60 and 120 render FPS',()=>{
 const run=(fps:number)=>{const f=new FlightController(true);f.position.y=500;let accumulator=0;for(let i=0;i<fps*4;i++){accumulator+=1/fps;while(accumulator+1e-10>=1/60){f.update(1/60,{pitch:.05,roll:1,yaw:0,throttle:0,aerobatic:true});accumulator-=1/60;}}return f;};
 const reference=run(60);for(const fps of [30,120]){const f=run(fps);assert.ok(f.position.distanceTo(reference.position)<1e-7);assert.ok(f.orientation.angleTo(reference.orientation)<1e-6);}
});

test('M5 completes the five-checkpoint route and a water landing using only controls',()=>{
 const f=new FlightController(false,M5FlightConfig),m=new MissionManager(),world=new World();m.start();
 for(let i=0;i<60*1000&&m.state==='RUNNING';i++){
  const p=m.current!;let input;
  if(f.state!=='AIRBORNE')input={pitch:1,roll:0,yaw:0,throttle:1};else{const desired=Math.atan2(-(p.position.x-f.position.x),-(p.position.z-f.position.z)),error=Math.atan2(Math.sin(desired-f.heading),Math.cos(desired-f.heading));input={pitch:clamp((p.position.y-f.position.y)*.018-f.velocity.y*.13,-.22,.25)/f.tuning.maxPitch,roll:clamp(-error*2,-1,1),yaw:clamp(-error*.25,-.5,.5),throttle:clamp((.6-f.throttle)*5,-1,1)};}
  f.update(1/60,input);m.update(1/60,f.previousPosition,f.position);assert.notEqual(f.state,'CRASHED');assert.equal(world.collides(f.previousPosition,f.position),false);
 }
 assert.equal(m.state,'COMPLETED');
 for(let i=0;i<60*180&&f.state!=='ON_WATER'&&f.state!=='CRASHED';i++)f.update(1/60,{pitch:clamp((.5-f.position.y)*.009-f.velocity.y*.15,-.09,.2)/f.tuning.maxPitch,roll:0,yaw:0,throttle:clamp(((f.state==='AIRBORNE'?.12:0)-f.throttle)*5,-1,1)});
 assert.equal(f.state,'ON_WATER');assert.equal(f.landingCount,1);
});
