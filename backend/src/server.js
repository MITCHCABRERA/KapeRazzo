const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
require("dotenv").config();

const { connectDB, getDbStatus } = require("./config/db");
const { validateEnv, isProduction } = require("./config/env");

const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");
const orderRoutes = require("./routes/order.routes");
const reservationRoutes = require("./routes/reservation.routes");
const userRoutes = require("./routes/user.routes");

const errorHandler = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");
const AppError = require("./utils/appError");

validateEnv();

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
const frontendRoot = path.resolve(__dirname, "../..");

app.use(helmet({
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));
app.use(compression());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.API_RATE_LIMIT_MAX || 300),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    next(new AppError(options.message, options.statusCode, "RATE_LIMITED"));
  },
  message: "Too many requests, please try again later."
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 120),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    next(new AppError(options.message, options.statusCode, "RATE_LIMITED"));
  },
  message: "Too many authentication requests, please try again later."
});

const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new AppError("Origin not allowed by CORS", 403, "CORS_BLOCKED"));
  },
  credentials: true
}));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false, limit: "2mb" }));

app.use("/HTML", express.static(path.join(frontendRoot, "HTML"), { maxAge: isProduction() ? "1d" : 0 }));
app.use("/JS", express.static(path.join(frontendRoot, "JS"), { maxAge: isProduction() ? "1h" : 0 }));
app.use("/STYLES", express.static(path.join(frontendRoot, "STYLES"), { maxAge: isProduction() ? "1d" : 0 }));
app.use("/PICTURES", express.static(path.join(frontendRoot, "PICTURES"), { maxAge: isProduction() ? "7d" : 0 }));
app.use("/favicon.ico", express.static(path.join(frontendRoot, "favicon.ico")));

app.get("/", (req, res) => {
  res.redirect(302, "/login.html");
});

app.get("/index.html", (req, res) => {
  res.sendFile(path.join(frontendRoot, "index.html"));
});

const pageRouteMap = {
  "/login": "login.html",
  "/login.html": "login.html",
  "/profile": "profile.html",
  "/profile.html": "profile.html",
  "/orders": "order.html",
  "/order": "order.html",
  "/order.html": "order.html",
  "/reservations": "reservation.html",
  "/reservation": "reservation.html",
  "/reservation.html": "reservation.html",
  "/admin": "admin.html",
  "/admin.html": "admin.html",
  "/about": "about.html",
  "/about.html": "about.html",
  "/gallery": "gallery.html",
  "/gallery.html": "gallery.html",
  "/menu": "menu.html",
  "/menu.html": "menu.html"
};

app.get(Object.keys(pageRouteMap), (req, res) => {
  res.sendFile(path.join(frontendRoot, "HTML", pageRouteMap[req.path]));
});

app.get("/api/health", (req, res) => {
  const db = getDbStatus();
  res.json({ ok: true, service: "KapeRazzo API", environment: process.env.NODE_ENV || "development", db });
});

app.use("/api", apiLimiter);
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/users", userRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function startServer() {
  app.listen(PORT, "0.0.0.0", async () => {
    console.log(`Server running on port ${PORT}`);
    const dbOk = await connectDB();
    if (!dbOk) {
      console.warn("Backend is running without MongoDB. Auth endpoints will work, but order/reservation data routes may fail until MongoDB is fixed.");
    }
  });
}

startServer();
