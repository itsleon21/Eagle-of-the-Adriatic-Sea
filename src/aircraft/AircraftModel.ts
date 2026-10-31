import {repairAircraftTangents} from '../rendering/AircraftGeometry.ts';
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getAircraft } from './AircraftCatalog.ts';
import type { AircraftId } from './FlightConfig.ts';
import {prepareAircraftSurface,physicalAircraftMaterial} from '../rendering/AircraftSurface.ts';

function disposeTree(root:T.Object3D) {
  const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>();
  root.traverse(object=>{if(object instanceof T.Mesh){geometries.add(object.geometry);for(const m of Array.isArray(object.material)?object.material:[object.material])materials.add(m);}});
  for(const material of materials){for(const value of Object.values(material))if(value instanceof T.Texture)textures.add(value);material.dispose();}
  for(const texture of textures)texture.dispose();for(const geometry of geometries)geometry.dispose();
}
export class AircraftModel {
  readonly root=new T.Group();
  private propeller=new T.Group();private propellers:T.Object3D[]=[];private ailerons:T.Object3D[]=[];private elevator?:T.Object3D;private rudder?:T.Object3D;
  private blurs:T.Mesh<T.RingGeometry,T.MeshBasicMaterial>[]=[];private request=0;
  isLoading=false;assetStatus='程序外形';
  aircraftId:AircraftId;
  constructor(aircraftId:AircraftId='redwing'){this.aircraftId=aircraftId;this.root.add(this.fallback());}
  private fallback(){
    this.propeller=new T.Group();this.propellers=[this.propeller];const plane=getAircraft(this.aircraftId),m5=this.aircraftId==='m5',group=new T.Group();
    const paint=new T.MeshPhysicalMaterial({color:plane.color,roughness:.34,clearcoat:.48,clearcoatRoughness:.19}),hullPaint=new T.MeshPhysicalMaterial({color:m5?0x713b24:0xb93424,roughness:m5?.42:.34,clearcoat:m5?.32:.48,clearcoatRoughness:.20}),cream=new T.MeshStandardMaterial({color:m5?0xe5e2d2:0xd2bd77,roughness:.6}),dark=new T.MeshStandardMaterial({color:0x493a2b,roughness:.7});
    const make=(g:T.BufferGeometry,m:T.Material,x:number,y:number,z:number)=>{const mesh=new T.Mesh(g,m);mesh.position.set(x,y,z);mesh.castShadow=true;group.add(mesh);return mesh;};
    if(['mc72','s6','gloster6','m67'].includes(this.aircraftId)){
      const body=make(new T.SphereGeometry(1,24,12),paint,0,.15,0);body.scale.set(.47,.55,3.95);
      make(new T.BoxGeometry(9.48,.13,1.6),paint,0,-.14,0);
      for(const side of[-1,1]){const f=make(new T.SphereGeometry(1,20,10),cream,side*1.18,-1.44,-.2);f.scale.set(.34,.38,3.25);make(new T.BoxGeometry(.05,1.25,.05),dark,side*1.18,-.7,-1);}
      make(new T.BoxGeometry(2.6,.08,.9),paint,0,.22,3.25);make(new T.BoxGeometry(.08,1.05,.85),paint,0,.65,3.45);
      this.propeller.position.set(0,.22,-4.04);this.propeller.userData.rotation_direction=1;const rear=new T.Group();rear.position.set(0,.22,-3.87);rear.userData.rotation_direction=-1;rear.rotation.z=Math.PI/2;this.propellers=[this.propeller,rear];for(const p of this.propellers){p.add(new T.Mesh(new T.BoxGeometry(.15,2.5,.045),dark));group.add(p);}return group;
    }
    make(new T.SphereGeometry(1,24,12),hullPaint,0,-.12,0).scale.set(.63,.57,plane.length/2);
    make(new T.SphereGeometry(1,20,10),cream,0,-.49,0).scale.set(.60,.48,3.8);
    make(new T.BoxGeometry(plane.span,.13,m5?1.7:2.3),paint,0,m5?1.85:.61,-.65);
    if(m5)make(new T.BoxGeometry(8.8,.10,1.5),paint,0,.48,-.55);
    make(new T.BoxGeometry(3.1,.1,1.15),paint,0,.5,3.5);make(new T.BoxGeometry(.10,1.35,1.4),paint,0,1.0,3.65);
    for(const side of [-1,1]){const f=make(new T.SphereGeometry(1,16,8),cream,side*4,-.28,-.7);f.scale.set(.28,.30,1.15);make(new T.BoxGeometry(.055,m5?1.9:.8,.055),dark,side*4,m5?.75:.15,-.7);}
    this.propeller.position.set(0,m5?1.25:1.45,m5?.65:-2.49);group.add(this.propeller);this.propeller.add(new T.Mesh(new T.BoxGeometry(2,.15,.1),dark));
    make(new T.SphereGeometry(.45,16,8),dark,0,.28,m5?-1.4:.8).scale.set(.8,.25,1.2);return group;
  }
  async load(renderer?:T.WebGLRenderer,id:AircraftId=this.aircraftId):Promise<boolean>{
    const request=++this.request;this.aircraftId=id;const plane=getAircraft(id);this.isLoading=true;this.assetStatus=`${plane.name} 模型加载中`;
    disposeTree(this.root);this.root.clear();this.ailerons=[];this.elevator=this.rudder=undefined;this.blurs=[];this.root.add(this.fallback());
    try{
      const gltf=await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/${plane.modelFile}`);
      if(request!==this.request){disposeTree(gltf.scene);return false;}
      disposeTree(this.root);this.root.clear();this.root.add(gltf.scene);
      this.propeller=gltf.scene.getObjectByName('PropellerPivot') as T.Group||new T.Group();this.propellers=[];gltf.scene.traverse(o=>{if(o.name.startsWith('PropellerPivot'))this.propellers.push(o);});
      this.ailerons=['LeftAileron','RightAileron'].map(name=>gltf.scene.getObjectByName(name)).filter((o):o is T.Object3D=>!!o);
      this.elevator=gltf.scene.getObjectByName('Elevator');this.rudder=gltf.scene.getObjectByName('Rudder');
      const prepared=new Set<T.Material>(),upgraded=new Map<T.Material,T.Material>();
      gltf.scene.traverse(object=>{if(object instanceof T.Mesh){const originals=Array.isArray(object.material)?object.material:[object.material];const materials=originals.map(source=>{if(!upgraded.has(source))upgraded.set(source,physicalAircraftMaterial(source));return upgraded.get(source)!;});object.material=Array.isArray(object.material)?materials:materials[0];object.castShadow=!materials.every(m=>m.transparent);object.receiveShadow=true;
        repairAircraftTangents(object.geometry);
        const ao=object.geometry.getAttribute('color');if(ao){object.geometry.setAttribute('aircraftAO',ao);object.geometry.deleteAttribute('color');}
        for(const material of materials){const m=material as T.MeshPhysicalMaterial;if(!prepared.has(m)){prepareAircraftSurface(m,!!ao);prepared.add(m);}if(m.transparent)m.depthWrite=false;for(const texture of [m.map,m.normalMap,m.roughnessMap,m.metalnessMap])if(texture){texture.anisotropy=Math.min(8,renderer?.capabilities.getMaxAnisotropy()??4);texture.needsUpdate=true;}}
      }});
      for(const [source,material] of upgraded)if(source!==material)source.dispose();
      for(const pivot of this.propellers){const blur=new T.Mesh(new T.RingGeometry(.16,plane.propellerRadius,64),new T.MeshBasicMaterial({color:0xc6b487,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide}));blur.position.z=-.025*plane.propellerDirection;pivot.add(blur);this.blurs.push(blur);}
      this.isLoading=false;this.assetStatus=`${plane.name} / GLB`;return true;
    }catch{if(request===this.request){this.isLoading=false;this.assetStatus=`${plane.name} 程序外形（模型未加载）`;}return false;}
  }
  update(dt:number,throttle:number,roll:number,pitch:number,yaw:number){
    for(const pivot of this.propellers)pivot.rotation.z+=dt*(22+throttle*105)*(typeof pivot.userData.rotation_direction==='number'?pivot.userData.rotation_direction:getAircraft(this.aircraftId).propellerDirection);
    for(const blur of this.blurs){blur.material.opacity=throttle>.35?(throttle-.35)*.12:0;blur.visible=throttle>.35;}
    this.ailerons.forEach((object,i)=>object.rotation.x=(i===0?1:-1)*roll*.25);
    if(this.elevator)this.elevator.rotation.x=-pitch*.25;if(this.rudder)this.rudder.rotation.y=-yaw*.25;
  }
  dispose(){this.request++;disposeTree(this.root);this.root.clear();this.isLoading=false;}
}
