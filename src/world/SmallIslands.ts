import * as T from 'three';import {random} from './WorldConfig.ts';
/** Deterministic eroded silhouettes: offset peaks, broken headlands and a submerged skirt. */
export function distantIslandGeometry(seed:number){const rng=random(seed),phase=rng()*6.28,leanX=rng()*.7-.35,leanZ=rng()*.6-.3,positions:number[]=[],indices:number[]=[];const radial=40,rings=11;
 for(let ring=0;ring<=rings;ring++)for(let j=0;j<=radial;j++){const a=j/radial*Math.PI*2,r=ring/rings,coast=1+.18*Math.sin(a*3+phase)+.10*Math.cos(a*5-phase)+.045*Math.sin(a*11+phase*2),x=Math.cos(a)*r*coast,z=Math.sin(a)*r*coast;const peaks=Math.exp(-((x-leanX)**2/.20+(z-leanZ)**2/.40))+.6*Math.exp(-((x+.42)**2/.11+(z-.18)**2/.18));const y=ring===rings?-.22:(.15+peaks*.85)*(1-r*r)+.035*Math.sin(x*19+phase)*Math.cos(z*16);positions.push(x,y,z);}
 for(let r=0;r<rings;r++)for(let j=0;j<radial;j++){const a=r*(radial+1)+j,b=a+radial+1;indices.push(a,b,a+1,b,b+1,a+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}

import type {IslandDefinition} from './WorldConfig.ts';import {terrainHeight} from './WorldConfig.ts';
export function addReefRocks(root:T.Group,d:IslandDefinition,blockers:T.Box3[]){
 const rng=random(d.seed+91),geo=new T.DodecahedronGeometry(1,0),mesh=new T.InstancedMesh(geo,new T.MeshStandardMaterial({color:0xffffff,roughness:1,flatShading:true}),38),dummy=new T.Object3D();mesh.name=`${d.name} / fractured reef rock clusters`;mesh.castShadow=mesh.receiveShadow=true;
 for(let i=0;i<38;i++){const a=rng()*Math.PI*2,r=Math.sqrt(rng())*.96,x=d.x+Math.cos(a)*d.rx*r,z=d.z+Math.sin(a)*d.rz*r,h=terrainHeight(d,x,z),sx=4+rng()*8,sz=4+rng()*7,sy=5+rng()*12;dummy.position.set(x,h+sy*.29,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set((rng()-.5)*.45,rng()*Math.PI*2,(rng()-.5)*.3);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new T.Color().setHSL(.115,.08+rng()*.07,.45+rng()*.15));blockers.push(new T.Box3(new T.Vector3(x-sx,h-sy*.3,z-sz),new T.Vector3(x+sx,h+sy*1.3,z+sz)));}
 mesh.computeBoundingSphere();root.add(mesh);
}
