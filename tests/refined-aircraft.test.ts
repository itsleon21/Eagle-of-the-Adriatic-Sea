import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
const file=readFileSync(new URL('../public/models/aircraft.glb',import.meta.url));
const jsonLength=file.readUInt32LE(12),gltf=JSON.parse(file.toString('utf8',20,20+jsonLength)),binaryStart=28+jsonLength;
const body=gltf.nodes.find((node:{name:string})=>node.name==='AircraftBody');
const engine=gltf.nodes.find((node:{name:string})=>node.name==='EngineAssembly');
const primitives=[...gltf.meshes[body.mesh].primitives,...gltf.meshes[engine.mesh].primitives];
test('reference proportions retain a long enclosed nacelle and a slender level-deck hull',()=>{
 let min=Infinity,max=-Infinity;
 for(const p of primitives){const a=gltf.accessors[p.attributes.POSITION];min=Math.min(min,a.min[0]);max=Math.max(max,a.max[0]);}
 assert.ok(max-min>11.8&&max-min<12.2,'wing span remains approximately 12 meters');
 const cowling=primitives.find((p:{material:number})=>gltf.materials[p.material].name==='Cowling lacquer');assert.ok(cowling);
 const bounds=gltf.accessors[cowling.attributes.POSITION];assert.ok((bounds.max[2]-bounds.min[2])/(bounds.max[1]-bounds.min[1])>1.7,'the enclosed nacelle is substantially longer than its height');
 const wing=primitives.find((p:{material:number})=>gltf.materials[p.material].name==='Wing lacquer');const wingBounds=gltf.accessors[wing.attributes.POSITION];assert.ok(bounds.min[1]>wingBounds.max[1],'cowling clears the upper wing surface');
 const prop=gltf.nodes.find((node:{name:string})=>node.name==='PropellerPivot');assert.ok(prop.translation[2]<wingBounds.min[2]-.25,'propeller sweep sits ahead of the wing leading edge');
 const hull=primitives.find((p:{material:number})=>gltf.materials[p.material].name==='Hull lacquer');const hullBounds=gltf.accessors[hull.attributes.POSITION];const length=hullBounds.max[2]-hullBounds.min[2],height=hullBounds.max[1]-hullBounds.min[1];assert.ok(length>8.4&&length<8.6,'the body is approximately 8.5 meters long');assert.ok(height/length>.12&&height/length<.17,'the hull stays slender in side view');
 const wingGap=wingBounds.max[1]-hullBounds.max[1],engineGap=bounds.min[1]-wingBounds.max[1];assert.ok(wingGap>.4&&wingGap<.7,'the wing sits close above the hull deck');assert.ok(engineGap>.02&&engineGap<.2,'the engine uses short supports above the wing');
 const floats=primitives.find((p:{material:number})=>gltf.materials[p.material].name==='Float lacquer');const floatBounds=gltf.accessors[floats.attributes.POSITION];assert.ok(floatBounds.min[1]>hullBounds.min[1]+.2,'wing floats sit above the central boat keel');
});
function decodedMeshes(source=primitives){
 const meshes:T.Mesh[]=[];
 for(const primitive of source){
  const accessor=gltf.accessors[primitive.attributes.POSITION],view=gltf.bufferViews[accessor.bufferView];
  const start=binaryStart+(view.byteOffset??0)+(accessor.byteOffset??0),stride=view.byteStride??12,positions=new Float32Array(accessor.count*3);
  for(let i=0;i<accessor.count;i++)for(let axis=0;axis<3;axis++)positions[i*3+axis]=file.readFloatLE(start+i*stride+axis*4);
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));
  if(primitive.indices!==undefined){const indices=gltf.accessors[primitive.indices],buffer=gltf.bufferViews[indices.bufferView],offset=binaryStart+(buffer.byteOffset??0)+(indices.byteOffset??0),array:number[]=[];for(let i=0;i<indices.count;i++)array.push(indices.componentType===5123?file.readUInt16LE(offset+i*2):file.readUInt32LE(offset+i*4));geometry.setIndex(array);}
  const mesh=new T.Mesh(geometry,new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.updateMatrixWorld();meshes.push(mesh);
 }
 return meshes;
}
function dispose(meshes:T.Mesh[]){for(const mesh of meshes){mesh.geometry.dispose();(mesh.material as T.Material).dispose();}}
test('cockpit has a recessed floor and retains an intact outer hull',()=>{
 const meshes=decodedMeshes();
 const down=new T.Raycaster(new T.Vector3(.28,2,.75),new T.Vector3(0,-1,0),0,5).intersectObjects(meshes);
 assert.ok(down.length>0);assert.ok(down[0].point.y<0&&down[0].point.y>-.25,'the ray reaches the recessed cockpit floor');
 const up=new T.Raycaster(new T.Vector3(.28,-2,.75),new T.Vector3(0,1,0),0,5).intersectObjects(meshes);
 assert.ok(up.length>0);assert.ok(up[0].point.y<down[0].point.y-.03,'the outer keel remains below the cockpit floor');dispose(meshes);
});
test('engine nose is closed and side cooling ports are recessed',()=>{
 const meshes=decodedMeshes(gltf.meshes[engine.mesh].primitives);
 const nose=new T.Raycaster(new T.Vector3(.25,1.45,-4),new T.Vector3(0,0,1),0,5).intersectObjects(meshes);
 assert.ok(nose.length>0&&nose[0].point.z< -2,'the nacelle has a closed front shoulder');
 const port=new T.Raycaster(new T.Vector3(-1,1.27,-1.299),new T.Vector3(1,0,0),0,2).intersectObjects(meshes);
 assert.ok(port.length>0&&port[0].point.x>-.35,'the cooling port opens into the dark internal block');dispose(meshes);
});
test('paint normal maps have UVs and tangents and fit the browser asset budget',()=>{
 for(const mesh of gltf.meshes)for(const p of mesh.primitives){if(gltf.materials[p.material]?.normalTexture){assert.ok(p.attributes.TEXCOORD_0!==undefined);assert.ok(p.attributes.TANGENT!==undefined);}}
 assert.ok(file.length<12*1024*1024,'embedded PBR aircraft stays below 12 MiB');
});
test('main wing and tail tips retain broad chord instead of collapsing to pointed leaves',()=>{
 const extent=(material:string,cutoff:number)=>{
  const meshes=decodedMeshes(gltf.meshes[body.mesh].primitives.filter((p:{material:number})=>gltf.materials[p.material].name===material));let min=Infinity,max=-Infinity;
  for(const mesh of meshes){const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++)if(Math.abs(p.getX(i))>=cutoff){min=Math.min(min,p.getZ(i));max=Math.max(max,p.getZ(i));}}
  dispose(meshes);assert.ok(Number.isFinite(min)&&Number.isFinite(max));return max-min;
 };
 assert.ok(extent('Wing lacquer',5.48)>1.55);assert.ok(extent('Tailplane lacquer',1.53)>.78);
 const elevator=gltf.nodes.find((n:{name:string})=>n.name==='Elevator'),rudder=gltf.nodes.find((n:{name:string})=>n.name==='Rudder');assert.ok(elevator&&rudder);assert.ok(elevator.translation[2]>3.85&&elevator.translation[2]<3.95);
});
