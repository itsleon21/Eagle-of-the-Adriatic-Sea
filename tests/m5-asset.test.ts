import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const file=readFileSync(new URL('../public/models/m5.glb',import.meta.url));
const jsonLength=file.readUInt32LE(12),gltf=JSON.parse(file.toString('utf8',20,20+jsonLength)),binary=28+jsonLength;

test('M5 is a self-contained biplane with independent controls and a rear pusher propeller',()=>{
 assert.equal(file.toString('ascii',0,4),'glTF');assert.equal(file.readUInt32LE(8),file.length);assert.ok(file.length<12*1024*1024);
 for(const name of ['AircraftRoot','AircraftBody','PropellerPivot','LeftAileron','RightAileron','Elevator','Rudder'])assert.ok(gltf.nodes.some((n:{name:string})=>n.name===name),name);
 const prop=gltf.nodes.find((n:{name:string})=>n.name==='PropellerPivot');assert.ok(prop.translation[2]>1,'the propeller sits behind the engine');assert.ok(prop.translation[1]>1);
 assert.ok(gltf.images.length>=3);for(const image of gltf.images)assert.ok(Number.isInteger(image.bufferView)&&!image.uri,'image is embedded');
 const upper:number[]=[],lower:number[]=[];
 for(const mesh of gltf.meshes)for(const p of mesh.primitives){
  const material=gltf.materials[p.material];if(material.normalTexture){assert.ok(p.attributes.TANGENT!==undefined);assert.ok(p.attributes.TEXCOORD_0!==undefined);}
  if(material.name!=='M5 light grey fabric')continue;
  const a=gltf.accessors[p.attributes.POSITION],v=gltf.bufferViews[a.bufferView],start=binary+(v.byteOffset??0)+(a.byteOffset??0),stride=v.byteStride??12;
  for(let i=0;i<a.count;i++){const x=file.readFloatLE(start+i*stride),y=file.readFloatLE(start+i*stride+4);if(Math.abs(x)>3){if(y>1.8)upper.push(x);else if(y>.25&&y<.8)lower.push(x);}}
 }
 assert.ok(upper.length>100&&lower.length>100,'both wing planes have curved geometry');assert.ok(Math.max(...upper)-Math.min(...upper)>11.7);assert.ok(Math.max(...lower)-Math.min(...lower)>8);
 for(const view of ['beauty','top','side','front'])assert.ok(existsSync(new URL(`../art/m5_views/${view}.png`,import.meta.url)));
});
