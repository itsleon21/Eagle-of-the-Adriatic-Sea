import type {RaceGhost} from './RaceGhost';
import {getAircraft} from '../aircraft/AircraftCatalog.ts';
import type {AircraftId} from '../aircraft/FlightConfig.ts';
import {formatTime} from '../missions/MissionManager.ts';
import {raceCourse} from './RaceManager.ts';
import type {RaceManager} from './RaceManager.ts';
export class RaceUI{
 readonly offer:HTMLDialogElement;private panel:HTMLElement;
 constructor(app:HTMLElement,readonly returnAircraft:string){
  app.insertAdjacentHTML('beforeend',`<dialog id="race-invitation" aria-labelledby="race-offer-title"><div class="eyebrow">CORAL ISLAND / SCHNEIDER MEMORIAL</div><h2 id="race-offer-title">来一场海上竞速？</h2><p>珊瑚岛施耐德纪念赛 · 三圈计时挑战。进入专用机库，选择 Supermarine S.6、Gloster VI 或 Macchi M.67。起飞后穿过起点开始计时，依次通过四座航门；完赛后欣赏烟花。建议保持海拔100–220米，离开水面后再穿门。</p><p>可随时继续游览。比赛是游戏中的纪念赛，飞机性能为游戏调校。</p><div class="race-offer-actions"><a class="primary" href="./aircraft.html?race=1&aircraft=s6&returnAircraft=${returnAircraft}">进入比赛机库 ↗</a><button id="race-decline" class="text-button">继续飞行游览</button></div></dialog><aside id="race-status" hidden aria-label="比赛进度"><small>施耐德纪念赛 / 三圈计时</small><div id="race-aircraft"></div><h2 id="race-phase"></h2><b id="race-timer">00:00.0</b><p id="race-next"></p><p id="race-best"></p><p id="race-sector"></p><p id="race-laps"></p><label class="ghost-option"><input id="race-ghost" type="checkbox" checked> 个人最佳幽灵</label><p id="race-ghost-note"></p><div id="race-finish" hidden><button id="race-retry">再赛一次 ↻</button></div><a class="race-exit" href="./?aircraft=${returnAircraft}&launch=1&berth=coral&tour=1">结束比赛，继续游览 ↗</a></aside>`);
  this.offer=app.querySelector('#race-invitation')!;this.panel=app.querySelector('#race-status')!;
  app.querySelector('#race-decline')!.addEventListener('click',()=>this.close());this.offer.addEventListener('cancel',()=>this.close());
 }
 get blocking(){return this.offer.open;}
 invite(){this.offer.showModal();}
 close(){this.offer.close();}
 update(race:RaceManager,aircraft:string,retry:()=>void,ghost?:RaceGhost){
  this.panel.hidden=false;document.body.classList.add('race-playing');const get=(id:string)=>document.getElementById(id)!;
  get('race-aircraft').textContent=getAircraft(aircraft as AircraftId).name;get('race-phase').textContent=race.state==='COUNTDOWN'?`准备 · ${Math.ceil(race.countdown)}`:race.state==='READY'?'起飞，前往计时起点':race.state==='COMPLETED'?'比赛完成！':race.state==='FAILED'?'比赛中断':`第 ${race.lap+1} / ${race.laps} 圈`;
  get('race-timer').textContent=formatTime(race.elapsed);get('race-next').textContent=race.current?`下一航门 · ${raceCourse[race.index].name}`:race.state==='COMPLETED'?'烟花为你绽放 · 可继续自由飞行':'';
  const sector=race.sectors.length,last=sector?race.sectors[sector-1]:0,previous=sector>1?race.sectors[sector-2]:0,benchmark=ghost?.best?.sectors[sector-1],delta=benchmark===undefined?undefined:last-benchmark;
  get('race-sector').textContent=sector?`第 ${sector} 段 · ${formatTime(last-previous)}${delta===undefined?'':` / ${delta<=0?'领先':'落后'} ${Math.abs(delta).toFixed(1)}秒`}`:'穿过起点后开始计时';
  get('race-laps').textContent=race.splits.map((t,i)=>`第${i+1}圈 ${formatTime(t-(race.splits[i-1]??0))}`).join(' · ');
  const toggle=get('race-ghost') as HTMLInputElement;toggle.disabled=!ghost?.best;toggle.onchange=()=>{if(ghost)ghost.enabled=toggle.checked;};get('race-ghost-note').textContent=ghost?.best?'淡青色线框 · 本机型最佳航迹':'首次完赛后解锁';toggle.title=ghost?.best?'淡青色线框显示本机型的个人最佳航迹':'首次完赛后解锁个人最佳幽灵';
  const terminal=race.state==='COMPLETED'||race.state==='FAILED';get('race-finish').hidden=!terminal;(get('race-retry') as HTMLButtonElement).onclick=retry;
  let best='';try{const key='adriatic.race.best.'+aircraft,old=Number(localStorage.getItem(key));if(race.state==='COMPLETED'&&(!old||race.elapsed<old))localStorage.setItem(key,String(race.elapsed));const saved=Number(localStorage.getItem(key));if(saved)best='本机最佳 · '+formatTime(saved);}catch{}get('race-best').textContent=best;
 }
}
