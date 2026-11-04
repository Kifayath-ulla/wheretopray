import json,math,urllib.request,urllib.parse
osm=[("node",13676271301,13.016018,77.617839),("node",13072369444,12.965328,77.577342),("node",13735291748,12.965448,77.585532),("node",596449197,12.985804,77.60557),("way",1218027507,13.080609,77.552897),("way",131487436,12.964012,77.57855),("way",1488021177,12.941564,77.746753),("node",3702257225,12.890022,77.600446),("way",1449723938,12.940383,77.579046),("way",347597626,12.910709,77.483825),("way",1308403509,13.01933,77.555283),("way",1531451445,12.93185,77.59888),("node",9952087679,12.955073,77.614504),("way",346456833,12.979073,77.615976),("way",532166920,12.963659,77.60647),("way",438495213,12.994805,77.602327),("node",6856463613,13.041122,77.590118),("way",1047676477,12.983404,77.600947),("way",343961638,12.924938,77.618357),("node",2388266798,12.92353,77.649684)]
ovt=[("Aghaiya Makkah Sunni Masjid",12.939564,77.60789),("Al Masjid E Noor",13.031372,77.618651),("Bilal Masjid",13.02584,77.71656),("Bilal Masjid",13.017661,77.706717),("Bilal Masjid",12.921748,77.618218),("Al Jamiatul Quadria Masjid",13.055958,77.714698),("Darga Kambalposh",13.00517,77.669137),("Dargah Maj Zoob",12.990082,77.601482)]
def d(a,b,c,e):
  R=6371000;p=math.radians;x=p(e-b)*math.cos(p((a+c)/2));y=p(c-a);return R*math.hypot(x,y)
q="[out:json];("+"".join(f"{t}({i});" for t,i,_,_ in osm)+");out center;"
for _,la,lo in ovt: q2=None
q+="("+"".join(f'nwr(around:300,{la},{lo})[amenity=place_of_worship][religion=muslim];' for _,la,lo in ovt)+");out center tags;"
import subprocess
r=json.loads(subprocess.run(["curl","-s","-A","wheretopray-check/1.0","--data-urlencode","data="+q,"https://overpass-api.de/api/interpreter"],capture_output=True,text=True).stdout)
els=r["elements"]
def ll(e): return (e.get("lat") or e["center"]["lat"], e.get("lon") or e["center"]["lon"])
byid={(e["type"],e["id"]):e for e in els}
for t,i,la,lo in osm:
  e=byid.get((t,i)); print("OSM",t,i, "missing" if not e else f"{d(la,lo,*ll(e)):.1f} m")
for n,la,lo in ovt:
  best=min(((d(la,lo,*ll(e)),e.get("tags",{}).get("name","?")) for e in els),default=None)
  print("OVT",n,"nearest OSM mosque:",f"{best[0]:.0f} m {best[1]}" if best and best[0]<300 else "none within 300 m")
