import {FlightJournal} from './journey/FlightJournal';
import {AircraftLivery} from './rendering/AircraftLivery';
import {raceAircraftCatalog,isRaceAircraft} from './race/RaceAircraft.ts';
import {PackedSunShadows} from './rendering/PackedSunShadows';
import * as T from 'three';
import {mooringSites} from './world/Moorings';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import WebGL from 'three/addons/capabilities/WebGL.js';
import {AircraftModel} from './aircraft/AircraftModel';
import {aircraftCatalog,cruiseKmh,getAircraft,selectedAircraftId,saveAircraftSelection,isAircraftId} from './aircraft/AircraftCatalog';
import type {AircraftId} from './aircraft/FlightConfig';
import './inspector.css';

const app=document.querySelector<HTMLElement>('#hangar')!;
const racing=new URLSearchParams(location.search).get('race')==='1',requestedReturn=new URLSearchParams(location.search).get('returnAircraft'),returnAircraft=isAircraftId(requestedReturn)?requestedReturn:'redwing';
const fleetCatalog=racing?raceAircraftCatalog:aircraftCatalog;
let selected=getAircraft(selectedAircraftId());
app.innerHTML=`<div id="model-viewport"></div>
<header><a id="back-home" href="./index.html">← 返回首页</a><span>亚德里亚之鹰 <i>/</i> ${racing?'比赛机库 · 三圈计时赛':'海港机库'}</span><span class="edition">THE ADRIATIC FLEET</span></header>
<div class="hangar-rail" aria-hidden="true">HANGAR No. 01 <span>ADRIATIC COAST · ITALIA</span></div><section class="model-title"><div>CHOOSE YOUR WINGS</div><h1 id="aircraft-title"></h1><p id="aircraft-subtitle"></p></section>
<section class="fleet" aria-label="选择飞机">${fleetCatalog.map(plane=>`<button class="fleet-choice" data-aircraft="${plane.id}" aria-pressed="false"><span class="fleet-number">${plane.number}</span><span class="fleet-copy"><strong>${plane.name}</strong><small>${plane.subtitle}</small></span><span class="fleet-speed"><b>${cruiseKmh(plane)}</b><small>巡航 KM/H</small></span><span class="fleet-check" aria-hidden="true">✓</span></button>`).join('')}<p class="fleet-note" id="aircraft-description"></p></section>
<aside class="aircraft-specs"><div class="specs-heading">AIRCRAFT DATA</div><span>翼展 <b id="span-value"></b></span><span>机长 <b id="length-value"></b></span><span>驾驶风格 <b class="handling-value" id="handling-value"></b></span></aside>
<footer><div class="views" role="group" aria-label="观察视角"><button data-view="beauty" aria-pressed="true">透视</button><button data-view="top" aria-pressed="false">顶视</button><button data-view="side" aria-pressed="false">侧视</button><button data-view="front" aria-pressed="false">正视</button><button data-view="engine" aria-pressed="false">发动机</button></div><label><input type="checkbox" id="rotor"> 转动螺旋桨</label><label class="departure-site">起点 <select id="departure-site" aria-label="出发地点"><option value="">港口起飞水域</option>${mooringSites.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</select></label><button id="select-aircraft" class="depart">驾驶这架出发 <span>↗</span></button></footer>
<span class="model-stage-label" aria-hidden="true">CRAFTED TO FLY <i>03 / THE FLEET COLLECTION</i></span><span id="view-hint">拖动旋转 · 滚轮缩放</span><div id="loading" role="status">正在准备飞机…</div>`;
const text=(id:string,value:string)=>{document.getElementById(id)!.textContent=value;};
function updateSelection(){
 document.title=`${selected.name} · 机库 · 亚德里亚之鹰`;
 text('aircraft-title',selected.name);text('aircraft-subtitle',selected.subtitle);text('aircraft-description',selected.description);
 document.querySelector('#span-value')!.innerHTML=`${selected.span.toFixed(1)} <small>m</small>`;
 document.querySelector('#length-value')!.innerHTML=`${selected.length.toFixed(1)} <small>m</small>`;
 text('handling-value',selected.id==='redwing'?'疾速 / 可翻滚':isRaceAircraft(selected.id)?'纪念赛 / 竞速':selected.id==='mc72'?'竞速 / 特技':'舒缓 / 观光');
 for(const button of document.querySelectorAll<HTMLButtonElement>('[data-aircraft]'))button.setAttribute('aria-pressed',String(button.dataset.aircraft===selected.id));
 (document.querySelector('#back-home') as HTMLAnchorElement).href=racing?`./index.html?aircraft=${encodeURIComponent(returnAircraft)}&launch=1&berth=coral&tour=1`:`./index.html?aircraft=${selected.id}`;
}
updateSelection();
if(racing){text('back-home','← 返回珊瑚岛');document.querySelector('.departure-site')?.setAttribute('hidden','');document.querySelector('#select-aircraft')!.textContent='驾驶这架参加比赛 ↗';document.querySelector('.model-stage-label')!.textContent='SCHNEIDER MEMORIAL / RACE COLLECTION';}
const depart=document.querySelector<HTMLButtonElement>('#select-aircraft')!;
depart.addEventListener('click',()=>{saveAircraftSelection(selected.id);if(racing){location.href=`./index.html?race=1&aircraft=${selected.id}&launch=1&returnAircraft=${encodeURIComponent(returnAircraft)}&time=noon&weather=sunny`;return;}const site=(document.querySelector('#departure-site') as HTMLSelectElement).value;location.href=`./index.html?aircraft=${selected.id}&launch=1${site?'&berth='+site:''}`;});
if(!WebGL.isWebGL2Available()){
 text('loading','请使用支持 WebGL 2 的桌面浏览器。');depart.disabled=true;
}else{
 const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
 renderer.shadowMap.enabled=false;
 document.querySelector('#model-viewport')!.append(renderer.domElement);
 const scene=new T.Scene();scene.background=new T.Color(0xd4d2c9);
 const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();const environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.55;pmrem.dispose();room.dispose();
 const key=new T.DirectionalLight(0xfff0d9,2.8);key.position.set(-5,8,-7);key.target.position.set(0,.6,0);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=key.shadow.camera.bottom=-12;key.shadow.camera.right=key.shadow.camera.top=12;key.shadow.camera.near=.2;key.shadow.camera.far=55;key.shadow.normalBias=.008;key.shadow.bias=-.0001;scene.add(key,key.target,new T.HemisphereLight(0xf0ecdf,0x6c6555,.25));
 const rim=new T.DirectionalLight(0xffe7bb,.65);rim.position.set(5,4,7);scene.add(rim);
 const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:0xbfc1b8,roughness:.87}));floor.rotation.x=-Math.PI/2;floor.position.y=-selected.tuning.hullOffset-.07;floor.receiveShadow=true;scene.add(floor);const shadows=new PackedSunShadows();shadows.setWeather(0,0);shadows.prepare(floor);const shadowDirection=key.position.clone().sub(key.target.position).normalize();
 const perspective=new T.PerspectiveCamera(32,innerWidth/innerHeight,.05,200);perspective.position.set(-14,5,-15);
 const orthographic=new T.OrthographicCamera();orthographic.near=.05;orthographic.far=100;
 const focus=new T.Vector3(0,.65,0),controls=new OrbitControls(perspective,renderer.domElement);controls.target.copy(focus);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=7;controls.maxDistance=28;controls.maxPolarAngle=Math.PI*.49;controls.update();controls.saveState();
 let camera:T.Camera=perspective,view='beauty',request=0;
 function resize(){
  renderer.setSize(innerWidth,innerHeight);perspective.aspect=innerWidth/innerHeight;perspective.updateProjectionMatrix();
  const stageWidth=innerWidth>900?innerWidth-360:innerWidth,stageHeight=Math.max(180,innerHeight-(innerWidth>900?126:310)),stageLeft=innerWidth>900?360:0,stageTop=innerWidth>900?64:42;
  const horizontal=view==='side'?selected.length:selected.span,vertical=view==='top'?selected.length:3.6;
  const half=Math.max(vertical/2+.45,horizontal/(stageWidth/stageHeight)/2+.45)*innerHeight/stageHeight;
  orthographic.left=-half*innerWidth/innerHeight;orthographic.right=half*innerWidth/innerHeight;orthographic.top=half;orthographic.bottom=-half;orthographic.updateProjectionMatrix();
  const offsetX=innerWidth/2-stageLeft-stageWidth/2,offsetY=innerHeight/2-stageTop-stageHeight/2;
  perspective.setViewOffset(innerWidth,innerHeight,offsetX,offsetY,innerWidth,innerHeight);orthographic.setViewOffset(innerWidth,innerHeight,offsetX,offsetY,innerWidth,innerHeight);
 }

 function chooseView(next:string){
  view=next;const orbit=view==='beauty'||view==='engine';camera=orbit?perspective:orthographic;controls.enabled=orbit;floor.visible=view==='beauty';
  if(orbit){controls.minDistance=view==='engine'?1.8:7;controls.maxDistance=view==='engine'?10:28;controls.reset();if(view==='beauty'){controls.target.copy(focus);perspective.position.set(-selected.span*(racing?1.20:1.04),selected.span*.34,-selected.span*(racing?1.20:1.04));controls.update();}if(view==='engine'){controls.target.fromArray(selected.engineFocus);perspective.position.copy(controls.target).add(new T.Vector3(-3.4,.8,selected.id==='m5'?3.1:-2.9));controls.update();}}
  if(view==='top'){orthographic.position.set(0,20,0);orthographic.up.set(0,0,-1);}else if(view==='side'){orthographic.position.set(-20,.65,0);orthographic.up.set(0,1,0);}else if(view==='front'){orthographic.position.set(0,.65,-20);orthographic.up.set(0,1,0);}
  orthographic.lookAt(focus);resize();for(const button of document.querySelectorAll<HTMLButtonElement>('[data-view]'))button.setAttribute('aria-pressed',String(button.dataset.view===view));
  text('view-hint',orbit?'拖动旋转 · 滚轮缩放':'正交视图 · 切换透视可自由旋转');
 }
 for(const button of document.querySelectorAll<HTMLButtonElement>('[data-view]'))button.addEventListener('click',()=>chooseView(button.dataset.view!));
 const souvenir=new FlightJournal(),livery=new AircraftLivery();const model=new AircraftModel(selected.id);scene.add(model.root);
 async function chooseAircraft(id:AircraftId){
  const current=++request;selected=getAircraft(id);floor.position.y=-selected.tuning.hullOffset-.07;focus.y=selected.id==='mc72'||isRaceAircraft(selected.id)?-.15:.65;saveAircraftSelection(id);const url=new URL(location.href);url.searchParams.set('aircraft',id);if(racing)url.searchParams.set('race','1');history.replaceState(null,'',url);updateSelection();chooseView(view);renderer.domElement.setAttribute('aria-label',`${selected.name}三维模型`);
  const loading=document.querySelector<HTMLElement>('#loading')!;loading.hidden=false;loading.textContent=`正在准备${selected.name}…`;depart.disabled=true;
  const success=await model.load(renderer,id);if(current!==request)return;shadows.prepare(model.root);livery.apply(model.root,souvenir.data.livery,id);
  loading.hidden=success;if(!success)loading.textContent='精细模型未加载，当前使用程序外形。可重新选择重试。';depart.disabled=false;
  const viewport=document.querySelector<HTMLElement>('#model-viewport')!;viewport.dataset.model=model.assetStatus;viewport.dataset.aircraft=id;
 }
 for(const button of document.querySelectorAll<HTMLButtonElement>('[data-aircraft]'))button.addEventListener('click',()=>{void chooseAircraft(button.dataset.aircraft as AircraftId);});
 window.addEventListener('resize',resize);resize();void chooseAircraft(selected.id);
 const rotor=document.querySelector<HTMLInputElement>('#rotor')!;let previous=performance.now(),frames=0,frameStart=previous,animation=0;
 function render(now:number){const dt=Math.min(.05,(now-previous)/1000);previous=now;if(controls.enabled)controls.update();model.update(rotor.checked?dt:0,rotor.checked?.75:0,0,0,0);shadows.update(renderer,scene,focus,shadowDirection,0,rotor.checked);renderer.render(scene,camera);frames++;if(now-frameStart>1000){document.querySelector<HTMLElement>('#model-viewport')!.dataset.fps=(frames*1000/(now-frameStart)).toFixed(1);frames=0;frameStart=now;}animation=requestAnimationFrame(render);}
 animation=requestAnimationFrame(render);
 window.addEventListener('pagehide',()=>{request++;cancelAnimationFrame(animation);controls.dispose();model.dispose();floor.geometry.dispose();(floor.material as T.Material).dispose();key.shadow.dispose();shadows.dispose();environment.dispose();renderer.dispose();window.removeEventListener('resize',resize);},{once:true});
}
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
