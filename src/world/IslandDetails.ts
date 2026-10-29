import * as T from 'three';
import { islands, terrainHeight, random } from './WorldConfig.ts';
import type { IslandDefinition } from './WorldConfig.ts';
import {appendSurfacePolygon} from './TerrainSurface.ts';

export interface ShorePoint { x:number; z:number; y:number; nx:number; nz:number }
/** The quay and village follow the actual inner shoreline, rather than an unrelated grid. */
export function waterfrontPoint(d:IslandDefinition, angle:number, inland=0):ShorePoint {
 if(d.id==='town'&&!d.canonical){const p=waterfrontPoint({...d,canonical:true},angle,inland);return{x:2*d.x-p.x,z:2*d.z-p.z,y:terrainHeight(d,2*d.x-p.x,2*d.z-p.z),nx:-p.nx,nz:-p.nz};}
 const nx=Math.cos(angle),nz=Math.sin(angle),cx=d.x,cz=d.z+d.rz*.62;
 let radius=10;
 for(;radius<d.rx*1.8;radius+=2){if(terrainHeight(d,cx+nx*radius,cz+nz*radius)>3.5)break;}
 radius+=inland;
 const x=cx+nx*radius,z=cz+nz*radius;
 return{x,z,y:terrainHeight(d,x,z),nx,nz};
}
export function inTakeoffChannel(d:IslandDefinition,x:number,z:number,padding=0) {
 return d.id==='harbor'&&Math.abs(z-d.z-510)<95+padding&&x>d.x-100-padding;
}

