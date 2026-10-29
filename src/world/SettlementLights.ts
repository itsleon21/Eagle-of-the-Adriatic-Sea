import * as T from 'three';
import {terrainHeight} from './WorldConfig.ts';import type {IslandDefinition} from './WorldConfig.ts';import type {SettlementLayout} from './SettlementLayout.ts';
/** Batched lit panes and street fixtures; only two nearby lamps cast actual local light per settlement. */
export class SettlementLights{
 readonly root=new T.Group();private glow=new T.MeshBasicMaterial({color:0xffcd79,toneMapped:false});private pools=new T.MeshBasicMaterial({color:0xffb45b,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending});private lights=[0,1].map(()=>new T.PointLight(0xffc17d,0,65,2));private sites:T.Vector3[]=[];private strength=0;
 constructor(d:IslandDefinition,layout:SettlementLayout){
  this.root.name=`${d.id} / night windows and street lighting`;const matrices:T.Matrix4[]=[],o=new T.Object3D();
  layout.houses.forEach((p,index)=>{if(index%5===0)return;
   const config=p.kind==='HouseFisher'?{xs:[-.27,.20],ys:[-.035],z:.416,w:.16,h:.21}:p.kind==='HouseTownhouse'?{xs:[-.22,.22],ys:[-.27,.08,.42],z:.481,w:.14,h:.21}:p.kind==='HouseArcade'?{xs:[-.27,.27],ys:[.30],z:.544,w:.16,h:.20}:p.kind==='HouseVilla'?{xs:[-.28,.28],ys:[-.22,.16],z:.389,w:.17,h:.21}:p.kind==='HouseWorkshop'?{xs:[-.37],ys:[-.12],z:.487,w:.11,h:.16}:{xs:[-.36,-.10],ys:[.18],z:.514,w:.12,h:.20};
   for(const x of config.xs)for(const y of config.ys){const offset=new T.Vector3(x*p.width,(y+.5)*p.height,(config.z+.024)*p.depth).applyAxisAngle(new T.Vector3(0,1,0),p.angle);o.position.set(p.x+offset.x,p.ground+offset.y,p.z+offset.z);o.rotation.set(0,p.angle,0);o.scale.set(config.w*p.width*.90,config.h*p.height*.90,1);o.updateMatrix();matrices.push(o.matrix.clone());}
  });
  const windows=new T.InstancedMesh(new T.PlaneGeometry(1,1),this.glow,matrices.length);windows.name='Warm inhabited window panes';matrices.forEach((m,i)=>windows.setMatrixAt(i,m));windows.computeBoundingSphere();this.root.add(windows);
  const vertices:number[]=[];for(const road of layout.roads)for(let i=2;i<road.points.length;i+=9){const p=road.points[i],x=p.x+road.width*.65*(d.id==='town'&&!d.canonical?-1:1),z=p.z,h=terrainHeight(d,x,z);this.sites.push(new T.Vector3(x,h+4.5,z));
   const post=new T.Mesh(new T.CylinderGeometry(.08,.13,4.6,5),new T.MeshStandardMaterial({color:0x303a36,roughness:.7}));post.position.set(x,h+2.3,z);this.root.add(post);const lamp=new T.Mesh(new T.BoxGeometry(.45,.55,.45),this.glow);lamp.position.set(x,h+4.5,z);this.root.add(lamp);
   for(let j=0;j<20;j++){const a=j/20*Math.PI*2,b=(j+1)/20*Math.PI*2;for(const q of[[x,z],[x+Math.cos(a)*7,z+Math.sin(a)*7],[x+Math.cos(b)*7,z+Math.sin(b)*7]])vertices.push(q[0],terrainHeight(d,q[0],q[1])+.30,q[1]);}
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();const pools=new T.Mesh(geo,this.pools);pools.name='Warm street light pools';this.root.add(pools,...this.lights);this.setNightness(0);
 }
 setNightness(n:number){this.strength=T.MathUtils.smoothstep(n,.25,.8);this.glow.color.setRGB(1,.53,.18).multiplyScalar(.08+this.strength*2.3);this.pools.opacity=this.strength*.13;for(const light of this.lights)light.intensity=this.strength*90;}
 updateView(position:T.Vector3){const ordered=this.sites.slice().sort((a,b)=>a.distanceToSquared(position)-b.distanceToSquared(position));this.lights.forEach((light,i)=>{const site=ordered[i];light.visible=!!site&&site.distanceToSquared(position)<500*500;if(site)light.position.copy(site);});}
}
