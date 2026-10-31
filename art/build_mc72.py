"""Macchi MC.72, modelled from the supplied photograph and MUSAM dimensions.
9.48 m span, 8.32 m length, ~3.30 m overall height. Y up; -Z forward.
Original geometry/maps. Blender --background --factory-startup --threads 2 --python art/build_mc72.py
"""
import bpy,bmesh,math,os,sys
import numpy as np
from mathutils import Vector,Matrix
BASE=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEX=os.path.join(BASE,'art','mc72_textures');os.makedirs(TEX,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
root=bpy.data.objects.new('AircraftRoot',None);scene.collection.objects.link(root)
def mat(name,c,rough=.4,metal=0,coat=0,alpha=1):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,alpha);m.use_nodes=True;p=m.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;p.inputs['Coat Weight'].default_value=coat;p.inputs['Coat Roughness'].default_value=.10;p.inputs['Alpha'].default_value=alpha
 if alpha<1:m.surface_render_method='BLENDED'
 return m
red=mat('MC72 Italian racing lacquer',(.53,.018,.010),.27,0,.9)
cream=mat('MC72 float bottom enamel',(.82,.78,.66),.31,0,.75)
alloy=mat('MC72 polished propeller alloy',(.56,.59,.57),.24,.85)
steel=mat('MC72 dark steel bracing',(.045,.046,.043),.43,.7)
gold=mat('MC72 brass surface radiators',(.42,.27,.09),.37,.72)
black=mat('MC72 cockpit interior',(.018,.02,.017),.85)
leather=mat('MC72 saddle leather',(.19,.067,.029),.72)
glass=mat('MC72 windscreen glass',(.66,.77,.77),.15,0,.20,.23)
white=mat('MC72 ivory markings',(.86,.84,.76),.45);green=mat('MC72 Italian green',(.018,.23,.066),.46)
def image(name,a,space):
 h,w=a.shape[:2];im=bpy.data.images.new(name,width=w,height=h,alpha=True);im.colorspace_settings.name=space;im.pixels.foreach_set(a.astype(np.float32).ravel());im.filepath_raw=os.path.join(TEX,name+'.png');im.file_format='PNG';im.save();im.pack();return im
# Mip-filterable paint panels/rivets: no alpha decals or subpixel coplanar overlays.
w,h=1024,512;u,v=np.meshgrid(np.arange(w)/w,np.arange(h)/h);rng=np.random.default_rng(720)
seam=np.exp(-(np.minimum((u*9)%1,1-(u*9)%1)/.010)**2)
rivets=np.exp(-(np.minimum((u*9)%1,1-(u*9)%1)/.024)**2)*np.exp(-(np.minimum((v*28)%1,1-(v*28)%1)/.10)**2)
a=np.ones((h,w,4));grain=rng.normal(0,.0012,(h,w));a[:,:,:3]=np.array([.74,.108,.067])[None,None,:]+grain[:,:,None];a[:,:,:3]*=(1-.11*seam-.12*rivets)[:,:,None]
color=image('mc72_racing_red',np.clip(a,0,1),'sRGB');a[:,:,:3]=(.36+seam*.08+grain*2+.035*np.sin(u*math.tau*3)*np.cos(v*math.tau*2))[:,:,None];rough=image('mc72_paint_roughness',a,'Non-Color')
height=-seam*.0015;gy,gx=np.gradient(height);n=np.stack([-gx*3,-gy*3,np.ones_like(gx)],axis=-1);n/=np.linalg.norm(n,axis=-1,keepdims=True);a[:,:,:3]=n*.5+.5;normal=image('mc72_panel_normal',a,'Non-Color')
ra=np.ones((256,512,4));uu,vv=np.meshgrid(np.arange(512)/512,np.arange(256)/256);ra[:,:,:3]=(.5+.045*np.sin(uu*math.tau*18))[:,:,None];radiator=image('mc72_radiator_roughness',ra,'Non-Color');node=gold.node_tree.nodes.new('ShaderNodeTexImage');node.image=radiator;gold.node_tree.links.new(node.outputs['Color'],gold.node_tree.nodes['Principled BSDF'].inputs['Roughness'])
p=red.node_tree.nodes['Principled BSDF'];links=red.node_tree.links
for im,name in [(color,'Base Color'),(rough,'Roughness')]:t=red.node_tree.nodes.new('ShaderNodeTexImage');t.image=im;links.new(t.outputs['Color'],p.inputs[name])
t=red.node_tree.nodes.new('ShaderNodeTexImage');t.image=normal;n=red.node_tree.nodes.new('ShaderNodeNormalMap');n.inputs['Strength'].default_value=.22;links.new(t.outputs['Color'],n.inputs['Color']);links.new(n.outputs['Normal'],p.inputs['Normal'])
def finish(o,name,m,parent=root,smooth=True):
 o.name=name;o.parent=parent;o.data.materials.append(m)
 for f in o.data.polygons:f.use_smooth=smooth
 return o
