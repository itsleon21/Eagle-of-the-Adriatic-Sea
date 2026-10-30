import * as T from 'three';

/** World-space grain works across terrain, rotated houses and reusable rock instances. */
export class IslandSurface {
 private wetness={value:0};private texture:T.DataTexture;private prepared=new WeakSet<T.Material>();
 constructor(){
  const size=128,data=new Uint8Array(size*size);let seed=71;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){seed=(Math.imul(seed,1664525)+1013904223)|0;data[y*size+x]=Math.round(110+((seed>>>24)/255)*36+Math.sin(x*.29+Math.sin(y*.17))*16+Math.sin(y*.12+x*.05)*12);}
  this.texture=new T.DataTexture(data,size,size,T.RedFormat);this.texture.wrapS=this.texture.wrapT=T.RepeatWrapping;this.texture.magFilter=T.LinearFilter;this.texture.minFilter=T.LinearMipmapLinearFilter;this.texture.generateMipmaps=true;this.texture.needsUpdate=true;
 }
 prepare(root:T.Object3D){root.traverse(object=>{if(!(object instanceof T.Mesh))return;for(const material of Array.isArray(object.material)?object.material:[object.material]){
  if(!(material instanceof T.MeshStandardMaterial)||this.prepared.has(material))continue;this.prepared.add(material);
  material.onBeforeCompile=shader=>{
   shader.uniforms.islandGrain={value:this.texture};shader.uniforms.islandWetness=this.wetness;
   const architecture=Boolean(material.userData.architecture);
   const terrain=Boolean(material.userData.terrainBiome),sand=material.userData.terrainBiome==='sand';
   shader.vertexShader=(architecture?'varying vec3 vBuildingPoint;varying vec3 vBuildingNormal;\n':'')+'varying vec3 vIslandSurface;varying vec3 vIslandNormal;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <defaultnormal_vertex>','#include <defaultnormal_vertex>\nvIslandNormal=inverseTransformDirection(normalize(transformedNormal),viewMatrix);');
   shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
    vec4 islandSurface=vec4(transformed,1.);
    #ifdef USE_INSTANCING
     islandSurface=instanceMatrix*islandSurface;
    #endif
    vIslandSurface=(modelMatrix*islandSurface).xyz;
    ${architecture?`vec3 buildingScale=vec3(1.);
    #ifdef USE_INSTANCING
    buildingScale=vec3(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz),length(instanceMatrix[2].xyz));
    #endif
    vBuildingPoint=transformed*buildingScale;vBuildingNormal=normal;`:''}`);
   shader.fragmentShader=(architecture?'varying vec3 vBuildingPoint;varying vec3 vBuildingNormal;\n':'')+'varying vec3 vIslandSurface;varying vec3 vIslandNormal;uniform sampler2D islandGrain;uniform float islandWetness;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    vec3 surfaceNormal=normalize(vIslandNormal);vec3 islandNormal=abs(surfaceNormal);
    islandNormal=pow(islandNormal,vec3(4.));islandNormal/=max(.001,islandNormal.x+islandNormal.y+islandNormal.z);
    float grain=dot(vec3(texture2D(islandGrain,vIslandSurface.yz*.07).r,texture2D(islandGrain,vIslandSurface.xz*.07).r,texture2D(islandGrain,vIslandSurface.xy*.07).r),islandNormal);
    float mottling=texture2D(islandGrain,vIslandSurface.xz*.0031).r;
    ${terrain?`float cliff=smoothstep(.12,.48,1.-surfaceNormal.y);
    vec3 rock=mix(vec3(.46,.39,.28),vec3(.70,.60,.43),mottling);
    float strataPhase=vIslandSurface.y*.32+mottling*4.+grain*.65;
    float strataAA=max(.03,fwidth(strataPhase));
    float strata=sin(strataPhase)/(1.+strataAA*strataAA*4.);
    vec2 cliffUV=vec2(dot(vIslandSurface.xz,normalize(vec2(.61,.79)))*.11,vIslandSurface.y*.022);
    float weathering=texture2D(islandGrain,cliffUV).r;
    rock*=.88+.13*strata+.16*weathering;
    rock=mix(rock,rock*vec3(.76,.79,.74),smoothstep(.57,.68,weathering)*.45);
    vec3 grass=mix(vec3(.12,.28,.052),vec3(.27,.40,.095),mottling);
    vec3 beach=vec3(.82,.70,.47);
    float grassBreak=texture2D(islandGrain,vIslandSurface.xz*.018).r;
    float exposed=smoothstep(.57,.7,grassBreak)*smoothstep(10.,35.,vIslandSurface.y)*.34;
    vec3 inland=mix(grass,rock,max(cliff,exposed));
    diffuseColor.rgb=mix(beach,inland,smoothstep(${sand?'4.,18.':'3.,12.'},vIslandSurface.y));`:''}
    ${architecture?`// Tile seams are filtered over the pixel footprint and fade before becoming subpixel.
    float roof=step(diffuseColor.g*1.7,diffuseColor.r)*step(diffuseColor.b*2.,diffuseColor.r)*smoothstep(.03,.25,surfaceNormal.y);
    float ridgeAxis=abs(vBuildingNormal.x)>abs(vBuildingNormal.z)?vBuildingPoint.z:vBuildingPoint.x;
    vec2 tile=vec2(ridgeAxis/.34+mod(floor(vBuildingPoint.y/.22),2.)*.5,vBuildingPoint.y/.22);
    vec2 aa=max(fwidth(tile),vec2(.025)),edge=min(fract(tile),1.-fract(tile));
    float seam=1.-smoothstep(.035,.035+aa.x,edge.x)*smoothstep(.05,.05+aa.y,edge.y);
    float cell=fract(sin(dot(floor(tile),vec2(12.9898,78.233)))*43758.5453);
    float tileDetail=(1.-smoothstep(.5,1.6,max(aa.x,aa.y)))*(1.-smoothstep(150.,280.,distance(cameraPosition,vIslandSurface)));
    diffuseColor.rgb*=mix(1.,mix(.94,1.08,cell)*(1.-seam*.18),roof*tileDetail);`:''}
    diffuseColor.rgb*=mix(.92,1.06,grain)*mix(.96,1.03,mottling);
    diffuseColor.rgb*=1.-islandWetness*.13;
    diffuseColor.rgb*=mix(.83,1.,smoothstep(-.5,6.,vIslandSurface.y));`);
   if(terrain)shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
    // Low-amplitude limestone relief perturbs shading only; mip filtering and footprint fade prevent sparkle.
    float rockSlope=smoothstep(.12,.48,1.-normalize(vIslandNormal).y);
    float reliefPhase=vIslandSurface.y*.48+texture2D(islandGrain,vIslandSurface.xz*.012).r*3.;
    float reliefAA=fwidth(reliefPhase);
    float relief=rockSlope*(sin(reliefPhase)*.14/(1.+reliefAA*reliefAA*4.)+texture2D(islandGrain,vIslandSurface.xz*.008).r*.012);
    vec3 sx=dFdx(-vViewPosition),sy=dFdy(-vViewPosition),r1=cross(sy,normal),r2=cross(normal,sx);float determinant=dot(sx,r1);
    vec3 reliefGradient=dFdx(relief)*r1+dFdy(relief)*r2;
    if(abs(determinant)>1e-8)normal=normalize(abs(determinant)*normal-sign(determinant)*reliefGradient);`);
  };
  material.customProgramCacheKey=()=> `island-stratified-v5-${material.userData.terrainBiome??'asset'}-${Boolean(material.userData.architecture)}`;material.needsUpdate=true;
 }});}
 setWetness(value:number){this.wetness.value=T.MathUtils.clamp(value,0,1);}
 dispose(){this.texture.dispose();}
}
