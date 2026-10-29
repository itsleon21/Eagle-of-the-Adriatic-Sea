import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';
test('exported aircraft GLB has valid container and independent animated nodes',()=>{
 const data=readFileSync(new URL('../public/models/aircraft.glb',import.meta.url));assert.equal(data.toString('ascii',0,4),'glTF');assert.equal(data.readUInt32LE(4),2);assert.equal(data.readUInt32LE(8),data.length);
 const length=data.readUInt32LE(12);const gltf=JSON.parse(data.toString('utf8',20,20+length));const names=gltf.nodes.map((node:{name:string})=>node.name);
 for(const name of ['AircraftRoot','AircraftBody','PropellerPivot','LeftAileron','RightAileron','Elevator','Rudder'])assert.ok(names.includes(name),name);
 assert.ok(gltf.meshes.length>0);assert.ok(gltf.materials.length>=6);assert.ok(gltf.images.length>=3,'PBR paint textures are embedded');for(const image of gltf.images)assert.ok(Number.isInteger(image.bufferView)&&!image.uri,'all textures are embedded in the GLB');assert.ok(gltf.materials.some((m:{normalTexture?:unknown})=>m.normalTexture),'surface normal detail');
 for(const name of ['top','front','side'])assert.ok(existsSync(new URL(`../art/aircraft_views/${name}.png`,import.meta.url)));
});
test('environment kit includes the required original modules',()=>{
 const data=readFileSync(new URL('../public/models/environment.glb',import.meta.url)),length=data.readUInt32LE(12),gltf=JSON.parse(data.toString('utf8',20,20+length));
 const names=gltf.nodes.map((node:{name:string})=>node.name);for(const name of ['HouseCream','HouseOchre','Warehouse','Lighthouse','PineCrown','OliveTree','CoastalRock','FishingBoat'])assert.ok(names.includes(name),name);assert.equal(data.readUInt32LE(8),data.length);
});
