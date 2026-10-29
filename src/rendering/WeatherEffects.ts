import * as T from 'three';
import {CloudPass} from './CloudPass.ts';
import {CloudVolumes} from './CloudVolumes.ts';
import {random} from '../world/WorldConfig.ts';
/** Camera-local rain streaks: deterministic motion, no per-frame geometry rebuild or intersecting sheets. */
export class WeatherEffects{
 private clouds:CloudVolumes;private cloudScene=new T.Scene();
 readonly rain:T.LineSegments;private opacity={value:0};private time={value:0};private wind={value:.2};
 constructor(scene:T.Scene){this.clouds=new CloudVolumes(this.cloudScene);this.rain=createRainStreaks(this.opacity,this.time,this.wind);scene.add(this.rain);}
 createCloudPass(camera:T.PerspectiveCamera){return new CloudPass(this.cloudScene,camera,this.clouds);}
 setLighting(direction:T.Vector3,color:T.Color,day:number){this.clouds.setLighting(direction,color,day);}
 update(dt:number,camera:T.Camera,rain:number,wind:number,coverage=.4,visibility=16000){this.clouds.update(dt,rain,wind,coverage,visibility);this.time.value+=dt;this.opacity.value=rain;this.wind.value=wind;this.rain.position.copy(camera.position);this.rain.visible=rain>.005;}
 dispose(){this.clouds.dispose();this.rain.removeFromParent();this.rain.geometry.dispose();(this.rain.material as T.Material).dispose();}
}

export function createRainStreaks(opacity={value:0},time={value:0},wind={value:.2}){
  const rng=random(713),positions:number[]=[],tips:number[]=[];
  for(let i=0;i<1400;i++){const x=(rng()-.5)*110,y=rng()*65,z=(rng()-.5)*110;for(const tip of[0,1]){positions.push(x,y+tip*1.7,z);tips.push(tip);}}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('tip',new T.Float32BufferAttribute(tips,1));
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{...T.UniformsUtils.clone(T.UniformsLib.fog),rainOpacity:opacity,rainTime:time,windStrength:wind},
   vertexShader:`#include <common>
   #include <fog_pars_vertex>
   #include <logdepthbuf_pars_vertex>
   attribute float tip;uniform float rainTime;uniform float windStrength;varying float vFade;
   void main(){vec3 p=position;p.y=mod(p.y-tip*1.7-rainTime*32.,65.)-20.+tip*1.7;p.x+=sin(p.y*.015)*windStrength*7.;vFade=1.-smoothstep(22.,55.,length(p.xz));vec4 mvPosition=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mvPosition;
   #include <logdepthbuf_vertex>
   #include <fog_vertex>
   }`,fragmentShader:`#include <fog_pars_fragment>
   #include <logdepthbuf_pars_fragment>
   uniform float rainOpacity;varying float vFade;
   void main(){gl_FragColor=vec4(.65,.74,.79,rainOpacity*vFade*.34);
   #include <logdepthbuf_fragment>
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
   #include <fog_fragment>
   }`,fog:true});
  const rain=new T.LineSegments(geo,material);rain.name='Weather / rain streaks';rain.frustumCulled=false;rain.visible=false;return rain;
}
