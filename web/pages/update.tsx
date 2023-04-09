import { useEffect, useState, useCallback } from "react";
import {
  Center,
  Text,
  Heading,
  Box,
  Input,
  HStack,
  VStack,
  Button,
  Flex,
  StackDivider,
} from "@chakra-ui/react";
import Head from "next/head";
import axios from "axios";
import Map, { Marker, NavigationControl } from "react-map-gl";
import type { MarkerDragEvent, LngLat } from "react-map-gl";
import * as turf from "@turf/turf";

import maplibregl from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";
import Pin from "../components/pin";

const UpdatePage = () => {
  const [name, setName] = useState("");
  const [polygon, setPolygon] = useState<any>();

  const [marker1, setMarker1] = useState({
    longitude: -76.9431575,
    latitude: 38.9900915,
  });
  const [marker2, setMarker2] = useState({
    longitude: -76.9451575,
    latitude: 38.9850915,
  });
  const [events, logEvents] = useState<Record<string, LngLat>>({});

  const onMarkerDragStart = useCallback((event: MarkerDragEvent) => {
    logEvents((_events) => ({ ..._events, onDragStart: event.lngLat }));
  }, []);

  const onMarkerDrag1 = useCallback((event: MarkerDragEvent) => {
    logEvents((_events) => ({ ..._events, onDrag: event.lngLat }));
    setMarker1({
      longitude: event.lngLat.lng,
      latitude: event.lngLat.lat,
    });
  }, []);
  const onMarkerDrag2 = useCallback((event: MarkerDragEvent) => {
    logEvents((_events) => ({ ..._events, onDrag: event.lngLat }));
    setMarker2({
      longitude: event.lngLat.lng,
      latitude: event.lngLat.lat,
    });
  }, []);

  const onMarkerDragEnd = useCallback((event: MarkerDragEvent) => {
    logEvents((_events) => ({ ..._events, onDragEnd: event.lngLat }));
  }, []);

  useEffect(() => {
    var pointA = turf.point([marker1.longitude, marker1.latitude]);
    var pointB = turf.point([marker2.longitude, marker2.latitude]);
    var bbx = turf.bbox(turf.featureCollection([pointA, pointB]));
    var pgn = turf.bboxPolygon(bbx);
    setPolygon(pgn);
  }, [marker1, marker2]);

  const submit = () => {
    axios
      .post(`${process.env.API_URL}/obstacles`, {
        name,
        boundary: polygon,
      })
      .then((res) => {
        window.location.href = "/";
      });
  };

  return (
    <>
      <Head>
        <title>Submit an Update | Detouree</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Flex w="full" h="full">
        {polygon != null ? (
          <Map
            mapLib={maplibregl}
            initialViewState={{
              longitude: -76.9431575,
              latitude: 38.9900915,
              zoom: 14.5,
            }}
            mapStyle={{
              version: 8,
              sources: {
                basemap: {
                  type: "raster",
                  tiles: [
                    "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
                    "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
                    "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
                  ],
                  tileSize: 256,
                  attribution:
                    'Map tiles by <a target="_top" rel="noopener" href="http://stamen.com">Stamen Design</a>, under <a target="_top" rel="noopener" href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a target="_top" rel="noopener" href="http://openstreetmap.org">OpenStreetMap</a>, under <a target="_top" rel="noopener" href="http://creativecommons.org/licenses/by-sa/3.0">CC BY SA</a>',
                },
                polygon: {
                  type: "geojson",
                  data: polygon || {},
                },
              },
              layers: [
                {
                  id: "basemap",
                  type: "raster",
                  source: "basemap",
                  minzoom: 0,
                  maxzoom: 22,
                },
                {
                  id: `poly`,
                  type: "fill",
                  source: `polygon`,
                  layout: {},
                  paint: {
                    "fill-color": "#2b6cb0",
                    "fill-opacity": 0.8,
                  },
                },
              ],
            }}
          >
            <Marker
              longitude={marker1.longitude}
              latitude={marker1.latitude}
              anchor="bottom"
              draggable
              onDragStart={onMarkerDragStart}
              onDrag={onMarkerDrag1}
              onDragEnd={onMarkerDragEnd}
            >
              <Pin size={20} />
            </Marker>
            <Marker
              longitude={marker2.longitude}
              latitude={marker2.latitude}
              anchor="bottom"
              draggable
              onDragStart={onMarkerDragStart}
              onDrag={onMarkerDrag2}
              onDragEnd={onMarkerDragEnd}
            >
              <Pin size={20} />
            </Marker>
            <NavigationControl />
          </Map>
        ) : null}
        <Box w="500px" h="full" p={4}>
          <Heading as="h1" fontSize={32} mb={4}>
            Submit an Update
          </Heading>
          <Text mb={4}>You've selected the following coordinates.</Text>
          <Box mb={4}>
            <Text>{`latitude: ${marker1.latitude}, longitude: ${marker1.longitude}`}</Text>
            <Text>{`latitude: ${marker2.latitude}, longitude: ${marker2.longitude}`}</Text>
          </Box>
          <Box mb={6}>
            <Text fontSize="lg" mb={2}>
              Name
            </Text>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Box>
          <Button colorScheme="red" onClick={submit}>
            Submit
          </Button>
        </Box>
      </Flex>
    </>
  );
};

export default UpdatePage;
