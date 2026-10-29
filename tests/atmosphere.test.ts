import {test} from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {CloudVolumes} from '../src/rendering/CloudVolumes.ts';import {cloudCells} from '../src/rendering/CloudLayout.ts';import {PackedSunShadows} from '../src/rendering/PackedSunShadows.ts';
test('clouds occupy genuinely three-dimensional density bounds at varied altitudes and sizes',()=>{
 const scene=new T.Scene(),clouds=new CloudVolumes(scene),mesh=clouds.mesh;
 assert.equal(mesh.isInstancedMesh,true);assert.equal(mesh.count,32);assert.ok(new Set(cloudCells.map(c=>Math.round(c.y/100))).size>9);assert.ok(Math.max(...cloudCells.map(c=>c.ry))>500);
 const material=mesh.material as T.ShaderMaterial,map=material.uniforms.densityMap.value as T.Data3DTexture;assert.ok(map.isData3DTexture);assert.equal(map.image.depth,48);assert.ok(map.image.data.length===48**3);
 const old=material.uniforms.cloudTime.value;clouds.update(0,.8,.8,.98,3800);assert.equal(material.uniforms.cloudTime.value,old);clouds.update(1,.8,.8,.98,3800);assert.ok(material.uniforms.cloudTime.value>old);clouds.dispose();assert.equal(scene.children.length,0);
});
test('sun shadows use packed RGBA depth, preserve surface hooks, and shade direct illumination',()=>{
 const shadows=new PackedSunShadows(),root=new T.Group(),material=new T.MeshPhysicalMaterial();let hooked=false;material.onBeforeCompile=()=>{hooked=true;};const mesh=new T.Mesh(new T.BoxGeometry(),material);mesh.receiveShadow=true;root.add(mesh);shadows.prepare(root);
 const shader={vertexShader:T.ShaderLib.physical.vertexShader,fragmentShader:T.ShaderLib.physical.fragmentShader,uniforms:{}};material.onBeforeCompile(shader as never,{} as T.WebGLRenderer);assert.equal(hooked,true);
 assert.ok(shader.fragmentShader.includes('reflectedLight.directSpecular*=packedVisibility'));assert.ok(!shader.fragmentShader.includes('interleavedGradientNoise'));assert.ok(shader.fragmentShader.includes('packedSunNear'));assert.ok(shader.fragmentShader.includes('cloudShadowMap'));
 assert.equal(shadows.uniforms.packedSunNear.value.type,T.UnsignedByteType);assert.equal(shadows.uniforms.packedSunNear.value.format,T.RGBAFormat);shadows.dispose();mesh.geometry.dispose();material.dispose();
});
