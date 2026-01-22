const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const productRoutes = require("./routes/product.routes");
const orderRoutes = require("./routes/order.routes");
const reservationRoutes = require("./routes/reservation.routes"); // ✅ ADD

const app = express();

app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("KapeRazzo API running ✅");
});

// APIs
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reservations", reservationRoutes); // ✅ ADD

// Connect to MongoDB
connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
