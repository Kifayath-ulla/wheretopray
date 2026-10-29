[out:json][timeout:300];
(
 nwr["amenity"~"prayer_room|place_of_worship"](12.6,77.2,13.45,78.0);
 nwr["room"="prayer"](12.6,77.2,13.45,78.0);
 nwr["religion"~"muslim|multifaith"](12.6,77.2,13.45,78.0);
 nwr["building"~"mosque|religious"](12.6,77.2,13.45,78.0);
 nwr["historic"~"tomb|shrine"](12.6,77.2,13.45,78.0);
 nwr["landuse"="cemetery"]["religion"="muslim"](12.6,77.2,13.45,78.0);
 nwr["name"~"prayer|namaz|namaaz|musall|masjid|masjeed|musjid|mosque|jamia|jumma|juma|idgah|eidgah|edgah|idga|dargah|dargha|durgah|ziyarat|takia|takiya|thakiya|khanqah|qabrastan|qabristan|khabrastan|ಮಸೀದಿ|ಮಸ್ಜಿದ್|ದರ್ಗಾ|مسجد",i](12.6,77.2,13.45,78.0);
);
out center tags;
