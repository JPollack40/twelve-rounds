# Package a base model for Mixamo: OBJ + MTL + PNG texture in a zip (Mixamo takes zipped OBJ, not glTF).
# The model is scaled to about 1.8 m tall, feet on the floor, facing +z. Usage: python3 -I tools/export_obj.py in.glb out.zip
import json,struct,io,sys,zipfile,numpy as np
from PIL import Image
src,dst=sys.argv[1],sys.argv[2];name=dst.rsplit('/',1)[-1].rsplit('.',1)[0]
f=open(src,'rb').read();cl,=struct.unpack('<I',f[12:16]);js=json.loads(f[20:20+cl]);off=20+cl;B=f[off+8:]
def acc(i,dt,n):
  a=js['accessors'][i];bv=js['bufferViews'][a['bufferView']];return np.frombuffer(B,dtype=dt,count=a['count']*n,offset=bv.get('byteOffset',0)).reshape(a['count'],n)
pr=js['meshes'][0]['primitives'][0];P=acc(pr['attributes']['POSITION'],np.float32,3).astype(float);UV=acc(pr['attributes']['TEXCOORD_0'],np.float32,2);I=acc(pr['indices'],np.uint32,1).reshape(-1,3)
ib=js['bufferViews'][js['images'][0]['bufferView']];img=Image.open(io.BytesIO(B[ib['byteOffset']:ib['byteOffset']+ib['byteLength']])).convert('RGB')
P=(P-[0,P[:,1].min(),0])*(180/(P[:,1].max()-P[:,1].min()))   # centimetres
o=[f"mtllib {name}.mtl","usemtl skin"]+[f"v {x:.4f} {y:.4f} {z:.4f}" for x,y,z in P]+[f"vt {u:.6f} {1-v:.6f}" for u,v in UV]+[f"f {a+1}/{a+1} {b+1}/{b+1} {c+1}/{c+1}" for a,b,c in I]
buf=io.BytesIO();img.save(buf,'PNG')
with zipfile.ZipFile(dst,'w',zipfile.ZIP_DEFLATED) as z:
  z.writestr(name+'.obj','\n'.join(o));z.writestr(name+'.mtl',f"newmtl skin\nKd 1 1 1\nmap_Kd {name}.png\n");z.writestr(name+'.png',buf.getvalue())
print(dst,len(P),'verts')
