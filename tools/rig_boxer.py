# Auto-rig the base boxer for the game. Joints are placed from landmarks measured on the model, each vertex is labelled
# with a body part by geodesic (along-the-surface) distance from seed vertices that hug each bone, so touching parts such as
# the gloves and the shorts never share weights. Weights then blend smoothly across each joint along the child bone.
# Also writes swelling morph targets for both eyes, a material mask (skin, hair, trunks, band, gloves, boots, socks) used to
# recolor the texture per fighter, and the UV spots where facial damage is painted.
# Usage: python3 -I tools/rig_boxer.py in.glb out.glb [m|f] [debug.json]
import json,struct,io,sys,heapq,numpy as np
from PIL import Image,ImageDraw
src,dst=sys.argv[1],sys.argv[2];sex=sys.argv[3] if len(sys.argv)>3 else 'm';dbg=sys.argv[4] if len(sys.argv)>4 else None
# per-model landmarks (raw model units; +x is the fighter's left, +z is forward), measured on each base model
CFG={'m':dict(J={'pelvis':[0,-.045,0],'spine':[0,.03,-.01],'chest':[0,.2,-.02],'headG':[0,.355,-.012],'shL':[.108,.282,-.032],'elbowL':[.143,.152,-.03],'gloveL':[.153,-.005,.03],
               'hipL':[.062,-.075,0],'kneeL':[.08,-.212,-.012],'ankleL':[.094,-.39,-.042]},
          headY=.37,spineAx=.078,eye=[.021,.442,.06],LM={'nose':[0,.4065,.079],'mouth':[0,.388,.066],'chin':[0,.356,.055],'chinB':[0,.349,.035]},jawY=.405,
          hairY=.445,hairLum=95,deltX=.085,boot=-.355,sock=-.33,band=(.055,.115),trunks=(-.17,.115),top=None,tail=None,bellyY=.08),
     'f':dict(J={'pelvis':[0,-.05,0],'spine':[0,.03,-.005],'chest':[0,.2,-.01],'headG':[0,.348,-.01],'shL':[.1,.283,-.016],'elbowL':[.128,.155,-.022],'gloveL':[.143,-.02,.03],
               'hipL':[.058,-.08,0],'kneeL':[.068,-.222,0],'ankleL':[.088,-.39,-.03]},
          headY=.362,spineAx=.07,eye=[.02,.424,.062],LM={'nose':[0,.407,.081],'mouth':[0,.392,.072],'chin':[0,.366,.064],'chinB':[0,.357,.042]},jawY=.41,
          hairY=.455,hairLum=80,deltX=.097,boot=-.345,sock=-.345,band=(.075,.122),trunks=(-.14,.122),top=(.13,.31),tail=(.225,.372,-.072),bellyY=.06)}[sex]
f=open(src,'rb').read();cl,=struct.unpack('<I',f[12:16]);js=json.loads(f[20:20+cl]);off=20+cl;bl,=struct.unpack('<I',f[off:off+4]);B=f[off+8:off+8+bl]
def acc(i,dt,n):
  a=js['accessors'][i];bv=js['bufferViews'][a['bufferView']];o=bv.get('byteOffset',0)
  return np.frombuffer(B,dtype=dt,count=a['count']*n,offset=o).reshape(a['count'],n)
pr=js['meshes'][0]['primitives'][0];P=acc(pr['attributes']['POSITION'],np.float32,3).astype(float);UV=acc(pr['attributes']['TEXCOORD_0'],np.float32,2).astype(float);I=acc(pr['indices'],np.uint32,1).reshape(-1,3)
ib=js['bufferViews'][js['images'][0]['bufferView']];img=Image.open(io.BytesIO(B[ib['byteOffset']:ib['byteOffset']+ib['byteLength']])).convert('RGB')
N=len(P)

# ---- joints (raw model units; +x is the fighter's left, +z is forward) ----
J=dict(CFG['J'])
for k in list(J):
  if k.endswith('L'):J[k[:-1]+'R']=[-J[k][0],J[k][1],J[k][2]]
