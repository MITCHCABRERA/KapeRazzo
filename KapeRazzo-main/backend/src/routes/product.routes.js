const router = require("express").Router();
const Product = require("../models/Product");

// GET all products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create product
router.post("/", async (req, res) => {
  try {
    const { name, category, price, imageUrl, isAvailable } = req.body;

    if (!name || !category || price === undefined) {
      return res.status(400).json({ message: "name, category, and price are required" });
    }

    const product = await Product.create({
      name,
      category,
      price,
      imageUrl: imageUrl || "",
      isAvailable: isAvailable ?? true
    });

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
