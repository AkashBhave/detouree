import { useEffect, useState } from "react";
import type { AppProps } from "next/app";
import {
  Box,
  Button,
  Flex,
  Text,
  HStack,
  VStack,
  Link as CLink,
  ChakraProvider,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import Link from "next/link";
import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  const [isUser, setIsUser] = useState<boolean>();
  useEffect(() => {
    const u = localStorage.getItem("user");
    setIsUser(u != null);
  }, []);

  const router = useRouter();

  return (
    <ChakraProvider>
      <Flex m={0} p={0} flexDir="column" h="full">
        <Flex
          px={4}
          py={3}
          borderBottom="1px solid lightgray"
          align="center"
          justify="space-between"
          id="header"
        >
          <Flex flexDir="row" align="center">
            <img
              src="/detour.svg"
              style={{ height: "50px", marginTop: "-10px" }}
            />
            <Text fontWeight="bold" marginLeft="-10px">
              Detouree
            </Text>
          </Flex>
          <HStack spacing={4}>
            <Link passHref href="/">
              <Button variant="outline" colorScheme="red" px={2}>
                <CLink as="span">Campus Map</CLink>
              </Button>
            </Link>
            <Link passHref href="/update">
              <Button variant="outline" colorScheme="blue" px={2}>
                <CLink as="span">Submit an Update</CLink>
              </Button>
            </Link>
            {isUser === undefined ? null : isUser === false ? (
              <>
                <Link passHref href="/log-in">
                  <CLink as="span">Log In</CLink>
                </Link>
                <Link passHref href="/sign-up">
                  <CLink as="span">Sign Up</CLink>
                </Link>
              </>
            ) : (
              <>
                <Link passHref href="/account">
                  <CLink as="span">Account</CLink>
                </Link>
                <CLink
                  as="span"
                  onClick={() => {
                    localStorage.removeItem("user");
                    window.location.href = "/log-in";
                  }}
                >
                  Log Out
                </CLink>
              </>
            )}
          </HStack>
        </Flex>
        <Box m={0} p={0} flexGrow={1} h="full">
          <Component {...pageProps} />
        </Box>
      </Flex>
    </ChakraProvider>
  );
}
