import * as T from 'three';
export interface GhostFrame {t:number;p:number[];q:number[]}
export interface GhostRun {version:1;time:number;sectors:number[];frames:GhostFrame[]}
export function parseGhost(raw:string|null):GhostRun|undefined{
 try{const g=JSON.parse(raw??'null') as GhostRun;if(!g||g.version!==1||!Number.isFinite(g.time)||g.time<=0||g.time>3600||!Array.isArray(g.frames)||g.frames.length<2||g.frames.length>36002||!Array.isArray(g.sectors)||g.sectors.length!==12)return;
 let previous=-1;for(const f of g.frames){if(!Number.isFinite(f.t)||f.t<=previous||f.t>g.time+.01||!Array.isArray(f.p)||!Array.isArray(f.q)||f.p.length!==3||f.q.length!==4||![...f.p,...f.q].every(Number.isFinite)||f.p.some(v=>Math.abs(v)>100000)||Math.abs(Math.hypot(...f.q)-1)>.02)return;previous=f.t;}
 if(g.frames[0].t!==0||Math.abs(previous-g.time)>.01)return;
 previous=0;for(const t of g.sectors){if(!Number.isFinite(t)||t<=previous||t>g.time)return;previous=t;}if(Math.abs(previous-g.time)>.01)return;return g;
 }catch{return;}
}
export class RaceGhost {
 best?:GhostRun;private frames:GhostFrame[]=[];private saved=false;private visual?:T.Object3D;private material=new T.MeshBasicMaterial({color:0x86e4ed,wireframe:true,transparent:true,opacity:.19,depthWrite:false});enabled=true;
 private aircraft:string;
 constructor(aircraft:string){this.aircraft=aircraft;try{this.best=parseGhost(localStorage.getItem(this.key));}catch{}}
 private get key(){return 'adriatic.ghost.course1.'+this.aircraft;}
 reset(){this.frames=[];this.saved=false;if(this.visual)this.visual.visible=false;}
 record(t:number,position:T.Vector3,orientation:T.Quaternion,completed:boolean,sectors:readonly number[]){
  if(this.saved||t<0||t>3600)return;const last=this.frames.at(-1);
  if(!last||t-last.t>=.1||completed&&t>last.t)this.frames.push({t,p:position.toArray(),q:orientation.toArray()});
  if(completed){this.saved=true;const run:GhostRun={version:1,time:t,sectors:[...sectors],frames:this.frames};if((!this.best||t<this.best.time)&&parseGhost(JSON.stringify(run))){try{localStorage.setItem(this.key,JSON.stringify(run));}catch{}this.best=run;}}
 }
 attach(source:T.Object3D,scene:T.Scene){if(this.visual)return;const copy=source.clone(true);copy.traverse(o=>{if(o instanceof T.Mesh){o.material=this.material;o.castShadow=o.receiveShadow=false;}});copy.visible=false;copy.name='Personal best ghost / non-colliding';scene.add(copy);this.visual=copy;}
 show(t:number,running:boolean){const ghost=this.visual,run=this.best;if(!ghost)return;ghost.visible=!!run&&this.enabled&&running&&t<=run.time;if(!ghost.visible||!run)return;
 let lo=0,hi=run.frames.length-1;while(lo+1<hi){const mid=(lo+hi)>>1;if(run.frames[mid].t<=t)lo=mid;else hi=mid;}const a=run.frames[lo],b=run.frames[hi],f=T.MathUtils.clamp((t-a.t)/(b.t-a.t),0,1);ghost.position.fromArray(a.p).lerp(new T.Vector3().fromArray(b.p),f);ghost.quaternion.fromArray(a.q).slerp(new T.Quaternion().fromArray(b.q),f);
 }
 dispose(){this.visual?.removeFromParent();this.material.dispose();}
}
