require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("./models/Product");

const data = [
  { name: "Iced Latte", category: "coffee", price: 120, imageUrl: "../PICTURES/MENU/COLD COFFEE_01.png" },
  { name: "Caramel Frappe", category: "coffee", price: 150, imageUrl: "../PICTURES/MENU/FRAFF_01.png" },
  { name: "Matcha Latte", category: "coffee", price: 140, imageUrl: "../PICTURES/MENU/HOT_COFFEE_MATCHA.png" },
  { name: "Orange Juice", category: "juice", price: 90, imageUrl: "../PICTURES/MENU/JUICE_01.png" },
  { name: "Chocolate Croissant", category: "pastry", price: 80, imageUrl: "../PICTURES/MENU/PASTRY_01.png" }
];

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await Product.deleteMany({});
    await Product.insertMany(data);
    console.log("✅ Seed complete. Inserted:", data.length);
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed error:", err.message);
    process.exit(1);
  }
}

run();
