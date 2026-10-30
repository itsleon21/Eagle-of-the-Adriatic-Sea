import * as T from 'three';
import {cloudCells} from './CloudLayout.ts';
import {random} from '../world/WorldConfig.ts';
/** Three-dimensional density, integrated through irregular ellipsoidal cloud bounds.
 * Clouds have real altitude and thickness. Turning or flying above them changes their silhouette. */
export class CloudVolumes {
 readonly mesh:T.InstancedMesh;
 private texture:T.Data3DTexture;private time={value:0};private coverage={value:.38};private rain={value:0};private sun={value:3.1};private visibility={value:16000};
 constructor(scene:T.Scene){
  const size=48,rng=random(808),data=new Uint8Array(size**3),features=Array.from({length:8**3},()=>[rng(),rng(),rng()]);
  const feature=(x:number,y:number,z:number)=>features[((z+8)%8)*64+((y+8)%8)*8+(x+8)%8];
  for(let z=0;z<size;z++)for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const px=x/6,py=y/6,pz=z/6,bx=Math.floor(px),by=Math.floor(py),bz=Math.floor(pz);let nearest=4;
   for(let k=-1;k<=1;k++)for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const f=feature(bx+i,by+j,bz+k),dx=bx+i+f[0]-px,dy=by+j+f[1]-py,dz=bz+k+f[2]-pz;nearest=Math.min(nearest,dx*dx+dy*dy+dz*dz);}
   data[z*size*size+y*size+x]=Math.round(Math.max(0,Math.min(1,1-Math.sqrt(nearest)*.77))*255);
  }
  this.texture=new T.Data3DTexture(data,size,size,size);this.texture.format=T.RedFormat;this.texture.minFilter=this.texture.magFilter=T.LinearFilter;this.texture.wrapS=this.texture.wrapT=this.texture.wrapR=T.RepeatWrapping;this.texture.unpackAlignment=1;this.texture.needsUpdate=true;
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,side:T.BackSide,uniforms:{cloudCount:{value:cloudCells.length},viewSteps:{value:40},sceneDepth:{value:null},cloudResolution:{value:new T.Vector2(1,1)},cameraFar:{value:26000},useSceneDepth:{value:0},densityMap:{value:this.texture},cloudTime:this.time,coverage:this.coverage,rain:this.rain,sunPower:this.sun,visibility:this.visibility,probeNeutralness:{value:0},dayGain:{value:1},lightTint:{value:new T.Color(1,.91,.76)},sunDirection:{value:new T.Vector3(-.52,.64,.56).normalize()}},
   vertexShader:`#include <common>
#include <logdepthbuf_pars_vertex>
attribute float cloudIndex;attribute float cloudLayer;varying float vLayer;varying vec3 vLocal;varying vec3 vEye;varying vec3 vSize;varying vec3 vSeed;varying float vIndex;
void main(){vec3 center=(modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).xyz;vSize=vec3(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz),length(instanceMatrix[2].xyz));vEye=(cameraPosition-center)/vSize;vLocal=position;vSeed=center*.00017;vIndex=cloudIndex;vLayer=cloudLayer;vec4 mvPosition=modelViewMatrix*instanceMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
#include <logdepthbuf_vertex>
}`,
   fragmentShader:`precision highp sampler3D;
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float cloudCount;uniform float viewSteps;uniform sampler2D sceneDepth;uniform vec2 cloudResolution;uniform float cameraFar;uniform float useSceneDepth;uniform sampler3D densityMap;uniform float cloudTime;uniform float coverage;uniform float rain;uniform float sunPower;uniform float visibility;uniform vec3 sunDirection;uniform float dayGain;uniform vec3 lightTint;uniform float probeNeutralness;
varying vec3 vLocal;varying vec3 vEye;varying vec3 vSize;varying vec3 vSeed;varying float vIndex;varying float vLayer;
float density(vec3 p){
 // Domain-warped 3D lobes stay stable in world space: no screen-space noise or temporal dithering.
 vec3 warp=vec3(texture(densityMap,p*.43+vSeed).r,texture(densityMap,p*.43+vSeed+3.7).r,texture(densityMap,p*.43+vSeed+7.1).r)-.5;
 vec3 q=p+warp*.24;
 float drift=cloudTime*.0006;
 float n=texture(densityMap,q*.72+vSeed+vec3(drift,0.,0.)).r;
 float detail=texture(densityMap,q*2.8+vSeed*2.).r;
 float fine=texture(densityMap,q*6.4+vSeed*3.).r;
 if(vLayer>1.5){
  float sheet=1.-length(q*vec3(.97,1.10,.96));
  float streak=texture(densityMap,q*vec3(.52,1.6,4.3)+vSeed).r;
  return max(0.,sheet-(1.-n)*.52-(1.-streak)*.30)*.28;
 }
 float base=1.10-length((q-vec3(0.,-.08,0.))*vec3(.99,1.35,1.02));
 float tower=.79-length((q-vec3(-.27,.18,.02))*vec3(1.3,1.08,1.4));
 float shoulder=.66-length((q-vec3(.38,-.05,.08))*vec3(1.2,1.5,1.3));
 float crown=.53-length((q-vec3(.03,.45,-.11))*vec3(1.25,1.35,1.4));
 float shape=max(max(base,crown),max(tower,shoulder));
 float body=shape-(1.-n)*.27-(1.-detail)*.14-(1.-fine)*.06;return smoothstep(.015,.26,body)*smoothstep(-.76,-.46,p.y);
}
// Sun visibility uses a coarser density mip approximation; view rays retain fine 3D erosion.
float shadowDensity(vec3 p){
 if(any(greaterThan(abs(p),vec3(1.05))))return 0.;
 float base=1.10-length((p-vec3(0.,-.08,0.))*vec3(.99,1.35,1.02));
 float tower=.79-length((p-vec3(-.27,.18,.02))*vec3(1.3,1.08,1.4));
 float shoulder=.66-length((p-vec3(.38,-.05,.08))*vec3(1.2,1.5,1.3));
 float crown=.53-length((p-vec3(.03,.45,-.11))*vec3(1.25,1.35,1.4));
 float n=texture(densityMap,p*.72+vSeed+vec3(cloudTime*.0006,0.,0.)).r;
 float fine=texture(densityMap,p*1.6+vSeed*2.).r;
 return smoothstep(.015,.26,max(max(base,crown),max(tower,shoulder))-(1.-n)*.32-(1.-fine)*.12)*smoothstep(-.76,-.46,p.y)*(vLayer>1.5?.22:1.);
}
void main(){
 float activation=clamp(coverage*cloudCount-vIndex,0.,1.);if(activation<.005)discard;
 vec3 rd=normalize(vLocal-vEye),safeRay=sign(rd)*max(abs(rd),vec3(.00001));vec3 a=(-vec3(1.)-vEye)/safeRay,b=(vec3(1.)-vEye)/safeRay;
 vec3 lo=min(a,b),hi=max(a,b);float entry=max(0.,max(lo.x,max(lo.y,lo.z))),exit=min(hi.x,min(hi.y,hi.z));if(exit<=entry)discard;
 float sceneDistance=exp2(texture2D(sceneDepth,gl_FragCoord.xy/cloudResolution).r*log2(cameraFar+1.))-1.;
 float stepSize=(exit-entry)/viewSteps;vec3 sunLocal=normalize(sunDirection/vSize);vec3 worldRay=normalize(rd*vSize);float mu=dot(worldRay,sunDirection);float forward=(1.-.62*.62)/pow(max(.05,1.+.62*.62-2.*.62*mu),1.5)*.32;
 vec3 sum=vec3(0.);float transmittance=1.;
 for(int i=0;i<40;i++){if(float(i)>=viewSteps)break;
  vec3 p=vEye+rd*(entry+(float(i)+.5)*stepSize);if(useSceneDepth>.5&&-(viewMatrix*vec4(cameraPosition+(p-vEye)*vSize,1.)).z>sceneDistance)break;float d=density(p)*activation;
  if(d>.005){float optical=0.;for(int j=1;j<=5;j++)optical+=shadowDensity(p+sunLocal*float(j)*.17)*.65;
   float sunlight=exp(-optical*1.55);float altitude=smoothstep(-.7,.6,p.y);
   vec3 ambient=mix(vec3(.28,.34,.42),vec3(.78,.86,.96),altitude)*mix(1.,.62,rain);
   float powder=1.-exp(-d*5.);
   vec3 light=ambient*(.045+.955*dayGain)+lightTint*(sunlight*(.48+.52*powder)*sunPower*.90+forward*pow(sunlight,.55)*.75)*dayGain;
   light+=lightTint*(1.-sunlight)*.12*dayGain;
   light=mix(light,vec3(dot(light,vec3(.2126,.7152,.0722))),probeNeutralness*.94);float worldStep=length(rd*vSize)*stepSize;float opacity=1.-exp(-d*worldStep*mix(.0055,.009,rain));sum+=transmittance*opacity*light;transmittance*=1.-opacity;
   if(transmittance<.025)break;
  }
 }
 float layerVisibility=min(26000.,visibility*(vLayer>1.5?1.45:1.));float alpha=(1.-transmittance)*(1.-smoothstep(layerVisibility*.5,layerVisibility,length((vEye-vLocal)*vSize)));if(alpha<.008)discard;
 vec3 radiance=sum/max(.001,1.-transmittance);float aerial=1.-exp(-length((vEye-vLocal)*vSize)/26000.);radiance=mix(radiance,vec3(.40,.58,.82)*(.03+.97*dayGain),aerial*.38);gl_FragColor=vec4(radiance,alpha);
#include <logdepthbuf_fragment>
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});
  this.mesh=new T.InstancedMesh(new T.BoxGeometry(2,2,2),material,cloudCells.length);const dummy=new T.Object3D(),indices=[],layers=[];
  for(let i=0;i<cloudCells.length;i++){
   const c=cloudCells[i];dummy.position.set(c.x,c.y,c.z);dummy.scale.set(c.rx,c.ry,c.rz);dummy.updateMatrix();this.mesh.setMatrixAt(i,dummy.matrix);indices.push(i);layers.push(c.layer);
  }
  this.mesh.geometry.setAttribute('cloudLayer',new T.InstancedBufferAttribute(new Float32Array(layers),1));
  this.mesh.geometry.setAttribute('cloudIndex',new T.InstancedBufferAttribute(new Float32Array(indices),1));this.mesh.frustumCulled=false;this.mesh.name='Weather / volumetric cumulus — low cumulus, middle towers and high wind banks';scene.add(this.mesh);
 }
 setDetail(scale:number){(this.mesh.material as T.ShaderMaterial).uniforms.viewSteps.value=scale>=.45?40:scale>=.27?28:20;}
 setProbeNeutralness(value:number){(this.mesh.material as T.ShaderMaterial).uniforms.probeNeutralness.value=value;}
 setLighting(direction:T.Vector3,color:T.Color,day:number){const u=(this.mesh.material as T.ShaderMaterial).uniforms;u.sunDirection.value.copy(direction);u.lightTint.value.copy(color);u.dayGain.value=day;}
 setSceneDepth(texture:T.DepthTexture|null,width:number,height:number,far:number){const u=(this.mesh.material as T.ShaderMaterial).uniforms;u.sceneDepth.value=texture;u.cloudResolution.value.set(width,height);u.cameraFar.value=far;u.useSceneDepth.value=texture?1:0;}
 update(dt:number,rain:number,wind:number,coverage:number,visibility:number){this.time.value+=dt*(.3+wind);this.rain.value=rain;this.coverage.value=coverage;this.sun.value=3.1*(1-rain*.9)*(1-Math.max(0,coverage-.55)*1.65);this.visibility.value=visibility;this.mesh.position.x=Math.sin(this.time.value*.0003)*350;this.mesh.position.z=Math.sin(this.time.value*.0002)*210;}
 dispose(){this.mesh.removeFromParent();this.mesh.geometry.dispose();(this.mesh.material as T.Material).dispose();this.texture.dispose();}
}
