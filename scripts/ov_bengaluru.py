import pyarrow.dataset as ds, pyarrow.fs as pfs, pyarrow.compute as pc, urllib.request,re,json
from shapely import wkb
x=urllib.request.urlopen("https://overturemaps-us-west-2.s3.amazonaws.com/?list-type=2&prefix=release/&delimiter=/").read().decode()
rel=sorted(re.findall(r'<Prefix>release/([^/<]+)/</Prefix>',x))[-1];print(rel,flush=True)
fs=pfs.S3FileSystem(anonymous=True,region="us-west-2")
d=ds.dataset(f"overturemaps-us-west-2/release/{rel}/theme=places/type=place/",filesystem=fs,format="parquet")
F=lambda k: pc.field(("bbox",k))
f=(F("xmin")>77.2)&(F("xmin")<78.0)&(F("ymin")>12.6)&(F("ymin")<13.45)
rx=re.compile(r"prayer|namaz|namaaz|musall|masjid|masjeed|musjid|mosque|jamia|jumma|juma |idgah|eidgah|edgah|idga|dargah|dargha|durgah|ziyarat|takia|takiya|khanqah|qabr|khabr|ಮಸೀದಿ|ಮಸ್ಜಿದ್|ದರ್ಗಾ|مسجد",re.I)
CATS={"mosque","islamic_place_of_worship","muslim_place_of_worship"}
out=[]
for b in d.to_batches(filter=f,columns=["id","names","taxonomy","basic_category","confidence","geometry","addresses"],batch_size=50000):
  for r in b.to_pylist():
    nm=(r["names"] or {}).get("primary") or ""; t=r["taxonomy"] or {}
    alls=set((t.get("alternates") or [])+(t.get("hierarchy") or [])+[t.get("primary") or "",r["basic_category"] or ""])
    if not(alls&CATS or rx.search(nm)): continue
    a=(r["addresses"] or [{}])[0] or {}; g=wkb.loads(r["geometry"])
    out.append(dict(id=r["id"],name=nm,cat=t.get("primary"),strong=bool(alls&CATS),conf=r["confidence"],lat=g.y,lng=g.x,addr=a.get("freeform")))
json.dump(out,open("ov.json","w"));print("FINAL",len(out))
