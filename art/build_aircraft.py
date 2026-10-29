"""Refined original seaplane, modeled as one coherent Y-up / -Z-forward aircraft.
Blender --background --python art/build_aircraft.py
Paint / roughness / normal textures are generated originals, embedded in GLB.
"""
import bpy, bmesh, math, os
import numpy as np
from mathutils import Vector, Matrix
BASE=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEXTURES=os.path.join(BASE,'art','textures');os.makedirs(TEXTURES,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.gravity=(0,-9.81,0)
root=bpy.data.objects.new('AircraftRoot',None);scene.collection.objects.link(root)
def image(name,array,color='sRGB'):
 h,w=array.shape[:2];im=bpy.data.images.new(name,width=w,height=h,alpha=True)
 im.colorspace_settings.name=color;im.pixels.foreach_set(array.astype(np.float32).ravel());im.filepath_raw=os.path.join(TEXTURES,name+'.png');im.file_format='PNG';im.save();im.pack();return im
def material(name,c,rough=.5,metal=0,coat=0,alpha=1):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,alpha);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
 p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;p.inputs['Alpha'].default_value=alpha
 if p.inputs.get('Coat Weight'):p.inputs['Coat Weight'].default_value=coat;p.inputs['Coat Roughness'].default_value=.18
 if alpha<1 and hasattr(m,'surface_render_method'):m.surface_render_method='BLENDED'
 return m
