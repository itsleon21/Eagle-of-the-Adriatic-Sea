import {test} from 'node:test';import assert from 'node:assert/strict';import {PerspectiveCamera} from 'three';
import {ChaseCamera,cameraViews} from '../src/camera/ChaseCamera.ts';import {FlightController} from '../src/aircraft/FlightController.ts';import {FlightConfig,M5FlightConfig} from '../src/aircraft/FlightConfig.ts';

test('C camera cycle offers five distinct finite views and never changes flight state',()=>{
 for(const tuning of[FlightConfig,M5FlightConfig]){
  const flight=new FlightController(true,tuning),before=flight.position.clone(),orientation=flight.orientation.clone(),camera=new PerspectiveCamera(55,16/9,.4,26000),rig=new ChaseCamera(camera),positions=[];
  rig.reset(flight);for(let i=0;i<cameraViews.length;i++){
   assert.equal(rig.view.id,cameraViews[i].id);positions.push(camera.position.clone());for(const n of[...camera.position.toArray(),...camera.quaternion.toArray()])assert.ok(Number.isFinite(n));
   assert.ok(camera.position.distanceTo(flight.position)>(rig.view.id==='cockpit'?.5:15));assert.ok(Math.abs(camera.quaternion.length()-1)<1e-9);rig.cycle(flight);
  }
  for(let i=0;i<positions.length;i++)for(let j=i+1;j<positions.length;j++)assert.ok(positions[i].distanceTo(positions[j])>5);
  assert.equal(rig.view.id,'chase');assert.ok(before.equals(flight.position));assert.ok(orientation.equals(flight.orientation));
 }
});
test('camera reset restores chase, and terrain clearance keeps the aircraft in view',()=>{
 const flight=new FlightController(),camera=new PerspectiveCamera(55,16/9,.4,26000),rig=new ChaseCamera(camera);rig.reset(flight);rig.cycle(flight);rig.cycle(flight);rig.keepAbove(160);assert.equal(camera.position.y,160);
 const projected=flight.position.clone().project(camera);assert.ok(Math.abs(projected.x)<1&&Math.abs(projected.y)<1);
 rig.reset(flight);assert.equal(rig.view.id,'chase');assert.ok(camera.position.y<20);
});

test('cockpit follows the interpolated aircraft pose and restores external near clipping on exit',()=>{const f=new FlightController(true),camera=new PerspectiveCamera(),rig=new ChaseCamera(camera);while(rig.view.id!=='cockpit')rig.cycle(f);const pose={position:f.position.clone().addScalar(10),quaternion:f.orientation.clone()};rig.update(f,.016,false,pose);assert.ok(camera.position.distanceTo(pose.position)<3);assert.equal(camera.near,.08);rig.cycle(f);assert.equal(camera.near,.4);});

test('cockpit look can pan, clamp and recenter without moving the eye or aircraft',()=>{
 const f=new FlightController(true),camera=new PerspectiveCamera(),rig=new ChaseCamera(camera);rig.setMovement(false);while(rig.view.id!=='cockpit')rig.cycle(f);
 const eye=camera.position.clone(),forward=camera.quaternion.clone(),attitude=f.orientation.clone();rig.lookAround(200,-60);rig.update(f,1,true);
 assert.ok(camera.quaternion.angleTo(forward)>.6);assert.ok(camera.position.distanceTo(eye)<1e-8);assert.ok(f.orientation.equals(attitude));
 rig.lookAround(1e9,1e9);rig.update(f,1,true);assert.ok(Number.isFinite(camera.quaternion.w));rig.recenter();rig.update(f,1,true);assert.ok(camera.quaternion.angleTo(forward)<1e-6);
 rig.lookAround(150,0);rig.cycle(f);while(rig.view.id!=='cockpit')rig.cycle(f);assert.ok(camera.quaternion.angleTo(forward)<1e-6);
});

test('fast looping, inverted turns and rolls remain framed at 30, 60 and 120 FPS in every external view',async()=>{
 const {MC72FlightConfig}=await import('../src/aircraft/FlightConfig.ts');
 for(const fps of[30,60,120])for(const mode of['chase','wide','side','overhead'])for(const maneuver of['loop','immelmann','roll']){
  const f=new FlightController(true,MC72FlightConfig),camera=new PerspectiveCamera(55,16/9,.4,26000),rig=new ChaseCamera(camera);
  f.position.set(0,500,0);rig.reset(f);while(rig.view.id!==mode)rig.cycle(f);
  for(let i=0;i<fps*10;i++){
   const t=i/fps,a=t*.85;f.position.set(0,500+130*(1-Math.cos(a)),-130*Math.sin(a));f.velocity.set(0,110*Math.sin(a),-110*Math.cos(a));
   f.maneuver=maneuver==='roll'?null:maneuver;f.rolling=maneuver==='roll';if(maneuver==='immelmann'&&a>Math.PI)f.heading=Math.PI;
   rig.update(f,1/fps);camera.updateMatrixWorld();const p=f.position.clone().project(camera);
   assert.ok(Math.abs(p.x)<.8&&Math.abs(p.y)<.8&&p.z<1&&p.z> -1,`${mode} ${maneuver} ${fps} frame ${i}`);
  }
 }
});