J={k:np.array(v,float) for k,v in J.items()}
TOP=np.array([0,.5,0.]);TOE={s:J['ankle'+s]+[0,-.09,.11] for s in 'LR'}
# bone segments used for seeding (label -> segment)
SEG={'head':(J['headG'],TOP),'spine':(J['spine'],J['headG']),'pelvis':(J['pelvis']+[0,.0,0],J['spine'])}
for s in 'LR':
  SEG['sh'+s]=(J['sh'+s],J['elbow'+s]);SEG['elbow'+s]=(J['elbow'+s],J['glove'+s]+[0,.06,-.02]);SEG['glove'+s]=(J['glove'+s]+[0,.03,0],J['glove'+s]+[0,-.05,.0])
  SEG['hip'+s]=(J['hip'+s],J['knee'+s]);SEG['knee'+s]=(J['knee'+s],TOE[s])
LAB=list(SEG)
def segd(p,a,b):
  ab=b-a;t=np.clip(((p-a)@ab)/(ab@ab),0,1);return np.linalg.norm(p-(a+t[:,None]*ab),axis=1)
D=np.stack([segd(P,*SEG[k]) for k in LAB],1)
o=np.sort(D,1);best=D.argmin(1)
seed=(o[:,0]<.5*o[:,1])&(o[:,0]<.07)
# extra seeding rules where Euclidean distance is ambiguous
yb=P[:,1];ax=np.abs(P[:,0])
# a hanging ponytail rides the head bone (it swings with the head, not the back)
T0=np.array(img).astype(float);vcol=T0[np.clip((UV[:,1]*T0.shape[0]).astype(int),0,T0.shape[0]-1),np.clip((UV[:,0]*T0.shape[1]).astype(int),0,T0.shape[1]-1)]
vlum=vcol@np.array([.299,.587,.114])
TAIL=np.zeros(N,bool)
if CFG['tail']:ty0,ty1,tz=CFG['tail'];TAIL=(ax<.05)&(yb>ty0)&(yb<ty1)&(P[:,2]<tz)&(vlum<90)
for i in range(N):
  if TAIL[i] or (yb[i]>CFG['headY'] and ax[i]<.07):best[i]=LAB.index('head');seed[i]=True
  elif .0<yb[i]<.33 and ax[i]<CFG['spineAx']:best[i]=LAB.index('spine');seed[i]=True   # chest and back
  elif LAB[best[i]].startswith('sh') and ax[i]<.125:seed[i]=False
# ---- surface graph (UV seams welded by position) ----
key={};weld=np.arange(N)
for i,p in enumerate(np.round(P,5)):
  k=tuple(p)
  if k in key:weld[i]=key[k]
  else:key[k]=i
adj=[[] for _ in range(N)]
def link(a,b):
  d=float(np.linalg.norm(P[a]-P[b]));adj[a].append((b,d));adj[b].append((a,d))
for t in I:
  for a,b in ((t[0],t[1]),(t[1],t[2]),(t[2],t[0])):link(a,b)
for i in range(N):
  if weld[i]!=i:link(i,weld[i])
# multi-source Dijkstra: each vertex takes the label of the nearest seed along the surface
lab=-np.ones(N,int);dist=np.full(N,np.inf);h=[]
for i in np.where(seed)[0]:dist[i]=0;lab[i]=best[i];h.append((0.,i))
heapq.heapify(h)
while h:
  d,i=heapq.heappop(h)
  if d>dist[i]:continue
  for j,w in adj[i]:
    if d+w<dist[j]:dist[j]=d+w;lab[j]=lab[i];heapq.heappush(h,(d+w,j))
lab[lab<0]=best[lab<0]
# generated meshes can fuse a glove to the shorts: glove-labelled vertices that are not red leather and sit away from the glove
# go to the nearest non-glove part instead
gi=[LAB.index('gloveL'),LAB.index('gloveR')];redness=vcol[:,0]-(vcol[:,1]+vcol[:,2])/2
Dng=D.copy();Dng[:,gi]=np.inf
for i in (np.where(np.isin(lab,gi))[0] if sex=='f' else []):
  gc=J['glove'+('L' if P[i,0]>0 else 'R')]
  if redness[i]<14 and np.linalg.norm(P[i]-gc)>.04:lab[i]=int(np.argmin(Dng[i]))
# women's model: arm-labelled vertices that sit closer to the hips/torso than to their own bone are shorts, not arm
if sex=='f':
  ARM=[LAB.index(k+s_) for k in ('elbow','glove') for s_ in 'LR'];BODY=[LAB.index(k) for k in ('pelvis','hipL','hipR','spine')]
  for i in np.where(np.isin(lab,ARM))[0]:
    if redness[i]<14 and D[i,BODY].min()<D[i,lab[i]]*.9:lab[i]=BODY[int(np.argmin(D[i,BODY]))]
  # her arms hang close: anything arm-labelled inside the torso's width below the armpit is torso or shorts
  for i in np.where(np.isin(lab,ARM))[0]:
    if ax[i]<.088 and yb[i]<.22:lab[i]=BODY[int(np.argmin(D[i,BODY]))]
