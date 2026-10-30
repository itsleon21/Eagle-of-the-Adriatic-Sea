import {TownHarborLights} from './TownHarborLights.ts';
import {inTownHarborApproach} from './IslandDetails.ts';
import {IslandIdentity} from './IslandIdentity.ts';
import {buildHarborBoat} from './VesselModel.ts';
import {distantIslandGeometry,addReefRocks} from './SmallIslands.ts';
import {SeaTraffic} from './SeaTraffic.ts';
import * as T from 'three';
import {Church} from './Church.ts';
import {Moorings} from './Moorings.ts';
import {LighthouseBeacon} from './LighthouseBeacon.ts';
import {CoastalDetail} from './CoastalDetail.ts';
import {Seabirds} from './Seabirds.ts';
import { islands,reefs,allLandforms,terrainHeight,random,terrainSegments } from './WorldConfig.ts';
import type { IslandDefinition } from './WorldConfig.ts';
import {buildCoveArch,insideCoveArch,addCoveLandmarks} from './CoveIsland.ts';
import {addCoralBiome,addOutpostIslands} from './ArchipelagoDetails.ts';
import {addMediterraneanPlants} from './MediterraneanPlants.ts';
import {WaterInteraction} from './WaterInteraction.ts';
import { Ocean } from './Ocean.ts';
import {loadEnvironmentKit} from './EnvironmentKit.ts';
import {addIslandDetails,waterfrontPoint,inTakeoffChannel} from './IslandDetails.ts';
import {buildSettlementLayout,layoutOccupied} from './SettlementLayout.ts';
import {SettlementRenderer} from './SettlementRenderer.ts';
import {terrainSurfaceHeight} from './TerrainSurface.ts';
export class World {
 private townHarborLights=new TownHarborLights();private traffic=new SeaTraffic();private outpostWindows:T.MeshStandardMaterial[]=[];readonly moorings:Moorings;private churches:Church[]=[];private beacon=new LighthouseBeacon();
 readonly root=new T.Group(); readonly ocean=new Ocean();private waterInteraction=new WaterInteraction(this.ocean);
 private settlements:SettlementRenderer[]=[];private coastalDetail:CoastalDetail;private birds=new Seabirds();
 private layouts=new Map(islands.map(d=>[d.id,buildSettlementLayout(d)]));
 private churchSites=islands.filter(d=>d.id==='harbor'||d.id==='town').map(d=>waterfrontPoint(d,-.70,108));
 private occupied=(x:number,z:number,padding=0)=>[...this.layouts.values()].some(layout=>layoutOccupied(layout,x,z,padding))||this.churchSites.some(p=>Math.hypot(x-p.x,z-p.z)<36+padding);
 private channelMarkers:T.Mesh[]=[];private crowns:T.InstancedMesh[]=[];private rocks:T.InstancedMesh[]=[];private boats:T.Mesh[]=[];private lighthouseParts:T.Object3D[]=[];assetStatus='程序场景';
 private sailingBoat?:T.Mesh;private sailingBounds=new T.Box3();
 private collisionDirection=new T.Vector3();private collisionPoint=new T.Vector3();private collisionRay=new T.Ray();
 private blockers:T.Box3[]=[]; private time=0;
 constructor(){
  this.root.add(this.ocean.mesh,this.waterInteraction.root,this.traffic.root);this.blockers.push(...this.traffic.bounds);
  for(const d of islands){this.terrain(d);this.vegetation(d);if(d.id==='harbor'||d.id==='town')this.settlement(d);if(d.id==='lighthouse')this.lighthouse(d);}
  for(const d of reefs){this.terrain(d);addReefRocks(this.root,d,this.blockers);}
  addOutpostIslands(this.root,this.blockers);addMediterraneanPlants(this.root,this.occupied);this.arch();this.buoys();this.distantIslands();addIslandDetails(this.root,this.blockers,this.occupied);this.coastalDetail=new CoastalDetail(this.blockers,this.occupied);this.root.add(this.coastalDetail.root,this.birds.mesh);
  const boat=buildHarborBoat(2);boat.position.set(islands[0].x-700,0,islands[0].z+1000);boat.name='Harbor / offshore fishing boat';boat.scale.setScalar(.60);this.root.add(boat);this.boats.push(boat);this.sailingBoat=boat;this.blockers.push(this.sailingBounds);this.updateSailingBoat();this.moorings=new Moorings(this.blockers);this.root.add(this.townHarborLights.root,this.moorings.root,this.beacon.root,new IslandIdentity().root);this.root.traverse(o=>{if(o instanceof T.Mesh&&o.userData.nightWindow)this.outpostWindows.push(o.material as T.MeshStandardMaterial);});

 }
 private terrain(d:IslandDefinition){
  const sizeX=d.rx*2.25,sizeZ=d.rz*2.25,n=terrainSegments(d),geo=new T.PlaneGeometry(sizeX,sizeZ,n,n);geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position;
  for(let i=0;i<pos.count;i++){const x=pos.getX(i)+d.x,z=pos.getZ(i)+d.z;pos.setY(i,terrainHeight(d,x,z));}
  geo.computeVertexNormals();
  const material=new T.MeshStandardMaterial({color:0xffffff,roughness:1,flatShading:false});
  material.userData.terrainBiome=d.id==='coral'?'sand':'limestone';
  const mesh=new T.Mesh(geo,material);mesh.position.set(d.x,0,d.z);mesh.name=`${d.name} / continuous limestone terrain`;mesh.receiveShadow=mesh.castShadow=true;this.root.add(mesh);
 }
 private vegetation(d:IslandDefinition){
  if(d.id==='coral'){addCoralBiome(this.root,d);this.coastalRocks(d);return;}
  const rng=random(d.seed),count=d.id==='pine'?500:d.id==='lighthouse'?80:d.id==='cove'?240:d.id==='harbor'?340:400;
  const crownGeo=new T.ConeGeometry(1,1,7);crownGeo.translate(0,.5,0);
  const leaves=new T.InstancedMesh(crownGeo,new T.MeshStandardMaterial({color:0x506b40,roughness:1,flatShading:true}),count);
  const trunks=new T.InstancedMesh(new T.CylinderGeometry(.15,.25,1,5),new T.MeshStandardMaterial({color:0x6d5940,roughness:1}),count);
  const dummy=new T.Object3D(),color=new T.Color();let placed=0;
  for(let attempt=0;placed<count&&attempt<count*20;attempt++){
   const x=d.x+(rng()-.5)*d.rx*1.9,z=d.z+(rng()-.5)*d.rz*1.9,h=terrainHeight(d,x,z);
   if(h<25||h>d.height*.95||inTakeoffChannel(d,x,z,30)||this.occupied(x,z,9))continue;
   const slope=Math.hypot(terrainHeight(d,x+3,z)-terrainHeight(d,x-3,z),terrainHeight(d,x,z+3)-terrainHeight(d,x,z-3))/6;if(slope>1.2)continue;
   if((d.id==='harbor'||d.id==='town')&&(z-d.z)*(d.id==='town'?-1:1)>-70&&Math.abs(x-d.x)<d.rx*.77)continue;
   const height=13+rng()*16,radius=4.5+rng()*4.5;
   dummy.position.set(x,h+height*.18,z);dummy.rotation.set((rng()-.5)*.07,rng()*6.28,(rng()-.5)*.07);dummy.scale.set(radius,height*.82,radius);dummy.updateMatrix();leaves.setMatrixAt(placed,dummy.matrix);
   color.setHSL(.22+rng()*.07,.25+rng()*.15,.18+rng()*.12);leaves.setColorAt(placed,color);
   dummy.position.set(x,h+height*.22,z);dummy.scale.set(1,height*.44,1);dummy.updateMatrix();trunks.setMatrixAt(placed,dummy.matrix);placed++;
  }
  leaves.count=placed;trunks.count=placed;leaves.castShadow=true;this.root.add(leaves,trunks);this.crowns.push(leaves);
  this.coastalRocks(d);
 }
 private coastalRocks(d:IslandDefinition){
  const rng=random(d.seed+57),dummy=new T.Object3D();
  const rockCount=d.id==='harbor'?150:d.id==='pine'?180:d.id==='lighthouse'?150:d.id==='coral'?100:110,rocks=new T.InstancedMesh(new T.DodecahedronGeometry(1,0),new T.MeshStandardMaterial({color:0xaaa58f,flatShading:true,roughness:.95}),rockCount);
  let rockPlaced=0;
  for(let attempt=0;rockPlaced<rockCount&&attempt<rockCount*8;attempt++){
   const a=rng()*Math.PI*2,r=d.id==='coral'?.65+rng()*.55:.93+rng()*.22,x=d.x+Math.cos(a)*d.rx*r,z=d.z+Math.sin(a)*d.rz*r,h=terrainHeight(d,x,z);
   if(inTownHarborApproach(d,x,z,25)||inTakeoffChannel(d,x,z,45)||(d.id==='cove'&&x>d.x+130&&Math.abs(z-d.z+55)<85)||h>-.5)continue;
   const small=d.id==='coral',sx=(small?2:3)+rng()*(small?5:9),sy=(small?2:3)+rng()*(small?6:11),sz=(small?2:3)+rng()*(small?5:9);
   dummy.position.set(x,Math.max(-2,h-1),z);dummy.rotation.set(rng()*.5,rng()*6,rng()*.3);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();rocks.setMatrixAt(rockPlaced,dummy.matrix);
   this.blockers.push(new T.Box3(new T.Vector3(x-sx*.72,dummy.position.y-sy*.65,z-sz*.72),new T.Vector3(x+sx*.72,dummy.position.y+sy*.75,z+sz*.72)));rockPlaced++;
  }
  rocks.count=rockPlaced;rocks.name=`${d.name} / exposed coastal rocks`;rocks.receiveShadow=true;this.root.add(rocks);this.rocks.push(rocks);
 }
 private mesh(geo:T.BufferGeometry,color:number,x:number,y:number,z:number){const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({color,roughness:.85}));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;this.root.add(mesh);return mesh;}
 private settlement(d:IslandDefinition){
  const settlement=new SettlementRenderer(d,this.layouts.get(d.id)!,this.blockers);this.settlements.push(settlement);this.root.add(settlement.root);
  const church=new Church(d,this.blockers);this.churches.push(church);this.root.add(church.root);
  // Real boats sit beside each timber pier, with their bows aligned to the berth.
  for(const a of(d.id==='town'?[-2.12,-1.45,-.63]:[-2.73,-2.18,-1.62,-1.04,-.49])){
   const p=waterfrontPoint(d,a,-28);if(p.y>25)continue;
   for(const side of[-1,1]){
    const x=p.x+p.nz*side*11,z=p.z-p.nx*side*11;
    const boat=buildHarborBoat(side>0?3:1);boat.position.set(x,0,z);boat.scale.setScalar(.55);this.root.add(boat);boat.rotation.y=Math.atan2(-p.nx,-p.nz);this.boats.push(boat);
   }
  }
 }
 private lighthouse(d:IslandDefinition){const before=new Set(this.root.children);const x=d.x,z=d.z,h=terrainHeight(d,x,z);this.mesh(new T.CylinderGeometry(21,25,7,16),0xbdb99b,x,h+3,z);this.mesh(new T.CylinderGeometry(7,11,50,20),0xeee8ca,x,h+30,z);this.mesh(new T.CylinderGeometry(10,10,4,20),0x846344,x,h+55,z);this.mesh(new T.CylinderGeometry(6,7,10,12),0xc3d4ca,x,h+62,z);this.mesh(new T.ConeGeometry(11,10,20),0xa54d31,x,h+71,z);this.blockers.push(new T.Box3(new T.Vector3(x-12,h,z-12),new T.Vector3(x+12,h+78,z+12)));this.lighthouseParts=this.root.children.filter(obj=>!before.has(obj));}
 private arch(){this.root.add(buildCoveArch(islands[3]));addCoveLandmarks(this.root,islands[3],this.blockers);}
 private buoys(){const d=islands[0];for(let i=0;i<8;i++){const x=d.x+i*54,z=d.z+610;this.channelMarkers.push(this.mesh(new T.ConeGeometry(1.8,3.5,8),i%2?0xd6bb69:0xb44e36,x,1.5,z));}}
 private distantIslands(){const rng=random(8921);for(let i=0;i<12;i++){let x=0,z=0;while(Math.hypot(x,z)<8500){x=(rng()-.5)*28000;z=(rng()-.5)*28000;}const m=this.mesh(distantIslandGeometry(8921+i*67),0x71928b,x,-25,z);m.scale.set(240+rng()*400,45+rng()*55,180+rng()*240);m.rotation.y=rng()*Math.PI;}}
 async loadAssets(){
  try{const kit=await loadEnvironmentKit(),material=new T.MeshStandardMaterial({vertexColors:true,roughness:.88});
   for(const settlement of this.settlements)settlement.loadKit(kit,material);
   const crown=kit.get('PineCrown');if(crown)for(const mesh of this.crowns){mesh.geometry=crown;mesh.material=material;mesh.instanceColor=null;mesh.computeBoundingSphere();}
   const rock=kit.get('CoastalRock');if(rock)for(const mesh of this.rocks){mesh.geometry=rock;mesh.material=material;mesh.computeBoundingSphere();}
   const tower=kit.get('Lighthouse');if(tower){for(const part of this.lighthouseParts)this.root.remove(part);const d=islands[2],mesh=new T.Mesh(tower,material);mesh.position.set(d.x,terrainHeight(d,d.x,d.z),d.z);mesh.castShadow=true;mesh.receiveShadow=true;this.root.add(mesh);}
   const boat=kit.get('FishingBoat');if(boat)for(const mesh of this.boats){mesh.geometry=boat;mesh.material=material;mesh.scale.setScalar(1);mesh.position.y=.4;mesh.userData.waterline=.4;}
   const warehouse=kit.get('Warehouse');if(warehouse)for(const d of islands.slice(0,2))for(const side of [-1,1]){const p=waterfrontPoint(d,side<0?-2.80:-.34,40),x=p.x,z=p.z,h=terrainHeight(d,x,z),mesh=new T.Mesh(warehouse,material);mesh.position.set(x,h,z);mesh.rotation.y=Math.atan2(-p.nx,-p.nz);mesh.castShadow=mesh.receiveShadow=true;this.root.add(mesh);this.blockers.push(new T.Box3(new T.Vector3(x-13,h,z-8),new T.Vector3(x+13,h+15,z+8)));}
   this.assetStatus='石灰岩海岸 · 曲线港镇 · Blender 模块';
  }catch{this.assetStatus='程序场景（精细资产未加载）';}
 }
 streetView(id:string,churchView=false){if(churchView){const church=this.churches.find(c=>c.root.name.startsWith(id+' /'));if(church){const root=church.root;return{position:new T.Vector3(-42,25,65).applyQuaternion(root.quaternion).add(root.position),target:root.position.clone().add(new T.Vector3(0,15,0))};}}const p=this.layouts.get(id)?.houses.find(p=>p.district==='waterfront'&&p.kind==='HouseArcade')??this.layouts.get(id)?.houses.find(p=>p.district==='waterfront');if(!p)return;
  const c=Math.cos(p.angle),s=Math.sin(p.angle),dx=-18,dz=p.depth*.53+27;
  return{position:new T.Vector3(p.x+dx*c+dz*s,p.ground+7,p.z-dx*s+dz*c),target:new T.Vector3(p.x,p.ground+5,p.z)};
 }
 private updateSailingBoat(){const boat=this.sailingBoat;if(!boat)return;const a=this.time*.019;boat.position.x=islands[0].x-700+Math.cos(a)*130;boat.position.z=islands[0].z+1000+Math.sin(a)*85;boat.rotation.y=Math.atan2(Math.sin(a)*130,-Math.cos(a)*85);this.sailingBounds.min.set(boat.position.x-4,-1,boat.position.z-8);this.sailingBounds.max.set(boat.position.x+4,5,boat.position.z+8);}
 setTimeOfDay(dt:number,nightness:number){this.townHarborLights.setNightness(nightness);this.traffic.setNightness(nightness);for(const material of this.outpostWindows){material.emissive.setHex(0xffb35d);material.emissiveIntensity=T.MathUtils.smoothstep(nightness,.25,.8)*1.4;}for(const settlement of this.settlements)settlement.setNightness(nightness);this.beacon.update(dt,nightness);this.ocean.setBeacon(this.beacon.root.position,this.beacon.beamDirection,T.MathUtils.smoothstep(nightness,.15,.75));this.moorings.setNightness(nightness);for(const church of this.churches)church.setNightness(nightness);}
 updateView(position:T.Vector3){this.coastalDetail.updateView(position);for(const settlement of this.settlements)settlement.updateLOD(position);}
 heightAt(x:number,z:number){let h=-20;for(const d of allLandforms)h=Math.max(h,terrainSurfaceHeight(d,x,z));return h;}
 collides(from:T.Vector3,to:T.Vector3){
  const distance=from.distanceTo(to),samples=Math.max(1,Math.ceil(distance/3));
  for(let i=0;i<=samples;i++){const t=i/samples,x=T.MathUtils.lerp(from.x,to.x,t),z=T.MathUtils.lerp(from.z,to.z,t),y=T.MathUtils.lerp(from.y,to.y,t);
   if(this.heightAt(x,z)>y-1.0||insideCoveArch(islands[3],x,y,z,1))return true;
  }
  const direction=this.collisionDirection.subVectors(to,from),length=direction.length(),point=this.collisionPoint;
  const ray=this.collisionRay.set(from,direction.normalize());
  for(const box of this.blockers){if(box.containsPoint(from))return true;if(length>0&&ray.intersectBox(box,point)&&point.distanceTo(from)<=length+1)return true;}return false;
 }
 landingWaterAt(position:T.Vector3,heading:number,speed:number){
  const overWater=this.heightAt(position.x,position.z)<-2,distance=Math.max(80,Math.min(240,speed*5)),dx=-Math.sin(heading),dz=-Math.cos(heading);
  let clearAhead=overWater;for(const t of[.3,.65,1])if(this.heightAt(position.x+dx*distance*t,position.z+dz*distance*t)>-2)clearAhead=false;
  if(clearAhead){const ray=this.collisionRay;ray.origin.set(position.x,1.2,position.z);ray.direction.set(dx,0,dz);for(const box of this.blockers)if(ray.intersectBox(box,this.collisionPoint)&&this.collisionPoint.distanceTo(ray.origin)<=distance){clearAhead=false;break;}}
  return{overWater,clearAhead};
 }
 clearWake(){this.waterInteraction.reset();}
 resetWater(){this.time=0;this.ocean.update(0);this.waterInteraction.reset();}
 update(dt:number,position:T.Vector3,heading:number,speed:number,onWater:boolean,simulationTime?:number,impact=0,aircraft='redwing'){this.birds.update(dt);this.time=simulationTime??this.time+dt;this.updateSailingBoat();this.ocean.update(this.time);this.traffic.update(this.time,(x,z)=>this.ocean.surfaceAt(x,z));this.waterInteraction.update(dt,position,heading,speed,onWater,impact,aircraft);for(const boat of this.boats){const water=this.ocean.surfaceAt(boat.position.x,boat.position.z);boat.position.y=(boat.userData.waterline??1.2)+water.height;boat.rotation.x=Math.atan(water.dz)*.65;boat.rotation.z=-Math.atan(water.dx)*.65;}for(const marker of this.channelMarkers)marker.position.y=1.5+this.ocean.heightAt(marker.position.x,marker.position.z);}
}
