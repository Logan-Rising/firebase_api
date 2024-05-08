const serviceAccount = require("./permissions.json");
const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const functions = require("firebase-functions");
const express = require("express");
const app = express();
const db = admin.firestore();

const cors = require("cors");
app.use( cors( {origin: true} ) );

// Routes

// Get messages read (daily and total)
app.get("/api/messagesread", async (req, res) => {
  try {
    const document = db.collection("messaging").doc("messages_read");
    const docRef = await document.get();
    const response = docRef.data();

    return res.status(200).send(response);
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
});

/* Command Data */

// Get a single command's data
app.get("/api/commands/:id", async (req, res) => {
  try {
    const document = db.collection("commands").doc(req.params.id);
    const messageInfo = await document.get();
    const response = messageInfo.data();
    if (response.type === "owner" || response.type === "custom") {
      return res.status(200).send({});
    } else {
      return res.status(200).send(response);
    }
  } catch (err) {
    return res.status(500).send(err);
  }
});

// Get all command data but conceal custom and owner commands to statistics
app.get("/api/commands", async (req, res) => {
  try {
    const query = db.collection("commands");
    const response = [];

    await query.get().then((querySnapshot) => {
      const docs = querySnapshot.docs; // Result of query
      const custom = {
        name: "custom",
        index: 0,
        daily: 0,
        type: "custom",
      };
      const owner = {
        name: "owner",
        index: 0,
        daily: 0,
        type: "owner",
      };

      for (const doc of docs) {
        if (doc.data().type === "owner") {
          // Command was an owner command
          owner.index += doc.data().index;
          owner.daily += doc.data().daily;
        } else if (doc.data().type === "custom") {
          // Command was a custom command
          custom.index += doc.data().index;
          custom.daily += doc.data().daily;
        } else {
          // Command was not owner or custom
          const command = {
            name: doc.id,
            index: doc.data().index,
            daily: doc.data().daily,
            type: doc.data().type,
          };
          response.push(command); // Add the command to the response array
        }
      }
      response.push(custom);
      response.push(owner);
      return res.status(200).send(response);
    });
  } catch (err) {
    return res.status(500).send(err);
  }
});

// Get all image command data
app.get("/api/image", async (req, res) => {
  try {
    const query = db.collection("images");
    const response = [];

    await query.get().then((querySnapshot) => {
      const docs = querySnapshot.docs; // Result of query
      const image = {
        daily: 0,
        total: 0,
      };

      for (const doc of docs) {
        image.daily += doc.data().daily;
        image.total += doc.data().command_usage;
      }
      response.push(image);
      return res.status(200).send(response);
    });
  } catch (err) {
    return res.status(500).send(err);
  }
});

/* Messaging Data */

// Get all messaging data
app.get("/api/messaging", async (req, res) => {
  try {
    const query = db.collection("messaging");
    const response = [];

    await query.get().then((querySnapshot) => {
      const docs = querySnapshot.docs; // Result of query

      for (const doc of docs) {
        const messageData = {
          name: doc.id,
          index: doc.data().index,
          daily: doc.data().daily,
        };
        response.push(messageData);
      }
      return res.status(200).send(response);
    });
  } catch (err) {
    return res.status(500).send(err);
  }
});

// Get a single message data
app.get("/api/messaging/:id", async (req, res) => {
  try {
    const document = db.collection("messaging").doc(req.params.id);
    const messageInfo = await document.get();
    const response = messageInfo.data();

    return res.status(200).send(response);
  } catch (err) {
    return res.status(500).send(err);
  }
});

// Get Last 30 days messages read
app.get("/api/last30days", async (req, res) => {
  try {
    const response =[];
    const today = new Date();

    for (let i = 1; i < 31; i++) {
      const priorDate = new Date(new Date().setDate(today.getDate() - i))
          .toISOString().slice(0, 10);
      const document = db.collection("daily_stats").doc(priorDate);
      const messageInfo = await document.get();
      response.push(messageInfo.data());
    }

    return res.status(200).send(response);
  } catch (err) {
    return res.status(500).send(err);
  }
});

// Get Last 30 days messages read
app.get("/api/last7days", async (req, res) => {
  try {
    const response =[];
    const today = new Date();

    for (let i = 1; i < 8; i++) {
      const priorDate = new Date(new Date().setDate(today.getDate() - i))
          .toISOString().slice(0, 10);
      const document = db.collection("daily_stats").doc(priorDate);
      const messageInfo = await document.get();
      response.push(messageInfo.data());
    }

    return res.status(200).send(response);
  } catch (err) {
    return res.status(500).send(err);
  }
});

// Update

// Delete

// Export the api to Firebase Cloud Functions
exports.app = functions.https.onRequest(app);