L=np.array(LAB)[lab]
# fused bridges: triangles joining a forearm or glove to the hips or torso would stretch like a membrane when the arm moves; drop them
ARMS={'elbowL','elbowR','gloveL','gloveR'};BOD={'pelvis','hipL','hipR','spine'}
br=np.array([bool(set(L[t])&ARMS) and bool(set(L[t])&BOD) for t in I])
print('bridge triangles removed',int(br.sum()));gone=set(I[br].ravel().tolist());I=I[~br]
# patch the holes left behind: every open loop that touched a removed triangle gets a fan around a new centre vertex
from collections import defaultdict
ec=defaultdict(int);own={}
for t in I:
  for a_,b_ in ((t[0],t[1]),(t[1],t[2]),(t[2],t[0])):
    wa,wb=weld[a_],weld[b_];ec[(min(wa,wb),max(wa,wb))]+=1;own[(wa,wb)]=(a_,b_)
nxt={}
for (wa,wb),(a_,b_) in own.items():
  if ec[(min(wa,wb),max(wa,wb))]==1:nxt[wb]=(wa,a_,b_)   # boundary edge wa->wb; walk it backwards so the new faces face out
seen=set();newT=[];P=list(P);UV=list(UV);Ll=list(L);adj=list(adj);dist=list(dist);weld=list(weld);vcol=list(vcol);vlum=list(vlum);redness=list(redness);TAIL=list(TAIL)
for st in list(nxt):
  if st in seen:continue
  loop=[];w=st
  while w in nxt and w not in seen:seen.add(w);wa,a_,b_=nxt[w];loop.append((a_,b_));w=wa
  if len(loop)<3 or len(loop)>40 or not any(a_ in gone or b_ in gone or weld[a_] in gone for a_,b_ in loop):continue
  # a hole can run along both an arm and the body; patch each side separately so no new face joins them
  grp=lambda v:'arm' if Ll[v] in ARMS else 'body'
  k0=next((k for k in range(len(loop)) if grp(loop[k][0])!=grp(loop[k-1][0])),0);loop=loop[k0:]+loop[:k0]
  runs=[];cur=[]
  for a_,b_ in loop:
    if grp(a_)!=grp(b_):
      if cur:runs.append(cur);cur=[]
      continue
    if cur and grp(cur[-1][0])!=grp(a_):runs.append(cur);cur=[]
    cur.append((a_,b_))
  if cur:runs.append(cur)
  for run in runs:
    if len(run)<2:continue
    vs=[a_ for a_,b_ in run]+[run[-1][1]];c=len(P);P.append(np.mean([P[v] for v in vs],0))
    labs=[Ll[v] for v in vs];maj=max(set(labs),key=labs.count);Ll.append(maj);UV.append(UV[[v for v in vs if Ll[v]==maj][0]]);adj.append([(v,0.01) for v in vs]);dist.append(float(np.mean([dist[v] for v in vs])));weld.append(c)
    vcol.append(vcol[vs[0]]);vlum.append(vlum[vs[0]]);redness.append(redness[vs[0]]);TAIL.append(False)
    for a_,b_ in run:newT.append([b_,a_,c])
P=np.array(P);UV=np.array(UV);L=np.array(Ll);weld=np.array(weld);dist=np.array(dist);vcol=np.array(vcol);vlum=np.array(vlum);redness=np.array(redness);TAIL=np.array(TAIL);N=len(P)
ax=np.abs(P[:,0]);yb=P[:,1]
if newT:I=np.vstack([I,np.array(newT,dtype=I.dtype)])
print('holes patched',len(newT),'triangles')
# ---- weights: blend across each joint along the child bone ----
BONES=['pelvis','spine','chest','headG','shL','elbowL','gloveL','shR','elbowR','gloveR','hipL','kneeL','hipR','kneeR']
PARENT={'pelvis':None,'spine':'pelvis','chest':'spine','headG':'spine','hipL':'pelvis','hipR':'pelvis','kneeL':'hipL','kneeR':'hipR',
        'shL':'chest','shR':'chest','elbowL':'shL','elbowR':'shR','gloveL':'elbowL','gloveR':'elbowR'}
