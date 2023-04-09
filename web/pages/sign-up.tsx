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
  Select,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import Head from "next/head";
import axios from "axios";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

const reorder = (list: any[], startIndex: number, endIndex: number) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
};

const buildings = [
  "Montgomery Hall",
  "Sheep Barn",
  "Eppley Recreation Center",
  "South Campus Dining Hall",
  "Architecture Building",
  "Hornbake Library",
  "Stamp Student Union",
  "Tawes Hall",
  "Jull Hall",
];

const SignUpPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [classes, setClasses] = useState([
    ["Montgomery Hall", "Stamp Student Union"],
  ]);

  const router = useRouter();

  const onDragEnd = (result: any) => {
    // dropped outside the list
    if (!result.destination) {
      return;
    }

    const items = reorder(
      classes,
      result.source.index,
      result.destination.index
    );

    setClasses(items);
  };

  const submit = () => {
    if (username == "" || password == "") return;
    axios
      .post(`${process.env.API_URL}/users`, {
        username,
        password,
        firstName,
        lastName,
        phone,
        classes: classes.map((c) => {
          return { b1: c[0], b2: c[1] };
        }),
      })
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
        <title>Sign Up | Detouree</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main style={{ height: "100%" }}>
        <Center h="full" flexDir="column">
          <Heading as="h1" fontSize={32} fontWeight="bold" mb={8}>
            Sign Up
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
            <HStack>
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
            </HStack>
            <HStack>
              <Box w="full">
                <Text mb={2}>First Name</Text>
                <Input
                  w="full"
                  border="1px solid lightgray"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  padding={2}
                  rounded="md"
                />
              </Box>
              <Box w="full">
                <Text mb={2}>Last Name</Text>
                <Input
                  w="full"
                  border="1px solid lightgray"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  padding={2}
                  rounded="md"
                />
              </Box>
            </HStack>
            <Box w="full">
              <Text mb={2}>Phone Number</Text>
              <Input
                w="full"
                border="1px solid lightgray"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                padding={2}
                rounded="md"
              />
            </Box>
            <Box w="full">
              <Text mb={2}>Classes</Text>
              <VStack spacing={2}>
                {classes.map((item, index) => (
                  <HStack key={`${item[0]}/${item[1]}`}>
                    <Select
                      value={classes[index][0]}
                      onChange={(e) => {
                        const newClasses = [...classes];
                        newClasses[index][0] = e.target.value;
                        setClasses(newClasses);
                      }}
                    >
                      {buildings.map((b) => (
                        <option value={b} key={b}>
                          {b}
                        </option>
                      ))}
                    </Select>
                    <Select
                      value={classes[index][1]}
                      onChange={(e) => {
                        const newClasses = [...classes];
                        newClasses[index][1] = e.target.value;
                        setClasses(newClasses);
                      }}
                    >
                      {buildings.map((b) => (
                        <option value={b} key={b}>
                          {b}
                        </option>
                      ))}
                    </Select>
                  </HStack>
                ))}
              </VStack>

              <Button
                colorScheme="green"
                mt={4}
                variant="outline"
                onClick={() => {
                  const newClasses = [...classes];
                  newClasses.push(["Montgomery Hall", "Stamp Student Union"]);
                  setClasses(newClasses);
                }}
              >
                Add Class
              </Button>
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

export default SignUpPage;
