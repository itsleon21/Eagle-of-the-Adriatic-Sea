import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {headingDegrees,headingDirection,coordinateLabel,compassMarks} from '../src/ui/NavigationReadout.ts';
test('heading is correct at cardinals and remains continuous over repeated full turns',()=>{
 for(const turns of[-12,-1,0,3,20])for(const [yaw,label,angle] of [[0,'N',0],[-Math.PI/2,'E',90],[-Math.PI,'S',180],[Math.PI/2,'W',270]] as const){const value=headingDegrees(yaw+turns*Math.PI*2);const distance=Math.abs(((value-angle+540)%360)-180);assert.ok(distance<1e-9);assert.equal(headingDirection(value),label);}
 assert.equal(headingDirection(359),'N');assert.equal(headingDirection(45),'NE');assert.equal(headingDirection(225),'SW');
 const marks=compassMarks();for(const heading of[0,.1,44.9,180,359.99]){const visible=marks.filter(m=>Math.abs(m.degree-heading)<35);assert.ok(visible.length>=13);assert.ok(visible.some(m=>m.label));}
 assert.equal(coordinateLabel(-2400),'−2,400 m');assert.equal(coordinateLabel(99.6),'+100 m');
});
test('every aircraft exports its detailed fittings and movable nodes without enlarging the asset budget',()=>{
 for(const file of['aircraft','m5','mc72']){const data=readFileSync(new URL(`../public/models/${file}.glb`,import.meta.url)),g=JSON.parse(data.toString('utf8',20,20+data.readUInt32LE(12))),root=g.nodes.find((n:{name:string})=>n.name==='AircraftRoot');assert.match(root.extras.detail_revision,/v019/);for(const node of['PropellerPivot','LeftAileron','RightAileron','Elevator','Rudder'])assert.ok(g.nodes.some((n:{name:string})=>n.name===node));assert.ok(data.byteLength<12*1024*1024);}
});

test('imported tangent frames recover from collapsed cap UVs without disturbing valid skin normals',async()=>{
 const T=await import('three'),{repairAircraftTangents}=await import('../src/rendering/AircraftGeometry.ts');
 const g=new T.BufferGeometry();g.setAttribute('normal',new T.Float32BufferAttribute([1,0,0,0,1,0,0,0,1],3));g.setAttribute('tangent',new T.Float32BufferAttribute([1,0,0,-1,1,0,0,1,NaN,0,0,1],4));const before=Array.from(g.attributes.normal.array);
 assert.equal(repairAircraftTangents(g),2);assert.deepEqual(Array.from(g.attributes.normal.array),before);
 for(let i=0;i<3;i++){const n=new T.Vector3().fromBufferAttribute(g.attributes.normal,i),t=new T.Vector3().fromBufferAttribute(g.attributes.tangent,i);assert.ok(Math.abs(n.dot(t))<1e-6);assert.ok(Math.abs(t.length()-1)<1e-6);}
 assert.equal(g.attributes.tangent.getW(0),-1);assert.equal(repairAircraftTangents(g),0);g.dispose();
});

test('source aircraft with normal maps export finite perpendicular tangent frames, including wing end caps',()=>{
 for(const file of['aircraft','m5','mc72']){
  const data=readFileSync(new URL(`../public/models/${file}.glb`,import.meta.url)),length=data.readUInt32LE(12),g=JSON.parse(data.toString('utf8',20,20+length)),binary=28+length;
  const value=(a:number,i:number,k:number,size:number)=>{const accessor=g.accessors[a],v=g.bufferViews[accessor.bufferView];return data.readFloatLE(binary+(v.byteOffset??0)+(accessor.byteOffset??0)+i*(v.byteStride??size*4)+k*4);};
  let checked=0;
  for(const mesh of g.meshes)for(const p of mesh.primitives){if(!g.materials[p.material].normalTexture)continue;assert.ok(p.attributes.TEXCOORD_0!==undefined);assert.ok(p.attributes.TANGENT!==undefined);const n=p.attributes.NORMAL,t=p.attributes.TANGENT;for(let i=0;i<g.accessors[n].count;i++){let dot=0,norm=0;for(let k=0;k<3;k++){const a=value(n,i,k,3),b=value(t,i,k,4);assert.ok(Number.isFinite(a+b));dot+=a*b;norm+=a*a;}if(norm>.1)assert.ok(Math.abs(dot)<.01,`${file} tangent normal alignment ${dot}`);checked++;}}
  assert.ok(checked>100);
 }
});

test('target bearing shares the compass scale and stays continuous across north and complete turns',async()=>{
 const {targetBearing,navigationDistance}=await import('../src/ui/NavigationReadout.ts');
 const target=(degrees:number)=>({name:'目标',kind:'mission' as const,position:{x:Math.sin(degrees*Math.PI/180)*1000,y:100,z:-Math.cos(degrees*Math.PI/180)*1000}});
 for(const turns of[-8,0,12]){
  const forward=targetBearing(-359*Math.PI/180+turns*2*Math.PI,0,0,target(1),160);
  assert.ok(Math.abs(forward.delta-2)<1e-8);assert.ok(Math.abs(forward.offset-12)<1e-7);assert.equal(forward.edge,'ahead');
  const left=targetBearing(-Math.PI/180+turns*2*Math.PI,0,0,target(359),160);
  assert.ok(Math.abs(left.delta+2)<1e-8);assert.ok(Math.abs(left.offset+12)<1e-7);
 }
 assert.equal(navigationDistance(720),'720 m');assert.equal(navigationDistance(1250),'1.3 km');
});

test('offscreen and rear targets stay on the correct edge at desktop and compact compass widths',async()=>{
 const {targetBearing}=await import('../src/ui/NavigationReadout.ts');
 for(const halfWidth of[75,140,174])for(const [x,z,edge] of[[1000,0,'right'],[-1000,0,'left'],[200,1000,'right'],[-200,1000,'left']] as const){
  const aim=targetBearing(0,0,0,{name:'航门',kind:'race',position:{x,y:100,z}},halfWidth);
  assert.equal(aim.edge,edge);assert.equal(Math.abs(aim.offset),halfWidth-12);
 }
 const overhead=targetBearing(-Math.PI/2,20,30,{name:'栈桥',kind:'commission',position:{x:20,y:0,z:30}},90);
 assert.ok(Number.isFinite(overhead.bearing));assert.equal(overhead.delta,0);assert.equal(overhead.offset,0);
});
