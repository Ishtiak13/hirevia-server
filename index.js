const express = require("express");
const cors = require("cors");
require("dotenv").config();
// const jwt = require("jsonwebtoken");
// const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(
  cors()
  //   {
  //   origin: ["http://localhost:5173"],
  //   credentials: true,
  // }
);
app.use(express.json());
// app.use(cookieParser());
// const logger = (req, res, next) => {
//   console.log("inside the logger Middleware");
//   next();
// };
// const verifyToken = (req, res, next) => {
//   const token = req?.cookies?.token;
//   console.log("cookie in the Middleware", token);
//   if (!token) {
//     return res.status(401).send({ massage: "unauthorized access" });
//   }
//   jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, decoded) => {
//     if (err) {
//       return res.status(401).send({ massage: "unauthorized access" });
//     }
//     req.decoded = decoded;
//     next();
//   });
// };

//
app.get("/", (req, res) => {
  res.send("Hirevia is cooking...");
});
app.listen(port, () => {
  console.log(`Hirevia server is running on port ${port}`);
});

// mongoDB

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster13.662tv5c.mongodb.net/?retryWrites=true&w=majority&appName=Cluster13`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const jobsCollection = client.db("hireviaDB").collection("jobs");
    const applicationsCollection = client
      .db("hireviaDB")
      .collection("applications");

    // jwt token related api
    // app.post("/jwt", async (req, res) => {
    //   const userData = req.body;
    //   const token = jwt.sign(userData, process.env.JWT_ACCESS_SECRET, {
    //     expiresIn: "1d",
    //   });

    //   // * set token in the cookies
    //   res.cookie("token", token, {
    //     httpOnly: true,
    //     secure: false,
    //   });

    //   res.send({ success: true });
    // });

    // jobs API
    app.post("/jobs", async (req, res) => {
      const job = req.body;
      const result = await jobsCollection.insertOne(job);
      res.send(result);
    });

    app.get("/jobs", async (req, res) => {
      const email = req.query.email;
      const query = {};
      if (email) {
        query.hr_email = email;
      }

      const cursor = jobsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/jobs/applications", async (req, res) => {
      const email = req.query.email;
      const query = { hr_email: email };
      const jobs = await jobsCollection.find(query).toArray();

      // ! should use aggregate  to have optimal fetching
      for (const job of jobs) {
        const applicationQuery = { jobId: job._id.toString() };
        const application_count = await applicationsCollection.countDocuments(
          applicationQuery
        );
        job.application_count = application_count;
      }
      res.send(jobs);
    });

    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.findOne(query);
      res.send(result);
    });
    // app.delete("/jobs/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) };
    //   const result = await jobsCollection.deleteOne(query);
    //   res.send(result);
    // });

    // job Applications API
    app.post("/applications", async (req, res) => {
      const application = req.body;
      const result = await applicationsCollection.insertOne(application);
      res.send(result);
    });
    app.patch("/applications/:id", async (req, res) => {
      const filter = { _id: new ObjectId(req.params.id) };
      const updatedDoc = {
        $set: {
          status: req.body.status,
        },
      };
      const result = await applicationsCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.get("/applications", async (req, res) => {
      const currentApplicant = req.query.email;
      // if (currentApplicant !== req.decoded.email) {
      //   return res.status(403).send({ massage: "forbidden access" });
      // }
      // console.log("inside application api", req.cookies);
      const query = {
        applicant: currentApplicant,
      };
      const result = await applicationsCollection.find(query).toArray();

      // ! bad practice
      for (const application of result) {
        const jobId = application.jobId;
        const jobQuery = { _id: new ObjectId(jobId) };
        const job = await jobsCollection.findOne(jobQuery);
        if (job) {
          application.company = job.company;
          application.title = job.title;
          application.company_logo = job.company_logo;
        } else {
          application.jobStatus = "deleted";
        }
      }
      // ////////////////////

      res.send(result);
    });
    app.delete("/applications/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await applicationsCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/applications/job/:job_id", async (req, res) => {
      const job_id = req.params.job_id;
      const query = { jobId: job_id };
      const result = await applicationsCollection.find(query).toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
