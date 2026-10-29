import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {IslandDefinition} from './WorldConfig.ts';
import {random} from './WorldConfig.ts';
import {waterfrontPoint} from './IslandDetails.ts';
import type {SettlementLayout} from './SettlementLayout.ts';

/** Permanent facade furniture remains inside the plot's collision footprint. One merged batch per island. */
export function buildHarborDetail(d:IslandDefinition,layout:SettlementLayout){
 const parts:T.BufferGeometry[]=[],rng=random(d.seed+908),matrix=new T.Matrix4(),q=new T.Quaternion(),scale=new T.Vector3(),point=new T.Vector3();
 const add=(geo:T.BufferGeometry,color:number,x:number,y:number,z:number,angle:number,sx=1,sy=1,sz=1)=>{
  const count=geo.attributes.position.count,c=new T.Color(color),colors=new Float32Array(count*3);for(let i=0;i<count;i++)colors.set([c.r,c.g,c.b],i*3);
  geo.setAttribute('color',new T.BufferAttribute(colors,3));geo.deleteAttribute('uv');q.setFromAxisAngle(new T.Vector3(0,1,0),angle);matrix.compose(point.set(x,y,z),q,scale.set(sx,sy,sz));geo.applyMatrix4(matrix);const part=geo.index?geo.toNonIndexed():geo;if(part!==geo)geo.dispose();parts.push(part);
 };
 let decorated=0;
 for(const p of layout.houses){
  if(p.district!=='waterfront'&&rng()>.23)continue;decorated++;
  const c=Math.cos(p.angle),s=Math.sin(p.angle),local=(x:number,y:number,z:number)=>[p.x+x*c+z*s,p.ground+y,p.z-x*s+z*c] as const;
  const box=(x:number,y:number,z:number,w:number,h:number,depth:number,color:number)=>add(new T.BoxGeometry(w,h,depth),color,...local(x,y,z),p.angle);
  // Small balcony boxes, glazed storefront boards and striped canvas carry detail where a low pass sees it.
  const front=p.depth*.53,canopyColor=[0x8b9d89,0xc3a368,0xb7684c][decorated%3];
  if(p.kind!=='HouseFisher'){
   for(let stripe=0;stripe<8;stripe++){
    box(-2.1+stripe*.6,3.15,front+.65,.61,.16,1.6,stripe%2?0xd9cfad:canopyColor);
    box(-2.1+stripe*.6,2.93,front+1.4,.61,.45,.10,stripe%2?0xd9cfad:canopyColor);
   }
   box(p.width*.29,2.35,front+.2,1.6,.95,.22,0x5c7168);box(p.width*.29,2.35,front+.34,1.25,.08,.03,0xd7c292);
  }
  // Terracotta pots include a dark soil mouth, rolled rim and branched leaf clusters.
  for(const side of[-1,1]){
   const x=side*p.width*.36,z=front+.65;
   add(new T.CylinderGeometry(.48,.33,.78,8),0xb57550,...local(x,.39,z),p.angle);
   add(new T.TorusGeometry(.44,.07,4,10).rotateX(Math.PI/2),0xc28c62,...local(x,.79,z),p.angle);
   add(new T.CylinderGeometry(.40,.40,.05,8),0x4a4630,...local(x,.77,z),p.angle);
   for(let l=0;l<3;l++)add(new T.IcosahedronGeometry(1,0),l===0?0x6f8253:0x7f8d5a,...local(x+(l-1)*.28,1.05+l*.14,z),p.angle,.34,.47,.34);
  }
  if(decorated%3===0){
   // Folded timber cafe chairs and round tables sit behind the pavement, within the plot setback.
   const z=front+.85,x=-p.width*.28;
   add(new T.CylinderGeometry(.78,.78,.12,10),0x9e8056,...local(x,.92,z),p.angle);
   box(x,.43,z,.15,.86,.15,0x585745);
   for(const side of[-1,1]){box(x+side*1.15,.52,z,.6,.12,.65,0x90724f);box(x+side*1.38,.9,z,.12,.76,.65,0x90724f);}
  }
  // Second-storey flower boxes are attached to the facade; no coplanar decal or alpha-test shimmer.
  if(p.height>10)for(const side of[-1,1]){
   box(side*p.width*.24,p.height*.67,front,.98,.33,.52,0x9c6746);
   for(let k=0;k<3;k++)add(new T.IcosahedronGeometry(.23,0),k===1?0xad6863:0x64794b,...local(side*p.width*.24+(k-1)*.28,p.height*.67+.28,front),p.angle);
  }
 }
 // Coiled mooring lines and slatted fish crates belong to the existing timber jetties.
 for(const angle of[-2.73,-2.18,-1.62,-1.04,-.49]){
  const p=waterfrontPoint(d,angle,-20);if(p.y>25)continue;const yaw=Math.atan2(-p.nx,-p.nz),x=p.x+p.nz*2,z=p.z-p.nx*2;
  for(let turn=0;turn<3;turn++)add(new T.TorusGeometry(.34+turn*.12,.045,4,12).rotateX(Math.PI/2),0xb69d70,x,3.22,z,yaw);
  for(let level=0;level<3;level++)add(new T.BoxGeometry(1.35,.18,.12),0x95784d,x-p.nx*3,3.36+level*.22,z-p.nz*3,yaw);
  add(new T.BoxGeometry(1.35,.12,.9),0x786447,x-p.nx*3,3.21,z-p.nz*3,yaw);
 }
 const geometry=mergeGeometries(parts,false)??new T.BufferGeometry();for(const part of parts)part.dispose();
 const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:.9}));mesh.name=`${d.id} / waterfront cafe and facade details`;mesh.castShadow=mesh.receiveShadow=true;mesh.userData.decoratedHouses=decorated;
 return mesh;
}
