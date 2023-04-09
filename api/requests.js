/*
 * Copyright (C) 2019 HERE Europe B.V.
 * Licensed under MIT, see full license in LICENSE
 * SPDX-License-Identifier: MIT
 * License-Filename: LICENSE
 */
const fetch = require("node-fetch");
const DEFAULT_PRECISION = 5;
key1 = "MMZcqalDcVEjuRryHdGCcfC0HK7l2pWvQm-WKsCBa8I";
const ENCODING_TABLE =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

const DECODING_TABLE = [
  62, -1, -1, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1,
  -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, -1, -1, -1, -1, 63, -1, 26, 27, 28, 29, 30, 31, 32, 33,
  34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51,
];

const FORMAT_VERSION = 1;

const ABSENT = 0;
const LEVEL = 1;
const ALTITUDE = 2;
const ELEVATION = 3;
// Reserved values 4 and 5 should not be selectable
const CUSTOM1 = 6;
const CUSTOM2 = 7;

const Num = typeof BigInt !== "undefined" ? BigInt : Number;

function lineRect(x1, y1, x2, y2, rx, ry, rw, rh) {
  // check if the line has hit any of the rectangle's sides
  // uses the Line/Line function below
  let left = lineLine(x1, y1, x2, y2, rx, ry, rx, ry + rh);
  let right = lineLine(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh);
  let top = lineLine(x1, y1, x2, y2, rx, ry, rx + rw, ry);
  let bottom = lineLine(x1, y1, x2, y2, rx, ry + rh, rx + rw, ry + rh);

  // if ANY of the above are true, the line
  // has hit the rectangle
  if (left || right || top || bottom) {
    return true;
  }
  return false;
}

function lineLine(x1, y1, x2, y2, x3, y3, x4, y4) {
  // calculate the direction of the lines
  let uA =
    ((x4 - x3)(y1 - y3) - (y4 - y3)(x1 - x3)) /
    ((y4 - y3)(x2 - x1) - (x4 - x3)(y2 - y1));
  let uB =
    ((x2 - x1)(y1 - y3) - (y2 - y1)(x1 - x3)) /
    ((y4 - y3)(x2 - x1) - (x4 - x3)(y2 - y1));

  // if uA and uB are between 0-1, lines are colliding
  if (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1) {
    // optionally, draw a circle where the lines meet
    let intersectionX = x1 + uA * (x2 - x1);
    let intersectionY = y1 + uA * (y2 - y1);

    return true;
  }
  return false;
}
function toWaypoints(lst) {
  const waypoints = new Array();

  lst.forEach((element) => {
    waypoints.push({ location: element, stopover: true });
  });

  return waypoints;
}

function parseCoords(list) {
  waypoints = new Array();

  for (let i = 0; i < list.length; i++) {
    waypoints.push({ lat: list[i][0], lng: list[i][1] });
  }

  return waypoints;
}

function cutCoords(list) {
  output = new Array();

  for (let i = 0; i < list.length; i += Math.ceil(list.length / 25)) {
    output.push(list[i]);
  }

  return output;
}
function lineEquation(x1, y1, x2, y2) {
  // Calculate slope
  const slope = (y2 - y1) / (x2 - x1);

  // Calculate y-intercept
  const yIntercept = y1 - slope * x1;

  // Return equation in slope-intercept form
  return [slope, yIntercept];
}
function decode(encoded) {
  const decoder = decodeUnsignedValues(encoded);
  const header = decodeHeader(decoder[0], decoder[1]);

  const factorDegree = 10 ** header.precision;
  const factorZ = 10 ** header.thirdDimPrecision;
  const { thirdDim } = header;

  let lastLat = 0;
  let lastLng = 0;
  let lastZ = 0;
  const res = [];

  let i = 2;
  for (; i < decoder.length; ) {
    const deltaLat = toSigned(decoder[i]) / factorDegree;
    const deltaLng = toSigned(decoder[i + 1]) / factorDegree;
    lastLat += deltaLat;
    lastLng += deltaLng;

    if (thirdDim) {
      const deltaZ = toSigned(decoder[i + 2]) / factorZ;
      lastZ += deltaZ;
      res.push([lastLng, lastLat, lastZ]);

      i += 3;
    } else {
      res.push([lastLng, lastLat]);
      i += 2;
    }
  }

  if (i !== decoder.length) {
    throw new Error("Invalid encoding. Premature ending reached");
  }

  return {
    ...header,
    polyline: res,
  };
}

function decodeChar(char) {
  const charCode = char.charCodeAt(0);
  return DECODING_TABLE[charCode - 45];
}

function decodeUnsignedValues(encoded) {
  let result = Num(0);
  let shift = Num(0);
  const resList = [];

  encoded.split("").forEach((char) => {
    const value = Num(decodeChar(char));
    result |= (value & Num(0x1f)) << shift;
    if ((value & Num(0x20)) === Num(0)) {
      resList.push(result);
      result = Num(0);
      shift = Num(0);
    } else {
      shift += Num(5);
    }
  });

  if (shift > 0) {
    throw new Error("Invalid encoding");
  }

  return resList;
}

function decodeHeader(version, encodedHeader) {
  if (+version.toString() !== FORMAT_VERSION) {
    throw new Error("Invalid format version");
  }
  const headerNumber = +encodedHeader.toString();
  const precision = headerNumber & 15;
  const thirdDim = (headerNumber >> 4) & 7;
  const thirdDimPrecision = (headerNumber >> 7) & 15;
  return { precision, thirdDim, thirdDimPrecision };
}

function toSigned(val) {
  // Decode the sign from an unsigned value
  let res = val;
  if (res & Num(1)) {
    res = ~res;
  }
  res >>= Num(1);
  return +res.toString();
}

function encode({
  precision = DEFAULT_PRECISION,
  thirdDim = ABSENT,
  thirdDimPrecision = 0,
  polyline,
}) {
  // Encode a sequence of lat,lng or lat,lng(,{third_dim}). Note that values should be of type BigNumber
  //   `precision`: how many decimal digits of precision to store the latitude and longitude.
  //   `third_dim`: type of the third dimension if present in the input.
  //   `third_dim_precision`: how many decimal digits of precision to store the third dimension.

  const multiplierDegree = 10 ** precision;
  const multiplierZ = 10 ** thirdDimPrecision;
  const encodedHeaderList = encodeHeader(
    precision,
    thirdDim,
    thirdDimPrecision
  );
  const encodedCoords = [];

  let lastLat = Num(0);
  let lastLng = Num(0);
  let lastZ = Num(0);
  polyline.forEach((location) => {
    const lat = Num(Math.round(location[0] * multiplierDegree));
    encodedCoords.push(encodeScaledValue(lat - lastLat));
    lastLat = lat;

    const lng = Num(Math.round(location[1] * multiplierDegree));
    encodedCoords.push(encodeScaledValue(lng - lastLng));
    lastLng = lng;

    if (thirdDim) {
      const z = Num(Math.round(location[2] * multiplierZ));
      encodedCoords.push(encodeScaledValue(z - lastZ));
      lastZ = z;
    }
  });

  return [...encodedHeaderList, ...encodedCoords].join("");
}

function encodeHeader(precision, thirdDim, thirdDimPrecision) {
  // Encode the `precision`, `third_dim` and `third_dim_precision` into one encoded char
  if (precision < 0 || precision > 15) {
    throw new Error("precision out of range. Should be between 0 and 15");
  }
  if (thirdDimPrecision < 0 || thirdDimPrecision > 15) {
    throw new Error(
      "thirdDimPrecision out of range. Should be between 0 and 15"
    );
  }
  if (thirdDim < 0 || thirdDim > 7 || thirdDim === 4 || thirdDim === 5) {
    throw new Error("thirdDim should be between 0, 1, 2, 3, 6 or 7");
  }

  const res = (thirdDimPrecision << 7) | (thirdDim << 4) | precision;
  return encodeUnsignedNumber(FORMAT_VERSION) + encodeUnsignedNumber(res);
}

