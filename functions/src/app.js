const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();

app.use(cors({ origin: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

admin.initializeApp();

var indexRouter = require("./api.js");
app.use("/", indexRouter);


exports.widgets = functions.https.onRequest(app);
