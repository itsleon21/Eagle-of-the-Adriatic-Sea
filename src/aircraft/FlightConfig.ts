import {harborRunway} from '../world/WorldConfig.ts';
export type AircraftId = 'redwing' | 'm5' | 'mc72' | 's6' | 'gloster6' | 'm67';
export interface FlightTuning {
  id: AircraftId; gravity: number; thrust: number; drag: number; linearDrag: number;
  maxSpeed: number; cruiseSpeed: number; liftSpeed: number; takeoffSpeed: number;
  throttleRate: number; maxBank: number; maxPitch: number; attitudeResponse: number;
  turnRate: number; yawRate: number; waterDrag: number; hullOffset: number;
  safeLandingSink: number; safeLandingSpeed: number; safeLandingBank: number;
  aerobatics: boolean; rollRate: number; initialSpeed: number;
  cameraDistance: number; cameraHeight: number; floatHalfSpan:number;
}
export const FlightConfig: Readonly<FlightTuning> = Object.freeze({
  id:'redwing', gravity:9.81, thrust:8.4, drag:.0012, linearDrag:.018,
  maxSpeed:78, cruiseSpeed:58.3, liftSpeed:24, takeoffSpeed:25,
  throttleRate:.32, maxBank:.84, maxPitch:.34,
  attitudeResponse:3.6, turnRate:.77, yawRate:.255,
  waterDrag:.15, hullOffset:1.05, safeLandingSink:5,
  safeLandingSpeed:57, safeLandingBank:.3,
  aerobatics:true, rollRate:2.4, initialSpeed:40, cameraDistance:20, cameraHeight:7, floatHalfSpan:3.6,
});
export const M5FlightConfig: Readonly<FlightTuning> = Object.freeze({
  id:'m5', gravity:9.81, thrust:4.7, drag:.0022, linearDrag:.028,
  maxSpeed:45.8, cruiseSpeed:30.6, liftSpeed:17, takeoffSpeed:19.5,
  throttleRate:.23, maxBank:.48, maxPitch:.28,
  attitudeResponse:1.6, turnRate:.45, yawRate:.145,
  waterDrag:.105, hullOffset:1.05, safeLandingSink:4.5,
  safeLandingSpeed:40, safeLandingBank:.3,
  aerobatics:false, rollRate:0, initialSpeed:29, cameraDistance:24, cameraHeight:7.8, floatHalfSpan:3.7,
});
export const MC72FlightConfig:Readonly<FlightTuning>=Object.freeze({...FlightConfig,id:'mc72',thrust:15,drag:.00070,linearDrag:.020,maxSpeed:135,cruiseSpeed:105.5,liftSpeed:35,takeoffSpeed:39,throttleRate:.26,maxBank:.65,maxPitch:.24,attitudeResponse:2.8,turnRate:.60,yawRate:.14,waterDrag:.13,hullOffset:1.78,safeLandingSink:4.5,safeLandingSpeed:78,safeLandingBank:.24,aerobatics:true,rollRate:2.05,initialSpeed:65,cameraDistance:21,cameraHeight:6.7,floatHalfSpan:1.18});
export const Spawn = { x: harborRunway.x, y: FlightConfig.hullOffset, z: harborRunway.z, heading: -Math.PI / 2 };
