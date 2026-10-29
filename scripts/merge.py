import json,re,math,collections,unicodedata
ex=json.load(open('existing.json'))
STRONG=re.compile(r"masjid|masjeed|musjid|mosque|jama masj|jamia masj|juma masj|jumma|musalla|musallah|idgah|eidgah|edgah|dargah|dargha|durgah|ziyarat|khanqah|مسجد|मस्जिद|ಮಸೀದಿ|ಮಸ್ಜಿದ್|മസ്ജിദ്|ജുമാ|பள்ளிவாசல்|மஸ்ஜித்|మసీదు|মসজিদ|दरगाह|ईदगाह|درگاہ|عیدگاہ",re.I)
BAD=re.compile(r"\b(road|rd|street|st|stop|station|nagar|colony|layout|cross|main|school|college|university|hospital|clinic|hotel|restaurant|bakery|store|shop|traders|enterprises|medical|pharmacy|apartments?|residency|gate|circle|metro|market|complex|lane|bus|chowk|bazaar|bazar|tea|biryani|mess|salon|tailors?|electricals?|mobiles?|garage|travels|stores|centre point|ward|post office|bank|atm|petrol|towers?|enclave|plaza|halt|junction|flyover|parking|pg|hostel|ground)\b|jamia millia",re.I)
def norm(s): s=unicodedata.normalize('NFKD',s or '').lower(); s=re.sub(r'masjid|masjeed|musjid|mosque|e |-e-|jama|jamia|jumma|juma|the|\W','',s); return s
def typ(n):
  n=(n or '').lower()
  if re.search(r'dargah|dargha|durgah|ziyarat|khanqah|दरगाह|درگاہ|shrine|tomb|maqbara',n): return 'dargah'
  if re.search(r'idgah|eidgah|edgah|ईदगाह|عیدگاہ',n): return 'idgah'
  if re.search(r'musalla|prayer room|prayer hall|namaz',n): return 'prayer_room'
  return 'mosque'
G=collections.defaultdict(list)
def key(la,lo): return (int(la*500),int(lo*500))  # ~200m cells
def add(r): G[key(r['lat'],r['lng'])].append(r)
def near(la,lo,R):
  k=key(la,lo);out=[]
  for i in(-1,0,1):
    for j in(-1,0,1):
      for r in G[(k[0]+i,k[1]+j)]:
        d=math.hypot((r['lat']-la)*111000,(r['lng']-lo)*111000*math.cos(math.radians(la)))
        if d<=R: out.append((d,r))
  return out
seen=set()
for e in ex:
  r=dict(id=e[0],name=e[1],lat=float(e[2]),lng=float(e[3]),city=e[5],state=e[6],new=False);add(r)
  for k,v in (e[4] or {}).items():
    for x in v: seen.add(f'{k}:{x}')
CG=collections.defaultdict(list)
for e in ex:
  if e[5] and e[5]!='Unknown': CG[(int(float(e[2])*10),int(float(e[3])*10))].append(e)
def geo(la,lo):
  k=(int(la*10),int(lo*10));best=None
  for i in(-1,0,1):
    for j in(-1,0,1):
      for e in CG[(k[0]+i,k[1]+j)]:
        d=(float(e[2])-la)**2+(float(e[3])-lo)**2
        if best is None or d<best[0]: best=(d,e)
  return (best[1][5],best[1][6]) if best and best[0]<0.12**2 else (None,None)
def isdup(c):
  n=norm(c['name'])
  for d,r in near(c['lat'],c['lng'],150):
    rn=norm(r['name'])
    if d<=35: return True
    if d<=75 and (not n or not rn or n==rn or n in rn or rn in n): return True
    if n and n==rn: return True
  return False
