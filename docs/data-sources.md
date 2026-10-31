# Data sources (checked 2026-10-31)

| Source | License | Status |
|---|---|---|
| OpenStreetMap (Geofabrik India extract 2026-10-29) | ODbL 1.0 - attribution + share-alike for the database | Used. ~11,000 matching objects in India; nearly all already loaded |
| Overture Maps Places 2026-10-21.0 | CDLA-Permissive-2.0 (some ODbL-derived) | Used. ~19,800 candidates after keyword widening |
| Wikidata | CC0 | Used (mosques Q32815, Muslim places of worship) |
| GeoNames IN dump | CC BY 4.0 | Used for 22 places (only 40 MSQE, 135 SHRN, 44 TMB in all India) and for offline city/state lookup |
| Foursquare OS Places | Apache 2.0 | Skipped - Hugging Face dataset is gated (login + agreement); the public S3 bucket only has LICENSE/NOTICE |
| Google Maps / Places | Proprietary | Not used - ToS forbids storing/copying; no paid key |
| Waqf Assets Management System of India (wamsi.nic.in) | No open-data license stated | Not scraped. Best route is a formal data request / RTI to the Karnataka State Board of Auqaf (draft in docs/waqf-request.md) - Waqf registers list tens of thousands of mosques with addresses |
| data.gov.in, Karnataka open data | OGDL-India | No mosque/place-of-worship location dataset found |
| Census 2011 village amenities | OGDL-India | No per-religion place-of-worship counts with locations |
| Microsoft/Bing building footprints | ODbL | Not useful - no religious tags |
