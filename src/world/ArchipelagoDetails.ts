import * as T from 'three';
import {terrainHeight,random,islands} from './WorldConfig.ts';
import type {IslandDefinition} from './WorldConfig.ts';
import {appendSurfacePolygon} from './TerrainSurface.ts';

function lodge(root:T.Group,blockers:T.Box3[],d:IslandDefinition,lx:number,lz:number){
 const x=d.x+lx,z=d.z+lz,y=terrainHeight(d,x,z);if(y<5)return;
 const house=new T.Mesh(new T.BoxGeometry(12,9,10),new T.MeshStandardMaterial({color:0xe9d9b7,roughness:.95}));house.position.set(x,y+4.5,z);house.castShadow=house.receiveShadow=true;root.add(house);
 const roof=new T.Mesh(new T.ConeGeometry(10,6,4),new T.MeshStandardMaterial({color:0xb65b39,roughness:.94}));roof.position.set(x,y+11,z);roof.rotation.y=Math.PI/4;roof.castShadow=true;root.add(roof);
 for(const dx of[-3,3]){const window=new T.Mesh(new T.BoxGeometry(2,3,.15),new T.MeshStandardMaterial({color:0x425d59,roughness:.7}));window.userData.nightWindow=true;window.position.set(x+dx,y+5,z+5.1);root.add(window);}
 blockers.push(new T.Box3(new T.Vector3(x-7,y,z-6),new T.Vector3(x+7,y+14,z+6)));
}

/** Coconut palms use curved trunks and actual drooping leaf ribbons, all in a few GPU batches. */
export function addCoralBiome(root:T.Group,d:IslandDefinition){
 const rng=random(d.seed+900),trunks:number[]=[],leaves:number[]=[],colors:number[]=[],c=new T.Color();
 const tri=(a:T.Vector3,b:T.Vector3,e:T.Vector3,color:number)=>{c.setHex(color);for(const p of[a,b,e]){leaves.push(p.x,p.y,p.z);colors.push(c.r,c.g,c.b);}};
 const addTrunk=(a:T.Vector3,b:T.Vector3,r:number)=>{
  const delta=b.clone().sub(a),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());
  const geometry=new T.CylinderGeometry(r*.8,r,delta.length(),6);geometry.applyQuaternion(q);geometry.translate((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);const expanded=geometry.toNonIndexed();trunks.push(...expanded.attributes.position.array);geometry.dispose();expanded.dispose();
 };
 let placed=0;
 for(let attempt=0;placed<80&&attempt<2000;attempt++){
  const x=d.x+(rng()-.5)*d.rx*1.65,z=d.z+(rng()-.5)*d.rz*1.65,h=terrainHeight(d,x,z);
  if(h<3||h>22)continue;placed++;
  const height=16+rng()*12,lean=rng()*6.28,bend=2+rng()*3,points:T.Vector3[]=[];
  for(let j=0;j<=5;j++){const t=j/5;points.push(new T.Vector3(x+Math.cos(lean)*bend*t*t,h+height*t,z+Math.sin(lean)*bend*t*t));if(j)addTrunk(points[j-1],points[j],.36*(1-t*.35));}
  const crown=points[5];
  for(let leaf=0;leaf<9;leaf++){
   const a=leaf/9*Math.PI*2+rng()*.2,length=7+rng()*4,normal=new T.Vector3(-Math.sin(a),0,Math.cos(a));
   for(let j=0;j<7;j++){
    const vertex=(t:number,side:number)=>crown.clone().add(new T.Vector3(Math.cos(a)*length*t,Math.sin(t*Math.PI)*1.5-t*t*2.4,Math.sin(a)*length*t)).addScaledVector(normal,side*Math.sin(t*Math.PI)*.78);
    const t=j/7,u=(j+1)/7;tri(vertex(t,-1),vertex(u,-1),vertex(t,1),leaf%2?0x537d36:0x6e8f3f);tri(vertex(u,-1),vertex(u,1),vertex(t,1),leaf%2?0x537d36:0x6e8f3f);
   }
  }
 }
 const trunkGeo=new T.BufferGeometry();trunkGeo.setAttribute('position',new T.Float32BufferAttribute(trunks,3));trunkGeo.computeVertexNormals();
 const trunkMesh=new T.Mesh(trunkGeo,new T.MeshStandardMaterial({color:0x897252,roughness:1,flatShading:true}));trunkMesh.name='珊瑚小岛 / curved palm trunks';trunkMesh.castShadow=trunkMesh.receiveShadow=true;root.add(trunkMesh);
 const leafGeo=new T.BufferGeometry();leafGeo.setAttribute('position',new T.Float32BufferAttribute(leaves,3));leafGeo.setAttribute('color',new T.Float32BufferAttribute(colors,3));leafGeo.computeVertexNormals();
 const leafMesh=new T.Mesh(leafGeo,new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.95}));leafMesh.name='珊瑚小岛 / drooping palm fronds';leafMesh.castShadow=leafMesh.receiveShadow=true;root.add(leafMesh);
 const scrub=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),new T.MeshStandardMaterial({color:0x79994c,roughness:1,flatShading:true}),120),dummy=new T.Object3D();let n=0;
 for(let i=0;i<1000&&n<120;i++){const x=d.x+(rng()-.5)*d.rx*1.8,z=d.z+(rng()-.5)*d.rz*1.8,h=terrainHeight(d,x,z);if(h<2)continue;dummy.position.set(x,h+1,z);dummy.scale.set(1.8+rng()*2,1+rng(),1.5+rng()*2);dummy.updateMatrix();scrub.setMatrixAt(n++,dummy.matrix);}scrub.count=n;scrub.name='珊瑚小岛 / low coastal scrub';scrub.receiveShadow=true;root.add(scrub);
}

