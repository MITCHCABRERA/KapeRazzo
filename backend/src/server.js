const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const { connectDB, getDbStatus } = require("./config/db");

// Routes
const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");
const orderRoutes = require("./routes/order.routes");
const reservationRoutes = require("./routes/reservation.routes");
const userRoutes = require("./routes/user.routes");

// Centralized error handler
const errorHandler = require("./middleware/errorHandler");

const app = express();

// -----------------------------
// Security Middleware
// -----------------------------
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests, please try again later."
});

app.use(limiter);

// Configure CORS
app.use(
  cors({
    origin: true,
    credentials: true
  })
);

// Parse JSON
app.use(express.json());

// -----------------------------
// Health / Test Route
// -----------------------------
app.get("/", (req, res) => {
  res.send("KapeRazzo API running ✅");
});

app.get("/api/health", (req, res) => {
  const db = getDbStatus();
  res.json({
    ok: true,
    service: "KapeRazzo API",
    db
  });
});

// -----------------------------
// API Routes
// -----------------------------
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/users", userRoutes);

// -----------------------------
// Central Error Handler
// -----------------------------
app.use(errorHandler);

// -----------------------------
// Start Server
// -----------------------------
const PORT = process.env.PORT || 5000;

async function startServer() {
  app.listen(PORT, async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    const dbOk = await connectDB();
    if (!dbOk) {
      console.warn("Backend is running without MongoDB. Auth endpoints will work, but order/reservation data routes may fail until MongoDB is fixed.");
    }
  });
}

startServer();