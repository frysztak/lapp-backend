require("dotenv").config();

import express from "express";
import fetch from "fetch-with-proxy";
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

app.listen(argv.port, () => {
  console.log(`Listening on port ${argv.port}`);
});
