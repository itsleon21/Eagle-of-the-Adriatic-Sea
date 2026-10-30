import {raceAircraftCatalog,isRaceAircraft} from '../race/RaceAircraft.ts';
import { FlightConfig, M5FlightConfig, MC72FlightConfig } from './FlightConfig.ts';
import type { AircraftId, FlightTuning } from './FlightConfig.ts';
export interface AircraftDefinition {
  id: AircraftId; name: string; number: string; subtitle: string; description: string;
  modelFile: string; span: number; length: number; color: number;
  engineFocus: readonly [number, number, number]; propellerRadius: number; propellerDirection: number;
  cockpitEye:readonly[number,number,number]; tuning: Readonly<FlightTuning>;
}
export const aircraftCatalog: readonly AircraftDefinition[] = [
  { id:'redwing', name:'红翼一号', number:'01', subtitle:'迅捷 · 灵活 · 特技飞行',
    description:'朱红单翼飞行艇。响应敏捷，适合高速掠海与翻滚机动。',
    modelFile:'aircraft.glb', span:12, length:8.5, color:0xb93424,
    engineFocus:[0,1.53,-1.1], propellerRadius:.98, propellerDirection:1, cockpitEye:[0,1.18,1.25], tuning:FlightConfig },
  { id:'m5', name:'M5战斗飞艇', number:'02', subtitle:'双翼 · 平缓 · 慢速观光',
    description:'浅灰色布面双翼与木质船身。巡航更慢，操控平缓，适合细看群岛风景。',
    modelFile:'m5.glb', span:11.9, length:8.4, color:0x4b5140,
    engineFocus:[0,1.45,.05], propellerRadius:.93, propellerDirection:-1, cockpitEye:[0,1.15,-1.35], tuning:M5FlightConfig },
 {id:'mc72',name:'马基 MC.72',number:'03',subtitle:'双浮筒 · 同轴对转 · 竞速特技',description:'意大利低翼水上竞速飞机。双浮筒、同轴对转双桨与黄铜散热蒙皮，适合疾速掠海与游戏特技飞行。',modelFile:'mc72.glb',span:9.48,length:8.32,color:0xb51e15,engineFocus:[0,.22,-3.5],propellerRadius:1.25,propellerDirection:1,cockpitEye:[0,.86,1.16],tuning:MC72FlightConfig},
];
export function isAircraftId(value: unknown): value is AircraftId { return aircraftCatalog.some(plane=>plane.id===value); }
export function getAircraft(id: AircraftId): AircraftDefinition { return [...aircraftCatalog,...raceAircraftCatalog].find(aircraft=>aircraft.id===id)!; }
export function cruiseKmh(aircraft: AircraftDefinition) { return Math.round(aircraft.tuning.cruiseSpeed*3.6/10)*10; }
export function resolveAircraftId(search: string, saved: unknown): AircraftId {
  const raw=new URLSearchParams(search).get('aircraft');const query=raw==='albatross'?'mc72':raw;const stored=saved==='albatross'?'mc72':saved;
  return isAircraftId(query)?query:isAircraftId(stored)?stored:'redwing';
}
const selectionKey='adriatic-eagle.aircraft';
export function selectedAircraftId(): AircraftId {
  const raceQuery=new URLSearchParams(location.search);if(raceQuery.get('race')==='1')return isRaceAircraft(raceQuery.get('aircraft'))?raceQuery.get('aircraft') as AircraftId:'s6';
  let saved: string|null=null;
  try { saved=localStorage.getItem(selectionKey); } catch { /* Storage can be denied in private browsing. */ }
  return resolveAircraftId(location.search,saved);
}
export function saveAircraftSelection(id: AircraftId) { if(isRaceAircraft(id))return;try { localStorage.setItem(selectionKey,id); } catch { /* The URL also carries the selection. */ } }
