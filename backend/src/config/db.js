const mongoose = require("mongoose");
const dns = require("dns");

// Force Google DNS to avoid SRV lookup issues on some networks
dns.setServers(["8.8.8.8", "1.1.1.1"]);

let dbConnected = false;
let lastDbError = "";

async function connectDB() {
  try {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error("MONGODB_URI is missing in .env");
    }

    const conn = await mongoose.connect(mongoURI, {
      autoIndex: true
    });

    dbConnected = true;
    lastDbError = "";
    console.log(`MongoDB connected ✅`);
    console.log(`Database: ${conn.connection.name}`);
    console.log(`Host: ${conn.connection.host}`);
    return true;
  } catch (err) {
    dbConnected = false;
    lastDbError = err.message || "Unknown MongoDB connection error";
    console.error("MongoDB connection error ❌");
    console.error(lastDbError);
    return false;
  }
}

function getDbStatus() {
  return {
    connected: dbConnected,
    readyState: mongoose.connection.readyState,
    error: lastDbError || null
  };
}

module.exports = { connectDB, getDbStatus };
