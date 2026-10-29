import json,re,math,collections,sys
ex=json.load(open('all.json'))
ids={e['id'] for e in ex}
M=re.compile(r"masjid|masjeed|musjid|mosque|jamia|jumma|juma masj|idgah|eidgah|edgah|idga|dargah|dargha|durgah|ziyarat|takia|takiya|thakiya|khanqah|musall|namaz|namaaz|ಮಸೀದಿ|ಮಸ್ಜಿದ್|ದರ್ಗಾ|مسجد",re.I)
PR=re.compile(r"prayer (room|hall|area)|namaz|namaaz|musall",re.I)
BAD=re.compile(r"\b(road|rd|street|stop|cross|main|nagar|layout|colony|circle|bus|metro station|school|hotel|restaurant|biryani|store|shop|traders|medical|apartments?|lane|bakery|chicken|mutton|tea|stores)\b|jamia millia|halt",re.I)
NONMUS=re.compile(r"temple|church|gurudwara|mandir|chapel|cathedral|devasthana|swamy|swami|ashram|basadi|jain|matha|mutt",re.I)
def typ(n):
  n=n.lower()
  if re.search(r'dargah|dargha|durgah|ziyarat|khanqah|ದರ್ಗಾ|tomb|maqbara|takia|takiya|thakiya',n): return 'dargah'
  if re.search(r'idgah|eidgah|edgah|idga\b',n): return 'idgah'
  if PR.search(n) or 'prayer' in n: return 'prayer_room'
  return 'mosque'
def dist(a,b,c,d): return math.hypot((a-c)*111000,(b-d)*111000*math.cos(math.radians(a)))
pts=[(e['lat'],e['lng'],e['name']) for e in ex]
def norm(s): return re.sub(r'masjid|masjeed|mosque|jamia|jumma|\W|\be\b','',(s or '').lower())
def dup(la,lo,nm,pr):
  n=norm(nm)
  for a,b,m in pts:
    if abs(a-la)>0.002 or abs(b-lo)>0.002: continue
    d=dist(a,b,la,lo)
    if pr: 
      if d<25 and (PR.search(m) or 'prayer' in m.lower()): return True
      continue
    if d<35: return True
    if d<100 and (not n or not norm(m) or n in norm(m) or norm(m) in n): return True
  return False
new=[];st=collections.Counter()
for e in json.load(open('osm.json'))['elements']:
  t=e.get('tags',{});nm=t.get('name:en') or t.get('name') or ''
  rel=(t.get('religion') or '').lower()
  la=e.get('lat') or e.get('center',{}).get('lat');lo=e.get('lon') or e.get('center',{}).get('lon')
  if la is None: continue
  pr=t.get('amenity')=='prayer_room' or t.get('room')=='prayer' or bool(PR.search(nm)) or rel=='multifaith'
  mus=rel in('muslim','islam') or t.get('building')=='mosque'
  if rel and rel not in('muslim','islam','multifaith'): st['otherrel']+=1;continue
  if NONMUS.search(nm): continue
  if not(mus or pr or (M.search(nm) and not BAD.search(nm))): continue
  if t.get('landuse')=='cemetery' or re.search(r'qabr|khabr|grave',nm,re.I):
    st['cemetery']+=1; continue  # cemeteries alone are not prayer places
  if not nm:
    if pr: nm='Prayer Room'
    elif mus: nm={'tomb':'Dargah','shrine':'Dargah'}.get(t.get('historic'),'Masjid (unnamed)')
  ty='prayer_room' if pr and not M.search(re.sub('musall|namaz','',nm,flags=re.I)) else typ(nm+' '+t.get('historic',''))
  if pr: ty='prayer_room'
  host=None
  if ty=='prayer_room':
    host=' '.join(x for x in [t.get('addr:housename'),t.get('level') and 'Level '+t['level'],t.get('addr:street'),t.get('addr:suburb')] if x) or None
    if nm.lower() in('prayer room','prayer hall','namaz room','musalla') and t.get('operator'): nm=f"{nm} - {t['operator']}"
  i=f"osm-{e['type']}-{e['id']}"
  if i in ids: st['dupid']+=1;continue
  if dup(la,lo,nm,ty=='prayer_room'): st['dupgeo']+=1;continue
  ids.add(i);pts.append((la,lo,nm))
  addr=host or (' '.join(x for x in [t.get('addr:housenumber'),t.get('addr:street'),t.get('addr:suburb')] if x) or None)
  new.append(dict(id=i,src='osm',sid=f"{e['type']}/{e['id']}",name=nm,type=ty,lat=la,lng=lo,addr=addr,status='verified' if (mus or pr or t.get('amenity')=='place_of_worship') else 'pending',women=None))
try: ov=json.load(open('ov.json'))
except Exception: ov=[]
for o in ov:
  nm=o['name'] or ''
  if NONMUS.search(nm): continue
  pr=bool(PR.search(nm)); m=bool(M.search(nm))
  if not(o['strong'] or m or pr): continue
  if BAD.search(nm) and not o['strong'] and not pr: continue
  c=o['conf'] or 0
  if c<0.3: continue
  ty='prayer_room' if pr else typ(nm)
  i='ovt-'+o['id'][:20]
  if i in ids: st['dupid']+=1;continue
  if dup(o['lat'],o['lng'],nm,ty=='prayer_room'): st['dupgeo']+=1;continue
  ids.add(i);pts.append((o['lat'],o['lng'],nm))
  ok=(o['strong'] and c>=0.4) or (m and c>=0.6) or (pr and c>=0.5)
  new.append(dict(id=i,src='overture',sid=o['id'],name=nm,type=ty,lat=o['lat'],lng=o['lng'],addr=o['addr'],status='verified' if ok else 'pending'))
print(st, len(new), collections.Counter((n['src'],n['type'],n['status']) for n in new))
json.dump(new,open('new.json','w'),ensure_ascii=False,indent=0)