interface Instance { p:T.Vector3; s:T.Vector3; r:T.Euler; color?:T.Color }
/** A few instanced batches contain the detail that would otherwise become thousands of draw calls. */
class DetailBuilder {
 readonly blocks:Instance[]=[];readonly wood:Instance[]=[];readonly posts:Instance[]=[];readonly shrubs:Instance[]=[];readonly canopies:Instance[]=[];readonly treeWood:Instance[]=[];
 readonly triangles:number[]=[];readonly colors:number[]=[];
 root:T.Group;blockers:T.Box3[];
 constructor(root:T.Group,blockers:T.Box3[]){this.root=root;this.blockers=blockers;}
 block(x:number,y:number,z:number,w:number,h:number,depth:number,angle=0,color=0xc1b397,collision=false){
  this.blocks.push({p:new T.Vector3(x,y,z),s:new T.Vector3(w,h,depth),r:new T.Euler(0,angle,0),color:new T.Color(color)});
  if(collision){const ex=(Math.abs(Math.cos(angle))*w+Math.abs(Math.sin(angle))*depth)/2,ez=(Math.abs(Math.sin(angle))*w+Math.abs(Math.cos(angle))*depth)/2;this.blockers.push(new T.Box3(new T.Vector3(x-ex,y-h/2,z-ez),new T.Vector3(x+ex,y+h/2,z+ez)));}
 }
 beam(x:number,y:number,z:number,w:number,h:number,depth:number,angle=0){this.wood.push({p:new T.Vector3(x,y,z),s:new T.Vector3(w,h,depth),r:new T.Euler(0,angle,0)});}
 post(x:number,y:number,z:number,radius=.4,height=1.4){this.posts.push({p:new T.Vector3(x,y,z),s:new T.Vector3(radius,height,radius),r:new T.Euler()});}
 tri(a:T.Vector3,b:T.Vector3,c:T.Vector3,color:T.Color){for(const p of[a,b,c]){this.triangles.push(p.x,p.y,p.z);this.colors.push(color.r,color.g,color.b);}}
 ribbon(d:IslandDefinition,points:T.Vector2[],width:number,color=0xc4b58c){
  const tint=new T.Color(color);
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],v=new T.Vector2().subVectors(b,a).normalize(),normal=new T.Vector2(-v.y,v.x).multiplyScalar(width/2);
   const polygon=[a.clone().add(normal),b.clone().add(normal),b.clone().sub(normal),a.clone().sub(normal)].map(p=>({x:p.x,z:p.y}));
   appendSurfacePolygon(d,polygon,.12,this.triangles,this.colors,[tint.r,tint.g,tint.b]);
  }
 }

 finish(){
  const batch=(name:string,geo:T.BufferGeometry,material:T.MeshStandardMaterial,instances:Instance[],shadow=false)=>{
   if(!instances.length){geo.dispose();material.dispose();return;}
   const mesh=new T.InstancedMesh(geo,material,instances.length),dummy=new T.Object3D();mesh.name=name;
   instances.forEach((instance,i)=>{dummy.position.copy(instance.p);dummy.scale.copy(instance.s);dummy.rotation.copy(instance.r);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);if(instance.color)mesh.setColorAt(i,instance.color);});
   mesh.castShadow=shadow;mesh.receiveShadow=true;mesh.computeBoundingSphere();this.root.add(mesh);
  };
  batch('Limestone quay blocks and retaining walls',new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial({color:0xffffff,roughness:.93}),this.blocks,true);
  batch('Harbor timber decking and promenade furniture',new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial({color:0x76634a,roughness:.92}),this.wood,true);
  batch('Cast iron mooring bollards',new T.CylinderGeometry(1,1,1,7),new T.MeshStandardMaterial({color:0x394b4c,roughness:.58,metalness:.35}),this.posts,true);
  batch('Mediterranean scrub',new T.IcosahedronGeometry(1,0),new T.MeshStandardMaterial({color:0x657846,roughness:1,flatShading:true}),this.shrubs);
  const crown=new T.IcosahedronGeometry(1,1),pos=crown.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),r=1+Math.sin(x*4.3+z*2.1)*.10+Math.cos(y*5.1-z*3.2)*.07;pos.setXYZ(i,x*r,y*r,z*r);}crown.computeVertexNormals();
  batch('Broad lobed umbrella pine and olive canopies',crown,new T.MeshStandardMaterial({color:0xffffff,roughness:.98,flatShading:false}),this.canopies,true);
  batch('Crooked umbrella pine trunks and boughs',new T.CylinderGeometry(.7,1,1,6),new T.MeshStandardMaterial({color:0x74624d,roughness:.96}),this.treeWood,true);
  if(this.triangles.length){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(this.triangles,3));geo.setAttribute('color',new T.Float32BufferAttribute(this.colors,3));geo.computeVertexNormals();const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:.94,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));mesh.name='Terrain-conforming hillside footpaths';mesh.castShadow=mesh.receiveShadow=true;this.root.add(mesh);}
 }
}

