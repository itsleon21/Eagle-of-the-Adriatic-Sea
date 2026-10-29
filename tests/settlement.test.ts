import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Box3,Vector3,Quaternion,Matrix4,InstancedMesh} from 'three';
import {SettlementRenderer} from '../src/world/SettlementRenderer.ts';
import {islands,terrainHeight} from '../src/world/WorldConfig.ts';
import {buildSettlementLayout,houseKinds,plotsOverlap,plotCorners,roadIntersectsPlot} from '../src/world/SettlementLayout.ts';
import type {HousePlot} from '../src/world/SettlementLayout.ts';
const layouts=islands.slice(0,2).map(d=>buildSettlementLayout(d));

test('village plans are deterministic, contain six building types and leave hillside neighbourhoods more open',()=>{
 assert.deepEqual(buildSettlementLayout(islands[0]),layouts[0]);
 const kinds=new Set(layouts.flatMap(l=>l.houses.map(p=>p.kind)));for(const k of houseKinds)assert.ok(kinds.has(k));
 const medianNearest=(plots:HousePlot[])=>{const distances=plots.map(a=>Math.min(...plots.filter(b=>b!==a).map(b=>Math.hypot(a.x-b.x,a.z-b.z)))).sort((a,b)=>a-b);return distances[Math.floor(distances.length/2)];};
 for(const layout of layouts){
  assert.ok(layout.houses.length>65&&layout.houses.length<160);
  assert.ok(layout.houses.filter(p=>p.district==='waterfront').length>=12);
  const village=layout.houses.filter(p=>p.district==='village'),hills=layout.houses.filter(p=>p.district==='hillside');assert.ok(hills.length>=6&&hills.length<village.length/2);assert.ok(medianNearest(hills)>medianNearest(village)*1.2);
 }
 assert.ok(layouts[1].houses.filter(p=>p.kind==='HouseTownhouse').length>layouts[0].houses.filter(p=>p.kind==='HouseTownhouse').length);
});

test('rotated houses do not overlap, straddle lanes or extend below their terrain foundations',()=>{
 for(let k=0;k<layouts.length;k++){const d=islands[k],layout=layouts[k];
  for(let i=0;i<layout.houses.length;i++){
   const p=layout.houses[i];for(const q of layout.houses.slice(i+1))assert.equal(plotsOverlap(p,q),false);
   for(const road of layout.roads)assert.equal(roadIntersectsPlot(road,p),false);
   for(const corner of plotCorners(p))assert.ok(terrainHeight(d,corner.x,corner.z)<=p.ground+.001);
   assert.ok(p.ground-p.low<=7.2);assert.ok(p.low>=2);
  }
 }
 // Exercise the separating axes independently of the generated layout.
 const p=layouts[0].houses[0],crossed={...p,angle:p.angle+Math.PI/2},far={...p,x:p.x+200};
 assert.equal(plotsOverlap(p,crossed),true);assert.equal(plotsOverlap(p,far),false);
 assert.equal(roadIntersectsPlot({width:4,points:[{x:p.x-200,z:p.z},{x:p.x+200,z:p.z}]},p),true);
});

test('six exported house modules have distinct silhouettes, grounded feet and bounded reusable footprints',()=>{
 const data=readFileSync(new URL('../public/models/environment.glb',import.meta.url)),length=data.readUInt32LE(12),gltf=JSON.parse(data.toString('utf8',20,20+length));
 assert.ok(data.length<2*1024*1024);
 const signatures=new Set<string>(),roofHeights:number[]=[];
 for(const kind of houseKinds){
  const root=gltf.nodes.findIndex((n:{name:string})=>n.name===kind);assert.ok(root>=0);let minimumY=Infinity,maximumY=-Infinity,triangles=0;
  const bounds=new Box3();
  const walk=(id:number,parent:Matrix4,rootNode=false)=>{const n=gltf.nodes[id],local=n.matrix?new Matrix4().fromArray(n.matrix):new Matrix4().compose(new Vector3().fromArray(n.translation??[0,0,0]),new Quaternion().fromArray(n.rotation??[0,0,0,1]),new Vector3().fromArray(n.scale??[1,1,1])),matrix=rootNode?parent:parent.clone().multiply(local);
   if(n.mesh!==undefined)for(const p of gltf.meshes[n.mesh].primitives){const position=gltf.accessors[p.attributes.POSITION];triangles+=(p.indices===undefined?position.count:gltf.accessors[p.indices].count)/3;bounds.union(new Box3(new Vector3().fromArray(position.min),new Vector3().fromArray(position.max)).applyMatrix4(matrix));}
   for(const child of n.children??[])walk(child,matrix);
  };walk(root,new Matrix4(),true);minimumY=bounds.min.y;maximumY=bounds.max.y;
  assert.ok(bounds.min.x>=-.661&&bounds.max.x<=.661&&bounds.min.z>=-.661&&bounds.max.z<=.661,kind);
  assert.ok(triangles>250&&triangles<1800,kind);assert.ok(minimumY>=-.501&&minimumY<=-.49,`${kind}: ${minimumY}`);assert.ok(maximumY<=1.06,kind);roofHeights.push(maximumY);signatures.add(`${triangles}/${maximumY.toFixed(3)}`);
 }
 assert.equal(signatures.size,6);assert.ok(Math.max(...roofHeights)-Math.min(...roofHeights)>.4);
});

test('distant house proxies retain upward roof faces and distinct roof heights',()=>{
 const settlement=new SettlementRenderer(islands[0],layouts[0],[]);let roofs=0;
 for(const object of settlement.root.children){if(!(object instanceof InstancedMesh)||!houseKinds.some(k=>object.name.endsWith(k)))continue;
  const p=object.geometry.attributes.position,n=object.geometry.attributes.normal;
  for(let i=0;i<p.count;i+=3){const high=Math.max(p.getY(i),p.getY(i+1),p.getY(i+2)),low=Math.min(p.getY(i),p.getY(i+1),p.getY(i+2));if(low>=.499&&high>.6){const a=new Vector3().fromBufferAttribute(p,i),b=new Vector3().fromBufferAttribute(p,i+1),c=new Vector3().fromBufferAttribute(p,i+2),normal=b.sub(a).cross(c.sub(a)).normalize();if(Math.abs(normal.y)>.05){assert.ok(normal.y>0);assert.ok(n.getY(i)>0);roofs++;}}}
 }
 assert.ok(roofs>=12);
});
