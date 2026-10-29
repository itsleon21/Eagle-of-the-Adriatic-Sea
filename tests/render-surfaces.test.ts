import {test} from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {sampleOceanWaves,oceanGridCoordinate,waveComponents,waveAmplitude} from '../src/world/OceanWaves.ts';
import {Ocean} from '../src/world/Ocean.ts';import {World} from '../src/world/World.ts';import {islands,harborRunway} from '../src/world/WorldConfig.ts';
import {prepareAircraftSurface,physicalAircraftMaterial} from '../src/rendering/AircraftSurface.ts';
test('swell is finite, bounded and its analytical normals agree with displaced geometry',()=>{
 for(const wind of[0,.25,.85,1])for(let i=0;i<60;i++){
  const x=i*13.7,z=-i*9.3,t=i*.17,w=sampleOceanWaves(x,z,t,wind),eps=.001;
  const dx=(sampleOceanWaves(x+eps,z,t,wind).height-sampleOceanWaves(x-eps,z,t,wind).height)/(2*eps),dz=(sampleOceanWaves(x,z+eps,t,wind).height-sampleOceanWaves(x,z-eps,t,wind).height)/(2*eps);
  assert.ok(Math.abs(w.dx-dx)<1e-7&&Math.abs(w.dz-dz)<1e-7);assert.ok(Math.abs(w.height)<=waveAmplitude(wind)*waveComponents.reduce((n,c)=>n+c.weight,0)+1e-9);
 }
});
test('adaptive ocean grid is dense near the camera and spans the complete visible sea',()=>{
 assert.equal(oceanGridCoordinate(1),24000);assert.equal(oceanGridCoordinate(-1),-24000);
 let previous=-Infinity;for(let i=-128;i<=128;i++){const x=oceanGridCoordinate(i/128);assert.ok(x>previous);previous=x;}
 assert.ok(oceanGridCoordinate(1/128)<8);
 const sea=new Ocean();assert.ok(sea.mesh.geometry.attributes.position.count>60000);assert.equal(sea.mesh.getRenderTarget().texture.generateMipmaps,true);sea.dispose();sea.mesh.geometry.dispose();(sea.mesh.material as T.Material).dispose();
});
test('visual water moves with time and fades at dry land without changing mean sea collision',()=>{
 const sea=new Ocean();sea.setWeather(.85,1,.24,450,3800);const x=harborRunway.x,z=harborRunway.z;sea.update(0);const a=sea.heightAt(x,z);sea.update(1.1);const b=sea.heightAt(x,z);assert.ok(Math.abs(a-b)>.01);
 const d=islands[2];assert.equal(sea.heightAt(d.x,d.z),0);sea.dispose();sea.mesh.geometry.dispose();(sea.mesh.material as T.Material).dispose();
});
test('wake history remains in world space, follows the shared waves and fades after takeoff',()=>{
 const world=new World(),wake=world.root.getObjectByName('World-space wake / spreading foam ribbons') as T.Mesh;
 const start=new T.Vector3(harborRunway.x,1,harborRunway.z);
 for(let i=0;i<30;i++){start.x+=.4;world.update(1/60,start,-Math.PI/2,24,true);}
 const p=wake.geometry.attributes.position,o=wake.geometry.attributes.opacity;assert.ok(Array.from(o.array).some(n=>n>0));
 const oldX=p.getX(10);start.x+=70;world.update(1/60,start,-Math.PI/2,30,false);assert.ok(Math.abs(p.getX(10)-oldX)<.001);
 for(let i=0;i<700;i++)world.update(1/60,start,0,30,false);assert.ok(Array.from(o.array).every(n=>n===0));
 world.update(1/60,new T.Vector3(start.x+600,1,start.z),0,0,false);assert.ok(Array.from(o.array).every(n=>n===0));
});
test('lacquer has a smooth independent clearcoat while fabric and cavity shading stay distinct',()=>{
 const normal=new T.Texture(),rough=new T.Texture(),paint=new T.MeshPhysicalMaterial({name:'Hull lacquer',normalMap:normal,roughnessMap:rough,roughness:.6});paint.normalScale.set(.38,.38);
 prepareAircraftSurface(paint,true);assert.ok(paint.clearcoat>=.3&&paint.clearcoat<=.6);assert.ok(paint.clearcoatRoughness>=.16&&paint.clearcoatRoughness<=.24);assert.ok(paint.roughness>=.8);assert.equal(paint.clearcoatNormalMap,null);assert.ok(paint.normalScale.x<.25);assert.equal(paint.metalness,0);assert.equal(paint.vertexColors,false);
 const fabric=new T.MeshPhysicalMaterial({name:'M5 wing fabric',clearcoat:.8});prepareAircraftSurface(fabric,false);assert.equal(fabric.clearcoat,0);assert.ok(fabric.roughness>=.85&&fabric.roughness<=1);
 paint.dispose();fabric.dispose();normal.dispose();rough.dispose();
});

test('imported steel and fabric become physical surfaces while keeping texture ownership and material flags',()=>{
 const texture=new T.Texture(),source=new T.MeshStandardMaterial({name:'M5 brushed alloy',map:texture,roughness:.4,metalness:.8,side:T.DoubleSide}),material=physicalAircraftMaterial(source) as T.MeshPhysicalMaterial;
 assert.ok(material instanceof T.MeshPhysicalMaterial);assert.equal(material.map,texture);assert.equal(material.side,T.DoubleSide);assert.ok('PHYSICAL' in material.defines);prepareAircraftSurface(material,false);assert.ok(material.anisotropy>0);assert.equal(material.clearcoat,0);assert.equal(physicalAircraftMaterial(material),material);source.dispose();material.dispose();texture.dispose();
});
