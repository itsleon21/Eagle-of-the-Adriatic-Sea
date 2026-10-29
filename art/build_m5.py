"""Original M5-inspired biplane flying boat from the supplied photograph.
One meter per unit, Y up, -Z forward. Run with Blender --background --python.
All image maps are generated here and embedded in the GLB and .blend.
"""
import bpy,bmesh,math,os
import numpy as np
from mathutils import Vector,Matrix
BASE=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEX=os.path.join(BASE,'art','m5_textures');os.makedirs(TEX,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
root=bpy.data.objects.new('AircraftRoot',None);scene.collection.objects.link(root)
def material(name,color,rough=.5,metal=0,coat=0,alpha=1):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,alpha);m.use_nodes=True;p=m.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;p.inputs['Alpha'].default_value=alpha;p.inputs['Coat Weight'].default_value=coat;p.inputs['Coat Roughness'].default_value=.25
 if alpha<1:m.surface_render_method='BLENDED'
 return m
def image(name,a,color='sRGB'):
 h,w=a.shape[:2];im=bpy.data.images.new(name,width=w,height=h,alpha=True);im.colorspace_settings.name=color;im.pixels.foreach_set(a.astype(np.float32).ravel());im.filepath_raw=os.path.join(TEX,name+'.png');im.file_format='PNG';im.save();im.pack();return im
def texture_material(name,kind,w=1024,h=512):
 u,v=np.meshgrid(np.arange(w)/w,np.arange(h)/h);rng=np.random.default_rng(330 if kind=='hull' else 331)
 grain=(np.sin(v*420+np.sin(u*19)*3)+np.sin(v*840+u*11))*.016 if kind=='hull' else np.sin(u*290)*.004
 noise=rng.normal(0,.002,(h//4,w//4));noise=np.repeat(np.repeat(noise,4,axis=0),4,axis=1)
 du=np.minimum((u*(8 if kind=='hull' else 26))%1,1-(u*(8 if kind=='hull' else 26))%1);seam=np.exp(-(du/.008)**2)
 white=((v>.645)&(v<.855)) if kind=='hull' else np.zeros_like(v,dtype=bool)
 base=np.array([.43,.19,.075]) if kind=='hull' else np.array([.60,.62,.61]);a=np.ones((h,w,4));a[:,:,:3]=base[None,None,:]+grain[:,:,None]+noise[:,:,None];a[white,:3]=np.array([.86,.865,.79]);a[:,:,:3]*=1-seam[:,:,None]*.14
 maps=[image(name+'_color',np.clip(a,0,1))];rough=.42 if kind=='hull' else .74;a[:,:,:3]=np.clip(rough+noise[:,:,None]*2+seam[:,:,None]*.1,.25,.9);maps.append(image(name+'_roughness',a,'Non-Color'))
 height=-seam*.015+grain*.025;gy,gx=np.gradient(height);normal=np.stack([-gx*6,-gy*6,np.ones_like(gx)],axis=-1);normal/=np.linalg.norm(normal,axis=-1,keepdims=True);a[:,:,:3]=normal*.5+.5;maps.append(image(name+'_normal',a,'Non-Color'))
 m=material(name,(.1,.1,.1),rough,0,.32 if kind=='hull' else 0);p=m.node_tree.nodes['Principled BSDF'];links=m.node_tree.links
 for im,target in zip(maps[:2],['Base Color','Roughness']):t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=im;links.new(t.outputs['Color'],p.inputs[target])
 t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=maps[2];n=m.node_tree.nodes.new('ShaderNodeNormalMap');n.inputs['Strength'].default_value=.3;links.new(t.outputs['Color'],n.inputs['Color']);links.new(n.outputs['Normal'],p.inputs['Normal']);return m
hullmat=texture_material('M5 mahogany and white hull','hull')
wingmat=texture_material('M5 light grey fabric','wing',1536,512)
finfabric=material('M5 light grey fin fabric',(.60,.62,.61),.78,0,0)
wood=material('M5 varnished ash struts',(.27,.105,.035),.42,.02,.25)
propwood=material('M5 laminated walnut propeller',(.39,.22,.08),.36,.02,.24)
white=material('M5 aged white enamel',(.83,.85,.77),.5,.03,.08)
green=material('M5 green markings',(.025,.26,.12),.5)
red=material('M5 red markings',(.56,.025,.015),.47)
black=material('M5 cockpit and intake shadow',(.014,.019,.016),.82)
leather=material('M5 saddle leather',(.13,.048,.021),.68)
metal=material('M5 dark engine steel',(.055,.069,.065),.4,.8)
silver=material('M5 brushed alloy',(.39,.45,.43),.35,.8)
brass=material('M5 brass fittings',(.43,.29,.10),.32,.8)
wire=material('M5 fine tension wire',(.12,.15,.14),.34,.75)
glass=material('M5 windscreen glass',(.62,.77,.77),.12,.02,.25,.30)
def finish(o,name,m,parent=root,smooth=True):
 o.name=name;o.parent=parent;o.data.materials.append(m)
 for p in o.data.polygons:p.use_smooth=smooth
 return o
def mesh(name,v,f,m,parent=root,uv=None,wrap=False,smooth=True):
 data=bpy.data.meshes.new(name);data.from_pydata(v,[],f);data.update();o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);finish(o,name,m,parent,smooth)
 bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(data);bm.free()
 if uv:
  layer=data.uv_layers.new(name='UVMap')
  for p in data.polygons:
   values=[uv[data.loops[i].vertex_index] for i in p.loop_indices];cross=wrap and max(t[1] for t in values)-min(t[1] for t in values)>.5
   for li,t in zip(p.loop_indices,values):layer.data[li].uv=(t[0],t[1]+(1 if cross and t[1]<.5 else 0))
 return o
def sphere(name,p,s,m,parent=root,segments=24,rings=12):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=p);o=bpy.context.object;o.scale=s;return finish(o,name,m,parent)
def box(name,p,s,m,parent=root,bevel=.015):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.scale=s;finish(o,name,m,parent,False);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:mod=o.modifiers.new('Edge radius','BEVEL');mod.width=bevel;mod.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 return o
def rod(name,a,b,r,m,parent=root,vertices=12):
 a,b=Vector(a),Vector(b);bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=(b-a).length,location=(a+b)/2);o=bpy.context.object;o.rotation_mode='QUATERNION';o.rotation_quaternion=(b-a).to_track_quat('Z','Y');return finish(o,name,m,parent)