LB={'head':'headG','spine':'spine','pelvis':'pelvis'}
for s in 'LR':
  for k in ('sh','elbow','glove','hip','knee'):LB[k+s]=k+s
# joints between (parent label, child label): position, direction of the child bone, half-width of the blend
JT=[('pelvis','spine',J['spine'],np.array([0,1,0.]),.045),('spine','head',J['headG']+[0,-.012,0],np.array([0,1,0.]),.022)]
for s in 'LR':
  JT+=[('spine','sh'+s,J['sh'+s],None,.03),('sh'+s,'elbow'+s,J['elbow'+s],None,.028),('elbow'+s,'glove'+s,J['glove'+s]+[0,.045,-.02],None,.012),
       ('pelvis','hip'+s,J['hip'+s]+[0,-.01,0],None,.03),('hip'+s,'knee'+s,J['knee'+s],None,.03)]
CHILDSEG={'sh':('sh','elbow'),'elbow':('elbow','glove'),'glove':('elbow','glove'),'hip':('hip','knee'),'knee':('knee','ankle')}
JT2=[]
for a,b,p,d,w in JT:
  if d is None:
    base=b[:-1];s=b[-1];x,y=CHILDSEG[base];d=J[y+s]-J[x+s];d=d/np.linalg.norm(d)
  JT2.append((a,b,p,d,w))
W=np.zeros((N,len(BONES)))
def ss(e0,e1,x):t=np.clip((x-e0)/(e1-e0),0,1);return t*t*(3-2*t)
for i in range(N):
  l=L[i];cand=[jt for jt in JT2 if l in (jt[0],jt[1])]
  if not cand:W[i,BONES.index(LB[l])]=1;continue
  jt=min(cand,key=lambda jt:np.linalg.norm(P[i]-jt[2]))
  a,b,p,d,w=jt;s_=float((P[i]-p)@d);wb=ss(-w,w,s_)
  # the deltoid cap follows the arm more than the chest
  if b.startswith('sh'):wb=max(wb,ss(-w*2.2,0,s_)*.8) if ax[i]>CFG['deltX'] else wb*.6
  W[i,BONES.index(LB[b])]+=wb;W[i,BONES.index(LB[a])]+=1-wb
# light smoothing of weights over the surface (two passes), then keep the top 4
# (only across real joints: neighbours on a part that is not jointed to this one, such as a glove resting on the shorts, are ignored)
OK={l:{l} for l in LAB}
for a_,b_,*_ in JT2:OK[a_].add(b_);OK[b_].add(a_)
for _ in range(2):
  W2=W.copy()
  for i in range(N):
    nb=[j for j,_ in adj[i] if L[j] in OK[L[i]]]
    if nb:W2[i]=.5*W[i]+.5*W[nb].mean(0)
  # gloves and the head stay rigid
  rig=np.isin(L,['gloveL','gloveR','head'])&(np.array([dist[i] for i in range(N)])>.02)
  W2[rig]=W[rig];W=W2
# welded duplicates share weights exactly
W=W.copy();W[np.arange(N)]=W[weld]
idx=np.argsort(-W,1)[:,:4];wt=np.take_along_axis(W,idx,1);wt/=wt.sum(1,keepdims=True)
# ---- scale into game units: 2.42 tall, feet on y=0, centred ----
y0=P[:,1].min();S=2.42/(P[:,1].max()-y0);ctr=np.array([0,y0,np.median(P[:,2])])
G=lambda v:((np.asarray(v)-ctr)*S)
P2=G(P);JG={k:G(v).round(5).tolist() for k,v in J.items()}
# ---- eye swelling morph targets ----
nrm=np.zeros_like(P)
fn=np.cross(P[I[:,1]]-P[I[:,0]],P[I[:,2]]-P[I[:,0]])
for k in range(3):np.add.at(nrm,I[:,k],fn)
nrm=nrm[weld];nrm/=np.linalg.norm(nrm,axis=1,keepdims=True)+1e-12
e0=CFG['eye'];EYE={'L':np.array(e0,float),'R':np.array([-e0[0],e0[1],e0[2]],float)}
# snap eyes to the surface: nearest front-facing head vertex
m=(L=='head')&(nrm[:,2]>.3);c=np.where(m)[0];EYE['R']=P[c[np.argmin(np.linalg.norm(P[c]-EYE['R'],axis=1))]]
EYE['L']=EYE['R']*[-1,1,1]   # the mesh is slightly asymmetric; mirror the cleaner side
morph={}
for s in 'LR':
  d=np.linalg.norm(P-EYE[s]-[0,.004,0],axis=1);g=np.exp(-(d/.013)**2)*(L=='head')
  dv=(nrm*.0075+[0,-.002,.002])*g[:,None];dv[g<.02]=0;morph['swell'+s]=(dv*S).astype(np.float32)
