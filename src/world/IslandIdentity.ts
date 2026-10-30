import * as T from 'three';import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';import {mooringSites} from './Moorings.ts';
/** Small authored dock still lifes: original geometry, batched per material across all islands. */
export class IslandIdentity{
 readonly root=new T.Group();
 constructor(){const wood=new T.MeshStandardMaterial({color:0x9a7048,roughness:.8}),canvas=new T.MeshStandardMaterial({color:0xe0cf9d,roughness:.92}),iron=new T.MeshStandardMaterial({color:0x3c534b,roughness:.53,metalness:.5}),red=new T.MeshStandardMaterial({color:0xa9432c,roughness:.4}),brass=new T.MeshStandardMaterial({color:0xae8845,roughness:.35,metalness:.7}),batches=new Map<T.Material,T.BufferGeometry[]>();
 for(const s of mooringSites){const matrix=new T.Matrix4().makeRotationY(Math.atan2(s.dx,s.dz));matrix.setPosition(s.x+s.dz*4,3.35,s.z-s.dx*4);const add=(g:T.BufferGeometry,m:T.Material,x:number,y:number,z:number)=>{g.translate(x,y,z);g.applyMatrix4(matrix);const arr=batches.get(m)??[];arr.push(g);batches.set(m,arr);};const box=(m:T.Material,x:number,y:number,z:number,a:number,b:number,c:number)=>add(new T.BoxGeometry(a,b,c),m,x,y,z);
  if(s.id==='harbor'||s.id==='pine'){for(let i=0;i<3;i++){box(s.id==='pine'?iron:wood,-.8+i*.7,.4,-.8+i*.35,.6,.8,.6);box(canvas,-.8+i*.7,.41,-.8+i*.35,.63,.12,.63);}for(let i=0;i<2;i++){const g=new T.SphereGeometry(.3,10,6);g.scale(1,1.3,1);add(g,canvas,i*.5,.4,.5);}}
  if(s.id==='town'){box(wood,0,.45,0,2,.16,.65);for(const x of[-.8,.8])box(iron,x,.2,0,.12,.4,.5);box(wood,0,.9,.3,2,.6,.1);box(canvas,0,.56,-.1,.32,.03,.22);}
  if(s.id==='lighthouse'){const ring=new T.TorusGeometry(.38,.095,8,20);add(ring,red,0,.85,0);box(iron,0,.45,.07,.10,.9,.12);add(new T.CylinderGeometry(.15,.25,.2,12),brass,.7,.12,.3);}
  if(s.id==='coral'){add(new T.CylinderGeometry(.35,.16,.4,12),brass,0,.9,0);box(wood,0,.55,0,.4,.6,.4);box(canvas,0,.16,0,.7,.25,.7);for(const x of[-.6,.6])box(red,x,.4,.2,.25,.8,.1);}
  if(s.id==='cove'){box(wood,0,.25,0,1.3,.5,.9);box(canvas,0,.515,0,1.1,.025,.7);for(let i=0;i<4;i++)box(iron,-.4+i*.25,.54,0,.018,.015,.55);}
 }
 for(const [material,parts] of batches){const geometry=mergeGeometries(parts,false)!;parts.forEach(p=>p.dispose());const mesh=new T.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;this.root.add(mesh);}this.root.name='Island identities / mail, village bench, rescue buoy, ranger supplies, trophy and chart';}
}
