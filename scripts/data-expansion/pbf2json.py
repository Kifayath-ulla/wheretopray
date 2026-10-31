import osmium,json,re
NM=re.compile(r"masjid|masjeed|musjid|mosque|jama masj|jamia|jumma|musalla|musallah|idgah|eidgah|edgah|dargah|dargha|durgah|ziyarat|khanqah|imambara|ashurkhana|mazar|prayer room|namaz|مسجد|मस्जिद|ಮಸೀದಿ|ಮಸ್ಜಿದ್|മസ്ജിദ്|പള്ളി|பள்ளிவாசல்|மஸ்ஜித்|మసీదు|মসজিদ|दरगाह|ईदगाह|درگاہ|عیدگاہ",re.I)
def want(t):
  rel=t.get('religion','')
  if t.get('amenity')=='place_of_worship' and rel in('muslim','islam','multifaith'): return True
  if t.get('building')=='mosque' or t.get('amenity')=='prayer_room': return True
  if t.get('historic') in('tomb','shrine') and rel in('muslim','islam'): return True
  n=t.get('name','')+' '+t.get('name:en','')
  return bool(n.strip()) and bool(NM.search(n))
out=[]
class H(osmium.SimpleHandler):
  def node(s,n):
    t=dict(n.tags)
    if t and want(t): out.append(dict(type='node',id=n.id,lat=n.location.lat,lon=n.location.lon,tags=t))
  def area(s,a):
    t=dict(a.tags)
    if not(t and want(t)): return
    try:
      xs=[];ys=[]
      for r in a.outer_rings():
        for p in r: xs.append(p.lon);ys.append(p.lat)
      typ='way' if a.from_way() else 'relation'
      out.append(dict(type=typ,id=a.orig_id(),center=dict(lat=sum(ys)/len(ys),lon=sum(xs)/len(xs)),tags=t))
    except Exception: pass
  def way(s,w):
    t=dict(w.tags)
    if t and not w.is_closed() and want(t) and 'highway' not in t:
      try:
        ps=[(p.lat,p.lon) for p in w.nodes]
        out.append(dict(type='way',id=w.id,center=dict(lat=sum(p[0] for p in ps)/len(ps),lon=sum(p[1] for p in ps)/len(ps)),tags=t))
      except Exception: pass
H().apply_file('india.pbf',locations=True,idx='dense_file_array,/workspace/wtp2/nodes.idx')
json.dump({'elements':out},open('osm2.json','w'));print('OSM',len(out))
