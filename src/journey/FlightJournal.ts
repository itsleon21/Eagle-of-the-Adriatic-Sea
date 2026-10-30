import {islands} from '../world/WorldConfig.ts';
export const islandStories:Record<string,{role:string;souvenir:string}>={harbor:{role:'补给港 · 邮航起点',souvenir:'港湾船锚章'},town:{role:'钟楼小镇 · 邮递与观光',souvenir:'红瓦钟楼章'},lighthouse:{role:'灯塔高地 · 导航训练',souvenir:'守灯人徽记'},pine:{role:'松林巡护站 · 补给运输',souvenir:'松枝巡护章'},coral:{role:'珊瑚浅海 · 纪念赛场',souvenir:'珊瑚航标章'},cove:{role:'隐秘海湾 · 探索发现',souvenir:'海蚀拱门章'}};
export const commissions=[
 {id:'post',from:'harbor',to:'town',title:'跨海邮袋',detail:'把港口今日的邮袋送往海岸小镇，在小镇栈桥靠泊交付。'},
 {id:'tour',from:'town',to:'lighthouse',title:'钟楼到灯塔',detail:'带访客沿海飞往灯塔岛，完成观光后靠泊灯塔栈桥。'},
 {id:'navigation',from:'lighthouse',to:'harbor',via:'lighthouse',title:'守灯人的导航课',detail:'先飞过灯塔岛外海观察点（海拔60–250米），再返回港口靠泊。'},
 {id:'supplies',from:'pine',to:'harbor',title:'松林巡护回执',detail:'从巡护站带回巡林记录，靠泊港口交给补给员。'},
 {id:'survey',from:'coral',to:'pine',via:'coral',title:'浅海观察笔记',detail:'低空经过珊瑚岛外海观察点（海拔60–250米），把记录送到松林巡护站。'},
 {id:'secret',from:'cove',to:'town',title:'隐湾手绘航图',detail:'将隐秘海湾的手绘航图带回小镇，在小镇栈桥完成交付。'}
];
export interface JournalSave {version:1;visited:string[];docked:string[];completed:string[];entries:string[];airSeconds:number;distance:number;photos:number;raceWinner:boolean;livery:'original'|'azure'|'ivory'}
const empty=():JournalSave=>({version:1,visited:[],docked:[],completed:[],entries:[],airSeconds:0,distance:0,photos:0,raceWinner:false,livery:'original'});
export class FlightJournal {
 data=empty();active?:{id:string;observed:boolean};private saveTime=0;private previous?:{x:number;z:number};private storage?:Pick<Storage,'getItem'|'setItem'>;
 constructor(storage?:Pick<Storage,'getItem'|'setItem'>){try{this.storage=storage??globalThis.localStorage;const v=JSON.parse(this.storage?.getItem('adriatic.journal.v1')??'null');if(v?.version===1){const ids=islands.map(d=>d.id);for(const key of ['visited','docked','completed'] as const)this.data[key]=Array.isArray(v[key])?[...new Set<string>(v[key].filter((s:unknown)=>typeof s==='string'&&(key==='completed'?commissions.map(c=>c.id):ids).includes(s)))]:[];this.data.entries=Array.isArray(v.entries)?v.entries.filter((s:unknown)=>typeof s==='string'&&s.length<180).slice(-40):[];for(const key of ['airSeconds','distance','photos'] as const)this.data[key]=Number.isFinite(v[key])?Math.max(0,Math.min(1e8,v[key])):0;this.data.raceWinner=v.raceWinner===true;this.data.livery=v.livery==='azure'||v.livery==='ivory'?v.livery:'original';if(!this.unlocked(this.data.livery))this.data.livery='original';}}catch{}}
 persist(){try{this.storage?.setItem('adriatic.journal.v1',JSON.stringify(this.data));}catch{}}
 private note(text:string){this.data.entries.push(new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date())+' · '+text);this.data.entries=this.data.entries.slice(-40);this.persist();}
 unlocked(id:string){return id==='original'||id==='azure'&&this.data.visited.length>=3||id==='ivory'&&(this.data.completed.length>=2||this.data.raceWinner);}
 selectLivery(id:string){if(!this.unlocked(id)||!['original','azure','ivory'].includes(id))return false;this.data.livery=id as JournalSave['livery'];this.persist();return true;}
 accept(id:string,berth?:string){const c=commissions.find(c=>c.id===id);if(!c||this.active||berth!==c.from||this.data.completed.includes(id))return false;this.active={id,observed:!c.via};this.note('接取委托 · '+c.title);return true;}
 cancel(){if(this.active){this.note('取消委托 · '+commissions.find(c=>c.id===this.active!.id)!.title);this.active=undefined;}}
 resetFlight(){this.previous=undefined;this.cancel();this.persist();}
 update(dt:number,p:{x:number;y:number;z:number},airborne:boolean,berth?:string){
  if(!Number.isFinite(dt)||dt<=0||dt>.2||![p.x,p.y,p.z].every(Number.isFinite))return [];
  this.saveTime+=dt;if(this.saveTime>=30){this.saveTime=0;this.persist();}
  const messages:string[]=[];
  if(airborne){this.data.airSeconds+=dt;if(this.previous){const d=Math.hypot(p.x-this.previous.x,p.z-this.previous.z);if(d<200)this.data.distance+=d;}}this.previous={x:p.x,z:p.z};
  for(const island of islands){if(p.y<450&&Math.hypot((p.x-island.x)/island.rx,(p.z-island.z)/island.rz)<1.25&&!this.data.visited.includes(island.id)){this.data.visited.push(island.id);const text='发现 · '+island.name;this.note(text);messages.push(text);}}
  if(berth&&islandStories[berth]&&!this.data.docked.includes(berth)){this.data.docked.push(berth);if(!this.data.visited.includes(berth))this.data.visited.push(berth);this.note('靠泊纪念 · '+islandStories[berth].souvenir);messages.push('获得 '+islandStories[berth].souvenir);}
  const c=commissions.find(c=>c.id===this.active?.id);if(c&&this.active){const target=c.via?islands.find(d=>d.id===c.via):undefined;if(target&&p.y>=60&&p.y<=250&&Math.hypot(p.x-target.x-target.rx-350,p.z-target.z)<220){this.active.observed=true;}if(berth===c.to&&this.active.observed){this.data.completed.push(c.id);this.active=undefined;this.note('完成委托 · '+c.title);messages.push('委托完成 · '+c.title);}}
  return messages;
 }
 photo(){this.data.photos++;this.note('摄影留念 · 第'+this.data.photos+'张');}
 raceWon(){if(!this.data.raceWinner){this.data.raceWinner=true;this.note('施耐德纪念赛 · 首次完赛');}}
}
