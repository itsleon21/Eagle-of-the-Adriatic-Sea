import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import * as T from 'three';
import {aircraftCatalog,getAircraft,resolveAircraftId} from '../src/aircraft/AircraftCatalog.ts';
import {FlightController,neutralInput} from '../src/aircraft/FlightController.ts';
import {landingProfile} from '../src/aircraft/LandingGuidance.ts';
import {TimeOfDay,timeIds,daylightAt} from '../src/rendering/TimeOfDay.ts';
import {LighthouseBeacon} from '../src/world/LighthouseBeacon.ts';
import {mooringSites} from '../src/world/Moorings.ts';
import {islands,terrainHeight} from '../src/world/WorldConfig.ts';
import {buildSettlementLayout} from '../src/world/SettlementLayout.ts';
import {World} from '../src/world/World.ts';

test('three distinct aircraft load named models, take off, cruise, land and fully reset',()=>{
 assert.equal(aircraftCatalog.length,3);assert.equal(new Set(aircraftCatalog.map(a=>a.modelFile)).size,3);assert.equal(new Set(aircraftCatalog.map(a=>a.tuning.cruiseSpeed)).size,3);
 for(const a of aircraftCatalog){assert.equal(resolveAircraftId('?aircraft='+a.id,'bad'),a.id);const f=new FlightController(false,a.tuning);
  for(let i=0;i<1800&&f.state!=='AIRBORNE';i++)f.update(1/60,{pitch:1,roll:0,yaw:0,throttle:1});assert.equal(f.state,'AIRBORNE',a.id);
  f.position.y=400;for(let i=0;i<600;i++)f.update(1/60,{pitch:0,roll:.3,yaw:0,throttle:0});assert.equal(f.state,'AIRBORNE');assert.ok(f.airspeed<=a.tuning.maxSpeed+.001);
  f.moorAt(100,200,.4);assert.equal(f.state,'ON_WATER');assert.equal(f.throttle,0);assert.equal(f.velocity.length(),0);assert.ok(f.previousPosition.equals(f.position));
  const p=landingProfile(a.id);f.reset(true);f.pitch=f.bank=0;f.throttle=0;f.position.y=a.tuning.hullOffset+.001;f.velocity.set(0,-.5,-(p.minKmh+p.maxKmh)/7.2);f.update(1/60,neutralInput());assert.equal(f.state,'LANDING',a.id);
  f.reset();assert.equal(f.throttle,0);assert.equal(f.state,'ON_WATER');assert.equal(f.tuning,a.tuning);
 }
 assert.ok(getAircraft('mc72').tuning.cruiseSpeed>getAircraft('redwing').tuning.cruiseSpeed);assert.equal(resolveAircraftId('?aircraft=albatross','bad'),'mc72');assert.equal(resolveAircraftId('?aircraft=tern','bad'),'redwing');
});
test('MC72 GLB has complete movable controls, AO and two coaxial propeller nodes',()=>{
 for(const id of['mc72'] as const){const a=getAircraft(id),data=readFileSync(new URL('../public/models/'+a.modelFile,import.meta.url)),g=JSON.parse(data.toString('utf8',20,20+data.readUInt32LE(12))),names=g.nodes.map((n:{name:string})=>n.name);
  for(const name of['AircraftRoot','LeftAileron','RightAileron','Elevator','Rudder','PropellerPivot'])assert.ok(names.includes(name),id+name);
  assert.equal(names.filter((n:string)=>n.startsWith('PropellerPivot')).length,2);assert.ok(g.meshes.some((m:{primitives:{attributes:Record<string,number>}[]})=>m.primitives.some(p=>p.attributes.COLOR_0!==undefined)));assert.ok(data.length<5*1024*1024);
 }
});
test('all six moorings have deep, unobstructed berths and an open water approach',()=>{
 const world=new World();assert.equal(mooringSites.length,6);
 for(const s of mooringSites){const p=s.berth.clone();p.y=1.2;assert.equal(world.collides(p,p),false,s.id);for(const sideways of[-6,0,6])for(const lengthwise of[-4.25,0,4.25]){const edge=new T.Vector3(p.x+s.dz*sideways+s.dx*lengthwise,1.2,p.z-s.dx*sideways+s.dz*lengthwise);assert.equal(world.collides(edge,edge),false,s.id+' largest-aircraft clearance');}for(const d of islands)for(const t of[0,.3,.6,1])assert.ok(terrainHeight(d,p.x+s.dx*t*110,p.z+s.dz*t*110)<-3,s.id);const boat=new FlightController(false,getAircraft('mc72').tuning);boat.moorAt(p.x,p.z,s.heading);for(let i=0;i<240;i++)boat.update(1/60,neutralInput());assert.equal(boat.state,'ON_WATER');assert.ok(Math.hypot(boat.position.x-p.x,boat.position.z-p.z)<.001);}
});
test('time changes are frame independent, wrap midnight, and stop completely on pause',()=>{
 for(const fps of[30,60,120])for(const id of timeIds){const c=new TimeOfDay();c.select(id);for(let i=0;i<fps*20;i++)c.update(1/fps,true);assert.ok(Math.abs(c.hour-new TimeOfDay(id).hour)<.01);const hour=c.hour;c.update(90,false);assert.equal(c.hour,hour);assert.equal(c.selection,id);}
 const c=new TimeOfDay('night');c.setAutomatic(true);c.update(120,true);assert.ok(Math.abs(c.hour-1)<1e-8);for(const id of timeIds){const d=new TimeOfDay(id).current;assert.ok(d.direction.every(Number.isFinite));assert.ok(d.day>=0&&d.day<=1);}assert.ok(daylightAt(12).day>daylightAt(7).day);assert.equal(daylightAt(23).nightness,1);
});
test('beacon rotates through real cone volumes, freezes on pause, and lights only after dusk',()=>{
 const b=new LighthouseBeacon();b.update(2,1);const angle=b.rotation;assert.ok(angle>0);b.update(0,1);assert.equal(b.rotation,angle);const beams:T.Mesh[]=[];b.root.traverse(o=>{if(o instanceof T.Mesh&&o.name.includes('cone'))beams.push(o);});assert.equal(beams.length,2);for(const m of beams){assert.equal(m.geometry.type,'ConeGeometry');assert.ok((m.material as T.ShaderMaterial).uniforms.strength.value>0);}b.update(1,0);for(const m of beams)assert.equal((m.material as T.ShaderMaterial).uniforms.strength.value,0);
});
test('both villages contain multiple compact hamlets separated by unbuilt gaps',()=>{
 for(const d of islands.slice(0,2)){const h=buildSettlementLayout(d).houses,seen=new Set<number>(),sizes:number[]=[];for(let i=0;i<h.length;i++){if(seen.has(i))continue;const q=[i];seen.add(i);for(let k=0;k<q.length;k++)for(let j=0;j<h.length;j++)if(!seen.has(j)&&Math.hypot(h[q[k]].x-h[j].x,h[q[k]].z-h[j].z)<50){seen.add(j);q.push(j);}sizes.push(q.length);}assert.ok(sizes.filter(n=>n>=5).length>=3);assert.ok(sizes.some(n=>n>=12));assert.ok(sizes.length>=6);}
 // At least one island occupies the interior of the sea rather than all lying around a perimeter.
 assert.ok(islands.some(d=>d.id!=='harbor'&&Math.hypot(d.x,d.z)<1600));
});
