import osmium,json,re,time
exec(open('pbf2json.py').read().split('out=[]')[0])
t0=time.time();out=[];wn={}
fp=osmium.FileProcessor('india.pbf',osmium.osm.NODE|osmium.osm.WAY|osmium.osm.RELATION).with_filter(osmium.filter.KeyFilter('name','religion','building','amenity','historic'))
rels=[]
for o in fp:
  t=dict(o.tags)
  if not want(t) or (o.is_way() and 'highway' in t): continue
  if o.is_node(): out.append(dict(type='node',id=o.id,lat=o.location.lat,lon=o.location.lon,tags=t))
  elif o.is_way(): wn[o.id]=([n.ref for n in o.nodes],t)
  else: rels.append((o.id,[m.ref for m in o.members if m.type=='w'],t))
print('pass1',len(out),len(wn),len(rels),time.time()-t0,flush=True)
# relation member ways need node refs: pass for those ways
need_w={w for _,ms,_ in rels for w in ms}-set(wn)
extra={}
if need_w:
  for o in osmium.FileProcessor('india.pbf',osmium.osm.WAY).with_filter(osmium.filter.IdFilter(need_w)):
    extra[o.id]=[n.ref for n in o.nodes]
ids={n for v in wn.values() for n in v[0]}|{n for v in extra.values() for n in v}
loc={}
for o in osmium.FileProcessor('india.pbf',osmium.osm.NODE).with_filter(osmium.filter.IdFilter(ids)):
  loc[o.id]=(o.location.lat,o.location.lon)
def cen(refs):
  ps=[loc[r] for r in refs if r in loc]
  return dict(lat=sum(p[0] for p in ps)/len(ps),lon=sum(p[1] for p in ps)/len(ps)) if ps else None
for i,(refs,t) in wn.items():
  c=cen(refs)
  if c: out.append(dict(type='way',id=i,center=c,tags=t))
for i,ms,t in rels:
  refs=[r for m in ms for r in (wn.get(m,(None,))[0] or extra.get(m,[]))]
  c=cen(refs)
  if c: out.append(dict(type='relation',id=i,center=c,tags=t))
json.dump({'elements':out},open('osm2.json','w'));print('OSM',len(out),time.time()-t0)
