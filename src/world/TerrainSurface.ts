import {terrainHeight,terrainSegments} from './WorldConfig.ts';
import type {IslandDefinition} from './WorldConfig.ts';
export interface GroundPoint {x:number;z:number}
export interface SurfaceVertex extends GroundPoint {y:number}
/** Same float vertex coordinates and diagonal as PlaneGeometry in World.terrain(). */
export function terrainVertex(d:IslandDefinition,ix:number,iz:number):SurfaceVertex{
 const n=terrainSegments(d),x=d.x+Math.fround(-d.rx*1.125+ix*d.rx*2.25/n),z=d.z+Math.fround(-d.rz*1.125+iz*d.rz*2.25/n);
 return{x,z,y:Math.fround(terrainHeight(d,x,z))};
}
export function terrainSurfaceHeight(d:IslandDefinition,x:number,z:number){
 const n=terrainSegments(d),gx=(x-d.x+d.rx*1.125)/(d.rx*2.25)*n,gz=(z-d.z+d.rz*1.125)/(d.rz*2.25)*n;
 if(gx<0||gz<0||gx>n||gz>n)return -30;
 const ix=Math.min(n-1,Math.floor(gx)),iz=Math.min(n-1,Math.floor(gz)),a=terrainVertex(d,ix,iz),b=terrainVertex(d,ix,iz+1),c=terrainVertex(d,ix+1,iz+1),e=terrainVertex(d,ix+1,iz),u=(x-a.x)/(e.x-a.x),v=(z-a.z)/(b.z-a.z);
 return u+v<=1?a.y+(e.y-a.y)*u+(b.y-a.y)*v:c.y+(b.y-c.y)*(1-u)+(e.y-c.y)*(1-v);
}
const cross=(a:GroundPoint,b:GroundPoint,p:GroundPoint)=>(b.x-a.x)*(p.z-a.z)-(b.z-a.z)*(p.x-a.x);
function clip(polygon:GroundPoint[],triangle:GroundPoint[]){
 let result=polygon;const sign=Math.sign(cross(triangle[0],triangle[1],triangle[2]));
 for(let k=0;k<3&&result.length;k++){
  const a=triangle[k],b=triangle[(k+1)%3],input=result;result=[];
  for(let i=0;i<input.length;i++){
   const p=input[i],q=input[(i+1)%input.length],dp=cross(a,b,p)*sign,dq=cross(a,b,q)*sign,inside=dp>=-1e-7;
   if(inside)result.push(p);
   if(inside!==(dq>=-1e-7)){const t=dp/(dp-dq);result.push({x:p.x+(q.x-p.x)*t,z:p.z+(q.z-p.z)*t});}
  }
 }return result;
}
/** Clip to each land triangle: the overlay never cuts through a differently tessellated slope. */
export function appendSurfacePolygon(d:IslandDefinition,polygon:GroundPoint[],offset:number,positions:number[],colors:number[],tint:readonly number[]){
 if(polygon.length<3)return;
 const n=terrainSegments(d),stepX=d.rx*2.25/n,stepZ=d.rz*2.25/n,minX=d.x-d.rx*1.125,minZ=d.z-d.rz*1.125;
 const startX=Math.max(0,Math.floor((Math.min(...polygon.map(p=>p.x))-minX)/stepX)),endX=Math.min(n-1,Math.floor((Math.max(...polygon.map(p=>p.x))-minX)/stepX));
 const startZ=Math.max(0,Math.floor((Math.min(...polygon.map(p=>p.z))-minZ)/stepZ)),endZ=Math.min(n-1,Math.floor((Math.max(...polygon.map(p=>p.z))-minZ)/stepZ));
 for(let iz=startZ;iz<=endZ;iz++)for(let ix=startX;ix<=endX;ix++){
  const a=terrainVertex(d,ix,iz),b=terrainVertex(d,ix,iz+1),c=terrainVertex(d,ix+1,iz+1),e=terrainVertex(d,ix+1,iz);
  for(const triangle of[[a,b,e],[b,c,e]]){
   const points=clip(polygon,triangle);if(points.length<3)continue;
   const area=points.reduce((sum,p,i)=>sum+p.x*points[(i+1)%points.length].z-p.z*points[(i+1)%points.length].x,0);if(Math.abs(area)<1e-7)continue;if(area>0)points.reverse();
   const [v0,v1,v2]=triangle,den=cross(v0,v1,v2);
   for(let i=1;i<points.length-1;i++)for(const p of[points[0],points[i],points[i+1]]){
    const w0=cross(v1,v2,p)/den,w1=cross(v2,v0,p)/den,w2=1-w0-w1,y=v0.y*w0+v1.y*w1+v2.y*w2+offset;
    positions.push(p.x,y,p.z);colors.push(tint[0],tint[1],tint[2]);
   }
  }
 }
}
