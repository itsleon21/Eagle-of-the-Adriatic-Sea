import { Euler, Quaternion, Vector3 } from 'three';
import {touchdownProblems} from './LandingEnvelope.ts';
import {hullWaterContact} from './WaterContact.ts';
import type {WaterField} from './WaterContact.ts';
import { FlightConfig, Spawn } from './FlightConfig.ts';
import type { FlightTuning } from './FlightConfig.ts';
export type ManeuverId = 'loop' | 'immelmann';
export type FlightState = 'ON_WATER' | 'TAKEOFF_RUN' | 'AIRBORNE' | 'LANDING' | 'CRASHED' | 'RESETTING';
export interface FlightInput { pitch: number; roll: number; yaw: number; throttle: number; aerobatic?: boolean }
export const neutralInput = (): FlightInput => ({ pitch: 0, roll: 0, yaw: 0, throttle: 0 });
export class FlightController {
  readonly position = new Vector3(); readonly previousPosition = new Vector3();
  readonly velocity = new Vector3(); readonly orientation = new Quaternion(); readonly previousOrientation = new Quaternion();
  state: FlightState = 'ON_WATER'; throttle = 0; pitch = 0; bank = 0; heading = Spawn.heading;
  crashReason = ''; landingCount = 0; rolling = false;
  maneuver: ManeuverId|null=null; maneuverProgress=0;private maneuverAngle=0;private maneuverRoll=0;private maneuverEntryPitch=0;private maneuverEntryBank=0;
  get maneuverName(){return this.maneuver==='loop'?'垂直筋斗':this.maneuver==='immelmann'?'殷麦曼转向':'';}
  private clearManeuver(){this.maneuver=null;this.maneuverProgress=this.maneuverAngle=this.maneuverRoll=this.maneuverEntryPitch=this.maneuverEntryBank=0;}
  requestManeuver(id:ManeuverId):string {
    if(this.tuning.id!=='mc72')return '此机型不支持辅助特技';
    if(this.maneuver)return '当前特技进行中';
    if(this.state!=='AIRBORNE')return '起飞后才能执行特技';
    if(this.altitude<180)return '特技需要海拔至少180米，并远离岛屿';
    if(this.airspeed<85)return '特技需要空速至少306 km/h';
    if(Math.abs(this.levelBank)>.2||Math.abs(this.pitch)>.12||Math.abs(this.velocity.y)/this.airspeed>.15||this.rolling)return '先松开操纵键，恢复平飞姿态';
    this.clearManeuver();this.maneuver=id;this.maneuverEntryPitch=this.pitch;this.maneuverEntryBank=this.levelBank;this.waterPitch=this.waterBank=0;return `${this.maneuverName}开始 · 油门仍可调节`;
  }
  simulationTime=0;waterImpact=0;private waterField?:WaterField;private waterPitch=0;private waterBank=0;
  setWaterSurface(field:WaterField){this.waterField=field;this.reset(this.state==='AIRBORNE');}
  private forward = new Vector3(); private up = new Vector3(); private acceleration = new Vector3();
  private euler = new Euler(0, 0, 0, 'YXZ');
  readonly tuning: Readonly<FlightTuning>;
  constructor(airborne = false, tuning: Readonly<FlightTuning> = FlightConfig) { this.tuning=tuning;this.reset(airborne); }
  private sampleWater(){return this.waterField?hullWaterContact(this.waterField,this.position.x,this.position.z,this.heading,this.simulationTime,this.tuning.floatHalfSpan):{height:0,velocity:0,pitch:0,bank:0,dx:0,dz:0};}
  get landingContact(){const water=this.sampleWater();return{clearance:this.position.y-this.tuning.hullOffset-water.height,verticalSpeed:this.velocity.y-water.velocity};}
  get airspeed() { return this.velocity.length(); }
  get altitude() { return Math.max(0, this.position.y - this.tuning.hullOffset); }
  get levelBank() { return Math.atan2(Math.sin(this.bank),Math.cos(this.bank)); }
  reset(airborne = false) {
    this.clearManeuver();this.state = 'RESETTING';this.simulationTime=0;this.waterImpact=0;this.waterPitch=this.waterBank=0; this.position.set(Spawn.x, airborne ? 130 : this.tuning.hullOffset, Spawn.z);
    this.velocity.set(airborne ? this.tuning.initialSpeed : 0, 0, 0); this.throttle = airborne ? 0.6 : 0;
    this.pitch = this.bank = 0; this.heading = Spawn.heading; this.crashReason = ''; this.landingCount = 0; this.rolling = false;
    if(!airborne&&this.waterField)this.position.y+=hullWaterContact(this.waterField,this.position.x,this.position.z,this.heading,0,this.tuning.floatHalfSpan).height;
    this.setOrientation(); this.previousPosition.copy(this.position); this.previousOrientation.copy(this.orientation);
    this.state = airborne ? 'AIRBORNE' : 'ON_WATER';
  }
  private setOrientation() { this.orientation.setFromEuler(this.euler.set(this.pitch+this.waterPitch, this.heading, this.bank+this.waterBank, 'YXZ')); }
  moorAt(x:number,z:number,heading:number){this.clearManeuver();this.waterImpact=0;this.position.set(x,this.tuning.hullOffset,z);this.heading=heading;this.bank=this.pitch=this.waterPitch=this.waterBank=0;this.velocity.set(0,0,0);this.throttle=0;this.rolling=false;this.state='ON_WATER';this.position.y+=this.sampleWater().height;this.setOrientation();this.previousPosition.copy(this.position);this.previousOrientation.copy(this.orientation);}
  crash(reason: string) { if (this.state === 'CRASHED') return; this.clearManeuver();this.state = 'CRASHED'; this.crashReason = reason; this.velocity.set(0, 0, 0); this.throttle = 0; this.rolling = false; }
  private updateManeuver(dt:number,waterHeight:number){
    const C=this.tuning,id=this.maneuver!,total=id==='loop'?Math.PI*2:Math.PI;
    const before=this.velocity.clone();
    if(this.maneuverAngle<total){
      this.maneuverAngle=Math.min(total,this.maneuverAngle+.85*dt);const t=Math.min(1,this.maneuverAngle/.35),entry=1-t*t*(3-2*t);this.pitch=this.maneuverAngle+this.maneuverEntryPitch*entry;this.bank=this.maneuverEntryBank*entry;
    }else if(id==='immelmann'){this.maneuverRoll=Math.min(Math.PI,this.maneuverRoll+1.65*dt);this.bank=this.maneuverRoll;}
    this.setOrientation();this.forward.set(0,0,-1).applyQuaternion(this.orientation);
    const speed=Math.max(0,this.airspeed+(this.throttle*C.thrust-C.linearDrag*this.airspeed-C.drag*this.airspeed**2-C.gravity*this.forward.y)*dt);
    this.velocity.copy(this.forward).multiplyScalar(Math.min(C.maxSpeed,speed));
    // Trapezoidal integration follows the arc; no teleport or extra invulnerability.
    this.position.addScaledVector(before,dt*.5).addScaledVector(this.velocity,dt*.5);
    this.maneuverProgress=id==='loop'?this.maneuverAngle/total:.75*this.maneuverAngle/total+.25*this.maneuverRoll/Math.PI;
    if(this.position.y-C.hullOffset<=waterHeight){this.crash('特技时接触水面，请先爬升至安全高度');return;}
    if(speed<C.liftSpeed*.85){this.crash('特技空速不足，请保留足够油门后重试');return;}
    if(this.maneuverAngle>=total&&(id==='loop'||this.maneuverRoll>=Math.PI)){
      if(id==='immelmann')this.heading+=Math.PI;
      this.pitch=this.bank=0;this.clearManeuver();this.setOrientation();
    }
  }
  update(dt: number, input: FlightInput) {
    if (!Number.isFinite(dt) || dt <= 0 || this.state === 'CRASHED') return;
    const C=this.tuning;
    dt = Math.min(dt, 1 / 30);this.simulationTime+=dt;this.waterImpact*=Math.exp(-dt*3); this.previousPosition.copy(this.position); this.previousOrientation.copy(this.orientation);
    this.throttle = Math.max(0, Math.min(1, this.throttle + input.throttle * C.throttleRate * dt));
    const water=this.sampleWater();
    if(this.maneuver){this.updateManeuver(dt,water.height);return;}
    const speed = this.airspeed, onWater = this.state !== 'AIRBORNE';
    const response = 1 - Math.exp(-C.attitudeResponse * dt), authority = Math.min(1, Math.max(0.15, speed / C.liftSpeed));
    this.pitch += (input.pitch * (onWater ? 0.13 : C.maxPitch) - this.pitch) * response;
    this.rolling=!onWater&&C.aerobatics&&Boolean(input.aerobatic)&&Math.abs(input.roll)>.05&&speed>=C.liftSpeed*.9;
    if(this.rolling) this.bank-=input.roll*C.rollRate*authority*dt;
    else {
      const upright=Math.round(this.bank/(Math.PI*2))*Math.PI*2;
      this.bank += (upright+(onWater?0:-input.roll*C.maxBank*authority)-this.bank)*response;
    }
    this.heading += (Math.sin(this.bank) * C.turnRate * authority - input.yaw * C.yawRate * (onWater ? 1 : authority)) * dt;
    const waterBlend=1-Math.exp(-dt*3.5),planing=1-Math.min(.65,speed/C.takeoffSpeed*.65);
    this.waterPitch+=((onWater?water.pitch*planing:0)-this.waterPitch)*waterBlend;this.waterBank+=((onWater?water.bank*planing:0)-this.waterBank)*waterBlend;
    this.setOrientation(); this.forward.set(0, 0, -1).applyQuaternion(this.orientation); this.up.set(0, 1, 0).applyQuaternion(this.orientation);
    if (onWater) {
      const waterSpeed = Math.hypot(this.velocity.x, this.velocity.z);
      const nextSpeed = Math.max(0, waterSpeed + (this.throttle * C.thrust - waterSpeed * C.waterDrag - waterSpeed ** 2 * 0.0015) * dt);
      const heave=this.waterField?this.velocity.y:0;
      this.velocity.set(-Math.sin(this.heading)*nextSpeed,heave,-Math.cos(this.heading)*nextSpeed);
      if(this.waterField){
        const target=water.height+C.hullOffset,error=target-this.position.y;
        const verticalAcceleration=(C.id==='m5'?15:22)*error-(C.id==='m5'?7:8)*(this.velocity.y-water.velocity);
        this.velocity.y=Math.max(-4,Math.min(4,this.velocity.y+verticalAcceleration*dt));
        this.waterImpact=Math.max(this.waterImpact,Math.min(1,Math.abs(verticalAcceleration)*nextSpeed/320));
        const chop=Math.abs(water.dx*this.velocity.x+water.dz*this.velocity.z-water.velocity);
        this.velocity.x*=1-Math.min(.02,chop*.002*dt);this.velocity.z*=1-Math.min(.02,chop*.002*dt);
      }
      this.position.addScaledVector(this.velocity,dt);if(!this.waterField)this.position.y=C.hullOffset;
      if (this.state === 'LANDING' && nextSpeed < 7) { this.state = 'ON_WATER'; this.landingCount++; }
      else if (this.state !== 'LANDING') this.state = nextSpeed > 1.5 ? 'TAKEOFF_RUN' : 'ON_WATER';
      if (nextSpeed >= C.takeoffSpeed && input.pitch > 0.1 && this.throttle > 0.5) {
        this.state = 'AIRBORNE'; this.velocity.y = 2.2+water.velocity; this.position.y += 0.15; this.pitch = 0.18; this.setOrientation();
      }
      return;
    }
    const liftFraction = Math.min(1, (speed / C.liftSpeed) ** 2);
    this.acceleration.copy(this.forward).multiplyScalar(this.throttle * C.thrust);
    this.acceleration.addScaledVector(this.velocity, -(C.linearDrag + C.drag * speed));
    this.acceleration.addScaledVector(this.up, C.gravity * liftFraction); this.acceleration.y -= C.gravity;
    this.acceleration.y += this.pitch * speed * 0.9 - this.velocity.y * 0.62;
    this.velocity.addScaledVector(this.acceleration, dt);
    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z), steering = 1 - Math.exp(-1.4 * authority * dt);
    this.velocity.x += (-Math.sin(this.heading) * horizontalSpeed - this.velocity.x) * steering;
    this.velocity.z += (-Math.cos(this.heading) * horizontalSpeed - this.velocity.z) * steering;
    this.velocity.clampLength(0, C.maxSpeed); this.velocity.y = Math.max(-30, Math.min(30, this.velocity.y));
    this.position.addScaledVector(this.velocity, dt);
    const lowest = this.position.y - C.hullOffset - Math.abs(Math.sin(this.bank)) * C.floatHalfSpan;
    if (lowest <= water.height) {
      if (touchdownProblems(C,speed,this.velocity.y-water.velocity,this.bank,this.pitch).length>0) {
        this.position.y = Math.max(C.hullOffset+water.height, this.position.y); this.crash('着水过猛，请降低下降率并保持机翼水平');
      } else {this.waterImpact=Math.min(1,Math.abs(this.velocity.y-water.velocity)/C.safeLandingSink+.3);this.state='LANDING';this.position.y=C.hullOffset+water.height;this.velocity.y=water.velocity;this.bank=0;}
    }
  }
}
