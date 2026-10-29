import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {islands,terrainHeight} from './WorldConfig.ts';
import type {IslandDefinition} from './WorldConfig.ts';
import {inTakeoffChannel} from './IslandDetails.ts';
export interface MooringSite{id:string;name:string;x:number;z:number;shoreX:number;shoreZ:number;dx:number;dz:number;length:number;berth:T.Vector3;heading:number}
export function findMooring(d:IslandDefinition):MooringSite{
 if(d.id==='town'&&!d.canonical){const p=findMooring({...d,canonical:true});return{...p,x:2*d.x-p.x,z:2*d.z-p.z,shoreX:2*d.x-p.shoreX,shoreZ:2*d.z-p.shoreZ,dx:-p.dx,dz:-p.dz,berth:new T.Vector3(2*d.x-p.berth.x,p.berth.y,2*d.z-p.berth.z),heading:p.heading+Math.PI};}
 const bay=d.id==='harbor'||d.id==='town'||d.id==='cove',cx=d.x,cz=d.z+(d.id==='cove'?25:bay?d.rz*.62:0);
 for(let attempt=0;attempt<64;attempt++){
  const a=bay?-2.6+attempt/64*1.9:Math.PI*.25+attempt/64*Math.PI*2,dx=Math.cos(a),dz=Math.sin(a);let r=bay?20:Math.max(d.rx,d.rz)*1.35,land=bay?0:1;
  for(let j=0;j<600;j++,r+=bay?1.5:-1.5){const h=terrainHeight(d,cx+dx*r,cz+dz*r);if((bay&&h>1.8)||(!bay&&h>1.8)){land=r;break;}}
  if(land<=1)continue;const outward=bay?-1:1,nx=dx*outward,nz=dz*outward,sx=cx+dx*land,sz=cz+dz*land;
  const h=terrainHeight(d,sx,sz);if(h>7||inTakeoffChannel(d,sx,sz,50))continue;
  let length=65;if(!bay){while(length<245){const bx=sx+nx*(length-8)+nz*24,bz=sz+nz*(length-8)-nx*24;if(Math.hypot((bx-d.x)/d.rx,(bz-d.z)/d.rz)>1.40)break;length+=15;}}const x=sx+nx*length,z=sz+nz*length,bx=x+nz*24-nx*8,bz=z-nx*24-nz*8;
  if(terrainHeight(d,x,z)>-4||terrainHeight(d,bx,bz)>-4)continue;
  if([.3,.6,1].some(t=>terrainHeight(d,bx+nx*t*110,bz+nz*t*110)>-3))continue;
  return{id:d.id,name:d.name+'栈桥',x,z,shoreX:sx,shoreZ:sz,dx:nx,dz:nz,length,berth:new T.Vector3(bx,0,bz),heading:Math.atan2(-nx,-nz)};
 }throw new Error(`未找到安全栈桥岸线: ${d.name}`);
}
export const mooringSites=islands.map(findMooring);
export class Moorings{
 readonly root=new T.Group();private lamps:T.MeshStandardMaterial;
 constructor(blockers:T.Box3[]){
  this.root.name='Six islands / flying boat mooring jetties';this.lamps=new T.MeshStandardMaterial({color:0xffdea2,emissive:0xffc16d,emissiveIntensity:0});
  const wood=new T.MeshStandardMaterial({color:0x887353,roughness:.88}),stone=new T.MeshStandardMaterial({color:0xb7ad91,roughness:.94}),iron=new T.MeshStandardMaterial({color:0x48534e,metalness:.5,roughness:.48});
  for(const site of mooringSites){
   const group=new T.Group();group.name=site.name;group.position.set(site.shoreX,0,site.shoreZ);const angle=Math.atan2(site.dx,site.dz);group.rotation.y=angle;this.root.add(group);
   const add=(g:T.BufferGeometry,m:T.Material,x:number,y:number,z:number)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;group.add(o);return o;};
   add(new T.BoxGeometry(6,.6,site.length),wood,0,3,site.length/2);add(new T.BoxGeometry(15,.6,8),wood,0,3,site.length-4);
   for(let z=2;z<site.length;z+=4){add(new T.BoxGeometry(6.2,.12,.16),wood,0,3.36,z);if(z%12===2)for(const x of[-2.6,2.6])add(new T.CylinderGeometry(.19,.24,7,7),wood,x,.7,z);}
   for(const x of[-6,6]){add(new T.CylinderGeometry(.35,.42,.8,8),iron,x,3.7,site.length-3);add(new T.CylinderGeometry(.10,.13,3.8,6),iron,x,5.1,site.length-3);add(new T.SphereGeometry(.28,8,6),this.lamps,x,7.1,site.length-3);}
   add(new T.BoxGeometry(9,2.2,9),stone,0,1.6,1);add(new T.BoxGeometry(3,1.3,.22),stone,0,4.3,site.length-5);
   // Merge the repeated planks and piles by material, preserving physical geometry and lamp emissive control.
   const batches=new Map<T.Material,T.BufferGeometry[]>();for(const child of [...group.children]){if(!(child instanceof T.Mesh))continue;child.updateMatrix();const g=child.geometry.clone().applyMatrix4(child.matrix),m=child.material as T.Material;const parts=batches.get(m)??[];parts.push(g);batches.set(m,parts);group.remove(child);child.geometry.dispose();}for(const [m,parts] of batches){const geometry=mergeGeometries(parts,false)!;parts.forEach(g=>g.dispose());const mesh=new T.Mesh(geometry,m);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);}
   group.updateMatrixWorld(true);
   const collision=(x:number,y:number,z:number,w:number,h:number,l:number)=>blockers.push(new T.Box3(new T.Vector3(x-w/2,y-h/2,z-l/2),new T.Vector3(x+w/2,y+h/2,z+l/2)).applyMatrix4(group.matrixWorld));
   for(let z=3;z<site.length;z+=6)collision(0,1,z,6,5,6.2);
   collision(0,1,site.length-4,15,5,8);collision(0,1,1,9,5,9);
   for(const x of[-6,6])collision(x,5.2,site.length-3,.8,4.5,.8);
  }
 }
 setNightness(n:number){this.lamps.emissiveIntensity=n*3;}
 nearest(p:T.Vector3){return mooringSites.reduce((best,s)=>p.distanceToSquared(s.berth)<p.distanceToSquared(best.berth)?s:best,mooringSites[0]);}
}
