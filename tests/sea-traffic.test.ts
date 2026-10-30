import {test} from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';import {SeaTraffic,buildTrafficRoutes,trafficWater} from '../src/world/SeaTraffic.ts';import {islands,terrainHeight} from '../src/world/WorldConfig.ts';
test('five public islands have connected reciprocal traffic corridors, excluding secret cove and dry land',()=>{const routes=buildTrafficRoutes(),connected=new Set(routes.flatMap(r=>[r.from,r.to]));assert.equal(routes.length,5);assert.equal(connected.size,5);assert.ok(!connected.has('cove'));for(const r of routes)for(let i=0;i<=400;i++){const p=r.curve.getPointAt(i/400);assert.ok(trafficWater(p.x,p.z),`${r.from}/${r.to} unsafe ${p.x},${p.z}`);assert.ok(islands.every(d=>terrainHeight(d,p.x,p.z)<-2));}});
test('twenty vessels move on shared sea height, keep collision bounds and are deterministic for a frozen clock',()=>{const fleet=new SeaTraffic(),water=()=>({height:.6,dx:.04,dz:-.03});assert.equal(fleet.bounds.length,20);fleet.update(20,water);const before=fleet.root.children.map(o=>o.position.clone());fleet.update(20,water);fleet.root.children.forEach((o,i)=>{assert.ok(o.position.equals(before[i]));assert.equal(o.position.y,.6);assert.ok(fleet.bounds[i].containsPoint(o.position));});const turnTime=fleet.routes[0].curve.getLength()/7.2+30;fleet.update(turnTime-.001,water);const turnPosition=fleet.root.children[0].position.clone(),turnAttitude=fleet.root.children[0].quaternion.clone();fleet.update(turnTime+.001,water);assert.ok(fleet.root.children[0].position.distanceTo(turnPosition)<.1);assert.ok(fleet.root.children[0].quaternion.angleTo(turnAttitude)<.01);fleet.update(40,water);assert.ok(fleet.root.children.some((o,i)=>o.position.distanceTo(before[i])>10));});

test('detailed marine models stay within vessel collision clearances with finite normals and batched fittings',async()=>{
 const {buildVessel}=await import('../src/world/VesselModel.ts');
 for(const [i,kind] of(['ferry','fishing','sailing'] as const).entries()){
  const boat=buildVessel(kind,i,new T.MeshBasicMaterial()),bounds=new T.Box3().setFromObject(boat),scale=kind==='ferry'?1.55:kind==='fishing'?1.45:1.65;
  assert.ok(bounds.min.x*scale>=-20&&bounds.max.x*scale<=20);
  assert.ok(bounds.min.z*scale>=-20&&bounds.max.z*scale<=20);
  assert.ok(bounds.min.y*scale>=-2&&bounds.max.y*scale<=(kind==='sailing'?27:10));
  let meshes=0,triangles=0;boat.traverse(o=>{if(o instanceof T.Mesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;for(const v of o.geometry.attributes.normal.array)assert.ok(Number.isFinite(v));}});
  assert.ok(meshes<18&&triangles>1500);
 }
});
