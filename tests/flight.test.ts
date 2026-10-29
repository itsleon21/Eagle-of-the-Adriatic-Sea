import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FlightController, neutralInput } from '../src/aircraft/FlightController.ts';
import { FlightConfig } from '../src/aircraft/FlightConfig.ts';
const step = (f:FlightController,seconds:number,input=neutralInput()) => { for(let i=0;i<seconds*60;i++) f.update(1/60,input); };
test('continuous throttle and complete reset',()=>{
 const f=new FlightController(); step(f,2,{pitch:0,roll:0,yaw:0,throttle:1}); assert.ok(f.throttle>0.6); assert.ok(f.airspeed>0);
 f.bank=0.5; f.heading=3; f.crash('test'); f.reset(); assert.equal(f.state,'ON_WATER'); assert.equal(f.throttle,0); assert.equal(f.airspeed,0); assert.equal(f.bank,0); assert.equal(f.crashReason,''); assert.ok(f.position.equals(f.previousPosition)); assert.ok(f.orientation.equals(f.previousOrientation));
});
test('three water takeoff, cruise and safe landing cycles',()=>{
 const f=new FlightController();
 for(let cycle=0;cycle<3;cycle++) {
  f.reset(); step(f,18,{pitch:1,roll:0,yaw:0,throttle:1}); assert.equal(f.state,'AIRBORNE'); assert.ok(f.altitude>5);
  step(f,3); assert.equal(f.state,'AIRBORNE');
  f.position.y=FlightConfig.hullOffset+0.01; f.velocity.set(0,-1,-30); f.pitch=0; f.bank=0; f.heading=0; f.throttle=0;
  f.update(1/60,neutralInput()); assert.equal(f.state,'LANDING'); step(f,25); assert.equal(f.state,'ON_WATER'); assert.equal(f.landingCount,1);
 }
});
test('low airspeed loses lift and hard landing crashes',()=>{
 const f=new FlightController(true); f.velocity.set(0,0,-5); f.throttle=0; const y=f.position.y; step(f,3); assert.ok(f.position.y<y-10);
 f.position.y=1.1; f.velocity.set(0,-12,-35); f.update(1/60,neutralInput()); assert.equal(f.state,'CRASHED'); assert.ok(f.crashReason);
});
test('bounded roll returns level and delta-time spike cannot teleport',()=>{
 const f=new FlightController(true); step(f,2,{pitch:0,roll:1,yaw:0,throttle:0}); assert.ok(Math.abs(f.bank)<=FlightConfig.maxBank);
 step(f,3); assert.ok(Math.abs(f.bank)<0.001); const old=f.position.clone(); f.update(20,neutralInput()); assert.ok(f.position.distanceTo(old)<3);
});
test('fixed 60 Hz simulation is invariant at 30, 60 and 120 render FPS',()=>{
 const run=(fps:number)=>{const f=new FlightController(true);let a=0;for(let frame=0;frame<fps*10;frame++){a+=1/fps;while(a+1e-10>=1/60){f.update(1/60,{pitch:0.2,roll:0.2,yaw:0,throttle:0});a-=1/60;}}return f;};
 const reference=run(60); for(const fps of [30,120]) {const f=run(fps);assert.ok(f.position.distanceTo(reference.position)<1e-7);assert.ok(f.orientation.angleTo(reference.orientation)<1e-6);}
});