function harborDetails(d:IslandDefinition,b:DetailBuilder) {
 const rng=random(d.seed+314),count=72;
 for(let i=0;i<=count;i++){
  const a=-Math.PI+.10+i/count*(Math.PI-.20),p=waterfrontPoint(d,a,3);
  if(p.y<0||p.y>35||inTakeoffChannel(d,p.x,p.z,20))continue;
  if(i%2===0){
   const next=waterfrontPoint(d,a+.042,3),length=Math.hypot(next.x-p.x,next.z-p.z)+.4,angle=Math.atan2(next.x-p.x,next.z-p.z);
   const wallTop=Math.min(12,Math.max(4.4,p.y+.55));
   b.block((p.x+next.x)/2,wallTop/2-1,(p.z+next.z)/2,5.5,wallTop+2,length,angle,0xbcb198,true);
   b.block((p.x+next.x)/2,wallTop+.05,(p.z+next.z)/2,6.2,.42,length+.4,angle,0xd0c4aa);
   if(i%6===0)b.post(p.x-p.nx*3,wallTop+.8,p.z-p.nz*3,.45,1.5);
  }
 }

 // Timber jetties project into the northern half of the bay, leaving a broad open mouth.
 for(const a of[-2.73,-2.18,-1.62,-1.04,-.49]){
  const p=waterfrontPoint(d,a,-3),length=50+rng()*24,angle=Math.atan2(-p.nx,-p.nz),cx=p.x-p.nx*length/2,cz=p.z-p.nz*length/2;
  if(inTakeoffChannel(d,cx,cz,24)||p.y>28)continue;
  b.beam(cx,2.3,cz,7,1.4,length,angle);b.block(cx,.2,cz,3,4,length,angle,0x8f8c78,true);
  for(let j=0;j<length;j+=4){const x=p.x-p.nx*j,z=p.z-p.nz*j;b.beam(x,3.05,z,7.4,.18,.22,angle);if(j%12===0)for(const side of[-1,1]){b.post(x+side*p.nz*3.4,1.5,z-side*p.nx*3.4,.35,4.6);b.post(x+side*p.nz*2.6,3.5,z-side*p.nx*2.6,.26,.75);}}
  for(const side of[-1,1]){const x=p.x-p.nx*(length-14)+p.nz*side*10,z=p.z-p.nz*(length-14)-p.nx*side*10;b.beam(x,2.3,z,18,1.2,5,angle);}
 }
 // Two masonry arms shelter the basin while leaving the eastbound water runway open.
 const arms=[[[ -.45,.52],[-.50,.73],[-.40,.83],[-.22,.84]],[[.45,.52],[.46,.65],[.42,.75]]];
 for(const arm of arms){
  for(let i=1;i<arm.length;i++){
   const a=new T.Vector2(d.x+arm[i-1][0]*d.rx,d.z+arm[i-1][1]*d.rz),end=new T.Vector2(d.x+arm[i][0]*d.rx,d.z+arm[i][1]*d.rz),length=a.distanceTo(end),segments=Math.ceil(length/12),angle=Math.atan2(end.x-a.x,end.y-a.y);
   for(let j=0;j<segments;j++){
    const t=(j+.5)/segments,x=T.MathUtils.lerp(a.x,end.x,t),z=T.MathUtils.lerp(a.y,end.y,t);if(inTakeoffChannel(d,x,z,18))continue;
    const ground=terrainHeight(d,x,z),top=Math.max(4.6,ground+.5);if(ground>15)continue;
    b.block(x,(top-3)/2,z,10,top+3,length/segments+.2,angle,j%3===0?0xb6ad96:0xaaa28d,true);
    b.block(x,top+.2,z,10.4,.55,length/segments+.1,angle,0xd0c5ac);
    if(j%2===0)for(const side of[-1,1])b.block(x+Math.cos(angle)*side*4.5,top+.8,z-Math.sin(angle)*side*4.5,.55,1.2,length/segments+.4,angle,0xc3b89e);
   }
  }
  const end=arm[arm.length-1],x=d.x+end[0]*d.rx,z=d.z+end[1]*d.rz,h=Math.max(4.6,terrainHeight(d,x,z)+.5);if(!inTakeoffChannel(d,x,z,20)){b.block(x,h+2.0,z,2.8,4.0,2.8,0,0xe4dcc6,true);b.post(x,h+4.6,z,.85,1.2);}
 }
 for(let i=0;i<12;i++){
  const a=-Math.PI+.28+i/11*(Math.PI-.56),p=waterfrontPoint(d,a,17);if(p.y<1||p.y>28)continue;
  // Seats and simple terracotta planter groupings sit on dry ground behind the quay.
  const angle=Math.atan2(p.nx,p.nz);b.beam(p.x,p.y+.9,p.z,4.4,.25,1.1,angle);b.beam(p.x+p.nx*.4,p.y+1.5,p.z+p.nz*.4,4.4,.9,.18,angle);
  for(const side of[-1,1])b.post(p.x+p.nz*side*1.6,p.y+.45,p.z-p.nx*side*1.6,.11,.85);
 }
}

