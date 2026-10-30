import * as T from 'three';
import {random} from './WorldConfig.ts';
import type {Ocean} from './Ocean.ts';
interface WakeSample{x:number;z:number;sideX:number;sideZ:number;age:number;strength:number}
/** Wake history stays in world space after takeoff; spray follows gravity instead of the aircraft. */
export class WaterInteraction{
 readonly root=new T.Group();private samples:WakeSample[]=[];private emission=0;private dropEmission=0;private rng=random(731);private last=new T.Vector3(Infinity,0,0);private wasOnWater=false;
 private positions=new Float32Array(700*3);private velocities=new Float32Array(700*3);private ages=new Float32Array(700).fill(10);private alpha=new Float32Array(700);private cursor=0;
 private drops:T.Points;private wake:T.Mesh;private wakePositions=new Float32Array(80*4*2*3);private wakeOpacity=new Float32Array(80*4*2);private wakeEdge=new Float32Array(80*4*2);
 private ocean:Ocean;private impactTime=10;private rings:T.Mesh<T.RingGeometry,T.MeshBasicMaterial>[]=[];private impactCenters:T.Vector2[]=[];
 constructor(ocean:Ocean){this.ocean=ocean;
  for(let i=0;i<2;i++){const g=new T.RingGeometry(.75,1,48,1);g.rotateX(-Math.PI/2);const ring=new T.Mesh(g,new T.MeshBasicMaterial({color:0xdcefe4,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide}));ring.frustumCulled=false;ring.visible=false;ring.name='Touchdown expanding foam';this.rings.push(ring);this.root.add(ring);}
  this.root.name='Water interaction / persistent Kelvin wake and ballistic spray';
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(this.positions,3).setUsage(T.DynamicDrawUsage));geometry.setAttribute('opacity',new T.BufferAttribute(this.alpha,1).setUsage(T.DynamicDrawUsage));
  this.drops=new T.Points(geometry,new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{},vertexShader:`#include <common>
#include <logdepthbuf_pars_vertex>
attribute float opacity;varying float vOpacity;void main(){vOpacity=opacity;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;gl_PointSize=clamp(35./max(1.,-mvPosition.z),1.2,5.);
#include <logdepthbuf_vertex>
}`,fragmentShader:`#include <logdepthbuf_pars_fragment>
varying float vOpacity;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.||vOpacity<.005)discard;gl_FragColor=vec4(.8,.94,1.,(1.-r*r)*vOpacity*.7);
#include <logdepthbuf_fragment>
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`}));this.drops.frustumCulled=false;this.drops.name='Hull and float spray / gravity particles';this.root.add(this.drops);
  const geo=new T.BufferGeometry(),indices:number[]=[];for(let strip=0;strip<4;strip++)for(let i=0;i<79;i++){const k=strip*160+i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}geo.setIndex(indices);geo.setAttribute('position',new T.BufferAttribute(this.wakePositions,3).setUsage(T.DynamicDrawUsage));geo.setAttribute('opacity',new T.BufferAttribute(this.wakeOpacity,1).setUsage(T.DynamicDrawUsage));for(let i=0;i<this.wakeEdge.length;i++)this.wakeEdge[i]=i%2;geo.setAttribute('foamEdge',new T.BufferAttribute(this.wakeEdge,1));
  this.wake=new T.Mesh(geo,new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,vertexShader:`#include <common>
#include <logdepthbuf_pars_vertex>
attribute float opacity;attribute float foamEdge;varying float vOpacity;varying float vEdge;varying vec3 vFoamWorld;void main(){vOpacity=opacity;vEdge=foamEdge;vFoamWorld=position;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
#include <logdepthbuf_vertex>
}`,fragmentShader:`#include <logdepthbuf_pars_fragment>
varying float vOpacity;varying float vEdge;varying vec3 vFoamWorld;void main(){if(vOpacity<.005)discard;float edge=1.-pow(abs(vEdge*2.-1.),1.4);float churn=.5+.5*sin(vFoamWorld.x*3.+sin(vFoamWorld.z*2.7))*sin(vFoamWorld.z*4.1+vFoamWorld.x);float footprint=max(length(dFdx(vFoamWorld.xz)),length(dFdy(vFoamWorld.xz)));churn=mix(.5,churn,1.-smoothstep(.25,1.4,footprint));float alpha=vOpacity*edge*smoothstep(.1,.85,churn)*.58;gl_FragColor=vec4(.63,.79,.77,alpha);
#include <logdepthbuf_fragment>
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`}));this.wake.frustumCulled=false;this.wake.name='World-space wake / spreading foam ribbons';this.root.add(this.wake);
 }
 private emit(x:number,y:number,z:number,vx:number,vy:number,vz:number){const i=this.cursor++%700,k=i*3;this.positions[k]=x;this.positions[k+1]=y;this.positions[k+2]=z;this.velocities[k]=vx;this.velocities[k+1]=vy;this.velocities[k+2]=vz;this.ages[i]=0;}
 reset(){this.samples=[];this.ages.fill(10);this.alpha.fill(0);this.wakeOpacity.fill(0);this.emission=this.dropEmission=0;this.wasOnWater=false;this.impactTime=10;for(const ring of this.rings)ring.visible=false;}
 update(dt:number,position:T.Vector3,heading:number,speed:number,onWater:boolean,impact:number,aircraft:string){
  if(position.distanceToSquared(this.last)>300**2)this.reset();this.last.copy(position);dt=Math.min(dt,.05);
  const twinFloat=['mc72','s6','gloster6','m67'].includes(aircraft),floatSpan=({mc72:1.18,s6:1.32,gloster6:1.16,m67:1.4} as Record<string,number>)[aircraft]??3.65;
  const profile=aircraft==='m5'?{spray:.70,spread:.75}:twinFloat?{spray:1.10,spread:.9}:{spray:1,spread:1};
  const sx=Math.cos(heading),sz=-Math.sin(heading),fx=-Math.sin(heading),fz=-Math.cos(heading);
  if(onWater&&!this.wasOnWater&&impact>.08){this.impactTime=0;this.impactCenters=(twinFloat?[-1,1]:[0]).map(side=>new T.Vector2(position.x+sx*side*floatSpan,position.z+sz*side*floatSpan));}
  this.impactTime+=dt;
  this.rings.forEach((ring,index)=>{const center=this.impactCenters[index];ring.visible=!!center&&this.impactTime<2.2;if(!ring.visible||!center)return;const radius=1+this.impactTime*5;const attr=ring.geometry.attributes.position;for(let i=0;i<attr.count;i++){const angle=i%49/48*Math.PI*2,r=i<49?radius*.78:radius,x=center.x+Math.cos(angle)*r,z=center.y-Math.sin(angle)*r;attr.setXYZ(i,x,this.ocean.heightAt(x,z)+.16,z);}attr.needsUpdate=true;ring.material.opacity=.24*Math.pow(1-this.impactTime/2.2,2);});
  for(const s of this.samples)s.age+=dt;this.samples=this.samples.filter(s=>s.age<11);
  if(onWater&&speed>2){this.emission+=dt;while(this.emission>=.14){this.emission-=.14;this.samples.unshift({x:position.x-fx*2,z:position.z-fz*2,sideX:sx,sideZ:sz,age:0,strength:Math.min(.5,speed/55)});if(this.samples.length>80)this.samples.pop();}}
  else this.emission=0;
  this.wakeOpacity.fill(0);const lastSample=this.samples[this.samples.length-1],tailHeight=lastSample?this.ocean.heightAt(lastSample.x,lastSample.z)+.075:position.y;
  // Every strip starts at the most recent valid sample; unused vertices cannot bridge to origin.
  for(let strip=0;strip<4;strip++)for(let i=this.samples.length;i<80;i++)for(let edge=0;edge<2;edge++){
   const k=(strip*160+i*2+edge)*3,last=lastSample;this.wakePositions[k]=last?.x??position.x;this.wakePositions[k+1]=tailHeight;this.wakePositions[k+2]=last?.z??position.z;
  }
  for(let i=0;i<this.samples.length;i++){
   const s=this.samples[i],surface=this.ocean.surfaceAt(s.x,s.z),fade=(1-s.age/11)*Math.min(1,s.age*5)*s.strength;
   for(let strip=0;strip<4;strip++)for(let edge=0;edge<2;edge++){
    const side=strip%2===0?-1:1,outer=strip>=2,offset=side*((outer||twinFloat?floatSpan+(outer?.20:0):1)+s.age*(outer?.5:.95)*profile.spread),width=.30+s.age*.16;
    const delta=offset+(edge?width:-width),x=s.x+s.sideX*delta,z=s.z+s.sideZ*delta,k=strip*160+i*2+edge;
    this.wakePositions[k*3]=x;this.wakePositions[k*3+1]=surface.height+surface.dx*(x-s.x)+surface.dz*(z-s.z)+.075;this.wakePositions[k*3+2]=z;this.wakeOpacity[k]=fade*(outer&&aircraft==='m5'?.3:1);
   }
  }
  (this.wake.geometry.attributes.position as T.BufferAttribute).needsUpdate=true;(this.wake.geometry.attributes.opacity as T.BufferAttribute).needsUpdate=true;
  if(onWater){const rate=speed>4?Math.min(250,(speed*4+impact*100)*profile.spray):0;this.dropEmission+=dt*rate;let count=Math.floor(this.dropEmission);this.dropEmission-=count;if(!this.wasOnWater)count+=Math.round(impact*100);
   for(let j=0;j<count;j++){const side=this.rng()<.5?-1:1,float=this.rng()<.28,offset=side*(float||twinFloat?floatSpan:.9),x=position.x+sx*offset+fx*(1+this.rng()),z=position.z+sz*offset+fz*(1+this.rng()),y=this.ocean.heightAt(x,z)+.13;const outward=(.5+this.rng()*1.7)*(1+speed*.04);
    this.emit(x,y,z,fx*speed*.45+sx*side*outward,1+this.rng()*(1+speed*.055+impact*3),fz*speed*.45+sz*side*outward);
   }
  }
  this.wasOnWater=onWater;
  for(let i=0;i<700;i++){const k=i*3;this.ages[i]+=dt;if(this.ages[i]>1.8){this.alpha[i]=0;continue;}this.velocities[k+1]-=9.81*dt;for(let n=0;n<3;n++)this.positions[k+n]+=this.velocities[k+n]*dt;this.alpha[i]=Math.max(0,1-this.ages[i]/1.8);if(this.positions[k+1]<-.8){this.ages[i]=10;this.alpha[i]=0;}}
  (this.drops.geometry.attributes.position as T.BufferAttribute).needsUpdate=true;(this.drops.geometry.attributes.opacity as T.BufferAttribute).needsUpdate=true;
 }
}
