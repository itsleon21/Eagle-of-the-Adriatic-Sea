import * as T from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {coveCave,coveLandHeight,coveRoofBottom,random} from './WorldConfig.ts';
import type {IslandDefinition} from './WorldConfig.ts';
const archShift=(z:number)=>Math.sin(z*.057)*7+Math.cos(z*.023)*12;
const archFront=(z:number)=>coveCave.minX+archShift(z)+9*Math.sin(z*.119);
const archBack=(z:number)=>coveCave.maxX+archShift(z)+12*Math.cos(z*.083);
/** A closed rock volume spanning the cut in the height field, including its underside. */
export function coveRoofTop(d:IslandDefinition,x:number,z:number){return Math.max(coveRoofBottom(z,x)+14,83+9*Math.sin(x*.047)+8*Math.cos(z*.063)+4*Math.sin((x+z)*.15),coveLandHeight(d,d.x+x,d.z+z)+2);}
export function insideCoveArch(d:IslandDefinition,x:number,y:number,z:number,padding=0){
 const lx=x-d.x,lz=z-d.z;
 return lx>=archFront(lz)-padding&&lx<=archBack(lz)+padding&&Math.abs(lz-coveCave.z)<=coveCave.halfWidth+padding&&y>=coveRoofBottom(lz,lx)-padding&&y<=coveRoofTop(d,lx,lz)+padding;
}
export function buildCoveArch(d:IslandDefinition){
 const positions:number[]=[],rng=random(191);
 const point=(x:number,z:number,top:boolean)=>{
  const u=(x-coveCave.minX)/(coveCave.maxX-coveCave.minX),xx=archFront(z)*(1-u)+archBack(z)*u;
  return new T.Vector3(d.x+xx,top?coveRoofTop(d,xx,z):coveRoofBottom(z,xx),d.z+z);
 };
 const tri=(a:T.Vector3,b:T.Vector3,c:T.Vector3,_shade:number)=>{for(const p of[a,b,c])positions.push(p.x,p.y,p.z);};
 const quad=(a:T.Vector3,b:T.Vector3,c:T.Vector3,e:T.Vector3,shade:number)=>{tri(a,b,e,shade);tri(b,c,e,shade);};
 const nx=20,nz=52;
 for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){
  const x=coveCave.minX+(coveCave.maxX-coveCave.minX)*i/nx,xx=coveCave.minX+(coveCave.maxX-coveCave.minX)*(i+1)/nx;
  const z=coveCave.z-coveCave.halfWidth+2*coveCave.halfWidth*j/nz,zz=coveCave.z-coveCave.halfWidth+2*coveCave.halfWidth*(j+1)/nz;
  const a=point(x,z,true),b=point(x,zz,true),c=point(xx,zz,true),e=point(xx,z,true);
  quad(a,b,c,e,1.2);
  quad(point(x,z,false),point(xx,z,false),point(xx,zz,false),point(x,zz,false),.78+rng()*.10);
  if(i===0)quad(point(x,z,false),point(x,zz,false),b,a,.88+rng()*.12);
  if(i===nx-1)quad(point(xx,zz,false),point(xx,z,false),e,c,.88+rng()*.12);
  if(j===0)quad(point(xx,z,false),point(x,z,false),a,e,.92);
  if(j===nz-1)quad(point(x,zz,false),point(xx,zz,false),c,b,.92);
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));const smoothGeometry=mergeVertices(geometry);geometry.dispose();smoothGeometry.computeVertexNormals();
 const material=new T.MeshStandardMaterial({color:0xffffff,roughness:1});material.userData.terrainBiome='limestone';
 const mesh=new T.Mesh(smoothGeometry,material);mesh.name='隐秘海湾 / traversable limestone arch';mesh.castShadow=mesh.receiveShadow=true;
 return mesh;
}

