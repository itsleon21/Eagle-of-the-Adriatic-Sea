import {test} from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {FrameMetrics} from '../src/game/FrameMetrics.ts';
import {buildHarborDetail} from '../src/world/HarborDetail.ts';
import {islands,harbor,terrainHeight} from '../src/world/WorldConfig.ts';
import {buildSettlementLayout} from '../src/world/SettlementLayout.ts';
import {sampleOceanWaves,seaShelter} from '../src/world/OceanWaves.ts';
import {World} from '../src/world/World.ts';

test('harbor sample contains actual merged facade geometry and finite dry-land placement',()=>{
 for(const d of islands.filter(d=>d.bay&&d.id!=='cove')){
  const mesh=buildHarborDetail(d,buildSettlementLayout(d));assert.ok(mesh.userData.decoratedHouses>10);assert.ok(mesh.geometry.attributes.position.count>15000);mesh.geometry.computeBoundingBox();const box=mesh.geometry.boundingBox!;
  assert.ok(box.min.y>0);assert.ok(box.max.x-box.min.x<d.rx*2.5);for(const n of mesh.geometry.attributes.position.array)assert.ok(Number.isFinite(n));mesh.geometry.dispose();(mesh.material as T.Material).dispose();
 }
});
test('wave shelter is continuous, calms the bay, and vertical wave velocity matches the moving surface',()=>{
 const x=harbor.x,z=harbor.z+harbor.rz*.62;assert.ok(seaShelter(x,z).value<.42);assert.ok(seaShelter(x+2000,z).value>.99);
 for(let i=0;i<30;i++){const px=x+i*23,pz=z-i*19,t=i*.21,e=.0001,w=sampleOceanWaves(px,pz,t,.55);
  const vx=(sampleOceanWaves(px+e,pz,t,.55).height-sampleOceanWaves(px-e,pz,t,.55).height)/(2*e),vz=(sampleOceanWaves(px,pz+e,t,.55).height-sampleOceanWaves(px,pz-e,t,.55).height)/(2*e),vt=(sampleOceanWaves(px,pz,t+e,.55).height-sampleOceanWaves(px,pz,t-e,.55).height)/(2*e);
  assert.ok(Math.abs(w.dx-vx)<1e-6&&Math.abs(w.dz-vz)<1e-6&&Math.abs(w.velocity-vt)<1e-6);
 }
});
test('frame statistics exclude warmup, include stalls and reset after visibility changes',()=>{
 const m=new FrameMetrics();for(let i=1;i<=121;i++)m.frame(i*20);assert.equal(m.snapshot.samples,0);for(let i=122;i<=221;i++)m.frame(i*20);assert.equal(m.snapshot.fps,50);assert.equal(m.snapshot.p95,20);
 m.frame(221*20+500);assert.ok(m.snapshot.mean>24);m.reset();assert.equal(m.snapshot.samples,0);
});
test('offshore fishing circuit stays clear of islands and the harbor takeoff runway',()=>{
 for(let i=0;i<120;i++){const a=i/120*Math.PI*2,x=harbor.x-700+Math.cos(a)*130,z=harbor.z+1000+Math.sin(a)*85;for(const d of islands)assert.ok(terrainHeight(d,x,z)<-2);assert.ok(x<harbor.x-500);}
 const w=new World(),boat=w.root.getObjectByName('Harbor / offshore fishing boat')!;const start=boat.position.clone();w.update(1,new T.Vector3(),0,0,false,20);assert.ok(boat.position.distanceTo(start)>10);assert.ok(w.collides(boat.position.clone(),boat.position.clone().add(new T.Vector3(1,0,0))));
});
