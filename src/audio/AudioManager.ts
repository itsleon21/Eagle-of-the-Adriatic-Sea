import type {Vector3} from 'three';
import {islands} from '../world/WorldConfig';
export class AudioManager {
 private surfGain?:GainNode;private forestGain?:GainNode;private birdClock=0;private birdDelay=7;private birdIndex=0;
 private context?:AudioContext;private master?:GainNode;private engine?:OscillatorNode;private engineGain?:GainNode;private windGain?:GainNode;private rainGain?:GainNode;
 muted=false;available=true;private volume=.42;
 async unlock(){
  try{
   if(!this.context){
    const ctx=this.context=new AudioContext();this.master=ctx.createGain();this.master.connect(ctx.destination);
    this.engine=ctx.createOscillator();this.engine.type='sawtooth';this.engineGain=ctx.createGain();const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=310;
    this.engine.connect(filter);filter.connect(this.engineGain);this.engineGain.connect(this.master);this.engine.start();
    const buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),data=buffer.getChannelData(0);let last=0;
    for(let i=0;i<data.length;i++){last=(last+(Math.random()*2-1)*.04)/1.04;data[i]=last*3;}
    const source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;const band=ctx.createBiquadFilter();band.type='lowpass';band.frequency.value=1200;
    this.windGain=ctx.createGain();source.connect(band);band.connect(this.windGain);this.windGain.connect(this.master);source.start();
    const rainBuffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),rainData=rainBuffer.getChannelData(0);for(let i=0;i<rainData.length;i++)rainData[i]=(Math.random()*2-1)*.35;
    const rain=ctx.createBufferSource();rain.buffer=rainBuffer;rain.loop=true;const rainFilter=ctx.createBiquadFilter();rainFilter.type='lowpass';rainFilter.frequency.value=2900;this.rainGain=ctx.createGain();this.rainGain.gain.value=0;rain.connect(rainFilter);rainFilter.connect(this.rainGain);this.rainGain.connect(this.master);rain.start();
    // Both coastal wash and soft foliage share one looping source through separate filters.
    const surfFilter=ctx.createBiquadFilter();surfFilter.type='bandpass';surfFilter.frequency.value=430;surfFilter.Q.value=.5;this.surfGain=ctx.createGain();this.surfGain.gain.value=0;source.connect(surfFilter);surfFilter.connect(this.surfGain);this.surfGain.connect(this.master);
    const forestFilter=ctx.createBiquadFilter();forestFilter.type='highpass';forestFilter.frequency.value=1500;this.forestGain=ctx.createGain();this.forestGain.gain.value=0;source.connect(forestFilter);forestFilter.connect(this.forestGain);this.forestGain.connect(this.master);
    this.engineGain.gain.value=0;this.windGain.gain.value=0;
   }
   await this.context.resume();
  }catch{this.available=false;}
 }
 setVolume(value:number){this.volume=Math.max(0,Math.min(1,value));}
 toggle(){this.muted=!this.muted;return this.muted;}
 update(throttle:number,speed:number,onWater:boolean,paused:boolean,rain=0,wind=0){
  if(!this.context||!this.master||!this.engine||!this.engineGain||!this.windGain)return;
  const t=this.context.currentTime;this.master.gain.setTargetAtTime(this.muted||paused?0:this.volume,t,.1);
  this.engine.frequency.setTargetAtTime(32+throttle*63,t,.15);this.engineGain.gain.setTargetAtTime(.024+throttle*.045,t,.1);
  this.rainGain?.gain.setTargetAtTime(rain*.17,t,.4);
  this.windGain.gain.setTargetAtTime(Math.min(.18,speed/400)+wind*.025+(onWater?Math.min(.06,speed/550):0),t,.1);
 }
 ambience(dt:number,position:Vector3){
  if(!this.context||!this.master||!this.surfGain||!this.forestGain||dt<=0)return;
  let coast=0,forest=0;for(const d of islands){const r=Math.hypot((position.x-d.x)/d.rx,(position.z-d.z)/d.rz);coast=Math.max(coast,Math.exp(-(((r-.82)*3.5)**2)));if(d.id!=='coral')forest=Math.max(forest,Math.max(0,1-r));}
  const heightFade=Math.exp(-Math.max(0,position.y-8)/110),t=this.context.currentTime;
  this.birdClock+=dt;this.surfGain.gain.setTargetAtTime(coast*heightFade*(.045+.018*Math.sin(this.birdClock*.7)),t,.8);this.forestGain.gain.setTargetAtTime(forest*heightFade*.08,t,.8);
  if(this.birdClock<this.birdDelay||heightFade<.12||coast<.25)return;
  this.birdDelay=this.birdClock+8+(this.birdIndex++%4)*2.7;
  // Brief original synthetic gull phrases; nodes stop and disconnect rather than accumulating loops.
  const ctx=this.context,o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.connect(g);g.connect(this.master);
  const pitch=920+(this.birdIndex%3)*130;o.frequency.setValueAtTime(pitch,t);o.frequency.exponentialRampToValueAtTime(pitch*1.55,t+.12);o.frequency.exponentialRampToValueAtTime(pitch*.86,t+.5);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.018*heightFade*coast,t+.07);g.gain.exponentialRampToValueAtTime(.0001,t+.58);o.start(t);o.stop(t+.6);o.onended=()=>{o.disconnect();g.disconnect();};
 }
 cue(kind:'checkpoint'|'complete'|'crash'|'splash'){
  if(!this.context||!this.master)return;try{
   const ctx=this.context,t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(this.master);
   o.type=kind==='splash'?'triangle':'sine';o.frequency.setValueAtTime(kind==='complete'?520:kind==='checkpoint'?700:kind==='crash'?95:160,t);o.frequency.exponentialRampToValueAtTime(kind==='complete'?1040:kind==='checkpoint'?1000:45,t+.25);
   g.gain.setValueAtTime(.09,t);g.gain.exponentialRampToValueAtTime(.0001,t+.42);o.start(t);o.stop(t+.45);o.onended=()=>{o.disconnect();g.disconnect();};
  }catch{this.available=false;}
 }
 dispose(){void this.context?.close();}
}
