/** Rolling wall-clock frame intervals include GPU stalls and presentation, but exclude loading and hidden tabs. */
export class FrameMetrics{
 private samples:number[]=[];private last=0;private warmup=120;
 reset(){this.last=0;this.samples=[];this.warmup=120;}
 frame(now:number){const previous=this.last;this.last=now;if(!previous)return;if(this.warmup>0){this.warmup--;return;}const ms=now-previous;if(ms<=0)return;this.samples.push(ms);if(this.samples.length>300)this.samples.shift();}
 get snapshot(){if(!this.samples.length)return{fps:0,mean:0,p95:0,samples:0};const sorted=[...this.samples].sort((a,b)=>a-b),mean=this.samples.reduce((a,b)=>a+b,0)/this.samples.length;return{fps:1000/mean,mean,p95:sorted[Math.ceil(sorted.length*.95)-1],samples:this.samples.length};}
}
