import type {ChaseCamera} from './ChaseCamera.ts';
/** Drag-to-look uses pointer capture and leaves normal keyboard flight controls available. */
export class CockpitLook{
 private pointer=-1;private x=0;private y=0;
 constructor(private canvas:HTMLCanvasElement,private rig:ChaseCamera,private enabled:()=>boolean){canvas.addEventListener('pointerdown',this.down);canvas.addEventListener('pointermove',this.move);canvas.addEventListener('pointerup',this.end);canvas.addEventListener('pointercancel',this.end);canvas.addEventListener('lostpointercapture',this.end);canvas.addEventListener('dblclick',this.center);window.addEventListener('blur',this.end);}
 private down=(e:PointerEvent)=>{if(e.button!==0||!this.enabled()||this.rig.view.id!=='cockpit')return;this.pointer=e.pointerId;this.x=e.clientX;this.y=e.clientY;this.canvas.setPointerCapture(e.pointerId);};
 private move=(e:PointerEvent)=>{if(this.pointer!==e.pointerId)return;if(!this.enabled()||this.rig.view.id!=='cockpit'){this.end();return;}this.rig.lookAround(e.clientX-this.x,e.clientY-this.y);this.x=e.clientX;this.y=e.clientY;};
 private center=()=>{if(this.enabled())this.rig.recenter();};
 private end=()=>{if(this.pointer>=0&&this.canvas.hasPointerCapture(this.pointer))this.canvas.releasePointerCapture(this.pointer);this.pointer=-1;};
 dispose(){this.end();this.canvas.removeEventListener('pointerdown',this.down);this.canvas.removeEventListener('pointermove',this.move);this.canvas.removeEventListener('pointerup',this.end);this.canvas.removeEventListener('pointercancel',this.end);this.canvas.removeEventListener('lostpointercapture',this.end);this.canvas.removeEventListener('dblclick',this.center);window.removeEventListener('blur',this.end);}
}
