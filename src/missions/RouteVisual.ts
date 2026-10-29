import * as T from 'three';import {route} from './MissionManager';import type {MissionManager} from './MissionManager';
export class RouteVisual {
 readonly root=new T.Group();private rings:T.Mesh[]=[];
 constructor(){for(const point of route){const ring=new T.Mesh(new T.TorusGeometry(point.radius,1.6,8,64),new T.MeshBasicMaterial({color:0xf2d28c,transparent:true,opacity:.7}));ring.position.copy(point.position);ring.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),point.normal);this.rings.push(ring);this.root.add(ring);}}
 update(mission:MissionManager,time:number){this.rings.forEach((ring,i)=>{ring.visible=mission.state==='RUNNING'&&i>=mission.index&&i<=mission.index+1;(ring.material as T.MeshBasicMaterial).opacity=i===mission.index?.65+Math.sin(time*2)*.15:.16;});}
}
