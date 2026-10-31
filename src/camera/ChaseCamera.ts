import { PerspectiveCamera, Vector3, Quaternion, Euler, MathUtils } from 'three';
import {getAircraft} from '../aircraft/AircraftCatalog.ts';
import type { FlightController } from '../aircraft/FlightController.ts';
export const cameraViews=[{id:'chase',name:'追尾'},{id:'wide',name:'远距追尾'},{id:'side',name:'侧方'},{id:'overhead',name:'俯瞰'},{id:'cockpit',name:'驾驶舱'}] as const;
export class ChaseCamera {
  private index=0;private targetPosition=new Vector3();private look=new Vector3();private forward=new Vector3();private right=new Vector3();private desired=new Vector3();
  private lastAnchor=new Vector3();private anchored=false;
  private lookYaw=0;private lookPitch=0;private desiredYaw=0;private desiredPitch=0;private movement=true;
  get view(){return cameraViews[this.index];}
  lookAround(dx:number,dy:number){if(this.view.id!=='cockpit')return;this.desiredYaw=MathUtils.clamp(this.desiredYaw-dx*.004,-1.8,1.8);this.desiredPitch=MathUtils.clamp(this.desiredPitch-dy*.004,-.65,.8);}
  recenter(){this.desiredYaw=this.desiredPitch=0;}
  setMovement(enabled:boolean){this.movement=enabled;}

  readonly camera:PerspectiveCamera;
  constructor(camera:PerspectiveCamera){this.camera=camera;}
  cycle(flight:FlightController){this.recenter();this.lookYaw=this.lookPitch=0;this.index=(this.index+1)%cameraViews.length;this.update(flight,0,true);return this.view;}
  keepAbove(minimum:number){if(this.camera.position.y<minimum){this.camera.position.y=minimum;this.camera.lookAt(this.look);this.camera.updateMatrixWorld();}}
  reset(flight:FlightController){this.recenter();this.lookYaw=this.lookPitch=0;this.index=0;this.update(flight,1,true);}
  update(flight:FlightController,dt:number,immediate=false,pose?:{position:Vector3;quaternion:Quaternion}) {
    const speed=flight.airspeed,base=flight.tuning.cameraDistance,mode=this.view.id;
    const anchor=pose?.position??flight.position;
    // Carry the rig with aircraft translation before smoothing its relative orbit.
    // Independent world-space lag previously left the camera aiming behind fast aerobatics.
    if(this.anchored&&!immediate){this.desired.copy(anchor).sub(this.lastAnchor);this.camera.position.add(this.desired);this.look.add(this.desired);}
    this.lastAnchor.copy(anchor);this.anchored=true;
    this.forward.set(-Math.sin(flight.heading),0,-Math.cos(flight.heading));this.right.set(Math.cos(flight.heading),0,-Math.sin(flight.heading));
    this.desired.copy(anchor);this.targetPosition.copy(anchor);
    if(mode==='cockpit'){
      const attitude=pose?.quaternion??flight.orientation,position=pose?.position??flight.position;
      const blend=immediate?1:1-Math.exp(-12*dt);this.lookYaw=MathUtils.lerp(this.lookYaw,this.desiredYaw,blend);this.lookPitch=MathUtils.lerp(this.lookPitch,this.desiredPitch,blend);
      // Deterministic and sub-centimetre: disabled by the comfort setting, never modifies flight physics.
      const vibration=this.movement?Math.sin(flight.simulationTime*31)*.003*flight.throttle:0;
      const head=new Quaternion().setFromEuler(new Euler(this.lookPitch+vibration,this.lookYaw,0,'YXZ')).premultiply(attitude);
      const eye=new Vector3().fromArray(getAircraft(flight.tuning.id).cockpitEye).applyQuaternion(attitude).add(position);
      this.camera.position.copy(eye);this.forward.set(0,0,-1).applyQuaternion(head);this.camera.up.set(0,1,0).applyQuaternion(head);this.camera.lookAt(eye.clone().addScaledVector(this.forward,100));this.camera.near=.08;this.camera.fov=75;this.camera.updateProjectionMatrix();return;
    }
    this.camera.near=.4;
    if(mode==='side'){
      this.desired.addScaledVector(this.right,base*1.5+speed*.07).addScaledVector(this.forward,-base*.22);this.desired.y+=base*.32;
      this.targetPosition.addScaledVector(this.forward,5);this.targetPosition.y+=1.3;
    }else if(mode==='overhead'){
      this.desired.addScaledVector(this.forward,-base*.7);this.desired.y+=base*3+speed*.14;this.targetPosition.addScaledVector(this.forward,base*.4);
    }else{
      const wide=mode==='wide'?1.85:1;
      this.desired.addScaledVector(this.forward,-(base+speed*.1)*wide);
      this.desired.y+=(flight.tuning.cameraHeight+speed*.035)*wide;
      this.targetPosition.addScaledVector(this.forward,mode==='wide'?13:22);this.targetPosition.y+=1.4;
    }
    this.desired.y=Math.max(3,this.desired.y);this.camera.position.lerp(this.desired,immediate?1:1-Math.exp(-4*dt));
    // Lock attention onto the rendered aircraft during aerobatics; retain a level horizon.
    if(flight.maneuver||flight.rolling){this.targetPosition.copy(anchor);this.targetPosition.y+=1;this.look.copy(this.targetPosition);}
    else this.look.lerp(this.targetPosition,immediate?1:1-Math.exp(-5*dt));this.camera.up.set(0,1,0);this.camera.lookAt(this.look);
    this.camera.fov=mode==='overhead'?50:mode==='side'?48:52+Math.min(8,speed*.1);this.camera.updateProjectionMatrix();
  }
}
