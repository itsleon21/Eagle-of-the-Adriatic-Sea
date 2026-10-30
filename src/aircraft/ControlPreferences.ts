/** Shared by all aircraft. FlightController always receives positive pitch = nose up. */
export const pitchPreferenceKey='adriatic-eagle.invert-pitch';
export interface PreferenceStorage {getItem(key:string):string|null;setItem(key:string,value:string):void}
export class ControlPreferences {
  inverted=false;private storage?:PreferenceStorage;
  constructor(storage?:PreferenceStorage){
    try{this.storage=storage??globalThis.localStorage;this.inverted=this.storage?.getItem(pitchPreferenceKey)==='true';}catch{/* Private browsing can deny storage. */}
  }
  setInverted(value:boolean){this.inverted=value;try{this.storage?.setItem(pitchPreferenceKey,String(value));}catch{/* Controls still work for this session. */}}
  pitch(up:number,down:number){return (up-down)*(this.inverted?-1:1)||0;}
  get upKey(){return this.inverted?'S':'W';}
  get downKey(){return this.inverted?'W':'S';}
}

export function remapPitchKeys(text:string,inverted:boolean){return inverted?text.replace(/(?<![A-Za-z'])\b[WS]\b(?!\.\d)/g,key=>key==='W'?'S':'W'):text;}
