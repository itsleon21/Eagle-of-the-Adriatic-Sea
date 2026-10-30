import {ControlPreferences} from './ControlPreferences.ts';
import type { FlightInput } from './FlightController';
export class Input {
  readonly preferences=new ControlPreferences();
  private keys = new Set<string>();
  private controlled = new Set(['KeyW','KeyS','KeyA','KeyD','KeyQ','KeyE','Space','ShiftLeft','ShiftRight','ControlLeft','ControlRight','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);
  private action:(key:string)=>void;private loseFocus:()=>void;
  constructor(action: (key: string) => void, loseFocus: () => void) {
    this.action=action;this.loseFocus=loseFocus;
    window.addEventListener('keydown', this.down); window.addEventListener('keyup', this.up); window.addEventListener('blur', this.blur); document.addEventListener('visibilitychange', this.visibility);
  }
  private down = (event: KeyboardEvent) => {
    if (event.metaKey || event.altKey || (event.target instanceof HTMLElement && ['INPUT','SELECT','TEXTAREA','BUTTON'].includes(event.target.tagName)&&!['Escape','KeyP','KeyJ'].includes(event.code))) return;
    if (this.controlled.has(event.code) || ['KeyJ','KeyP','KeyR','Escape','KeyH','KeyM','KeyC','KeyL','KeyV','KeyF','KeyI','KeyX','KeyZ'].includes(event.code)) event.preventDefault();
    this.keys.add(event.code); if (!event.repeat) this.action(event.code);
  };
  private up = (event: KeyboardEvent) => { this.keys.delete(event.code); };
  private blur = () => { this.clear(); this.loseFocus(); };
  private visibility = () => { if (document.hidden) this.blur(); };
  clear() { this.keys.clear(); }
  read(): FlightInput {
    const has = (...codes: string[]) => codes.some(code => this.keys.has(code)) ? 1 : 0;
    return { pitch: this.preferences.pitch(has('KeyW','ArrowUp'),has('KeyS','ArrowDown')), roll: has('KeyD','ArrowRight') - has('KeyA','ArrowLeft'), yaw: has('KeyE') - has('KeyQ'), throttle: has('ShiftLeft','ShiftRight') - has('ControlLeft','ControlRight'), aerobatic:Boolean(has('Space')) };
  }
  dispose() { window.removeEventListener('keydown',this.down); window.removeEventListener('keyup',this.up); window.removeEventListener('blur',this.blur); document.removeEventListener('visibilitychange',this.visibility); }
}