# face landmarks measured on the midline profile (raw units)
LM={k:np.array(v,float) for k,v in CFG['LM'].items()}
def ssn(e0,e1,x):t=np.clip((x-e0)/(e1-e0),0,1);return t*t*(3-2*t)
# body bulk: muscle pushed out along the normal, by bone (weights blend it across joints); heads and gloves keep their size
AMT={'pelvis':.006,'spine':.0105,'chest':.0105,'headG':0,'shL':.0095,'shR':.0095,'elbowL':.0065,'elbowR':.0065,'gloveL':0,'gloveR':0,'hipL':.008,'hipR':.008,'kneeL':.0048,'kneeR':.0048}
am=W@np.array([AMT[b] for b in BONES]);morph['bulk']=((nrm*am[:,None])*S).astype(np.float32)
# belly: the lower front of the torso rounds out, the waist widens a little
tor=np.isin(L,['spine','pelvis'])
gb=np.exp(-((P[:,1]-CFG['bellyY'])/.07)**2-(P[:,0]/.09)**2)*tor*ssn(-.02,.04,P[:,2])
gw=np.exp(-((P[:,1]-CFG['bellyY']+.02)/.07)**2)*tor
morph['belly']=((np.stack([np.sign(P[:,0])*.016*gw,0*gw,.034*gb],1))*S).astype(np.float32)
# jaw open: the chin and lower lip swing down about a pivot under the ears
hd=(L=='head')&~TAIL;piv=np.array([0,CFG['jawY'],-.005]);a=.32
wj=hd*ssn(LM['mouth'][1]+.001,LM['mouth'][1]-.006,P[:,1])*ssn(.0,.035,P[:,2])*(P[:,1]>LM['chinB'][1]-.02)
q=P-piv;ry=q[:,1]*np.cos(a)-q[:,2]*np.sin(a);rz=q[:,1]*np.sin(a)+q[:,2]*np.cos(a)
morph['jaw']=((np.stack([0*ry,ry-q[:,1],rz-q[:,2]],1)*wj[:,None])*S).astype(np.float32)
# brows: down and in (anger), inner ends up (hurt)
bd=np.zeros_like(P);bu=np.zeros_like(P)
for sg in (1,-1):
  c=EYE['R']*[-sg,1,1]+[0,.013,.002]
  g=np.exp(-(np.linalg.norm(P-c,axis=1)/.017)**2)*hd;bd+=np.stack([-sg*.003*g,-.006*g,.002*g],1)
  ci=c+[-sg*.008,.002,.002];g2=np.exp(-(np.linalg.norm(P-ci,axis=1)/.015)**2)*hd;bu+=np.stack([0*g2,.0065*g2,.001*g2],1)
morph['browDown']=(bd*S).astype(np.float32);morph['browUp']=(bu*S).astype(np.float32)
MORPHS=['swellL','swellR','bulk','belly','jaw','browDown','browUp']
# tuck the modelled ponytail away (into the back of the head) when a fighter wears another style
if CFG['tail']:
  TT=TAIL|((L=='head')&(P[:,2]<-.062)&(P[:,1]<.40)&(ax<.035)&(vlum<90))
  tg=P.copy();tg[:,1]=np.where(P[:,1]<.39,.39+(P[:,1]-.39)*.08,P[:,1]);tg[:,2]=np.maximum(P[:,2],-.066);tg[:,0]=P[:,0]*.6
  morph['tail']=(((tg-P)*TT[:,None])*S).astype(np.float32);MORPHS.append('tail')
# ---- damage spots in 3D (game units); the game paints bruises by surface distance, so UV seams never cut them ----
SPOT={'eyeL':EYE['L']+[0,.004,0],'eyeR':EYE['R']+[0,.004,0],'cheekL':EYE['L']+[.004,-.018,-.004],'cheekR':EYE['R']+[-.004,-.018,-.004],
      'nose':LM['nose']+[0,.02,-.008],'browL0':EYE['L']+[-.006,.014,.002],'browL1':EYE['L']+[.016,.016,-.006]}
