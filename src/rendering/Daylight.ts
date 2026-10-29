import * as T from 'three';
import {daylightAt} from './TimeOfDay.ts';
import type {DaylightValues} from './TimeOfDay.ts';
import type {WeatherValues} from './WeatherConfig.ts';
import { Sky } from 'three/addons/objects/Sky.js';

import {CloudVolumes} from './CloudVolumes.ts';
import {PackedSunShadows} from './PackedSunShadows.ts';

/** A common HDR sky and sun drive reflections, aerial perspective and stable near/far shadows. */
export class Daylight {
 readonly sunDirection=new T.Vector3(-.52,.64,.56).normalize();
 readonly sunColor=new T.Color(0xffdfae);
 readonly fogColor=new T.Color(0x86aebc);
 private sky=new Sky();private environment:T.WebGLRenderTarget;private shadows=new PackedSunShadows();private sunlight=new T.DirectionalLight(0xffdfae,3.1);
 private renderer:T.WebGLRenderer;private hemi=new T.HemisphereLight(0xffedcf,0x8a744b,.16);private scene:T.Scene;private time=0;
 constructor(renderer:T.WebGLRenderer,scene:T.Scene,_camera:T.PerspectiveCamera){
  this.scene=scene;this.renderer=renderer;
  this.sky.scale.setScalar(24000);this.sky.renderOrder=-100;this.sky.frustumCulled=false;this.sky.material.depthTest=false;this.sky.material.depthWrite=false;
  const u=this.sky.material.uniforms;
  u.turbidity.value=2.5;u.rayleigh.value=2.5;u.mieCoefficient.value=.004;u.mieDirectionalG.value=.80;
  u.sunPosition.value.copy(this.sunDirection);u.cloudCoverage.value=0;u.cloudDensity.value=.65;u.cloudScale.value=.00075;u.cloudElevation.value=.35;u.cloudSpeed.value=.000012;
  u.horizonColor={value:this.fogColor.clone()};u.weatherVeil={value:0};u.nightness={value:0};u.dayWarmth={value:0};u.environmentProbe={value:0};
  this.sky.material.fragmentShader=this.sky.material.fragmentShader.replace('* showSunDisc;','* 0.0;');
  this.sky.material.fragmentShader='uniform vec3 horizonColor;uniform float weatherVeil;uniform float nightness;uniform float dayWarmth;uniform float environmentProbe;\n'+this.sky.material.fragmentShader.replace('#include <tonemapping_fragment>',
   'float horizonBlend=smoothstep(-.015,.19,normalize(vWorldPosition-cameraPosition).y);gl_FragColor.rgb=mix(horizonColor,gl_FragColor.rgb*mix(vec3(.48,.60,.72),vec3(.12),weatherVeil),horizonBlend);gl_FragColor.rgb=mix(gl_FragColor.rgb,gl_FragColor.rgb/(1.+gl_FragColor.rgb*.5),smoothstep(.1,.5,weatherVeil));gl_FragColor.rgb=mix(gl_FragColor.rgb,horizonColor,weatherVeil);gl_FragColor.rgb*=mix(vec3(1.),vec3(1.38,.69,.35),dayWarmth*.78);\n   vec3 nightRay=normalize(vWorldPosition-cameraPosition);vec3 nightSky=mix(horizonColor,vec3(.009,.016,.033),smoothstep(0.,.7,nightRay.y));\n   vec2 stars=vec2(atan(nightRay.z,nightRay.x),asin(clamp(nightRay.y,-1.,1.)))*180.,cell=floor(stars);float seed=fract(sin(dot(cell,vec2(12.9898,78.233)))*43758.5453);float radius=length(fract(stars)-.5),aa=max(.02,length(fwidth(stars)));float star=(1.-smoothstep(.055,.055+aa,radius))*step(.994,seed)*smoothstep(.12,.35,nightRay.y);\n   float moonAngle=dot(nightRay,normalize(vSunDirection));float moon= smoothstep(.99988,.99996,moonAngle);nightSky+=vec3(.46,.57,.76)*moon*smoothstep(.75,1.,nightness)+vec3(.45,.52,.68)*star;\n   gl_FragColor.rgb=mix(gl_FragColor.rgb,nightSky,nightness);\n   vec3 solarRay=normalize(vWorldPosition-cameraPosition);float solarDot=dot(solarRay,normalize(vSunDirection));float horizonVisibility=smoothstep(-.004,.003,solarRay.y);float sunDisc=smoothstep(.99966,.99976,solarDot);float solarHalo=pow(max(solarDot,0.),110.);float solarVisibility=horizonVisibility*showSunDisc*(1.-weatherVeil);gl_FragColor.rgb+=vec3(1.,.30,.065)*solarHalo*.42*solarVisibility*(1.-sunDisc);vec3 solarSurface=mix(vec3(5.,4.5,3.7),vec3(4.5,2.1,.75),dayWarmth)*(.78+.22*sqrt(clamp((solarDot-.99966)/.00034,0.,1.)));gl_FragColor.rgb=mix(gl_FragColor.rgb,solarSurface,sunDisc*solarVisibility);\n   if(environmentProbe>.5){float radianceLuma=dot(gl_FragColor.rgb,vec3(.2126,.7152,.0722));gl_FragColor.rgb=mix(vec3(radianceLuma),gl_FragColor.rgb,.06); }\n#include <tonemapping_fragment>');
  scene.add(this.sky);
  // Linear HDR radiance includes broad cloud highlights, without a blazing sun-disc reflection.
  const reflectionScene=new T.Scene(),reflectionSky=this.sky.clone();reflectionSky.material=this.sky.material.clone();
  reflectionSky.material.uniforms.showSunDisc.value=false;reflectionSky.material.uniforms.environmentProbe.value=1;reflectionSky.scale.setScalar(1000);reflectionScene.add(reflectionSky);
  const sea=new T.Mesh(new T.PlaneGeometry(4000,4000),new T.MeshBasicMaterial({color:0x77766e,side:T.DoubleSide}));sea.rotation.x=-Math.PI/2;sea.position.y=-12;reflectionScene.add(sea);
  const reflectionClouds=new CloudVolumes(reflectionScene);reflectionClouds.update(0,0,.25,.4,20000);reflectionClouds.setProbeNeutralness(1);
  const pmrem=new T.PMREMGenerator(renderer);this.environment=pmrem.fromScene(reflectionScene,.035,.1,16000,{size:256});scene.environment=this.environment.texture;scene.environmentIntensity=.45;
  scene.fog=new T.Fog(this.fogColor,3800,16000);pmrem.dispose();reflectionClouds.dispose();reflectionSky.material.dispose();sea.geometry.dispose();(sea.material as T.Material).dispose();
  scene.add(this.hemi);
  this.sunlight.position.copy(this.sunDirection).multiplyScalar(1800);this.sunlight.castShadow=false;scene.add(this.sunlight,this.sunlight.target);

 }
 prepare(root:T.Object3D){this.shadows.prepare(root);}
 setShadows(enabled:boolean){this.shadows.enabled=enabled;}

