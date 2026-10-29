"""Merge OSM + Overture + Wikidata into data/places.json. Dedupe: normalized name + <75 m (or any two within 25 m when one is unnamed/generic)."""
import json,re,math,datetime,collections
now=datetime.datetime.now(datetime.UTC).isoformat()[:19]+"Z"
STRONG=re.compile(r'masjid|masjeed|masjed|mosque|dargah|dargha|darga\b|idgah|eidgah|eid gah|musall?ah?|ziyarat|jama\s*masjid|jamia masjid|prayer (room|hall)|namaz',re.I)
BAD=re.compile(r'school|education|college|real_estate|hotel|shopping|restaurant|naturopath|clinic|hospital|event|store|government|christian|hindu|temple|church',re.I)
def norm(n):
  n=n.lower();n=re.sub(r'\b(masjid[e-]?|masjeed|mosque|jama|jamia|jamiya|e|ul|al|-|the|sunni|shafi|hanafi|ahle|ahl)\b',' ',n)
  return re.sub(r'[^a-z0-9]','',n)
def dist(a,b):
  R=6371000;p=math.pi/180
  h=math.sin((b['lat']-a['lat'])*p/2)**2+math.cos(a['lat']*p)*math.cos(b['lat']*p)*math.sin((b['lng']-a['lng'])*p/2)**2
  return 2*R*math.asin(math.sqrt(h))
def classify(name,default='mosque'):
  n=name.lower()
  if re.search(r'dargah|dargha|darga\b|ziyarat|shrine|tomb',n):return 'dargah'
  if re.search(r'idgah|eidgah|eid gah',n):return 'idgah'
  if re.search(r'prayer room|namaz room|prayer hall',n):return 'prayer_room'
  if re.search(r'musall?ah?\b',n):return 'musalla'
  return default
def slug(s):return re.sub(r'^-+|-+$','',re.sub(r'[^a-z0-9]+','-',s.lower()))[:60] or 'place'
def base(**k):
  p=dict(name_local=None,address=None,area=None,city='Bengaluru',state='Karnataka',country='IN',denomination=None,women_section=None,wudu=None,parking=None,wheelchair=None,phone=None,website=None,jumuah_time=None,iqama_times=None,last_verified=now,status='verified')
  p.update(k);return p
cands=[]
seen=set()
for f in ['data/raw/osm.json','data/raw/osm-prev.json']:
  for p in json.load(open(f)):
    if p['id'] in seen:continue
    seen.add(p['id']);p['sources']=['osm'];p['source_ids']={'osm':[p['source_id']]};cands.append(p)
dropped=collections.Counter()
for o in json.load(open('data/raw/overture.json')):
  n=o['name'] or '';cat=o['cat'] or ''
  if not(12.70<=o['lat']<=13.35 and 77.30<=o['lng']<=77.90):continue
  ok=cat in('muslim_place_of_worship','mosque','islamic_place_of_worship') or (STRONG.search(n) and not BAD.search(cat))
  if not ok or (o['confidence'] or 0)<0.4 or re.search(r'hindu|temple|church|mandir|gurudwara|road\b|street|nagar main',n,re.I) and not STRONG.search(n):
    dropped[cat]+=1;continue
  if not n:continue
  cands.append(base(id='ovt-'+o['id'][:16],name=n,type=classify(n),lat=round(o['lat'],6),lng=round(o['lng'],6),address=o.get('addr'),phone=o.get('phone'),website=o.get('website'),
    source='overture',source_id=o['id'],sources=['overture'],source_ids={'overture':[o['id']]},overture_upstream=o.get('ds')))
for b in json.load(open('data/raw/wikidata.json'))['results']['bindings']:
  if not re.search(r'mosque|dargah|tomb|shrine|idgah',b['tl']['value'],re.I):continue
  m=re.match(r'Point\(([-\d.]+) ([-\d.]+)\)',b['c']['value']);qid=b['i']['value'].rsplit('/',1)[1]
  cands.append(base(id='wd-'+qid,name=b['l']['value'],type=classify(b['l']['value']),lat=float(m[2]),lng=float(m[1]),source='wikidata',source_id=qid,sources=['wikidata'],source_ids={'wikidata':[qid]}))
GEN=lambda n:norm(n) in('','unnamed','masjid')
out=[]
for c in cands:
  k=norm(c['name']);hit=None
  for q in out:
    d=dist(q,c)
    if d<75 and (norm(q['name'])==k or (k and (k in norm(q['name']) or norm(q['name']) in k) and len(k)>3) or d<25 and (GEN(q['name']) or GEN(c['name']))):
      hit=q;break
  if hit:
    for s in c['sources']:
      if s not in hit['sources']:hit['sources'].append(s)
      hit['source_ids'].setdefault(s,[]);hit['source_ids'][s]+= [x for x in c['source_ids'][s] if x not in hit['source_ids'][s]]
    if hit['name'].lower().startswith('unnamed') and not c['name'].lower().startswith('unnamed'):hit['name']=c['name']
    for f in('address','phone','website'):
      if not hit.get(f) and c.get(f):hit[f]=c[f]
  else:out.append(c)
# area: nearest OSM locality (ODbL) when the source has none
locs=[dict(n=e['tags'].get('name:en') or e['tags'].get('name'),lat=e['lat'],lng=e['lon'],k=e['tags']['place']) for e in json.load(open('data/raw/localities.json'))['elements'] if e.get('tags',{}).get('name')]
for p in out:
  if p.get('area'):continue
  best=None
  for l in locs:
    d=dist(p,l)
    lim=2500 if l['k'] in('suburb','neighbourhood','quarter') else 4000
    if d<lim and (best is None or d<best[0]):best=(d,l['n'])
  p['area']=best[1] if best else None
used=set()
for p in sorted(out,key=lambda p:p['name'].lower()):
  s=slug(p['name'])
  if s in used:s=f"{s}-{p['id'][-8:].lower().replace('/','-')}"
  s=slug(s);used.add(s);p['slug']=s
out.sort(key=lambda p:p['name'].lower())
json.dump(out,open('data/places.json','w'),separators=(',',':'))
print('total',len(out));print('type',collections.Counter(p['type'] for p in out))
print('primary source',collections.Counter(p['source'] for p in out))
print('source combos',collections.Counter('+'.join(sorted(p['sources'])) for p in out))
print('overture dropped by cat',dropped.most_common(10))
