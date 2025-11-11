const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;

// ------------middleware-------------
app.use(cors());
app.use(express.json());

// ================main=================
app.get("/", (req, res) => {
  res.send({ massage: "Server is running." });
});

// ----------mongoDB connect-----------
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@simple-crud-server.1orocpb.mongodb.net/?appName=simple-crud-server`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    // mongoDB collection and database
    const database = client.db("CarRental");
    const carsCollection = database.collection("cars");
    const usersCollection = database.collection("users");

    // -------car related api-------
    // get all cars
    app.get("/cars", async (req, res) => {
      const { brand, sort, search } = req.query;

      // category brand filter
      const query = {};
      if (brand) {
        if (brand !== "All") {
          query.category = brand;
        }
      }

      // search cars
      if (search) {
        query.carName = { $regex: search, $options: "i" };
      }

      // sorted cars
      const sorted = {};
      if (sort) {
        sort === "Price High"
          ? (sorted.pricePerDay = -1)
          : sort === "Price Low"
          ? (sorted.pricePerDay = 1)
          : sort === "Newest"
          ? (sorted.created_at = -1)
          : sort === "Oldest"
          ? (sorted.created_at = 1)
          : {};
      }

      const result = await carsCollection.find(query).sort(sorted).toArray();
      res.send(result);
    });

    // get recent newest cars
    app.get("/recent-cars", async (req, res) => {
      const sorted = { created_at: -1 };
      const result = await carsCollection
        .find()
        .sort(sorted)
        .limit(6)
        .toArray();
      res.send(result);
    });

    // get specific car
    app.get("/cars/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await carsCollection.findOne(query);
      res.send(result);
    });

    // car post api
    app.post("/cars", async (req, res) => {
      const doc = req.body;
      const result = await carsCollection.insertMany(doc);
      res.send.apply(result);
    });

    // car edit api
    app.patch("/cars/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: req.body,
      };
      const result = await carsCollection.updateOne(query, update);
      res.send(result);
    });

    // car delete api
    app.delete("/cars/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await carsCollection.deleteOne(query);
      res.send(result);
    });

    // -----------users related api----------
    // create user
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const query = { email: newUser.email };
      const checkUser = await usersCollection.findOne(query);
      
      if (checkUser) {
        res.send({ massage: "Already exiting user!" });
      } else {
        const result = await usersCollection.insertOne(newUser);
        res.send(result);
      }
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log("Server running on port:", port);
});
