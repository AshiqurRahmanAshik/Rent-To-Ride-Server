const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 9000;

const app = express();
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  Credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.v4qijov.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    const db = client.db('rent_to_rideDB');
    const carCollection = db.collection('cars');
    app.get('/cars', async (req, res) => {
      const cursor = carCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get('/car/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await carCollection.findOne(query);
      res.send(result);
    });
    // Send a ping to confirm a successful connection

    await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
