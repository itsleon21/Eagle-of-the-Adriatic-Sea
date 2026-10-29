import {test} from 'node:test';import assert from 'node:assert/strict';
import {islands,terrainHeight,harborTerraceHeight,coveCave,coveRoofBottom} from '../src/world/WorldConfig.ts';
import {terrainSurfaceHeight,appendSurfacePolygon} from '../src/world/TerrainSurface.ts';
import {buildCoveArch,insideCoveArch} from '../src/world/CoveIsland.ts';
test('harbor town rises gradually from a low quay to broad inland terraces',()=>{
 assert.deepEqual([30,120,220,330,450].map(harborTerraceHeight),[4.5,16,34,58,90]);
 const d=islands[0];let previous=terrainHeight(d,d.x,d.z+30);
 for(let z=25;z>=-350;z-=5){const h=terrainHeight(d,d.x,d.z+z);assert.ok(h>=previous-.01);assert.ok(h-previous<3);previous=h;}
});
test('terrain overlays stay above the actual rendered triangles across grid diagonals',()=>{
 const d=islands[0],positions:number[]=[],colors:number[]=[];
 appendSurfacePolygon(d,[{x:d.x-20,z:d.z-108},{x:d.x+31,z:d.z-94},{x:d.x+25,z:d.z-53},{x:d.x-26,z:d.z-64}],.12,positions,colors,[1,1,1]);
 assert.ok(positions.length>100);
 for(let i=0;i<positions.length;i+=9){let x=0,y=0,z=0;for(let j=0;j<9;j+=3){x+=positions[i+j]/3;y+=positions[i+j+1]/3;z+=positions[i+j+2]/3;}assert.ok(Math.abs(y-terrainSurfaceHeight(d,x,z)-.12)<.0001);}
});
test('reference cove has a sheltered lagoon, beach, rising upland and open southern outlet',()=>{
 const d=islands[3];assert.equal(d.rx*2,800);assert.equal(d.rz*2,600);
 assert.ok(terrainHeight(d,d.x,d.z+25)<-5);
 assert.ok(terrainHeight(d,d.x+35,d.z+245)<0);
 assert.ok(terrainHeight(d,d.x,d.z-210)>60);
 let beach=0;for(let z=-170;z<-90;z++)if(terrainHeight(d,d.x,d.z+z)>0&&terrainHeight(d,d.x,d.z+z)<8)beach++;
 assert.ok(beach>=15);
 assert.ok(coveRoofBottom(coveCave.z)>50);
});
test('arch render surface and collision volume agree along its irregular entrances',()=>{
 const d=islands[3],mesh=buildCoveArch(d),p=mesh.geometry.attributes.position;
 for(let i=0;i<p.count;i+=9){assert.equal(insideCoveArch(d,p.getX(i),p.getY(i),p.getZ(i),.002),true);}
 assert.equal(insideCoveArch(d,d.x+290,24,d.z+coveCave.z),false);
 mesh.geometry.dispose();
});