def tube(name,points,r,m,parent=root):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=2;sp=c.splines.new('POLY');sp.points.add(len(points)-1)
 for p,co in zip(sp.points,points):p.co=(*co,1)
 o=bpy.data.objects.new(name,c);scene.collection.objects.link(o);o.parent=parent;c.materials.append(m);bpy.context.view_layer.objects.active=o;bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False);return o
def pivot(name,p):
 o=bpy.data.objects.new(name,None);scene.collection.objects.link(o);o.parent=root;o.location=p;return o
def sampler(rows):
 z=np.array([r[0] for r in rows]);v=np.array([r[1:] for r in rows]);h=np.diff(z);d=np.diff(v,axis=0)/h[:,None];m=np.zeros_like(v);m[0]=d[0];m[-1]=d[-1]
 for i in range(1,len(rows)-1):
  for j in range(v.shape[1]):
   if d[i-1,j]*d[i,j]>0:
    a=2*h[i]+h[i-1];b=h[i]+2*h[i-1];m[i,j]=(a+b)/(a/d[i-1,j]+b/d[i,j])
 def sample(q):
  i=max(0,min(len(rows)-2,int(np.searchsorted(z,q)-1)));t=np.clip((q-z[i])/h[i],0,1)
  return v[i]*(2*t**3-3*t*t+1)+m[i]*h[i]*(t**3-2*t*t+t)+v[i+1]*(-2*t**3+3*t*t)+m[i+1]*h[i]*(t**3-t*t)
 return sample
# A slender polished wooden boat hull: sharp raised prow, broad planing forebody, narrow stern.
rows=[(-4.20,.025,.07,.12,.10),(-4.13,.17,.13,.28,.07),(-3.90,.34,.22,.58,.03),(-3.45,.51,.31,.81,.00),(-2.8,.62,.34,.97,-.01),(-2,.64,.36,1.00,0),(-1,.59,.36,.94,.02),(0,.50,.34,.74,.07),(1,.40,.29,.52,.12),(2,.29,.23,.32,.18),(3,.18,.20,.18,.24),(4.20,.035,.13,.08,.31)]
section=sampler(rows)
def hullpoint(z,a):
 w,top,draft,shoulder=section(z);sn=math.sin(a);c=math.cos(a);draft-=.12 if z>-.2 else 0
 return (w*c,shoulder+top*max(0,sn)**.8 if sn>=0 else shoulder-max(.04,draft)*(1-abs(c))**.85,z)
