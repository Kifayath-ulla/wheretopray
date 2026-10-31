# Bengaluru mapping drive - add every mosque to the open map

wheretopray imports places from OpenStreetMap (OSM) regularly. Anything you add to OSM correctly shows up on wheretopray after the next import, and also on many other apps. We can't copy Google Maps (their terms forbid it), so the fastest legal way to close the gap is for people in each area to map the places they know.

## Who and when
- 10-30 volunteers, one or two BBMP wards each (start with the wards in `bengaluru-gap-wards.md`).
- One weekend: Saturday walk/drive, Sunday cleanup. Each volunteer covers about 5-15 places.
- Best people: masjid committee members, imams, students, delivery riders, local WhatsApp group admins.

## Option A - phone, 2 minutes per place (recommended)
1. Install **StreetComplete** (Android) or **Every Door** (Android and iPhone). Both are free.
2. Create a free OpenStreetMap account at openstreetmap.org and sign in inside the app.
3. Stand at (or in front of) the mosque. Add a new point:
   - Every Door: "+" > search "Mosque" (or "Place of Worship") > set religion to Muslim.
   - StreetComplete: long-press the map at the exact spot > "Place of worship" > Muslim.
4. Fill in:
   - `name` - exactly as on the board, e.g. "Masjid-e-Noor". Add `name:ur` / `name:kn` if the board shows it.
   - `religion=muslim` (required), `denomination` if known (sunni, shia, etc).
   - For a dargah: `amenity=place_of_worship` + `religion=muslim` + `historic=tomb` (or `tomb=dargah`).
   - For an idgah: `amenity=place_of_worship` + `religion=muslim` + `name=... Idgah`.
   - For a prayer room in a mall, office, hospital or airport: `amenity=place_of_worship` + `religion=muslim` + `indoor=room` (or `amenity=prayer_room` with `religion=muslim`), placed inside the building.
   - Optional: `wheelchair`, `female=yes` if there is a women's section, `opening_hours`.
5. Upload. Done.

## Option B - computer
1. Go to openstreetmap.org, sign in, click **Edit** (iD editor).
2. Zoom in to the building, click **Point** (or select the building outline), choose "Mosque", fill the fields above, **Save**.

## Rules (important)
- Only add places you have seen yourself or know first-hand. **Never copy from Google Maps, Google Street View or other proprietary maps** - it breaks OSM rules and the edits get reverted.
- Put the point on the actual building, not on the road.
- Don't name roads "Masjid" unless that is the road's signed name; don't tag a road as a mosque.
- One point per place. Check the map first so you don't duplicate an existing mosque.

## No OSM account? Use wheretopray directly
- Single place: "Add a mosque" on wheretopray.vercel.app (it goes to review).
- Many places: put them in a spreadsheet with columns `name, lat, lng, type, area` (type = mosque, dargah, idgah, prayer_room), or export a KML/GPX from any GPS app, and send it to the admin. The admin converts it with `python3 scripts/to-bulk.py file.csv > rows.json` and uploads it in Admin > Bulk (dedupe first, then import as pending).

## After the drive
- New OSM edits are picked up in the next import (`scripts/data-expansion/README.md`), usually within a few days.
- Check your ward on wheretopray.vercel.app/bengaluru/gaps.
