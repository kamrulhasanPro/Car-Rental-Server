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
    // await client.connect();
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    // mongoDB collection and database
    const database = client.db("CarRental");
    const carsCollection = database.collection("cars");
    const usersCollection = database.collection("users");
    const bookingCollection = database.collection("bookingCar");
    const feedbackCollection = database.collection("feedback");

    // -------car related api-------
    // get all cars
    app.get("/cars", async (req, res) => {
      const { brand, sort, search, email } = req.query;

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

      if (email) {
        query.providerEmail = email;
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
        .limit(8)
        .toArray();
      res.send(result);
    });

    // get  top rated cars
    app.get("/top-cars", async (req, res) => {
      const query = { ratings: 5 };
      const result = await carsCollection.find(query).limit(6).toArray();
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
      const newCar = req.body;
      // console.log(newCar);
      const result = await carsCollection.insertOne(newCar);
      res.send(result);
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

    // -----------Booking car api-----------
    // create booking
    app.post("/booking-cars", async (req, res) => {
      const newBookedCar = req.body;
      const find = await bookingCollection.findOne({
        productId: newBookedCar.productId,
      });
      if (find) {
        return res.send("Already Booked Car.");
      }
      newBookedCar.pricePerDay = Number(newBookedCar.pricePerDay);
      const result = await bookingCollection.insertOne(newBookedCar);
      res.send(result);
    });

    // read booking
    app.get("/booking-cars", async (req, res) => {
      const { email } = req.query;
      const query = {};
      if (email) {
        query.clientEmail = email;
      }
      const result = await bookingCollection
        .find(query)
        .sort({ bookingTime: -1 })
        .toArray();
      res.send(result);
    });

    app.delete("/booking-cars/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

    // -----------feedback api------------
    // read feedback
    app.get("/feedback", async (req, res) => {
      const result = await feedbackCollection.find().toArray();
      res.send(result);
    });

    // -----------users related api----------
    // create user
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      newUser.role = "user";
      const query = { email: newUser.email };
      const checkUser = await usersCollection.findOne(query);

      if (checkUser) {
        res.send({ massage: "Already exiting user!" });
      } else {
        const result = await usersCollection.insertOne(newUser);
        res.send(result);
      }
    });

    app.patch("/user/:email", async (req, res) => {
      const query = { email: req.params.email };
      const update = { $set: req.body };
      const result = await usersCollection.updateOne(query, update);
      return res.json(result);
    });

    //--------------- stats ---------------
    app.get("/stats/:email", async (req, res) => {
      const email = req.params.email;

      // my booking
      const bookingQuery = { clientEmail: email };
      const myBookingStats = await bookingCollection.countDocuments(
        bookingQuery
      );

      // my cars
      const carsQuery = { providerEmail: email };
      const myCars = await carsCollection.countDocuments(carsQuery);

      return res.json({ myBookingStats, myCars });
    });

    // --------rechart api-------
    app.get("/chart-by-car", async (req, res) => {
      const { email } = req.query;
      try {
        const result = await bookingCollection
          .aggregate([
            { $match: { clientEmail: email } },
            {
              $group: {
                _id: "$carName",
                pricePerDay: { $sum: "$pricePerDay" },
                total: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                carName: "$_id",
                pricePerDay: 1,
                total: 1,
              },
            },
          ])
          .toArray();

        res.status(200).json(result);
      } catch (error) {
        console.error("Aggregation error:", error);
        res.status(500).json({ message: "Failed to load chart data" });
      }
    });

    app.get("/chart-by-category", async (req, res) => {
      const { email } = req.query;
      try {
        const result = await carsCollection
          .aggregate([
            { $match: { providerEmail: email } },
            {
              $group: {
                _id: "$category",
                total: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                category: "$_id",
                total: 1,
              },
            },
          ])
          .toArray();

        res.status(200).json(result);
      } catch (error) {
        console.error("Aggregation error:", error);
        res.status(500).json({ message: "Failed to load chart data" });
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
