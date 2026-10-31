import * as T from 'three';
import type {Checkpoint} from './MissionManager.ts';

/** Local, depth-tested glow: no full-screen bloom, flickering noise or opaque disc. */
export class FlightGate {
 readonly root=new T.Group();
 private core:T.Mesh<T.TorusGeometry,T.MeshBasicMaterial>;
 private glow:T.Mesh<T.PlaneGeometry,T.ShaderMaterial>;
 private passedAt=-Infinity;
 private time=0;
 constructor(point:Checkpoint,color:number,flashing=false){
  this.root.name='Luminous flight gate / '+point.name;
  this.root.position.copy(point.position);
  this.root.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),point.normal.clone().normalize());
  this.core=new T.Mesh(new T.TorusGeometry(1,.009,8,128),new T.MeshBasicMaterial({
   color:0xffedc6,transparent:true,opacity:0,depthWrite:false,toneMapped:false,
  }));
  this.glow=new T.Mesh(new T.PlaneGeometry(3,3),new T.ShaderMaterial({
   uniforms:{flashing:{value:flashing?1:0},time:{value:0},strength:{value:0},passed:{value:-1},tint:{value:new T.Color(color)}},
   transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false,
   vertexShader:`#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 gatePosition;varying float gateDepth;
void main(){gatePosition=position.xy;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gateDepth=-mvPosition.z;gl_Position=projectionMatrix*mvPosition;
#include <logdepthbuf_vertex>
}`,
   fragmentShader:`#include <common>
#include <logdepthbuf_pars_fragment>
uniform float time,strength,passed,flashing;uniform vec3 tint;varying vec2 gatePosition;varying float gateDepth;
void main(){
 float r=length(gatePosition),a=atan(gatePosition.y,gatePosition.x);
 float aa=max(fwidth(r),.0012);
 float pulse=mix(.88+.12*sin(time*2.2),.78+.62*pow(.5+.5*sin(time*6.2831853*1.25),3.),flashing);
 float band=exp(-pow((r-1.)/.037,2.));
 float halo=exp(-pow((r-1.)/.105,2.))*.20;
 float filament=1.-smoothstep(.004,.004+aa,abs(r-1.));
 // Two broad travelling arcs, with a short bright leading edge.
 float phase=fract(a/6.2831853-time*.13);
 float sweep=pow(.5+.5*cos(phase*12.5663706),14.);
 float ticks=pow(.5+.5*cos(a*32.),30.)*exp(-pow((r-1.065)/.012,2.));
 float light=(halo+band*(.30+.85*sweep)+filament*.7+ticks*.25)*strength*pulse*mix(1.,1.45,flashing);
 vec3 hue=tint;
 if(passed>=0.){
  float life=clamp(passed/1.15,0.,1.);
  float waveRadius=1.+life*.30;
  float wave=exp(-pow((r-waveRadius)/(.016+life*.027),2.));
  float sparks=pow(.5+.5*cos(a*48.+life*1.2),36.);
  light=(wave*(.65+sparks*.8)+exp(-pow((r-1.)/.065,2.))*.4)*(1.-life)*(1.-life);
  hue=vec3(.40,1.,.76);
 }
 float horizon=exp(-max(gateDepth,0.)*.000055);
 float alpha=clamp(light*horizon,0.,.95);
 if(alpha<.003)discard;
 gl_FragColor=vec4(mix(hue,vec3(1.),filament*.30),alpha);
#include <logdepthbuf_fragment>
#include <colorspace_fragment>
}`,
  }));
  this.root.scale.setScalar(point.radius);
  this.core.name='Warm luminous rim';this.glow.name='Flowing arcs / soft halo / crossing wave';
  this.root.add(this.core,this.glow);this.root.visible=false;
 }
 pass(){this.passedAt=this.time;}
 reset(){this.passedAt=-Infinity;this.root.visible=false;}
 update(time:number,active:boolean,preview:boolean){
  this.time=time;const age=time-this.passedAt,passing=age>=0&&age<1.15;
  this.root.visible=active||preview||passing;
  if(!this.root.visible)return;
  this.core.material.opacity=passing?.85*(1-age/1.15):active?.86:.18;
  this.glow.material.uniforms.time.value=time;
  this.glow.material.uniforms.strength.value=active?1:.18;
  this.glow.material.uniforms.passed.value=passing?age:-1;
 }
 dispose(){this.core.geometry.dispose();this.core.material.dispose();this.glow.geometry.dispose();this.glow.material.dispose();}
}
