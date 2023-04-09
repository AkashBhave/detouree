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
import { useRouter } from "next/router";
import Head from "next/head";
import axios from "axios";

const Home = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const router = useRouter();

  const submit = () => {
    if (username == "" || password == "") return;
    axios
      .post(`${process.env.API_URL}/auth`, { username, password })
      .then((res) => {
        const user = res.data;
        localStorage.setItem("user", JSON.stringify(user));
        window.location.href = "/account";
      })
      .catch((err) => {
        alert("ERROR");
      });
  };

  return (
    <>
      <Head>
        <title>Log In | Detouree</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main style={{ height: "100%" }}>
        <Center h="full" flexDir="column">
          <Heading as="h1" fontSize={32} fontWeight="bold" mb={8}>
            Log In
          </Heading>
          <VStack
            as="form"
            w="500px"
            border="1px solid lightgray"
            p={4}
            fontSize="lg"
            rounded="md"
            spacing={6}
          >
            <Box w="full">
              <Text mb={2}>Username</Text>
              <Input
                w="full"
                border="1px solid lightgray"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                padding={2}
                rounded="md"
              />
            </Box>
            <Box w="full">
              <Text mb={2}>Password</Text>
              <Input
                w="full"
                border="1px solid lightgray"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                padding={2}
                rounded="md"
              />
            </Box>
            <Button colorScheme="red" onClick={submit}>
              Submit
            </Button>
          </VStack>
        </Center>
      </main>
    </>
  );
};

export default Home;
