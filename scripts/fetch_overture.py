"""Fetch Overture Maps Places for the Bengaluru bbox via pyarrow (anonymous S3). License: CDLA-Permissive-2.0."""
import pyarrow.dataset as ds, pyarrow.fs as pfs, pyarrow.compute as pc, urllib.request,re,json
from shapely import wkb
x=urllib.request.urlopen("https://overturemaps-us-west-2.s3.amazonaws.com/?list-type=2&prefix=release/&delimiter=/").read().decode()
rel=sorted(re.findall(r'<Prefix>release/([^/<]+)/</Prefix>',x))[-1];print(rel,flush=True)
fs=pfs.S3FileSystem(anonymous=True,region="us-west-2")
d=ds.dataset(f"overturemaps-us-west-2/release/{rel}/theme=places/type=place/",filesystem=fs,format="parquet")
F=lambda k: pc.field(("bbox",k))
f=(F("xmin")>77.35)&(F("xmin")<77.85)&(F("ymin")>12.75)&(F("ymin")<13.20)
t=d.to_table(filter=f,columns=["id","names","taxonomy","basic_category","phones","websites","confidence","geometry","addresses","sources"])
print("bbox rows",t.num_rows,flush=True)
rx=re.compile(r'masjid|masjeed|mosque|jama|jamia|musalla|idgah|eidgah|dargah|dargha|ziyarat|madrasa',re.I)
out=[]
for r in t.to_pylist():
  n=(r["names"] or {}).get("primary") or ""; c=r["taxonomy"] or {}; cat=c.get("primary") or ""; alt=(c.get("alternates") or [])+(c.get("hierarchy") or [])+[r["basic_category"] or ""]
  if cat in("mosque","islamic_place_of_worship","muslim_place_of_worship") or "muslim_place_of_worship" in alt or "mosque" in alt or rx.search(n):
    g=wkb.loads(r["geometry"]); a=(r["addresses"] or [{}])[0] or {}
    out.append(dict(id=r["id"],name=n,cat=cat,confidence=r["confidence"],lat=g.y,lng=g.x,addr=a.get("freeform"),ds=[s["dataset"] for s in r["sources"] or []],rel=rel,phone=(r["phones"] or [None])[0],website=(r["websites"] or [None])[0]))
json.dump(out,open("data/raw/overture.json","w"),indent=0);print(len(out))