v=[];uv=[];f=[];stations=np.unique(np.r_[np.linspace(-4.2,4.2,98),-.22,-.20]);nc=64
for i,z in enumerate(stations):
 for j in range(nc):v.append(hullpoint(z,j/nc*math.tau));uv.append((i/(len(stations)-1),j/nc))
for i in range(len(stations)-1):
 for j in range(nc):f.append((i*nc+j,i*nc+(j+1)%nc,(i+1)*nc+(j+1)%nc,(i+1)*nc+j))
f.extend([tuple(reversed(range(nc))),tuple((len(stations)-1)*nc+j for j in range(nc))]);hull=mesh('M5 planing boat hull',v,f,hullmat,uv=uv,wrap=True)
# A real forward cockpit, with unbroken floor above the white outer hull.
hull.data.materials.append(black);cv=[];cf=[]
for y in [-.16,1.2]:
 for j in range(64):a=j/64*math.tau;cv.append((.35*math.cos(a),y,-1.80+.65*math.sin(a)))
for j in range(64):cf.append((j,(j+1)%64,(j+1)%64+64,j+64))
cf.extend([tuple(reversed(range(64))),tuple(64+j for j in range(64))]);cutter=mesh('Cockpit cutter',cv,cf,black)
bpy.context.view_layer.objects.active=hull;mod=hull.modifiers.new('Open forward cockpit','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter;mod.solver='EXACT';bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
for side in [-1,1]:
 tube('Mahogany gunwale',[(side*section(z)[0]*.998,section(z)[3]+.016,z) for z in np.linspace(-4.10,4.1,90)],.018,wood)
 tube('White rubbing rail',[(side*section(z)[0]*.998,section(z)[3]-.045,z) for z in np.linspace(-4.10,4.1,90)],.012,white)
# Cockpit coaming follows the deck curvature, rather than a pasted-on dark ellipse.
rim=[]
for a in np.linspace(0,math.tau,90):
 x=.365*math.cos(a);z=-1.80+.675*math.sin(a);w,top,draft,shoulder=section(z);rim.append((x,shoulder+top*max(0,1-(x/w)**2)**.4+.02,z))
tube('Leather padded cockpit rim',rim,.03,leather)
box('Pilot seat cushion',(0,-.075,-1.52),(.48,.12,.42),leather,bevel=.05);box('Pilot seat back',(0,.23,-1.28),(.50,.61,.105),leather,bevel=.05)
for x in [-.16,-.08,0,.08,.16]:box('Seat pleat',(x,.22,-1.345),(.055,.49,.025),leather,bevel=.01)
for side in [-1,1]:rod('Seat shoulder harness',(side*.15,.48,-1.35),(side*.08,-.01,-1.63),.018,white)
box('Cockpit instrument board',(0,.16,-2.30),(.49,.25,.05),wood,bevel=.025)
for x,r in [(-.14,.048),(0,.066),(.14,.042)]:
 rod('Gauge bezel',(x,.18,-2.26),(x,.18,-2.24),r,brass,vertices=24);rod('Gauge dial',(x,.18,-2.238),(x,.18,-2.233),r*.78,black,vertices=20);rod('Gauge needle',(x-.01,.17,-2.23),(x+.018,.20,-2.23),.0035,white)
rod('Control column',(0,-.10,-1.89),(0,.18,-1.95),.015,metal);rod('Control crossbar',(-.08,.18,-1.95),(.08,.18,-1.95),.017,wood)
v=[];f=[]
for row in range(2):
 for j in range(21):
  a=-math.pi/2+j/20*math.pi;v.append((.31*math.sin(a),.32+row*.31*math.cos(a),-2.39-.12*math.cos(a)+row*.07))
for j in range(20):f.append((j,j+1,j+22,j+21))
mesh('Small curved windscreen',v,f,glass);tube('Windscreen upper frame',v[21:],.009,silver);tube('Windscreen bottom frame',v[:21],.009,silver)
# Cambered fabric airfoils, with shaped rounded tips and separate ailerons.
def wingpoint(x,xi,sign,span,chord,y,z):
 t=abs(x)/(span/2);tip=math.sqrt(max(.0002,1-max(0,(t-.90)/.10)**2));c=chord*(1-.08*t)*tip;lead=z-.5*c+.10*t*t
 thick=5*.105*c*(.2969*math.sqrt(max(0,xi))-.126*xi-.3516*xi**2+.2843*xi**3-.1015*xi**4)
 rib=math.cos(x*math.tau/.43)**8
 return (x,y+.032*t*t+.024*c*math.sin(math.pi*xi)+sign*(thick+.0035*rib*math.sin(math.pi*xi)),lead+xi*c)
def wing(name,xa,xb,span,chord,y,z,part=(0,1),parent=root,origin=(0,0,0),m=wingmat):
 n=max(4,int((xb-xa)*7));cross=[(part[0]+(part[1]-part[0])*(.5-.5*math.cos(j/20*math.pi)),1) for j in range(21)]+[(part[0]+(part[1]-part[0])*(.5+.5*math.cos(j/20*math.pi)),-1) for j in range(21)];v=[];uv=[];f=[];nc=len(cross)
 for i in range(n+1):
  x=xa+(xb-xa)*i/n
  for xi,sign in cross:p=wingpoint(x,xi,sign,span,chord,y,z);v.append(tuple(p[k]-origin[k] for k in range(3)));uv.append((x/span+.5,xi))
 for i in range(n):
  for j in range(nc):f.append((i*nc+j,i*nc+(j+1)%nc,(i+1)*nc+(j+1)%nc,(i+1)*nc+j))
 for ring in [0,n]:
  start=len(v);v.extend([v[ring*nc+j] for j in range(nc)]);uv.extend([uv[ring*nc+j] for j in range(nc)]);indices=list(range(start,start+nc));f.append(tuple(reversed(indices)) if ring==0 else tuple(indices))
 o=mesh(name,v,f,m,parent,uv);o.data.polygons[-1].use_smooth=False;o.data.polygons[-2].use_smooth=False;return o
# The upper wing projects well beyond the lower one, matching the supplied photograph.
for a,b,part in [(-5.95,-5.55,(0,1)),(-5.55,-2.70,(0,.74)),(-2.70,2.70,(0,1)),(2.70,5.55,(0,.74)),(5.55,5.95,(0,1))]:wing('M5 upper wing',a,b,11.9,1.72,2.32,-.30,part)
for side in [-1,1]:
 a,b=(-5.52,-2.72) if side<0 else (2.72,5.52);origin=wingpoint((a+b)/2,.748,0,11.9,1.72,2.32,-.30);aileron=pivot('LeftAileron' if side<0 else 'RightAileron',origin);wing('Upper aileron',a,b,11.9,1.72,2.32,-.30,(.755,.997),aileron,origin)
wing('M5 lower wing',-4.25,4.25,8.5,1.48,.39,.13)
# Staggered wooden interplane V-struts and thin cross-bracing.
for side in [-1,1]:
 for z in [-.77,.47]:
  rod('Inner cabane support',(side*.42,.40,max(-.45,z)),(side*.78,2.28,z-.12),.036,wood)
  rod('Outer interplane support',(side*3.10,.42,max(-.40,z+.13)),(side*3.52,2.32,z-.15),.037,wood)
 rod('Outer V diagonal',(side*3.10,.42,.60),(side*3.52,2.32,-.92),.032,wood)
 rod('Cabane diagonal',(side*.44,.38,-.45),(side*.78,2.28,.36),.025,wood)
 rod('Flying wire',(side*.72,.41,-.40),(side*3.50,2.31,.30),.0065,wire)
 rod('Landing wire',(side*3.10,.42,.58),(side*.80,2.28,-.79),.0065,wire)
 rod('Interplane X wire',(side*3.12,.42,-.40),(side*3.50,2.30,.32),.006,wire)
 # Small stabilizing floats, above the main keel and tucked beneath the lower wing.
 frows=[(-1.0,.025,.05),(-.88,.12,.13),(-.55,.18,.19),(.05,.16,.17),(.52,.035,.07)];fs=sampler(frows);fv=[];ff=[];fu=[];ns=24;nc=32
 for i,z in enumerate(np.linspace(-1,.52,ns)):
  w,h=fs(z)
  for j in range(nc):a=j/nc*math.tau;fv.append((side*3.55+w*math.cos(a),-.35+h*math.sin(a),z));fu.append((i/(ns-1),j/nc))
 for i in range(ns-1):
  for j in range(nc):ff.append((i*nc+j,i*nc+(j+1)%nc,(i+1)*nc+(j+1)%nc,(i+1)*nc+j))
 ff.extend([tuple(reversed(range(nc))),tuple((ns-1)*nc+j for j in range(nc))]);mesh('Small wing float',fv,ff,hullmat,uv=fu,wrap=True)
 for z in [-.40,.21]:rod('Float suspension',(side*3.55,.42,z),(side*3.55,-.20,z),.019,wood)
# Exposed inline engine with cooling fins, plumbing and a rectangular front radiator.
box('Inline crankcase',(0,1.15,.05),(.47,.35,.96),metal,bevel=.07)
for i,z in enumerate(np.linspace(-.35,.42,6)):
 rod('Engine cylinder',(0,1.21,z),(0,1.72,z),.095,metal,vertices=18)
 for y in [1.34,1.40,1.46,1.52,1.58]:rod('Cylinder cooling fin',(0,y-.009,z),(0,y+.009,z),.119,silver,vertices=18)
 sphere('Rocker cover',(0,1.73,z),(.105,.075,.10),metal)
 rod('Plug cable',(.085,1.58,z),(.20,1.12,z+.015),.009,black)
 for side in [-1,1]:rod('Pushrod',(side*.06,1.17,z),(side*.065,1.66,z),.012,metal)
for side in [-1,1]:
 tube('Copper coolant pipe',[(side*.18,1.66,-.39),(side*.27,1.73,-.51),(side*.28,1.55,-.66),(side*.25,1.05,-.66)],.023,brass)
 tube('Exhaust collector',[(side*.13,1.62,z) for z in np.linspace(-.40,.62,15)]+[(side*.22,1.56,.80)],.039,metal)
 for z in [-.42,.47]:rod('Engine mounting leg',(side*.43,.36,z),(side*.26,1.03,z),.035,wood)
box('Radiator frame',(0,1.47,-.67),(.59,.91,.13),silver,bevel=.045)
box('Radiator dark core',(0,1.47,-.745),(.47,.78,.035),black,bevel=.02)
for x in np.linspace(-.20,.20,15):rod('Radiator fin',(x,1.13,-.770),(x,1.81,-.770),.006,silver,vertices=6)
for y in np.linspace(1.16,1.78,9):rod('Radiator cross fin',(-.215,y,-.777),(.215,y,-.777),.003,metal,vertices=6)
rod('Drive shaft',(0,1.37,.44),(0,1.37,1.13),.075,silver,vertices=24)
prop=pivot('PropellerPivot',(0,1.37,1.16));prop['direction']='pusher; +Z'
for side in [-1,1]:
 v=[];f=[];uv=[];stations=[(.08,.05),(.22,.10),(.45,.135),(.68,.115),(.87,.06),(.94,.009)];nc=24
 for i,(r,w) in enumerate(stations):
  twist=-.26*(1-r/.94)-.06
  for j in range(nc):a=j/nc*math.tau;yy=w*math.sin(a);zz=.025*math.cos(a);v.append((side*r,side*(yy*math.cos(twist)-zz*math.sin(twist)),yy*math.sin(twist)+zz*math.cos(twist)));uv.append((i/(len(stations)-1),j/nc))
 for i in range(len(stations)-1):
  for j in range(nc):f.append((i*nc+j,i*nc+(j+1)%nc,(i+1)*nc+(j+1)%nc,(i+1)*nc+j))
 f.extend([tuple(reversed(range(nc))),tuple((len(stations)-1)*nc+j for j in range(nc))]);mesh('Pusher wooden blade',v,f,propwood,prop,uv,True)
sphere('Pusher hub',(0,0,.035),(.125,.125,.09),brass,prop)
rod('Pusher retaining bolt',(0,0,.08),(0,0,.135),.052,silver,prop,8)
# Compact curved tail, with a physically separate elevator and rudder.
wing('Tailplane',-1.43,1.43,2.86,1.15,.67,3.20,(0,.72));origin=(0,.67,3.46);elevator=pivot('Elevator',origin);wing('Elevator surface',-1.39,1.39,2.86,1.15,.67,3.20,(.738,.998),elevator,origin)
control=[(.36,2.58),(.75,2.85),(1.30,3.10),(1.64,3.42),(1.60,3.72),(1.27,3.96),(.44,4.10),(.31,3.87)]
outline=[]
for i in range(len(control)):
 p0=np.array(control[(i-1)%len(control)]);p1=np.array(control[i]);p2=np.array(control[(i+1)%len(control)]);p3=np.array(control[(i+2)%len(control)])
 for t in np.linspace(0,1,8,endpoint=False):outline.append(tuple(.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t)))