function encodeUnsignedNumber(val) {
  // Uses variable integer encoding to encode an unsigned integer. Returns the encoded string.
  let res = "";
  let numVal = Num(val);
  while (numVal > 0x1f) {
    const pos = (numVal & Num(0x1f)) | Num(0x20);
    res += ENCODING_TABLE[pos];
    numVal >>= Num(5);
  }
  return res + ENCODING_TABLE[numVal];
}

function encodeScaledValue(value) {
  // Transform a integer `value` into a variable length sequence of characters.
  //   `appender` is a callable where the produced chars will land to
  let numVal = Num(value);
  const negative = numVal < 0;
  numVal <<= Num(1);
  if (negative) {
    numVal = ~numVal;
  }

  return encodeUnsignedNumber(numVal);
}

module.exports = {
  encode,
  decode,

  ABSENT,
  LEVEL,
  ALTITUDE,
  ELEVATION,
};
async function req(origin, destination, block_temp) {
  if (block_temp.length == 0) {
    block_temp = [
      [
        [-74.24282736227363, 71.04737546410637],
        [-79.89422731090072, 104.97315587809182],
      ],
    ];
  }
  base =
    "https://router.hereapi.com/v8/routes?origin=" +
    origin[0] +
    "," +
    origin[1];
  base = base + "&destination=" + destination[0] + "," + destination[1];
  base =
    base +
    "&return=polyline,summary,actions,instructions&transportMode=pedestrian&avoid[areas]=bbox:";
  for (i in block_temp) {
    block = block_temp[i];
    p1 = block[0];
    p2 = block[1];
    p1y = p1[1];
    p1x = p1[0];
    p2y = p2[1];
    p2x = p2[0];

    if (i == block_temp.length - 1) {
      base = base + p1y + "," + p1x + "," + p2y + "," + p2x;
    } else {
      base = base + p1y + "," + p1x + "," + p2y + "," + p2x + "|" + "bbox:";
    }
  }

  base = base.substring(0, base.length - 1);
  base = base + "&" + "apikey=" + key1;

  routearr = [];

  try {
    let ret = await fetch(base);
    let data = await ret.json();
    if ("notices" in data["routes"][0]["sections"][0]) {
      ret = {
        notices: [{ title: "Violated . Avoid areas" }],
      };
      return ret;
    }
    let point_array = decode(data["routes"][0]["sections"][0]["polyline"])[
      "polyline"
    ];
    point_array = cutCoords(point_array);

    let sum = 0;

    for (action_id in data["routes"][0]["sections"][0]["actions"]) {
      action = data["routes"][0]["sections"][0]["actions"][action_id]["length"];

      sum = sum + action;
    }
    //for each point pair,
    // -- for each block, run linerect for the point pair and the  block, see if there is a ht,

    geojson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            coordinates: point_array,

            type: "LineString",
          },
        },
      ],
    };

    return [sum * 0.000621371, geojson];
    //return(decode(data['routes'][0]['sections'][0]['polyline'])['polyline'])
  } catch (error) {
    console.error(error);
  }
}

function getCoords(name) {
  for (let i = 0; i < buildings.length; i++) {
    if (buildings[i].name === name) {
      return [buildings[i].lat, buildings[i].lng];
    }
  }
}

