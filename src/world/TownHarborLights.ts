import * as T from 'three';import {islands,terrainHeight} from './WorldConfig.ts';import {townBreakwaterArms} from './IslandDetails.ts';
export class TownHarborLights{
 readonly root=new T.Group();private lamps:T.MeshBasicMaterial[]=[];
 constructor(){const d=islands.find(i=>i.id==='town')!;this.root.name='Town harbour / red and green entrance beacons';for(const arm of townBreakwaterArms){const end=arm.at(-1)!,x=d.x-end[0]*d.rx,z=d.z-end[1]*d.rz,h=Math.max(4.6,terrainHeight(d,x,z)+.5),material=new T.MeshBasicMaterial({color:x>d.x?0xef6445:0x5dcda6}),lamp=new T.Mesh(new T.SphereGeometry(.65,10,8),material);lamp.position.set(x,h+5.05,z);this.root.add(lamp);this.lamps.push(material);}}
 setNightness(n:number){for(const [i,m] of this.lamps.entries())m.color.setHex(i===0?0xef6445:0x5dcda6).multiplyScalar(.6+n*2.4);}
}
