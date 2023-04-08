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

const Home = () => {
  return (
    <>
      <Head>
        <title>Detouree</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main style={{ height: "100%" }}>
        <Center h="full" flexDir="column">
          Welcome to Detouree!
        </Center>
      </main>
    </>
  );
};

export default Home;
