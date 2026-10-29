import * as T from 'three';
import {islands,allLandforms,harborRunway} from './WorldConfig.ts';
const step=120,size=101,origin=-6000;
/** Offshore service routes exclude the secret cove, reefs and the base takeoff lane. */
export function trafficWater(x:number,z:number){
 if(Math.abs(x)>5900||Math.abs(z)>5900)return false;
 if(x>harborRunway.x-180&&x<harborRunway.x+1700&&Math.abs(z-harborRunway.z)<280)return false;
 return allLandforms.every(d=>Math.hypot((x-d.x)/(d.rx*1.6+100),(z-d.z)/(d.rz*1.6+100))>(d.id==='cove'?1.35:1));
}
function route(a:T.Vector3,b:T.Vector3){
 const key=(x:number,z:number)=>z*size+x,cell=(p:T.Vector3)=>[Math.round((p.x-origin)/step),Math.round((p.z-origin)/step)],start=cell(a),end=cell(b),from=new Int32Array(size*size).fill(-1),queue=[key(start[0],start[1])],goal=key(end[0],end[1]);from[queue[0]]=queue[0];
 for(let i=0;i<queue.length&&from[goal]<0;i++){const id=queue[i],x=id%size,z=Math.floor(id/size);for(const [dx,dz] of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const nx=x+dx,nz=z+dz,n=key(nx,nz);if(nx<0||nz<0||nx>=size||nz>=size||from[n]>=0||!trafficWater(origin+nx*step,origin+nz*step))continue;if(dx&&dz&&(!trafficWater(origin+x*step,origin+nz*step)||!trafficWater(origin+nx*step,origin+z*step)))continue;from[n]=id;queue.push(n);}}
 if(from[goal]<0)throw Error('Missing safe sea traffic route');const points:T.Vector3[]=[];let id=goal;while(true){points.push(new T.Vector3(origin+(id%size)*step,0,origin+Math.floor(id/size)*step));if(from[id]===id)break;id=from[id];}points.reverse();return new T.CatmullRomCurve3(points,false,'centripetal');
}
let cachedRoutes:{from:string;to:string;curve:T.CatmullRomCurve3}[]|undefined;
export function buildTrafficRoutes(){if(cachedRoutes)return cachedRoutes;const ports=islands.filter(d=>d.id!=='cove').map(d=>({id:d.id,point:new T.Vector3(d.x-d.rx*1.6-250,0,d.z)}));return cachedRoutes=ports.map((p,i)=>({from:p.id,to:ports[(i+1)%ports.length].id,curve:route(p.point,ports[(i+1)%ports.length].point)}));}
export class SeaTraffic{
 readonly root=new T.Group();readonly routes=buildTrafficRoutes();readonly bounds:T.Box3[]=[];private vessels:{root:T.Group;route:number;offset:number;speed:number}[]=[];private lamps=new T.MeshBasicMaterial({color:0xffd18a,toneMapped:false});
 constructor(){this.root.name='Inter-island ferries / secret cove excluded';const cream=new T.MeshStandardMaterial({color:0xd9cfaf,roughness:.65}),hull=new T.MeshStandardMaterial({color:0x27464b,roughness:.58}),wood=new T.MeshStandardMaterial({color:0x826049,roughness:.75}),red=new T.MeshBasicMaterial({color:0xc73b24}),green=new T.MeshBasicMaterial({color:0x54a66b});
  this.routes.forEach((r,index)=>{for(let direction=0;direction<4;direction++){const g=new T.Group();g.name=`${r.from} ↔ ${r.to} / ${direction>=2?'amber sailing yacht':direction?'fishing boat':'coastal ferry'}`;const add=(geo:T.BufferGeometry,m:T.Material,x:number,y:number,z:number)=>{const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;};const sailboat=direction>=2;const body=add(new T.SphereGeometry(1,16,8),hull,0,.5,0);body.scale.set(direction?2.5:3.4,1.25,direction?7:10);add(new T.BoxGeometry(direction?3:4.5,2.7,direction?4:9),cream,0,2.25,1);add(new T.BoxGeometry(4,.25,5),wood,0,3.7,1);add(new T.CylinderGeometry(.4,.5,2,8),hull,0,4.5,2);add(new T.BoxGeometry(2.8,.7,.08),this.lamps,0,2.8,-1.1);add(new T.SphereGeometry(.16,6,4),red,-2,3.8,0);add(new T.SphereGeometry(.16,6,4),green,2,3.8,0);if(sailboat){
  // Remove the tall motor-boat superstructure; retain hull, deck and navigation lamps.
  for(const child of [...g.children].slice(1,5))g.remove(child);
  add(new T.BoxGeometry(3,1.4,5),cream,0,1.3,.8);add(new T.CylinderGeometry(.12,.18,15,8),wood,0,8.4,0);
  const cloth=new T.MeshStandardMaterial({color:direction===2?0xf0a52e:0xeabc4e,roughness:.86,side:T.DoubleSide});
  for(const side of[-1,1]){const vertices:number[]=[],faces:number[]=[];for(let row=0;row<=12;row++){const t=row/12,y=2.0+t*13.2,width=(1-t)*(side>0?6.8:4.7);for(let col=0;col<=10;col++){const u=col/10;vertices.push(Math.sin(u*Math.PI)*Math.sin((1-t)*Math.PI)*.9,y,side*width*u);}}for(let row=0;row<12;row++)for(let col=0;col<10;col++){const a=row*11+col;faces.push(a,a+1,a+11,a+1,a+12,a+11);}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setIndex(faces);geo.computeVertexNormals();add(geo,cloth,0,0,0);}
 }
 g.scale.setScalar(direction===0?1.55:direction===1?1.45:1.65);this.root.add(g);this.vessels.push({root:g,route:index,offset:direction*.25+index*.073,speed:direction>=2?3.6+direction*.25:direction?4.8:7.2});this.bounds.push(new T.Box3());}});this.update(0,()=>({height:0,dx:0,dz:0}));
 }
 setNightness(n:number){this.lamps.color.setRGB(1,.62,.28).multiplyScalar(.12+n*1.6);}
 update(time:number,water:(x:number,z:number)=>{height:number;dx:number;dz:number}){this.vessels.forEach((v,i)=>{const curve=this.routes[v.route].curve,length=curve.getLength(),duration=length/v.speed,cycle=duration*2+60,phase=((time+v.offset*cycle)%cycle+cycle)%cycle;const backwards=phase>duration+30,t=phase<duration?phase/duration:phase<duration+30?1:phase<duration*2+30?1-(phase-duration-30)/duration:0;const p=curve.getPointAt(t),tangent=curve.getTangentAt(t).multiplyScalar(backwards?-1:1),lane=new T.Vector3(-tangent.z,0,tangent.x).multiplyScalar(25+(i%4>=2?24:0));let turn=0;if(phase>=duration&&phase<=duration+30)turn=(phase-duration)/30;else if(phase>=duration*2+30)turn=(phase-duration*2-30)/30;if(turn>0)lane.multiplyScalar(Math.cos(turn*Math.PI));p.add(lane);const w=water(p.x,p.z);v.root.position.set(p.x,w.height,p.z);v.root.rotation.set(Math.atan(w.dz)*.4,Math.atan2(-tangent.x,-tangent.z)+turn*Math.PI,-Math.atan(w.dx)*.4);this.bounds[i].min.set(p.x-20,w.height-2,p.z-20);this.bounds[i].max.set(p.x+20,w.height+(i%4>=2?27:10),p.z+20);});}
}
