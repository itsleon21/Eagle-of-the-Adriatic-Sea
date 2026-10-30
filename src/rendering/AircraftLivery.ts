import * as T from 'three';
/** Recolour pigmented red paint only; preserve original texture luminance, AO and metal/fabric. */
export class AircraftLivery{
 private amount={value:0};private tint={value:new T.Color()};private prepared=new WeakSet<T.Material>();
 apply(root:T.Object3D,id:string,aircraft:string){this.amount.value=id==='original'||!['redwing','mc72'].includes(aircraft)?0:1;this.tint.value.setHex(id==='azure'?0x247cad:0xf1dbac);
 root.traverse(o=>{if(!(o instanceof T.Mesh))return;for(const material of Array.isArray(o.material)?o.material:[o.material]){if(this.prepared.has(material)||!/lacquer|enamel/i.test(material.name))continue;this.prepared.add(material);const m=material as T.MeshStandardMaterial,hook=m.onBeforeCompile,key=m.customProgramCacheKey();m.onBeforeCompile=(shader,renderer)=>{hook.call(m,shader,renderer);shader.uniforms.liveryAmount=this.amount;shader.uniforms.liveryTint=this.tint;shader.fragmentShader='uniform float liveryAmount;uniform vec3 liveryTint;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 float redPaint=smoothstep(1.35,2.0,diffuseColor.r/max(.001,max(diffuseColor.g,diffuseColor.b)));float paintLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=mix(diffuseColor.rgb,liveryTint*clamp(paintLuma/.13,.25,2.),redPaint*liveryAmount);`);};m.customProgramCacheKey=()=>key+'-souvenir-livery';m.needsUpdate=true;}});
 }
}
