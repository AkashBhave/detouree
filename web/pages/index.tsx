import { useState } from "react";
import {
  Center,
  Text,
  Heading,
  Box,
  Input,
  HStack,
  VStack,
  Button,
} from "@chakra-ui/react";
import Head from "next/head";
import axios from "axios";
import Map from "react-map-gl";
import maplibregl from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";

const Home = () => {
  return (
    <>
      <Head>
        <title>Detouree</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Map
        mapLib={maplibregl}
        initialViewState={{
          longitude: -76.9431575,
          latitude: 38.9900915,
          zoom: 14,
        }}
        style={{ width: "100%", height: "100%" }}
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
          },
          layers: [
            {
              id: "basemap",
              type: "raster",
              source: "basemap",
              minzoom: 0,
              maxzoom: 22,
            },
          ],
        }}
      />
    </>
  );
};

export default Home;
