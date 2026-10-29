import {test} from 'node:test';import assert from 'node:assert/strict';import {Vector3} from 'three';
import {FlightController,neutralInput} from '../src/aircraft/FlightController.ts';import type {ManeuverId} from '../src/aircraft/FlightController.ts';
import {MC72FlightConfig,M5FlightConfig} from '../src/aircraft/FlightConfig.ts';import {ControlPreferences,pitchPreferenceKey,remapPitchKeys} from '../src/aircraft/ControlPreferences.ts';
const ready=()=>{const f=new FlightController(true,MC72FlightConfig);f.position.y=260;f.velocity.set(100,0,0);f.throttle=.8;return f;};
for(const id of ['loop','immelmann'] as ManeuverId[])test(`MC72 ${id} follows a continuous inverted flight arc and returns to manual flight`,()=>{
 const f=ready(),heading=f.heading,start=f.position.clone();f.requestManeuver(id);let inverted=false,high=0,step=0;
 for(;f.maneuver&&step<900;step++){f.update(1/60,neutralInput());inverted ||= new Vector3(0,1,0).applyQuaternion(f.orientation).y<-.8;high=Math.max(high,f.altitude);assert.ok(f.position.distanceTo(f.previousPosition)<MC72FlightConfig.maxSpeed/60+.01);assert.ok(f.orientation.angleTo(f.previousOrientation)<.05);assert.equal(f.state,'AIRBORNE');}
 assert.ok(step>300&&step<700);assert.ok(inverted);assert.ok(high>start.y+150);assert.equal(f.maneuver,null);assert.equal(f.pitch,0);assert.equal(f.bank,0);assert.ok(new Vector3(0,1,0).applyQuaternion(f.orientation).y>.999);assert.ok(Math.abs(f.heading-heading-(id==='immelmann'?Math.PI:0))<1e-8);
 f.update(1/60,{...neutralInput(),pitch:.5,roll:.5});assert.ok(f.pitch>0);assert.ok(f.bank<0);
});
test('special maneuvers enforce entry conditions, preserve collision failure and clear on reset/mooring',()=>{
 const f=ready();f.position.y=100;assert.match(f.requestManeuver('loop'),/180/);assert.equal(f.maneuver,null);f.position.y=260;f.velocity.set(70,0,0);assert.match(f.requestManeuver('loop'),/306/);f.velocity.set(100,0,0);f.bank=.4;assert.match(f.requestManeuver('loop'),/平飞/);f.bank=0;f.requestManeuver('loop');assert.equal(f.maneuver,'loop');assert.match(f.requestManeuver('immelmann'),/进行中/);
 f.position.y=0;f.update(1/60,neutralInput());assert.equal(f.state,'CRASHED');assert.equal(f.maneuver,null);
 for(const action of ['reset','moor'] as const){const g=ready();g.requestManeuver('loop');g.update(1/60,neutralInput());if(action==='reset')g.reset();else g.moorAt(0,0,0);assert.equal(g.maneuver,null);assert.equal(g.maneuverProgress,0);assert.equal(g.pitch,0);assert.equal(g.bank,0);}
 const entry=ready();for(let i=0;i<30;i++)entry.update(1/60,{...neutralInput(),pitch:.15,roll:.15});assert.ok(entry.requestManeuver('loop').includes('开始'));entry.update(1/60,neutralInput());assert.ok(entry.orientation.angleTo(entry.previousOrientation)<.05);
 const m5=new FlightController(true,M5FlightConfig);assert.match(m5.requestManeuver('loop'),/不支持/);assert.equal(m5.maneuver,null);
});
test('MC72 rolls in both directions and special flight is identical at 30/60/120 render FPS',()=>{
 for(const direction of [-1,1]){const f=ready();let inverted=false;for(let i=0;i<200;i++){f.update(1/60,{...neutralInput(),roll:direction,aerobatic:true});inverted ||= new Vector3(0,1,0).applyQuaternion(f.orientation).y<-.8;}assert.ok(inverted);assert.ok(Math.abs(f.bank)>Math.PI*2);assert.equal(f.state,'AIRBORNE');}
 const run=(fps:number)=>{const f=ready();f.requestManeuver('immelmann');let accumulator=0;for(let i=0;i<fps*8;i++){accumulator+=1/fps;while(accumulator+1e-10>=1/60){f.update(1/60,neutralInput());accumulator-=1/60;}}return f;};const reference=run(60);for(const fps of [30,120]){const f=run(fps);assert.ok(f.position.distanceTo(reference.position)<1e-8);assert.ok(f.orientation.angleTo(reference.orientation)<1e-6);}
});
test('pitch inversion persists across aircraft, changes only pitch sign and tolerates denied storage',()=>{
 assert.equal(remapPitchKeys("PILOT'S NOTES / 按 W 抬头，松开 S",true),"PILOT'S NOTES / 按 S 抬头，松开 W");
 const data=new Map<string,string>(),storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};
 const p=new ControlPreferences(storage);assert.equal(p.pitch(1,0),1);p.setInverted(true);assert.equal(data.get(pitchPreferenceKey),'true');for(let i=0;i<3;i++){const q=new ControlPreferences(storage);assert.equal(q.pitch(1,0),-1);assert.equal(q.pitch(0,1),1);assert.equal(q.pitch(1,1),0);assert.equal(q.upKey,'S');assert.equal(q.downKey,'W');}p.setInverted(false);assert.equal(new ControlPreferences(storage).inverted,false);
 const denied=new ControlPreferences({getItem(){throw Error('denied');},setItem(){throw Error('denied');}});denied.setInverted(true);assert.equal(denied.pitch(1,0),-1);
});

test('real keyboard mapping applies inversion to W/S and arrows, keeps roll/throttle, and clears on focus loss',async()=>{
 const {Input}=await import('../src/aircraft/Input.ts');const win=new EventTarget(),doc=Object.assign(new EventTarget(),{hidden:false}),actions:string[]=[];let pauses=0;
 class ElementStub extends EventTarget{tagName='DIV';}
 const previous={window:globalThis.window,document:globalThis.document,HTMLElement:globalThis.HTMLElement};
 Object.assign(globalThis,{window:win,document:doc,HTMLElement:ElementStub});
 const input=new Input(code=>actions.push(code),()=>pauses++),key=(type:string,code:string,repeat=false)=>{const event=new Event(type,{cancelable:true});Object.assign(event,{code,repeat,metaKey:false,altKey:false});win.dispatchEvent(event);};
 try{
  key('keydown','KeyW');assert.equal(input.read().pitch,1);key('keyup','KeyW');input.preferences.setInverted(true);
  key('keydown','KeyW');key('keydown','KeyD');key('keydown','ShiftLeft');assert.deepEqual(input.read(),{pitch:-1,roll:1,yaw:0,throttle:1,aerobatic:false});input.clear();key('keydown','KeyS');assert.equal(input.read().pitch,1);input.clear();key('keydown','ArrowUp');assert.equal(input.read().pitch,-1);input.clear();key('keydown','ArrowDown');assert.equal(input.read().pitch,1);
  key('keydown','KeyX');key('keydown','KeyX',true);assert.equal(actions.filter(k=>k==='KeyX').length,1);win.dispatchEvent(new Event('blur'));assert.equal(input.read().pitch,0);assert.equal(input.read().throttle,0);assert.equal(pauses,1);
  key('keydown','KeyW');doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));assert.equal(input.read().pitch,0);assert.equal(pauses,2);
 }finally{input.dispose();Object.assign(globalThis,previous);}
});
