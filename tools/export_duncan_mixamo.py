# Export Duncan for Mixamo's auto-rigger from his ORIGINAL model (cables and gloves intact and facing the right way): each whole arm
# (cable + glove) is swung out from its shoulder into an A-pose so Mixamo sees space between arms and body, and two plain temporary
# legs are added beside the spring for its knee markers (the game keeps his spring). Writes tools/mixamo/duncan_apose.zip (OBJ+MTL+PNG).
# Usage: python3 -I tools/export_duncan_mixamo.py assets/models/duncan_src.glb tools/mixamo/duncan_apose.zip [angle_deg]
import json,struct,io,sys,zipfile,numpy as np
from PIL import Image
src,dst=sys.argv[1],sys.argv[2];ang=np.radians(float(sys.argv[3]) if len(sys.argv)>3 else 50)
f=open(src,'rb').read();cl,=struct.unpack('<I',f[12:16]);js=json.loads(f[20:20+cl]);off=20+cl;B=f[off+8:]
def acc(i,dt,n):
  a=js['accessors'][i];bv=js['bufferViews'][a['bufferView']];return np.frombuffer(B,dtype=dt,count=a['count']*n,offset=bv.get('byteOffset',0)).reshape(a['count'],n)
pr=js['meshes'][0]['primitives'][0];P=acc(pr['attributes']['POSITION'],np.float32,3).astype(float);UV=acc(pr['attributes']['TEXCOORD_0'],np.float32,2).astype(float);I=acc(pr['indices'],np.uint32,1).reshape(-1,3)
ib=js['bufferViews'][js['images'][0]['bufferView']];img=Image.open(io.BytesIO(B[ib['byteOffset']:ib['byteOffset']+ib['byteLength']])).convert('RGB')
T=np.array(img).astype(float);TH,TW=T.shape[:2]
C=P[I].mean(1);uvc=UV[I].mean(1);col=T[np.clip((uvc[:,1]*TH).astype(int),0,TH-1),np.clip((uvc[:,0]*TW).astype(int),0,TW-1)]
ax=np.abs(C[:,0]);yellow=(col[:,0]>110)&(col[:,1]>100)&(col[:,2]<col[:,0]*.6)
ground=(C[:,1]<-.472)|((C[:,1]<-.465)&(ax>.13))
rad=np.hypot(C[:,0],C[:,2]-np.median(C[:,2]));red=(col[:,0]>col[:,1]*1.6)&(col[:,0]>60)
glove=(ax>.15)&(C[:,1]<-.06)&~ground&(red|(rad>.18))   # the canister's wide bottom rim is neither red nor outside its radius
arm=(ax>.17)&(C[:,1]>=-.1)&(C[:,1]<.06)&~yellow&~glove
I=I[~ground];glove=glove[~ground];arm=arm[~ground];C=C[~ground];ax=ax[~ground]
limb=glove|arm
# shoulder pivot per side: the top of the cable where it leaves the canister
for sg in (1,-1):
  m=limb&(np.sign(C[:,0])==sg);vs=np.unique(I[m]);top=P[vs][P[vs][:,1]>P[vs][:,1].max()-.02].mean(0)
  piv=top.copy();a=sg*ang   # rotate about z: left arm (+x) swings out to +x
  c,s=np.cos(a),np.sin(a);R=np.array([[c,-s,0],[s,c,0],[0,0,1]])
  # vertices used only by this arm move; a short blend near the shoulder keeps the cable joined to the canister
  body_vs=set(np.unique(I[~limb]).tolist())
  for v in vs:
    if v in body_vs:continue
    d=piv[1]-P[v,1];w=np.clip(d/.03,0,1)
    q=(P[v]-piv)@R.T+piv;P[v]=P[v]*(1-w)+q*w
# temporary legs: cylinders beside the spring, from the canister bottom to the floor
y0=P[np.unique(I)][:,1].min()
def cyl(cx,cz,r,ya,yb,n=12,rings=6):
  V=[];F=[]
  for j in range(rings+1):
    y=ya+(yb-ya)*j/rings
    for k in range(n):t=2*np.pi*k/n;V.append([cx+r*np.cos(t),y,cz+r*np.sin(t)])
  for j in range(rings):
    for k in range(n):a_=j*n+k;b_=j*n+(k+1)%n;c_=a_+n;d_=b_+n;F+= [[a_,c_,b_],[b_,c_,d_]]
  return np.array(V),np.array(F)
spring=C[(ax<.12)&(C[:,1]<-.1)&(C[:,1]>-.45)]
sx=np.abs(spring[:,0]).max() if len(spring) else .07
ybot=-.11  # canister bottom (raw units)
grey_tri=np.where((ax<.08)&(C[:,1]<-.2)&(C[:,1]>-.4))[0]
guv=UV[I[grey_tri[0]]].mean(0) if len(grey_tri) else np.array([.5,.5])
used=np.unique(I);rm=-np.ones(len(P),int);rm[used]=np.arange(len(used));I=rm[I];P=P[used];UV=UV[used]
for sg in (1,-1):
  V,F=cyl(sg*(sx+.07),0,.035,y0,ybot);F=F+len(P);P=np.vstack([P,V]);UV=np.vstack([UV,np.tile(guv,(len(V),1))]);I=np.vstack([I,F])
# scale to ~180 cm, feet on the floor
yl=P[:,1].min();k=180/(P[:,1].max()-yl);P=(P-[0,yl,0])*k
name='duncan_apose'
o=[f"mtllib {name}.mtl","usemtl duncan"]+[f"v {x:.3f} {y:.3f} {z:.3f}" for x,y,z in P]+[f"vt {u:.6f} {1-v:.6f}" for u,v in UV]+[f"f {a+1}/{a+1} {b+1}/{b+1} {c+1}/{c+1}" for a,b,c in I]
buf=io.BytesIO();img.save(buf,'PNG')
with zipfile.ZipFile(dst,'w',zipfile.ZIP_DEFLATED) as z:
  z.writestr(name+'.obj','\n'.join(o));z.writestr(name+'.mtl',f"newmtl duncan\nKd 1 1 1\nmap_Kd {name}.png\n");z.writestr(name+'.png',buf.getvalue())
print(dst,len(P),'verts',len(I),'tris','spring half-width',round(sx,3))