/** Solid buttresses and offshore stacks break the silhouette; these are volumes, not coplanar films. */
export function addCoveLandmarks(root:T.Group,d:IslandDefinition,blockers:T.Box3[]){
 const rng=random(830),geo=new T.CylinderGeometry(.12,1,1,5,3),p=geo.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=1+.14*Math.sin(y*14+x*7+z*9);p.setXYZ(i,x*r,y,z*r);}geo.computeVertexNormals();
 const items:{x:number;y:number;z:number;sx:number;sy:number;sz:number}[]=[];
 for(let i=0;i<46;i++){
  const a=i/46*Math.PI*2,r=1.07+rng()*.16,x=d.x+Math.cos(a)*d.rx*r,z=d.z+Math.sin(a)*d.rz*r;
  if(x>d.x+130&&Math.abs(z-d.z-coveCave.z)<90)continue;
  const sy=9+rng()*25;items.push({x,y:sy*.37-3,z,sx:4+rng()*10,sy,sz:4+rng()*9});
 }
 const mesh=new T.InstancedMesh(geo,new T.MeshStandardMaterial({color:0xffffff,roughness:.98,flatShading:true}),items.length),dummy=new T.Object3D(),color=new T.Color();
 items.forEach((v,i)=>{dummy.position.set(v.x,v.y,v.z);dummy.scale.set(v.sx,v.sy,v.sz);dummy.rotation.set((rng()-.5)*.17,rng()*6.28,(rng()-.5)*.17);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);color.setHex(i%3===0?0xc9bfa6:0xb4ae99);mesh.setColorAt(i,color);blockers.push(new T.Box3(new T.Vector3(v.x-v.sx,v.y-v.sy/2,v.z-v.sz),new T.Vector3(v.x+v.sx,v.y+v.sy/2,v.z+v.sz)));});
 mesh.name='隐秘海湾 / offshore stacks';mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);
 // Faceted boulders form the weathered arch voussoirs and break its machined outline.
 const archRocks=new T.InstancedMesh(new T.DodecahedronGeometry(1,0),new T.MeshStandardMaterial({color:0xc7bca3,roughness:1,flatShading:true}),44);
 let index=0;
 for(const face of[coveCave.minX,coveCave.maxX])for(let j=0;j<22;j++){
  const z=coveCave.z-coveCave.halfWidth+2*coveCave.halfWidth*(j+.12+rng()*.76)/22,x=face===coveCave.minX?archFront(z):archBack(z),bottom=coveRoofBottom(z,x),top=coveRoofTop(d,x,z);
  const sy=Math.max(4,(top-bottom)*.45),sx=5+rng()*11,sz=3+rng()*9;
  dummy.position.set(d.x+x,(bottom+top)/2,d.z+z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(0,rng()*6.28,0);dummy.updateMatrix();archRocks.setMatrixAt(index++,dummy.matrix);
 }
 archRocks.castShadow=archRocks.receiveShadow=true;archRocks.name='隐秘海湾 / weathered arch rim stones';root.add(archRocks);
 const roofTrees=new T.InstancedMesh(new T.ConeGeometry(1,1,7),new T.MeshStandardMaterial({color:0x405e36,roughness:1,flatShading:true}),16);
 for(let i=0;i<16;i++){const x=240+rng()*98,z=coveCave.z-37+rng()*74,h=coveRoofTop(d,x,z),height=8+rng()*8;dummy.position.set(d.x+x,h+height*.5,d.z+z);dummy.scale.set(3+rng()*2,height,3+rng()*2);dummy.rotation.set(0,rng()*6.28,0);dummy.updateMatrix();roofTrees.setMatrixAt(i,dummy.matrix);}
 roofTrees.castShadow=roofTrees.receiveShadow=true;root.add(roofTrees);
 // Small isolated lookout cottages, leaving the lagoon and beach unbuilt.
 for(const [lx,lz] of[[-150,-170],[20,-208],[-250,-90]]){
  const x=d.x+lx,z=d.z+lz,y=coveLandHeight(d,x,z),house=new T.Mesh(new T.BoxGeometry(11,10,9),new T.MeshStandardMaterial({color:0xf0dfbb,roughness:.95}));house.position.set(x,y+5,z);house.castShadow=house.receiveShadow=true;root.add(house);
  const roof=new T.Mesh(new T.ConeGeometry(9,5,4),new T.MeshStandardMaterial({color:0xa94e31,roughness:.9}));roof.position.set(x,y+12,z);roof.rotation.y=Math.PI/4;roof.castShadow=true;root.add(roof);blockers.push(new T.Box3(new T.Vector3(x-6,y,z-6),new T.Vector3(x+6,y+15,z+6)));
 }
}
