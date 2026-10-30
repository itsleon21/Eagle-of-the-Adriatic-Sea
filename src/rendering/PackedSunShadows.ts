import * as T from 'three';
import {cloudCells} from './CloudLayout.ts';
/** Portable RGBA8 depth avoids sampling native depth/half-float shadow textures on this GPU.
 * Camera-independent light grids are snapped to texels; fixed taps never introduce screen noise. */
export class PackedSunShadows{
 private targets=[0,1].map(()=>new T.WebGLRenderTarget(2048,2048,{minFilter:T.NearestFilter,magFilter:T.NearestFilter,type:T.UnsignedByteType,depthBuffer:true,stencilBuffer:false}));
 private cameras=[new T.OrthographicCamera(-70,70,70,-70,.5,500),new T.OrthographicCamera(-1400,1400,1400,-1400,.5,5000)];
 private depth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,side:T.DoubleSide});
 readonly uniforms={packedSunNear:{value:this.targets[0].texture},packedSunFar:{value:this.targets[1].texture},packedNearMatrix:{value:new T.Matrix4()},packedFarMatrix:{value:new T.Matrix4()},packedFocus:{value:new T.Vector3()},packedEnabled:{value:1}};
 private cloudTexture:T.DataTexture;private cloudTime=0;private coverage=.38;private wind=.25;
 private nearFocus=new T.Vector3(Infinity,0,0);
 private farFocus=new T.Vector3(Infinity,0,0);private prepared=new WeakSet<T.Material>();enabled=true;
 constructor(){
  this.cloudTexture=new T.DataTexture(new Uint8Array(64*64*4),64,64);this.cloudTexture.minFilter=this.cloudTexture.magFilter=T.LinearFilter;this.rebuildCloudShadows(new T.Vector3(-.52,.64,.56).normalize());
  Object.assign(this.uniforms,{cloudShadowMap:{value:this.cloudTexture},cloudCover:{value:.38},cloudDrift:{value:new T.Vector2()},cloudEnabled:{value:1},cloudSun:{value:new T.Vector2(-.52/.64,.56/.64)}});
 }
 private shadowDirection=new T.Vector3();private cloudDirection=new T.Vector3();
 private rebuildCloudShadows(sun:T.Vector3){const size=64,data=this.cloudTexture.image.data as Uint8Array;const sy=Math.max(.08,sun.y);for(let z=0;z<size;z++)for(let x=0;x<size;x++){
  const wx=(x/(size-1)-.5)*22000,wz=(z/(size-1)-.5)*22000,acc=[0,0,0];
  cloudCells.forEach((c,i)=>{const px=c.x-sun.x/sy*c.y,pz=c.z-sun.z/sy*c.y,dx=(wx-px)/(c.rx*1.1),dz=(wz-pz)/(c.rz*1.1),d=dx*dx+dz*dz;if(d<2.5){const v=Math.exp(-d*2)*(c.layer===2?.18:.65);if(i<12)acc[0]+=v;if(i<20)acc[1]+=v;acc[2]+=v;}});
  const k=(z*size+x)*4;for(let ch=0;ch<3;ch++)data[k+ch]=Math.round(Math.min(1,acc[ch])*255);data[k+3]=255;
 }this.cloudTexture.needsUpdate=true;this.cloudDirection.copy(sun);}
 setWeather(coverage:number,wind:number){this.coverage=coverage;this.wind=wind;}
 prepare(root:T.Object3D){this.nearFocus.set(Infinity,0,0);this.farFocus.set(Infinity,0,0);root.traverse(o=>{if(!(o instanceof T.Mesh))return;for(const m of Array.isArray(o.material)?o.material:[o.material]){
  if(!(m instanceof T.MeshStandardMaterial)||this.prepared.has(m))continue;this.prepared.add(m);const before=m.onBeforeCompile;
  m.onBeforeCompile=(shader,renderer)=>{before.call(m,shader,renderer);Object.assign(shader.uniforms,this.uniforms);
   shader.vertexShader='varying vec3 vPackedWorld;varying vec3 vPackedNormal;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <defaultnormal_vertex>','#include <defaultnormal_vertex>\nvPackedNormal=inverseTransformDirection(normalize(transformedNormal),viewMatrix);');
   shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
vec4 packedWorld=vec4(transformed,1.);
#ifdef USE_INSTANCING
packedWorld=instanceMatrix*packedWorld;
#endif
vPackedWorld=(modelMatrix*packedWorld).xyz;`);
   shader.fragmentShader=`varying vec3 vPackedWorld;varying vec3 vPackedNormal;uniform sampler2D packedSunNear;uniform sampler2D packedSunFar;uniform mat4 packedNearMatrix;uniform mat4 packedFarMatrix;uniform vec3 packedFocus;uniform float packedEnabled;uniform sampler2D cloudShadowMap;uniform float cloudCover;uniform vec2 cloudDrift;uniform float cloudEnabled;uniform vec2 cloudSun;
float packedShadow(sampler2D map,mat4 matrix,vec3 world,float bias){vec3 p=(matrix*vec4(world,1.)).xyz;if(any(lessThan(p,vec3(0.)))||any(greaterThan(p,vec3(1.))))return 1.;// A fixed world-space bias avoids discontinuous receiver derivatives at triangulated facade edges.
float sum=0.;
for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 uv=(floor(p.xy*2048.+vec2(float(x),float(y)))+.5)/2048.;vec4 v=texture2D(map,uv);float d=dot(v,vec4(.99609375,.0038909912109375,.00001519918441772461,.000000059604644775390625));float weight=float((2-abs(x))*(2-abs(y)));sum+=step(p.z-bias,d)*weight;}return sum/16.;}
`+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
float packedRange=length(vPackedWorld-packedFocus);vec3 packedN=vPackedNormal*inversesqrt(max(dot(vPackedNormal,vPackedNormal),1e-8));
float packedVisibility=packedShadow(packedSunFar,packedFarMatrix,vPackedWorld+packedN*.45,.001);
if(packedRange<64.)packedVisibility=mix(packedShadow(packedSunNear,packedNearMatrix,vPackedWorld+packedN*.07,.0004),packedVisibility,smoothstep(45.,64.,packedRange));
vec3 cloudLayers=texture2D(cloudShadowMap,(vPackedWorld.xz-vPackedWorld.y*cloudSun-cloudDrift)/22000.+.5).rgb;
float cloudShade=cloudCover<.38?cloudLayers.r*cloudCover/.38:cloudCover<.62?mix(cloudLayers.r,cloudLayers.g,smoothstep(.38,.62,cloudCover)):mix(cloudLayers.g,cloudLayers.b,smoothstep(.62,.97,cloudCover));
if(isnan(packedVisibility)||isinf(packedVisibility))packedVisibility=1.;
packedVisibility=mix(1.,packedVisibility,packedEnabled*.83)*(1.-cloudShade*.48*cloudEnabled);reflectedLight.directDiffuse*=packedVisibility;reflectedLight.directSpecular*=packedVisibility;`);
  };m.needsUpdate=true;
 }});}
 update(renderer:T.WebGLRenderer,scene:T.Scene,focus:T.Vector3,direction:T.Vector3,dt:number,dynamic=true){
  if(this.shadowDirection.distanceToSquared(direction)>.000025){this.farFocus.set(Infinity,0,0);this.nearFocus.set(Infinity,0,0);this.shadowDirection.copy(direction);}
  if(this.cloudDirection.distanceToSquared(direction)>.0064)this.rebuildCloudShadows(direction);
  const sunUniforms=this.uniforms as unknown as Record<string,T.IUniform>;sunUniforms.cloudSun.value.set(direction.x/Math.max(.08,direction.y),direction.z/Math.max(.08,direction.y));
  this.cloudTime+=dt*(.3+this.wind);const u=this.uniforms as unknown as Record<string,T.IUniform>;u.cloudCover.value=this.coverage;u.cloudDrift.value.set(Math.sin(this.cloudTime*.0003)*350,Math.sin(this.cloudTime*.0002)*210);
  this.uniforms.packedEnabled.value=this.enabled?1:0;if(!this.enabled)return;this.uniforms.packedFocus.value.copy(focus);
  const hidden:T.Object3D[]=[];scene.traverse(o=>{if((o instanceof T.Mesh||o instanceof T.Points||o instanceof T.Line)&&o.visible&&!o.castShadow){o.visible=false;hidden.push(o);}});
  const previous=renderer.getRenderTarget(),override=scene.overrideMaterial,background=scene.background,clear=new T.Color();renderer.getClearColor(clear);const alpha=renderer.getClearAlpha(),auto=renderer.autoClear;
  scene.overrideMaterial=this.depth;scene.background=null;renderer.autoClear=true;renderer.setClearColor(0xffffff,1);
  const bias=new T.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);
  try{for(let i=0;i<2;i++){if(i===0&&!dynamic&&this.nearFocus.distanceToSquared(focus)<1e-6)continue;if(i===0)this.nearFocus.copy(focus);if(i===1&&this.farFocus.distanceToSquared(focus)<144)continue;if(i===1)this.farFocus.copy(focus);const camera=this.cameras[i],distance=i===0?250:2500;
   camera.position.copy(focus).addScaledVector(direction,distance);camera.lookAt(focus);camera.updateMatrixWorld();
   // Quantize light-space translation so small camera motion cannot crawl through shadow texels.
   const texel=(camera.right-camera.left)/2048;
   const worldOrigin=new T.Vector3().applyMatrix4(camera.matrixWorldInverse),shift=new T.Vector3((worldOrigin.x-Math.round(worldOrigin.x/texel)*texel),(worldOrigin.y-Math.round(worldOrigin.y/texel)*texel),0);shift.applyQuaternion(camera.quaternion);camera.position.add(shift);camera.updateMatrixWorld();
   (i===0?this.uniforms.packedNearMatrix:this.uniforms.packedFarMatrix).value.copy(bias).multiply(camera.projectionMatrix).multiply(camera.matrixWorldInverse);
   renderer.setRenderTarget(this.targets[i]);renderer.clear();renderer.render(scene,camera);
  }}finally{scene.overrideMaterial=override;scene.background=background;for(const o of hidden)o.visible=true;renderer.setRenderTarget(previous);renderer.setClearColor(clear,alpha);renderer.autoClear=auto;}
 }
 dispose(){this.targets.forEach(t=>t.dispose());this.depth.dispose();this.cloudTexture.dispose();}
}