def clip(poly,bound,front):
 out=[]
 for a,b in zip(poly,poly[1:]+poly[:1]):
  ai=a[1]<=bound if front else a[1]>=bound;bi=b[1]<=bound if front else b[1]>=bound
  if ai:out.append(a)
  if ai!=bi:t=(bound-a[1])/(b[1]-a[1]);out.append((a[0]+(b[0]-a[0])*t,bound))
 return out
def fin(name,poly,parent=root,origin=(0,0,0)):
 n=len(poly);v=[(x-origin[0],y-origin[1],z-origin[2]) for x in [-.037,.037] for y,z in poly];f=[tuple(reversed(range(n))),tuple(n+j for j in range(n))]
 for i in range(n):f.append((i,(i+1)%n,(i+1)%n+n,i+n))
 o=mesh(name,v,f,finfabric,parent,smooth=False)
 bpy.context.view_layer.objects.active=o;bevel=o.modifiers.new('Rounded fabric fin edges','BEVEL');bevel.width=.014;bevel.segments=2;bpy.ops.object.modifier_apply(modifier=bevel.name);return o
fin('M5 green fin',clip(outline,3.25,True));fin('M5 white fin',clip(clip(outline,3.25,False),3.60,True));fin('M5 red fin',clip(clip(outline,3.60,False),3.65,True));rudder=pivot('Rudder',(0,.37,3.66));fin('M5 rudder',clip(outline,3.675,False),rudder,(0,.37,3.66))
# Painted roundels conform to the mahogany side rather than floating on flat discs.
for side in [-1,1]:
 def side_surface(y,z):
  w,top,draft,shoulder=section(z);draft-=.12 if z>-.2 else 0
  if y>=shoulder:return w*math.sqrt(max(0,1-((y-shoulder)/top)**(2/.8)))
  return w*max(0,1-((shoulder-y)/max(.04,draft))**(1/.85))
 verts=[];faces=[];mi=[];cz=-2.86;cy=-.03;ns=64
 for r in [.001,.052,.075,.150,.20]:
  for j in range(ns):
   a=j/ns*math.tau;y=cy+r*math.sin(a);z=cz+r*math.cos(a);verts.append((side*(side_surface(y,z)+.005),y,z))
 for ring in range(4):
  for j in range(ns):faces.append((ring*ns+j,ring*ns+(j+1)%ns,(ring+1)*ns+(j+1)%ns,(ring+1)*ns+j));mi.append([2,0,1,0][ring])
 badge=mesh('Painted national roundel',verts,faces,white);badge.data.materials.append(green);badge.data.materials.append(red)
 for face,index in zip(badge.data.polygons,mi):face.material_index=index
 # Individual characters follow the tapered side, keeping all lettering outside the skin.
 for i,char in enumerate('M5 09'):
  z=1.45+i*.12;w,top,draft,shoulder=section(z);y=shoulder+.065
  bpy.ops.object.text_add(location=(side*(side_surface(y,z)+.007),y,z));o=bpy.context.object;o.data.body=char;o.data.align_x='CENTER';o.data.align_y='CENTER';o.data.size=.13;o.data.extrude=.0005;o.rotation_euler=Matrix(((0,0,-side),(0,1,0),(side,0,0))).transposed().to_euler();o.parent=root;o.data.materials.append(white);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');o.name='M5 side designation'
