# Repaint the back of a front-view-generated boxer .glb: projects the front onto the back, picks flat materials by rule
# (skin / trunks black / waistband white / glove red), a wrap-around buzz-cut hair cap that skips the ears, spine and shoulder-blade shading, UV gutter padding.
# Usage: python3 -I tools/repaint_back.py in.glb out.glb
import json,struct,io,sys,numpy as np
from PIL import Image,ImageFilter
src,dst=sys.argv[1],sys.argv[2]
f=open(src,'rb').read();cl,=struct.unpack('<I',f[12:16]);js=json.loads(f[20:20+cl]);off=20+cl;bl,=struct.unpack('<I',f[off:off+4]);B=f[off+8:off+8+bl]
def acc(i,dt,n):
  a=js['accessors'][i];bv=js['bufferViews'][a['bufferView']];o=bv.get('byteOffset',0)+a.get('byteOffset',0)
  return np.frombuffer(B,dtype=dt,count=a['count']*n,offset=o).reshape(a['count'],n) if n>1 else np.frombuffer(B,dtype=dt,count=a['count'],offset=o)
P=acc(0,np.float32,3).astype(np.float64);UV=acc(1,np.float32,2).astype(np.float64);I=acc(2,np.uint32,1).reshape(-1,3)
ib=js['bufferViews'][js['images'][0]['bufferView']];T=np.array(Image.open(io.BytesIO(B[ib['byteOffset']:ib['byteOffset']+ib['byteLength']])).convert('RGBA')).astype(np.float64)
TH,TW=T.shape[:2]
a,b,c=P[I[:,0]],P[I[:,1]],P[I[:,2]];N=np.cross(b-a,c-a);N/=np.linalg.norm(N,axis=1,keepdims=True)+1e-12
cen=(a+b+c)/3
if (N[cen[:,2]>cen[:,2].mean()+.03][:,2]).mean()<0:N=-N   # make outward normals face +z at the front
y0,y1=P[:,1].min(),P[:,1].max();x0,x1=P[:,0].min(),P[:,0].max();H=y1-y0
# 1) front map: for each (x,y) cell, the uv of the front-most front-facing surface
GW,GH=320,1100;depth=np.full((GH,GW),-9.);fuv=np.zeros((GH,GW,2))
gx=lambda x:(x-x0)/(x1-x0)*(GW-1);gy=lambda y:(y1-y)/(y1-y0)*(GH-1)
def raster(p2,cb):
  mn=np.floor(p2.min(0)).astype(int);mx=np.ceil(p2.max(0)).astype(int)
  xs,ys=np.meshgrid(np.arange(mn[0],mx[0]+1),np.arange(mn[1],mx[1]+1));pts=np.stack([xs.ravel(),ys.ravel()],1).astype(float)
  v0=p2[1]-p2[0];v1=p2[2]-p2[0];v2=pts-p2[0];d00=v0@v0;d01=v0@v1;d11=v1@v1;den=d00*d11-d01*d01
  if abs(den)<1e-12:return
  d20=v2@v0;d21=v2@v1;w1=(d11*d20-d01*d21)/den;w2=(d00*d21-d01*d20)/den;w0=1-w1-w2;m=(w0>=-1e-3)&(w1>=-1e-3)&(w2>=-1e-3)
  if m.any():cb(pts[m].astype(int),np.stack([w0[m],w1[m],w2[m]],1))
for t in np.where(N[:,2]>0.05)[0]:
  tri=P[I[t]];p2=np.stack([gx(tri[:,0]),gy(tri[:,1])],1);tuv=UV[I[t]]
  def cb(px,w,tri=tri,tuv=tuv):
    z=w@tri[:,2];u=w@tuv;xs,ys=px[:,0],px[:,1];ok=(xs>=0)&(xs<GW)&(ys>=0)&(ys<GH);xs,ys,z,u=xs[ok],ys[ok],z[ok],u[ok]
    better=z>depth[ys,xs];depth[ys[better],xs[better]]=z[better];fuv[ys[better],xs[better]]=u[better]
  raster(p2,cb)
