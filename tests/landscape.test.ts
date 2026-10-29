import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Vector3} from 'three';
import {islands,WorldBounds,harborRunway,terrainHeight} from '../src/world/WorldConfig.ts';
import {World} from '../src/world/World.ts';
import {waterfrontPoint} from '../src/world/IslandDetails.ts';

test('expanded chart contains every island with over variable clear-water gaps of at least 1.45 km between land masses',()=>{
 assert.equal(WorldBounds.size,12000);
 for(const d of islands){assert.ok(d.x-d.rx*1.12>WorldBounds.minX&&d.x+d.rx*1.12<WorldBounds.maxX);assert.ok(d.z-d.rz*1.12>WorldBounds.minZ&&d.z+d.rz*1.12<WorldBounds.maxZ);}
 for(let i=0;i<islands.length;i++)for(let j=i+1;j<islands.length;j++){
  const a=islands[i],b=islands[j],gap=Math.hypot(a.x-b.x,a.z-b.z)-Math.max(a.rx,a.rz)*1.12-Math.max(b.rx,b.rz)*1.12;assert.ok(gap>1450,`${a.name} / ${b.name}: ${gap}`);
 }
});

test('detailed waterfront follows dry low ground and new structures leave the entire water runway clear',()=>{
 const world=new World();
 for(const d of islands.slice(0,2))for(let i=1;i<18;i++){
  const p=waterfrontPoint(d,-Math.PI+i/18*Math.PI,3);assert.ok(p.y>3&&p.y<10);assert.equal(p.y,terrainHeight(d,p.x,p.z));
 }
 for(const z of[-55,0,55])assert.equal(world.collides(new Vector3(harborRunway.x-30,1.05,harborRunway.z+z),new Vector3(harborRunway.x+800,1.05,harborRunway.z+z)),false);
 // All edges of every depth-atlas tile must be deep water: no rectangular shallow-water patches.
 const material=world.ocean.mesh.material as {uniforms:{shoreMap:{value:{image:{data:Uint8Array;width:number;height:number}}}}};
 const {data,width,height}=material.uniforms.shoreMap.value.image;
 for(let k=0;k<islands.length;k++)for(let i=0;i<height;i++)for(const index of[i*width+k*height,i*width+(k+1)*height-1,k*height+i,(height-1)*width+k*height+i])assert.equal(data[index],0);
});

test('both aircraft retain normalized linear cavity visibility on every exported surface',()=>{
 for(const name of['aircraft','m5']){
  const data=readFileSync(new URL(`../public/models/${name}.glb`,import.meta.url)),length=data.readUInt32LE(12),gltf=JSON.parse(data.toString('utf8',20,20+length)),binaryStart=28+length;let minimum=1,maximum=0;
  for(const mesh of gltf.meshes)for(const primitive of mesh.primitives){
   const ao=gltf.accessors[primitive.attributes.COLOR_0];assert.ok(ao);assert.equal(ao.count,gltf.accessors[primitive.attributes.POSITION].count);assert.equal(ao.type,'VEC4');assert.equal(ao.componentType,5123);assert.equal(ao.normalized,true);
   const view=gltf.bufferViews[ao.bufferView],start=binaryStart+(view.byteOffset??0)+(ao.byteOffset??0),stride=view.byteStride??8;
   for(let i=0;i<ao.count;i++){const p=start+i*stride,r=data.readUInt16LE(p),g=data.readUInt16LE(p+2),b=data.readUInt16LE(p+4);assert.equal(r,g);assert.equal(r,b);const value=r/65535;minimum=Math.min(minimum,value);maximum=Math.max(maximum,value);}
  }
  assert.ok(minimum>=.57&&minimum<.70);assert.equal(maximum,1);
 }
});
