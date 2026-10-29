import {test} from 'node:test';import assert from 'node:assert/strict';
import {FlightController} from '../src/aircraft/FlightController.ts';import {FlightConfig,M5FlightConfig} from '../src/aircraft/FlightConfig.ts';import {weatherPresets} from '../src/rendering/WeatherConfig.ts';
const response=(config:typeof FlightConfig)=>{const f=new FlightController(true,config);f.position.y=500;for(let i=0;i<18;i++)f.update(1/60,{pitch:.5,roll:.5,yaw:0,throttle:0});return f;};
test('redwing input is gentler while M5 acquires slightly more control inertia',()=>{
 const red=response(FlightConfig),previousRed=response({...FlightConfig,attitudeResponse:4.6,maxBank:.90,maxPitch:.36,turnRate:.90}),m5=response(M5FlightConfig),previousM5=response({...M5FlightConfig,attitudeResponse:1.9});
 assert.ok(Math.abs(red.bank)<Math.abs(previousRed.bank)*.87);assert.ok(red.pitch<previousRed.pitch*.87);assert.ok(Math.abs(m5.bank)<Math.abs(previousM5.bank));assert.ok(m5.pitch<previousM5.pitch);
 assert.ok(Math.abs(red.bank)>Math.abs(m5.bank)*1.8);assert.equal(FlightConfig.cruiseSpeed,58.3);assert.equal(M5FlightConfig.cruiseSpeed,30.6);assert.equal(FlightConfig.aerobatics,true);
});
test('fog preserves a readable near shore while remaining substantially denser than clear weather',()=>{
 const fog=weatherPresets.fog,clear=weatherPresets.sunny;assert.ok(fog.fogNear>=200&&fog.fogFar>=2200);assert.ok(fog.fogFar<clear.fogFar*.2);assert.ok(fog.haze<7);assert.ok(clear.ambient>.15);
});
