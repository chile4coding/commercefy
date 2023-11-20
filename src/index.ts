import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import prisma from "./configuration/prisma-client";
import morgan from "morgan";
const { ComplyCube } = require("@complycube/api");
import errorHandler from "./middleware/errorHandler";
dotenv.config();

const complycube = new ComplyCube({
  apiKey:
    "test_dWpqTTg4dm1OekhKU01pb3k6YTU3MDdlZGI5ODhlNTk3NTViNjk2OWYyYzk1NWYwOWY1MjY1MGQwOTAyYzA3MTM5MTcyY2MyN2E2OWQ1YTYwNQ==",
});

const app = express();
app.use(bodyParser.json());
app.use(morgan("dev"));

app.post("/create", async (req, res, next) => {
  const { firstname, email, lastname } = req.body;

  const client = await complycube.client.create({
    type: "person",
    email: email,
    personDetails: {
      firstName: firstname,
      lastName: lastname,
    },
  });

  const { id } = client;

  const token = await complycube.token.generate(id, {
    referrer: "https://www.example.com/*",
  });

  console.log(client);
  res.status(200).json({
    token,
  });
});
app.post("/create", async (req, res, next) => {
  const check = await complycube.check.get("CHECK_ID");
});

app.use(errorHandler);
app.listen(3000, async () => {
  try {
    await prisma.$connect()
  } catch (error) {
    console.log(error);
  }
  console.log("Server started on port 3000");
});
