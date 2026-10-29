import {test} from 'node:test';import assert from 'node:assert/strict';
import {FlightController,neutralInput} from '../src/aircraft/FlightController.ts';import {FlightConfig,M5FlightConfig} from '../src/aircraft/FlightConfig.ts';
import {hullWaterContact} from '../src/aircraft/WaterContact.ts';import {sampleOceanWaves} from '../src/world/OceanWaves.ts';
const field=(x:number,z:number,t:number)=>sampleOceanWaves(x,z,t,.48);
test('hull and floats sample spatially distinct waves and recover exact planar pitch/bank',()=>{
 const s=hullWaterContact((x,z)=>({height:x*.05-z*.1,dx:.05,dz:-.1}),0,0,0,0);assert.ok(Math.abs(s.pitch-Math.atan(.1))<1e-10);assert.ok(Math.abs(s.bank-Math.atan(.05))<1e-10);assert.ok(Number.isFinite(s.height));
});
test('both aircraft float, take off and reset on the actual moving sea',()=>{
 for(const config of[FlightConfig,M5FlightConfig]){const f=new FlightController(false,config);f.setWaterSurface(field);
  let low=Infinity,high=-Infinity;for(let i=0;i<600;i++){f.update(1/60,neutralInput());low=Math.min(low,f.position.y);high=Math.max(high,f.position.y);assert.equal(f.state,'ON_WATER');assert.ok(Math.abs(f.position.y-config.hullOffset-field(f.position.x,f.position.z,f.simulationTime).height)<1);}
  assert.ok(high-low>.2);assert.ok(f.orientation.angleTo(f.previousOrientation)<.2);
  for(let i=0;i<1500&&f.state!=='AIRBORNE';i++)f.update(1/60,{pitch:1,roll:0,yaw:0,throttle:1});assert.equal(f.state,'AIRBORNE');assert.ok(f.position.y>field(f.position.x,f.position.z,f.simulationTime).height);
  f.reset();assert.equal(f.waterImpact,0);assert.equal(f.simulationTime,0);assert.ok(f.previousPosition.equals(f.position));assert.equal(f.velocity.length(),0);
 }
});
test('landing safety uses vertical speed relative to the moving wave',()=>{
 const f=new FlightController(true);f.setWaterSurface(()=>({height:1,dx:0,dz:0,velocity:3}));f.position.y=2.06;f.velocity.set(0,-3,-25);f.throttle=0;f.update(1/60,neutralInput());assert.equal(f.state,'CRASHED');
 const safe=new FlightController(true);safe.setWaterSurface(()=>({height:1,dx:0,dz:0,velocity:-2}));safe.position.y=2.06;safe.velocity.set(0,-3,-25);safe.throttle=0;safe.update(1/60,neutralInput());assert.equal(safe.state,'LANDING');assert.equal(safe.waterImpact>0,true);
});
test('wave-coupled fixed-step physics remains identical at 30,60,120 render FPS',()=>{
 const run=(fps:number)=>{const f=new FlightController();f.setWaterSurface(field);let accumulator=0;for(let frame=0;frame<fps*12;frame++){accumulator+=1/fps;while(accumulator+1e-10>=1/60){f.update(1/60,{pitch:1,roll:0,yaw:0,throttle:1});accumulator-=1/60;}}return f;};const base=run(60);for(const fps of[30,120]){const f=run(fps);assert.ok(base.position.distanceTo(f.position)<1e-7);assert.ok(base.orientation.angleTo(f.orientation)<1e-6);}
});
