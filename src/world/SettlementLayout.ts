import {contourRoad} from './ContourRoad.ts';
import {terrainHeight,random} from './WorldConfig.ts';
import type {IslandDefinition} from './WorldConfig.ts';
import {waterfrontPoint,inTakeoffChannel} from './IslandDetails.ts';

export const houseKinds=['HouseFisher','HouseTownhouse','HouseArcade','HouseVilla','HouseWorkshop','HouseTerrace'] as const;
export type HouseKind=typeof houseKinds[number];
export type District='waterfront'|'village'|'hillside';
export interface HousePlot {kind:HouseKind;district:District;x:number;z:number;ground:number;low:number;width:number;depth:number;height:number;angle:number;tint:number[]}
export interface VillageRoad {points:{x:number;z:number}[];width:number}
export interface VillagePlaza {x:number;z:number;radius:number;market?:boolean}
export interface SettlementLayout {houses:HousePlot[];roads:VillageRoad[];plazas:VillagePlaza[]}
const clamp=(x:number,a:number,b:number)=>Math.min(b,Math.max(a,x));
const dimensions:Record<HouseKind,[number,number,number]>={HouseFisher:[12,8,11],HouseTownhouse:[12,15,14],HouseArcade:[19,12,15],HouseVilla:[19,10,17],HouseWorkshop:[23,8,15],HouseTerrace:[19,11,17]};
export function plotCorners(p:HousePlot,padding=0){const w=p.width*.66+padding,d=p.depth*.66+padding,c=Math.cos(p.angle),s=Math.sin(p.angle);return[[-w,-d],[w,-d],[w,d],[-w,d]].map(([x,z])=>({x:p.x+x*c+z*s,z:p.z-x*s+z*c}));}
/** Exact separating axes keep rotated roofs and balconies out of neighbouring plots. */
export function plotsOverlap(a:HousePlot,b:HousePlot,padding=0){
 const ac=plotCorners(a,padding),bc=plotCorners(b,padding);
 for(const p of[a,b])for(const axis of[{x:Math.cos(p.angle),z:-Math.sin(p.angle)},{x:Math.sin(p.angle),z:Math.cos(p.angle)}]){
  const aa=ac.map(v=>v.x*axis.x+v.z*axis.z),bb=bc.map(v=>v.x*axis.x+v.z*axis.z);
  if(Math.max(...aa)<=Math.min(...bb)||Math.max(...bb)<=Math.min(...aa))return false;
 }return true;
}
export function plotContains(p:HousePlot,x:number,z:number,padding=0){const dx=x-p.x,dz=z-p.z,c=Math.cos(p.angle),s=Math.sin(p.angle);return Math.abs(dx*c-dz*s)<p.width*.66+padding&&Math.abs(dx*s+dz*c)<p.depth*.66+padding;}
const segmentDistance=(x:number,z:number,a:{x:number;z:number},b:{x:number;z:number})=>{const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(x-a.x-t*dx,z-a.z-t*dz);};
export function nearRoad(x:number,z:number,road:VillageRoad,clearance:number){for(let i=1;i<road.points.length;i++)if(segmentDistance(x,z,road.points[i-1],road.points[i])<road.width/2+clearance)return true;return false;}

export function layoutOccupied(layout:SettlementLayout,x:number,z:number,padding=0){return layout.houses.some(p=>plotContains(p,x,z,padding))||layout.plazas.some(p=>Math.hypot(x-p.x,z-p.z)<p.radius+padding)||layout.roads.some(road=>nearRoad(x,z,road,padding));}
export function roadIntersectsPlot(road:VillageRoad,p:HousePlot,padding=0){
 const c=Math.cos(p.angle),s=Math.sin(p.angle),w=p.width*.66+road.width/2+padding,d=p.depth*.66+road.width/2+padding;
 const local=(q:{x:number;z:number})=>({x:(q.x-p.x)*c-(q.z-p.z)*s,z:(q.x-p.x)*s+(q.z-p.z)*c});
 for(let i=1;i<road.points.length;i++){
  const a=local(road.points[i-1]),b=local(road.points[i]);let near=0,far=1,hit=true;
  for(const [origin,delta,extent] of[[a.x,b.x-a.x,w],[a.z,b.z-a.z,d]]){
   if(Math.abs(delta)<1e-9){if(Math.abs(origin)>extent){hit=false;break;}}
   else{let t0=(-extent-origin)/delta,t1=(extent-origin)/delta;if(t0>t1)[t0,t1]=[t1,t0];near=Math.max(near,t0);far=Math.min(far,t1);if(near>far){hit=false;break;}}
  }if(hit)return true;
 }return false;
}

