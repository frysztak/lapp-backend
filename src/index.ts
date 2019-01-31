require("dotenv").config();

import express from "express";
import bodyParser from "body-parser";
import fetch from "fetch-with-proxy";
import SSE from "express-sse";
import { Dropbox } from "dropbox";

import yargs from "yargs";

const argv = yargs
  .option("port", {
    alias: "p",
    type: "number",
    description: "Port number"
  })
  .demandOption("port")
  .strict().argv;

const app = express();
app.use(bodyParser.json());

var env = process.env.NODE_ENV || "development";
if (env === "development") {
  app.use((req, res, next) => {
    res
      .header("Access-Control-Allow-Origin", "http://localhost:3000")
      .header("Access-Control-Allow-Credentials", "true");
    next();
  });
}

// see https://github.com/dropbox/dropbox-sdk-js/issues/221
const dbx = new Dropbox({
  clientId: process.env.DROPBOX_KEY,
  clientSecret: process.env.DROPBOX_SECRET,
  fetch: fetch
} as any);

const UpdateStream = new SSE();

app.get("/accessToken", async (req, res) => {
  const authorizationCode: string = req.query.authorizationCode;
  if (authorizationCode) {
    const redirectUrl = process.env.DROPBOX_REDIRECT_URL as string;
    try {
      const accessCode = await dbx.getAccessTokenFromCode(
        redirectUrl,
        authorizationCode
      );

      res
        .cookie("dbxAccessToken", accessCode, {
          expires: new Date("Fri, 31 Dec 9999 23:59:59 GMT")
        })
        .send();
    } catch (err) {
      res.status(500).send(err);
    }
  } else {
    res.status(401).send("No authorization code");
  }
});

app.get("/webhook", (req, res) => {
  const challenge: string = req.query.challenge;
  res.setHeader("Content-Type", "text/plain");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.send(challenge);
});

app.post("/webhook", (req, res) => {
  if (!req.header("X-Dropbox-Signature")) {
    res.status(403);
    res.end();
    return;
  }

  console.log(`${JSON.stringify(req.body.list_folder)}`);
  const accountIDs = req.body.list_folder.accounts;
  console.log(`Notifying the following IDs: ${accountIDs}`);
  for (const accountID of accountIDs) {
    UpdateStream.send({ accountID: accountID }, "folderChanged");
  }
});

app.get("/notifications", UpdateStream.init);

app.listen(argv.port, () => {
  console.log(`Listening on port ${argv.port}`);
});