def mesh(name,v,f,m,parent=root,uv=None,smooth=True):
 data=bpy.data.meshes.new(name);data.from_pydata(v,[],f);data.update();o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);finish(o,name,m,parent,smooth)
 bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(data);bm.free()
 if uv:
  layer=data.uv_layers.new(name='UVMap')
  for poly in data.polygons:
   for li in poly.loop_indices:layer.data[li].uv=uv[data.loops[li].vertex_index]
 return o
def box(name,p,s,m,parent=root,bevel=.015):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.scale=s;finish(o,name,m,parent,False);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:a=o.modifiers.new('Rounded solid edges','BEVEL');a.width=bevel;a.segments=2
 return o
def ell(name,p,s,m,parent=root):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=1,location=p);o=bpy.context.object;o.scale=s;return finish(o,name,m,parent)
def rod(name,a,b,r,m,parent=root):
 delta=Vector(b)-Vector(a);bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=r,depth=delta.length,location=(Vector(a)+Vector(b))*.5);o=bpy.context.object;o.rotation_euler=delta.to_track_quat('Z','Y').to_euler();return finish(o,name,m,parent)
# Fuller engine bay and a continuous, broad aft fuselage, matched to the side photograph.
# Keep the documented overall dimensions; correct the silhouette rather than stretching it.
sections=[(-3.76,.25,.28,.34),(-3.45,.23,.41,.47),(-2.85,.18,.46,.53),(-1.8,.13,.47,.56),(-.7,.13,.44,.53),(.45,.17,.40,.44),(.83,.20,.37,.39),(1.20,.22,.35,.36),(1.65,.23,.32,.32),(2.6,.25,.24,.25),(3.5,.27,.14,.17),(4.16,.28,.045,.08)]
# Cubic Hermite longitudinal sampling removes the visible polygon shoulders.
def section_at(z):
 j=max(0,min(len(sections)-2,next((i for i in range(len(sections)-1) if sections[i+1][0]>=z),len(sections)-2)))
 left,right=sections[j],sections[j+1];d=right[0]-left[0];t=(z-left[0])/d;result=[]
 for k in [1,2,3]:
  before=sections[max(0,j-1)];after=sections[min(len(sections)-1,j+2)]
  m0=(right[k]-before[k])/(right[0]-before[0]);m1=(after[k]-left[k])/(after[0]-left[0])
  result.append((2*t**3-3*t*t+1)*left[k]+(t**3-2*t*t+t)*d*m0+(-2*t**3+3*t*t)*right[k]+(t**3-t*t)*d*m1)
 return result
zs=sorted(set([round(-3.76+i*7.92/96,6) for i in range(97)]+[.83,1.65,4.16]));v=[];uv=[];n=64
for z in zs:
 y,w,h=section_at(z)
 for i in range(n):a=i/n*math.tau;v.append((math.sin(a)*w,y+math.cos(a)*h,z));uv.append(((z+3.76)/7.92,i/n))
f=[]
for j in range(len(zs)-1):
 for i in range(n):
  if .83<=(zs[j]+zs[j+1])*.5<=1.65 and (i<9 or i>=55):continue
  f.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
