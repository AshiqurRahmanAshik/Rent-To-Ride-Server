const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const port = process.env.PORT || 9000;
const app = express();

// CORS
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());

// MongoDB URI
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
    const bookingCollection = db.collection('bookings');

    // ✅ Get All Cars
    app.get('/cars', async (req, res) => {
      try {
        const cars = await carCollection.find().toArray();
        res.send(cars);
      } catch (error) {
        res.status(500).send({ message: 'Failed to fetch cars', error });
      }
    });

    // ✅ Get Car Details by ID
    app.get('/car/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const car = await carCollection.findOne({ _id: new ObjectId(id) });
        res.send(car);
      } catch (error) {
        res.status(500).send({ message: 'Failed to fetch car', error });
      }
    });

    // ✅ Get My Listings (Provider’s cars)
    app.get('/my-cars', async (req, res) => {
      const providerEmail = req.query.providerEmail;
      if (!providerEmail) {
        return res.status(400).send({ message: 'Provider email required' });
      }
      try {
        const cars = await carCollection.find({ providerEmail }).toArray();
        res.send(cars);
      } catch (error) {
        res
          .status(500)
          .send({ message: 'Failed to fetch provider cars', error });
      }
    });

    // ✅ Create a Booking + Update Car Status
    app.post('/bookings', async (req, res) => {
      const booking = req.body;
      if (!booking.email) {
        return res
          .status(400)
          .send({ message: 'Email is required for booking' });
      }

      try {
        // Step 1: Insert booking
        const result = await bookingCollection.insertOne(booking);

        // Step 2: Mark car as "Booked"
        await carCollection.updateOne(
          { _id: new ObjectId(booking.carId) },
          { $set: { status: 'Booked' } }
        );

        res.send({ success: true, message: 'Booking successful', result });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'Failed to create booking', error });
      }
    });

    // ✅ Get All Bookings (Admin)
    app.get('/bookings', async (req, res) => {
      try {
        const bookings = await bookingCollection.find().toArray();
        res.send(bookings);
      } catch (error) {
        res.status(500).send({ message: 'Failed to fetch bookings', error });
      }
    });

    // ✅ Get My Bookings (Customer)
    app.get('/my-bookings', async (req, res) => {
      const customerEmail = req.query.email;
      if (!customerEmail) {
        return res.status(400).send({ message: 'Customer email required' });
      }
      try {
        const bookings = await bookingCollection
          .find({ email: customerEmail })
          .toArray();
        res.send(bookings);
      } catch (error) {
        res
          .status(500)
          .send({ message: 'Failed to fetch your bookings', error });
      }
    });

    // ✅ Delete a Booking (Unbook)
    app.delete('/bookings/:id', async (req, res) => {
      try {
        const id = req.params.id;

        // Step 1: Find the booking to get the carId
        const booking = await bookingCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!booking) {
          return res.status(404).send({ message: 'Booking not found' });
        }

        // Step 2: Delete the booking
        await bookingCollection.deleteOne({ _id: new ObjectId(id) });

        // Step 3: Update the car status to "Available"
        await carCollection.updateOne(
          { _id: new ObjectId(booking.carId) },
          { $set: { status: 'Available' } }
        );

        res.send({ success: true, message: 'Booking cancelled successfully' });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'Failed to cancel booking', error });
      }
    });

    // ✅ Delete Car
    app.delete('/car/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const result = await carCollection.deleteOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Failed to delete car', error });
      }
    });

    // ✅ Update Car
    app.put('/car/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const updatedCar = req.body;
        const result = await carCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedCar }
        );
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Failed to update car', error });
      }
    });

    // ✅ Connect to MongoDB
    await client.db('admin').command({ ping: 1 });
    console.log('✅ MongoDB connected successfully!');
  } finally {
    // keep connection open
  }
}

run().catch(console.dir);

// Root route
app.get('/', (req, res) => {
  res.send('🚗 Rent To Ride API is running...');
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
