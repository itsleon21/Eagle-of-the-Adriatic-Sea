import {RaceGhost} from '../src/race/RaceGhost.ts';
import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import * as T from 'three';
import {RaceManager,RaceInvitation,raceCourse,raceLaunch,raceHeading} from '../src/race/RaceManager.ts';
import {RaceFireworks} from '../src/race/RaceVisual.ts';import {raceAircraftCatalog} from '../src/race/RaceAircraft.ts';import {aircraftCatalog,isAircraftId,resolveAircraftId} from '../src/aircraft/AircraftCatalog.ts';import {allLandforms,terrainHeight} from '../src/world/WorldConfig.ts';import {FlightController,neutralInput} from '../src/aircraft/FlightController.ts';import {sampleOceanWaves} from '../src/world/OceanWaves.ts';
const cross=(race:RaceManager,index:number,dt=.1)=>{const c=raceCourse[index];return race.update(dt,c.position.clone().addScaledVector(c.normal,-300),c.position.clone().addScaledVector(c.normal,300));};
test('coral jetty invitation triggers once on approach, declines quietly and rearms only after leaving',()=>{const i=new RaceInvitation();assert.equal(i.update(200,0),false);assert.equal(i.update(40,120),false);assert.equal(i.update(100,40),true);assert.equal(i.update(20,0),false);i.update(400,0);assert.equal(i.update(50,0),true);const returning=new RaceInvitation(true);assert.equal(returning.update(0,0),false);returning.update(400,0);assert.equal(returning.update(20,0),true);});
test('three ordered laps, forward crossings, pre-start timing, failure and clean retries',()=>{
 const r=new RaceManager();r.update(3,new T.Vector3(),new T.Vector3());assert.equal(r.state,'READY');r.update(9,new T.Vector3(),new T.Vector3());assert.equal(r.elapsed,0);cross(r,1);assert.equal(r.state,'READY');cross(r,0);assert.equal(r.state,'RUNNING');assert.equal(r.index,1);
 const c=raceCourse[1];r.update(.1,c.position.clone().addScaledVector(c.normal,1),c.position.clone().addScaledVector(c.normal,-1));assert.equal(r.index,1);
 for(let lap=0;lap<3;lap++)for(const i of[1,2,3,0])assert.equal(cross(r,i),true);
 assert.equal(r.state,'COMPLETED');assert.equal(r.lap,3);assert.equal(r.splits.length,3);const elapsed=r.elapsed;r.update(100,new T.Vector3(),new T.Vector3());assert.equal(r.elapsed,elapsed);r.reset();assert.equal(r.state,'COUNTDOWN');assert.equal(r.elapsed,0);assert.equal(r.splits.length,0);r.fail();assert.equal(r.state,'FAILED');assert.equal(cross(r,0),false);
});
test('race gate and connecting sea corridors stay clear of every island and reef',()=>{
 for(let i=0;i<4;i++){const a=raceCourse[i],b=raceCourse[(i+1)%4];for(let t=0;t<=1;t+=.01){const p=a.position.clone().lerp(b.position,t);for(const d of allLandforms)assert.ok(terrainHeight(d,p.x,p.z)<-3);}}
 for(let i=0;i<60;i++){const p=raceLaunch.clone().lerp(raceCourse[0].position,i/59);for(const d of allLandforms)assert.ok(terrainHeight(d,p.x,p.z)<-3);}
});
test('dedicated racing catalog does not leak into free exploration selection',()=>{assert.equal(aircraftCatalog.length,3);assert.equal(raceAircraftCatalog.length,3);for(const a of raceAircraftCatalog){assert.equal(isAircraftId(a.id),false);assert.equal(resolveAircraftId('?aircraft='+a.id,null),'redwing');assert.equal(a.tuning.aerobatics,false);}assert.equal(new Set(raceAircraftCatalog.map(a=>a.tuning.turnRate)).size,3);});
test('all three racers physically take off on the moving sea and reset at their own float waterline',()=>{
 for(const a of raceAircraftCatalog){const f=new FlightController(false,a.tuning);f.setWaterSurface((x,z,time)=>sampleOceanWaves(x,z,time,.25));f.moorAt(raceLaunch.x,raceLaunch.z,raceHeading);for(let i=0;i<26*60;i++)f.update(1/60,{pitch:.9,roll:0,yaw:0,throttle:1});assert.equal(f.state,'AIRBORNE',a.id);assert.ok(f.altitude>20);f.reset();assert.equal(f.throttle,0);assert.equal(f.state,'ON_WATER');assert.ok(f.position.equals(f.previousPosition));}
});
test('racers export real independent controls, packed paint, vertex AO and appropriate propeller counts',()=>{
 for(const a of raceAircraftCatalog){const data=readFileSync(new URL('../public/models/'+a.modelFile,import.meta.url)),len=data.readUInt32LE(12),g=JSON.parse(data.toString('utf8',20,20+len));for(const name of['AircraftRoot','PropellerPivot','LeftAileron','RightAileron','Elevator','Rudder'])assert.ok(g.nodes.some((n:{name:string})=>n.name===name),a.id+' '+name);const blades=g.nodes.filter((n:{name:string})=>n.name.startsWith('Twisted propeller blade'));assert.equal(blades.length,a.id==='m67'?3:2);assert.ok(g.images.length>=1);assert.ok(g.meshes.some((m:{primitives:{attributes:Record<string,number>}[]})=>m.primitives.some(p=>p.attributes.COLOR_0!==undefined)));assert.ok(data.length<5*1024*1024);}
});
test('fireworks freeze exactly on pause and are cleared by reset with finite particle positions',()=>{const f=new RaceFireworks();f.start();f.update(2);const before=Array.from(f.points.geometry.attributes.position.array);f.update(0);assert.deepEqual(Array.from(f.points.geometry.attributes.position.array),before);for(const p of before)assert.ok(Number.isFinite(p));assert.equal(f.points.visible,true);f.reset();assert.equal(f.points.visible,false);f.start();f.update(20);assert.equal(f.points.visible,false);f.dispose();});