f.extend([tuple(range(n-1,-1,-1)),tuple((len(zs)-1)*n+i for i in range(n))]);mesh('Long inline engine fuselage with open cockpit',v,f,red,uv=uv)
box('Cockpit well',(0,.25,1.23),(.49,.16,.70),black)
box('Leather seat cushion',(0,.36,1.31),(.43,.09,.37),leather);box('Leather seat back',(0,.51,1.56),(.43,.34,.10),leather)
for side in [-1,1]:rod('Cockpit rolled coaming',(side*.275,.46,.84),(side*.25,.43,1.65),.027,leather)
box('Instrument panel',(0,.46,.84),(.49,.23,.055),black)
for i in [-1,0,1]:ell('Instrument dial',(i*.13,.48,.805),(.046,.046,.012),alloy)
mesh('Three pane windscreen',[(-.28,.56,.79),(.28,.56,.79),(.23,.83,.88),(-.23,.83,.88)],[(0,1,2,3)],glass,smooth=False)
for side in [-1,1]:rod('Windscreen frame',(side*.28,.56,.79),(side*.23,.83,.88),.012,alloy)
# The brass panels ARE the upper skin faces: no second surface, no depth fighting.
xs=[0,.45,.58,1.12,1.21,1.75,1.84,2.38,2.47,2.65,3.01,3.10,3.64,4.34,4.52,4.66,4.73,4.74]
us=[0,.04,.10,.16,.24,.34,.46,.58,.70,.77,.80,.87,.94,1]
loop=[(u,1) for u in us]+[(u,-1) for u in us[-2:0:-1]]
def wing_point(x,u,upper):
 chord=float(np.interp(x,[0,.45,2.65,4.34,4.52,4.66,4.73,4.74],[1.98,1.98,1.78,1.45,1.33,1.12,.86,.70]))
 return (-.17+(x/4.74)**2*.045+upper*.085*chord*(math.sin(math.pi*u)**.72),-.83+x*.055+u*chord)
for side in [-1,1]:
 v=[];uv=[];f=[];radiator_faces=[];n=len(loop)
 for x in xs:
  for u,upper in loop:
   y,z=wing_point(x,u,upper);v.append((side*x,y,z));uv.append((x/4.74,u))
 for j in range(len(xs)-1):
  for k in range(n):
   kk=(k+1)%n;u0,up=loop[k];u1,_=loop[kk];x=(xs[j]+xs[j+1])*.5;u=(u0+u1)*.5
   if 2.65<x<4.34 and u>.77:continue
   f.append((j*n+k,j*n+kk,(j+1)*n+kk,(j+1)*n+k))
   if up==1 and .16<u<.70 and any(lo<x<hi for lo,hi in[(.58,1.12),(1.21,1.75),(1.84,2.38),(2.47,3.01),(3.10,3.64)]):radiator_faces.append(len(f)-1)
 for j in range(len(xs)-1):
  if 2.65<(xs[j]+xs[j+1])*.5<4.34:f.append((j*n+9,(j+1)*n+9,(j+1)*n+17,j*n+17))
 f.extend([tuple(range(n-1,-1,-1)),tuple((len(xs)-1)*n+k for k in range(n))]);o=mesh('Port low wing' if side<0 else 'Starboard low wing',v,f,red,uv=uv);o.data.materials.append(gold)
 for i in radiator_faces:o.data.polygons[i].material_index=1
 pivot=bpy.data.objects.new('LeftAileron' if side<0 else 'RightAileron',None);scene.collection.objects.link(pivot);pivot.parent=root;pivot.location=(side*3.495,-.17,.70)
 av=[];af=[]
 # Same airfoil, isolated by a 2 cm hinge gap and actual span gaps.
 for x in [2.67,3.10,3.64,4.32]:
  for u,up in loop:
   u=.79+u*.21;y,z=wing_point(x,u,up);av.append((side*(x-3.495),y+.17,z-.70))
 for j in range(3):
  for k in range(n):af.append((j*n+k,j*n+(k+1)%n,(j+1)*n+(k+1)%n,(j+1)*n+k))
 af.extend([tuple(range(n-1,-1,-1)),tuple(3*n+k for k in range(n))]);mesh('Airfoil aileron with hinge clearance',av,af,red,pivot)

