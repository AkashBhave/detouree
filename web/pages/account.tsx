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
  Divider,
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

const AccountPage = () => {
  const [user, setUser] = useState<any>();
  const [selBP, setSelBP] = useState<number>();
  const [style, setStyle] = useState<any>();

  useEffect(() => {
    let localU = localStorage.getItem("user");
    if (localU == null || localU == "") return;
    const u = JSON.parse(localU);
    if (u == null) return;
    axios
      .post(`${process.env.API_URL}/auth`, {
        username: u.username,
        password: u.password,
      })
      .then((res) => {
        const us = res.data;
        localStorage.setItem("user", JSON.stringify(us));
        setUser(us);
        setSelBP(0);
      })
      .catch((err) => {
        alert("ERROR");
      });
  }, []);

  useEffect(() => {
    if (user == null) return;
    const newStyle = JSON.parse(JSON.stringify(defaultStyle)) as any;
    for (let i = 0; i < user.classes.length; i += 1) {
      newStyle.sources[`route-${i}`] = {
        type: "geojson",
        data: user.classes[i].path,
      };
      newStyle.layers.push({
        id: `ro-${i}`,
        type: "line",
        source: `route-${i}`,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": i == selBP ? "#2b6cb0" : "#C05621",
          "line-opacity": 0.8,
          "line-width": 5,
        },
      });
    }
    setStyle(newStyle);
  }, [user, selBP]);

  return (
    <>
      <Head>
        <title>Account | Detouree</title>
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
            Account
          </Heading>
          {user != null ? (
            <>
              <VStack align="start">
                <Text>Username: {user.username}</Text>
                <Text>First Name: {user.firstName}</Text>
                <Text>Last Name: {user.lastName}</Text>
                <Text>Phone Number: {user.phone}</Text>
              </VStack>
              <Divider my={4} />
              <VStack align="start" divider={<StackDivider />}>
                {user.classes.map((c: any, i: number) => (
                  <Text
                    key={`${c.b1}/${c.b2}`}
                    color={i == selBP ? "#2b6cb0" : "#C05621"}
                    onClick={() => setSelBP(i)}
                    cursor="pointer"
                  >
                    {i + 1}. {c.b1} to {c.b2} ({c.length.toFixed(2)} miles,
                    updated{" "}
                    {new Date(Date.parse(c.updatedAt)).toLocaleDateString()})
                  </Text>
                ))}
              </VStack>
            </>
          ) : null}
        </Box>
      </Flex>
    </>
  );
};

export default AccountPage;
