#!/usr/bin/env python3
"""Convert a volunteer CSV, KML or GPX file into the JSON rows that the admin Bulk import accepts.
Usage: python3 scripts/to-bulk.py places.csv > rows.json
CSV columns: name, lat, lng (or latitude/longitude), optional type, area, city.
KML: Placemark name + Point coordinates. GPX: wpt lat/lon + name.
Then paste rows.json into Admin > Bulk (run "dedupe" first, then "import" as pending)."""
import sys,csv,json,re,xml.etree.ElementTree as ET
TYPES={"mosque","masjid","prayer_room","musalla","idgah","dargah"}
def guess(n):
  n=n.lower()
  if re.search(r"dargah|dargha|mazar|ziyarat",n): return "dargah"
  if re.search(r"idgah|eidgah",n): return "idgah"
  if re.search(r"musalla|prayer room|prayer hall|namaz",n): return "prayer_room"
  return "mosque"
def row(name,lat,lng,typ=None,area=None,city=None):
  name=(name or "").strip(); lat=float(lat); lng=float(lng)
  if not name or not(-90<=lat<=90 and -180<=lng<=180): raise ValueError
  return dict(name=name[:200],type=typ if typ in TYPES else guess(name),area=area or None,city=city or None,lat=lat,lng=lng)
def strip(t): return t.split('}')[-1]
f=sys.argv[1]; rows=[]; bad=0
if f.lower().endswith(".csv"):
  for r in csv.DictReader(open(f,encoding="utf-8-sig")):
    r={k.strip().lower():(v or "").strip() for k,v in r.items() if k}
    try: rows.append(row(r.get("name"),r.get("lat") or r.get("latitude"),r.get("lng") or r.get("lon") or r.get("longitude"),r.get("type"),r.get("area"),r.get("city")))
    except Exception: bad+=1
else:
  root=ET.parse(f).getroot()
  for el in root.iter():
    tag=strip(el.tag)
    try:
      if tag=="Placemark":
        nm=next((c.text for c in el.iter() if strip(c.tag)=="name"),"")
        co=next((c.text for c in el.iter() if strip(c.tag)=="coordinates"),None)
        if co: lo,la=co.strip().split()[0].split(",")[:2]; rows.append(row(nm,la,lo))
      elif tag=="wpt":
        nm=next((c.text for c in el if strip(c.tag)=="name"),""); rows.append(row(nm,el.get("lat"),el.get("lon")))
    except Exception: bad+=1
for i in range(0,len(rows),2000): pass
json.dump(rows,sys.stdout,ensure_ascii=False,indent=1)
print(f"\n{len(rows)} rows, {bad} skipped (max 2000 rows per bulk upload)",file=sys.stderr)
