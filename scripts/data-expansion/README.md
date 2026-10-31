# Data expansion pipeline (2026-10-31)

1. `curl -L -o india.pbf https://download.geofabrik.de/asia/india-latest.osm.pbf` (Overpass was overloaded; the Geofabrik extract is more reliable).
2. `python3 pbf3.py` -> osm2.json (OSM, all India: religion=muslim places of worship, building=mosque, amenity=prayer_room, muslim tombs/shrines, plus names matching masjid/dargah/idgah/musalla/imambara/... in many scripts). Nodes, ways and relations with centroids. About 4 minutes. (`pbf2json.py` is the slower area-assembly version, not needed.)
3. `python3 ov2.py` -> ov2.json (Overture Places latest release, India bbox, mosque categories + Muslim-name keywords). Needs pyarrow, shapely.
4. Export existing places to existing2.json: `select json_agg(json_build_array(id,name,lat,lng,source_ids,city,state,slug)) from places`.
5. `python3 merge2.py` -> new2.json. Skips anything whose source:source_id is already stored, dedupes within 20 m always, within 40 m if names are similar or one is unnamed, and anywhere within 150 m if names normalise the same. City/state from the nearest stored place (<13 km), else nearest GeoNames town (CC BY 4.0, offline, no Nominatim). Roads/shops/schools/temples filtered.
6. Insert new2.json as `insert ... on conflict do nothing` in batches of 300. Never deletes.

Status rules: OSM tagged religion=muslim or building=mosque -> verified; name-only matches -> pending. Overture mosque category with confidence >= 0.3 and a mosque name, or >= 0.6 without -> verified; weaker -> pending or dropped. Wikidata -> verified.
