const express = require("express");
const { MongoClient, Object_id } = require("mongodb");
const multer = require("multer");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 9000;

app.use(express.json());

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "uploads"));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

const url = "mongodb://localhost:27017";
const client = new MongoClient(url);
const dbName = "eventDB";

async function connectDB() {
  await client.connect();
  console.log("Connected successfully to MongoDB");
  const db = client.db(dbName);
  return db;
}

// API for get, post, put and delete

app.get("/api/v3/app/events/:id", async (req, res) => {
  const db = await connectDB();
  const collection = db.collection("events");

  const { _id } = req.params;

  if (!Object_id.isVal_id(_id)) {
    return res.status(400).send("Inval_id Event _id");
  }

  const event = await collection.findOne({ __id: new Object_id(_id) });

  if (!event) {
    return res.status(404).send("Event not found");
  }

  res.status(200).json(event);
});

app.get("/api/v3/app/events", async (req, res) => {
  const db = await connectDB();
  const collection = db.collection("events");

  const { type, limit, page } = req.query;
  if (type !== "latest") return res.status(400).send("Inval_id type parameter");

  const limitNum = parseInt(limit) || 5;
  const pageNum = parseInt(page) || 1;

  const events = await collection
    .find({})
    .sort({ schedule: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum)
    .toArray();

  res.status(200).json(events);
});

app.post("/api/v3/app/events", upload.single("files"), async (req, res) => {
  try {
    console.log("Incoming data:", req.body);

    if (!req.file) {
      console.error("No file received");
      return res.status(400).send("No file received");
    }

    const eventData = req.body;
    const event = {
      name: eventData.name,
      tagline: eventData.tagline,
      schedule: new Date(eventData.schedule),
      description: eventData.description,
      moderator: eventData.moderator,
      category: eventData.category,
      sub_category: eventData.sub_category,
      rigor_rank: parseInt(eventData.rigor_rank),
      attendees: [],
      files: req.file.path,
    };

    const db = await connectDB();
    const collection = db.collection("events");
    const result = await collection.insertOne(event);
    console.log("Created Event:", event);

    res.status(201).json({ _id: result.inserted_id });
  } catch (error) {
    console.error("Error inserting event:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.put("/api/v3/app/events/:id", upload.single("files"), async (req, res) => {
  try {
    const db = await connectDB();
    const collection = db.collection("events");

    const { _id } = req.params;
    if (!Object_id.isVal_id(_id))
      return res.status(400).send("Inval_id Event _id");

    const update = {
      name: req.body.name,
      tagline: req.body.tagline,
      schedule: new Date(req.body.schedule),
      description: req.body.description,
      moderator: req.body.moderator,
      category: req.body.category,
      sub_category: req.body.sub_category,
      rigor_rank: parseInt(req.body.rigor_rank),
      attendees: [],
      files: req.file ? req.file.path : null,
    };

    const result = await collection.updateOne(
      { __id: new Object_id(_id) },
      { $set: update }
    );

    if (result.matchedCount === 0)
      return res.status(404).send("Event not found");
    res.status(200).send("Event updated successfully");
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.delete("/api/v3/app/events/:_id", async (req, res) => {
  const db = await connectDB();
  const collection = db.collection("events");

  const { _id } = req.params;
  if (!Object_id.isVal_id(_id))
    return res.status(400).send("Inval_id Event _id");

  const result = await collection.deleteOne({ __id: new Object_id(_id) });

  if (result.deletedCount === 0) return res.status(404).send("Event not found");
  res.status(200).send("Event deleted successfully");
});

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});