# Docking fixtures, cockpit controls and exposed fasteners use solid geometry.
for z in [-3.22,-2.98]:
 y=hullpoint(z,math.pi/2)[1]
 rod('Mahogany deck filler collar',(0,y+.005,z),(0,y+.025,z),.075,brass,vertices=24)
 rod('Filler cap',(0,y+.027,z),(0,y+.043,z),.053,silver,vertices=20)
for side in [-1,1]:
 for z in [-3.15,-2.75,-.8,.4,1.2,2.0]:
  w,top,draft,shoulder=section(z)
  rod('Gunwale bronze fastener',(side*w*.994,shoulder+.016,z),(side*(w+.014),shoulder+.016,z),.014,brass,vertices=8)
 x,y,z=hullpoint(2.45,.65 if side>0 else math.pi-.65)
 rod('Dock cleat stem',(x,y,z),(x,y+.055,z),.019,brass)
 rod('Dock cleat bar',(x,y+.055,z-.08),(x,y+.055,z+.08),.013,brass)
 for z in [-.42,.47]:
  rod('Engine bearer attachment bolt',(side*.25,1.03,z),(side*.29,1.03,z),.034,silver,vertices=8)
# Hand throttle and a grip distinct from the surrounding varnished structure.
rod('Cockpit throttle lever',(-.23,.06,-1.65),(-.23,.21,-1.72),.013,metal)
sphere('Throttle leather grip',(-.23,.22,-1.72),(.025,.038,.025),leather)
y=hullpoint(-3.85,math.pi/2)[1]
tube('Bow mooring eye',[(.052*math.cos(a),y+.04+.04*math.sin(a),-3.85) for a in np.linspace(0,math.tau,25)],.010,brass)
root['detail_revision']='v019 ribbed fabric, mahogany grain, dock fittings and engine fasteners'
# Join stationary meshes only, retaining independent animation nodes.
static=[o for o in list(scene.objects) if o.type=='MESH' and o.parent==root];bpy.ops.object.select_all(action='DESELECT')
for o in static:o.select_set(True)
bpy.context.view_layer.objects.active=hull;bpy.ops.object.join();hull.name='AircraftBody'
for o in list(scene.objects):
 if o.type=='MESH':
  bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