def painted(name,kind,nu=12,nv=3,w=1536,h=768):
 rng=np.random.default_rng(82+nu);u,v=np.meshgrid(np.arange(w)/w,np.arange(h)/h)
 du=np.minimum((u*nu)%1,1-(u*nu)%1)*w/nu;dv=np.minimum((v*nv)%1,1-(v*nv)%1)*h/nv
 seams=np.maximum(np.exp(-(du/.65)**2),np.exp(-(dv/.7)**2));dotsv=np.minimum((v*h/11)%1,1-(v*h/11)%1)*11;dotsu=np.minimum((u*w/11)%1,1-(u*w/11)%1)*11
 rivets=np.maximum(np.exp(-((du-3.2)/.8)**2-(dotsv/.85)**2),np.exp(-((dv-3.1)/.8)**2-(dotsu/.85)**2))
 grain=np.repeat(np.repeat(rng.normal(0,.004,(h//4,w//4)),4,axis=0),4,axis=1);grain=(grain+np.roll(grain,1,0)+np.roll(grain,1,1))/3;grain=np.round(grain*700)/700;waves=np.sin(u*67+np.sin(v*11)*2)*.004+np.sin(v*83)*.003
 cream=np.zeros((h,w))
 if kind=='float':cream=np.clip((v-.505)*80,0,1)*np.clip((.995-v)*80,0,1)
 if kind=='hull':cream=np.clip((v-.69)*120,0,1)*np.clip((.81-v)*120,0,1)
 if kind=='wing':cream=np.zeros_like(u)
 if kind=='fin':cream=np.clip((u-.44)*160,0,1)*np.clip((.70-u)*160,0,1)
 red=np.array([.73,.15,.105]);ivory=np.array([.88,.75,.36]) if kind in ('hull','float') else np.array([.91,.85,.69]);base=red[None,None,:]*(1-cream[:,:,None])+ivory[None,None,:]*cream[:,:,None]
 if kind=='fin':base=np.where((u<.44)[:,:,None],np.array([.25,.48,.22]),base)
 base*=1+grain[:,:,None]+waves[:,:,None];base*=1-seams[:,:,None]*.23-rivets[:,:,None]*.29
 # Subtle rubbed paint along panel edges, with no arbitrary dirt over the reference silhouette.
 polish=np.exp(-((du-1.4)/.7)**2)*.045;base+=polish[:,:,None]
 rgba=np.ones((h,w,4),np.float32);rgba[:,:,:3]=np.clip(base,0,1);color=image(name+'_color',rgba)
 rough=np.clip(.34+cream*.07+grain*2+seams*.10+rivets*.07+.035*np.sin(u*math.tau*3)*np.sin(v*math.tau*2),.27,.60);rgba[:,:,:3]=rough[:,:,None];roughmap=image(name+'_roughness',rgba,'Non-Color')
 height=-seams*.026-rivets*.045+grain*.007;gy,gx=np.gradient(height);normal=np.stack([-gx*9,-gy*7,np.ones_like(gx)],axis=-1);normal/=np.linalg.norm(normal,axis=-1,keepdims=True);rgba[:,:,:3]=normal*.5+.5;normalmap=image(name+'_normal',rgba,'Non-Color')
 m=material(name,(.6,.055,.028),.34,0,.48);nodes=m.node_tree.nodes;links=m.node_tree.links;p=nodes['Principled BSDF']
 for im,target in [(color,'Base Color'),(roughmap,'Roughness')]:
  tex=nodes.new('ShaderNodeTexImage');tex.image=im;links.new(tex.outputs['Color'],p.inputs[target])
 tex=nodes.new('ShaderNodeTexImage');tex.image=normalmap;n=nodes.new('ShaderNodeNormalMap');n.inputs['Strength'].default_value=.38;links.new(tex.outputs['Color'],n.inputs['Color']);links.new(n.outputs['Normal'],p.inputs['Normal']);return m
hullpaint=painted('Hull lacquer','hull',12,5,1536,768)
wingpaint=painted('Wing lacquer','wing',16,3,2048,768)
floatpaint=painted('Float lacquer','float',5,3,768,512)
finpaint=painted('Tail fin lacquer','fin',4,5,768,768)
tailpaint=painted('Tailplane lacquer','wing',8,3,1024,512)
cowlpaint=painted('Cowling lacquer','cowl',4,3,1024,512)
structural_red=material('Vermilion structural enamel',(.48,.025,.012),.33,.12,.35)
ivory=material('Ivory enamel',(.82,.73,.52),.43,.04,.3)
trim=material('Warm leather cockpit rim',(.2,.09,.036),.64)
brass=material('Polished hub and fasteners',(.45,.34,.15),.24,.88)
steel=material('Machined engine alloy',(.22,.25,.26),.33,.85)
blackmetal=material('Cylinder dark steel',(.035,.043,.045),.38,.72)
black=material('Cockpit interior',(.018,.024,.022),.92)
leather=material('Pleated saddle leather',(.23,.075,.025),.62)
wire=material('Steel rigging',(.12,.14,.14),.36,.75)
glass=material('Windshield glass',(.65,.82,.86),.09,.02,.6,.27)
# A restrained original walnut grain texture, following the blade span.
u,v=np.meshgrid(np.arange(768)/768,np.arange(256)/256);grain=np.sin(v*240+np.sin(u*17)*2.5)*.035+np.sin(v*480+u*9)*.015
woodrgba=np.ones((256,768,4),np.float32);woodrgba[:,:,:3]=np.array([.82,.73,.49])+grain[:,:,None]*.35;tip=u>.89;woodrgba[tip,:3]=[.91,.84,.66]
woodimage=image('Propeller walnut',woodrgba);wood=material('Golden varnished propeller',(.36,.16,.055),.31,.02,.4);tex=wood.node_tree.nodes.new('ShaderNodeTexImage');tex.image=woodimage;wood.node_tree.links.new(tex.outputs['Color'],wood.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
def finish(o,name,m,parent=root,smooth=True):
 o.name=name;o.parent=parent;o.data.materials.append(m)
 for p in o.data.polygons:p.use_smooth=smooth
 return o
def mesh(name,verts,faces,m,parent=root,uv=None,wrap=False,smooth=True):
 data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update();o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);finish(o,name,m,parent,smooth)
 bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(data);bm.free()
 if uv:
  layer=data.uv_layers.new(name='UVMap')
  for p in data.polygons:
   values=[uv[data.loops[i].vertex_index] for i in p.loop_indices];cross=wrap and max(x[1] for x in values)-min(x[1] for x in values)>.5
   for li,value in zip(p.loop_indices,values):layer.data[li].uv=(value[0],value[1]+(1 if cross and value[1]<.5 else 0))
 return o
def sphere(name,p,s,m,parent=root,segments=24,rings=12):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=p);o=bpy.context.object;o.scale=s;return finish(o,name,m,parent)
def box(name,p,s,m,parent=root,bevel=.015):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.scale=s;finish(o,name,m,parent,False);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=o.modifiers.new('Rounded machined edges','BEVEL');mod.width=bevel;mod.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 return o
def rod(name,a,b,r,m,parent=root,vertices=12):
 a,b=Vector(a),Vector(b);bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=(b-a).length,location=(a+b)/2);o=bpy.context.object;o.rotation_mode='QUATERNION';o.rotation_quaternion=(b-a).to_track_quat('Z','Y');return finish(o,name,m,parent)
def tube(name,points,r,m,parent=root):
 curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=1;curve.bevel_depth=r;curve.bevel_resolution=2;curve.resolution_u=3;spline=curve.splines.new('POLY');spline.points.add(len(points)-1)
 for p,co in zip(spline.points,points):p.co=(*co,1)
 o=bpy.data.objects.new(name,curve);scene.collection.objects.link(o);o.parent=parent;curve.materials.append(m);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False);return o

def pivot(name,p):
 o=bpy.data.objects.new(name,None);scene.collection.objects.link(o);o.location=p;o.parent=root;return o
def smooth_sampler(rows):
 knots=np.array([r[0] for r in rows]);values=np.array([r[1:] for r in rows]);h=np.diff(knots);d=np.diff(values,axis=0)/h[:,None];m=np.zeros_like(values);m[0]=d[0];m[-1]=d[-1]
 for i in range(1,len(rows)-1):
  for j in range(values.shape[1]):
   if d[i-1,j]*d[i,j]>0:
    w1=2*h[i]+h[i-1];w2=h[i]+2*h[i-1];m[i,j]=(w1+w2)/(w1/d[i-1,j]+w2/d[i,j])
 def sample(z):
  i=max(0,min(len(rows)-2,int(np.searchsorted(knots,z)-1)));t=np.clip((z-knots[i])/h[i],0,1)
  return values[i]*(2*t**3-3*t*t+1)+m[i]*h[i]*(t**3-2*t*t+t)+values[i+1]*(-2*t**3+3*t*t)+m[i+1]*h[i]*(t**3-t*t)
 return sample

# Fuller rounded flying-boat bow, broad shoulders and a tapered tail boom.
profile=[(-4.25,.025,.12,.12,-.18),(-4.22,.17,.23,.24,-.17),(-4.10,.35,.36,.44,-.14),(-3.80,.55,.43,.64,-.11),(-3.15,.67,.44,.77,-.10),(-2.3,.70,.43,.77,-.10),(-1.3,.66,.43,.75,-.10),(-.3,.57,.43,.73,-.10),(.7,.49,.43,.60,-.10),(1.7,.38,.42,.40,-.08),(2.7,.25,.41,.26,-.07),(3.8,.14,.40,.12,-.06),(4.25,.06,.33,.06,-.06)]
# Shape-preserving Hermite interpolation avoids creases from straight profile segments.
profile_z=np.array([p[0] for p in profile]);profile_values=np.array([p[1:] for p in profile]);gaps=np.diff(profile_z);secants=np.diff(profile_values,axis=0)/gaps[:,None];slopes=np.zeros_like(profile_values);slopes[0]=secants[0];slopes[-1]=secants[-1]
for i in range(1,len(profile)-1):
 for j in range(4):
  a,b=secants[i-1,j],secants[i,j]
  if a*b>0:
   w1=2*gaps[i]+gaps[i-1];w2=gaps[i]+2*gaps[i-1];slopes[i,j]=(w1+w2)/(w1/a+w2/b)
def section(z):
 i=min(len(profile)-2,max(0,int(np.searchsorted(profile_z,z)-1)));t=np.clip((z-profile_z[i])/gaps[i],0,1)
 values=profile_values[i]*(2*t**3-3*t*t+1)+slopes[i]*gaps[i]*(t**3-2*t*t+t)+profile_values[i+1]*(-2*t**3+3*t*t)+slopes[i+1]*gaps[i]*(t**3-t*t);values[1]=max(.04,values[1]-.08);return values.tolist()
def hull_point(z,a):
 width,top,draft,shoulder=section(z);draft-=.14 if z>=-.08 else 0;draft=max(.04,draft);x=width*math.cos(a);s=math.sin(a);y=shoulder+top*s**.85 if s>=0 else shoulder-draft*(1-abs(math.cos(a)))**.9;return (x,y,z)
verts=[];uv=[];faces=[];stations=np.unique(np.r_[np.linspace(-4.25,4.25,96),-.10,-.08]);nz=len(stations);na=64
for i,z in enumerate(stations):
 for j in range(na):verts.append(hull_point(z,j/na*math.tau));uv.append((i/(nz-1),j/na))
for i in range(nz-1):
 for j in range(na):faces.append((i*na+j,i*na+(j+1)%na,(i+1)*na+(j+1)%na,(i+1)*na+j))
faces.extend([tuple(reversed(range(na))),tuple((nz-1)*na+j for j in range(na))]);fuselage=mesh('Rounded planing hull',verts,faces,hullpaint,uv=uv,wrap=True)
# Boolean cockpit well, with a real opening and dark interior walls.
fuselage.data.materials.append(black);cv=[];cf=[]
for y in [-.16,1.8]:
 for j in range(64):a=j/64*math.tau;cv.append((.385*math.cos(a),y,.88+.76*math.sin(a)))
for j in range(64):cf.append((j,(j+1)%64,64+(j+1)%64,64+j))
cf.extend([tuple(reversed(range(64))),tuple(64+j for j in range(64))]);cutter=mesh('Cockpit cutter',cv,cf,hullpaint);cutter.data.materials.append(black)
for p in cutter.data.polygons:p.material_index=1
bpy.context.view_layer.objects.active=fuselage;mod=fuselage.modifiers.new('Open cockpit well','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
# A raised protective keel and visible planing chine.
tube('Keel rubbing strip',[(0,section(z)[3]-section(z)[2]+(.14 if z>=-.08 else 0)-.012,z) for z in np.linspace(-3.7,.5,40)],.018,trim)
for side in [-1,1]:tube('Hull chine',[(side*section(z)[0]*.96,section(z)[3]-.025,z) for z in np.linspace(-3.7,2.7,55)],.009,ivory)
# Pair of recessed-looking nose intakes on the upper shoulder.
for side in [-1,1]:
 v=[];edge=[];cx=side*.29;cz=-3.48
 def deck(x,z):
  w,top,draft,shoulder=section(z);return shoulder+top*max(0,1-(x/w)**2)**.425
 v.append((cx,deck(cx,cz)+.004,cz))
 for a in np.linspace(0,math.tau,40,endpoint=False):
  x=cx+.085*math.cos(a);z=cz+.24*math.sin(a);v.append((x,deck(x,z)+.005,z));edge.append(v[-1])
 mesh('Oval bow intake',v,[(0,1+j,1+(j+1)%40) for j in range(40)],black,smooth=False);tube('Bow intake rim',edge+[edge[0]],.005,structural_red)
# Airfoil cross-sections have camber, rounded tips, subtle sweep and dihedral.
def wing_point(x,xi,sign,span,chord,y,z):
 # Broad clipped/rounded tips: the reference retains useful chord at the wing end.
 # The previous ellipse collapsed the tip to a needle and made the tail leaf-shaped.
 t=min(1,abs(x)/(span/2));tail=span<4
 taper=.15 if tail else .12;corner=.115 if tail else .25
 u=max(0,min(1,(t-.87)/.13));inset=corner*(1-math.sqrt(max(0,1-u*u)))
 c=chord*(1-taper*t)-2*inset;lead=z-chord*(1-taper*t)*.5+inset+(.22 if tail else .85)*t**1.35
 ratio=(.085 if tail else .105)-(.020 if tail else .025)*t*t
 thickness=5*ratio*c*(.2969*math.sqrt(max(0,xi))-.126*xi-.3516*xi**2+.2843*xi**3-.1036*xi**4)
 cap=1-.45*u*u
 return (x,y+(.018 if tail else .035)*t*t+.016*c*math.sin(math.pi*xi)+sign*thickness*cap,lead+xi*c)

def wing_strip(name,xa,xb,span,chord,y,z,m,part=(0,1),parent=root,origin=(0,0,0)):
 n=max(10,int((xb-xa)*10));cross=[(part[0]+(part[1]-part[0])*(.5-.5*math.cos(j/20*math.pi)),1) for j in range(21)]+[(part[0]+(part[1]-part[0])*(.5+.5*math.cos(j/20*math.pi)),-1) for j in range(21)];v=[];uv=[];f=[];count=len(cross)
 for i in range(n+1):
  x=xa+(xb-xa)*i/n
  for xi,s in cross:
   p=wing_point(x,xi,s,span,chord,y,z);v.append(tuple(p[k]-origin[k] for k in range(3)));uv.append((x/span+.5,xi))
 for i in range(n):
  for j in range(count):f.append((i*count+j,i*count+(j+1)%count,(i+1)*count+(j+1)%count,(i+1)*count+j))
 for ring in [0,n]:
  start=len(v);v.extend([v[ring*count+j] for j in range(count)]);uv.extend([uv[ring*count+j] for j in range(count)]);indices=list(range(start,start+count));f.append(tuple(reversed(indices)) if ring==0 else tuple(indices))
 o=mesh(name,v,f,m,parent,uv);o.data.polygons[-1].use_smooth=False;o.data.polygons[-2].use_smooth=False;return o
for a,b,part in [(-6.0,-5.58,(0,1)),(-5.58,-2.15,(0,.74)),(-2.15,2.15,(0,1)),(2.15,5.58,(0,.74)),(5.58,6.0,(0,1))]:wing_strip('MainWing',a,b,12,2.5,.61,-.85,wingpaint,part)
for side in [-1,1]:
 a,b=(-5.55,-2.17) if side<0 else (2.17,5.55);mid=(a+b)/2;origin=wing_point(mid,.747,0,12,2.5,.61,-.85);aileron=pivot('LeftAileron' if side<0 else 'RightAileron',origin);wing_strip('Articulated aileron',a,b,12,2.5,.61,-.85,wingpaint,(.752,.994),aileron,origin)
 # Red structural members and fine metal tension wires.
 for z in [-1.55,-.15]:rod('Cabane strut',(side*.48,.20,z),(side*.76,.57,z),.032,structural_red)
 rod('Main wing diagonal',(side*.55,.14,.3),(side*3.85,.61,-1.15),.027,structural_red)
 rod('Rigging wire',(side*.55,.18,-1.0),(side*3.7,.61,-.12),.007,wire)
 # V-bottom stabilizing floats.
 v=[];uv=[];f=[];rings=[(-1.96,.025,.055),(-1.8,.22,.23),(-1.45,.35,.32),(-.8,.34,.31),(-.15,.23,.25),(.43,.035,.07)]
 float_sample=smooth_sampler(rings);float_stations=np.linspace(rings[0][0],rings[-1][0],32)
 for i,z in enumerate(float_stations):
  w,h=float_sample(z)
  for j in range(40):
   a=j/40*math.tau;x=w*math.cos(a);s=math.sin(a);yy=h*s if s>=0 else -h*(1-abs(math.cos(a)));v.append((side*4.12+x,-.27+yy,z));uv.append((i/(len(float_stations)-1),j/40))
 for i in range(len(float_stations)-1):
  for j in range(40):f.append((i*40+j,i*40+(j+1)%40,(i+1)*40+(j+1)%40,(i+1)*40+j))
 f.extend([tuple(reversed(range(40))),tuple((len(float_stations)-1)*40+j for j in range(40))]);mesh('LeftFloat' if side<0 else 'RightFloat',v,f,floatpaint,uv=uv,wrap=True)
 for z in [-1.6,-.35]:rod('Float vertical support',(side*4.08,.61,z),(side*4.12,-.04,z),.026,structural_red)
 rod('Float cross brace',(side*.58,-.05,-1.2),(side*4.12,-.02,-.4),.022,structural_red);rod('Float tension wire',(side*.6,.1,-.3),(side*4.12,-.05,-1.5),.006,wire)
# The fixed tips close the outline around the separate, working elevator.
for xa,xb,part in[(-1.55,-1.42,(0,1)),(-1.42,1.42,(0,.72)),(1.42,1.55,(0,1))]:
 wing_strip('HorizontalTail',xa,xb,3.10,1.28,.47,3.60,tailpaint,part)
origin=(0,.47,3.90);elevator=pivot('Elevator',origin)
wing_strip('Elevator surface',-1.40,1.40,3.10,1.28,.47,3.60,tailpaint,(.735,.998),elevator,origin)
# Rounded swept fin; the rudder is a clipped part of the same silhouette.
control=[(.28,3.02),(.73,3.12),(1.30,3.32),(1.62,3.57),(1.68,3.85),(1.58,4.10),(1.28,4.25),(.40,4.25),(.28,4.08)]
outline=[]
for i in range(len(control)):
 p0=np.array(control[(i-1)%len(control)]);p1=np.array(control[i]);p2=np.array(control[(i+1)%len(control)]);p3=np.array(control[(i+2)%len(control)])
 for t in np.linspace(0,1,7,endpoint=False):outline.append(tuple(.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t)))
def clip(poly,bound,front):
 result=[]
 for a,b in zip(poly,poly[1:]+poly[:1]):
  ai=a[1]<=bound if front else a[1]>=bound;bi=b[1]<=bound if front else b[1]>=bound
  if ai:result.append(a)
  if ai!=bi:
   t=(bound-a[1])/(b[1]-a[1]);result.append((a[0]+(b[0]-a[0])*t,bound))
 return result
def fin(name,poly,parent=root,origin=(0,0,0)):
 n=len(poly);v=[(x-origin[0],y-origin[1],z-origin[2]) for x in [-.045,.045] for y,z in poly];f=[tuple(reversed(range(n))),tuple(n+j for j in range(n))];uv=[((z-2.45)/1.95,(y-.25)/1.7) for x in [-1,1] for y,z in poly]
 for i in range(n):f.append((i,(i+1)%n,(i+1)%n+n,i+n))
 o=mesh(name,v,f,finpaint,parent,uv,smooth=False);bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Rounded tail perimeter','BEVEL');mod.width=.017;mod.segments=3;bpy.ops.object.modifier_apply(modifier=mod.name);return o
fin('VerticalTail',clip(outline,3.91,True));rudder=pivot('Rudder',(0,.28,3.92));fin('Rudder surface',clip(outline,3.93,False),rudder,(0,.28,3.92))
# Open cockpit leather rim, seat pleats, harness, controls and gauges.
rim=[]
for a in np.linspace(0,math.tau,90):
 x=.405*math.cos(a);z=.88+.78*math.sin(a);w,top,draft,shoulder=section(z);y=shoulder+top*max(0,1-(x/w)**2)**.425+.025;rim.append((x,y,z))
tube('Padded cockpit coaming',rim,.034,trim)
box('Seat cushion',(0,-.06,1.17),(.55,.12,.52),leather,bevel=.06)
box('Seat back',(0,.19,1.40),(.57,.58,.13),leather,bevel=.06)
for i in range(6):box('Leather pleat',(-.225+i*.09,.18,1.315),(.068,.46,.038),leather,bevel=.015)
for side in [-1,1]:rod('Harness shoulder belt',(side*.17,.43,1.295),(side*.09,-.01,.99),.023,ivory)
box('Instrument panel',(0,.07,.22),(.61,.3,.07),black,bevel=.035)
for x,y,r in [(-.17,.09,.062),(0,.11,.078),(.18,.09,.057)]:
 rod('Gauge bezel',(x,y,.285),(x,y,.316),r,brass,vertices=24);rod('Gauge face',(x,y,.318),(x,y,.322),r*.82,black,vertices=20);rod('Gauge needle',(x-.015,y-.012,.326),(x+.020,y+.025,.326),.004,ivory)
rod('Control stick',(0,-.12,.78),(0,.13,.72),.016,steel);box('Control grip',(0,.14,.72),(.14,.035,.035),black,bevel=.012)
v=[];f=[]
for row in range(2):
 for j in range(17):
  a=-math.pi/2+j/16*math.pi;x=math.sin(a)*.36;v.append((x,.27+row*(.29*math.cos(a)), .11-.18*math.cos(a)+row*.08))
for j in range(16):f.append((j,j+1,j+18,j+17))
mesh('Windshield',v,f,glass,smooth=True);tube('Windshield upper frame',v[17:],.009,steel);tube('Windshield base frame',v[:17],.011,steel)
# Long enclosed engine nacelle, with paired upper fairings and side exhaust shields.
engine_before=set(scene.objects)
EY=1.45
bronze=material('Bronze exhaust shields',(.30,.15,.055),.4,.55)
pod_rows=[(-2.67,.025,.105),(-2.59,.19,.30),(-2.42,.34,.45),(-2.18,.44,.53),(-1.9,.465,.55),(-1.4,.46,.53),(-.85,.42,.47),(-.48,.32,.37),(-.30,.13,.23),(-.25,.035,.11)]
pod_sample=smooth_sampler(pod_rows)
v=[];uv=[];f=[];nr=72;nc=64
for i,z in enumerate(np.linspace(-2.67,-.25,nr)):
 rx,ry=pod_sample(z)
 for j in range(nc):
  a=j/nc*math.tau;c=math.cos(a);sn=math.sin(a)
  v.append((rx*math.copysign(abs(c)**.78,c),EY+ry*math.copysign(abs(sn)**.78,sn),z));uv.append((i/(nr-1),j/nc))
for i in range(nr-1):
 for j in range(nc):f.append((i*nc+j,i*nc+(j+1)%nc,(i+1)*nc+(j+1)%nc,(i+1)*nc+j))
f.extend([tuple(reversed(range(nc))),tuple((nr-1)*nc+j for j in range(nc))])
engine=mesh('Engine enclosed nacelle',v,f,cowlpaint,uv=uv,wrap=True)
# Three real transverse cooling ports, with dark internal machinery behind the apertures.
engine.data.materials.append(blackmetal);cutters=[]
for z in [-1.93,-1.44,-.96]:cutters.append(rod('Cooling port cutter',(-.70,EY-.18,z),(.70,EY-.18,z),.055,blackmetal,vertices=24))
bpy.ops.object.select_all(action='DESELECT')
for o in cutters:o.select_set(True)
bpy.context.view_layer.objects.active=cutters[0];bpy.ops.object.join();cutter=bpy.context.object
bpy.context.view_layer.objects.active=engine;mod=engine.modifiers.new('Recessed engine cooling ports','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
# Separate bore-wall normals from the curved skin to prevent pinched highlights.
bm=bmesh.new();bm.from_mesh(engine.data)
for edge in bm.edges:
 if len(edge.link_faces)==2 and (edge.link_faces[0].material_index!=edge.link_faces[1].material_index or edge.calc_face_angle()>.7):edge.smooth=False
bm.to_mesh(engine.data);bm.free()
bpy.context.view_layer.objects.active=engine;bevel=engine.modifiers.new('Cooling port edge radius','BEVEL');bevel.width=.004;bevel.segments=2;bevel.limit_method='ANGLE';bevel.angle_limit=.65;bpy.ops.object.modifier_apply(modifier=bevel.name)
box('Engine dark internal block',(0,EY-.18,-1.44),(.60,.25,1.55),blackmetal,bevel=.04)
# Two longitudinal upper hoods replace the old round radial-engine crown.
for side in [-1,1]:
 v=[];uv=[];f=[];ns=44;nc=24
 for i in range(ns):
  t=i/(ns-1);z=-2.47+t*2.14;bulge=max(.012,math.sin(math.pi*t)**.55);rx=.19*bulge;ry=.145*bulge;cy=EY+.43+.08*(1-t)
  for j in range(nc):a=j/nc*math.tau;v.append((side*.24+rx*math.cos(a),cy+ry*math.sin(a),z));uv.append((t,j/nc))
 for i in range(ns-1):
  for j in range(nc):f.append((i*nc+j,i*nc+(j+1)%nc,(i+1)*nc+(j+1)%nc,(i+1)*nc+j))
 f.extend([tuple(reversed(range(nc))),tuple((ns-1)*nc+j for j in range(nc))]);mesh('Long upper engine hood',v,f,cowlpaint,uv=uv,wrap=True)
 # Bronze heat shield arches along each side; dark slots sit beneath its lip.
 tube('Long exhaust shield',[(side*(.43+.04*math.sin(t*math.pi)),EY+.30+.045*math.sin(t*math.pi),-2.19+t*1.81) for t in np.linspace(0,1,42)],.064,bronze)
 for z in np.linspace(-2.04,-.64,12):
  rx,ry=pod_sample(z);yy=.17;xx=rx*max(.01,1-(yy/ry)**(2/.78))**(.78/2)
  slot=box('Vent under exhaust shield',(side*(xx+.007),EY+yy,z),(.018,.105,.075),blackmetal,bevel=.012);slot.rotation_euler.x=-.24
 for z in [-2.40,-2.32,-2.24]:
  rx,ry=pod_sample(z);yy=.18;xx=rx*max(.01,1-(yy/ry)**(2/.78))**(.78/2)
  rod('Front shoulder intake',(side*(xx+.006),EY+.10,z),(side*(xx-.015),EY+.24,z+.018),.012,blackmetal,vertices=10)
 for z in [-2.16,-.82]:
  rx,ry=pod_sample(z);points=[]
  for a in np.linspace(0,math.tau,64):c=math.cos(a);sn=math.sin(a);points.append((rx*math.copysign(abs(c)**.78,c),EY+ry*math.copysign(abs(sn)**.78,sn),z))
  tube('Cowling service panel seam',points,.004,blackmetal)
 # Wide streamlined support legs and mounting feet immediately above the main wing.
 for z in [-1.94,-.68]:
  rx,ry=pod_sample(z-.02);attach_y=EY-ry*(1-(.30/rx)**(2/.78))**(.78/2)+.025
  a=(side*.40,.66,z);b=(side*.30,attach_y,z-.02);rod('Engine support leg',a,b,.047,structural_red)
  box('Engine support foot',(side*.40,.645,z),(.18,.035,.25),structural_red,bevel=.025)
 rod('Engine cross brace',(side*.42,.66,-.58),(-side*.28,.93,-1.98),.014,wire)
# Rear starter casing, stacked silver bands and a compact red end-cap.
sphere('Rear red starter cover',(0,EY-.07,-.20),(.33,.33,.19),structural_red,segments=32,rings=16)
for z in [-.37,-.32,-.27]:tube('Rear silver cooling band',[(.337*math.cos(a),EY-.07+.337*math.sin(a),z) for a in np.linspace(0,math.tau,64)],.018,steel)
box('Rear starter cap fin',(0,EY-.07,-.025),(.50,.025,.30),structural_red,bevel=.012)
tube('Hand starter crank',[(0,EY-.07,.0),(0,EY+.12,.08),(.15,EY+.12,.08)],.018,steel)
rod('Starter crank grip',(.15,EY+.12,.08),(.15,EY+.12,.16),.028,blackmetal)
prop=pivot('PropellerPivot',(0,EY,-2.84));rod('Propeller spindle',(0,0,.06),(0,0,-.12),.085,steel,prop,24)
for side in [-1,1]:
 v=[];uv=[];f=[];stations=[(.10,.06),(.27,.12),(.50,.155),(.75,.13),(.92,.075),(.99,.012)];n=24
 for i,(r,w) in enumerate(stations):
  twist=.34*(1-r/.99)+.07
  for j in range(n):
   a=j/n*math.tau;yy=w*math.sin(a);zz=.027*math.cos(a);y=yy*math.cos(twist)-zz*math.sin(twist)+r*.045;z=yy*math.sin(twist)+zz*math.cos(twist);v.append((side*r,side*y,z));uv.append(((r-.10)/.89,j/n))
 for i in range(len(stations)-1):
  for j in range(n):f.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
 f.extend([tuple(reversed(range(n))),tuple((len(stations)-1)*n+j for j in range(n))]);mesh('Ivory wooden propeller',v,f,wood,prop,uv,True)
sphere('Ivory streamlined spinner',(0,0,-.07),(.15,.15,.18),ivory,prop,segments=32,rings=16)
# Keep the stationary engine as one named mesh for inspection and future replacement.
engine_parts=[o for o in scene.objects if o not in engine_before and o.type=='MESH' and o.parent==root]
bpy.ops.object.select_all(action='DESELECT')
for o in engine_parts:o.select_set(True)
bpy.context.view_layer.objects.active=engine;bpy.ops.object.join();engine.name='EngineAssembly';engine.location.z+=.30;bpy.ops.object.transform_apply(location=True,rotation=False,scale=False);prop.location.z+=.30;engine['layout']='enclosed longitudinal nacelle';engine['reference_length_m']=2.06
# Calibrate the full nacelle to the side reference: about a quarter of the hull length.
for vertex in engine.data.vertices:vertex.co.z=vertex.co.z*.85-.33
prop.location.z=prop.location.z*.85-.33
# Merge only stationary parts; independent pivots retain their local axes.
# Service hardware follows the actual hull, with real thickness and separated edges.
for z in [-3.06,-2.78]:
 y=hull_point(z,math.pi/2)[1]
 rod('Flush deck filler collar',(0,y+.007,z),(0,y+.023,z),.083,steel,vertices=24)
 rod('Quarter turn filler cap',(0,y+.025,z),(0,y+.034,z),.062,brass,vertices=24)
 rod('Filler grip',(-.035,y+.040,z),(.035,y+.040,z),.008,steel)
for side in [-1,1]:
 points=[hull_point(z,.30 if side>0 else math.pi-.30) for z in np.linspace(-2.65,-1.38,26)]
 tube('Hull longitudinal service seam',[(x*1.014,y+.006,z) for x,y,z in points],.005,blackmetal)
 for z in [-2.59,-2.28,-1.98,-1.67,-1.43]:
  x,y,_=hull_point(z,.30 if side>0 else math.pi-.30)
  rod('Hull inspection screw',(x*1.002,y,z),(x+side*.020,y,z),.016,steel,vertices=8)
# A solid bow towing eye and two mooring cleats add believable docking structure.
y=hull_point(-3.86,math.pi/2)[1]
tube('Bow towing eye',[(.06*math.cos(a),y+.05+.045*math.sin(a),-3.86) for a in np.linspace(0,math.tau,25)],.011,steel)
for side in [-1,1]:
 x,y,z=hull_point(2.0,.85 if side>0 else math.pi-.85)
 rod('Mooring cleat pedestal',(x,y+.005,z),(x,y+.055,z),.021,steel)
 rod('Mooring cleat',(x,y+.055,z-.095),(x,y+.055,z+.095),.014,steel)
root['detail_revision']='v019 service caps, inspection screws, towing eye and mooring cleats'
static=[o for o in list(scene.objects) if o.type=='MESH' and o.parent==root and o!=engine];bpy.ops.object.select_all(action='DESELECT')
for o in static:o.select_set(True)
bpy.context.view_layer.objects.active=fuselage;bpy.ops.object.join();fuselage.name='AircraftBody'
bpy.context.view_layer.update();model_objects=[o for o in scene.objects if o.type in {'MESH','EMPTY'}]
for o in model_objects:
 if o.type=='MESH':
  bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
root['design']='Slender flying boat; broad rounded/clipped wing tips; compact swept tricolor fin; full tail tips surrounding an articulated elevator';root['units']='meters; Y up; -Z forward'
bpy.ops.object.select_all(action='DESELECT')
for o in model_objects:o.select_set(True)
os.makedirs(os.path.join(BASE,'public','models'),exist_ok=True)
import sys
sys.path.insert(0,os.path.join(BASE,'art'))
from bake_aircraft_ao import bake_aircraft_ao, export_with_ao
bake_aircraft_ao(root)
export_with_ao(root,os.path.join(BASE,'public','models','aircraft.glb'))
print('REFINED_GLB_EXPORTED',flush=True)
# A real lit studio renders the same model for beauty and orthographic verification.
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.render.resolution_x=1280;scene.render.resolution_y=960;scene.render.resolution_percentage=100
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.55,.65,.8,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.5
scene.view_settings.view_transform='AgX';scene.view_settings.exposure=-.7
def area(name,p,power,size):
 data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);o.location=p;o.rotation_euler=(Vector((0,.4,0))-o.location).to_track_quat('-Z','Y').to_euler()
area('Large warm key',(-5,8,-7),2200,5);area('Soft cool fill',(7,4,-1),850,7);area('Rim light',(2,5,6),1700,4)
floor=box('Studio floor',(0,-1.12,0),(200,.04,200),material('Studio backdrop',(.66,.69,.70),.85),parent=None,bevel=0)
bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO';camera.data.ortho_scale=12.8
os.makedirs(os.path.join(BASE,'art','aircraft_views'),exist_ok=True)
views=[('beauty',(-11,6,-14)),('top',(0,20,0)),('side',(-18,.65,0)),('front',(0,.65,-20)),('engine',(-3.4,2.53,-4.2))]
requested_views=next((arg.split('=',1)[1].split(',') for arg in sys.argv if arg.startswith('--views=')),None)
for name,loc in views:
 if requested_views is not None and name not in requested_views:continue
 camera.location=loc;floor.hide_render=name!='beauty';camera.data.ortho_scale=4.7 if name=='engine' else 12.8
 if name=='top':camera.rotation_euler=(-math.pi/2,0,0)
 else:
  forward=(Vector((0,1.53,-1.0) if name=='engine' else (0,.65,0))-camera.location).normalized();right=forward.cross(Vector((0,1,0))).normalized();up=right.cross(forward);camera.rotation_euler=Matrix((right,up,-forward)).transposed().to_euler()
 scene.render.filepath=os.path.join(BASE,'art','aircraft_views',name+'.png');bpy.ops.render.render(write_still=True);print('VIEW_RENDERED',name,flush=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(BASE,'art','aircraft.blend'),compress=True);print('RED_WINGS_REFINED_AIRCRAFT_COMPLETE',flush=True)
