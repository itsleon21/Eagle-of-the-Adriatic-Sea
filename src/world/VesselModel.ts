import * as T from 'three';
export type VesselKind='ferry'|'fishing'|'sailing';
/** Closed, flared displacement hull with a pointed bow and transom, rather than a scaled sphere. */
export function buildVessel(kind:VesselKind,variant:number,lamps:T.Material){
 const root=new T.Group(),sailing=kind==='sailing',ferry=kind==='ferry',length=ferry?10:7,beam=ferry?3.3:2.5;
 const paint=new T.MeshPhysicalMaterial({color:[0x294b50,0x355969,0x7d382d,0xddd5bd,0x536858][variant%5],roughness:.38,metalness:.12,clearcoat:.4,clearcoatRoughness:.25});
 const cream=new T.MeshStandardMaterial({color:0xe5dec9,roughness:.7}),wood=new T.MeshStandardMaterial({color:0x936a43,roughness:.68}),dark=new T.MeshStandardMaterial({color:0x283432,roughness:.48,metalness:.55}),glass=new T.MeshPhysicalMaterial({color:0x31565b,roughness:.16,metalness:.22,clearcoat:.8});
 const add=(geo:T.BufferGeometry,m:T.Material,x=0,y=0,z=0)=>{const mesh=new T.Mesh(geo,m);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);return mesh;};
 const beamAt=(t:number)=>beam*Math.pow(Math.max(0,1-Math.pow((t-.53)/.53,2)),.48)*(t>.88?1-(t-.88)*.85:1);
 const yAt=(t:number)=>1.35+Math.pow(Math.abs(t-.52)*2,3)*.5;
 const verts:number[]=[],indices:number[]=[],count=24;
 for(let i=0;i<=count;i++){const t=i/count,w=Math.max(.015,beamAt(t)),z=(t*2-1)*length,top=yAt(t);for(const [x,y] of [[-w,top],[-w*.92,.25],[-w*.56,-.85],[0,-1.15],[w*.56,-.85],[w*.92,.25],[w,top]])verts.push(x,y,z);}
 for(let i=0;i<count;i++)for(let j=0;j<6;j++){const a=i*7+j;indices.push(a,a+1,a+7,a+1,a+8,a+7);}
 for(const end of[0,count]){const start=end*7;for(let j=1;j<6;j++)indices.push(...(end===0?[start,start+j+1,start+j]:[start,start+j,start+j+1]));}
 const hull=new T.BufferGeometry();hull.setAttribute('position',new T.Float32BufferAttribute(verts,3));hull.setIndex(indices);hull.computeVertexNormals();add(hull,paint).name='Flared planked hull / pointed bow and keel';
 const outline:T.Vector3[]=[];for(let i=0;i<=count;i++){const t=i/count;outline.push(new T.Vector3(-Math.max(.015,beamAt(t)),yAt(t)+.04,(t*2-1)*length));}for(let i=count;i>=0;i--){const t=i/count;outline.push(new T.Vector3(Math.max(.015,beamAt(t)),yAt(t)+.04,(t*2-1)*length));}
 // Deck is inset below the gunwale, with individual teak seams.
 const shape=new T.Shape(outline.map(p=>new T.Vector2(p.x,-p.z)));const deck=new T.ShapeGeometry(shape);deck.rotateX(-Math.PI/2);add(deck,wood,0,1.35,0).name='Inset teak deck';
 const line=(points:T.Vector3[],r:number,material:T.Material)=>add(new T.TubeGeometry(new T.CatmullRomCurve3(points),Math.max(2,points.length*2),r,5,false),material);
 const beamBetween=(a:T.Vector3,b:T.Vector3,r:number,m:T.Material)=>{const delta=b.clone().sub(a),o=add(new T.CylinderGeometry(r,r,delta.length(),6),m);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());};
 for(const side of[-1,1]){const edge=Array.from({length:25},(_,i)=>{const t=.03+i/24*.94;return new T.Vector3(side*beamAt(t),yAt(t)+.08,(t*2-1)*length);});line(edge,.095,cream).name='Cream gunwale rubbing strake';for(let i=0;i<edge.length;i+=4){const p=edge[i];beamBetween(p,p.clone().add(new T.Vector3(0,.72,0)),.035,dark);}line(edge.map(p=>p.clone().add(new T.Vector3(0,.72,0))),.035,dark).name='Stanchions and continuous safety rail';}
 for(let z=-length*.65;z<length*.8;z+=.65){const t=(z/length+1)/2,w=beamAt(t)*.85;add(new T.BoxGeometry(w*2,.018,.025),dark,0,1.38,z);}
 for(const z of[-length*.65,length*.72])for(const side of[-1,1]){add(new T.BoxGeometry(.55,.18,.16),dark,side*beam*.55,1.75,z);}
 if(!sailing){
  const cw=ferry?4.2:3.0,cl=ferry?7.5:4.5;add(new T.BoxGeometry(cw,2.25,cl),cream,0,2.55,.6);add(new T.BoxGeometry(cw+.45,.18,cl+.5),wood,0,3.78,.6);
  for(const side of[-1,1])for(let z=-cl/2+1;z<cl/2+.5;z+=1.4)add(new T.BoxGeometry(.06,.8,.95),glass,side*(cw/2+.035),2.96,z+.6);
  add(new T.BoxGeometry(cw*.72,.85,.06),glass,0,3,-cl/2+.56);
  add(new T.CylinderGeometry(.38,.45,1.5,8),dark,0,4.6,1.8);add(new T.CylinderGeometry(.42,.42,.2,8),paint,0,5.4,1.8);
  beamBetween(new T.Vector3(-1,3.9,.7),new T.Vector3(-1,6.1,.7),.045,dark);beamBetween(new T.Vector3(-1.8,5.5,.7),new T.Vector3(.2,5.5,.7),.03,dark);
  for(const side of[-1,1])for(const z of[ferry?-4:-2.4,3.7]){const tire=add(new T.TorusGeometry(.45,.13,6,12),dark,side*(beam+.12),.85,z);tire.rotation.y=Math.PI/2;}
  const ring=add(new T.TorusGeometry(.51,.13,6,16),new T.MeshStandardMaterial({color:0xe38c3c,roughness:.8}),cw/2+.08,2.5,1);ring.rotation.y=Math.PI/2;
  if(!ferry){for(const z of[4,5.3])add(new T.BoxGeometry(1.5,.8,1),wood,-.5,1.9,z);line([new T.Vector3(1,1.8,3),new T.Vector3(1,4.9,3),new T.Vector3(1,4.9,5.7)],.07,dark);}
 }else{
  add(new T.BoxGeometry(2.9,.9,4.6),cream,0,1.85,1);add(new T.BoxGeometry(2.5,.10,4.1),wood,0,2.36,1);for(const side of[-1,1])for(const z of[.1,1.8])add(new T.BoxGeometry(.04,.33,.6),glass,side*1.47,1.95,z);
  beamBetween(new T.Vector3(0,1.5,0),new T.Vector3(0,16,0),.095,cream);beamBetween(new T.Vector3(0,2.5,0),new T.Vector3(0,2.5,5.8),.075,wood);
  for(const side of[-1,1]){line([new T.Vector3(side*beam*.8,1.65,1.8),new T.Vector3(0,15.6,0),new T.Vector3(0,1.8,side<0?-length*.85:length*.85)],.018,dark);}
  const cloth=new T.MeshStandardMaterial({color:variant%2?0xeabc4e:0xf0a52e,roughness:.88,side:T.DoubleSide});
  for(const side of[-1,1]){const v:number[]=[],f:number[]=[];for(let row=0;row<=12;row++){const t=row/12,y=2.55+t*12.8,width=(1-t)*(side>0?6:4.9);for(let col=0;col<=10;col++){const u=col/10;v.push(Math.sin(u*Math.PI)*Math.sin((1-t)*Math.PI)*.85,y,side*width*u);}}for(let row=0;row<12;row++)for(let col=0;col<10;col++){const a=row*11+col;f.push(a,a+1,a+11,a+1,a+12,a+11);}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(v,3));geo.setIndex(f);geo.computeVertexNormals();add(geo,cloth).name='Amber canvas sail';
  const seams=new T.LineSegments(new T.EdgesGeometry(geo,65),new T.LineBasicMaterial({color:0xbb7a2e}));root.add(seams);}
 }
 for(const side of[-1,1])add(new T.SphereGeometry(.13,6,4),new T.MeshBasicMaterial({color:side<0?0xc73b24:0x54a66b}),side*beam*.8,3.4,0);
 add(new T.BoxGeometry(.8,.4,.05),lamps,0,sailing?2.1:3,-1.72);
 // Batch static fittings by material; sails keep two independently inspectable double-sided skins.
 const batches=new Map<T.Material,T.BufferGeometry[]>();for(const o of [...root.children]){if(!(o instanceof T.Mesh)||(o.material as T.MeshStandardMaterial).side===T.DoubleSide)continue;o.updateMatrix();const geo=o.geometry.clone().applyMatrix4(o.matrix);for(const key of Object.keys(geo.attributes))if(!['position','normal'].includes(key))geo.deleteAttribute(key);const list=batches.get(o.material as T.Material)??[];list.push(geo);batches.set(o.material as T.Material,list);root.remove(o);o.geometry.dispose();}
 for(const [material,parts] of batches){const expanded=parts.map(g=>g.index?g.toNonIndexed():g),merged=mergeGeometries(expanded,false)!;parts.forEach(g=>g.dispose());expanded.forEach((g,i)=>{if(g!==parts[i])g.dispose();});add(merged,material).name='Batched hull, deck and marine fittings';}
 return root;
}
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** Dockside boats reuse the same silhouette, flattened to one draw for distant harbour traffic. */
export function buildHarborBoat(variant:number){
 const boat=buildVessel('fishing',variant,new T.MeshBasicMaterial({color:0xe8d4a0})),parts:T.BufferGeometry[]=[];
 boat.updateMatrixWorld(true);boat.traverse(o=>{if(!(o instanceof T.Mesh))return;let g=o.geometry.clone().applyMatrix4(o.matrixWorld);if(g.index){const expanded=g.toNonIndexed();g.dispose();g=expanded;}const c=(o.material as T.MeshStandardMaterial).color,n=g.attributes.position.count,data=new Float32Array(n*3);for(let i=0;i<n;i++)data.set([c.r,c.g,c.b],i*3);g.setAttribute('color',new T.BufferAttribute(data,3));parts.push(g);});
 const merged=mergeGeometries(parts,false)!;parts.forEach(g=>g.dispose());boat.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();(o.material as T.Material).dispose();}});
 const mesh=new T.Mesh(merged,new T.MeshStandardMaterial({vertexColors:true,roughness:.68}));mesh.castShadow=mesh.receiveShadow=true;mesh.userData.waterline=0;return mesh;
}
