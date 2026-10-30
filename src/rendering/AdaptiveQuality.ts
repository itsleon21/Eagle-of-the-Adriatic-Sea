import type {QualityId} from './QualityConfig';
/** Conservative hysteresis: sustained slow frames lower cost; upgrades require long headroom. */
export class AdaptiveQuality {
 private slow=0;private fast=0;private cooldown=0;
 reset(){this.slow=this.fast=0;this.cooldown=8;}
 update(dt:number,ms:number,samples:number,current:QualityId):QualityId|undefined{
  if(!Number.isFinite(dt)||dt<=0)return;this.cooldown=Math.max(0,this.cooldown-dt);
  if(samples<90||!Number.isFinite(ms)||ms<=0||this.cooldown>0)return;
  this.slow=ms>29?this.slow+dt:0;this.fast=ms<18?this.fast+dt:0;
  const order:QualityId[]=['performance','balanced','high'],index=order.indexOf(current);
  const next=this.slow>5&&index>0?order[index-1]:this.fast>30&&index<2?order[index+1]:undefined;
  if(next){this.reset();this.cooldown=20;}return next;
 }
}
