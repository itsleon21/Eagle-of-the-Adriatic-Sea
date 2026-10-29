import type {BufferGeometry} from 'three';
/** Guard imported tangent frames at thin caps and collapsed UV edges. Keeps normals and UVs intact. */
export function repairAircraftTangents(geometry:BufferGeometry){
 const normal=geometry.getAttribute('normal'),tangent=geometry.getAttribute('tangent');if(!normal||!tangent)return 0;let repaired=0;
 for(let i=0;i<normal.count;i++){
  const nx=normal.getX(i),ny=normal.getY(i),nz=normal.getZ(i),n2=nx*nx+ny*ny+nz*nz;if(n2<1e-10)continue;
  let x=tangent.getX(i),y=tangent.getY(i),z=tangent.getZ(i);const dot=(nx*x+ny*y+nz*z)/n2,len=Math.hypot(x,y,z);
  if(Number.isFinite(dot+len)&&Math.abs(dot)<1e-4&&Math.abs(len-1)<1e-3)continue;
  x-=nx*dot;y-=ny*dot;z-=nz*dot;
  if(!Number.isFinite(x+y+z)||Math.hypot(x,y,z)<1e-5){if(Math.abs(nx)<.8){x=0;y=nz;z=-ny;}else{x=-nz;y=0;z=nx;}}
  const length=Math.hypot(x,y,z);tangent.setXYZW(i,x/length,y/length,z/length,tangent.getW(i)<0?-1:1);repaired++;
 }
 if(repaired)tangent.needsUpdate=true;return repaired;
}