test('exported racing silhouettes retain metre-scale reference dimensions and complete twin floats',()=>{
 for(const a of raceAircraftCatalog){
  const data=readFileSync(new URL('../public/models/'+a.modelFile,import.meta.url)),g=JSON.parse(data.toString('utf8',20,20+data.readUInt32LE(12))),bounds=new T.Box3(),floats:T.Box3[]=[];
  const walk=(index:number,parent:T.Matrix4)=>{
   const n=g.nodes[index],matrix=n.matrix?new T.Matrix4().fromArray(n.matrix):new T.Matrix4().compose(new T.Vector3().fromArray(n.translation??[0,0,0]),new T.Quaternion().fromArray(n.rotation??[0,0,0,1]),new T.Vector3().fromArray(n.scale??[1,1,1]));matrix.premultiply(parent);const box=new T.Box3();
   if(n.mesh!==undefined)for(const p of g.meshes[n.mesh].primitives){const accessor=g.accessors[p.attributes.POSITION];box.union(new T.Box3(new T.Vector3().fromArray(accessor.min),new T.Vector3().fromArray(accessor.max)).applyMatrix4(matrix));}
   bounds.union(box);if(/hard-chine stepped float/.test(n.name??''))floats.push(box);for(const child of n.children??[])walk(child,matrix);
  };
  for(const index of g.scenes[g.scene??0].nodes)walk(index,new T.Matrix4());const size=bounds.getSize(new T.Vector3());assert.ok(Math.abs(size.x-a.span)<.03,a.id+' span');assert.ok(Math.abs(size.z-a.length)<.03,a.id+' overall length');assert.ok(a.id==='m67'?Math.abs(size.y-2.97)<.03:size.y>3.3&&size.y<4,a.id+' height');assert.equal(floats.length,2);
  for(const f of floats){const size=f.getSize(new T.Vector3());assert.ok(size.z>6&&size.z<7);assert.ok(size.y>.60&&size.y<.85);assert.ok(f.max.y<-.85&&f.min.y<-(a.id==='m67'?1.55:1.75));}
  assert.ok(floats[0].getCenter(new T.Vector3()).x*floats[1].getCenter(new T.Vector3()).x<0);assert.ok(g.meshes.reduce((sum:number,m:{primitives:unknown[]})=>sum+m.primitives.length,0)<40,'static batching must preserve a small draw budget');
  if(a.id==='s6')assert.ok(g.materials.find((m:{name:string})=>m.name==='S6 mixed manufactured skin').pbrMetallicRoughness.metallicRoughnessTexture);
  if(a.id==='gloster6')assert.ok(g.materials.find((m:{name:string})=>m.name==='Gloster golden metallic skin').pbrMetallicRoughness.metallicFactor>.3);
 }
});

test('each racer completes all three laps with flight controls, on the real sea, without terrain collisions',()=>{
 const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
 for(const a of raceAircraftCatalog){const f=new FlightController(false,a.tuning),r=new RaceManager(),ghost=new RaceGhost(a.id);f.setWaterSurface((x,z,t)=>sampleOceanWaves(x,z,t,.25));f.moorAt(raceLaunch.x,raceLaunch.z,raceHeading);r.update(3,f.position,f.position);
  for(let frame=0;frame<60*900&&r.state!=='COMPLETED';frame++){
   const p=r.current!;let input={pitch:1,roll:0,yaw:0,throttle:1};if(f.state==='AIRBORNE'){
    const dx=p.position.x-f.position.x,dz=p.position.z-f.position.z,desired=Math.atan2(-dx,-dz),error=Math.atan2(Math.sin(desired-f.heading),Math.cos(desired-f.heading));
    input={pitch:clamp((p.position.y-f.position.y)*.018-f.velocity.y*.13,-.18,.20)/a.tuning.maxPitch,roll:clamp(-error*2,-1,1),yaw:0,throttle:clamp((.72-f.throttle)*5,-1,1)};
   }f.update(1/60,input);r.update(1/60,f.previousPosition,f.position);if(r.state==='RUNNING'||r.state==='COMPLETED')ghost.record(r.elapsed,f.position,f.orientation,r.state==='COMPLETED',r.sectors);assert.notEqual(f.state,'CRASHED',a.id);for(const d of allLandforms)assert.ok(f.position.y>terrainHeight(d,f.position.x,f.position.z)+1,a.id);
  }assert.equal(r.state,'COMPLETED',a.id+' gate '+r.index+' lap '+r.lap);assert.equal(r.lap,3);assert.ok(ghost.best,a.id+' complete ghost');assert.equal(ghost.best.time,r.elapsed);assert.equal(ghost.best.sectors.length,12);ghost.dispose();
 }
});
