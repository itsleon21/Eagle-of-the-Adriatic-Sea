import {test} from 'node:test';import assert from 'node:assert/strict';import {Vector3} from 'three';
import {FlightController,neutralInput} from '../src/aircraft/FlightController.ts';import {FlightConfig,M5FlightConfig} from '../src/aircraft/FlightConfig.ts';
import {landingAdvice,landingProfile} from '../src/aircraft/LandingGuidance.ts';import type {LandingSnapshot} from '../src/aircraft/LandingGuidance.ts';
import {touchdownProblems} from '../src/aircraft/LandingEnvelope.ts';import {World} from '../src/world/World.ts';import {harbor,harborRunway,islands} from '../src/world/WorldConfig.ts';
const stable=(id:'redwing'|'m5'):LandingSnapshot=>({state:'AIRBORNE',speed:id==='redwing'?35:26,clearance:3,verticalSpeed:-.8,bank:0,pitch:0,throttle:.1,overWater:true,clearAhead:true,landingCount:0});
test('each aircraft has a conservative approach band that actually permits a gentle water landing',()=>{
 for(const tuning of[FlightConfig,M5FlightConfig]){
  const profile=landingProfile(tuning.id);assert.ok(profile.minKmh>tuning.liftSpeed*3.6+5);assert.ok(profile.maxKmh<tuning.safeLandingSpeed*3.6);
  const s=stable(tuning.id),advice=landingAdvice(tuning,s);assert.equal(advice.ready,true);assert.equal(advice.tone,'good');
  const f=new FlightController(true,tuning);f.position.y=tuning.hullOffset+.002;f.velocity.set(0,s.verticalSpeed,-s.speed);f.throttle=.1;f.pitch=0;f.bank=0;f.update(1/60,neutralInput());assert.equal(f.state,'LANDING');
 }
});
test('height by itself never grants safe guidance: speed, attitude, descent and water must all agree',()=>{
 const base=stable('redwing');
 for(const overrides of[{speed:65},{speed:18},{bank:.4},{pitch:-.3},{verticalSpeed:-7},{clearAhead:false},{overWater:false},{pitch:.25},{verticalSpeed:2},{throttle:1},{rolling:true}]){
  const a=landingAdvice(FlightConfig,{...base,...overrides});assert.equal(a.ready,false);assert.notEqual(a.tone,'good');
 }
 const high=landingAdvice(FlightConfig,{...base,clearance:80});assert.equal(high.ready,false);assert.equal(high.title,'进近稳定 · 缓慢下降');
 assert.equal(landingAdvice(FlightConfig,{...base,bank:Math.PI*2}).ready,true);
});
test('physics and warnings share the strict touchdown limits, including relative wave velocity',()=>{
 const C=FlightConfig;assert.deepEqual(touchdownProblems(C,C.safeLandingSpeed,-C.safeLandingSink,C.safeLandingBank,-.16),[]);
 for(const [overrides,reason] of[[{speed:58},'speed'],[{verticalSpeed:-5.1},'sink'],[{bank:.301},'bank'],[{pitch:-.161},'pitch']] as const){
  const s={...stable('redwing'),...overrides};assert.ok(touchdownProblems(C,s.speed,s.verticalSpeed,s.bank,s.pitch).includes(reason));assert.equal(landingAdvice(C,s).tone,'danger');
 }
 const f=new FlightController(true);f.setWaterSurface(()=>({height:1.1,dx:0,dz:0,velocity:2}));f.position.y=C.hullOffset+1.1+3;f.velocity.y=-1;assert.ok(Math.abs(f.landingContact.clearance-3)<1e-10);assert.equal(f.landingContact.verticalSpeed,-3);
 assert.equal(landingAdvice(C,{...stable('redwing'),...f.landingContact}).ready,false);
});
test('automatic guide appears on low descent, stays out of takeoff, and confirms deceleration after touch',()=>{
 const base=stable('redwing');assert.equal(landingAdvice(FlightConfig,base).automatic,true);
 assert.equal(landingAdvice(FlightConfig,{...base,verticalSpeed:3,throttle:1}).automatic,false);assert.equal(landingAdvice(FlightConfig,{...base,speed:27,verticalSpeed:3,throttle:1}).title,'正在爬升 · 暂未进近');
 assert.equal(landingAdvice(FlightConfig,{...base,clearance:150}).automatic,false);
 assert.equal(landingAdvice(FlightConfig,{...base,state:'LANDING'}).title,'已着水 · 保持直线');
 assert.equal(landingAdvice(FlightConfig,{...base,state:'ON_WATER',landingCount:1}).title,'着水完成');
});
test('water approach check rejects island terrain and a shoreline ahead of an otherwise wet position',()=>{
 const world=new World();assert.deepEqual(world.landingWaterAt(new Vector3(harborRunway.x,20,harborRunway.z),-Math.PI/2,35),{overWater:true,clearAhead:true});
 const d=islands[2];assert.equal(world.landingWaterAt(new Vector3(d.x,160,d.z),0,35).overWater,false);
 assert.deepEqual(world.landingWaterAt(new Vector3(harbor.x,30,harbor.z+200),0,40),{overWater:true,clearAhead:false});
});