spots={k:G(v).round(4).tolist() for k,v in SPOT.items()}
# ---- material mask, painted per triangle in UV space ----
T=np.array(img).astype(float);TH,TW=T.shape[:2]
MS=1024;mask=Image.new('L',(MS,MS),0);md=ImageDraw.Draw(mask);ymap=Image.new('L',(MS,MS),0);yd=ImageDraw.Draw(ymap);amap=Image.new('L',(MS,MS),0);ad=ImageDraw.Draw(amap)
MAT={'skin':1,'hair':2,'trunks':3,'band':4,'glove':5,'boot':6,'sock':7,'face':8,'top':9}
lum=lambda c:.299*c[...,0]+.587*c[...,1]+.114*c[...,2]
C=P[I].mean(1);uvc=UV[I].mean(1);tl=L[I[:,0]]
# triangle label by majority of its vertices
tl=np.array([max(set(L[t]),key=list(L[t]).count) for t in I])
def pick(px,py):return T[np.clip(int(py*TH),0,TH-1),np.clip(int(px*TW),0,TW-1)]
for ti,t in enumerate(I):
  y=C[ti,1];x=abs(C[ti,0]);lb=tl[ti];col=pick(*uvc[ti]);lu=lum(col)
  if lb.startswith('glove'):m='glove'
  elif lb=='head':m='hair' if (lu<CFG['hairLum'] and (y>CFG['hairY'] or C[ti,2]<.02)) else 'face'
  elif y<CFG['boot']:m='boot'
  elif y<CFG['sock']:m='sock'
  elif lb.startswith('knee'):m='skin'
  elif CFG['band'][0]<y<CFG['band'][1] and lu>150 and not lb.startswith(('sh','elbow')):m='band'
  elif CFG['trunks'][0]<y<CFG['trunks'][1] and lu<110 and not lb.startswith(('sh','elbow')):m='trunks'
  elif CFG['top'] and CFG['top'][0]<y<CFG['top'][1] and lu<120 and lb=='spine':m='top'
  else:m='skin'
  pts=[(float(UV[v,0]*MS),float(UV[v,1]*MS)) for v in t]
  md.polygon(pts,fill=MAT[m]);yd.polygon(pts,fill=int(np.clip((y+.5)*250,1,255)));ad.polygon(pts,fill=2 if lb.startswith('glove') else 1 if lb.startswith(('elbow','sh')) else 0)
# grow islands by a few pixels so filtering at edges reads the right material
mk=np.array(mask)
for _ in range(6):
  z=mk==0;g=mk.copy()
  for dy,dx in ((0,1),(0,-1),(1,0),(-1,0)):
    sh_=np.roll(np.roll(mk,dy,0),dx,1);g=np.where(z&(g==0),sh_,g)
  mk=g
# inside the trunks/band/skin islands refine by the texel colour itself (the band and the trunks share islands)
big=np.array(img.resize((MS,MS),Image.BILINEAR)).astype(float);bl_=lum(big)
mk=np.where((mk==3)&(bl_>165),4,mk);mk=np.where((mk==4)&(bl_<90),3,mk);mk=np.where((mk==9)&(bl_>140),1,mk)
# glove leather painted onto forearm triangles (the cuffs): red texels inside skin islands belong to the glove
red=(big[...,0]-(big[...,1]+big[...,2])/2>60)&(big[...,1]<.55*big[...,0])
mk=np.where((mk==1)&red,5,mk)
if sex=='f':
  # the sports top and shorts share islands with skin: neutral dark grey texels are cloth, warm light texels are skin
  yv=np.array(ymap).astype(float)/250-.5;r_,g_,b_=big[...,0],big[...,1],big[...,2]
  neutral=(np.abs(r_-b_)<14)&(bl_<105);warm=(r_-b_>22)&(bl_>70)
  am_=np.array(amap);body=((mk==1)|(mk==3)|(mk==9))&(am_==0)
  mk=np.where(body&neutral&(yv>.12)&(yv<.31),9,mk);mk=np.where(body&neutral&(yv>-.15)&(yv<.075),3,mk)
  mk=np.where(((mk==9)|(mk==3))&warm,1,mk)
  # shorts texture painted onto a fused forearm or glove reads as that arm part instead
  mk=np.where((am_==2)&(mk!=0),5,mk);mk=np.where((am_==1)&((mk==3)|(mk==9)),1,mk)