cands=[]
# OSM
for e in json.load(open('osm.json'))['elements']:
  t=e.get('tags',{});nm=t.get('name:en') or t.get('name') or ''
  rel=(t.get('religion') or '').lower()
  if rel not in('','muslim','islam'): continue
  la=e.get('lat') or e.get('center',{}).get('lat');lo=e.get('lon') or e.get('center',{}).get('lon')
  if la is None: continue
  m=bool(STRONG.search(t.get('name','')+' '+nm))
  tagged=rel in('muslim','islam') or t.get('building')=='mosque'
  if not tagged and (not m or BAD.search(nm)): continue
  if not nm: nm={'dargah':'Dargah','idgah':'Idgah'}.get(typ(t.get('historic','')),'Masjid (unnamed)') if tagged else None
  if not nm: continue
  ctx=t.get('amenity')=='place_of_worship' or t.get('building') in('mosque','religious') or t.get('landuse')=='religious' or t.get('historic') in('tomb','shrine')
  st='verified' if tagged or ctx else 'pending'
  cands.append(dict(src='osm',sid=f"{e['type']}/{e['id']}",id=f"osm-{e['type']}-{e['id']}",name=nm,name_local=t.get('name') if t.get('name')!=nm else None,lat=la,lng=lo,status=st,type=typ(nm+' '+t.get('historic','')),addr=' '.join(x for x in [t.get('addr:housenumber'),t.get('addr:street'),t.get('addr:suburb')] if x) or None,phone=t.get('phone'),website=t.get('website'),city=t.get('addr:city'),state=t.get('addr:state')))
# Overture
for o in json.load(open('ov.json')):
  nm=o['name'] or '';m=bool(STRONG.search(nm));c=o['conf'] or 0
  if BAD.search(nm) and not o['strong']: continue
  if o['strong'] and m: st='verified' if c>=0.3 else 'pending'
  elif o['strong']: st='verified' if c>=0.6 else ('pending' if c>=0.3 else None)
  elif m and o['weak']: st='verified' if c>=0.5 else ('pending' if c>=0.3 else None)
  elif m: st='pending' if c>=0.5 else None
  else: st=None
  if not st or not nm: continue
  cands.append(dict(src='overture',sid=o['id'],id='ovt-'+o['id'][:20],name=nm,name_local=None,lat=o['lat'],lng=o['lng'],status=st,type=typ(nm),addr=o['addr'],phone=o['phone'],website=o['website'],city=o['city'],state=o['region']))
# Wikidata
for f,need in(('wd_Q32815.json',False),('wd_Q1370598.json',True)):
  for b in json.load(open(f))['results']['bindings']:
    nm=b.get('l',{}).get('value');q=b['i']['value'].rsplit('/',1)[1]
    if not nm or (need and not STRONG.search(nm)): continue
    mm=re.match(r'Point\(([-\d.]+) ([-\d.]+)\)',b['c']['value'])
    if not mm: continue
    cands.append(dict(src='wikidata',sid=q,id='wd-'+q,name=nm,name_local=None,lat=float(mm[2]),lng=float(mm[1]),status='verified',type=typ(nm),addr=None,phone=None,website=None,city=None,state=None))
order={'osm':0,'wikidata':1,'overture':2}
cands.sort(key=lambda c:(order[c['src']],c['status']!='verified'))
new=[];ids=set(e[0] for e in ex);stat=collections.Counter()
for c in cands:
  if not(6<c['lat']<37.5 and 68<c['lng']<98): continue
  if f"{c['src']}:{c['sid']}" in seen or c['id'] in ids: stat['dup_id',c['src']]+=1;continue
  if isdup(c): stat['dup_geo',c['src']]+=1;continue
  ci,stt=geo(c['lat'],c['lng'])
  if not ci: stat['outside_india?',c['src']]+=1; continue  # far from any known place: likely outside India or no geotag
  c['city'],c['state']=ci,stt
  ids.add(c['id']);new.append(c);add(dict(name=c['name'],lat=c['lat'],lng=c['lng']))
  stat['new',c['src'],c['status']]+=1
for k,v in sorted(stat.items(),key=str): print(k,v)
print('NEW',len(new),'BLR',sum(c['city']=='Bengaluru' for c in new))
json.dump(new,open('new.json','w'))
