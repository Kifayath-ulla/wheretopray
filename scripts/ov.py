import pyarrow.dataset as ds, pyarrow.fs as pfs, pyarrow.compute as pc, urllib.request,re,json
from shapely import wkb
x=urllib.request.urlopen("https://overturemaps-us-west-2.s3.amazonaws.com/?list-type=2&prefix=release/&delimiter=/").read().decode()
rel=sorted(re.findall(r'<Prefix>release/([^/<]+)/</Prefix>',x))[-1];print(rel,flush=True)
fs=pfs.S3FileSystem(anonymous=True,region="us-west-2")
d=ds.dataset(f"overturemaps-us-west-2/release/{rel}/theme=places/type=place/",filesystem=fs,format="parquet")
F=lambda k: pc.field(("bbox",k))
f=(F("xmin")>68)&(F("xmin")<98)&(F("ymin")>6)&(F("ymin")<37.5)
rx=re.compile(r"masjid|masjeed|musjid|mosque|jama masj|jamia|jumma|musalla|idgah|eidgah|edgah|dargah|dargha|durgah|ziyarat|khanqah|مسجد|मस्जिद|ಮಸೀದಿ|ಮಸ್ಜಿದ್|മസ്ജിദ്|ജുമാ|பள்ளிவாசல்|மஸ்ஜித்|మసీదు|মসজিদ|दरगाह|ईदगाह|درگاہ|عیدگاہ",re.I)
CATS={"mosque","islamic_place_of_worship","muslim_place_of_worship"}
WEAK={"place_of_worship","religious_organization","islamic_center","community_center","spiritual_center","cultural_center","religious_school","madrasa","shrine","landmark_and_historical_building"}
out=[];n=0
for b in d.to_batches(filter=f,columns=["id","names","taxonomy","basic_category","confidence","geometry","addresses","phones","websites"],batch_size=50000):
  for r in b.to_pylist():
    n+=1
    nm=(r["names"] or {}).get("primary") or ""; t=r["taxonomy"] or {}; cat=t.get("primary") or ""
    alls=set((t.get("alternates") or [])+(t.get("hierarchy") or [])+[cat,r["basic_category"] or ""])
    strong=bool(alls&CATS); m=bool(rx.search(nm))
    if not(strong or m): continue
    a=(r["addresses"] or [{}])[0] or {}
    if a.get("country") not in (None,"IN"): continue
    g=wkb.loads(r["geometry"])
    out.append(dict(id=r["id"],name=nm,cat=cat,strong=strong,weak=bool(alls&WEAK),conf=r["confidence"],lat=g.y,lng=g.x,addr=a.get("freeform"),city=a.get("locality"),region=a.get("region"),phone=(r["phones"] or [None])[0],website=(r["websites"] or [None])[0]))
  print(n,len(out),flush=True)
json.dump(out,open("ov.json","w"));print("FINAL",len(out))
