import type {FlightTuning} from './FlightConfig.ts';
export type TouchdownProblem='speed'|'sink'|'bank'|'pitch';
/** Same limits used by physics and the on-screen guide; vertical speed is relative to the wave. */
export function touchdownProblems(tuning:Readonly<FlightTuning>,speed:number,verticalSpeed:number,bank:number,pitch:number):TouchdownProblem[]{
 const problems:TouchdownProblem[]=[];
 if(speed>tuning.safeLandingSpeed)problems.push('speed');
 if(verticalSpeed< -tuning.safeLandingSink)problems.push('sink');
 if(Math.abs(Math.atan2(Math.sin(bank),Math.cos(bank)))>tuning.safeLandingBank)problems.push('bank');
 if(pitch<-.16)problems.push('pitch');
 return problems;
}
