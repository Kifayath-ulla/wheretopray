[out:json][timeout:900];
area["ISO3166-1"="IN"][admin_level=2]->.in;
(
 nwr["amenity"="place_of_worship"]["religion"="muslim"](area.in);
 nwr["building"="mosque"](area.in);
 nwr["historic"~"tomb|shrine"]["religion"="muslim"](area.in);
 nwr["name"~"masjid|masjeed|musjid|mosque|jama masj|jamia|jumma|musalla|musallah|idgah|eidgah|edgah|dargah|dargha|durgah|ziyarat|khanqah|مسجد|مسجد|मस्जिद|ಮಸೀದಿ|ಮಸ್ಜಿದ್|മസ്ജിദ്|പള്ളി|பள்ளிவாசல்|மஸ்ஜித்|మసీదు|মসজিদ|दरगाह|ईदगाह|درگاہ|عیدگاہ",i](area.in);
);
out center tags;
