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
} from "@chakra-ui/react";
import Head from "next/head";

const Account = () => {
  const [user, setUser] = useState<any>();
  useEffect(() => {
    let u = localStorage.getItem("user");
    if (u == null || u == "") return;
    u = JSON.parse(u);
    if (u == null) return;
    setUser(u);
  }, []);

  return (
    <>
      <Head>
        <title>Detouree</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main style={{ height: "100%" }}>
        <Center h="full" flexDir="column">
          <Heading as="h1" fontSize={32} fontWeight="bold" mb={8}>
            Account
          </Heading>
          {user != null ? (
            <VStack
              as="form"
              w="500px"
              border="1px solid lightgray"
              p={4}
              fontSize={24}
              rounded="md"
              spacing={6}
            >
              <Box w="full">
                <Text mb={2} as="span" fontWeight="bold">
                  Username:{" "}
                </Text>
                <Text as="span">{user.username}</Text>
              </Box>
              <Box w="full">
                <Text mb={2} as="span" fontWeight="bold">
                  First Name:{" "}
                </Text>
                <Text as="span">{user.firstName}</Text>
              </Box>
              <Box w="full">
                <Text mb={2} as="span" fontWeight="bold">
                  Last Name:{" "}
                </Text>
                <Text as="span">{user.lastName}</Text>
              </Box>
              <Box w="full">
                <Text mb={2} as="span" fontWeight="bold">
                  Classes:{" "}
                </Text>
                <Text as="span">{JSON.stringify(user.classes)}</Text>
              </Box>
            </VStack>
          ) : null}
        </Center>
      </main>
    </>
  );
};

export default Account;