# Twin planing floats: sharp chines, a V keel and a stepped bottom, not rounded fuselage pontoons.
outline=[(0,.30),(.26,.26),(.35,.09),(.28,-.19),(0,-.39),(-.28,-.19),(-.35,.09),(-.26,.26)]
float_sections=[(-4.10,-1.21,.025),(-3.90,-1.25,.26),(-3.60,-1.31,.58),(-3.25,-1.37,.79),(-2.85,-1.42,.94),(-2.2,-1.44,1),(-1.6,-1.44,1),(-.7,-1.44,1),(.02,-1.44,.96),(.14,-1.44,.96),(1.1,-1.42,.85),(2.20,-1.36,.68),(2.75,-1.32,.52)]
for side in [-1,1]:
 v=[];uv=[]
 for z,cy,scale in float_sections:
  for i,(xx,yy) in enumerate(outline):
   # The hydrodynamic step is on the keel, never a discontinuity on the top deck.
   y=cy+yy*scale
   if yy>=.26:y=-1.14 if z> -2.85 else y
   if z>=.14 and yy<.1:y+=.13
   v.append((side*1.18+xx*scale,y,z));uv.append(((z+4.10)/6.85,i/8))
 f=[]
 for j in range(len(float_sections)-1):
  for i in range(8):f.append((j*8+i,j*8+(i+1)%8,(j+1)*8+(i+1)%8,(j+1)*8+i))
 f.extend([tuple(range(7,-1,-1)),tuple((len(float_sections)-1)*8+i for i in range(8))]);o=mesh('Port stepped racing float' if side<0 else 'Starboard stepped racing float',v,f,red,uv=uv,smooth=False);o.data.materials.append(cream);o.data.materials.append(gold)
 for poly in o.data.polygons:
  if poly.index<(len(float_sections)-1)*8 and poly.index%8 in [3,4]:poly.material_index=1
 for poly in o.data.polygons:
  c=poly.center
  if -2.85<c.z<.02 and c.y>-1.21:poly.material_index=2
 for a,b in [((side*.31,-.17,-1.16),(side*1.18,-1.12,-2.05)),((side*.31,-.13,.61),(side*1.18,-1.07,.67)),((side*2.25,-.12,-.45),(side*1.18,-1.08,-1.92)),((side*2.2,-.12,.61),(side*1.18,-1.08,.63))]:rod('Streamlined float support',a,b,.034,steel)
 rod('Upper wing tension cable',(side*.23,.53,-1.25),(side*3.72,-.075,.03),.0065,steel)
 rod('Lower wing tension cable',(side*1.18,-1.12,-1.8),(side*3.9,-.11,.45),.0065,steel)
 rod('Diagonal pontoon bracing',(-side*1.18,-1.13,-1.8),(side*1.18,-1.12,.55),.007,steel)
# Cooling access panels and paired twelve-port exhaust banks along the large forward engine bay.
for side in [-1,1]:
 for i in range(12):
  z=-3.18+i*.205;rod('Exhaust stub',(side*.45,.22,z),(side*.51,.22,z+.015),.034,steel)
  ell('Exhaust opening',(side*.52,.22,z+.015),(.009,.025,.025),black)
 rod('Engine access trim',(side*.37,.51,-3.20),(side*.37,.51,-.65),.008,alloy)
# Tailplane and independent elevator.
# Rounded, tapered tailplane and a broad elliptical rudder from the photograph.
def tail_surface(name,xs,leading,chords,parent=root,origin=(0,0,0)):
 v=[];f=[];n=24
 for x,lead,chord in zip(xs,leading,chords):
  for k in range(n):
   a=k/n*math.tau;u=(1-math.cos(a))*.5;v.append((x-origin[0],.30+.045*math.sin(a)-origin[1],lead+u*chord-origin[2]))
 for j in range(len(xs)-1):
  for k in range(n):f.append((j*n+k,j*n+(k+1)%n,(j+1)*n+(k+1)%n,(j+1)*n+k))
 f.extend([tuple(range(n-1,-1,-1)),tuple((len(xs)-1)*n+k for k in range(n))]);return mesh(name,v,f,red,parent)
