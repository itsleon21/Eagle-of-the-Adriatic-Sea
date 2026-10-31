import * as T from 'three';
import {route} from './MissionManager.ts';
import type {MissionManager} from './MissionManager.ts';
import {FlightGate} from './FlightGate.ts';
export class RouteVisual {
 readonly root=new T.Group();
 private gates=route.map(point=>new FlightGate(point,0xffc56b,true));
 constructor(){this.root.name='Mission / luminous waypoints';this.root.add(...this.gates.map(g=>g.root));}
 pass(index:number){this.gates[index]?.reset();}
 reset(){this.gates.forEach(g=>g.reset());}
 update(mission:MissionManager,time:number){
  this.gates.forEach((g,i)=>g.update(time,!!mission.current&&i===mission.index,false));
 }
}