function hillsideDetails(d:IslandDefinition,b:DetailBuilder,occupied?:(x:number,z:number,padding?:number)=>boolean) {
 const rng=random(d.seed+53),count=d.id==='lighthouse'?90:200;
 for(let i=0;i<count;i++){
  const x=d.x+(rng()-.5)*d.rx*1.8,z=d.z+(rng()-.5)*d.rz*1.8,h=terrainHeight(d,x,z);
  if(h<12||inTakeoffChannel(d,x,z,20)||occupied?.(x,z,5))continue;
  const slope=Math.hypot(terrainHeight(d,x+3,z)-terrainHeight(d,x-3,z),terrainHeight(d,x,z+3)-terrainHeight(d,x,z-3))/6;
  if(slope>1.5)continue;
  const size=1.4+rng()*2.6;b.shrubs.push({p:new T.Vector3(x,h+size*.3,z),s:new T.Vector3(size,size*.65,size*.8),r:new T.Euler(rng()*.3,rng()*6.28,rng()*.3)});
 }
 // Umbrella pines carry broad, overlapping canopy lobes above visible branching trunks.
 const trees=d.id==='lighthouse'?14:d.id==='harbor'?62:48;
 for(let i=0,attempt=0;i<trees&&attempt<trees*10;attempt++){
  const x=d.x+(rng()-.5)*d.rx*1.65,z=d.z+(rng()-.5)*d.rz*1.65,h=terrainHeight(d,x,z),slope=Math.hypot(terrainHeight(d,x+3,z)-terrainHeight(d,x-3,z),terrainHeight(d,x,z+3)-terrainHeight(d,x,z-3))/6;
  if(h<15||h>d.height*.93||slope>.85||inTakeoffChannel(d,x,z,35)||occupied?.(x,z,13))continue;
  if((d.id==='harbor'||d.id==='town')&&(z-d.z)*(d.id==='town'?-1:1)>-45&&Math.abs(x-d.x)<d.rx*.72)continue;
  i++;const height=10+rng()*10,radius=6+rng()*6,olive=rng()<.28,canopyY=h+height*(olive?.67:.89),tint=new T.Color().setHSL(olive?.235:.255,.16+rng()*.14,olive?.24:.17+rng()*.055);
  b.treeWood.push({p:new T.Vector3(x,h+height*.41,z),s:new T.Vector3(.43+rng()*.3,height*.82,.43+rng()*.3),r:new T.Euler((rng()-.5)*.10,rng()*6.28,(rng()-.5)*.10)});
  for(let lobe=0;lobe<5;lobe++){
   const a=lobe/5*Math.PI*2+rng()*.4,reach=lobe===0?0:radius*.47,cx=x+Math.cos(a)*reach,cz=z+Math.sin(a)*reach;
   b.canopies.push({p:new T.Vector3(cx,canopyY+(rng()-.5)*height*.12,cz),s:new T.Vector3(radius*(.50+rng()*.16),height*(olive?.18:.115)*(1+rng()*.3),radius*(.46+rng()*.18)),r:new T.Euler((rng()-.5)*.13,rng()*6.28,(rng()-.5)*.13),color:tint.clone().multiplyScalar(.9+rng()*.20)});
   if(lobe>0){const from=new T.Vector3(x,h+height*.54,z),to=new T.Vector3(cx,canopyY-.5,cz),delta=to.clone().sub(from),rotation=new T.Euler().setFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize()));b.treeWood.push({p:from.add(to).multiplyScalar(.5),s:new T.Vector3(.24,delta.length(),.24),r:rotation});}
  }
 }

}

export function addIslandDetails(root:T.Group,blockers:T.Box3[],occupied?:(x:number,z:number,padding?:number)=>boolean) {
 const b=new DetailBuilder(root,blockers);
 for(const d of islands){if(d.id==='coral')continue;hillsideDetails(d,b,occupied);if(d.id==='harbor'||d.id==='town')harborDetails(d,b);}
 b.finish();
}
