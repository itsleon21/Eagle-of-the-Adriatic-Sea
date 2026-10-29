import * as T from 'three';
import {islands,random,terrainHeight} from './WorldConfig.ts';
import {inTakeoffChannel} from './IslandDetails.ts';
/** Coarse silhouette chips sit partly embedded in the cliff; never a second terrain sheet. */
export class CoastalDetail{
 readonly root=new T.Group();private batches:{mesh:T.InstancedMesh;x:number;z:number}[]=[];
 constructor(blockers:T.Box3[],occupied:(x:number,z:number,padding:number)=>boolean){
  const geometry=new T.IcosahedronGeometry(1,0),material=new T.MeshStandardMaterial({color:0xffffff,roughness:.97,flatShading:true}),dummy=new T.Object3D(),tint=new T.Color();
  for(const d of islands){
   if(d.id==='coral')continue;const mesh=new T.InstancedMesh(geometry,material,150),rng=random(d.seed+1901);let count=0;
   for(let attempt=0;attempt<6000&&count<150;attempt++){
    const x=d.x+(rng()-.5)*d.rx*2.1,z=d.z+(rng()-.5)*d.rz*2.1,h=terrainHeight(d,x,z);
    if((d.id==='cove'&&x>d.x+100&&Math.abs(z-d.z+55)<90)||h<2||h>d.height*.85||inTakeoffChannel(d,x,z,35)||occupied(x,z,7))continue;
    const slope=Math.hypot(terrainHeight(d,x+2,z)-terrainHeight(d,x-2,z),terrainHeight(d,x,z+2)-terrainHeight(d,x,z-2))/4;
    if(slope<.5||slope>4)continue;
    const radius=1+rng()*2.8,vertical=radius*(.6+rng()*.65);dummy.position.set(x,h-vertical*.45,z);dummy.rotation.set(rng()*.4,rng()*6.28,rng()*.5);dummy.scale.set(radius,vertical,radius*(.65+rng()*.5));dummy.updateMatrix();mesh.setMatrixAt(count,dummy.matrix);
    tint.setHSL(.10+rng()*.025,.12+rng()*.10,.43+rng()*.14);mesh.setColorAt(count++,tint);
    blockers.push(new T.Box3(new T.Vector3(x-radius*.7,h-vertical,z-radius*.7),new T.Vector3(x+radius*.7,h+vertical*.6,z+radius*.7)));
   }
   mesh.count=count;mesh.name=`${d.id} / embedded limestone talus`;mesh.receiveShadow=true;mesh.computeBoundingSphere();this.root.add(mesh);this.batches.push({mesh,x:d.x,z:d.z});
  }
 }
 updateView(p:T.Vector3){for(const b of this.batches)b.mesh.visible=Math.hypot(p.x-b.x,p.z-b.z)<1800;}
}
