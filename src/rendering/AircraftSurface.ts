import * as T from 'three';

/** Upgrade GLTF standard surfaces so metal anisotropy and fabric specular controls really apply. */
export function physicalAircraftMaterial(source:T.Material){
 if(source instanceof T.MeshPhysicalMaterial||!(source instanceof T.MeshStandardMaterial))return source;
 const material=new T.MeshPhysicalMaterial();T.MeshStandardMaterial.prototype.copy.call(material,source);
 material.defines={STANDARD:'',PHYSICAL:''};return material;
}

/** Keep cavity shading in indirect light; sunlight and lacquer highlights stay intact. */
export function prepareAircraftSurface(material:T.MeshPhysicalMaterial,hasAO:boolean) {
 const name=material.name.toLowerCase();
 if(/lacquer|enamel/.test(name)){
  // Pigmented paint stays dielectric. A restrained varnish sits over the worked skin.
  material.metalness=0;material.roughness=material.roughnessMap?.94:.34;
  material.clearcoat=/structural|ivory|white|bottom/.test(name)?.30:.48;
  material.clearcoatRoughness=.19;material.ior=1.48;material.specularIntensity=.85;
  if(material.normalMap)material.normalScale.multiplyScalar(.55);
 }else if(/brass|bronze|polished hub/.test(name)){
  material.roughness=material.roughnessMap?.88:.36;material.metalness=.78;material.clearcoat=0;material.anisotropy=.24;
 }else if(/mahogany|varnished|walnut/.test(name)){
  material.metalness=0;material.roughness=material.roughnessMap?.96:.42;material.clearcoat=.32;material.clearcoatRoughness=.23;
 }else if(name.includes('fabric')){
  material.metalness=0;material.roughness=material.roughnessMap?1:.88;material.clearcoat=0;material.specularIntensity=.45;
 }else if(/leather|interior|intake shadow/.test(name)){
  material.metalness=0;material.clearcoat=0;material.roughness=Math.max(.78,material.roughness);material.specularIntensity=.5;
 }else if(/steel|alloy|rigging|tension wire/.test(name)){
  material.metalness=.82;material.roughness=/dark|steel|rigging|wire/.test(name)?.47:.32;material.clearcoat=0;material.anisotropy=.20;
 }
 if(name.includes('glass')){
  material.color.setRGB(.90,.94,.93);material.opacity=.22;material.depthWrite=false;
  material.metalness=0;material.roughness=.13;material.clearcoat=.25;material.clearcoatRoughness=.18;
 }
 material.clearcoatNormalMap=null;
 material.envMapIntensity=/lacquer|enamel/.test(name)?.88:/alloy|brass|bronze/.test(name)?1:.8;
 if(!hasAO)return;
 material.vertexColors=false;
 material.onBeforeCompile=shader=>{
  shader.vertexShader='attribute vec4 aircraftAO; varying float vAircraftAO;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvAircraftAO=aircraftAO.r;');
  shader.fragmentShader='varying float vAircraftAO;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>',`#include <aomap_fragment>
   float aircraftOcclusion=mix(1.0,clamp(vAircraftAO,0.0,1.0),.90);
   reflectedLight.indirectDiffuse*=aircraftOcclusion;
   reflectedLight.indirectSpecular*=mix(1.0,aircraftOcclusion,.45);`);
 };
 material.customProgramCacheKey=()=> 'aircraft-material-depth-v2';material.needsUpdate=true;
}
