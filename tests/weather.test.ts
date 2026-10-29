import {test} from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {WeatherController,weatherIds,weatherPresets,resolveWeather} from '../src/rendering/WeatherConfig.ts';
import {createRainStreaks} from '../src/rendering/WeatherEffects.ts';
import {createArchipelago,islands,SeaSeed,WorldBounds} from '../src/world/WorldConfig.ts';
import {addMediterraneanPlants,plantSpecies} from '../src/world/MediterraneanPlants.ts';
import {World} from '../src/world/World.ts';

test('five weather presets transition smoothly and exactly at 30, 60 and 120 FPS',()=>{
 assert.equal(weatherIds.length,5);assert.equal(resolveWeather('invalid'),'sunny');
 for(const fps of[30,60,120])for(const id of weatherIds){const w=new WeatherController();w.setAutomatic(false);w.select(id);
  for(let i=0;i<fps*8;i++){w.update(1/fps);for(const [key,value] of Object.entries(w.current)){if(key!=='tint')assert.ok(Number.isFinite(value));}assert.ok(w.current.fogNear<w.current.fogFar);assert.ok(w.current.rain>=0&&w.current.rain<=1);}
  for(const key of['rain','fogFar','coverage','sun'] as const)assert.ok(Math.abs(w.current[key]-weatherPresets[id][key])<1e-7);assert.equal(w.settled,true);
 }
});
test('automatic weather changes after its interval and its clock stops while paused',()=>{
 const w=new WeatherController();for(let i=0;i<240*10;i++)w.update(.1,false);assert.equal(w.target,'sunny');
 for(let i=0;i<212*10;i++)w.update(.1);assert.notEqual(w.target,'sunny');
 w.setAutomatic(false);w.select('fog',true);for(let i=0;i<500*10;i++)w.update(.1);assert.equal(w.target,'fog');assert.equal(w.current.fogFar,2400);
 w.select('rain');w.update(.1);const before=w.current.rain;w.select('sunny');w.update(.01);assert.ok(Math.abs(w.current.rain-before)<.001);
});
test('rain material includes native fog uniforms and lines retain paired endpoints across wrapping',()=>{
 const rain=createRainStreaks(),m=rain.material as T.ShaderMaterial,p=rain.geometry.attributes.position,tip=rain.geometry.attributes.tip;
 assert.equal(m.fog,true);for(const key of['fogColor','fogNear','fogFar','rainOpacity','rainTime','windStrength'])assert.ok(m.uniforms[key]);assert.equal(m.depthWrite,false);
 const mod=(a:number,b:number)=>((a%b)+b)%b;
 for(let i=0;i<p.count;i+=2)for(const t of[0,.01,1.99,47.3]){const a=mod(p.getY(i)-tip.getX(i)*1.7-t*32,65)-20+tip.getX(i)*1.7,b=mod(p.getY(i+1)-tip.getX(i+1)*1.7-t*32,65)-20+tip.getX(i+1)*1.7;assert.ok(Math.abs(b-a-1.7)<.00001);}
 rain.geometry.dispose();m.dispose();
});
test('seeded island scatter is reproducible, changes with seed, and preserves safe spacing',()=>{
 assert.deepEqual(createArchipelago(SeaSeed),islands);assert.notDeepEqual(createArchipelago(8418),islands);
 for(const seed of[12,81,8417,8418]){const layout=createArchipelago(seed);assert.deepEqual(layout[0],islands[0]);
  for(const d of layout)assert.ok(Math.abs(d.x)+d.rx*1.12<WorldBounds.maxX&&Math.abs(d.z)+d.rz*1.12<WorldBounds.maxZ);
  for(let i=0;i<layout.length;i++)for(let j=i+1;j<layout.length;j++)assert.ok(Math.hypot(layout[i].x-layout[j].x,layout[i].z-layout[j].z)-Math.max(layout[i].rx,layout[i].rz)*1.12-Math.max(layout[j].rx,layout[j].rz)*1.12>=1450);
 }
 assert.ok(new Set(islands.map(d=>d.x)).size===6&&new Set(islands.map(d=>d.z)).size===6);
});
test('Mediterranean biomes contain seven added species and avoid planted trees on coral cay',()=>{
 const root=new T.Group(),counts=addMediterraneanPlants(root,()=>false);
 for(const species of plantSpecies){assert.ok(root.getObjectByName(`Mediterranean vegetation / ${species}`));assert.ok(Object.values(counts).reduce((sum,c)=>sum+(c[species]??0),0)>0);}
 for(const species of['cypress','olive','holm-oak'] as const)assert.equal(counts.coral[species],0);
 assert.ok((counts.coral.tamarisk??0)>0);root.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();(o.material as T.Material).dispose();}});
});
test('all heightfield islands use smooth finite normals and continuous surface materials',()=>{
 const world=new World();let found=0;
 world.root.traverse(o=>{if(!(o instanceof T.Mesh)||!o.name.endsWith('/ continuous limestone terrain'))return;found++;const m=o.material as T.MeshStandardMaterial;assert.equal(m.flatShading,false);assert.equal(m.vertexColors,false);const n=o.geometry.attributes.normal;for(const v of n.array)assert.ok(Number.isFinite(v));});assert.equal(found,9);
});