export function addOutpostIslands(root:T.Group,blockers:T.Box3[]){
 const pine=islands.find(d=>d.id==='pine')!,beacon=islands.find(d=>d.id==='lighthouse')!;
 for(const [x,z] of[[-175,100],[130,180]])lodge(root,blockers,pine,x,z);
 for(const [x,z] of[[-90,130],[85,140],[-110,-115]])lodge(root,blockers,beacon,x,z);
 // One short landing jetty at the foot of the beacon trail.
 let z=beacon.z+beacon.rz*1.05;while(terrainHeight(beacon,beacon.x,z)<2&&z>beacon.z)z-=2;
 const pier=new T.Mesh(new T.BoxGeometry(6,1.2,45),new T.MeshStandardMaterial({color:0x8a7250,roughness:.94}));pier.position.set(beacon.x,2.4,z+20);pier.castShadow=pier.receiveShadow=true;root.add(pier);
 blockers.push(new T.Box3(new T.Vector3(beacon.x-3,0,z-3),new T.Vector3(beacon.x+3,3,z+43)));
 // The final approach to the summit follows a switchback across the southern slope.
 const positions:number[]=[],colors:number[]=[],points=[{x:beacon.x,z},...[[.24,.72],[-.3,.56],[.28,.37],[-.14,.18],[0,0]].map(([x,z])=>({x:beacon.x+x*beacon.rx,z:beacon.z+z*beacon.rz}))];
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),ox=-dz/len*2,oz=dx/len*2;appendSurfacePolygon(beacon,[{x:a.x+ox,z:a.z+oz},{x:b.x+ox,z:b.z+oz},{x:b.x-ox,z:b.z-oz},{x:a.x-ox,z:a.z-oz}],.16,positions,colors,[.58,.49,.33]);}
 const pathGeo=new T.BufferGeometry();pathGeo.setAttribute('position',new T.Float32BufferAttribute(positions,3));pathGeo.setAttribute('color',new T.Float32BufferAttribute(colors,3));pathGeo.computeVertexNormals();const path=new T.Mesh(pathGeo,new T.MeshStandardMaterial({vertexColors:true,roughness:1}));path.name='灯塔岛 / switchback keeper trail';path.receiveShadow=true;root.add(path);
}
