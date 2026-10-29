# Prepare the Duncan V. mascot model for the game: drop the painted ground disc, split triangles into parts
# (head, body, gloveL, gloveR; the tube arms are dropped and rebuilt live in the renderer), scale to fighting height with the
# base on the floor, re-encode the texture as a 1024 JPEG, and write a compact single-mesh GLB whose extras list each part's
# index range. Usage: python3 -I tools/prep_duncan.py in.glb out.glb
import json,struct,io,sys,numpy as np
from PIL import Image
src,dst=sys.argv[1],sys.argv[2]
f=open(src,'rb').read();cl,=struct.unpack('<I',f[12:16]);js=json.loads(f[20:20+cl]);off=20+cl;bl,=struct.unpack('<I',f[off:off+4]);B=f[off+8:off+8+bl]
def acc(i,dt,n):
  a=js['accessors'][i];bv=js['bufferViews'][a['bufferView']];o=bv.get('byteOffset',0)
  return np.frombuffer(B,dtype=dt,count=a['count']*n,offset=o).reshape(a['count'],n)
pr=js['meshes'][0]['primitives'][0];P=acc(pr['attributes']['POSITION'],np.float32,3).astype(float);UV=acc(pr['attributes']['TEXCOORD_0'],np.float32,2).astype(float);I=acc(pr['indices'],np.uint32,1).reshape(-1,3)
ib=js['bufferViews'][js['images'][0]['bufferView']];img=Image.open(io.BytesIO(B[ib['byteOffset']:ib['byteOffset']+ib['byteLength']])).convert('RGB');T=np.array(img).astype(float);TH,TW=T.shape[:2]
C=P[I].mean(1);uvc=UV[I].mean(1);col=T[np.clip((uvc[:,1]*TH).astype(int),0,TH-1),np.clip((uvc[:,0]*TW).astype(int),0,TW-1)]
yellow=(col[:,0]>110)&(col[:,1]>100)&(col[:,2]<col[:,0]*.6)
ax=np.abs(C[:,0])
ground=(C[:,1]<-.472)|((C[:,1]<-.465)&(ax>.13))
glove=(ax>.15)&(C[:,1]<-.06)&~ground
arm=(ax>.17)&(C[:,1]>=-.1)&(C[:,1]<.06)&~yellow&~glove
head=(C[:,1]>.05)&~arm
part=np.where(ground|arm,-1,np.where(glove,np.where(C[:,0]>0,2,3),np.where(head,0,1)))  # 0 head 1 body 2 gloveL(+x) 3 gloveR(-x)
print({n:int((part==k).sum()) for k,n in [(-1,'dropped'),(0,'head'),(1,'body'),(2,'gloveL'),(3,'gloveR')]})
keep=part>=0;I2=I[keep];part2=part[keep];order=np.argsort(part2,kind='stable');I2=I2[order];part2=part2[order]
used=np.unique(I2);remap=-np.ones(len(P),int);remap[used]=np.arange(len(used));I2=remap[I2];P2=P[used];UV2=UV[used]
# scale: 2.45 tall in game units, base on y=0, centred in x/z
y0=P2[:,1].min();s=2.45/(P2[:,1].max()-y0);P2=(P2-[0,y0,0])*s;P2[:,0]-=0;P2[:,2]-=np.median(P2[:,2])
ranges={};
for k,n in enumerate(['head','body','gloveL','gloveR']):
  w=np.where(part2==k)[0];ranges[n]=[int(w.min()*3),int(len(w)*3)] if len(w) else [0,0]
# shoulder anchors: top of the arm tubes (in game units)
am=arm&(C[:,1]>-.05);sh={}
for sgn,n in [(1,'L'),(-1,'R')]:
  m=am&(np.sign(C[:,0])==sgn);c=C[m];q=c[c[:,1]>np.percentile(c[:,1],70)].mean(0) if len(c) else np.array([.2*sgn,0,0])
  sh[n]=((q-[0,y0,0])*s).round(4).tolist()
img=img.resize((1024,1024),Image.LANCZOS);buf=io.BytesIO();img.save(buf,'JPEG',quality=88);jpg=buf.getvalue()
pos=P2.astype(np.float32).tobytes();uv=UV2.astype(np.float32).tobytes();idx=I2.astype(np.uint32).ravel().tobytes()
def pad(b):return b+b'\0'*((4-len(b)%4)%4)
bin_=b'';views=[]
for b in (pos,uv,idx,jpg):views.append({'buffer':0,'byteOffset':len(bin_),'byteLength':len(b)});bin_+=pad(b)
J={'asset':{'version':'2.0','generator':'twelve-rounds prep_duncan'},'buffers':[{'byteLength':len(bin_)}],'bufferViews':views,
 'accessors':[{'bufferView':0,'componentType':5126,'count':len(P2),'type':'VEC3','min':P2.min(0).tolist(),'max':P2.max(0).tolist()},{'bufferView':1,'componentType':5126,'count':len(P2),'type':'VEC2'},{'bufferView':2,'componentType':5125,'count':int(I2.size),'type':'SCALAR'}],
 'images':[{'bufferView':3,'mimeType':'image/jpeg'}],'textures':[{'source':0}],'materials':[{'pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicFactor':0,'roughnessFactor':.9}}],
 'meshes':[{'primitives':[{'attributes':{'POSITION':0,'TEXCOORD_0':1},'indices':2,'material':0}],'extras':{'parts':ranges,'shoulders':sh}}],'nodes':[{'mesh':0}],'scenes':[{'nodes':[0]}],'scene':0}
jb=json.dumps(J,separators=(',',':')).encode();jb+=b' '*((4-len(jb)%4)%4)
out=struct.pack('<4sII',b'glTF',2,12+8+len(jb)+8+len(bin_))+struct.pack('<I4s',len(jb),b'JSON')+jb+struct.pack('<I4s',len(bin_),b'BIN\0')+bin_
open(dst,'wb').write(out);print('verts',len(P2),'tris',I2.shape[0],'jpg',len(jpg),'glb',len(out),'shoulders',sh,'ranges',ranges)
