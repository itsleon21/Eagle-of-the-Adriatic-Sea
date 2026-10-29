import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
/** Flatten each Blender module into one colored mesh for efficient instancing. */
export async function loadEnvironmentKit(){
 const gltf=await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/environment.glb`);gltf.scene.updateMatrixWorld(true);
 const result=new Map<string,T.BufferGeometry>();
 for(const name of ['HouseCream','HouseOchre','HouseFisher','HouseTownhouse','HouseArcade','HouseVilla','HouseWorkshop','HouseTerrace','Warehouse','Lighthouse','PineCrown','OliveTree','CoastalRock','FishingBoat']){
  const root=gltf.scene.getObjectByName(name);if(!root)continue;const inverse=root.matrixWorld.clone().invert(),parts:T.BufferGeometry[]=[];
  root.traverse(object=>{if(!(object instanceof T.Mesh))return;let geometry:T.BufferGeometry=object.geometry.clone();if(geometry.index)geometry=geometry.toNonIndexed();geometry.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,object.matrixWorld));if(!geometry.attributes.normal)geometry.computeVertexNormals();
   const count=geometry.attributes.position.count,colors=new Float32Array(count*3),materials=Array.isArray(object.material)?object.material:[object.material];
   for(let i=0;i<count;i++){const group=geometry.groups.find(g=>i>=g.start&&i<g.start+g.count);const material=materials[group?.materialIndex??0] as T.MeshStandardMaterial;const color=material.color??new T.Color('white');colors[i*3]=color.r;colors[i*3+1]=color.g;colors[i*3+2]=color.b;}
   for(const key of Object.keys(geometry.attributes))if(!['position','normal'].includes(key))geometry.deleteAttribute(key);
   geometry.setAttribute('color',new T.BufferAttribute(colors,3));geometry.clearGroups();parts.push(geometry);
  });
  const combined=mergeGeometries(parts,false);if(combined){combined.computeBoundingSphere();result.set(name,combined);}for(const part of parts)part.dispose();
 }
 gltf.scene.traverse(obj=>{if(obj instanceof T.Mesh){obj.geometry.dispose();for(const m of Array.isArray(obj.material)?obj.material:[obj.material])m.dispose();}});
 if(!['HouseCream','Lighthouse','HouseFisher','HouseTownhouse','HouseArcade','HouseVilla','HouseWorkshop','HouseTerrace'].every(name=>result.has(name)))throw new Error('环境模型缺少必要模块');
 return result;
}
