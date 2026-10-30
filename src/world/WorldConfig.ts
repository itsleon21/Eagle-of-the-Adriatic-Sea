export interface IslandDefinition { id:string; name:string; x:number; z:number; rx:number; rz:number; height:number; seed:number; bay:boolean; canonical?:boolean }
const islandTemplates:IslandDefinition[] = [
 {id:'harbor',name:'港口基地',x:-2400,z:1500,rx:525,rz:450,height:145,seed:13,bay:true},
 {id:'town',name:'海岸小镇',x:400,z:-2600,rx:710,rz:620,height:216,seed:37,bay:true},
 {id:'lighthouse',name:'灯塔岛',x:3000,z:120,rx:310,rz:350,height:130,seed:63,bay:false},
 {id:'cove',name:'隐秘海湾',x:-2900,z:-2500,rx:400,rz:300,height:120,seed:81,bay:true},
 {id:'pine',name:'松林岛',x:-250,z:4000,rx:410,rz:380,height:160,seed:107,bay:false},
 {id:'coral',name:'珊瑚小岛',x:3200,z:3800,rx:230,rz:195,height:24,seed:151,bay:false},
];
/** Fixed sea seed gives reproducible, irregular spacing while preserving the harbour runway. */
export function createArchipelago(seed:number):IslandDefinition[]{
 const rng=random(seed);
 for(let restart=0;restart<200;restart++){
  const result=[{...islandTemplates[0]}];let failed=false;
  // Place an interior island first, then sample the entire sea with unequal clear-water gaps.
  const order=[islandTemplates[4],...islandTemplates.slice(1).filter(d=>d.id!=='pine')];
  for(const template of order){let placed=false;
   for(let attempt=0;attempt<1000;attempt++){
    const interior=template.id==='pine',x=Math.round(interior?-600+rng()*2000:-5100+rng()*10200),z=Math.round(interior?-700+rng()*1800:-5100+rng()*10200),radius=Math.max(template.rx,template.rz)*1.12;
    if(Math.abs(x)+radius>5750||Math.abs(z)+radius>5750)continue;
    const gap=template.id==='coral'?1450:1700;
    if(result.some(other=>Math.hypot(x-other.x,z-other.z)-radius-Math.max(other.rx,other.rz)*1.12<gap))continue;
    // Keep the base's departure water runway clear of unrelated islands.
    if(x>-2500&&x<-1000&&Math.abs(z-2010)<700+radius)continue;
    result.push({...template,x,z});placed=true;break;
   }if(!placed){failed=true;break;}
  }if(!failed)return islandTemplates.map(t=>result.find(d=>d.id===t.id)!);
 }throw new Error('无法生成安全的群岛布局');
}
export const SeaSeed=8033;
export const islands=createArchipelago(SeaSeed);
export const reefs:IslandDefinition[]=[
 {id:'reef-west',name:'西风礁',x:-5200,z:-4200,rx:98,rz:72,height:19,seed:231,bay:false},
 {id:'reef-east',name:'琥珀礁',x:4600,z:-4500,rx:76,rz:114,height:24,seed:419,bay:false},
 {id:'reef-channel',name:'双岩礁',x:4800,z:2600,rx:112,rz:65,height:17,seed:587,bay:false},
];
export const allLandforms=[...islands,...reefs];
/** Chart coverage, in meters. The sea remains open beyond the chart. */
export const WorldBounds=Object.freeze({minX:-6000,maxX:6000,minZ:-6000,maxZ:6000,size:12000});
export const harbor=islands[0];
export const harborRunway=Object.freeze({x:harbor.x,z:harbor.z+510,length:950,width:190});
export const smooth=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export const terrainSegments=(d:IslandDefinition)=>d.id.startsWith('reef-')?96:d.id==='coral'?128:192;
export const bayProfile=(d:IslandDefinition)=>d.id==='town'?{offset:.72,rx:.52,rz:.27}:{offset:.62,rx:.43,rz:.48};
/** Meter-scale distance from the sheltered bay shore, positive towards the land. */
export function harborInlandDistance(d:IslandDefinition,x:number,z:number){
 if(d.id==='town'&&!d.canonical)return harborInlandDistance({...d,canonical:true},2*d.x-x,2*d.z-z);
 const bay=bayProfile(d),dx=x-d.x,dz=z-d.z-d.rz*bay.offset,r=Math.hypot(dx,dz),a=Math.atan2(dz,dx);
 const shore=1/Math.hypot(Math.cos(a)/(d.rx*bay.rx),Math.sin(a)/(d.rz*bay.rz));
 return r-shore;
}
/** Broad low waterfront, town terraces, then wooded uplands. All transitions are gentle ramps. */
export function harborTerraceHeight(inland:number){
 return -9+9*smooth(-38,0,inland)+4.5*smooth(0,18,inland)
  +11.5*smooth(48,108,inland)+18*smooth(138,208,inland)
  +24*smooth(235,315,inland)+32*smooth(350,440,inland)+24*smooth(475,575,inland);
}
/** Reference island: an enclosed lagoon, southern beach outlet and eastern sea cave. */
export const coveCave=Object.freeze({minX:220,maxX:365,z:-55,halfWidth:52});
export function coveRoofBottom(z:number,x=290){
 const t=(z-coveCave.z)/coveCave.halfWidth,shaped=t+.10*Math.sin(Math.PI*t),envelope=Math.max(0,1-t*t);
 return -7+68*Math.sqrt(Math.max(0,1-shaped*shaped))+envelope*(4*Math.sin(z*.12+x*.041)+3*Math.cos(z*.21-x*.033));
}
export function coveLandHeight(d:IslandDefinition,x:number,z:number){
 const lx=x-d.x,lz=z-d.z,angle=Math.atan2((lz-25)/.8,lx);
 const ripple=22*Math.sin(angle*3+.8)+13*Math.sin(angle*7)+6*Math.sin(angle*13);
 const r=Math.hypot(lx,(lz-25)/.79),shore=174+ripple;
 const inland=r-shore;
 // The beach is broad and low; successive limestone shelves rise behind it.
 const north=1-smooth(-160,150,lz);
 const shelf=12*Math.sin(angle*4+.7)+8*Math.cos(angle*9);
 let h=-8+8*smooth(-46,0,inland)+4*smooth(0,26,inland)
  +(18+17*north)*smooth(36+shelf,61+shelf,inland)
  +(15+19*north)*smooth(83-shelf,108-shelf,inland)
  +(15+23*north)*smooth(130+shelf,159+shelf,inland);
 h+=smooth(28,100,inland)*(7*Math.sin(lx*.039+lz*.015)+5*Math.cos(lz*.043)+4*Math.sin(lx*.08)*Math.cos(lz*.065));
 const outer=Math.hypot(lx/(d.rx*(1+.065*Math.sin(angle*5)+.03*Math.sin(angle*11))),lz/(d.rz*(1+.065*Math.cos(angle*7))));
 h=Math.min(h, -30+(1-smooth(.84,1.025,outer))*158);
 // A gently sloping sand spit frames a water outlet towards the foreground.
 const mouth=(1-smooth(58,104,Math.abs(lx-35)))*smooth(108,205,lz);
 return Math.min(h,-9+(1-mouth)*150);
}
export function terrainHeight(d:IslandDefinition,x:number,z:number) {
 if(d.id==='town'&&!d.canonical)return terrainHeight({...d,canonical:true},2*d.x-x,2*d.z-z);
 if(d.id.startsWith('reef-')){const u=(x-d.x)/d.rx,v=(z-d.z)/d.rz,a=Math.atan2(v,u),r=Math.hypot(u,v)/(1+.16*Math.sin(a*3+d.seed)+.08*Math.cos(a*7));return -24+(d.height+24)*(1-smooth(.34,1.10,r))*(.73+.27*Math.sin(u*4.3+v*2.1+d.seed)**2);}

 if(d.id==='cove'){
  const lx=x-d.x,lz=z-d.z;
  const h=coveLandHeight(d,x,z);
  // The roof is a separate solid mesh: a height field cannot represent an overhang.
  if(lx>150&&Math.abs(lz-coveCave.z)<coveCave.halfWidth)return Math.min(h,-8);
  return h;
 }
 const lx=x-d.x,lz=z-d.z, angle=Math.atan2(lz/d.rz,lx/d.rx);
 // The town is a broad, lopsided headland; the base retains its compact horseshoe.
 const coast=d.id==='town'?1+.085*Math.sin(angle*2+.4)+.04*Math.sin(angle*3-1)+.025*Math.cos(angle*7):1+0.065*Math.sin(angle*5+d.seed)+0.04*Math.cos(angle*9+d.seed);
 const r=Math.hypot(lx/d.rx,lz/d.rz)/coast;
 if(r>1.08)return -30;
 const nx=lx/d.rx,nz=lz/d.rz;
 const gaussian=(cx:number,cz:number,sx:number,sz:number)=>Math.exp(-(((nx-cx)/sx)**2+((nz-cz)/sz)**2));
 let h:number;
 if(d.id==='coral'){
  // A pale low sand cay and a broad submerged reef shelf; no mountain or conifer forest.
  const sand=-4+8*(1-smooth(.49,.97,r));
  h=Math.max(sand,-7+31*gaussian(-.12,-.12,.43,.43));
  h=Math.min(h,-30+(1-smooth(.98,1.075,r))*54);
 }else if(d.id==='lighthouse'){
  // A single broken high mesa, with a small beacon summit rather than concentric cones.
  const rockR=r*(1+.095*Math.sin(angle*3+.6)+.045*Math.cos(angle*7)+.025*Math.sin(lz*.04));
  h=-15+25*(1-smooth(.87,1.035,r))+130*(1-smooth(.59,.83,rockR))+35*gaussian(0,0,.31,.31);
  h+=smooth(.28,.48,r)*(1-smooth(.79,.95,r))*(5*Math.sin(lx*.046)+4*Math.cos(lz*.039));
  if(h>0)h*=d.height/175;
 }else if(d.id==='pine'){
  const ridges=83*gaussian(-.27,-.19,.42,.54)+72*gaussian(.28,.12,.31,.43)+42*gaussian(.03,-.58,.38,.25);
  h=-9+25*(1-smooth(.65,1.02,r))+ridges*1.6;
  if(h>32){const shelf=h/24;h=h*.65+(Math.floor(shelf)+smooth(.1,.85,shelf%1))*24*.35;}
 }else{
  const north=1-smooth(-.75,.25,nz),ridge=6*Math.sin(lx*.018)+4*Math.cos(lz*.027+lx*.009);
  const high=d.height*(.48+.38*north)+ridge+28*gaussian(.08,-.63,.28,.23);
  h=-12+(1-smooth(.76,1.035,r))*(high+12);
  const inland=harborInlandDistance(d,x,z);
  const town=d.id==='town';
  const terraces=town?(-9+13.5*smooth(-38,18,inland)+13*smooth(78,150,inland)+20*smooth(220,320,inland)+34*smooth(390,510,inland)+28*smooth(560,700,inland)):harborTerraceHeight(inland);
  h=Math.min(h,terraces);
  if(!town)h+=54*gaussian(-.43,-.64,.20,.26)*smooth(155,270,inland);
  else h+=125*gaussian(-.48,-.57,.31,.32)*smooth(260,410,inland)+65*gaussian(.36,-.68,.24,.20)*smooth(350,490,inland);
 }
 h=Math.min(d.height,h);
 if(d.id==='harbor'){
  // The full marked 190 m water runway stays clear, including the irregular eastern shore.
  const channel=(1-smooth(95,125,Math.abs(lz-510)))*smooth(-160,-100,lx)*(1-smooth(900,1100,lx));
  h=Math.min(h,-7+(1-channel)*d.height);
 }
 return h;
}
export function random(seed:number) {return()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
