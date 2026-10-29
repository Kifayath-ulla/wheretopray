# Prayer Places - project brief

Goal: a website listing every place where Muslims can pray: mosques (masjid), dargahs, idgahs, musallas and prayer rooms (airports, malls, universities, offices). Start with Bengaluru (1000+ places), then all of India, then worldwide.

## Stack (decided)
- Next.js (App Router, TypeScript), Tailwind
- Supabase Postgres + PostGIS (free tier) for data and "near me" queries
- MapLibre GL + OSM tiles for the map
- Aladhan API for calculated prayer times
- Deploy on Vercel

## Data sources (use in this order)
1. OpenStreetMap via Overpass API (amenity=place_of_worship + religion=muslim; dargahs: historic=tomb/tomb=dargah or name contains dargah/dargah/ziyarat). License ODbL: show "© OpenStreetMap contributors".
2. Overture Maps Places and Foursquare OS Places to fill gaps; dedupe by name + distance (<75 m).
3. Wikidata (CC0) for notable mosques and dargahs.
4. WAMSI / state Waqf Board lists for India (request formally; do not scrape).
5. User and mosque-admin submissions with a moderation queue.
Never store Google Places content (ToS). Keep source and last_verified fields on every record.

## Schema (places)
id, name, name_local, type (mosque|dargah|idgah|musalla|prayer_room), lat, lng, address, city, state, country, denomination, women_section (bool), wudu (bool), parking, phone, website, jumuah_time, iqama_times (json), source, source_id, last_verified, status (pending|verified)

## Features
Map + list search, filter by type/city/facilities, near-me, place page with prayer times, "submit a place" and "report a fix" forms, admin moderation, SEO pages per city, mobile first, PWA.

## Rules
Use hyphens, not em dashes, in all copy. Keep commits small. Write a README.