tail_surface('Rounded horizontal stabilizer',[-1.34,-1.29,-1.1,-.55,0,.55,1.1,1.29,1.34],[3.44,3.19,3.00,2.83,2.79,2.83,3.00,3.19,3.44],[.08,.33,.52,.69,.73,.69,.52,.33,.08])
elev=bpy.data.objects.new('Elevator',None);scene.collection.objects.link(elev);elev.parent=root;elev.location=(0,.30,3.54)
tail_surface('Rounded elevator',[-1.28,-1.1,-.55,0,.55,1.1,1.28],[3.56]*7,[.05,.23,.35,.38,.35,.23,.05],elev,(0,.30,3.54))
def fin_prism(name,points,parent=root):
 v=[(x,y,z) for x in[-.042,.042] for z,y in points];n=len(points);f=[tuple(range(n-1,-1,-1)),tuple(n+i for i in range(n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)];return mesh(name,v,f,red,parent,smooth=False)
fin_prism('Curved dorsal fin',[(2.38,.31),(2.59,.40),(2.78,.57),(2.96,.81),(3.12,1.08),(3.28,1.31),(3.42,1.43),(3.50,1.45),(3.50,.30)])
rud=bpy.data.objects.new('Rudder',None);scene.collection.objects.link(rud);rud.parent=root;rud.location=(0,.65,3.52)
fin_prism('Broad rounded rudder',[(0,-.37),(0,.80),(.15,.78),(.30,.70),(.42,.55),(.50,.32),(.54,.03),(.51,-.23),(.43,-.37),(.20,-.41)],rud)
# Tricolor assigned directly to the fin faces, avoiding floating decals.
for o in [bpy.data.objects['Curved dorsal fin'],bpy.data.objects['Broad rounded rudder']]:
 o.data.materials.append(green);o.data.materials.append(white)
 for poly in o.data.polygons:
  z=poly.center.z+(rud.location.z if o.parent==rud else 0)
  if abs(poly.normal.x)>.9 and 3.28<z<3.65:poly.material_index=1 if z<3.46 else 2
# Four visible blades: both rotor planes sit ahead of the cowl nose at Z=-3.76.
# Rear rotor is offset 90 degrees for the parked four-blade silhouette.
# The supplied side photograph shows tapered blades and a compact pointed metal spinner.
for i,z in enumerate([-4.04,-3.87]):
 pivot=bpy.data.objects.new('PropellerPivot' if i==0 else 'PropellerPivotRear',None);scene.collection.objects.link(pivot);pivot.parent=root;pivot.location=(0,.22,z);pivot['rotation_direction']=1 if i==0 else -1;pivot.rotation_euler[2]=0 if i==0 else math.pi/2
 for side in[-1,1]:
  stations=[(.12,.040,0),(.23,.070,.004),(.43,.109,.015),(.68,.119,.025),(.91,.092,.028),(1.10,.056,.018),(1.22,.023,.006),(1.25,.002,0)]
  verts=[];faces=[];segments=12
  for radius,chord,sweep in stations:
   pitch=(.58-.38*radius/1.25)*(1 if i==0 else -1)
   for j in range(segments):
    angle=j/segments*math.tau;x=math.cos(angle)*chord;thick=math.sin(angle)*(.012*(1-radius/1.6))
    verts.append((side*(sweep+x*math.cos(pitch)-thick*math.sin(pitch)),side*radius,x*math.sin(pitch)+thick*math.cos(pitch)))
  for k in range(len(stations)-1):
   for j in range(segments):
    q=k*segments+j;n=k*segments+(j+1)%segments;faces.append((q,n,n+segments,q+segments))
  faces.extend([tuple(range(segments-1,-1,-1)),tuple((len(stations)-1)*segments+j for j in range(segments))])
  mesh('Metal racing propeller blade',verts,faces,alloy,pivot)
 ell('Rear propeller hub' if i else 'Front propeller hub',(0,0,0),(.145,.145,.065),alloy,pivot)
# Closed revolved spinner; no overlapping cream-coloured sphere at the shaft tip.
verts=[];faces=[]
for z,radius in [(-4.16,.002),(-4.13,.065),(-4.08,.116),(-4.02,.147),(-3.96,.15)]:
 for j in range(48):
  a=j/48*math.tau;verts.append((math.cos(a)*radius,.22+math.sin(a)*radius,z))
for k in range(4):
 for j in range(48):
  q=k*48+j;n=k*48+(j+1)%48;faces.append((q,q+48,n+48,n))
faces.extend([tuple(range(47,-1,-1)),tuple(192+j for j in range(48))])
mesh('Pointed alloy spinner',verts,faces,alloy)
# Discreet model registration, geometry lettering rather than a floating transparent decal.
for side in[-1,1]:
 curve=bpy.data.curves.new('MC72 registration lettering','FONT');curve.body='MC.72';curve.size=.14;curve.extrude=.0005;o=bpy.data.objects.new('MC72 tail registration',curve);scene.collection.objects.link(o);o.parent=root;o.location=(side*.285,.30,2.10);o.rotation_euler=(0,side*math.pi/2,0);o.data.materials.append(white);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
# Solid fillers, locking latches and float towing fixtures; no layered skin decals.
for z in [-1.24,-.85]:
 cy,cw,ch=section_at(z);y=cy+ch
 rod('Fuel service collar',(0,y+.006,z),(0,y+.025,z),.075,alloy)
 rod('Fuel cap',(0,y+.027,z),(0,y+.037,z),.055,steel)
 rod('Fuel cap cross grip',(-.034,y+.043,z),(.034,y+.043,z),.009,alloy)
for side in [-1,1]:
 for z in [-3.22,-2.78,-2.32,-1.86,-1.40,-.94]:
  cy,cw,ch=section_at(z);a=.92;x=side*cw*math.sin(a);y=cy+ch*math.cos(a)
  rod('Cowling captive screw',(x,y,z),(x+side*.016,y+.008,z),.015,steel)
 for z in [-2.35,-.80,.78]:
  rod('Float deck mooring boss',(side*1.18,-1.145,z),(side*1.18,-1.100,z),.043,alloy)
  rod('Float deck latch',(side*1.18-.067,-1.09,z),(side*1.18+.067,-1.09,z),.010,steel)
 ell('Float bow tow eye',(side*1.18,-1.21,-3.68),(.047,.026,.058),alloy)
box('Rudder control horn',(.095,.42,3.80),(.19,.025,.13),steel,parent=rud,bevel=.009).location=(.095,-.23,.28)
root['detail_revision']='v019 captive cowl screws, filler caps, float latches and rudder horn'
for o in list(scene.objects):
 if o.type=='MESH':
  bpy.context.view_layer.objects.active=o
  for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
# Batch static geometry while preserving floats and every movable pivot as independent nodes.
static=[o for o in scene.objects if o.type=='MESH' and o.parent==root and not o.name.startswith(('Port stepped racing float','Starboard stepped racing float'))]
bpy.ops.object.select_all(action='DESELECT')
for o in static:o.select_set(True)
bpy.context.view_layer.objects.active=bpy.data.objects.get('Long inline engine fuselage with open cockpit');bpy.ops.object.join();bpy.context.object.name='AircraftBody'
root['span_m']=9.48;root['length_m']=8.32;root['height_m']=3.30;root['skin_topology']='Single surface radiators; separated control hinge gaps';root['fuselage_max_width_m']=.94;root['fuselage_max_depth_m']=1.12;root['design']='Macchi MC.72 twin-float racing seaplane; coaxial contra-rotating propellers';root['reference']='User photograph and Aeronautica Militare technical dimensions';root['units']='metres; Y up; -Z forward'
sys.path.insert(0,os.path.join(BASE,'art'))
from bake_aircraft_ao import bake_aircraft_ao,export_with_ao
bake_aircraft_ao(root);export_with_ao(root,os.path.join(BASE,'public','models','mc72.glb'))
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=os.path.join(BASE,'art','mc72.blend'),compress=True)
# Source-derived orthographic checks, rendered only after saving the modelling source.
def aim(o,target):
 f=(Vector(target)-o.location).normalized();r=f.cross(Vector((0,1,0))).normalized();u=r.cross(f);o.rotation_euler=Matrix((r,u,-f)).transposed().to_euler()
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.resolution_x=1280;scene.render.resolution_y=960;scene.render.resolution_percentage=100;scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.70,.69,.66,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.45
for p,power in [((-5,8,-7),2000),((6,4,5),1200)]:
 bpy.ops.object.light_add(type='AREA',location=p);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=5;aim(o,(0,-.2,0))
bpy.ops.object.camera_add();camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=11.3;scene.camera=camera
out=os.path.join(BASE,'art','mc72_views');os.makedirs(out,exist_ok=True)
for name,p in [('beauty',(-10,4.8,-12)),('top',(0,25,0)),('side',(-25,0,0)),('front',(0,0,-25))]:
 camera.location=p
 if name=='top':camera.rotation_euler=(-math.pi/2,0,0)
 else:aim(camera,(0,-.25,0))
 scene.render.filepath=os.path.join(out,name+'.png');bpy.ops.render.render(write_still=True)
 print('MC72_VIEW_COMPLETE',name,flush=True)
print('MC72_ASSET_COMPLETE',flush=True)