let buildings = [
  {
    name: "4-H Headquarters",
    addr: "4-H Headquarters, College Park, MD",
    lat: 39.0018521,
    lng: -76.9447261999999,
  },
  {
    name: "7401 Baltimore Ave",
    addr: "7401 Baltimore Ave, College Park, MD",
    lat: 38.9810114,
    lng: -76.9376128,
  },
  {
    name: "A. James Clark Hall",
    addr: "A. James Clark Hall, College Park, MD",
    lat: 38.9917615,
    lng: -76.9377482,
  },
  {
    name: "A.V. Williams Building",
    addr: "A.V. Williams Building, College Park, MD",
    lat: 38.9907707,
    lng: -76.9364399,
  },
  {
    name: "Adelphi Road Office Annex",
    addr: "Adelphi Road Office Annex, College Park, MD",
    lat: 38.9872753,
    lng: -76.9563928,
  },
  {
    name: "Agriculture Shed",
    addr: "Agriculture Shed, College Park, MD",
    lat: 38.9919889,
    lng: -76.940759,
  },
  {
    name: "Allegany Hall",
    addr: "Allegany Hall, College Park, MD",
    lat: 38.98159,
    lng: -76.941417,
  },
  {
    name: "Animal Care Storage Facility",
    addr: "Animal Care Storage Facility, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Animal Science Service Building",
    addr: "Animal Science Service Building, College Park, MD",
    lat: 38.9920038,
    lng: -76.9410963999999,
  },
  {
    name: "Animal Sciences/Agricultural Engineering Building",
    addr: "Animal Sciences/Agricultural Engineering Building, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Annapolis Hall",
    addr: "Annapolis Hall, College Park, MD",
    lat: 38.9822687,
    lng: -76.9400618,
  },
  {
    name: "Anne Arundel Hall",
    addr: "Anne Arundel Hall, College Park, MD",
    lat: 38.9859692,
    lng: -76.9467947999999,
  },
  {
    name: "Aquatic Center",
    addr: "Aquatic Center, College Park, MD",
    lat: 38.9933804,
    lng: -76.9465043,
  },
  {
    name: "Arboretum Outreach Center",
    addr: "Arboretum Outreach Center, College Park, MD",
    lat: 38.9919127,
    lng: -76.9487549999999,
  },
  {
    name: "Architecture Building",
    addr: "Architecture Building, College Park, MD",
    lat: 38.9844456,
    lng: -76.9478932999999,
  },
  {
    name: "Artemesia Building",
    addr: "Artemesia Building, College Park, MD",
    lat: 38.9936447,
    lng: -76.933258,
  },
  {
    name: "Astronomical Observatory",
    addr: "Astronomical Observatory, College Park, MD",
    lat: 39.0019734,
    lng: -76.9560954,
  },
  {
    name: "Astronomy Lecture Building",
    addr: "Astronomy Lecture Building, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Atlantic Building",
    addr: "Atlantic Building, College Park, MD",
    lat: 38.9912033,
    lng: -76.9431915,
  },
  {
    name: "Avrum Gudelsky",
    addr: "Avrum Gudelsky, College Park, MD",
    lat: 39.0042380999999,
    lng: -76.9421251999999,
  },
  {
    name: "Baltimore Hall",
    addr: "Baltimore Hall, College Park, MD",
    lat: 38.9822549,
    lng: -76.9422053999999,
  },
  {
    name: "Bel Air Hall",
    addr: "Bel Air Hall, College Park, MD",
    lat: 38.9928341,
    lng: -76.9426391,
  },
  {
    name: "Benjamin Building",
    addr: "Benjamin Building, College Park, MD",
    lat: 38.9866483,
    lng: -76.9473285999999,
  },
  {
    name: "Biology-Psychology Building",
    addr: "Biology-Psychology Building, College Park, MD",
    lat: 38.988822,
    lng: -76.9426024,
  },
  {
    name: "Biomolecular Sciences Building",
    addr: "Biomolecular Sciences Building, College Park, MD",
    lat: 38.9928515,
    lng: -76.9376413,
  },
  {
    name: "Bioscience Research Building",
    addr: "Bioscience Research Building, College Park, MD",
    lat: 38.9890321,
    lng: -76.9431374,
  },
  {
    name: "Boat House",
    addr: "Boat House, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: 'Bob "Turtle" Smith Stadium at Shipley Field',
    addr: 'Bob "Turtle" Smith Stadium at Shipley Field, College Park, MD',
    lat: 38.9887937,
    lng: -76.9445686999999,
  },
  {
    name: "Brendan Iribe Center",
    addr: "Brendan Iribe Center, College Park, MD",
    lat: 38.9891232,
    lng: -76.9364707,
  },
  {
    name: "Building 006",
    addr: "Building 006, College Park, MD",
    lat: 39.0262197,
    lng: -76.9246759999999,
  },
  {
    name: "Building 904",
    addr: "Building 904, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Building 950",
    addr: "Building 950, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Building 969",
    addr: "Building 969, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "C. Daniel Mote, Jr. Engineering Laboratory Building",
    addr: "C. Daniel Mote, Jr. Engineering Laboratory Building, College Park, MD",
    lat: 38.9892626,
    lng: -76.9379288,
  },
  {
    name: "Calvert Hall",
    addr: "Calvert Hall, College Park, MD",
    lat: 38.9829339,
    lng: -76.9423628999999,
  },
  {
    name: "Cambridge Community Center",
    addr: "Cambridge Community Center, College Park, MD",
    lat: 38.9916573,
    lng: -76.9430535,
  },
  {
    name: "Cambridge Hall",
    addr: "Cambridge Hall, College Park, MD",
    lat: 38.9917298,
    lng: -76.9430507,
  },
  {
    name: "Caroline Hall",
    addr: "Caroline Hall, College Park, MD",
    lat: 38.9834863,
    lng: -76.9458468,
  },
  {
    name: "Carroll Hall",
    addr: "Carroll Hall, College Park, MD",
    lat: 38.9840052,
    lng: -76.9456265,
  },
  {
    name: "Cattle Barn",
    addr: "Cattle Barn, College Park, MD",
    lat: 38.9923635,
    lng: -76.9403890999999,
  },
  {
    name: "Cecil Hall",
    addr: "Cecil Hall, College Park, MD",
    lat: 38.9829149,
    lng: -76.9416652,
  },
  {
    name: "Center for Young Children",
    addr: "Center for Young Children, College Park, MD",
    lat: 38.9935474,
    lng: -76.9485074,
  },
  {
    name: "Central Animal Resources Facility",
    addr: "Central Animal Resources Facility, College Park, MD",
    lat: 38.9916337,
    lng: -76.9384109,
  },
  {
    name: "Centreville Hall",
    addr: "Centreville Hall, College Park, MD",
    lat: 38.9922593999999,
    lng: -76.9421536999999,
  },
  {
    name: "Charles Hall",
    addr: "Charles Hall, College Park, MD",
    lat: 38.9815781,
    lng: -76.9405551,
  },
  {
    name: "Chemical & Nuclear Engineering Building",
    addr: "Chemical & Nuclear Engineering Building, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Chemistry Building",
    addr: "Chemistry Building, College Park, MD",
    lat: 38.9899295,
    lng: -76.9401173,
  },
  {
    name: "Chesapeake Building",
    addr: "Chesapeake Building, College Park, MD",
    lat: 38.9981558,
    lng: -76.9421605,
  },
  {
    name: "Chestertown Hall",
    addr: "Chestertown Hall, College Park, MD",
    lat: 38.9928231,
    lng: -76.9434709,
  },
  {
    name: "Chincoteague Hall",
    addr: "Chincoteague Hall, College Park, MD",
    lat: 38.9852538,
    lng: -76.9444948,
  },
  {
    name: "Clarence M. Mitchell, Jr. Building",
    addr: "Clarence M. Mitchell, Jr. Building, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Clarice Smith Performing Arts Center",
    addr: "Clarice Smith Performing Arts Center, College Park, MD",
    lat: 38.99054,
    lng: -76.9504845,
  },
  {
    name: "Cole Student Activities Building",
    addr: "Cole Student Activities Building, College Park, MD",
    lat: 38.9880061,
    lng: -76.9467607999999,
  },
  {
    name: "College Park Academy",
    addr: "College Park Academy, College Park, MD",
    lat: 38.9679397,
    lng: -76.9273438,
  },
  {
    name: "College Park Fire Station",
    addr: "College Park Fire Station, College Park, MD",
    lat: 38.9780342,
    lng: -76.928769,
  },
  {
    name: "College Park Marriott Hotel & Conference Center",
    addr: "College Park Marriott Hotel & Conference Center, College Park, MD",
    lat: 38.986374,
    lng: -76.954442,
  },
  {
    name: "College Park Marriott Hotel & Conference Center",
    addr: "College Park Marriott Hotel & Conference Center, College Park, MD",
    lat: 38.986374,
    lng: -76.954442,
  },
  {
    name: "Computer Science Instructional Center",
    addr: "Computer Science Instructional Center, College Park, MD",
    lat: 38.9899849,
    lng: -76.9361730999999,
  },
  {
    name: "Courtyard 100",
    addr: "Courtyard 100, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Courtyard 200",
    addr: "Courtyard 200, College Park, MD",
    lat: 39.0018031,
    lng: -76.9421639,
  },
  {
    name: "Courtyard 300",
    addr: "Courtyard 300, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Courtyard 400",
    addr: "Courtyard 400, College Park, MD",
    lat: 39.0021324,
    lng: -76.9429739999999,
  },
  {
    name: "Courtyard 500",
    addr: "Courtyard 500, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Courtyard 600",
    addr: "Courtyard 600, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Courtyard 700",
    addr: "Courtyard 700, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Courtyard Clubhouse",
    addr: "Courtyard Clubhouse, College Park, MD",
    lat: 39.0028087,
    lng: -76.9418426,
  },
  {
    name: "Courtyard Maintenance Shed",
    addr: "Courtyard Maintenance Shed, College Park, MD",
    lat: 39.0028087,
    lng: -76.9418426,
  },
  {
    name: "Crane Aquaculture Building",
    addr: "Crane Aquaculture Building, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Crane Aquaculture Support Building",
    addr: "Crane Aquaculture Support Building, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "CSPAC Grounds Storage Facility",
    addr: "CSPAC Grounds Storage Facility, College Park, MD",
    lat: 38.9905374,
    lng: -76.9504844,
  },
  {
    name: "Cumberland Hall",
    addr: "Cumberland Hall, College Park, MD",
    lat: 38.99238,
    lng: -76.944015,
  },
  {
    name: "Cypress Building",
    addr: "Cypress Building, College Park, MD",
    lat: 38.9931817,
    lng: -76.9333881,
  },
  {
    name: "Denton Area Dining Hall",
    addr: "Denton Area Dining Hall, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Denton Hall",
    addr: "Denton Hall, College Park, MD",
    lat: 38.9922454,
    lng: -76.9499816,
  },
  {
    name: "Diamondback Garage",
    addr: "Diamondback Garage, College Park, MD",
    lat: 38.9869775,
    lng: -76.9343365,
  },
  {
    name: "Dorchester Hall",
    addr: "Dorchester Hall, College Park, MD",
    lat: 38.986707,
    lng: -76.9461816,
  },
  {
    name: "E.A. Fernandez IDEA Factory",
    addr: "E.A. Fernandez IDEA Factory, College Park, MD",
    lat: 38.9903463,
    lng: -76.9380351,
  },
  {
    name: "Easton Hall",
    addr: "Easton Hall, College Park, MD",
    lat: 38.9930186,
    lng: -76.9502627999999,
  },
  {
    name: "Edward St. John Learning & Teaching Center",
    addr: "Edward St. John Learning & Teaching Center, College Park, MD",
    lat: 38.9871927,
    lng: -76.9420624,
  },
  {
    name: "Elkins Building",
    addr: "Elkins Building, College Park, MD",
    lat: 39.0047745,
    lng: -76.9541109,
  },
  {
    name: "Elkton Hall",
    addr: "Elkton Hall, College Park, MD",
    lat: 38.9924886,
    lng: -76.9490344,
  },
  {
    name: "Ellicott Area Dining Hall",
    addr: "Ellicott Area Dining Hall, College Park, MD",
    lat: 38.9918209,
    lng: -76.9466676999999,
  },
  {
    name: "Ellicott Hall",
    addr: "Ellicott Hall, College Park, MD",
    lat: 38.9918356,
    lng: -76.9466869,
  },
  {
    name: "Energy Plant",
    addr: "Energy Plant, College Park, MD",
    lat: 38.9857711,
    lng: -76.9354078,
  },
  {
    name: "Energy Research Facility",
    addr: "Energy Research Facility, College Park, MD",
    lat: 38.9919723,
    lng: -76.9368108,
  },
  {
    name: "Engineering Annex",
    addr: "Engineering Annex, College Park, MD",
    lat: 38.9906377,
    lng: -76.9369835,
  },
  {
    name: "Environmental Service Facility",
    addr: "Environmental Service Facility, College Park, MD",
    lat: 38.9964518,
    lng: -76.9437359,
  },
  {
    name: "Eppley Recreation Center",
    addr: "Eppley Recreation Center, College Park, MD",
    lat: 38.9936034,
    lng: -76.9451735999999,
  },
  {
    name: "Equipment Storage Building",
    addr: "Equipment Storage Building, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Field Hockey & Lacrosse Complex",
    addr: "Field Hockey & Lacrosse Complex, College Park, MD",
    lat: 38.9947093,
    lng: -76.936903,
  },
  {
    name: "Fleet Services Building",
    addr: "Fleet Services Building, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Francis Scott Key Hall",
    addr: "Francis Scott Key Hall, College Park, MD",
    lat: 38.9851318,
    lng: -76.9431221999999,
  },
  {
    name: "Frederick Hall",
    addr: "Frederick Hall, College Park, MD",
    lat: 38.9820689,
    lng: -76.9407423999999,
  },
  {
    name: "Garrett Hall",
    addr: "Garrett Hall, College Park, MD",
    lat: 38.9832562,
    lng: -76.9426873,
  },
  {
    name: "Gate House",
    addr: "Gate House, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Geology Building",
    addr: "Geology Building, College Park, MD",
    lat: 38.9882024,
    lng: -76.9409448999999,
  },
  {
    name: "Golf Course Club House",
    addr: "Golf Course Club House, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Golf Course Driving Range Control Building",
    addr: "Golf Course Driving Range Control Building, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Golf Course Maintenance Office",
    addr: "Golf Course Maintenance Office, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Golf Course Repair Shop",
    addr: "Golf Course Repair Shop, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Golf Course Storage Building",
    addr: "Golf Course Storage Building, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Golf Course Storage Building",
    addr: "Golf Course Storage Building, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Golf Course Toilet Facility",
    addr: "Golf Course Toilet Facility, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Gossett Hall",
    addr: "Gossett Hall, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Graduate Gardens Apartment 4301",
    addr: "Graduate Gardens Apartment 4301, College Park, MD",
    lat: 38.97877,
    lng: -76.9416877,
  },
  {
    name: "Graduate Gardens Apartment 4303",
    addr: "Graduate Gardens Apartment 4303, College Park, MD",
    lat: 38.97877,
    lng: -76.9416877,
  },
  {
    name: "Graduate Gardens Apartment 4305",
    addr: "Graduate Gardens Apartment 4305, College Park, MD",
    lat: 38.97877,
    lng: -76.9416877,
  },
  {
    name: "Graduate Gardens Apartment 4307",
    addr: "Graduate Gardens Apartment 4307, College Park, MD",
    lat: 38.97877,
    lng: -76.9416877,
  },
  {
    name: "Graduate Gardens Apartment 4309",
    addr: "Graduate Gardens Apartment 4309, College Park, MD",
    lat: 38.97877,
    lng: -76.9416877,
  },
  {
    name: "Graduate Gardens Apartment 4311",
    addr: "Graduate Gardens Apartment 4311, College Park, MD",
    lat: 38.97877,
    lng: -76.9416877,
  },
  {
    name: "Graduate Gardens Apartment 4312",
    addr: "Graduate Gardens Apartment 4312, College Park, MD",
    lat: 38.97877,
    lng: -76.9416877,
  },
  {
    name: "Graduate Gardens Apartment 4313",
    addr: "Graduate Gardens Apartment 4313, College Park, MD",
    lat: 38.97877,
    lng: -76.9416877,
  },
  {
    name: "Graduate Gardens Apartment 4314",
    addr: "Graduate Gardens Apartment 4314, College Park, MD",
    lat: 38.97877,
    lng: -76.9416877,
  },
  {
    name: "Graduate Gardens Apartment 4315",
    addr: "Graduate Gardens Apartment 4315, College Park, MD",
    lat: 38.97877,
    lng: -76.9416877,
  },
  {
    name: "Graduate Gardens Apartment 4316",
    addr: "Graduate Gardens Apartment 4316, College Park, MD",
    lat: 38.97877,
    lng: -76.9416877,
  },
  {
    name: "Graduate Gardens Apartment 4317",
    addr: "Graduate Gardens Apartment 4317, College Park, MD",
    lat: 38.97877,
    lng: -76.9416877,
  },
  {
    name: "Graduate Gardens Apartment 4318",
    addr: "Graduate Gardens Apartment 4318, College Park, MD",
    lat: 38.97877,
    lng: -76.9416877,
  },
  {
    name: "Graduate Gardens Apartment 4319",
    addr: "Graduate Gardens Apartment 4319, College Park, MD",
    lat: 38.97877,
    lng: -76.9416877,
  },
  {
    name: "Graduate Gardens Apartment 4320",
    addr: "Graduate Gardens Apartment 4320, College Park, MD",
    lat: 38.97877,
    lng: -76.9416877,
  },
  {
    name: "Graduate Gardens Apartment 4321",
    addr: "Graduate Gardens Apartment 4321, College Park, MD",
    lat: 38.97877,
    lng: -76.9416877,
  },
  {
    name: "Graduate Gardens Apartment 4322",
    addr: "Graduate Gardens Apartment 4322, College Park, MD",
    lat: 38.97877,
    lng: -76.9416877,
  },
  {
    name: "Graduate Gardens Apartment 4323",
    addr: "Graduate Gardens Apartment 4323, College Park, MD",
    lat: 38.97877,
    lng: -76.9416877,
  },
  {
    name: "Graduate Gardens Apartment 4324",
    addr: "Graduate Gardens Apartment 4324, College Park, MD",
    lat: 38.97877,
    lng: -76.9416877,
  },
  {
    name: "Graduate Gardens Apartment 4325",
    addr: "Graduate Gardens Apartment 4325, College Park, MD",
    lat: 38.97877,
    lng: -76.9416877,
  },
  {
    name: "Graduate Gardens Apartment 4326",
    addr: "Graduate Gardens Apartment 4326, College Park, MD",
    lat: 38.97877,
    lng: -76.9416877,
  },
  {
    name: "Graduate Gardens Apartment 4327",
    addr: "Graduate Gardens Apartment 4327, College Park, MD",
    lat: 38.97877,
    lng: -76.9416877,
  },
  {
    name: "Graduate Gardens Apartment 4329",
    addr: "Graduate Gardens Apartment 4329, College Park, MD",
    lat: 38.97877,
    lng: -76.9416877,
  },
  {
    name: "Graduate Gardens Apartment 4331",
    addr: "Graduate Gardens Apartment 4331, College Park, MD",
    lat: 38.97877,
    lng: -76.9416877,
  },
  {
    name: "Graduate Gardens Apartment 4333",
    addr: "Graduate Gardens Apartment 4333, College Park, MD",
    lat: 38.97877,
    lng: -76.9416877,
  },
  {
    name: "Graduate Gardens Apartment 4335",
    addr: "Graduate Gardens Apartment 4335, College Park, MD",
    lat: 38.97877,
    lng: -76.9416877,
  },
  {
    name: "Graduate Hills Apartment",
    addr: "Graduate Hills Apartment, College Park, MD",
    lat: 38.9846488,
    lng: -76.9573158,
  },
  {
    name: "Graduate Hills Apartment",
    addr: "Graduate Hills Apartment, College Park, MD",
    lat: 38.9846488,
    lng: -76.9573158,
  },
  {
    name: "Graduate Hills Apartment",
    addr: "Graduate Hills Apartment, College Park, MD",
    lat: 38.9846488,
    lng: -76.9573158,
  },
  {
    name: "Graduate Hills Apartment",
    addr: "Graduate Hills Apartment, College Park, MD",
    lat: 38.9846488,
    lng: -76.9573158,
  },
  {
    name: "Graduate Hills Apartment",
    addr: "Graduate Hills Apartment, College Park, MD",
    lat: 38.9846488,
    lng: -76.9573158,
  },
  {
    name: "Graduate Hills Apartment",
    addr: "Graduate Hills Apartment, College Park, MD",
    lat: 38.9846488,
    lng: -76.9573158,
  },
  {
    name: "Graduate Hills Apartment",
    addr: "Graduate Hills Apartment, College Park, MD",
    lat: 38.9846488,
    lng: -76.9573158,
  },
  {
    name: "Greek House 1 Kappa Alpha",
    addr: "Greek House 1 Kappa Alpha, College Park, MD",
    lat: 38.9924006,
    lng: -76.9369835,
  },
  {
    name: "Greek House 10 Sigma Kappa",
    addr: "Greek House 10 Sigma Kappa, College Park, MD",
    lat: 38.989372,
    lng: -76.9387165999999,
  },
  {
    name: "Greek House 11 Alpha Epsilon Phi",
    addr: "Greek House 11 Alpha Epsilon Phi, College Park, MD",
    lat: 38.9832723,
    lng: -76.9356329,
  },
  {
    name: "Greek House 12 Zeta Tau Alpha",
    addr: "Greek House 12 Zeta Tau Alpha, College Park, MD",
    lat: 38.9832535,
    lng: -76.9361730999999,
  },
  {
    name: "Greek House 13 Zeta Psi",
    addr: "Greek House 13 Zeta Psi, College Park, MD",
    lat: 38.9881427,
    lng: -76.941125,
  },
  {
    name: "Greek House 14 Sigma Chi",
    addr: "Greek House 14 Sigma Chi, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Greek House 170 Alpha Delta Pi",
    addr: "Greek House 170 Alpha Delta Pi, College Park, MD",
    lat: 38.9812804,
    lng: -76.9352052999999,
  },
  {
    name: "Greek House 171 Phi Sigma Sigma",
    addr: "Greek House 171 Phi Sigma Sigma, College Park, MD",
    lat: 38.981349,
    lng: -76.9356329,
  },
  {
    name: "Greek House 172 Alpha Chi Omega",
    addr: "Greek House 172 Alpha Chi Omega, College Park, MD",
    lat: 38.9814363,
    lng: -76.9360573,
  },
  {
    name: "Greek House 173 Delta Phi Epsilon",
    addr: "Greek House 173 Delta Phi Epsilon, College Park, MD",
    lat: 38.9807896,
    lng: -76.9363532,
  },
  {
    name: "Greek House 174 Sigma Delta Tau",
    addr: "Greek House 174 Sigma Delta Tau, College Park, MD",
    lat: 38.9806583,
    lng: -76.935903,
  },
  {
    name: "Greek House 175 Delta Gamma",
    addr: "Greek House 175 Delta Gamma, College Park, MD",
    lat: 38.9806072,
    lng: -76.9354529,
  },
  {
    name: "Greek House 176 Alpha Phi",
    addr: "Greek House 176 Alpha Phi, College Park, MD",
    lat: 38.9808848,
    lng: -76.9352502999999,
  },
  {
    name: "Greek House 2 Phi Sigma Kappa",
    addr: "Greek House 2 Phi Sigma Kappa, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Greek House 3 Zeta Beta Tau",
    addr: "Greek House 3 Zeta Beta Tau, College Park, MD",
    lat: 38.9832282,
    lng: -76.937186,
  },
  {
    name: "Greek House 4 The Agora",
    addr: "Greek House 4 The Agora, College Park, MD",
    lat: 38.9846359999999,
    lng: -76.9351152,
  },
  {
    name: "Greek House 5 Phi Kappa Alpha",
    addr: "Greek House 5 Phi Kappa Alpha, College Park, MD",
    lat: 38.9846946,
    lng: -76.9366908,
  },
  {
    name: "Greek House 6 Beta Theta Pi",
    addr: "Greek House 6 Beta Theta Pi, College Park, MD",
    lat: 38.9842941,
    lng: -76.9341955,
  },
  {
    name: "Greek House 7 Lamda Chi Alpha",
    addr: "Greek House 7 Lamda Chi Alpha, College Park, MD",
    lat: 38.9839381,
    lng: -76.9340374,
  },
  {
    name: "Greek House 8 Gamma Phi Beta",
    addr: "Greek House 8 Gamma Phi Beta, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Greek House 9 Alpha Sigma Phi",
    addr: "Greek House 9 Alpha Sigma Phi, College Park, MD",
    lat: 38.9832908,
    lng: -76.9346099,
  },
  {
    name: "Grounds Material & Equipment Building",
    addr: "Grounds Material & Equipment Building, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Grounds Operations & Maintenance Building",
    addr: "Grounds Operations & Maintenance Building, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Grounds Storage Facility",
    addr: "Grounds Storage Facility, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "H.J. Patterson Hall",
    addr: "H.J. Patterson Hall, College Park, MD",
    lat: 38.9868572,
    lng: -76.9432710999999,
  },
  {
    name: "Hagerstown Hall",
    addr: "Hagerstown Hall, College Park, MD",
    lat: 38.9924323,
    lng: -76.9474865,
  },
  {
    name: "Harford Hall",
    addr: "Harford Hall, College Park, MD",
    lat: 38.9825215,
    lng: -76.9408413,
  },
  {
    name: "Health Center",
    addr: "Health Center, College Park, MD",
    lat: 38.9872086,
    lng: -76.9444903999999,
  },
  {
    name: "Heavy Equipment Building",
    addr: "Heavy Equipment Building, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Herbert Rabin Technology Advancement Program Building",
    addr: "Herbert Rabin Technology Advancement Program Building, College Park, MD",
    lat: 38.9925244,
    lng: -76.9387526,
  },
  {
    name: "Hornbake Library",
    addr: "Hornbake Library, College Park, MD",
    lat: 38.98814,
    lng: -76.9414700999999,
  },
  {
    name: "Horse Barn",
    addr: "Horse Barn, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Howard Hall",
    addr: "Howard Hall, College Park, MD",
    lat: 38.9819663,
    lng: -76.9419578,
  },
  {
    name: "HVAC & PM Storage Building",
    addr: "HVAC & PM Storage Building, College Park, MD",
    lat: 38.9883099,
    lng: -76.9437471999999,
  },
  {
    name: "IBBR 1",
    addr: "IBBR 1, College Park, MD",
    lat: 38.9924006,
    lng: -76.9369835,
  },
  {
    name: "IBBR 2",
    addr: "IBBR 2, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Indoor Practice Facility",
    addr: "Indoor Practice Facility, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Institute for Physical Science & Technology",
    addr: "Institute for Physical Science & Technology, College Park, MD",
    lat: 38.9909836,
    lng: -76.942578,
  },
  {
    name: "Instructional Television Facility",
    addr: "Instructional Television Facility, College Park, MD",
    lat: 38.9895664,
    lng: -76.9383115,
  },
  {
    name: "J.M. Patterson Building",
    addr: "J.M. Patterson Building, College Park, MD",
    lat: 38.9905037,
    lng: -76.9402865,
  },
  {
    name: "Jimenez Hall",
    addr: "Jimenez Hall, College Park, MD",
    lat: 38.9868786,
    lng: -76.9446035,
  },
  {
    name: "John S. Toll Physics Building",
    addr: "John S. Toll Physics Building, College Park, MD",
    lat: 38.988616,
    lng: -76.9399996,
  },
  {
    name: "Johnson-Whittle Hall",
    addr: "Johnson-Whittle Hall, College Park, MD",
    lat: 38.9910261,
    lng: -76.9455306,
  },
  {
    name: "Jull Hall",
    addr: "Jull Hall, College Park, MD",
    lat: 38.9908501,
    lng: -76.9436233999999,
  },
  {
    name: "Kehoe Track at Ludwig Field",
    addr: "Kehoe Track at Ludwig Field, College Park, MD",
    lat: 38.9875332,
    lng: -76.9512982,
  },
  {
    name: "Kent Hall",
    addr: "Kent Hall, College Park, MD",
    lat: 38.9832801,
    lng: -76.9417553,
  },
  {
    name: "Kim Engineering Building",
    addr: "Kim Engineering Building, College Park, MD",
    lat: 38.9908937,
    lng: -76.9382885,
  },
  {
    name: "Knight Hall",
    addr: "Knight Hall, College Park, MD",
    lat: 38.9869389,
    lng: -76.9484847,
  },
  {
    name: "La Plata Hall",
    addr: "La Plata Hall, College Park, MD",
    lat: 38.9924253,
    lng: -76.9460316,
  },
  {
    name: "Laboratory for Physical Sciences",
    addr: "Laboratory for Physical Sciences, College Park, MD",
    lat: 38.9884878,
    lng: -76.9400915,
  },
  {
    name: "Laboratory for Telecommunication Sciences",
    addr: "Laboratory for Telecommunication Sciences, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "LEAFHouse",
    addr: "LEAFHouse, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Leased Facility 903",
    addr: "Leased Facility 903, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Leased Facility 911",
    addr: "Leased Facility 911, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Leased Facility 948",
    addr: "Leased Facility 948, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Lee Building",
    addr: "Lee Building, College Park, MD",
    lat: 38.9853763,
    lng: -76.9398659,
  },
  {
    name: "LeFrak Hall",
    addr: "LeFrak Hall, College Park, MD",
    lat: 38.9838709,
    lng: -76.9440029,
  },
  {
    name: "Leonardtown 244",
    addr: "Leonardtown 244, College Park, MD",
    lat: 38.9833794,
    lng: -76.9336215,
  },
  {
    name: "Leonardtown 245",
    addr: "Leonardtown 245, College Park, MD",
    lat: 38.9833794,
    lng: -76.9336215,
  },
  {
    name: "Leonardtown 246",
    addr: "Leonardtown 246, College Park, MD",
    lat: 38.9833794,
    lng: -76.9336215,
  },
  {
    name: "Leonardtown 247",
    addr: "Leonardtown 247, College Park, MD",
    lat: 38.9833794,
    lng: -76.9336215,
  },
  {
    name: "Leonardtown 248",
    addr: "Leonardtown 248, College Park, MD",
    lat: 38.9833794,
    lng: -76.9336215,
  },
  {
    name: "Leonardtown 249",
    addr: "Leonardtown 249, College Park, MD",
    lat: 38.9833794,
    lng: -76.9336215,
  },
  {
    name: "Leonardtown Community Center",
    addr: "Leonardtown Community Center, College Park, MD",
    lat: 38.9833794,
    lng: -76.9336215,
  },
  {
    name: "Leonardtown Office Building",
    addr: "Leonardtown Office Building, College Park, MD",
    lat: 38.9836811,
    lng: -76.9325266,
  },
  {
    name: "Manufacturing Building",
    addr: "Manufacturing Building, College Park, MD",
    lat: 38.9928737,
    lng: -76.9394138,
  },
  {
    name: "Marie Mount Hall",
    addr: "Marie Mount Hall, College Park, MD",
    lat: 38.9849416,
    lng: -76.9408098999999,
  },
  {
    name: "Martin Hall",
    addr: "Martin Hall, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Maryland Baseball Annex",
    addr: "Maryland Baseball Annex, College Park, MD",
    lat: 38.9869183,
    lng: -76.9425543,
  },
  {
    name: "Maryland Softball Stadium",
    addr: "Maryland Softball Stadium, College Park, MD",
    lat: 38.9905563,
    lng: -76.9445737,
  },
  {
    name: "McKeldin Library",
    addr: "McKeldin Library, College Park, MD",
    lat: 38.9859704,
    lng: -76.9450882,
  },
  {
    name: "Memorial Chapel",
    addr: "Memorial Chapel, College Park, MD",
    lat: 38.9842035,
    lng: -76.9408095,
  },
  {
    name: "MFRI Drill Tower",
    addr: "MFRI Drill Tower, College Park, MD",
    lat: 38.9832269,
    lng: -76.9289216,
  },
  {
    name: "MFRI Fire Extinguisher Training Facility",
    addr: "MFRI Fire Extinguisher Training Facility, College Park, MD",
    lat: 38.9832269,
    lng: -76.9289216,
  },
  {
    name: "MFRI Office/Classroom Building",
    addr: "MFRI Office/Classroom Building, College Park, MD",
    lat: 38.9832269,
    lng: -76.9289216,
  },
  {
    name: "MFRI Shop Facility",
    addr: "MFRI Shop Facility, College Park, MD",
    lat: 38.9832269,
    lng: -76.9289216,
  },
  {
    name: "MFRI Structural Firefighting Building",
    addr: "MFRI Structural Firefighting Building, College Park, MD",
    lat: 38.9832269,
    lng: -76.9289216,
  },
  {
    name: "Microbiology Building",
    addr: "Microbiology Building, College Park, MD",
    lat: 38.9881017,
    lng: -76.9434572,
  },
  {
    name: "Montgomery Hall",
    addr: "Montgomery Hall, College Park, MD",
    lat: 38.9818893,
    lng: -76.9392989,
  },
  {
    name: "Morrill Hall",
    addr: "Morrill Hall, College Park, MD",
    lat: 38.9843227,
    lng: -76.9441861,
  },
  {
    name: "Motorcycle Storage Building",
    addr: "Motorcycle Storage Building, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Mowatt Lane Parking Garage",
    addr: "Mowatt Lane Parking Garage, College Park, MD",
    lat: 38.9818227,
    lng: -76.9456046,
  },
  {
    name: "Neutral Buoyancy Research Facility",
    addr: "Neutral Buoyancy Research Facility, College Park, MD",
    lat: 38.9929114,
    lng: -76.9389707,
  },
  {
    name: "NOAA",
    addr: "NOAA, College Park, MD",
    lat: 38.972028,
    lng: -76.924384,
  },
  {
    name: "NOAA Parking Garage",
    addr: "NOAA Parking Garage, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "North Gate",
    addr: "North Gate, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Nyumburu Cultural Center",
    addr: "Nyumburu Cultural Center, College Park, MD",
    lat: 38.9881284999999,
    lng: -76.9438259,
  },
  {
    name: "Oakland Hall",
    addr: "Oakland Hall, College Park, MD",
    lat: 38.9938377,
    lng: -76.9493555999999,
  },
  {
    name: "Paint Branch Building",
    addr: "Paint Branch Building, College Park, MD",
    lat: 38.9952949,
    lng: -76.9375278,
  },
  {
    name: "Paint Branch Gate",
    addr: "Paint Branch Gate, College Park, MD",
    lat: 38.9952949,
    lng: -76.9375278,
  },
  {
    name: "Parren J. Mitchell Art-Sociology Building",
    addr: "Parren J. Mitchell Art-Sociology Building, College Park, MD",
    lat: 38.9851345,
    lng: -76.9477726,
  },
  {
    name: "Patapsco Building",
    addr: "Patapsco Building, College Park, MD",
    lat: 38.9767316,
    lng: -76.9249632,
  },
  {
    name: "Patuxent Building",
    addr: "Patuxent Building, College Park, MD",
    lat: 38.9886748,
    lng: -76.9434381,
  },
  {
    name: "Physical Sciences Complex",
    addr: "Physical Sciences Complex, College Park, MD",
    lat: 38.9908687,
    lng: -76.9413781,
  },
  {
    name: "Physics Welding Shop",
    addr: "Physics Welding Shop, College Park, MD",
    lat: 38.9891391,
    lng: -76.939842,
  },
  {
    name: "Plant Operations & Maintenance Storage Building",
    addr: "Plant Operations & Maintenance Storage Building, College Park, MD",
    lat: 38.986459,
    lng: -76.9344962,
  },
  {
    name: "Plant Operations & Maintenance Storage Building",
    addr: "Plant Operations & Maintenance Storage Building, College Park, MD",
    lat: 38.986459,
    lng: -76.9344962,
  },
  {
    name: "Plant Sciences Building",
    addr: "Plant Sciences Building, College Park, MD",
    lat: 38.9888289,
    lng: -76.94117,
  },
  {
    name: "Pocomoke Building",
    addr: "Pocomoke Building, College Park, MD",
    lat: 38.9829345,
    lng: -76.9368934,
  },
  {
    name: "Police Services & Training Facility",
    addr: "Police Services & Training Facility, College Park, MD",
    lat: 38.9761314,
    lng: -76.9253234,
  },
  {
    name: "Poultry Barn",
    addr: "Poultry Barn, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Preinkert Hall",
    addr: "Preinkert Hall, College Park, MD",
    lat: 38.9843667,
    lng: -76.9460582,
  },
  {
    name: "Prince Frederick Hall",
    addr: "Prince Frederick Hall, College Park, MD",
    lat: 38.9831657999999,
    lng: -76.9457690999999,
  },
  {
    name: "Prince George's Hall",
    addr: "Prince George's Hall, College Park, MD",
    lat: 38.9826045,
    lng: -76.9417552,
  },
  {
    name: "Pyon-Chen Hall",
    addr: "Pyon-Chen Hall, College Park, MD",
    lat: 38.9920012,
    lng: -76.9450171,
  },
  {
    name: "Queen Anne's Hall",
    addr: "Queen Anne's Hall, College Park, MD",
    lat: 38.9852912,
    lng: -76.9463162,
  },
  {
    name: "Reckord Armory",
    addr: "Reckord Armory, College Park, MD",
    lat: 38.985995,
    lng: -76.9388369999999,
  },
  {
    name: "Regents Drive Parking Garage",
    addr: "Regents Drive Parking Garage, College Park, MD",
    lat: 38.9874356,
    lng: -76.9399595,
  },
  {
    name: "Research Greenhouse",
    addr: "Research Greenhouse, College Park, MD",
    lat: 38.9978665,
    lng: -76.9425595,
  },
  {
    name: "Research Park Building 1",
    addr: "Research Park Building 1, College Park, MD",
    lat: 38.9924006,
    lng: -76.9369835,
  },
  {
    name: "Residential Facilities Building 116",
    addr: "Residential Facilities Building 116, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Residential Facilities Building 204",
    addr: "Residential Facilities Building 204, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Residential Facilities Building 207",
    addr: "Residential Facilities Building 207, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Riggs Alumni Center",
    addr: "Riggs Alumni Center, College Park, MD",
    lat: 38.9895972,
    lng: -76.9491342,
  },
  {
    name: "Ritchie Coliseum",
    addr: "Ritchie Coliseum, College Park, MD",
    lat: 38.985037,
    lng: -76.936431,
  },
  {
    name: "Rossborough Inn",
    addr: "Rossborough Inn, College Park, MD",
    lat: 38.9852827,
    lng: -76.9376362,
  },
  {
    name: "Sample Preparation Building",
    addr: "Sample Preparation Building, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "School of Public Health Building",
    addr: "School of Public Health Building, College Park, MD",
    lat: 38.993454,
    lng: -76.9431565,
  },
  {
    name: "SECU Stadium Building Upper Deck",
    addr: "SECU Stadium Building Upper Deck, College Park, MD",
    lat: 38.9902668,
    lng: -76.9472423,
  },
  {
    name: "SECU Stadium Concessions",
    addr: "SECU Stadium Concessions, College Park, MD",
    lat: 38.9902668,
    lng: -76.9472423,
  },
  {
    name: "SECU Stadium Concessions",
    addr: "SECU Stadium Concessions, College Park, MD",
    lat: 38.9902668,
    lng: -76.9472423,
  },
  {
    name: "SECU Stadium Concessions",
    addr: "SECU Stadium Concessions, College Park, MD",
    lat: 38.9902668,
    lng: -76.9472423,
  },
  {
    name: "SECU Stadium Concessions",
    addr: "SECU Stadium Concessions, College Park, MD",
    lat: 38.9902668,
    lng: -76.9472423,
  },
  {
    name: "SECU Stadium Concessions",
    addr: "SECU Stadium Concessions, College Park, MD",
    lat: 38.9902668,
    lng: -76.9472423,
  },
  {
    name: "SECU Stadium Concessions",
    addr: "SECU Stadium Concessions, College Park, MD",
    lat: 38.9902668,
    lng: -76.9472423,
  },
  {
    name: "SECU Stadium Maintenance Building",
    addr: "SECU Stadium Maintenance Building, College Park, MD",
    lat: 38.9902668,
    lng: -76.9472423,
  },
  {
    name: "SECU Stadium Ticket Booth",
    addr: "SECU Stadium Ticket Booth, College Park, MD",
    lat: 38.9909565,
    lng: -76.9468589,
  },
  {
    name: "Seneca Building",
    addr: "Seneca Building, College Park, MD",
    lat: 38.9943047,
    lng: -76.9313902999999,
  },
  {
    name: "Service Building",
    addr: "Service Building, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Severn Building",
    addr: "Severn Building, College Park, MD",
    lat: 38.9966389999999,
    lng: -76.922612,
  },
  {
    name: "Sheep Barn",
    addr: "Sheep Barn, College Park, MD",
    lat: 38.9915942,
    lng: -76.9418095,
  },
  {
    name: "Shoemaker Building",
    addr: "Shoemaker Building, College Park, MD",
    lat: 38.9839486,
    lng: -76.9425988,
  },
  {
    name: "Shuttle Bus Facility",
    addr: "Shuttle Bus Facility, College Park, MD",
    lat: 38.9955054,
    lng: -76.9371038,
  },
  {
    name: "Skinner Building",
    addr: "Skinner Building, College Park, MD",
    lat: 38.9847785,
    lng: -76.9418453,
  },
  {
    name: "Somerset Hall",
    addr: "Somerset Hall, College Park, MD",
    lat: 38.9850486,
    lng: -76.9455803,
  },
  {
    name: "South Campus Commons 1",
    addr: "South Campus Commons 1, College Park, MD",
    lat: 38.9819021,
    lng: -76.9429748,
  },
  {
    name: "South Campus Commons 2",
    addr: "South Campus Commons 2, College Park, MD",
    lat: 38.982591,
    lng: -76.9428511999999,
  },
  {
    name: "South Campus Commons 3",
    addr: "South Campus Commons 3, College Park, MD",
    lat: 38.9814517,
    lng: -76.9397662,
  },
  {
    name: "South Campus Commons 4",
    addr: "South Campus Commons 4, College Park, MD",
    lat: 38.9812715,
    lng: -76.9414146,
  },
  {
    name: "South Campus Commons 5",
    addr: "South Campus Commons 5, College Park, MD",
    lat: 38.9827818,
    lng: -76.9446251999999,
  },
  {
    name: "South Campus Commons 6",
    addr: "South Campus Commons 6, College Park, MD",
    lat: 38.9821728,
    lng: -76.9447057,
  },
  {
    name: "South Campus Commons 7",
    addr: "South Campus Commons 7, College Park, MD",
    lat: 38.9814706,
    lng: -76.9446383,
  },
  {
    name: "South Campus Dining Hall",
    addr: "South Campus Dining Hall, College Park, MD",
    lat: 38.9830244,
    lng: -76.9436908999999,
  },
  {
    name: "South Gate",
    addr: "South Gate, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "St. Mary's Hall",
    addr: "St. Mary's Hall, College Park, MD",
    lat: 38.9869541,
    lng: -76.9456225,
  },
  {
    name: "Stadium Drive Parking Garage",
    addr: "Stadium Drive Parking Garage, College Park, MD",
    lat: 38.9908288,
    lng: -76.9489124999999,
  },
  {
    name: "Stamp Student Union",
    addr: "Stamp Student Union, College Park, MD",
    lat: 38.9881767,
    lng: -76.9446677999999,
  },
  {
    name: "Susquehanna Hall",
    addr: "Susquehanna Hall, College Park, MD",
    lat: 38.9821079,
    lng: -76.9437359,
  },
  {
    name: "Symons Hall",
    addr: "Symons Hall, College Park, MD",
    lat: 38.9870947,
    lng: -76.9406504,
  },
  {
    name: "Talbot Hall",
    addr: "Talbot Hall, College Park, MD",
    lat: 38.9833645,
    lng: -76.9422728999999,
  },
  {
    name: "Taliaferro Hall",
    addr: "Taliaferro Hall, College Park, MD",
    lat: 38.9849248,
    lng: -76.942921,
  },
  {
    name: "Tawes Hall",
    addr: "Tawes Hall, College Park, MD",
    lat: 38.9859487,
    lng: -76.9485837,
  },
  {
    name: "Technology Ventures Building",
    addr: "Technology Ventures Building, College Park, MD",
    lat: 38.9795324,
    lng: -76.9252784,
  },
  {
    name: "Terrapin Trail Parking Garage",
    addr: "Terrapin Trail Parking Garage, College Park, MD",
    lat: 38.9957351,
    lng: -76.9458456,
  },
  {
    name: "The Hall",
    addr: "The Hall, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "The Hotel at the University of Maryland",
    addr: "The Hotel at the University of Maryland, College Park, MD",
    lat: 38.9869418,
    lng: -76.9357092,
  },
  {
    name: "Thomas V. Miller, Jr. Administration Building",
    addr: "Thomas V. Miller, Jr. Administration Building, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Thurgood Marshall Hall",
    addr: "Thurgood Marshall Hall, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Track & Soccer Field Ticket Booth",
    addr: "Track & Soccer Field Ticket Booth, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Turfgrass Research Facility",
    addr: "Turfgrass Research Facility, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Turner Hall",
    addr: "Turner Hall, College Park, MD",
    lat: 38.9861397,
    lng: -76.9373264,
  },
  {
    name: "Tydings Hall",
    addr: "Tydings Hall, College Park, MD",
    lat: 38.9847914,
    lng: -76.9439726,
  },
  {
    name: "Tyser Tower",
    addr: "Tyser Tower, College Park, MD",
    lat: 38.9896229,
    lng: -76.9479681,
  },
  {
    name: "UMGC Administration Building",
    addr: "UMGC Administration Building, College Park, MD",
    lat: 38.9864552,
    lng: -76.9539930999999,
  },
  {
    name: "UMGC/Marriott Garage",
    addr: "UMGC/Marriott Garage, College Park, MD",
    lat: 38.9864552,
    lng: -76.9539930999999,
  },
  {
    name: "Union Lane Parking Garage",
    addr: "Union Lane Parking Garage, College Park, MD",
    lat: 38.9880313,
    lng: -76.9454162,
  },
  {
    name: "University House",
    addr: "University House, College Park, MD",
    lat: 38.9889725,
    lng: -76.9527863,
  },
  {
    name: "Van Munching Hall",
    addr: "Van Munching Hall, College Park, MD",
    lat: 38.9830569,
    lng: -76.9470575,
  },
  {
    name: "Varsity Sports Teamhouse",
    addr: "Varsity Sports Teamhouse, College Park, MD",
    lat: 38.9900446,
    lng: -76.9451764,
  },
  {
    name: "Veterinary Science Barn",
    addr: "Veterinary Science Barn, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Veterinary Science Equipment Storage Building",
    addr: "Veterinary Science Equipment Storage Building, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Washington Hall",
    addr: "Washington Hall, College Park, MD",
    lat: 38.9818322,
    lng: -76.9413051,
  },
  {
    name: "West Gate",
    addr: "West Gate, College Park, MD",
    lat: 38.9896967,
    lng: -76.93776,
  },
  {
    name: "Wicomico Hall",
    addr: "Wicomico Hall, College Park, MD",
    lat: 38.9837452,
    lng: -76.9457049999999,
  },
  {
    name: "William E. Kirwan Hall",
    addr: "William E. Kirwan Hall, College Park, MD",
    lat: 38.9889643,
    lng: -76.9392171,
  },
  {
    name: "Wind Tunnel Building",
    addr: "Wind Tunnel Building, College Park, MD",
    lat: 38.9898874,
    lng: -76.9369036,
  },
  {
    name: "Woods Hall",
    addr: "Woods Hall, College Park, MD",
    lat: 38.9851622,
    lng: -76.9419602999999,
  },
  {
    name: "Worcester Hall",
    addr: "Worcester Hall, College Park, MD",
    lat: 38.9846284,
    lng: -76.9450255,
  },
  {
    name: "Wye Oak Building",
    addr: "Wye Oak Building, College Park, MD",
    lat: 38.995933,
    lng: -76.9437105,
  },
  {
    name: "Xfinity Center",
    addr: "Xfinity Center, College Park, MD",
    lat: 38.9957391,
    lng: -76.9418063999999,
  },
  {
    name: "Yahentamitsi Dining Hall",
    addr: "Yahentamitsi Dining Hall, College Park, MD",
    lat: 38.99125,
    lng: -76.9447426,
  },
];

module.exports = { req, getCoords };
