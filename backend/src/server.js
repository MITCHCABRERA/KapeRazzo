const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const connectDB = require("./config/db");

// Routes
const productRoutes = require("./routes/product.routes");
const orderRoutes = require("./routes/order.routes");
const reservationRoutes = require("./routes/reservation.routes");

// Import centralized error handler
const errorHandler = require("./middleware/errorHandler");

const app = express();


// -----------------------------
// Security Middleware
// -----------------------------

// Secure HTTP headers
app.use(helmet());

// Prevent API abuse / brute force
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests
  message: "Too many requests, please try again later."
});

app.use(limiter);

// Enable CORS
app.use(cors());

// Parse JSON
app.use(express.json());


// -----------------------------
// Test Route
// -----------------------------
app.get("/", (req, res) => {
  res.send("KapeRazzo API running ✅");
});


// -----------------------------
// API Routes
// -----------------------------
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reservations", reservationRoutes);


// -----------------------------
// Central Error Handler
// -----------------------------
app.use(errorHandler);


// -----------------------------
// Connect Database
// -----------------------------
connectDB();


// -----------------------------
// Start Server
// -----------------------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});