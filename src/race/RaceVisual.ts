import * as T from 'three';
import {raceCourse} from './RaceManager.ts';
import type {RaceManager} from './RaceManager.ts';
import {FlightGate} from '../missions/FlightGate.ts';
export class RaceVisual{
 readonly root=new T.Group();
 private gates=raceCourse.map((point,i)=>new FlightGate(point,i===0?0xffc56b:0x73f1dc));
 constructor(){this.root.name='Race / luminous course gates';this.root.add(...this.gates.map(g=>g.root));}
 pass(index:number){this.gates[index]?.reset();}
 reset(){this.gates.forEach(g=>g.reset());}
 update(race:RaceManager,time:number){
  this.gates.forEach((g,i)=>g.update(time,!!race.current&&i===race.index,false));
 }
}
export class RaceFireworks{
 readonly points:T.Points;private clock=0;private playing=false;private positions:Float32Array;private velocities:Float32Array;private starts:Float32Array;
 constructor(){
  const count=1440;this.positions=new Float32Array(count*3);this.velocities=new Float32Array(count*3);this.starts=new Float32Array(count);const color=new Float32Array(count*3),geo=new T.BufferGeometry();
  for(let i=0;i<count;i++){const burst=Math.floor(i/120),a=i*2.39996,t=(i%120+.5)/120,y=1-2*t,r=Math.sqrt(1-y*y),speed=28+(i%9)*3;this.velocities.set([Math.cos(a)*r*speed,y*speed,Math.sin(a)*r*speed],i*3);this.starts[i]=burst*1.25;const c=new T.Color().setHSL((burst*.173)%1,1,.48);color.set([c.r*4,c.g*4,c.b*4],i*3);}
  geo.setAttribute('position',new T.BufferAttribute(this.positions,3));geo.setAttribute('color',new T.BufferAttribute(color,3));geo.setAttribute('sparkAge',new T.BufferAttribute(new Float32Array(count),1));
  this.points=new T.Points(geo,new T.ShaderMaterial({transparent:true,depthWrite:false,vertexColors:true,blending:T.NormalBlending,vertexShader:`#include <common>
#include <logdepthbuf_pars_vertex>
attribute float sparkAge;varying float fade;varying vec3 tint;void main(){tint=color;fade=clamp(1.-sparkAge/3.8,0.,1.);vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(4000./max(1.,-p.z),2.,7.);gl_Position=projectionMatrix*p;
#include <logdepthbuf_vertex>
}`,fragmentShader:`#include <logdepthbuf_pars_fragment>
varying float fade;varying vec3 tint;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(tint*3.,pow(1.-d,.9)*sqrt(fade));
#include <logdepthbuf_fragment>
}`}));this.points.frustumCulled=false;this.points.visible=false;this.points.name='Race completion / fireworks';
 }
 start(){this.clock=0;this.playing=true;this.points.visible=true;}
 reset(){this.playing=false;this.points.visible=false;this.clock=0;}
 update(dt:number){if(!this.playing)return;this.clock+=dt;const age=this.points.geometry.attributes.sparkAge as T.BufferAttribute;
  for(let i=0;i<this.starts.length;i++){const b=Math.floor(i/120),t=this.clock-this.starts[i],a=Math.max(0,t),active=t>=0&&t<3.8;this.positions[i*3]=raceCourse[0].position.x+(b%4-1.5)*160+this.velocities[i*3]*a;this.positions[i*3+1]=active?240+(b%3)*65+this.velocities[i*3+1]*a-7*a*a:-1000;this.positions[i*3+2]=raceCourse[0].position.z-450+(b%2)*120+this.velocities[i*3+2]*a;age.setX(i,active?a:4);}
  this.points.geometry.attributes.position.needsUpdate=true;age.needsUpdate=true;if(this.clock>19)this.reset();
 }
 dispose(){this.points.geometry.dispose();(this.points.material as T.Material).dispose();}
}
