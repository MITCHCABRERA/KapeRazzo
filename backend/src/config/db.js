const mongoose = require("mongoose");
const dns = require("dns");

// Force Google DNS to avoid SRV lookup issues on some networks
dns.setServers(["8.8.8.8", "1.1.1.1"]);

async function connectDB() {
  try {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error("MONGODB_URI is missing in .env");
    }

    const conn = await mongoose.connect(mongoURI, {
      autoIndex: true
    });

    console.log(`MongoDB connected ✅`);
    console.log(`Database: ${conn.connection.name}`);
    console.log(`Host: ${conn.connection.host}`);
  } catch (err) {
    console.error("MongoDB connection error ❌");
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = connectDB;