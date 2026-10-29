import * as T from 'three';
import {islands,terrainHeight} from './WorldConfig.ts';
/** Two rotating, finite three-dimensional light cones with a real downward spotlight. */
export class LighthouseBeacon{
 readonly root=new T.Group();private cones:T.ShaderMaterial[]=[];private lights:T.SpotLight[]=[];private lens:T.MeshStandardMaterial;private angle=0;
 constructor(){
  const d=islands.find(d=>d.id==='lighthouse')!;this.root.position.set(d.x,terrainHeight(d,d.x,d.z)+63,d.z);this.root.name='Lighthouse / rotating beacon';
  this.lens=new T.MeshStandardMaterial({color:0xffe5b0,emissive:0xffdf9a,emissiveIntensity:.1});this.root.add(new T.Mesh(new T.SphereGeometry(3,12,8),this.lens));
  for(let i=0;i<2;i++){
   const pivot=new T.Group();pivot.rotation.set(-.17,i*Math.PI,0,'YXZ');this.root.add(pivot);
   const geometry=new T.ConeGeometry(100,1200,40,1,false);geometry.translate(0,-600,0);geometry.rotateX(Math.PI/2);
   const material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.BackSide,blending:T.AdditiveBlending,uniforms:{strength:{value:0}},vertexShader:`#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vLocal;varying vec3 vEye;void main(){vLocal=position;vEye=(inverse(modelMatrix)*vec4(cameraPosition,1.)).xyz;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
#include <logdepthbuf_vertex>
}`,fragmentShader:`#include <logdepthbuf_pars_fragment>
varying vec3 vLocal;varying vec3 vEye;uniform float strength;void main(){
 vec3 ray=normalize(vLocal-vEye),safeRay=sign(ray)*max(abs(ray),vec3(.00001));vec3 a=(vec3(-100.,-100.,-1200.)-vEye)/safeRay,b=(vec3(100.,100.,0.)-vEye)/safeRay;vec3 lo=min(a,b),hi=max(a,b);float entry=max(0.,max(lo.x,max(lo.y,lo.z))),exit=min(hi.x,min(hi.y,hi.z));if(exit<=entry)discard;
 float stepSize=(exit-entry)/20.,optical=0.;for(int i=0;i<20;i++){vec3 p=vEye+ray*(entry+(float(i)+.5)*stepSize);float radius=max(.2,-p.z/12.),density=pow(max(0.,1.-length(p.xy)/radius),1.3);density*=smoothstep(-1200.,-950.,p.z)*(1.-smoothstep(-15.,0.,p.z))/(1.+pow(max(0.,-p.z)/650.,1.1));optical+=density*stepSize*.008;}
 gl_FragColor=vec4(1.,.85,.52,(1.-exp(-optical))*strength*.65);
#include <logdepthbuf_fragment>
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});const beam=new T.Mesh(geometry,material);beam.name='Rotating volumetric beacon cone';beam.renderOrder=4;pivot.add(beam);this.cones.push(material);
   const spot=new T.SpotLight(0xffe5ad,0,1400,.085,.7,2);spot.target.position.set(0,0,-1200);pivot.add(spot,spot.target);this.lights.push(spot);
  }
 }
 update(dt:number,nightness:number){this.angle=(this.angle+dt*.22)%(Math.PI*2);this.root.rotation.y=this.angle;const strength=T.MathUtils.smoothstep(nightness,.15,.75);for(const m of this.cones)m.uniforms.strength.value=strength;for(const l of this.lights)l.intensity=strength*85000;this.lens.emissiveIntensity=.2+strength*5;}
 get beamDirection(){return new T.Vector3(-Math.sin(this.angle)*Math.cos(.17),-Math.sin(.17),-Math.cos(this.angle)*Math.cos(.17));}
 get rotation(){return this.angle;}
}
