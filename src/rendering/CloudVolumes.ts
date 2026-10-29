import * as T from 'three';
import {cloudCells} from './CloudLayout.ts';
import {random} from '../world/WorldConfig.ts';
/** Three-dimensional density, integrated through irregular ellipsoidal cloud bounds.
 * Clouds have real altitude and thickness. Turning or flying above them changes their silhouette. */
export class CloudVolumes {
 readonly mesh:T.InstancedMesh;
 private texture:T.Data3DTexture;private time={value:0};private coverage={value:.38};private rain={value:0};private sun={value:3.1};private visibility={value:16000};
 constructor(scene:T.Scene){
  const size=48,rng=random(808),data=new Uint8Array(size**3),coarse=new Float32Array(12**3);for(let i=0;i<coarse.length;i++)coarse[i]=rng();
  const sample=(x:number,y:number,z:number)=>coarse[((z+12)%12)*144+((y+12)%12)*12+(x+12)%12];
  for(let z=0;z<size;z++)for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const q=[x/4,y/4,z/4],f=q.map(v=>{v-=Math.floor(v);return v*v*(3-2*v);}),b=q.map(Math.floor);let n=0;
   for(let k=0;k<2;k++)for(let j=0;j<2;j++)for(let i=0;i<2;i++)n+=sample(b[0]+i,b[1]+j,b[2]+k)*(i?f[0]:1-f[0])*(j?f[1]:1-f[1])*(k?f[2]:1-f[2]);
   data[z*size*size+y*size+x]=Math.round(n*255);
  }
  this.texture=new T.Data3DTexture(data,size,size,size);this.texture.format=T.RedFormat;this.texture.minFilter=this.texture.magFilter=T.LinearFilter;this.texture.wrapS=this.texture.wrapT=this.texture.wrapR=T.RepeatWrapping;this.texture.unpackAlignment=1;this.texture.needsUpdate=true;
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,side:T.BackSide,uniforms:{sceneDepth:{value:null},cloudResolution:{value:new T.Vector2(1,1)},cameraFar:{value:26000},useSceneDepth:{value:0},densityMap:{value:this.texture},cloudTime:this.time,coverage:this.coverage,rain:this.rain,sunPower:this.sun,visibility:this.visibility,probeNeutralness:{value:0},dayGain:{value:1},lightTint:{value:new T.Color(1,.91,.76)},sunDirection:{value:new T.Vector3(-.52,.64,.56).normalize()}},
   vertexShader:`#include <common>
#include <logdepthbuf_pars_vertex>
attribute float cloudIndex;varying vec3 vLocal;varying vec3 vEye;varying vec3 vSize;varying vec3 vSeed;varying float vIndex;
void main(){vec3 center=(modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).xyz;vSize=vec3(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz),length(instanceMatrix[2].xyz));vEye=(cameraPosition-center)/vSize;vLocal=position;vSeed=center*.00017;vIndex=cloudIndex;vec4 mvPosition=modelViewMatrix*instanceMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
#include <logdepthbuf_vertex>
}`,
   fragmentShader:`precision highp sampler3D;
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D sceneDepth;uniform vec2 cloudResolution;uniform float cameraFar;uniform float useSceneDepth;uniform sampler3D densityMap;uniform float cloudTime;uniform float coverage;uniform float rain;uniform float sunPower;uniform float visibility;uniform vec3 sunDirection;uniform float dayGain;uniform vec3 lightTint;uniform float probeNeutralness;
varying vec3 vLocal;varying vec3 vEye;varying vec3 vSize;varying vec3 vSeed;varying float vIndex;
float density(vec3 p){
 float base=1.-length(p*vec3(.91,1.12,.94));
 float tower=.72-length((p-vec3(-.28,.27,.02))*vec3(1.2,1.1,1.3));
 float shoulder=.62-length((p-vec3(.45,-.13,.03))*vec3(1.,1.8,1.3));
 float shape=max(base,max(tower,shoulder));
 float n=texture(densityMap,p*.55+vSeed+vec3(cloudTime*.0009,0.,0.)).r;
 float detail=texture(densityMap,p*1.7+vSeed*2.).r;
 return max(0.,shape-(1.-n)*.38-(1.-detail)*.12)*smoothstep(-.88,-.49,p.y);
}
void main(){
 float activation=clamp(coverage*32.-vIndex,0.,1.);if(activation<.005)discard;
 vec3 rd=normalize(vLocal-vEye),safeRay=sign(rd)*max(abs(rd),vec3(.00001));vec3 a=(-vec3(1.)-vEye)/safeRay,b=(vec3(1.)-vEye)/safeRay;
 vec3 lo=min(a,b),hi=max(a,b);float entry=max(0.,max(lo.x,max(lo.y,lo.z))),exit=min(hi.x,min(hi.y,hi.z));if(exit<=entry)discard;
 float sceneDistance=exp2(texture2D(sceneDepth,gl_FragCoord.xy/cloudResolution).r*log2(cameraFar+1.))-1.;
 float stepSize=(exit-entry)/16.;vec3 sunLocal=normalize(sunDirection/vSize);vec3 worldRay=normalize(rd*vSize);float forward=pow(max(0.,dot(worldRay,sunDirection)),12.);
 vec3 sum=vec3(0.);float transmittance=1.;
 for(int i=0;i<16;i++){
  vec3 p=vEye+rd*(entry+(float(i)+.5)*stepSize);if(useSceneDepth>.5&&-(viewMatrix*vec4(cameraPosition+(p-vEye)*vSize,1.)).z>sceneDistance)break;float d=density(p)*activation;
  if(d>.005){float optical=0.;for(int j=1;j<=2;j++)optical+=density(p+sunLocal*float(j)*.28)*1.05;
   float sunlight=exp(-optical*1.65);float altitude=smoothstep(-.7,.6,p.y);
   vec3 ambient=mix(vec3(.56,.58,.60),vec3(.88,.89,.91),altitude)*mix(1.,.62,rain);
   vec3 light=ambient*(.035+.965*dayGain)+lightTint*sunlight*(sunPower*.85*dayGain+forward*.9*dayGain);
   light=mix(light,vec3(dot(light,vec3(.2126,.7152,.0722))),probeNeutralness*.94);float opacity=1.-exp(-d*stepSize*11.);sum+=transmittance*opacity*light;transmittance*=1.-opacity;
   if(transmittance<.025)break;
  }
 }
 float alpha=(1.-transmittance)*(1.-smoothstep(visibility*.5,visibility,length((vEye-vLocal)*vSize)));if(alpha<.008)discard;
 gl_FragColor=vec4(sum/max(.001,1.-transmittance),alpha);
#include <logdepthbuf_fragment>
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});
  this.mesh=new T.InstancedMesh(new T.BoxGeometry(2,2,2),material,32);const dummy=new T.Object3D(),indices=[];
  for(let i=0;i<32;i++){
   const c=cloudCells[i];dummy.position.set(c.x,c.y,c.z);dummy.scale.set(c.rx,c.ry,c.rz);dummy.updateMatrix();this.mesh.setMatrixAt(i,dummy.matrix);indices.push(i);
  }
  this.mesh.geometry.setAttribute('cloudIndex',new T.InstancedBufferAttribute(new Float32Array(indices),1));this.mesh.frustumCulled=false;this.mesh.name='Weather / volumetric cumulus — three altitude bands';scene.add(this.mesh);
 }
 setProbeNeutralness(value:number){(this.mesh.material as T.ShaderMaterial).uniforms.probeNeutralness.value=value;}
 setLighting(direction:T.Vector3,color:T.Color,day:number){const u=(this.mesh.material as T.ShaderMaterial).uniforms;u.sunDirection.value.copy(direction);u.lightTint.value.copy(color);u.dayGain.value=day;}
 setSceneDepth(texture:T.DepthTexture|null,width:number,height:number,far:number){const u=(this.mesh.material as T.ShaderMaterial).uniforms;u.sceneDepth.value=texture;u.cloudResolution.value.set(width,height);u.cameraFar.value=far;u.useSceneDepth.value=texture?1:0;}
 update(dt:number,rain:number,wind:number,coverage:number,visibility:number){this.time.value+=dt*(.3+wind);this.rain.value=rain;this.coverage.value=coverage;this.sun.value=3.1*(1-rain*.9)*(1-Math.max(0,coverage-.55)*1.65);this.visibility.value=visibility;this.mesh.position.x=Math.sin(this.time.value*.0003)*350;this.mesh.position.z=Math.sin(this.time.value*.0002)*210;}
 dispose(){this.mesh.removeFromParent();this.mesh.geometry.dispose();(this.mesh.material as T.Material).dispose();this.texture.dispose();}
}
