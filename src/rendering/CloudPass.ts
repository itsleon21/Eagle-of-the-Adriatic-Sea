import * as T from 'three';
import {Pass,FullScreenQuad} from 'three/addons/postprocessing/Pass.js';
import type {CloudVolumes} from './CloudVolumes.ts';
/** Reduced-resolution volumetric integration; terrain depth still terminates each view ray. */
export class CloudPass extends Pass{
 private target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:false});
 private composite=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{tDiffuse:{value:null},clouds:{value:this.target.texture}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform sampler2D tDiffuse;uniform sampler2D clouds;varying vec2 vUv;void main(){vec4 base=texture2D(tDiffuse,vUv),cloud=texture2D(clouds,vUv);gl_FragColor=vec4(base.rgb*(1.-cloud.a)+cloud.rgb,base.a);}'});
 private scale=.35;private width=1;private height=1;
 private quad=new FullScreenQuad(this.composite);private camera:T.PerspectiveCamera;private scene:T.Scene;private volumes:CloudVolumes;
 constructor(scene:T.Scene,camera:T.PerspectiveCamera,volumes:CloudVolumes){super();this.scene=scene;this.camera=camera;this.volumes=volumes;}
 setResolution(scale:number){this.scale=T.MathUtils.clamp(scale,.15,.5);this.setSize(this.width,this.height);}
 setSize(width:number,height:number){this.width=width;this.height=height;this.target.setSize(Math.max(1,Math.round(width*this.scale)),Math.max(1,Math.round(height*this.scale)));}
 render(renderer:T.WebGLRenderer,write:T.WebGLRenderTarget,read:T.WebGLRenderTarget){
  this.volumes.setSceneDepth(read.depthTexture,this.target.width,this.target.height,this.camera.far);
  const clear=new T.Color();renderer.getClearColor(clear);const alpha=renderer.getClearAlpha(),auto=renderer.autoClear;renderer.autoClear=true;renderer.setClearColor(0x000000,0);
  try{renderer.setRenderTarget(this.target);renderer.clear();renderer.render(this.scene,this.camera);}finally{renderer.setClearColor(clear,alpha);renderer.autoClear=auto;}
  this.composite.uniforms.tDiffuse.value=read.texture;renderer.setRenderTarget(this.renderToScreen?null:write);this.quad.render(renderer);
 }
 dispose(){this.target.dispose();this.composite.dispose();this.quad.dispose();}
}