def tex(u):return T[np.clip((u[:,1]*TH).astype(int),0,TH-1),np.clip((u[:,0]*TW).astype(int),0,TW-1),:3]
# 2) materials by rule from a smoothed front colour (no muscle lines, no shadow streaks)
has=depth>-9
FC=np.zeros((GH,GW,3));FC[has]=tex(fuv[has])
from PIL import Image as _I
def blur(a,r):return np.stack([np.array(_I.fromarray(np.clip(a[:,:,k],0,255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(float) for k in range(3)],2)
Wm=blur(np.repeat(has[:,:,None]*255.,3,2),4)[:,:,0]/255+1e-6;FCs=blur(FC,4)/Wm[:,:,None]
def sat(c):mx=c.max(-1);mn=c.min(-1);return (mx-mn)/(mx+1)
skinS=FC[has];skinS=skinS[(sat(skinS)>.15)&(sat(skinS)<.45)&(lum(skinS)>110) if False else slice(None)] if False else None
lumf=lambda c:c@np.array([.299,.587,.114])
cand=FC[has];sk=cand[(lumf(cand)>120)&(lumf(cand)<215)&(cand[:,0]>cand[:,2]*1.12)&(cand[:,0]<cand[:,1]*1.35)]
SKIN=np.median(sk,0);BLACK=np.array([22.,20,20]);WHITE=np.median(cand[(lumf(cand)>170)&((cand.max(1)-cand.min(1))<18)],0);RED=np.median(cand[(cand[:,0]>cand[:,1]*1.7)&(cand[:,0]>110)],0)
def material(c,yy):
  # gear only where gear lives: trunks/boots black, waistband/socks white, gloves red at hand height
  L=lumf(c);m=np.tile(SKIN,(len(c),1))
  red=(c[:,0]>c[:,1]*1.6)&(c[:,0]>100)&(yy>.33)&(yy<.62);dark=(L<70)&((yy<.62)&(yy>.37)|(yy<.2));white=(L>165)&((c.max(1)-c.min(1))<22)&(((yy>.55)&(yy<.66))|(yy<.22))
  m[red]=RED;m[dark]=BLACK;m[white]=WHITE;return m
top=has.copy();top[int(GH*.035):]=False;hair=np.median(tex(fuv[top]),0) if top.any() else np.array([70,55,45.])
print('skin',SKIN.round(),'white',WHITE.round(),'red',RED.round(),'hair',hair.round())
# 3) repaint back-facing texels that came out too dark
out=T.copy();mask=np.zeros((TH,TW),bool);headY=y1-H*.105
hv=P[P[:,1]>y1-H*.12];HC=np.array([np.median(hv[:,0]),np.median(hv[:,2])])
HRy=np.linspace(y1-H*.13,y1,14);HRr=np.array([np.median(np.hypot(*(hv[np.abs(hv[:,1]-yy)<H*.01][:,[0,2]]-HC).T)) if (np.abs(hv[:,1]-yy)<H*.01).sum()>3 else .05 for yy in HRy])
for t in np.where((N[:,2]<0.2)|(P[I][:,:,1].mean(1)>y1-H*.13))[0]:
  tri=P[I[t]];tuv=UV[I[t]];p2=np.stack([tuv[:,0]*TW,tuv[:,1]*TH],1)
  def cb(px,w,tri=tri,t=t):
    xs,ys=px[:,0],px[:,1];ok=(xs>=0)&(xs<TW)&(ys>=0)&(ys<TH);xs,ys,w=xs[ok],ys[ok],w[ok]
    if not len(xs):return
    p3=w@tri;cx=np.clip(gx(p3[:,0]).astype(int),0,GW-1);cy=np.clip(gy(p3[:,1]).astype(int),0,GH-1)
    fc=FCs[cy,cx];valid=depth[cy,cx]>-9
    mat=material(fc,(p3[:,1]-y0)/H)
    # hair cap: a hairline that wraps the skull (temple high, above the ear at the side, low at the nape); ears are skipped
    th=np.abs(np.arctan2(p3[:,0]-HC[0],p3[:,2]-HC[1]))
    hl=np.interp(th,[0,.5,.55,.85,1.25,np.pi/2,2.2,np.pi],[9,9,y1-H*.032,y1-H*.058,y1-H*.078,y1-H*.07,y1-H*.082,y1-H*.100])  # forehead, temple, sideburn, above ear, nape
    d=np.hypot(p3[:,0]-HC[0],p3[:,2]-HC[1]);ear=d>np.interp(p3[:,1],HRy,HRr)*1.10
    hw=np.clip((p3[:,1]-(hl-H*.008))/(H*.016),0,1)*(th>.5)*~ear*(p3[:,1]>y1-H*.13)
    head=hw>0
    mat=mat*(1-hw[:,None])+hair*hw[:,None]
    cur=out[ys,xs,:3];yy=(p3[:,1]-y0)/H
    # back anatomy: a soft spine groove and shoulder-blade shading on skin
    isskin=(np.abs(mat-SKIN).sum(1)<1)&~head
    spine=np.exp(-(p3[:,0]/(.006))**2)*((yy>.5)&(yy<.82))
    blades=sum(np.exp(-(((p3[:,0]-sx)/.035)**2+((yy-.74)/.045)**2)) for sx in (-.05,.05))
    shade=(1-.10*spine*isskin-.07*blades*isskin)[:,None]*(.93+.07*yy[:,None])
    back=N[t,2]<-.1
    facefront=(p3[:,1]>y1-H*.13)&(N[t,2]>=.2)
    rep=(valid&((back|(lumf(cur)<lumf(mat)*.6))&~facefront)|head)&~((lumf(mat)<40)&(lumf(cur)<60)&~head)
    col=mat*shade+np.random.default_rng(t).normal(0,2.5,mat.shape)*(1-hw[:,None])
    out[ys[rep],xs[rep],:3]=np.clip(col[rep],0,255);mask[ys[rep],xs[rep]]=True
  raster(p2,cb)
# sliver triangles (texture area under a few texels) in the hair cap: paint a small dot of hair where they sample
for t in range(len(I)):
  tri=P[I[t]];cy3=tri[:,1].mean()
  if cy3<y1-H*.13:continue
  cc=tri.mean(0);th=abs(np.arctan2(cc[0]-HC[0],cc[2]-HC[1]))
  hl=np.interp(th,[0,.5,.55,.85,1.25,np.pi/2,2.2,np.pi],[9,9,y1-H*.032,y1-H*.058,y1-H*.078,y1-H*.07,y1-H*.082,y1-H*.100])
  if cy3<hl or th<.5:continue
  tuv=UV[I[t]]*[TW,TH];e1=tuv[1]-tuv[0];e2=tuv[2]-tuv[0];area=abs(e1[0]*e2[1]-e1[1]*e2[0])/2
  if area<6:
    for (u,v) in tuv:
      x0_,y0_=int(u),int(v);out[max(0,y0_-3):y0_+4,max(0,x0_-3):x0_+4,:3]=hair;mask[max(0,y0_-3):y0_+4,max(0,x0_-3):x0_+4]=True
cov=np.zeros((TH,TW),bool)
for t in range(len(I)):
  tuv=UV[I[t]];p2=np.stack([tuv[:,0]*TW,tuv[:,1]*TH],1)
  def cbc(px,w):
    xs,ys=px[:,0],px[:,1];ok=(xs>=0)&(xs<TW)&(ys>=0)&(ys<TH);cov[ys[ok],xs[ok]]=True
  raster(p2,cbc)
filled=cov.copy();col=out[:,:,:3].copy()
for _ in range(8):
  acc=np.zeros_like(col);cnt=np.zeros((TH,TW))
  for dy,dx in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,-1),(1,-1),(-1,1)):
    sh=np.roll(np.roll(filled,dy,0),dx,1);sc=np.roll(np.roll(col,dy,0),dx,1);acc[sh]+=sc[sh];cnt[sh]+=1
  grow=(~filled)&(cnt>0);col[grow]=acc[grow]/cnt[grow][:,None];filled|=grow
out[:,:,:3]=np.where(cov[:,:,None],out[:,:,:3],col)
# soften the repainted areas a little and bleed them over UV seams
img=Image.fromarray(out.astype(np.uint8),'RGBA');soft=img.filter(ImageFilter.GaussianBlur(1.2));m=Image.fromarray((mask*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))
img=Image.composite(soft,img,m)
# despeckle painted areas: a median pass removes stray dark texels the rasterizer missed
med=img.filter(ImageFilter.MedianFilter(5));img=Image.composite(med,img,m)
buf=io.BytesIO();img.save(buf,'PNG',optimize=True);png=buf.getvalue()
# 4) write the glb back: new image bytes, matte material
nb=bytearray(B[:ib['byteOffset']])+png;
while len(nb)%4:nb+=b'\0'
ib['byteLength']=len(png);js['buffers'][0]['byteLength']=len(nb)
mt=js['materials'][0]['pbrMetallicRoughness'];mt['metallicFactor']=0;mt['roughnessFactor']=.9
J=json.dumps(js,separators=(',',':')).encode();J+=b' '*((4-len(J)%4)%4)
outb=struct.pack('<4sII',b'glTF',2,12+8+len(J)+8+len(nb))+struct.pack('<I4s',len(J),b'JSON')+J+struct.pack('<I4s',len(nb),b'BIN\0')+bytes(nb)
open(dst,'wb').write(outb);print('repainted texels',int(mask.sum()),'size',len(outb))
img.resize((512,512)).save(dst.replace('.glb','_tex.png'))
