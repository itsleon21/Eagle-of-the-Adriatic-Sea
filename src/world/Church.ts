import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {waterfrontPoint} from './IslandDetails.ts';
import {terrainHeight} from './WorldConfig.ts';
import type {IslandDefinition} from './WorldConfig.ts';
/** Original limestone parish church, built in metres and merged into two opaque draws. */
export class Church{
 readonly root=new T.Group();private windows:T.MeshStandardMaterial;private glass:T.Mesh;
 constructor(d:IslandDefinition,blockers:T.Box3[]){
  const shore=waterfrontPoint(d,-.70,108),x=shore.x,z=shore.z,y=terrainHeight(d,x,z)+.3;this.root.position.set(x,y,z);this.root.rotation.y=Math.atan2(-shore.nx,-shore.nz);this.root.name=`${d.id} / parish church`;
  const parts:T.BufferGeometry[]=[],windowParts:T.BufferGeometry[]=[];
  const add=(g:T.BufferGeometry,c:number,p:T.Vector3,r=new T.Euler(),glass=false)=>{g.applyMatrix4(new T.Matrix4().compose(p,new T.Quaternion().setFromEuler(r),new T.Vector3(1,1,1)));g.deleteAttribute('uv');const color=new T.Color(c),a=new Float32Array(g.attributes.position.count*3);for(let i=0;i<a.length;i+=3)a.set(color.toArray(),i);g.setAttribute('color',new T.BufferAttribute(a,3));const n=g.index?g.toNonIndexed():g;if(n!==g)g.dispose();(glass?windowParts:parts).push(n);};
  const box=(x:number,y:number,z:number,w:number,h:number,l:number,c:number)=>add(new T.BoxGeometry(w,h,l),c,new T.Vector3(x,y,z));
  const arch=(x:number,y:number,z:number,r:number,h:number,c:number,glass=false)=>{const s=new T.Shape();s.moveTo(-r,0);s.lineTo(r,0);s.lineTo(r,h);s.absarc(0,h,r,0,Math.PI,false);s.lineTo(-r,0);const g=new T.ExtrudeGeometry(s,{depth:glass?.12:.25,bevelEnabled:false,curveSegments:14});add(g,c,new T.Vector3(x,y,z),new T.Euler(),glass);};
  box(0,.2,0,24,.8,37,0xb7a88b);box(0,6,-1,19,12,31,d.id==='town'?0xcbb99a:0xdbcfb2);
  // The gable is a solid prism; side buttresses and cornices catch the moving sun.
  const g=new T.BufferGeometry(),v=[-10,12,-17,10,12,-17,0,19,-17,-10,12,15,10,12,15,0,19,15],indices=[0,2,1,3,4,5,0,5,2,0,3,5,1,5,4,1,2,5];g.setAttribute('position',new T.Float32BufferAttribute(indices.flatMap(i=>v.slice(i*3,i*3+3)),3));g.computeVertexNormals();add(g,0xa85836,new T.Vector3());
  for(const side of[-1,1]){
   box(side*9.65,11.7,-1,.7,.65,33,0xe4d8ba);
   for(const z of[-11,-3,5,12]){box(side*9.9,4.4,z,1.1,8.8,1.6,0xc7baa0);box(side*10,8.8,z,1.4,.38,1.9,0xe4d7ba);}
   for(let tile=0;tile<28;tile++){
    const cyl=new T.CylinderGeometry(.22,.22,12.1,6);cyl.rotateZ(Math.PI/2);cyl.rotateZ(-side*.61);add(cyl,tile%3?0xa95e3b:0xb8734d,new T.Vector3(side*5,15.7,-16+tile*1.16));
   }
  }
  // West-front rose window, radiating stone tracery, arched door and entrance steps.
  arch(0,1,14.59,2.1,3.5,0x544231);arch(0,1.2,14.91,1.7,3.1,0x6d4c32);
  box(0,2.7,15.18,.10,3,.12,0xc2a472);
  for(let i=0;i<4;i++)box(0,.15+i*.2,16.7-i*.45,8-i*.4,.3+i*.1,2.1,0xcabd9e);
  add(new T.CircleGeometry(2.05,28),0x558584,new T.Vector3(0,10.1,14.7),new T.Euler(),true);
  add(new T.TorusGeometry(2.23,.24,6,28),0xe6d8b6,new T.Vector3(0,10.1,14.86));
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const bar=new T.BoxGeometry(.12,4.2,.16);add(bar,0xd6c9ab,new T.Vector3(0,10.1,14.95),new T.Euler(0,0,a));}
  for(const side of[-1,1])for(const zz of[-10,-2,6]){
   const pane=new T.PlaneGeometry(1.7,3.3);add(pane,0x4f747b,new T.Vector3(side*9.52,7.6,zz),new T.Euler(0,side*Math.PI/2,0),true);
   box(side*9.65,5.8,zz,.5,.4,2.2,0xe2d4b6);
  }
  // Separate campanile: open belfry, bell, clock, balcony rail and copper cross.
  const tx=d.id==='town'?-15:15;
  box(tx,17,-8,8,34,8,0xd9cdb0);box(tx,3,-8,8.7,6,8.7,0xb9ac91);box(tx,34.4,-8,10,.9,10,0xe4d7b8);
  for(const dx of[-3.5,3.5])for(const dz of[-3.5,3.5])box(tx+dx,38,-8+dz,.8,6.5,.8,0xd9cdb0);
  add(new T.CylinderGeometry(.9,1.8,2.6,16),0x9b8154,new T.Vector3(tx,37,-8));
  add(new T.ConeGeometry(7,8,4),0xa75e39,new T.Vector3(tx,44,-8),new T.Euler(0,Math.PI/4,0));
  box(tx,49,-8,.2,3.5,.2,0xa48c51);box(tx,49.5,-8,1.8,.2,.2,0xa48c51);
  add(new T.CircleGeometry(2.05,32),0xe7dcc0,new T.Vector3(tx,28,-3.96));
  add(new T.TorusGeometry(2.1,.12,6,32),0x75674f,new T.Vector3(tx,28,-3.91));
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;add(new T.BoxGeometry(.10,.32,.07),0x514f42,new T.Vector3(tx+Math.sin(a)*1.72,28+Math.cos(a)*1.72,-3.82),new T.Euler(0,0,-a));}
  box(tx,28.65,-3.77,.1,1.4,.08,0x484c42);add(new T.BoxGeometry(.1,1.05,.08),0x484c42,new T.Vector3(tx+.3,28.25,-3.76),new T.Euler(0,0,-.8));
  const merge=(array:T.BufferGeometry[])=>{const g=mergeGeometries(array,false)!;array.forEach(g=>g.dispose());return g;};
  const building=new T.Mesh(merge(parts),new T.MeshStandardMaterial({vertexColors:true,roughness:.87}));building.castShadow=building.receiveShadow=true;building.name='Church / stone nave, tiled roof, rose window and open bell tower';this.root.add(building);
  this.windows=new T.MeshStandardMaterial({vertexColors:true,roughness:.32,emissive:0xffb65d,emissiveIntensity:0});this.glass=new T.Mesh(merge(windowParts),this.windows);this.root.add(this.glass);
  const ex=34,ez=34;blockers.push(new T.Box3(new T.Vector3(x-ex,y-1,z-ez),new T.Vector3(x+ex,y+51,z+ez)));
 }
 setNightness(n:number){this.windows.emissiveIntensity=n*1.7;}
}
