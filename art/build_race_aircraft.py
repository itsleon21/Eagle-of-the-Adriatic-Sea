"""Reference reconstruction v2: separate silhouettes, manufactured skins, hard-chine floats.
Metres, Y up, -Z forward. Original models; reference photos are not distributed.
"""
import bpy,bmesh,math,os,sys
import numpy as np
from mathutils import Vector,Matrix
BASE=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0,os.path.join(BASE,'art'))
from bake_aircraft_ao import bake_aircraft_ao,export_with_ao
CONFIGS=[dict(id='s6',span=9.14,length=7.87,fs=1.32,blades=2,color=(.015,.065,.20),tail=1.88,cp=1.03,fl=6.65),dict(id='gloster6',span=7.92,length=8.23,fs=1.16,blades=2,color=(.44,.235,.055),tail=1.45,cp=.94,fl=6.35),dict(id='m67',span=9.98,length=7.65,fs=1.4,blades=3,color=(.48,.012,.008),tail=1.60,cp=.93,fl=6.40)]
for C in CONFIGS:
 ident=C['id'];span=C['span'];length=C['length'];fs=C['fs'];cp=C['cp'];blades=C['blades']
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 root=bpy.data.objects.new('AircraftRoot',None);bpy.context.collection.objects.link(root)
 def material(name,c,rough=.36,metal=0,coat=.25):
  m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;p.inputs['Coat Weight'].default_value=coat;p.inputs['Coat Roughness'].default_value=.21;return m
 paint=material(ident+' enamel',C['color'],.31,0,.45);alloy=material('Brushed duralumin alloy',(.49,.52,.53),.34,.82);copper=material('Burnished copper brass radiator',(.35,.20,.067),.34,.80);steel=material('Dark steel wire',(.025,.030,.028),.46,.72);white=material('Ivory enamel',(.83,.81,.74),.37,0,.3);red=material('British red enamel',(.48,.018,.015),.36);blue=material('British blue enamel',(.018,.05,.14),.36);green=material('Italian green enamel',(.015,.20,.056),.39);dark=material('Cockpit dark leather',(.024,.023,.019),.84);leather=material('Seat leather',(.14,.055,.023),.7);radiator=material('S6 dark blue surface radiator',(.016,.04,.095),.43,.64)
 def texture(name,data,space='Non-Color'):
  h,w=data.shape[:2];im=bpy.data.images.new(ident+'_'+name,width=w,height=h,alpha=True);im.colorspace_settings.name=space;im.pixels.foreach_set(data.astype(np.float32).ravel());im.pack();return im
 # Mip-filterable roughness/normal maps replace scattered geometric micro-rivets.
 w,h=2048,512;u,v=np.meshgrid(np.arange(w)/w,np.arange(h)/h);seam=np.exp(-(np.minimum(u*10%1,1-u*10%1)/.009)**2);riv=seam*np.exp(-(np.minimum(v*48%1,1-v*48%1)/.13)**2)
 a=np.ones((h,w,4));a[:,:,:3]=np.array(C['color'])[None,None,:]**(1/2.2);a[:,:,:3]*=(1-.06*seam-.08*riv)[:,:,None];node=paint.node_tree.nodes.new('ShaderNodeTexImage');node.image=texture('paint',a,'sRGB');paint.node_tree.links.new(node.outputs['Color'],paint.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
 a[:,:,:3]=(.29+.045*seam+.018*np.sin(u*math.tau*3)*np.cos(v*math.tau*2))[:,:,None];node=paint.node_tree.nodes.new('ShaderNodeTexImage');node.image=texture('paint_roughness',a);paint.node_tree.links.new(node.outputs['Color'],paint.node_tree.nodes['Principled BSDF'].inputs['Roughness'])
 if ident=='gloster6':
  paint.name='Gloster golden metallic skin';paint.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value=.42
 for m in [copper,alloy,radiator]:
  a[:,:,:3]=(.34+.035*np.cos(v*math.tau*140)+.012*np.sin(u*math.tau*9))[:,:,None];node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=texture(m.name+'_grain',a);m.node_tree.links.new(node.outputs['Color'],m.node_tree.nodes['Principled BSDF'].inputs['Roughness'])
 def mesh(name,verts,faces,m,mats=None,indices=None,uvs=None,parent=None,smooth=True):
  d=bpy.data.meshes.new(name);d.from_pydata(verts,[],faces);d.update();o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.parent=parent or root;d.materials.append(m)
  for ma in mats or []:d.materials.append(ma)
  for p in d.polygons:p.use_smooth=smooth
  if indices:
   for p,i in zip(d.polygons,indices):p.material_index=i
  bm=bmesh.new();bm.from_mesh(d);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(d);bm.free()
  uv=d.uv_layers.new(name='UVMap')
  for p in d.polygons:
   for li in p.loop_indices:
    vi=d.loops[li].vertex_index;q=d.vertices[vi].co;uv.data[li].uv=uvs[vi] if uvs else (q.z/length+.5,math.atan2(q.x,q.y)/math.tau+.5)
  return o
 def ell(name,p,s,m,parent=None):
  bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=p);o=bpy.context.object;o.name=name;o.parent=parent or root;o.scale=s;o.data.materials.append(m)
  for f in o.data.polygons:f.use_smooth=True
  return o
 def box(name,p,s,m,parent=None):
  bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=name;o.parent=parent or root;o.scale=s;o.data.materials.append(m);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);mod=o.modifiers.new('Machined edge radius','BEVEL');mod.width=.008;mod.segments=2;return o
 def rod(name,a,b,r,m):
  d=Vector(b)-Vector(a);bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=r,depth=d.length,location=(Vector(a)+Vector(b))/2);o=bpy.context.object;o.name=name;o.parent=root;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.data.materials.append(m)
  for p in o.data.polygons:p.use_smooth=True
  return o
 def spline(stations,z):
  k=next((i for i in range(len(stations)-1) if stations[i+1][0]>=z),len(stations)-2);k=max(0,k);a,b=stations[k],stations[k+1];before=stations[max(0,k-1)];after=stations[min(len(stations)-1,k+2)];D=b[0]-a[0];t=max(0,min(1,(z-a[0])/D));out=[]
  for j in range(1,len(a)):
   m0=(b[j]-before[j])/(b[0]-before[0]);m1=(after[j]-a[j])/(after[0]-a[0]);out.append((2*t**3-3*t*t+1)*a[j]+(t**3-2*t*t+t)*D*m0+(-2*t**3+3*t*t)*b[j]+(t**3-t*t)*D*m1)
  return out
 # Independent measured station sets: z, vertical centre, half breadth, half depth.
 stations=([(-3.55,.42,.28,.31),(-3.17,.39,.39,.43),(-2.10,.32,.43,.48),(-.90,.27,.40,.43),(.25,.25,.34,.38),(.85,.27,.30,.34),(1.65,.29,.25,.29),(2.70,.30,.15,.20),(3.93,.31,.014,.055)] if ident=='s6' else [(-3.72,.34,.27,.30),(-3.20,.32,.40,.39),(-2.15,.28,.43,.42),(-.8,.25,.37,.37),(.25,.25,.30,.32),(.90,.27,.26,.29),(1.6,.28,.22,.24),(2.8,.29,.13,.17),(4.115,.30,.014,.05)] if ident=='gloster6' else [(-3.46,.40,.34,.38),(-3.08,.34,.49,.51),(-1.8,.28,.52,.54),(-.65,.25,.43,.45),(.35,.25,.33,.35),(1.0,.27,.28,.30),(1.75,.29,.23,.25),(2.65,.30,.14,.18),(3.825,.31,.014,.05)])
 def skin(z,a):
  cy,bw,bh=spline(stations,z);q=(z-stations[0][0])/(stations[-1][0]-stations[0][0]);amp=(.048 if ident=='s6' else .065 if ident=='gloster6' else .08)*max(0,1-q/.54)
  banks=[.70,math.tau-.70] if ident=='s6' else [0,2.12,4.16];bump=sum(math.exp(-(math.atan2(math.sin(a-b),math.cos(a-b))/.36)**2) for b in banks)*amp
  return (math.sin(a)*(bw+bump),cy+math.cos(a)*(bh+bump),z)
 verts=[];uv=[];faces=[];mi=[];rings=144;n=80;zmin=stations[0][0];zmax=stations[-1][0]
 for j in range(rings+1):
  z=zmin+(zmax-zmin)*j/rings
  for i in range(n):verts.append(skin(z,i/n*math.tau));uv.append((j/rings,i/n))
 for j in range(rings):
  z=zmin+(zmax-zmin)*(j+.5)/rings
  for i in range(n):
   a=(i+.5)/n*math.tau;x,y,_=skin(z,a)
   if ((z-cp)/.43)**2+(x/.23)**2<1 and math.cos(a)>.5:continue
   faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i));index=0
   if ident=='s6':
    if z<-.35 and y>.35 or z<2.8 and math.cos(a)>.90:index=1
    elif -2.75<z<1.7 and -.10<y<.28 and abs(math.sin(a))>.65:index=2
   elif ident=='m67' and -2.9<z<-.72 and math.cos(a)<-.45:index=2
   mi.append(index)
 faces.extend([tuple(range(n-1,-1,-1)),tuple(rings*n+i for i in range(n))]);mi.extend([1 if ident=='s6' else 0,0])
 bodyMaterial=paint
 if ident=='s6':
  # Continuous texture masks keep the silver/blue paint boundary straight, rather than stair-stepped by faces.
  Z=zmin+u*(zmax-zmin);stationsUV=np.array([spline(stations,z) for z in Z[0]]);Y=stationsUV[:,0][None,:]+stationsUV[:,2][None,:]*np.cos(v*math.tau)
  top=np.clip((Y-.345)/.010,0,1)*np.clip((-.35-Z)/.012,0,1);aft=np.clip((np.cos(v*math.tau)-.89)/.02,0,1)*np.clip((2.8-Z)/.012,0,1);mask=np.maximum(top,aft)
  stripe=(1-.05*np.cos(v*math.tau*85));base=np.zeros((h,w,3))+np.array(C['color'])[None,None,:]**(1/2.2);base*=stripe[:,:,None];base=base*(1-mask[:,:,None])+np.array([.71,.74,.76])[None,None,:]*mask[:,:,None]
  # The broad blue side radiator has fine horizontal cooling tubes, visible at inspection distance.
  band=np.clip((Y+.11)/.012,0,1)*np.clip((.285-Y)/.012,0,1)*np.clip((Z+2.85)/.018,0,1)*np.clip((1.60-Z)/.018,0,1)*(1-mask)
  ribs=(.5+.5*np.cos(Y*math.tau/.022))**5;cooling=np.array([.10,.16,.26])[None,None,:]*(1-.24*ribs[:,:,None])
  base=base*(1-band[:,:,None])+cooling*band[:,:,None]
  bodyMaterial=paint.copy();bodyMaterial.name='S6 mixed manufactured skin';rgba=np.ones((h,w,4));rgba[:,:,:3]=base*(1-.035*seam)[:,:,None];im=texture('silver_blue_skin',rgba,'sRGB')
  bsdf=bodyMaterial.node_tree.nodes['Principled BSDF']
  for link in list(bodyMaterial.node_tree.links):
   if link.to_node==bsdf and link.to_socket.name in ['Base Color','Roughness']:bodyMaterial.node_tree.links.remove(link)
  for name,channel in [('Base Color',im),('Roughness',None),('Metallic',None)]:
   if name!='Base Color':
    rgba[:,:,:3]=((.32+.025*seam) if name=='Roughness' else .82*mask)[:,:,None];channel=texture('skin_'+name,rgba)
   node=bodyMaterial.node_tree.nodes.new('ShaderNodeTexImage');node.image=channel;bodyMaterial.node_tree.links.new(node.outputs['Color'],bsdf.inputs[name])
  mi=[0]*len(faces)
 body=mesh('Reference loft fuselage '+ident,verts,faces,bodyMaterial,[alloy,radiator if ident=='s6' else copper],mi,uv)
 # Cockpit rim follows the actual fuselage skin. Seat stays below the coaming.
 for i in range(64):
  a=i/64*math.tau;b=(i+1)/64*math.tau;p=[]
  for t in [a,b]:
   x=.23*math.sin(t);z=cp+.43*math.cos(t);cy,bw,bh=spline(stations,z);y=cy+bh*math.sqrt(max(0,1-(x/bw)**2))+.012;p.append((x,y,z))
  rod('Leather cockpit coaming',p[0],p[1],.018,leather)
 box('Recessed cockpit tub',(0,.36,cp),(.40,.10,.64),dark);box('Seat cushion',(0,.42,cp+.10),(.32,.08,.32),leather);box('Seat back below rim',(0,.49,cp+.28),(.32,.22,.06),leather);box('Instrument panel',(0,.53,cp-.29),(.40,.20,.05),dark)
 for x in [-.12,0,.12]:ell('Instrument dial',(x,.55,cp-.325),(.04,.04,.01),alloy)
 glass=material('Windscreen glass',(.43,.60,.63),.12,0,.35);glass.diffuse_color=(.43,.60,.63,.25);glass.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value=.25;glass.surface_render_method='BLENDED'
 vv=[(-.22,.65,cp-.42),(0,.68,cp-.48),(.22,.65,cp-.42),(-.18,.85,cp-.33),(0,.90,cp-.37),(.18,.85,cp-.33)];mesh('Three-pane low windscreen',vv,[(0,1,4,3),(1,2,5,4)],glass,smooth=False)
 for i,j in [(0,3),(1,4),(2,5),(3,4),(4,5)]:rod('Windscreen frame',vv[i],vv[j],.008,alloy)
 glosterWing=material('Gloster ochre wing panels',(.67,.44,.15),.40,.22,.20)
 if ident=='gloster6':
  ribs=np.exp(-(np.minimum(u*14%1,1-u*14%1)/.038)**2);edge=np.exp(-(np.minimum(v,1-v)/.035)**2);rgba=np.ones((h,w,4));rgba[:,:,:3]=np.array([.85,.71,.43])[None,None,:]*(1-.12*ribs-.06*edge)[:,:,None]
  node=glosterWing.node_tree.nodes.new('ShaderNodeTexImage');node.image=texture('ochre_wing_ribs',rgba,'sRGB');glosterWing.node_tree.links.new(node.outputs['Color'],glosterWing.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
 # NACA-shaped wing, sharp trailing edge, rounded tips; distinct planform for each aircraft.
 def wing(name,half,tail=False):
  vv=[];ff=[];ii=[];uvs=[];patch={-1:[],1:[]};steps=48;around=40;LE=-1.47 if ident!='gloster6' else -1.32
  for side in [-1,1]:
   start=len(vv)
   for j in range(steps+1):
    t=j/steps
    if tail:chord=.86*(1-.20*t);leading=C['length']*.355+.14*t;yy=.32
    else:
     chord=(1.72-.38*t if ident=='s6' else 1.44+.24*math.sin(math.pi*t)-.17*t if ident=='gloster6' else 1.70-.36*t);leading=LE+(.04 if ident=='s6' else -.015 if ident=='gloster6' else .15)*t;yy=.015+.04*t
    rounding=math.sqrt(max(.00008,1-(max(0,t-.80)/.20)**2));leading+=chord*(1-rounding)*.5;chord*=rounding
    for k in range(around):
     angle=k/around*math.tau;u=(1-math.cos(angle))/2;th=5*(.065 if tail else .085)*(.2969*math.sqrt(u)-.1260*u-.3516*u*u+.2843*u**3-.1036*u**4);th*=1 if math.sin(angle)>=0 else -1;vv.append((side*half*t,yy+chord*(th+.012*math.sin(math.pi*u)),leading+chord*u));uvs.append((t,u))
   for j in range(steps):
    for k in range(around):
     face=(start+j*around+k,start+j*around+(k+1)%around,start+(j+1)*around+(k+1)%around,start+(j+1)*around+k)
     if ((not tail and 27<=j<45) or (tail and j<46)) and 14<=k<26:patch[side].append(face);continue
     ff.append(face);ii.append(1 if not tail and 5<j<43 and 5<=k<35 else 0)
   ff.append(tuple(start+steps*around+k for k in range(around)));ii.append(0)
  base=alloy if ident=='s6' else paint;mesh(name,vv,ff,base,[alloy if ident=='s6' else glosterWing if ident=='gloster6' else copper],ii,uvs)
  if not tail:
   for side in [-1,1]:
    fs0=patch[side];used=sorted(set(i for f in fs0 for i in f));center=Vector((side*half*.74,.04,LE+1.1));pivot=bpy.data.objects.new('LeftAileron' if side<0 else 'RightAileron',None);bpy.context.collection.objects.link(pivot);pivot.parent=root;pivot.location=center;mapping={i:k for k,i in enumerate(used)};local=[tuple((Vector(vv[i])-center)*.996) for i in used];mesh('Fitted trailing-edge aileron',local,[tuple(mapping[i] for i in f) for f in fs0],base,parent=pivot)
  else:
   faces=patch[-1]+patch[1];used=sorted(set(i for f in faces for i in f));center=Vector((0,.32,C['length']*.43));pivot=bpy.data.objects.new('Elevator',None);bpy.context.collection.objects.link(pivot);pivot.parent=root;pivot.location=center;mapping={i:k for k,i in enumerate(used)};mesh('Fitted tailplane elevator', [tuple((Vector(vv[i])-center)*.996) for i in used], [tuple(mapping[i] for i in f) for f in faces],base,parent=pivot)
  return
 wing('Reference racing wing '+ident,span/2);wing('Rounded tailplane',1.46 if ident!='gloster6' else 1.32,True)
 # Curved dorsal fin: a sampled Bezier contour, not an upright oval or pointed polygon.
 zt=length*.40;H=C['tail'];points=[(zt-.78,.30),(zt-.37,.40),(zt-.16,H*.82),(zt+.12,H),(zt+.49,H*.95),(zt+.56,.62),(zt+.53,.31)]
 contour=[]
 for i in range(len(points)):
  a=Vector(points[(i-1)%len(points)]);b=Vector(points[i]);c=Vector(points[(i+1)%len(points)]);d=Vector(points[(i+2)%len(points)])
  for k in range(8):
   t=k/8;v=.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);contour.append((v.x,v.y))
 def clipped(poly,cut,back):
  out=[]
  for i,p in enumerate(poly):
   q=poly[(i+1)%len(poly)];inside=p[0]>=cut if back else p[0]<=cut;other=q[0]>=cut if back else q[0]<=cut
   if inside:out.append(p)
   if inside!=other:
    t=(cut-p[0])/(q[0]-p[0]);out.append((cut,p[1]+(q[1]-p[1])*t))
  return out
 def finpart(name,poly,parent=None,origin=Vector((0,0,0))):
  fv=[tuple(Vector((side*.035,y,z))-origin) for side in [-1,1] for z,y in poly];N=len(poly);faces=[tuple(range(N-1,-1,-1)),tuple(N+i for i in range(N))]+[(i,(i+1)%N,(i+1)%N+N,i+N) for i in range(N)];o=mesh(name,fv,faces,paint,parent=parent,smooth=False);mod=o.modifiers.new('Rounded tail edge','BEVEL');mod.width=.018;mod.segments=3
 finpart('Curved dorsal fin',clipped(contour,zt+.19,False))
 rudderOrigin=Vector((0,.80,zt+.20));rudder=bpy.data.objects.new('Rudder',None);bpy.context.collection.objects.link(rudder);rudder.parent=root;rudder.location=rudderOrigin;finpart('Curved hinged rudder',clipped(contour,zt+.205,True),rudder,rudderOrigin)
 # Fuel floats: station-based hard chine, distinct sheer and V keel; coloured lower skins are actual faces.
 fl=C['fl'];floatStations=[(0,.012,-1.23,.04),(.06,.17,-1.28,.40),(.20,.32,-1.31,.55),(.42,.36,-1.32,.55),(.57,.35,-1.32,.53),(.59,.33,-1.24,.46),(.80,.23,-1.28,.34),(.96,.095,-1.30,.18),(1,.008,-1.29,.025)]
 for side in [-1,1]:
  vv=[];ff=[];ii=[];uv=[];rows=96;section=[(-1,0),(-.94,.13),(-.65,.24),(0,.28),(.65,.24),(.94,.13),(1,0),(.86,-.22),(0,-.96),(-.86,-.22)];nsec=len(section)
  for j in range(rows+1):
   t=j/rows;bw,cy,deep=spline(floatStations,t);z=(t-.52)*fl;top=-1.16+.075*max(0,1-t/.17);cy=top-.28*deep
   for k,(xx,yy) in enumerate(section):vv.append((side*fs+xx*bw,cy+yy*deep+(.08*(1-abs(xx)) if t>=.58 and k>=7 else 0),z));uv.append((t,k/nsec))
  for j in range(rows):
   for k in range(nsec):
    ff.append((j*nsec+k,j*nsec+(k+1)%nsec,(j+1)*nsec+(k+1)%nsec,(j+1)*nsec+k));ii.append(1 if ident in ['m67','s6'] and k>=6 else 0)
  ff.extend([tuple(range(nsec-1,-1,-1)),tuple(rows*nsec+k for k in range(nsec))]);ii.extend([0,0]);base=alloy if ident=='gloster6' else alloy if ident=='s6' else paint;lower=paint if ident=='s6' else white
  floatObj=mesh(('Port' if side<0 else 'Starboard')+' hard-chine stepped float',vv,ff,base,[lower],ii,uv);mod=floatObj.modifiers.new('Preserve hard chine and keel','EDGE_SPLIT');mod.split_angle=.75
  def strut(a,b,chord):
   A=Vector(a);B=Vector(b);axis=(B-A).normalized();forward=Vector((0,0,1));forward=(forward-axis*forward.dot(axis)).normalized();thin=axis.cross(forward).normalized();v=[];f=[]
   for p in [A,B]:
    for k in range(20):t=k/20*math.tau;v.append(tuple(p+forward*math.cos(t)*chord/2+thin*math.sin(t)*.035))
   for k in range(20):f.append((k,(k+1)%20,(k+1)%20+20,k+20))
   f.extend([tuple(range(19,-1,-1)),tuple(20+k for k in range(20))]);mesh('Airfoil-section float support',v,f,alloy if ident!='m67' else paint)
  for front in [True,False]:
   z=-1.32 if front else .64;bottom=z-.14 if front else z+.44;strut((side*.30,-.08,z),(side*fs,-1.15,bottom),.24 if front else .29)
  for a,b in [((side*.31,-.07,-1.30),(side*fs,-1.17,1.08)),((side*.30,-.07,.64),(side*fs,-1.17,-1.46)),((side*fs,-1.17,-.7),(side*span*.39,.04,-.8))]:rod('Tensioned flying wire',a,b,.009,steel)
  for z in [-1.6,-.1,1.2]:box('Float flush inspection latch',(side*fs,-1.15,z),(.10,.018,.055),alloy)
 # Flush ports and short individual exhausts follow the cowling surface at the correct bank angles.
 for side in [-1,1]:
  for k in range(6 if ident!='gloster6' else 4):
   z=-2.9+k*.25;a=side*1.13;p=Vector(skin(z,a));out=Vector((side*.07,-.04,.065));rod('Short exhaust outlet',p,p+out,.027,steel)
  if ident=='m67':
   for k in range(6):
    z=-2.78+k*.25;p=Vector(skin(z,side*1.30));rod('External coolant union',p+Vector((0,-.04,0)),p+Vector((side*.012,-.15,0)),.012,copper)
 # Original race identifiers conform to the fuselage instead of floating in space.
 def label(text,z,y,size,m,side,fin=False):
  curve=bpy.data.curves.new('Identification','FONT');curve.body=text;curve.size=size;curve.align_x='CENTER';curve.align_y='CENTER';curve.extrude=0;curve.resolution_u=8;o=bpy.data.objects.new('Race identifier '+text,curve);bpy.context.collection.objects.link(o);o.parent=root;o.rotation_euler[1]=side*math.pi/2;o.location=(side*.05 if fin else side*.3,y,z);o.data.materials.append(m);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o=bpy.context.object;o.update_tag();bpy.context.view_layer.update()
  if not fin:
   # Subdivide decals before wrapping: a long glyph chord would otherwise cut through the convex skin.
   bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.triangulate(bm,faces=list(bm.faces));bmesh.ops.subdivide_edges(bm,edges=list(bm.edges),cuts=5,use_grid_fill=True);bm.to_mesh(o.data);bm.free()
   matrix=o.matrix_world.copy();inv=matrix.inverted()
   for v in o.data.vertices:
    p=matrix@v.co;cy,bw,bh=spline(stations,p.z);p.x=side*(bw*math.sqrt(max(.01,1-((p.y-cy)/bh)**2))+.005);v.co=inv@p
  if fin:
   transform=o.matrix_world.copy();o.parent=rudder;o.matrix_world=transform
  o.select_set(False)
 label('2' if ident=='s6' else '6' if ident=='gloster6' else '10',2.05,.30,.48,white if ident!='gloster6' else steel,-1);label('2' if ident=='s6' else '6' if ident=='gloster6' else '10',2.05,.30,.48,white if ident!='gloster6' else steel,1)
 for side in [-1,1]:
  for j,m in enumerate([green,white,paint] if ident=='m67' else [blue,white,red]):
   p=Vector((side*.045,.45+C['tail']*.30,zt+.34+(j-1)*.085));o=box('Rudder national stripe',p,(.008,C['tail']*.60,.08),m,parent=rudder);o.location=p-rudderOrigin
  if ident=='gloster6':label('N\n249',zt+.34,1.02,.14,steel,side,True)
 # Hub and twisted airfoil blades, with historic blade count and fine leading edges.
 pivot=bpy.data.objects.new('PropellerPivot',None);bpy.context.collection.objects.link(pivot);pivot.parent=root;pivot.location=(0,.36,-length/2+.39);pivot['rotation_direction']=1
 for i in range(blades):
  vv=[];ff=[];nr=32;na=16
  for j in range(nr+1):
   t=j/nr;r=.14+1.10*t;chord=(.035+.105*math.sin(math.pi*t)**.65)*min(1,(1-t)*18+.02);twist=math.radians(39-25*t)
   for k in range(na):a=k/na*math.tau;x=math.cos(a)*chord;z=math.sin(a)*.014;vv.append((x*math.cos(twist)+z*math.sin(twist),r,-x*math.sin(twist)+z*math.cos(twist)))
  for j in range(nr):
   for k in range(na):ff.append((j*na+k,j*na+(k+1)%na,(j+1)*na+(k+1)%na,(j+1)*na+k))
  ff.extend([tuple(range(na-1,-1,-1)),tuple(nr*na+k for k in range(na))]);o=mesh('Twisted propeller blade',vv,ff,alloy,parent=pivot);o.rotation_euler[2]=-i*math.tau/blades
 o=ell('Spinner',(0,0,0),(.19,.19,.30),paint if ident=='m67' else alloy if ident=='s6' else paint,pivot);o.location=(0,0,-.09)
 for o in list(bpy.context.scene.objects):
  if o.type=='MESH':
   bpy.context.view_layer.objects.active=o
   for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
 # M.67 museum dimensions give 2.97 m overall height. Lower its airframe and raise the
 # floats together; propeller and control pivots remain rigid, while support endpoints fit.
 if ident=='m67':
  for o in list(bpy.context.scene.objects):
   if o.parent!=root:continue
   if 'hard-chine stepped float' in o.name or o.name.startswith('Float flush'):o.location.y+=.22
   elif o.type=='MESH' and (o.name.startswith('Airfoil-section float support') or o.name.startswith('Tensioned flying wire')):
    matrix=o.matrix_world.copy();inverse=matrix.inverted()
    for vertex in o.data.vertices:
     p=matrix@vertex.co;t=max(0,min(1,(p.y+1.16)/1.08));p.y+=.22-.52*t;vertex.co=inverse@p
   else:o.location.y-=.30
 # Merge manufactured fixed parts by material, preserving actual moving nodes and both floats.
 static=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.parent==root and not o.name.startswith(('Port hard-chine','Starboard hard-chine'))]
 bpy.ops.object.select_all(action='DESELECT')
 for o in static:o.select_set(True)
 bpy.context.view_layer.objects.active=body;bpy.ops.object.join();bpy.context.object.name='AircraftBody'
 root['aircraft_type']=ident;root['span_m']=span;root['length_m']=length;root['reference']='docs/RACE_REFERENCES.md; user three reference images';root['units']='metres; Y up; -Z forward';root['cowling_topology']='One continuous station-loft skin';root['float_topology']='Hard chine, V keel and aft planing step';root['reconstruction']='v2 separate reference silhouettes and material regions'
 bake_aircraft_ao(root);export_with_ao(root,os.path.join(BASE,'public','models','race',ident+'.glb'));bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=os.path.join(BASE,'art','racers',ident+'.blend'),compress=True);print('RACER_COMPLETE',ident,flush=True)
