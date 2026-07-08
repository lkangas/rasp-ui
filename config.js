// Product catalog and image URL scheme for the ennuste.ilmailuliitto.fi RASP
// (Regional Atmospheric Soaring Prediction) forecast, transcribed from that
// site's own root/params.js and root/site.js so the product list, Perus/Laaja
// split and image filenames stay identical to the source.
//
// IMG_BASE: where images are fetched from. The source has no HTTPS listener
// at all, so on an HTTPS deploy (weather.defocus.fi) hotlinking it directly
// would hit browsers' mixed-content blocking. Detected from this page's own
// protocol rather than hardcoded, so the same file is correct both for local
// plain-HTTP testing and for a production HTTPS deploy: on HTTPS, requests
// go to a same-origin path that a server-side reverse proxy relays to the
// source (see deploy/Caddyfile's /soaring-img/* block in the parent wx repo).
const IMG_BASE = location.protocol === "https:"
  ? "/soaring-img/"
  : "http://ennuste.ilmailuliitto.fi/";

const DAYS = [
  { value: "0", label: "1. päivä" },
  { value: "1", label: "2. päivä" },
  { value: "2", label: "3. päivä" },
  { value: "3", label: "4. päivä" },
];

const TIMES = [
  "0900", "1000", "1100", "1200", "1300", "1400", "1500",
  "1600", "1700", "1800", "1900", "2000", "2100",
].map((t) => ({ value: t, label: `${t.slice(0, 2)}:${t.slice(2)}` }));

const PARSETS = ["Perus", "Laaja"];

