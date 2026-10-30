import * as T from 'three';
import {Pass,FullScreenQuad} from 'three/addons/postprocessing/Pass.js';
import type {CloudVolumes} from './CloudVolumes.ts';
/** Reduced-resolution volumetric integration; terrain depth still terminates each view ray. */
export class CloudPass extends Pass{
 private target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:false});
 private composite=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{tDiffuse:{value:null},clouds:{value:this.target.texture},sceneDepth:{value:null},texel:{value:new T.Vector2(1,1)},logFar:{value:1}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`uniform sampler2D tDiffuse;uniform sampler2D clouds;uniform sampler2D sceneDepth;uniform vec2 texel;uniform float logFar;varying vec2 vUv;
float viewDepth(vec2 uv){return exp2(texture2D(sceneDepth,uv).r*logFar)-1.;}
void main(){
 vec4 base=texture2D(tDiffuse,vUv);float center=viewDepth(vUv);vec2 grid=vUv/texel-.5,origin=(floor(grid)+.5)*texel,f=fract(grid);vec4 cloud=vec4(0.);float weightSum=0.;
 for(int y=0;y<2;y++)for(int x=0;x<2;x++){
  vec2 uv=origin+vec2(float(x),float(y))*texel;float w=(x==0?1.-f.x:f.x)*(y==0?1.-f.y:f.y);
  w*=exp(-abs(viewDepth(uv)-center)/max(2.,center*.018));cloud+=texture2D(clouds,uv)*w;weightSum+=w;
 }
 cloud/=max(weightSum,.0001);gl_FragColor=vec4(base.rgb*(1.-cloud.a)+cloud.rgb,base.a);
}`});
 private scale=.35;private width=1;private height=1;
 private quad=new FullScreenQuad(this.composite);private camera:T.PerspectiveCamera;private scene:T.Scene;private volumes:CloudVolumes;
 constructor(scene:T.Scene,camera:T.PerspectiveCamera,volumes:CloudVolumes){super();this.scene=scene;this.camera=camera;this.volumes=volumes;}
 setResolution(scale:number){this.scale=T.MathUtils.clamp(scale,.15,.5);this.volumes.setDetail(this.scale);this.setSize(this.width,this.height);}
 setSize(width:number,height:number){this.width=width;this.height=height;this.target.setSize(Math.max(1,Math.round(width*this.scale)),Math.max(1,Math.round(height*this.scale)));}
 render(renderer:T.WebGLRenderer,write:T.WebGLRenderTarget,read:T.WebGLRenderTarget){
  this.volumes.setSceneDepth(read.depthTexture,this.target.width,this.target.height,this.camera.far);
  const clear=new T.Color();renderer.getClearColor(clear);const alpha=renderer.getClearAlpha(),auto=renderer.autoClear;renderer.autoClear=true;renderer.setClearColor(0x000000,0);
  try{renderer.setRenderTarget(this.target);renderer.clear();renderer.render(this.scene,this.camera);}finally{renderer.setClearColor(clear,alpha);renderer.autoClear=auto;}
  this.composite.uniforms.tDiffuse.value=read.texture;this.composite.uniforms.sceneDepth.value=read.depthTexture;this.composite.uniforms.texel.value.set(1/this.target.width,1/this.target.height);this.composite.uniforms.logFar.value=Math.log2(this.camera.far+1);renderer.setRenderTarget(this.renderToScreen?null:write);this.quad.render(renderer);
 }
 dispose(){this.target.dispose();this.composite.dispose();this.quad.dispose();}
}