 update(_focus:T.Vector3,camera:T.PerspectiveCamera,flying:boolean,dt=0){
  this.time+=dt;this.sky.material.uniforms.time.value=this.time;this.sky.position.copy(camera.position);
  camera.updateMatrixWorld();this.sunlight.position.copy(_focus).addScaledVector(this.sunDirection,1800);this.sunlight.target.position.copy(_focus);this.shadows.update(this.renderer,this.scene,_focus,this.sunDirection,dt,flying);
 }
 setWeather(w:WeatherValues,clock:DaylightValues=daylightAt(12)){
  this.sunDirection.fromArray(clock.direction).normalize();this.sunColor.setRGB(clock.color[0],clock.color[1],clock.color[2]);this.sunColor.lerp(new T.Color(0xd7deeb),1-Math.min(1,clock.day/.18));
  this.shadows.setWeather(w.coverage,w.wind);
  const u=this.sky.material.uniforms;u.sunPosition.value.copy(this.sunDirection);u.showSunDisc.value=clock.day>.08&&clock.solarElevation>-.01;u.nightness.value=clock.nightness;u.dayWarmth.value=clock.warm;u.cloudCoverage.value=0;u.cloudDensity.value=w.density;u.cloudSpeed.value=.000008+w.wind*.000018;u.turbidity.value=w.haze;
  this.fogColor.setRGB(w.tint[0],w.tint[1],w.tint[2],T.SRGBColorSpace);this.fogColor.lerp(new T.Color(.28,.13,.07),clock.warm*.50).multiplyScalar(.12+clock.day*.88);u.horizonColor.value.copy(this.fogColor);u.weatherVeil.value=Math.max(Math.max(0,(w.coverage-.58)/.42)*.76,w.fogFar<3000?.38:0);
  const fog=this.scene.fog as T.Fog;fog.color.copy(this.fogColor);fog.near=w.fogNear;fog.far=w.fogFar;
  this.hemi.color.setHex(clock.day<.08?0xa5aaba:clock.warm>.3?0xffcf94:0xffedcf);this.hemi.intensity=.22+w.ambient*.60*clock.day;this.scene.environmentIntensity=(.23+w.ambient*.12)*(.40+.60*clock.day);this.scene.environmentRotation.y=(clock.hour-12)*.11;
  this.sunlight.intensity=w.sun*clock.day*1.18+.60*clock.nightness;this.sunlight.color.copy(this.sunColor).lerp(new T.Color(0xf0eeE7),w.coverage*.28);
 }
 dispose(){this.shadows.dispose();this.sunlight.dispose();this.environment.dispose();this.sky.material.dispose();this.sky.geometry.dispose();}
}
