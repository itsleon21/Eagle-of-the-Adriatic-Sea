import {islands} from './WorldConfig.ts';
/** Shared directional wind-sea spectrum for geometry, normals, buoyancy, spray and wakes. */
export const waveComponents=[
 {x:.9417419116,z:.336336397,k:Math.PI*2/76,speed:.90,weight:1,phase:0},
 {x:.35,z:.93675,k:Math.PI*2/39,speed:1.26,weight:.52,phase:1.8},
 {x:-.613,z:.7901,k:Math.PI*2/20,speed:1.76,weight:.25,phase:3.2},
 {x:-.38,z:.925,k:Math.PI*2/12,speed:2.26,weight:.12,phase:.7},
 {x:.977,z:-.213,k:Math.PI*2/6.5,speed:3.08,weight:.055,phase:4.1},
 {x:.83,z:-.558,k:Math.PI*2/3.8,speed:4.02,weight:.024,phase:2.1},
];
export const waveAmplitude=(wind:number)=>.34+Math.max(0,Math.min(1,wind))*.64;
export function sampleOceanWaves(x:number,z:number,time:number,wind:number){
 const amplitude=waveAmplitude(wind);let height=0,dx=0,dz=0,velocity=0;
 for(const c of waveComponents){const bend=(x*-c.z+z*c.x)*c.k*.37+c.phase,curve=Math.cos(bend)*.8*c.k*.37;
 const phase=(x*c.x+z*c.z)*c.k-time*c.speed+c.phase+Math.sin(bend)*.8;
 const packet=(x*c.x+z*c.z)*c.k*.19-time*c.speed*.17+c.phase*2,env=.73+.27*Math.sin(packet),a=amplitude*c.weight;
 const packetDerivative=.27*Math.cos(packet),sin=Math.sin(phase),cos=Math.cos(phase);
 height+=sin*a*env;dx+=a*(cos*env*(c.k*c.x-curve*c.z)+sin*packetDerivative*c.k*.19*c.x);dz+=a*(cos*env*(c.k*c.z+curve*c.x)+sin*packetDerivative*c.k*.19*c.z);velocity-=a*c.speed*(cos*env+sin*packetDerivative*.17);}
 const shelter=seaShelter(x,z);return{height:height*shelter.value,dx:dx*shelter.value+height*shelter.dx,dz:dz*shelter.value+height*shelter.dz,velocity:velocity*shelter.value};
}
const gl=(n:number)=>n.toFixed(12);
const basins=islands.filter(d=>d.id==='harbor'||d.id==='town'||d.id==='cove').map(d=>({x:d.x,z:d.z+(d.id==='cove'?40:d.rz*.62*(d.id==='town'?-1:1)),rx:d.rx*.48,rz:d.rz*.42}));
/** Gaussian wind shelter: calm enclosed basins blend continuously into offshore swell. */
export function seaShelter(x:number,z:number){let value=1,dx=0,dz=0;for(const b of basins){const xx=(x-b.x)/b.rx,zz=(z-b.z)/b.rz,e=.62*Math.exp(-2*(xx*xx+zz*zz));value-=e;dx+=4*e*xx/b.rx;dz+=4*e*zz/b.rz;}return{value,dx,dz};}

export const oceanWaveGLSL=`vec3 oceanWave(vec2 p,float t,float wind){
 float a=.34+clamp(wind,0.,1.)*.64;vec3 result=vec3(0.);
 ${waveComponents.map(c=>`{vec2 d=vec2(${gl(c.x)},${gl(c.z)}),side=vec2(-d.y,d.x);float bend=dot(p,side)*${gl(c.k*.37)}+${gl(c.phase)};float phase=dot(p,d)*${gl(c.k)}-t*${gl(c.speed)}+${gl(c.phase)}+sin(bend)*.8;vec2 gradient=d*${gl(c.k)}+side*cos(bend)*${gl(.8*c.k*.37)};float packet=dot(p,d)*${gl(c.k*.19)}-t*${gl(c.speed*.17)}+${gl(c.phase*2)};float envelope=.73+.27*sin(packet);vec2 envelopeGradient=d*${gl(c.k*.19*.27)}*cos(packet);result+=a*${gl(c.weight)}*vec3(sin(phase)*envelope,cos(phase)*gradient*envelope+sin(phase)*envelopeGradient);}`).join('\n')}
 float shelter=1.;vec2 shelterGradient=vec2(0.);
 ${basins.map(b=>`{vec2 delta=(p-vec2(${gl(b.x)},${gl(b.z)}))/vec2(${gl(b.rx)},${gl(b.rz)});float e=.62*exp(-2.*dot(delta,delta));shelter-=e;shelterGradient+=4.*e*delta/vec2(${gl(b.rx)},${gl(b.rz)});}`).join('\n')}
 return vec3(result.x*shelter,result.yz*shelter+result.x*shelterGradient);
}`;
export const oceanGridCoordinate=(u:number)=>Math.sign(u)*(190*Math.abs(u)+23810*Math.abs(u)**5);
