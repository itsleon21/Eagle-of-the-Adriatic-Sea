import * as T from 'three';
import {harbor,islands} from './WorldConfig.ts';
/** Two small flocks glide and flap with distinct phases. One draw, no transparent feather cards. */
export class Seabirds{
 readonly mesh:T.InstancedMesh;private dummy=new T.Object3D();private time=0;
 constructor(){
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute([
   0,0,-.45,-.17,0,.35,.17,0,.35,
   -.1,0,0,-1.7,.12,.12,-.85,0,.47,
   -.1,0,0,-.85,0,.47,-.15,0,.3,
   .1,0,0,.85,0,.47,1.7,.12,.12,
   .1,0,0,.15,0,.3,.85,0,.47],3));geo.computeVertexNormals();
  const material=new T.MeshStandardMaterial({color:0xe0d9c1,roughness:.9,side:T.DoubleSide});
  material.onBeforeCompile=shader=>{shader.uniforms.birdTime={get value(){return mesh.userData.time??0;}};shader.vertexShader='uniform float birdTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   float phase=instanceMatrix[3].x*.17;transformed.y+=pow(abs(position.x)/1.7,1.4)*sin(birdTime*4.6+phase)*.45;`);};
  const mesh=this.mesh=new T.InstancedMesh(geo,material,24);mesh.name='Harbor and lighthouse / circling seabirds';mesh.frustumCulled=false;this.update(0);
 }
 update(dt:number){this.time+=dt;this.mesh.userData.time=this.time;
  for(let i=0;i<this.mesh.count;i++){
   const d=i<16?harbor:islands[2],a=this.time*(.055+(i%4)*.004)+i*2.399,r=85+(i%6)*18,cx=d.x+(i<16?-80:0),cz=d.z+(i<16?d.rz*.65:50),h=i<16?55:210;
   this.dummy.position.set(cx+Math.cos(a)*r,h+Math.sin(a*.7+i)*12,cz+Math.sin(a)*r);this.dummy.rotation.set(0,-a,Math.sin(a+i)*.12);this.dummy.scale.setScalar(.9+(i%3)*.15);this.dummy.updateMatrix();this.mesh.setMatrixAt(i,this.dummy.matrix);
  }this.mesh.instanceMatrix.needsUpdate=true;
 }
}
