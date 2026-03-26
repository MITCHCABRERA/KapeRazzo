const AppError = require("../utils/appError");

function errorHandler(err, req, res, next) {
  const statusCode = Number(err.statusCode || err.status || 500);
  const code = err.code || (statusCode >= 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR");
  const message = err.message || "Internal Server Error";

  if (statusCode >= 500) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, err);
  } else {
    console.warn(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${statusCode} ${code}: ${message}`);
  }

  const payload = {
    success: false,
    code,
    message,
  };

  if (err.details) payload.details = err.details;
  if (process.env.NODE_ENV !== "production" && statusCode >= 500) {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
}

module.exports = errorHandler;