root['design']='Olive biplane flying boat, varnished wooden hull, exposed inline pusher engine';root['units']='meters; Y up; -Z forward';root['span_m']=11.9;root['length_m']=8.4
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
 if o.type in {'MESH','EMPTY'}:o.select_set(True)
os.makedirs(os.path.join(BASE,'public','models'),exist_ok=True)
import sys
sys.path.insert(0,os.path.join(BASE,'art'))
from bake_aircraft_ao import bake_aircraft_ao, export_with_ao
bake_aircraft_ao(root)
export_with_ao(root,os.path.join(BASE,'public','models','m5.glb'))
print('M5_GLB_EXPORTED',flush=True)
# Studio views render the same exported model from all principal directions.
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.render.resolution_x=1280;scene.render.resolution_y=960;scene.render.resolution_percentage=100
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.6,.67,.73,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.55
scene.view_settings.view_transform='AgX';scene.view_settings.exposure=-.55
focus=Vector((0,.73,0))
def area(name,p,power,size):
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=p;o.rotation_euler=(focus-o.location).to_track_quat('-Z','Y').to_euler()
area('M5 warm key',(-5,8,-8),2300,5);area('M5 soft fill',(6,5,-2),1000,6);area('M5 rim',(3,7,6),1800,5)
floor=box('Studio floor',(0,-1.09,0),(200,.04,200),material('M5 studio floor',(.66,.69,.70),.9),parent=None,bevel=0)
bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO';camera.data.ortho_scale=13.3
os.makedirs(os.path.join(BASE,'art','m5_views'),exist_ok=True)
for name,loc in [('beauty',(-11,6.5,-13)),('side',(-20,.73,0)),('top',(0,20,0)),('front',(0,.73,-20))]:
 camera.location=loc;floor.hide_render=name!='beauty'
 if name=='top':camera.rotation_euler=(-math.pi/2,0,0)
 else:
  forward=(focus-camera.location).normalized();right=forward.cross(Vector((0,1,0))).normalized();up=right.cross(forward);camera.rotation_euler=Matrix((right,up,-forward)).transposed().to_euler()
 scene.render.filepath=os.path.join(BASE,'art','m5_views',name+'.png');bpy.ops.render.render(write_still=True);print('M5_VIEW_RENDERED',name,flush=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(BASE,'art','m5.blend'),compress=True);print('M5_ASSET_COMPLETE',flush=True)
