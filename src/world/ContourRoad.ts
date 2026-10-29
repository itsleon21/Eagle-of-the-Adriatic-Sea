import {terrainHeight} from './WorldConfig.ts';
import type {IslandDefinition} from './WorldConfig.ts';
import type {GroundPoint} from './TerrainSurface.ts';
/** Least-cost dry route: rising hills are approached along contours rather than crossed directly. */
export function contourRoad(d:IslandDefinition,start:GroundPoint,goal:GroundPoint):GroundPoint[]{
 const step=10,minX=d.x-d.rx,minZ=d.z-d.rz,nx=Math.ceil(d.rx*2/step)+1,nz=Math.ceil(d.rz*2/step)+1,count=nx*nz;
 const heights=new Float64Array(count),cost=new Float64Array(count).fill(Infinity),parent=new Int32Array(count).fill(-1),closed=new Uint8Array(count);
 const point=(id:number)=>({x:minX+(id%nx)*step,z:minZ+Math.floor(id/nx)*step});
 for(let id=0;id<count;id++){const p=point(id);heights[id]=terrainHeight(d,p.x,p.z);}
 const nearest=(p:GroundPoint)=>{let best=-1,distance=Infinity;for(let id=0;id<count;id++){if(heights[id]<3)continue;const q=point(id),dist=Math.hypot(q.x-p.x,q.z-p.z);if(dist<distance){distance=dist;best=id;}}return best;};
 const first=nearest(start),last=nearest(goal);if(first<0||last<0)return[];
 const heap:{id:number;f:number}[]=[];
 const push=(entry:{id:number;f:number})=>{heap.push(entry);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].f<=entry.f)break;heap[i]=heap[p];i=p;}heap[i]=entry;};
 const pop=()=>{const top=heap[0],end=heap.pop()!;if(heap.length){let i=0;while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&heap[child+1].f<heap[child].f)child++;if(heap[child].f>=end.f)break;heap[i]=heap[child];i=child;}heap[i]=end;}return top;};
 cost[first]=0;push({id:first,f:0});
 while(heap.length){
  const {id}=pop();if(closed[id])continue;closed[id]=1;if(id===last)break;
  const p=point(id),ix=id%nx,iz=Math.floor(id/nx);
  for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
   if((dx===0&&dz===0)||ix+dx<0||ix+dx>=nx||iz+dz<0||iz+dz>=nz)continue;
   const next=(iz+dz)*nx+ix+dx;if(closed[next]||heights[next]<3)continue;
   const q=point(next),length=step*Math.hypot(dx,dz),mid=terrainHeight(d,(p.x+q.x)/2,(p.z+q.z)/2);
   const grade=Math.max(Math.abs(mid-heights[id]),Math.abs(heights[next]-mid))/(length/2);
   if(grade>.24||mid<3)continue;
   const score=cost[id]+length*(1+grade*grade*55);
   if(score>=cost[next])continue;cost[next]=score;parent[next]=id;push({id:next,f:score+Math.hypot(q.x-goal.x,q.z-goal.z)});
  }
 }
 if(!Number.isFinite(cost[last]))return[];
 const path:GroundPoint[]=[];for(let id=last;id!==-1;id=parent[id])path.push(point(id));path.reverse();
 return[start,...path];
}
