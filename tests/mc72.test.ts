import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';import * as T from 'three';
import {aircraftCatalog,resolveAircraftId} from '../src/aircraft/AircraftCatalog.ts';
import {AircraftModel} from '../src/aircraft/AircraftModel.ts';
import {MC72FlightConfig} from '../src/aircraft/FlightConfig.ts';
import {FlightController} from '../src/aircraft/FlightController.ts';
import {sampleOceanWaves} from '../src/world/OceanWaves.ts';

test('MC72 model has true racing proportions, two long floats and coaxial contra-rotating propellers',()=>{
 const data=readFileSync(new URL('../public/models/mc72.glb',import.meta.url)),g=JSON.parse(data.toString('utf8',20,20+data.readUInt32LE(12)));
 const root=g.nodes.findIndex((n:{name:string})=>n.name==='AircraftRoot'),bounds=new T.Box3(),nodeBounds=new Map<string,T.Box3>();
 const walk=(i:number,parent:T.Matrix4)=>{const n=g.nodes[i],local=n.matrix?new T.Matrix4().fromArray(n.matrix):new T.Matrix4().compose(new T.Vector3().fromArray(n.translation??[0,0,0]),new T.Quaternion().fromArray(n.rotation??[0,0,0,1]),new T.Vector3().fromArray(n.scale??[1,1,1])),matrix=parent.clone().multiply(local),box=new T.Box3();
  if(n.mesh!==undefined)for(const p of g.meshes[n.mesh].primitives){const a=g.accessors[p.attributes.POSITION];box.union(new T.Box3(new T.Vector3().fromArray(a.min),new T.Vector3().fromArray(a.max)).applyMatrix4(matrix));}if(!box.isEmpty()){bounds.union(box);nodeBounds.set(n.name,box);}for(const child of n.children??[])walk(child,matrix);};walk(root,new T.Matrix4());
 const size=bounds.getSize(new T.Vector3());assert.ok(Math.abs(size.x-9.48)<.04);assert.ok(Math.abs(size.z-8.32)<.04);assert.ok(size.y>3.1&&size.y<3.5);
 const floats=[...nodeBounds.entries()].filter(([name])=>name.includes('stepped racing float'));assert.equal(floats.length,2);for(const [,box] of floats){assert.ok(box.getSize(new T.Vector3()).z>6.5);assert.ok(box.max.y<-.85);}
 const props=g.nodes.filter((n:{name:string})=>n.name.startsWith('PropellerPivot'));assert.equal(props.length,2);assert.deepEqual(props.map((n:{extras:{rotation_direction:number}})=>n.extras.rotation_direction).sort(),[-1,1]);assert.ok(Math.abs(props[0].translation[2]-props[1].translation[2])>.12);assert.equal(props[0].translation[0],props[1].translation[0]);
});
test('removed aircraft cannot be selected or ship in the current static assets; old T12 links migrate',()=>{
 assert.deepEqual(aircraftCatalog.map(a=>a.id),['redwing','m5','mc72']);assert.equal(resolveAircraftId('','albatross'),'mc72');assert.equal(resolveAircraftId('','tern'),'redwing');
 for(const name of['tern.glb','albatross.glb'])assert.equal(existsSync(new URL('../public/models/'+name,import.meta.url)),false);
 const model=new AircraftModel('mc72'),props:T.Object3D[]=[];model.root.traverse(o=>{if(typeof o.userData.rotation_direction==='number')props.push(o);});assert.equal(props.length,2);model.update(.1,.6,0,0,0);assert.ok(props[0].rotation.z*props[1].rotation.z<0);model.dispose();
});
test('MC72 takes off on the moving twin-float surface and keeps fixed-step results identical',()=>{
 const run=(fps:number)=>{const f=new FlightController(false,MC72FlightConfig);f.setWaterSurface((x,z,t)=>sampleOceanWaves(x,z,t,.25));let accumulator=0;for(let i=0;i<fps*25;i++){accumulator+=1/fps;while(accumulator+1e-10>=1/60){f.update(1/60,{pitch:f.state==='AIRBORNE'?0:1,roll:0,yaw:0,throttle:1});accumulator-=1/60;}}assert.equal(f.state,'AIRBORNE');return f;};const reference=run(60);for(const fps of[30,120]){const f=run(fps);assert.ok(f.position.distanceTo(reference.position)<1e-7);assert.ok(f.orientation.angleTo(reference.orientation)<1e-6);}
});

test('MC72 uses a full-depth fuselage and one wing skin for paint and radiators',()=>{
 const data=readFileSync(new URL('../public/models/mc72.glb',import.meta.url)),g=JSON.parse(data.toString('utf8',20,20+data.readUInt32LE(12))),root=g.nodes.find((n:{name:string})=>n.name==='AircraftRoot');
 assert.ok(root.extras.fuselage_max_width_m>=.9);assert.ok(root.extras.fuselage_max_depth_m>=1.1);assert.match(root.extras.skin_topology,/Single surface/);
 // Cast through an actual brass panel. Exactly one upper skin and one lower skin,
 // instead of the old second radiator patch intersecting a red wing underneath.
 const body=g.nodes.find((n:{name:string})=>n.name==='AircraftBody'),binaryStart=28+data.readUInt32LE(12);
 const read=(index:number)=>{const a=g.accessors[index],v=g.bufferViews[a.bufferView],count=a.count*(a.type==='VEC3'?3:1),size=a.componentType===5126||a.componentType===5125?4:2,values=[];for(let i=0;i<count;i++){const offset=binaryStart+(v.byteOffset??0)+(a.byteOffset??0)+i*size;values.push(a.componentType===5126?data.readFloatLE(offset):a.componentType===5125?data.readUInt32LE(offset):data.readUInt16LE(offset));}return values;};
 const hits:number[]=[],ray=new T.Ray(new T.Vector3(.89,2,-.03),new T.Vector3(0,-1,0));
 for(const primitive of g.meshes[body.mesh].primitives){const vertices=read(primitive.attributes.POSITION),indices=read(primitive.indices);for(let i=0;i<indices.length;i+=3){const p=(j:number)=>new T.Vector3().fromArray(vertices,indices[i+j]*3),hit=ray.intersectTriangle(p(0),p(1),p(2),false,new T.Vector3());if(hit&&hit.y>-.5&&hit.y<.5)hits.push(hit.y);}}
 const unique=hits.filter((v,i)=>hits.findIndex(n=>Math.abs(n-v)<1e-5)===i);assert.equal(unique.length,2,`expected two wing skin crossings, got ${unique}`);
});

 test('both MC72 rotor planes and all four blade tips clear the engine cowl',()=>{
 const data=readFileSync(new URL('../public/models/mc72.glb',import.meta.url));const g=JSON.parse(data.toString('utf8',20,20+data.readUInt32LE(12)));
 const props=g.nodes.filter((n:any)=>n.name.startsWith('PropellerPivot'));let blades=0;
 for(const p of props){assert.ok(p.translation[2]<-3.8);for(const child of p.children??[]){const n=g.nodes[child];if(!n.name.startsWith('Metal racing propeller blade'))continue;blades++;for(const primitive of g.meshes[n.mesh].primitives){const bounds=g.accessors[primitive.attributes.POSITION];assert.ok(p.translation[2]+(n.translation?.[2]??0)+bounds.max[2]<-3.78,'blade must remain ahead of cowl');}}}
 assert.equal(blades,4);
 });
