import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {FlightGate} from '../src/missions/FlightGate.ts';
import {route,MissionManager} from '../src/missions/MissionManager.ts';
import {RouteVisual} from '../src/missions/RouteVisual.ts';
import {RaceManager,raceCourse} from '../src/race/RaceManager.ts';
import {RaceVisual} from '../src/race/RaceVisual.ts';

test('glowing gates preserve the real crossing plane, radius, depth occlusion and transparent centre',()=>{
 const gate=new FlightGate(route[0],0xffc56b);
 assert.ok(gate.root.position.equals(route[0].position));assert.equal(gate.root.scale.x,route[0].radius);
 assert.ok(new T.Vector3(0,0,1).applyQuaternion(gate.root.quaternion).distanceTo(route[0].normal)<1e-6);
 gate.root.traverse(o=>{if(o instanceof T.Mesh){assert.equal(o.material.depthWrite,false);assert.equal(o.material.depthTest,true);}});
 gate.dispose();
});
test('mission reveals only the current gate and removes all gates on completion or reset',()=>{
 const mission=new MissionManager(),visual=new RouteVisual();mission.start();
 for(let i=0;i<route.length;i++){mission.index=i;visual.update(mission,10+i);assert.deepEqual(visual.root.children.map(g=>g.visible),route.map((_,j)=>j===i));visual.pass(i);}
 mission.state='COMPLETED';visual.update(mission,20);assert.ok(visual.root.children.every(g=>!g.visible));
 mission.reset();visual.reset();visual.update(mission,21);assert.ok(visual.root.children.every(g=>!g.visible));
});
test('race shows exactly one gate across lap boundaries and none after completion',()=>{
 const race=new RaceManager(),visual=new RaceVisual();race.state='RUNNING';
 for(let lap=0;lap<3;lap++)for(let i=0;i<raceCourse.length;i++){race.index=i;visual.update(race,lap*10+i);assert.deepEqual(visual.root.children.map(g=>g.visible),raceCourse.map((_,j)=>j===i));visual.pass(i);}
 race.state='COMPLETED';visual.update(race,40);assert.ok(visual.root.children.every(g=>!g.visible));
 race.reset();visual.reset();visual.update(race,41);assert.ok(visual.root.children.every(g=>!g.visible));
});