# above the brows every dark head texel is hair (the painted hairline is ragged braids/strands; split between hair and face it
# shows as a sawtooth once a fitted style turns the painted hair to scalp)
yv_=np.array(ymap).astype(float)/250-.5
mk=np.where(((mk==8)|(mk==2))&(yv_>EYE['L'][1]+.024)&(bl_<105),2,mk)
mask=Image.fromarray(mk.astype(np.uint8))
# reference colour of each material (median of the texels it covers), used as the recolor anchor
ref={}
for n,v in MAT.items():
  sel=big[mk==v]
  if len(sel):ref[n]=np.median(sel,0).round(1).tolist()
# ---- write ----
tex=img.resize((2048,2048),Image.LANCZOS) if img.size[0]!=2048 else img
buf=io.BytesIO();tex.save(buf,'JPEG',quality=86);jpg=buf.getvalue()
mbuf=io.BytesIO();mask.save(mbuf,'PNG',optimize=True);mpng=mbuf.getvalue()
blobs=[P2.astype(np.float32).tobytes(),UV.astype(np.float32).tobytes(),I.astype(np.uint32).ravel().tobytes(),idx.astype(np.uint8).tobytes(),wt.astype(np.float32).tobytes(),jpg,mpng]+[morph[k].tobytes() for k in MORPHS]
def pad(b):return b+b'\0'*((4-len(b)%4)%4)
bin_=b'';views=[]
for b in blobs:views.append({'buffer':0,'byteOffset':len(bin_),'byteLength':len(b)});bin_+=pad(b)
X={'bones':BONES,'parent':PARENT,'joints':{k:JG[k] for k in JG},'eyes':{s:G(EYE[s]).round(4).tolist() for s in 'LR'},'spots':spots,'lm':{k:G(v).round(4).tolist() for k,v in LM.items()},'morphs':MORPHS,'mat':MAT,'sex':sex,'native':'braids' if sex=='f' else 'short','ref':ref,'scale':S}
Jn={'asset':{'version':'2.0','generator':'twelve-rounds rig_boxer'},'buffers':[{'byteLength':len(bin_)}],'bufferViews':views,
 'accessors':[{'bufferView':0,'componentType':5126,'count':N,'type':'VEC3','min':P2.min(0).tolist(),'max':P2.max(0).tolist()},{'bufferView':1,'componentType':5126,'count':N,'type':'VEC2'},
   {'bufferView':2,'componentType':5125,'count':int(I.size),'type':'SCALAR'},{'bufferView':3,'componentType':5121,'count':N,'type':'VEC4'},{'bufferView':4,'componentType':5126,'count':N,'type':'VEC4'},
   ]+[{'bufferView':7+i,'componentType':5126,'count':N,'type':'VEC3'} for i in range(len(MORPHS))],
 'images':[{'bufferView':5,'mimeType':'image/jpeg'},{'bufferView':6,'mimeType':'image/png','name':'mask'}],'textures':[{'source':0}],
 'materials':[{'pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicFactor':0,'roughnessFactor':.9}}],
 'meshes':[{'primitives':[{'attributes':{'POSITION':0,'TEXCOORD_0':1,'JOINTS_0':3,'WEIGHTS_0':4},'targets':[{'POSITION':5+i} for i in range(len(MORPHS))],'indices':2,'material':0}],'extras':X}],
 'nodes':[{'mesh':0}],'scenes':[{'nodes':[0]}],'scene':0}
jb=json.dumps(Jn,separators=(',',':')).encode();jb+=b' '*((4-len(jb)%4)%4)
out=struct.pack('<4sII',b'glTF',2,12+8+len(jb)+8+len(bin_))+struct.pack('<I4s',len(jb),b'JSON')+jb+struct.pack('<I4s',len(bin_),b'BIN\0')+bin_
open(dst,'wb').write(out)
from collections import Counter
print('verts',N,'tris',len(I),'jpg',len(jpg),'mask',len(mpng),'glb',len(out));print(Counter(L));print('ref',ref);print('spots',spots)
if dbg:json.dump({'P':P2.round(4).tolist(),'L':L.tolist(),'I':I.tolist(),'J':JG},open(dbg,'w'))
