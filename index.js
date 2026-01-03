const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const port = process.env.PORT || 9000;
const app = express();

// CORS Configuration
const corsOptions = {
  origin: "*",
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
    const db = client.db("rent_to_rideDB");
    const carCollection = db.collection("cars");
    const bookingCollection = db.collection("bookings");
    const userCollection = db.collection("users");

    // Root route
    app.get("/", (req, res) => {
      res.send("🚗 Rent To Ride API is running...");
    });

    // ============================================
    // USER MANAGEMENT ROUTES
    // ============================================

    // Create or update user (for authentication)
    app.post("/users", async (req, res) => {
      try {
        const user = req.body;

        // Check if user already exists
        const existingUser = await userCollection.findOne({
          email: user.email,
        });

        if (existingUser) {
          // Update last login
          await userCollection.updateOne(
            { email: user.email },
            { $set: { lastLogin: new Date() } }
          );
          return res.send({
            message: "User already exists",
            user: existingUser,
          });
        }

        // Create new user with default role
        const newUser = {
          ...user,
          role: user.role || "user", // Default role is "user"
          createdAt: new Date(),
          lastLogin: new Date(),
        };

        const result = await userCollection.insertOne(newUser);
        res.status(201).send({ message: "User created successfully", result });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to create user", error });
      }
    });

    // Get user by email
    app.get("/user/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const user = await userCollection.findOne({ email });

        if (!user) {
          return res.status(404).send({ message: "User not found" });
        }

        res.send(user);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to fetch user", error });
      }
    });

    // Update user role (Admin only)
    app.patch("/user/:email/role", async (req, res) => {
      try {
        const email = req.params.email;
        const { role } = req.body;

        if (!role) {
          return res.status(400).send({ message: "Role is required" });
        }

        const result = await userCollection.updateOne(
          { email },
          { $set: { role, updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "User not found" });
        }

        res.send({ message: "User role updated successfully", result });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to update user role", error });
      }
    });

    // Get all users (Admin only)
    app.get("/users", async (req, res) => {
      try {
        const users = await userCollection.find().toArray();
        res.send(users);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to fetch users", error });
      }
    });

    // ============================================
    // CAR ROUTES (Existing)
    // ============================================

    // Get all cars
    app.get("/cars", async (req, res) => {
      try {
        const cars = await carCollection.find().toArray();
        res.send(cars);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch cars", error });
      }
    });

    // Get my cars (by providerEmail)
    app.get("/my-cars", async (req, res) => {
      const providerEmail = req.query.providerEmail;
      if (!providerEmail) {
        return res.status(400).send({ message: "providerEmail is required" });
      }
      try {
        const cars = await carCollection.find({ providerEmail }).toArray();
        res.send(cars);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to fetch your cars", error });
      }
    });

    // Get car by ID
    app.get("/car/:id", async (req, res) => {
      try {
        const id = req.params.id;

        // Validate ObjectId
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid car ID" });
        }

        const car = await carCollection.findOne({ _id: new ObjectId(id) });

        if (!car) {
          return res.status(404).send({ message: "Car not found" });
        }

        res.send(car);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to fetch car", error });
      }
    });

    // Add new car
    app.post("/cars", async (req, res) => {
      try {
        const car = req.body;
        if (!car.providerName || !car.providerEmail) {
          return res
            .status(400)
            .send({ message: "Provider name and email are required" });
        }

        car.pricePerDay = Number(car.pricePerDay);
        car.status = car.status || "Available";
        car.createdAt = new Date();

        const result = await carCollection.insertOne(car);
        const savedCar = await carCollection.findOne({
          _id: result.insertedId,
        });
        res.status(201).send(savedCar);
      } catch (error) {
        res.status(500).send({ message: "Failed to add car", error });
      }
    });

    // Update car
    app.put("/car/:id", async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid car ID" });
        }

        const updatedCar = req.body;
        updatedCar.updatedAt = new Date();

        const result = await carCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedCar }
        );

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to update car", error });
      }
    });

    // Delete car
    app.delete("/car/:id", async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid car ID" });
        }

        const result = await carCollection.deleteOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to delete car", error });
      }
    });

    // ============================================
    // BOOKING ROUTES (Existing)
    // ============================================

    // Create booking + update car status
    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      const { carId, email } = booking;

      if (!email || !carId) {
        return res
          .status(400)
          .send({ message: "Car ID and user email are required" });
      }

      try {
        // Get car info
        if (!ObjectId.isValid(carId)) {
          return res.status(400).send({ message: "Invalid car ID" });
        }

        const car = await carCollection.findOne({ _id: new ObjectId(carId) });
        if (!car) return res.status(404).send({ message: "Car not found" });

        // Prevent booking own car
        if (car.providerEmail === email) {
          return res
            .status(400)
            .send({ message: "You cannot book your own car!" });
        }

        // Create booking
        const result = await bookingCollection.insertOne({
          ...booking,
          carName: car.name,
          category: car.category,
          rentPrice: car.pricePerDay,
          image: car.image,
          providerEmail: car.providerEmail,
          createdAt: new Date(),
        });

        // Update car status
        await carCollection.updateOne(
          { _id: new ObjectId(carId) },
          { $set: { status: "Booked" } }
        );

        res
          .status(201)
          .send({ success: true, message: "Booking successful", result });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to create booking", error });
      }
    });

    // Get all bookings
    app.get("/bookings", async (req, res) => {
      try {
        const bookings = await bookingCollection.find().toArray();
        res.send(bookings);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch bookings", error });
      }
    });

    // Get my bookings (customer)
    app.get("/my-bookings", async (req, res) => {
      const customerEmail = req.query.email;
      if (!customerEmail) {
        return res.status(400).send({ message: "Customer email required" });
      }

      try {
        const bookings = await bookingCollection
          .find({ email: customerEmail })
          .toArray();
        res.send(bookings);
      } catch (error) {
        res
          .status(500)
          .send({ message: "Failed to fetch your bookings", error });
      }
    });

    // Delete a booking + update car status
    app.delete("/bookings/:id", async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid booking ID" });
        }

        const booking = await bookingCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!booking)
          return res.status(404).send({ message: "Booking not found" });

        await bookingCollection.deleteOne({ _id: new ObjectId(id) });
        await carCollection.updateOne(
          { _id: new ObjectId(booking.carId) },
          { $set: { status: "Available" } }
        );

        res.send({ success: true, message: "Booking cancelled successfully" });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to cancel booking", error });
      }
    });

    // ============================================
    // DASHBOARD ROUTES - USER ROLE
    // ============================================

    // User Dashboard Overview
    app.get("/dashboard/user/:email", async (req, res) => {
      try {
        const email = req.params.email;

        // Get user's bookings count
        const totalBookings = await bookingCollection.countDocuments({ email });

        // Get user's active bookings
        const activeBookings = await bookingCollection.countDocuments({
          email,
          status: { $ne: "Cancelled" },
        });

        // Get user's cars count (if they are also a provider)
        const totalCars = await carCollection.countDocuments({
          providerEmail: email,
        });

        // Get user's available cars
        const availableCars = await carCollection.countDocuments({
          providerEmail: email,
          status: "Available",
        });

        // Calculate total spending
        const userBookings = await bookingCollection.find({ email }).toArray();
        const totalSpent = userBookings.reduce(
          (sum, booking) => sum + (booking.rentPrice || 0),
          0
        );

        res.send({
          overview: {
            totalBookings,
            activeBookings,
            totalCars,
            availableCars,
            totalSpent,
          },
        });
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .send({ message: "Failed to fetch user dashboard", error });
      }
    });

    // User Booking Statistics (for charts)
    app.get("/dashboard/user/:email/stats", async (req, res) => {
      try {
        const email = req.params.email;

        // Bookings by category
        const bookingsByCategory = await bookingCollection
          .aggregate([
            { $match: { email } },
            { $group: { _id: "$category", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ])
          .toArray();

        // Bookings by month (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const bookingsByMonth = await bookingCollection
          .aggregate([
            {
              $match: {
                email,
                createdAt: { $gte: sixMonthsAgo },
              },
            },
            {
              $group: {
                _id: {
                  year: { $year: "$createdAt" },
                  month: { $month: "$createdAt" },
                },
                count: { $sum: 1 },
                totalAmount: { $sum: "$rentPrice" },
              },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
          ])
          .toArray();

        // Recent bookings for table
        const recentBookings = await bookingCollection
          .find({ email })
          .sort({ createdAt: -1 })
          .limit(10)
          .toArray();

        res.send({
          bookingsByCategory,
          bookingsByMonth,
          recentBookings,
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to fetch user stats", error });
      }
    });

    // User's Cars Performance (if provider)
    app.get("/dashboard/user/:email/cars-performance", async (req, res) => {
      try {
        const email = req.params.email;

        // Get cars with booking count
        const carsPerformance = await carCollection
          .aggregate([
            { $match: { providerEmail: email } },
            {
              $lookup: {
                from: "bookings",
                localField: "_id",
                foreignField: "carId",
                as: "bookings",
              },
            },
            {
              $project: {
                name: 1,
                category: 1,
                pricePerDay: 1,
                status: 1,
                bookingCount: { $size: "$bookings" },
                totalRevenue: {
                  $multiply: ["$pricePerDay", { $size: "$bookings" }],
                },
              },
            },
            { $sort: { bookingCount: -1 } },
          ])
          .toArray();

        res.send(carsPerformance);
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .send({ message: "Failed to fetch cars performance", error });
      }
    });

    // ============================================
    // DASHBOARD ROUTES - ADMIN ROLE
    // ============================================

    // Admin Dashboard Overview
    app.get("/dashboard/admin", async (req, res) => {
      try {
        // Total counts
        const totalUsers = await userCollection.countDocuments();
        const totalCars = await carCollection.countDocuments();
        const totalBookings = await bookingCollection.countDocuments();

        // Available vs Booked cars
        const availableCars = await carCollection.countDocuments({
          status: "Available",
        });
        const bookedCars = await carCollection.countDocuments({
          status: "Booked",
        });

        // Total revenue (sum of all booking prices)
        const revenueData = await bookingCollection
          .aggregate([
            { $group: { _id: null, totalRevenue: { $sum: "$rentPrice" } } },
          ])
          .toArray();
        const totalRevenue =
          revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

        // Recent bookings count (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentBookingsCount = await bookingCollection.countDocuments({
          createdAt: { $gte: sevenDaysAgo },
        });

        res.send({
          overview: {
            totalUsers,
            totalCars,
            totalBookings,
            availableCars,
            bookedCars,
            totalRevenue,
            recentBookingsCount,
          },
        });
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .send({ message: "Failed to fetch admin dashboard", error });
      }
    });

    // Admin Analytics - Bookings by Category
    app.get("/dashboard/admin/bookings-by-category", async (req, res) => {
      try {
        const bookingsByCategory = await bookingCollection
          .aggregate([
            {
              $group: {
                _id: "$category",
                count: { $sum: 1 },
                revenue: { $sum: "$rentPrice" },
              },
            },
            { $sort: { count: -1 } },
          ])
          .toArray();

        res.send(bookingsByCategory);
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .send({ message: "Failed to fetch category stats", error });
      }
    });

    // Admin Analytics - Revenue by Month
    app.get("/dashboard/admin/revenue-by-month", async (req, res) => {
      try {
        const revenueByMonth = await bookingCollection
          .aggregate([
            {
              $group: {
                _id: {
                  year: { $year: "$createdAt" },
                  month: { $month: "$createdAt" },
                },
                totalRevenue: { $sum: "$rentPrice" },
                bookingCount: { $sum: 1 },
              },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
            { $limit: 12 }, // Last 12 months
          ])
          .toArray();

        res.send(revenueByMonth);
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .send({ message: "Failed to fetch revenue stats", error });
      }
    });

    // Admin Analytics - Car Status Distribution
    app.get("/dashboard/admin/car-status", async (req, res) => {
      try {
        const carStatus = await carCollection
          .aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ])
          .toArray();

        res.send(carStatus);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to fetch car status", error });
      }
    });

    // Admin Analytics - Top Providers
    app.get("/dashboard/admin/top-providers", async (req, res) => {
      try {
        const topProviders = await carCollection
          .aggregate([
            {
              $group: {
                _id: "$providerEmail",
                providerName: { $first: "$providerName" },
                totalCars: { $sum: 1 },
                availableCars: {
                  $sum: { $cond: [{ $eq: ["$status", "Available"] }, 1, 0] },
                },
              },
            },
            { $sort: { totalCars: -1 } },
            { $limit: 10 },
          ])
          .toArray();

        res.send(topProviders);
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .send({ message: "Failed to fetch top providers", error });
      }
    });

    // Admin Analytics - Recent Activity Table
    app.get("/dashboard/admin/recent-activity", async (req, res) => {
      try {
        const limit = parseInt(req.query.limit) || 20;

        const recentBookings = await bookingCollection
          .find()
          .sort({ createdAt: -1 })
          .limit(limit)
          .toArray();

        res.send(recentBookings);
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .send({ message: "Failed to fetch recent activity", error });
      }
    });

    // Admin Analytics - User Growth Over Time
    app.get("/dashboard/admin/user-growth", async (req, res) => {
      try {
        const userGrowth = await userCollection
          .aggregate([
            {
              $group: {
                _id: {
                  year: { $year: "$createdAt" },
                  month: { $month: "$createdAt" },
                },
                newUsers: { $sum: 1 },
              },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
            { $limit: 12 },
          ])
          .toArray();

        res.send(userGrowth);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to fetch user growth", error });
      }
    });

    // Admin - Get all bookings with details (for table)
    app.get("/dashboard/admin/all-bookings", async (req, res) => {
      try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const bookings = await bookingCollection
          .find()
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray();

        const totalBookings = await bookingCollection.countDocuments();

        res.send({
          bookings,
          totalPages: Math.ceil(totalBookings / limit),
          currentPage: page,
          totalBookings,
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to fetch bookings", error });
      }
    });

    // Test MongoDB connection
    //  await client.db('admin').command({ ping: 1 });
    console.log("✅ MongoDB connected successfully!");
  } finally {
    // Keep connection open
  }
}

// Run backend
run().catch(console.dir);

app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
