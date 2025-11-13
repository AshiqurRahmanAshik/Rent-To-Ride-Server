const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const port = process.env.PORT || 9000;
const app = express();

// CORS Configuration
const corsOptions = {
  origin: '*',
  //credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());

// MongoDB Connection
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

    // Root route
    app.get('/', (req, res) => {
      res.send('🚗 Rent To Ride API is running...');
    });

    // Get all cars
    app.get('/cars', async (req, res) => {
      try {
        const cars = await carCollection.find().toArray();
        res.send(cars);
      } catch (error) {
        res.status(500).send({ message: 'Failed to fetch cars', error });
      }
    });

    // Get my cars (by providerEmail)
    app.get('/my-cars', async (req, res) => {
      const providerEmail = req.query.providerEmail;
      if (!providerEmail) {
        return res.status(400).send({ message: 'providerEmail is required' });
      }
      try {
        const cars = await carCollection.find({ providerEmail }).toArray();
        res.send(cars);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'Failed to fetch your cars', error });
      }
    });

    // Get car by ID
    app.get('/car/:id', async (req, res) => {
      try {
        const id = req.params.id;

        // Validate ObjectId
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: 'Invalid car ID' });
        }

        const car = await carCollection.findOne({ _id: new ObjectId(id) });

        if (!car) {
          return res.status(404).send({ message: 'Car not found' });
        }

        res.send(car);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'Failed to fetch car', error });
      }
    });

    // Add new car
    app.post('/cars', async (req, res) => {
      try {
        const car = req.body;
        if (!car.providerName || !car.providerEmail) {
          return res
            .status(400)
            .send({ message: 'Provider name and email are required' });
        }

        car.pricePerDay = Number(car.pricePerDay);
        car.status = car.status || 'Available';

        const result = await carCollection.insertOne(car);
        const savedCar = await carCollection.findOne({
          _id: result.insertedId,
        });
        res.status(201).send(savedCar);
      } catch (error) {
        res.status(500).send({ message: 'Failed to add car', error });
      }
    });

    // Update car
    app.put('/car/:id', async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: 'Invalid car ID' });
        }

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

    // Delete car
    app.delete('/car/:id', async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: 'Invalid car ID' });
        }

        const result = await carCollection.deleteOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Failed to delete car', error });
      }
    });

    // Create booking + update car status
    app.post('/bookings', async (req, res) => {
      const booking = req.body;
      const { carId, email } = booking;

      if (!email || !carId) {
        return res
          .status(400)
          .send({ message: 'Car ID and user email are required' });
      }

      try {
        // Get car info
        if (!ObjectId.isValid(carId)) {
          return res.status(400).send({ message: 'Invalid car ID' });
        }

        const car = await carCollection.findOne({ _id: new ObjectId(carId) });
        if (!car) return res.status(404).send({ message: 'Car not found' });

        // Prevent booking own car
        if (car.providerEmail === email) {
          return res
            .status(400)
            .send({ message: 'You cannot book your own car!' });
        }

        // Create booking
        const result = await bookingCollection.insertOne({
          ...booking,
          carName: car.name,
          category: car.category,
          rentPrice: car.pricePerDay,
          image: car.image,
          createdAt: new Date(),
        });

        // Update car status
        await carCollection.updateOne(
          { _id: new ObjectId(carId) },
          { $set: { status: 'Booked' } }
        );

        res
          .status(201)
          .send({ success: true, message: 'Booking successful', result });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'Failed to create booking', error });
      }
    });

    // Get all bookings
    app.get('/bookings', async (req, res) => {
      try {
        const bookings = await bookingCollection.find().toArray();
        res.send(bookings);
      } catch (error) {
        res.status(500).send({ message: 'Failed to fetch bookings', error });
      }
    });

    // Get my bookings (customer)
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

    // Delete a booking + update car status
    app.delete('/bookings/:id', async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: 'Invalid booking ID' });
        }

        const booking = await bookingCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!booking)
          return res.status(404).send({ message: 'Booking not found' });

        await bookingCollection.deleteOne({ _id: new ObjectId(id) });
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

    // Test MongoDB connection
    //  await client.db('admin').command({ ping: 1 });
    console.log('✅ MongoDB connected successfully!');
  } finally {
    // Keep connection open
  }
}

// Run backend
run().catch(console.dir);

app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
