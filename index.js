"use strict";

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
const fs = require("node:fs");
const url = require("node:url");
const dns = require("node:dns");

const JSON_FILENAME = __dirname + "/urls.json";
let dbURLs = [];

const loadDb = () => {
  fs.readFile(JSON_FILENAME, "utf-8", (err, data) => {
    if (err) console.error(err);

    dbURLs = JSON.parse(data);
  });
};

const saveDb = () => {
  fs.writeFile(JSON_FILENAME, JSON.stringify(dbURLs), "utf-8", (err) =>
    console.error(err)
  );
};

loadDb();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors({ optionsSuccessStatus: 200 }));

app.use(bodyParser.urlencoded({ extended: false }));

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Your first API endpoint
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

app.get("/api/shorturl/:shorturl", (req, res) => {
  if (req.params.shorturl >= dbURLs.length)
    res.json({ error: "No short URL found for the given input" });
  else res.redirect(dbURLs[req.params.shorturl]);
});

app.post(
  "/api/shorturl",
  (req, res, next) => {
    const { protocol, host, href } = url.parse(req.body.url);
    
    if (!["http:", "https:"].includes(protocol)) {
      req.body.parsedURL = { valid: false };
      next();
    }

    dns.lookup(host, 4, (err, address) => {
      if (err) req.body.parsedURL = { valid: false };
      else
        req.body.parsedURL = {
          valid: true,
          protocol: protocol,
          host: host,
          href: href,
        };
      next();
    });
  },
  (req, res) => {
    if (!req.body.parsedURL.valid) res.json({ error: "invalid url" });
    else {
      let urlHref = req.body.parsedURL.href;
      let urlIndex = dbURLs.indexOf(urlHref);

      if (urlIndex === -1) {
        dbURLs.push(urlHref);
        urlIndex = dbURLs.length - 1;
        saveDb(); // TODO: It's not efficient to write database after each POST
      }

      res.json({ original_url: urlHref, short_url: urlIndex });
    }
  }
);

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
