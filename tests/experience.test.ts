import {test} from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {AdaptiveQuality} from '../src/rendering/AdaptiveQuality.ts';import {RaceGhost,parseGhost} from '../src/race/RaceGhost.ts';
test('automatic quality waits for reliable sustained load, then holds a cooldown',()=>{const a=new AdaptiveQuality();for(let i=0;i<20;i++)assert.equal(a.update(1,50,20,'high'),undefined);for(let i=0;i<5;i++)assert.equal(a.update(1,40,100,'high'),undefined);assert.equal(a.update(1,40,100,'high'),'balanced');for(let i=0;i<19;i++)assert.equal(a.update(1,40,100,'balanced'),undefined);assert.equal(a.update(0,40,100,'balanced'),undefined);});
test('ghost run validates data, keeps only complete faster runs and interpolates without physics',()=>{
 const ghost=new RaceGhost('s6'),q=new T.Quaternion(),sectors=Array.from({length:12},(_,i)=>i+1);
 for(let i=0;i<=120;i++)ghost.record(i/10,new T.Vector3(i/10,140,0),q,i===120,sectors);
 assert.ok(ghost.best);assert.equal(ghost.best.time,12);assert.ok(parseGhost(JSON.stringify(ghost.best)));const scene=new T.Scene(),source=new T.Group();source.add(new T.Mesh(new T.BoxGeometry(),new T.MeshBasicMaterial()));ghost.attach(source,scene);ghost.show(6,true);assert.equal(scene.children[0].visible,true);assert.ok(Math.abs(scene.children[0].position.x-6)<.001);ghost.show(6,false);assert.equal(scene.children[0].visible,false);ghost.reset();assert.equal(ghost.best.time,12);
 ghost.record(0,new T.Vector3(),q,false,[]);ghost.record(20,new T.Vector3(),q,true,sectors.map(t=>t*20/12));assert.equal(ghost.best.time,12);ghost.enabled=false;ghost.show(2,true);assert.equal(scene.children[0].visible,false);ghost.dispose();assert.equal(scene.children.length,0);
 const bad=structuredClone(ghost.best);bad.frames[1].p[0]=Infinity;assert.equal(parseGhost(JSON.stringify(bad)),undefined);assert.equal(parseGhost('{'),undefined);const wrong=structuredClone(ghost.best);wrong.sectors=[1,2];assert.equal(parseGhost(JSON.stringify(wrong)),undefined);
});

test('touchdown foam uses separate float contacts, follows waves and expires on reset',async()=>{
 const {Ocean}=await import('../src/world/Ocean.ts'),{WaterInteraction}=await import('../src/world/WaterInteraction.ts'),{harborRunway}=await import('../src/world/WorldConfig.ts');const sea=new Ocean(),fx=new WaterInteraction(sea),p=new T.Vector3(harborRunway.x,2,harborRunway.z);fx.update(1/60,p,0,45,true,1,'m67');const rings=fx.root.children.filter(o=>o.name==='Touchdown expanding foam') as T.Mesh[];assert.equal(rings.filter(r=>r.visible).length,2);for(const r of rings)for(const v of r.geometry.attributes.position.array)assert.ok(Number.isFinite(v));for(let i=0;i<150;i++)fx.update(1/60,p,0,0,false,0,'m67');assert.ok(rings.every(r=>!r.visible));fx.reset();assert.ok(rings.every(r=>!r.visible));sea.dispose();
});

import {remapPitchKeys} from '../src/aircraft/ControlPreferences.ts';
test('pitch hint remapping preserves the Supermarine S.6 name',()=>{assert.equal(remapPitchKeys('Supermarine S.6 · W 抬头 / S 低头',true),'Supermarine S.6 · S 抬头 / W 低头');});
