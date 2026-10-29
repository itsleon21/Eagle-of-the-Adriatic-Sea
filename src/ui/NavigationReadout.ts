/** Local metric coordinates; the simulated sea has no geographic latitude/longitude origin. */
export function headingDegrees(heading:number){return ((-heading*180/Math.PI)%360+360)%360;}
const directions=['N','NE','E','SE','S','SW','W','NW'];
export function headingDirection(degrees:number){return directions[Math.round(((degrees%360)+360)%360/45)%8];}
export function coordinateLabel(value:number){return `${value>=0?'+':'−'}${Math.abs(Math.round(value)).toLocaleString('en-US')} m`;}
export function compassMarks(){return Array.from({length:217},(_,i)=>{const degree=(i-72)*5,wrapped=(degree%360+360)%360;return {degree,label:wrapped%45===0?directions[wrapped/45]:wrapped%10===0?String(wrapped).padStart(3,'0'):'',major:wrapped%10===0||wrapped%45===0};});}
