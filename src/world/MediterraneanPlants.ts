import * as T from 'three';
import {islands,random,terrainHeight} from './WorldConfig.ts';
import {terrainSurfaceHeight} from './TerrainSurface.ts';
import {inTakeoffChannel} from './IslandDetails.ts';
export type PlantSpecies='cypress'|'olive'|'holm-oak'|'tamarisk'|'juniper'|'lavender'|'reed';
export const plantSpecies:PlantSpecies[]=['cypress','olive','holm-oak','tamarisk','juniper','lavender','reed'];
interface PlantInstance {x:number;y:number;z:number;sx:number;sy:number;sz:number;angle:number;color:number}
/** Adriatic evergreen woodland, silver olive groves, salt-tolerant scrub and flowering verges. */
export function addMediterraneanPlants(root:T.Group,occupied:(x:number,z:number,padding?:number)=>boolean){
 const batches=new Map<PlantSpecies|'trunk',PlantInstance[]>();for(const id of[...plantSpecies,'trunk'] as const)batches.set(id,[]);
 const counts:Record<string,Partial<Record<PlantSpecies,number>>>={};
 for(const d of islands){
  const rng=random(d.seed+1701);counts[d.id]={};
  for(const species of plantSpecies){
   const coral=d.id==='coral',forest=d.id==='pine';
   const target=species==='reed'?32:species==='lavender'?45:species==='juniper'?46:coral?(species==='tamarisk'?15:0):species==='cypress'?(forest?12:30):species==='olive'?(forest?18:26):species==='holm-oak'?(forest?35:22):18;
   let placed=0;
   for(let attempt=0;placed<target&&attempt<target*80;attempt++){
    const x=d.x+(rng()-.5)*d.rx*2.03,z=d.z+(rng()-.5)*d.rz*2.03,h=terrainHeight(d,x,z);
    const tree=['cypress','olive','holm-oak','tamarisk'].includes(species),slope=Math.hypot(terrainHeight(d,x+3,z)-terrainHeight(d,x-3,z),terrainHeight(d,x,z+3)-terrainHeight(d,x,z-3))/6;
    if(h<(species==='reed'?.15:1.8)||h>(species==='reed'?2.2:species==='tamarisk'?25:d.height*.92)||slope>.65||inTakeoffChannel(d,x,z,30)||occupied(x,z,tree?11:3))continue;
    const y=terrainSurfaceHeight(d,x,z),angle=rng()*Math.PI*2,batch=batches.get(species)!;
    if(species==='cypress'){
     const height=13+rng()*12,radius=1.5+rng()*1.2;
     batch.push({x,y:y+height*.13,z,sx:radius,sy:height*.87,sz:radius,angle,color:0x34513c});
     batches.get('trunk')!.push({x,y:y+height*.19,z,sx:.32,sy:height*.38,sz:.32,angle,color:0x77674f});
    }else if(tree){
     const olive=species==='olive',salt=species==='tamarisk',height=salt?5+rng()*4:olive?7+rng()*5:10+rng()*7,radius=salt?3+rng()*2:olive?3.5+rng()*2:4+rng()*2.6;
     batches.get('trunk')!.push({x,y:y+height*.3,z,sx:olive?.5:.36,sy:height*.6,sz:olive?.5:.36,angle,color:olive?0x766e59:0x75634b});
     for(let lobe=0;lobe<4;lobe++){const a=lobe*Math.PI*.5+angle;batch.push({x:x+Math.cos(a)*radius*.45,y:y+height*.72+(rng()-.5)*height*.16,z:z+Math.sin(a)*radius*.45,sx:radius*.72,sy:height*(olive?.25:.32),sz:radius*.69,angle,color:salt?0x698061:olive?0x78856a:0x405b37});}
    }else if(species==='juniper'){
     const size=1.5+rng()*2.5;batch.push({x,y:y+size*.35,z,sx:size,sy:size*.55,sz:size*.8,angle,color:0x5b7547});
    }else if(species==='lavender'){
     for(let lobe=0;lobe<3;lobe++)batch.push({x:x+(rng()-.5)*2,y:y+.6+rng()*.25,z:z+(rng()-.5)*2,sx:.65,sy:.6,sz:.65,angle,color:lobe%2?0x8c799c:0xa191ad});
    }else{
     for(let stem=0;stem<4;stem++)batch.push({x:x+(rng()-.5)*1.6,y,z:z+(rng()-.5)*1.6,sx:.12,sy:1.5+rng()*1.6,sz:.12,angle,color:0x7c9053});
    }
    placed++;
   }counts[d.id][species]=placed;
  }
 }
 const dummy=new T.Object3D(),tint=new T.Color();
 for(const [species,instances] of batches){
  if(!instances.length)continue;
  let geo:T.BufferGeometry;
  if(species==='trunk')geo=new T.CylinderGeometry(.7,1,1,6);
  else if(species==='cypress'){geo=new T.LatheGeometry([[0,0],[.45,.05],[.85,.18],[1,.36],[.86,.61],[.52,.85],[.08,1],[0,1.04]].map(([x,y])=>new T.Vector2(x,y)),10);}
  else if(species==='reed'){geo=new T.ConeGeometry(1,1,4);geo.translate(0,.5,0);}
  else geo=new T.SphereGeometry(1,8,6);
  const mesh=new T.InstancedMesh(geo,new T.MeshStandardMaterial({color:0xffffff,roughness:1}),instances.length);
  instances.forEach((v,i)=>{dummy.position.set(v.x,v.y,v.z);dummy.rotation.set(0,v.angle,0);dummy.scale.set(v.sx,v.sy,v.sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);tint.setHex(v.color).multiplyScalar(.93+(i%9)*.018);mesh.setColorAt(i,tint);});
  mesh.name=`Mediterranean vegetation / ${species}`;mesh.castShadow=species!=='lavender'&&species!=='reed';mesh.receiveShadow=true;mesh.computeBoundingSphere();root.add(mesh);
 }
 return counts;
}