/** Density follows streets and neighbourhood pockets, rather than concentric rows. */
export function buildSettlementLayout(d:IslandDefinition):SettlementLayout {
 if(d.id==='town'&&!d.canonical){const layout=buildSettlementLayout({...d,canonical:true});for(const p of layout.houses){p.x=2*d.x-p.x;p.z=2*d.z-p.z;p.angle+=Math.PI;}for(const road of layout.roads)for(const p of road.points){p.x=2*d.x-p.x;p.z=2*d.z-p.z;}for(const p of layout.plazas){p.x=2*d.x-p.x;p.z=2*d.z-p.z;}return layout;}
 const rng=random(d.seed+410),houses:HousePlot[]=[],roads:VillageRoad[]=[],plazas:VillagePlaza[]=[];
 if(d.id!=='harbor'&&d.id!=='town')return{houses,roads,plazas};
 const town=d.id==='town';
 const shoreRoad:VillageRoad={points:[],width:8};
 for(let i=0;i<=72;i++){const p=waterfrontPoint(d,-Math.PI+.18+i/72*(Math.PI-.36),3);shoreRoad.points.push({x:p.x,z:p.z});}
 roads.push(shoreRoad);
 const head=waterfrontPoint(d,-1.55,14);plazas.push({x:head.x,z:head.z-2,radius:town?18:15,market:true});
 const mainRoad:VillageRoad={points:[],width:town?7:5.5};
 mainRoad.points=contourRoad(d,{x:head.x,z:head.z},{x:d.x+d.rx*.12,z:d.z-d.rz*.61});
 if(mainRoad.points.length<2)throw new Error(`${d.name}缺少连通的缓坡道路`);

 roads.push(mainRoad);
 const sidePlaza=waterfrontPoint(d,town?-.78:-2.42,16);plazas.push({x:sidePlaza.x,z:sidePlaza.z,radius:12,market:true});

 const anchors=town?[[-.36,-.12],[.30,-.11],[-.08,-.41],[.38,-.60],[-.34,-.64]]:[[-.38,-.08],[.34,-.16],[-.06,-.40],[-.36,-.60],[.29,-.61]];
 for(const [ax,az] of anchors){
  const x=d.x+ax*d.rx,z=d.z+az*d.rz,start=mainRoad.points.reduce((best,p)=>Math.hypot(p.x-x,p.z-z)<Math.hypot(best.x-x,best.z-z)?p:best),branch:VillageRoad={points:[],width:4.2};
  for(let i=0;i<=18;i++){const t=i/18;branch.points.push({x:start.x+(x-start.x)*t,z:start.z+(z-start.z)*t+Math.sin(t*Math.PI)*9});}roads.push(branch);
  plazas.push({x,z,radius:8});
 }
 function add(kind:HouseKind,district:District,x:number,z:number,angle:number){
  const [bw,bh,bd]=dimensions[kind],scale=.88+rng()*.26;
  const p:HousePlot={kind,district,x,z,width:bw*scale,height:bh*(.88+rng()*.25),depth:bd*(.9+rng()*.2),ground:0,low:0,angle,tint:[.89+rng()*.11,.88+rng()*.11,.86+rng()*.12]};
  if(district==='waterfront')p.width*=.84;
  if(inTakeoffChannel(d,x,z,55))return false;
  const radius=Math.hypot(p.width*.66,p.depth*.66);
  if(plazas.some(q=>Math.hypot(x-q.x,z-q.z)<q.radius+radius*.72))return false;
  // Sample plot edges as well as its centre: long rotated houses cannot straddle a lane.
  const corners=plotCorners(p,1),samples=[{x,z},...corners,...corners.map((a,i)=>({x:(a.x+corners[(i+1)%4].x)/2,z:(a.z+corners[(i+1)%4].z)/2}))];
  if(roads.some(road=>roadIntersectsPlot(road,p,1.4)))return false;
  const heights=samples.map(q=>terrainHeight(d,q.x,q.z)),low=Math.min(...heights),high=Math.max(...heights);
  const slope=Math.hypot(terrainHeight(d,x+3,z)-terrainHeight(d,x-3,z),terrainHeight(d,x,z+3)-terrainHeight(d,x,z-3))/6;
  if(low<2||high>d.height*.93||high-low>(district==='waterfront'?6.0:district==='hillside'?5.8:7)||slope>.68)return false;
  p.ground=high+.12;p.low=low;
  if(district==='hillside'&&houses.some(other=>Math.hypot(x-other.x,z-other.z)<44))return false;
  if(houses.some(other=>plotsOverlap(p,other,district==='hillside'?3:1.1)))return false;
  // Reserve the campanile and harbour warehouse sites already used by the scene.
  const tower=waterfrontPoint(d,-.70,108);if(Math.hypot(x-tower.x,z-tower.z)<radius+40)return false;
  for(const a of[-2.80,-.34]){const warehouse=waterfrontPoint(d,a,40);if(Math.hypot(x-warehouse.x,z-warehouse.z)<radius+19)return false;}
  houses.push(p);return true;
 }
 // Waterfront has compact, unequal runs of cottages and shops with intentional plaza gaps.
 const waterfrontClusters=town?[[-2.80,.28],[-2.14,.34],[-1.08,.26],[-.40,.17]]:[[-2.79,.22],[-2.03,.29],[-.97,.26],[-.34,.15]];
 let index=0;
 for(const [center,spread] of waterfrontClusters){
  for(let i=0;i<34;i++){
   const a=center+(rng()-.5)*spread*2,p=waterfrontPoint(d,a,22+rng()*18),kind:HouseKind=town?(index%5===0?'HouseArcade':index%3===0?'HouseTerrace':'HouseTownhouse'):(a< -2.1?(index%4===0?'HouseWorkshop':'HouseFisher'):(index%4===0?'HouseArcade':index%3===0?'HouseTownhouse':'HouseTerrace'));
   add(kind,'waterfront',p.x,p.z,Math.atan2(-p.nx,-p.nz)+(rng()-.5)*.16);index++;
  }
 }
 // A few second-line pockets read as back lanes, not another continuous ring.
 for(const center of(town?[-2.7,-2.1,-.95,-.45]:[-2.75,-2.2,-.65]))for(let i=0;i<34;i++){
  const a=center+(rng()-.5)*.34,p=waterfrontPoint(d,a,66+rng()*54);
  add(rng()<.40?'HouseFisher':rng()<.55?'HouseTerrace':'HouseTownhouse','village',p.x,p.z,Math.atan2(-p.nx,-p.nz)+(rng()-.5)*.25);
 }
 // Upper hamlets grow in separate groups around flat terrain pockets. More open land is left at altitude.

 for(let k=0;k<anchors.length;k++){
  const [ax,az]=anchors[k],cx=d.x+ax*d.rx,cz=d.z+az*d.rz;
  for(let i=0;i<(town?145:125);i++){
   const theta=rng()*Math.PI*2,r=Math.sqrt(rng()),x=cx+Math.cos(theta)*r*(town?67:60),z=cz+Math.sin(theta)*r*(town?54:48);
   const district:District=k<3?'village':'hillside',kind:HouseKind=k<3?(town?(rng()<.60?'HouseTownhouse':rng()<.65?'HouseTerrace':'HouseFisher'):(rng()<.4?'HouseTerrace':rng()<.4?'HouseTownhouse':'HouseFisher')):(rng()<.65?'HouseVilla':'HouseFisher');
   if(district==='hillside'&&rng()<.33)continue;
   add(kind,district,x,z,Math.atan2(x-d.x,d.z+d.rz*.4-z)+(rng()-.5)*.55);
  }
 }
 // A few isolated upper plots complete the hillside hamlets without filling the intervening woodland.
 for(let attempt=0;attempt<1200&&houses.filter(p=>p.district==='hillside').length<8;attempt++){
  const x=d.x+(rng()-.5)*d.rx*1.2,z=d.z-d.rz*(.18+rng()*.56);
  if(terrainHeight(d,x,z)<24)continue;
  add(rng()<.65?'HouseVilla':'HouseFisher','hillside',x,z,(rng()-.5)*.7);
 }
 if(!town){for(const p of houses.filter(p=>p.district==='village'&&p.kind==='HouseTerrace'&&p.x<d.x).slice(0,2)){p.kind='HouseWorkshop';p.height=8.5;}}
 return{houses,roads,plazas};
}
