import { useEffect, useState } from "react";
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
import Map, { NavigationControl } from "react-map-gl";
import maplibregl from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";

const defaultStyle = {
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
};

const Home = () => {
  const [obstacles, setObstacles] = useState<any[]>([]);
  const [style, setStyle] = useState(defaultStyle);
  const [selObstacle, setSelObstacle] = useState<string>();

  useEffect(() => {
    axios.get(`${process.env.API_URL}/obstacles`).then((res) => {
      setObstacles(res.data);
    });
  }, []);

  useEffect(() => {
    const newStyle = JSON.parse(JSON.stringify(defaultStyle)) as any;
    for (const o of obstacles) {
      newStyle.sources[`obstacle-${o.id}`] = {
        type: "geojson",
        data: o.boundary,
      };
      newStyle.layers.push({
        id: `obs-${o.id}`,
        type: "fill",
        source: `obstacle-${o.id}`,
        layout: {},
        paint: {
          "fill-color": o.id == selObstacle ? "#2b6cb0" : "#C05621",
          "fill-opacity": 0.8,
        },
      });
    }
    setStyle(newStyle);
  }, [obstacles, selObstacle]);

  return (
    <>
      <Head>
        <title>Detouree</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Flex w="full" h="full">
        <Map
          mapLib={maplibregl}
          initialViewState={{
            longitude: -76.9431575,
            latitude: 38.9900915,
            zoom: 14.5,
          }}
          style={{ width: "100%", height: "100%" }}
          // @ts-ignore
          mapStyle={style}
        >
          <NavigationControl />
        </Map>
        <Box w="500px" h="full" p={4}>
          <Heading as="h1" fontSize={32} mb={4}>
            Campus Map
          </Heading>
          <VStack align="start" divider={<StackDivider />}>
            {obstacles.map((o) => (
              <Box p={2} w="full" key={o.id} cursor="pointer">
                <Text
                  color={o.id == selObstacle ? "blue.600" : "black"}
                  onClick={() => setSelObstacle(o.id)}
                >
                  {o.name}
                </Text>
              </Box>
            ))}
          </VStack>
        </Box>
      </Flex>
    </>
  );
};

export default Home;