// [name, title, extra, description] — extra=1 means the product only shows
// up once "Laaja" (extended) is selected, matching the source site exactly.
const PARAMS = [
  ["wstar_bsratio", "Termiikin voimakkuus", 0,
    "Kuvasta näet keskimääräisen noston voimakkuuden sekä alueen mihin keliä kehittyy. Normaali purjelentokeli tarkoittaa yleensä sitä, että noston voimakkuus on luokkaa 200 cm/s tai enemmän. Jos kuvassa näkyy tiheästi mustia pisteitä (B/S Ration), tuulen shear rikkoo nostoja tai tekee niistä puuskaisia."],
  ["wstar", "Thermal Updraft Velocity (W*)", 1,
    "Kuvasta näet keskimääräisen noston voimakkuuden sekä alueen mihin keliä kehittyy. Normaali purjelentokeli tarkoittaa yleensä sitä, että noston voimakkuus on luokkaa 200 cm/s tai enemmän."],
  ["bsratio", "Buoyancy/Shear Ratio", 1,
    "Dry thermals may be broken up by vertical wind shear (i.e. wind changing with height) and unworkable if B/S ratio is 5 or less. [Though hang-gliders can soar with smaller B/S values than can sailplanes.] If convective clouds are present, the actual B/S ratio will be larger than calculated here due to the neglect of 'cloudsuck'. [This parameter is truncated at 20 for plotting.]"],
  ["hwcrit", "Height of Critical Updraft Strength", 1,
    "Korkeus, mihin kelvollinen nosto ulottuu, pilvi voi tosin tulla väliin."],
  ["dwcrit", "Termiikin korkeus", 0,
    "Korkeus, mihin kelvollinen nosto ulottuu maasta laskien."],
  ["hbl", "Height of Boundary Layer Top", 1,
    "Korkeus johon termiikki ulottuu."],
  ["dbl", "Boundary Layer Depth", 1,
    "Termiikin jylläyskerroksen paksuus."],
  ["bltopvariab", "BL Top Uncertainty/Variability", 1,
    "Noston ylärajan vaihtelevuus. Jos on esim 400 m ja korkeus mihin kelvollinen nosto (BL Top) ylettyy on 1600 m saattaa nostot käytännössä olla 1400-1800 m."],
  ["zwblmaxmin", "MSL Height of max/min Wbl", 1,
    "Height at which the max/min of the vertical velocity in the Boundary Layer occurs, i.e. of 'BL Max. Up/Down Motion'"],
  ["sfcshf", "Surface Heating", 1,
    "Heat transferred into the atmosphere due to solar heating of the ground, creating thermals. This parameter is an important determinant of thermals strength (as is the BL depth). This parameter is obtained directly from WRF model output and not from a BLIPMAP computation."],
  ["sfcsunpct", "Auringonpaiste (%)", 0,
    "Paljonko pääsee auringonsäteilyä maanpinnalle suhteessa maksimiin, \"käänteinen\" pilvikartta."],
  ["sfctemp", "Pintalämpötila", 0,
    "Lämpötila 2m korkeudella."],
  ["sfcdewpt", "Surface Dew Point Temperature", 1,
    "Kastepiste 2m korkeudella."],
  ["mslpress", "Mean Sea Level Pressure", 1,
    "Atmospheric Pressure at Mean Sea Level in mBar."],
  ["sfcwind", "Pintatuuli", 0,
    "Tuuli 10m korkeudella, väri osoittaa voimakkuuden ja virtaviivat suunnan."],
  ["blwind", "BL Average Wind", 1,
    "The speed and direction of the vector-averaged wind in the BL. This prediction can be misleading if there is a large change in wind direction through the BL (for a complex wind profile, no single number is an adequate descriptor!)."],
  ["bltopwind", "BL Top Wind", 1,
    "The speed and direction of the wind at the top of the BL. Speed is depicted by different colors and direction by streamlines."],
  ["blwindshear", "BL Vertical Wind Shear", 1,
    "The vertical change in wind through the BL, specifically the magnitude of the vector wind difference between the top and bottom of the BL. Note that this represents vertical wind shear and does not indicate so-called 'shear lines' (which are horizontal changes of wind speed/direction)."],
  ["wblmaxmin", "Konvergenssi", 0,
    "Nostavat alueet/jonot tai laskevat alueet eli Konvergenssi/Divergenssilinjat."],
  ["zsfclcldif", "Cu Potential", 1,
    "Kumpupilvipotentiaali."],
  ["zsfclcl", "Cu Cloudbase", 1,
    "Alimpien kumpupilvien pohjien korkeus, jos kumpupilviä on mahdollista syntyä."],
  ["zsfclclmask", "Pilvipohjat", 0,
    "Kaikki värilliset kohdat kartalla ovat alueita, joille syntyy kumpupilviä. Kumpupilven alarajan voi lukea värin perusteella. Kumpupilven alaraja riippuu maanpinnan lämpötilasta sekä kastepisteestä."],
  ["zblcldif", "OvercastDevelopment Potential", 1,
    "This evaluates the potential for extensive cloud formation (OvercastDevelopment) at the BL top, being the height difference between the BL CL and the BL top. Extensive clouds and likely OD are predicted when the parameter is positive, with OD being increasingly more likely with higher positive values. OD can also occur with negative values if the air is lifted up the indicated vertical distance by flow up a small-scale ridge not resolved by the model's smoothed topography. [This parameter is truncated at -10,000 for plotting.]"],
  ["zblcl", "OvercastDevelopment Cloudbase", 1,
    "This height estimates the cloudbase for extensive BL clouds (OvercastDevelopment), if such exist, i.e. if the OvercastDevelopment Potential parameter (above) is positive. The BL CL (Condensation Level) is based upon the humidity averaged through the BL and is therefore relevant only to extensive clouds (OvercastDevelopment) - unlike the above surface-based LCL which uses a surface humidity. [This parameter is truncated at 22,000 for plotting.]"],
  ["zblclmask", "OD Cloudbase Where OD Pot. > 0", 1,
    "Combining the previous two parameters, this depicts the OvercastDevelopment (OD) Cloudbase only at locations where the OD Potential parameter is positive. This single plot can be used, instead of needing to look at both the OD Potential and OD Cloudbase plots, if the threshold OD Potential empirically determined for your site approximately equals the theoretical value of zero."],
  ["blcwbase", "BL Explicit Cloud Base", 1,
    "This parameter is primarily for DrJack's use. It predicts the cloud base of extensive clouds based on model-predicted formation of cloud water, giving the lowest height at which the predicted cloud water density is above a criterion value within the BL."],
  ["blcloudpct", "BL Cloud Cover", 1,
    "This parameter provides an additional means of evaluating the formation of clouds within the BL. It assumes a very simple relationship between cloud cover percentage and the maximum relative humidity within the BL. The cloud base height is not predicted, but is expected to be below the BL Top height."],
  ["rain1", "1hr Accumulated Rain", 1,
    "Rain accumulated over the last hour. Note that this requires a forecast for the previous hour, so it is not possible to plot this parameter until 1 hour after the first forecast for the day."],
  ["rain3", "Sade 3h", 0,
    "Sadekertymä."],
  ["cape", "Kuuroherkkyys (CAPE)", 0,
    "Kuuroherkkyys, arvot > 100 sadekuuroja, arvot > 500 ukkosta."],
  ["press850", "Pystynopeus ja tuuli 850mb", 0,
    "850mb korkeuden (n. 1500m) pystynopeus ja tuulinuolet."],
  ["press700", "Pystynopeus ja tuuli 700mb", 0,
    "700mb korkeuden (n. 3000m) pystynopeus ja tuulinuolet."],
  ["press500", "Pystynopeus ja tuuli 500mb", 0,
    "500mb korkeuden (n. 5500m) pystynopeus ja tuulinuolet."],
  ["boxwmax", "Poikkileikkaus", 0,
    "Pystyleikkauskuva suurimman tuulen suuntaan."],
];

// [name, title] — always "extra" (Laaja-only) in this UI, since they're a
// distinct, more specialized product family (per-station vertical soundings
// rather than area maps).
const SOUNDINGS = [
  ["sounding1", "Luotaus #1 EFRY"],
  ["sounding2", "Luotaus #2 EFME"],
  ["sounding3", "Luotaus #3 EFNU"],
  ["sounding4", "Luotaus #4 EFLA"],
  ["sounding5", "Luotaus #5 EFPU"],
  ["sounding6", "Luotaus #6 EFSE"],
  ["sounding7", "Luotaus #7 EFOP"],
  ["sounding8", "Luotaus #8 EFSA"],
  ["sounding9", "Luotaus #9 EFRA"],
  ["sounding10", "Luotaus #10 EFJM"],
  ["sounding11", "Luotaus #11 Leivonmäki"],
  ["sounding12", "Luotaus #12 EFKU"],
  ["sounding13", "Luotaus #13 EFIK"],
  ["sounding14", "Luotaus #14 EFHP"],
  ["sounding15", "Luotaus #15 EFIM"],
];

const DEFAULT_PARAM = "wstar_bsratio";
const DEFAULT_TIME = "1200";

function buildImageUrl(day, param, time) {
  return `${IMG_BASE}${day}/${param}.curr.${time}lst.d2.png`;
}
