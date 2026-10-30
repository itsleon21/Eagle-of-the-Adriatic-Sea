import {test} from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {CloudVolumes} from '../src/rendering/CloudVolumes.ts';import {cloudCells} from '../src/rendering/CloudLayout.ts';import {PackedSunShadows} from '../src/rendering/PackedSunShadows.ts';
test('clouds occupy genuinely three-dimensional density bounds at varied altitudes and sizes',()=>{
 const scene=new T.Scene(),clouds=new CloudVolumes(scene),mesh=clouds.mesh;
 assert.equal(mesh.isInstancedMesh,true);assert.equal(mesh.count,cloudCells.length);assert.ok(new Set(cloudCells.map(c=>Math.round(c.y/100))).size>9);assert.ok(Math.max(...cloudCells.map(c=>c.ry))>500);
 const material=mesh.material as T.ShaderMaterial,map=material.uniforms.densityMap.value as T.Data3DTexture;assert.ok(map.isData3DTexture);assert.equal(map.image.depth,48);assert.ok(map.image.data.length===48**3);
 const old=material.uniforms.cloudTime.value;clouds.update(0,.8,.8,.98,3800);assert.equal(material.uniforms.cloudTime.value,old);clouds.update(1,.8,.8,.98,3800);assert.ok(material.uniforms.cloudTime.value>old);clouds.dispose();assert.equal(scene.children.length,0);
});
test('sun shadows use packed RGBA depth, preserve surface hooks, and shade direct illumination',()=>{
 const shadows=new PackedSunShadows(),root=new T.Group(),material=new T.MeshPhysicalMaterial();let hooked=false;material.onBeforeCompile=()=>{hooked=true;};const mesh=new T.Mesh(new T.BoxGeometry(),material);mesh.receiveShadow=true;root.add(mesh);shadows.prepare(root);
 const shader={vertexShader:T.ShaderLib.physical.vertexShader,fragmentShader:T.ShaderLib.physical.fragmentShader,uniforms:{}};material.onBeforeCompile(shader as never,{} as T.WebGLRenderer);assert.equal(hooked,true);
 assert.ok(shader.fragmentShader.includes('reflectedLight.directSpecular*=packedVisibility'));assert.ok(!shader.fragmentShader.includes('interleavedGradientNoise'));assert.ok(shader.fragmentShader.includes('packedSunNear'));assert.ok(shader.fragmentShader.includes('cloudShadowMap'));
 assert.equal(shadows.uniforms.packedSunNear.value.type,T.UnsignedByteType);assert.equal(shadows.uniforms.packedSunNear.value.format,T.RGBAFormat);shadows.dispose();mesh.geometry.dispose();material.dispose();
});

test('high clouds form thin elevated banks while low cumulus and midlevel towers have distinct volumes',()=>{
 const low=cloudCells.filter(c=>c.layer===0),middle=cloudCells.filter(c=>c.layer===1),high=cloudCells.filter(c=>c.layer===2);
 assert.ok(low.length>=8&&middle.length>=6&&high.length>=6);
 for(const c of low){assert.ok(c.y-c.ry>200&&c.y+c.ry<1800);}
 for(const c of middle){assert.ok(c.ry>500&&c.y+c.ry>1900);}
 for(const c of high){assert.ok(c.y-c.ry>2800);assert.ok(c.rx/c.ry>5);assert.ok(Math.hypot(c.x,c.z)>=6500);}
});
